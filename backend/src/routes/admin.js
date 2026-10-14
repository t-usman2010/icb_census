const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { Admin, AuditLog, StudentCensus } = require('../models');
const {
  loginSchema,
  createAdminSchema,
  updateAdminSchema,
  statusUpdateSchema,
  bulkStatusSchema
} = require('../validation');
const {
  signTokens,
  requireAuth,
  allow,
  sanitizeStudentForRole,
  SENSITIVE_PROJECTION
} = require('../middleware/auth');
const { logAuditAction } = require('../services/audit-service');
const { streamSinglePdf, streamBulkPdf } = require('../services/pdf-service');
const { streamStudentExport } = require('../services/export-service');

const adminRouter = express.Router();

// Strict rate limit for admin login brute-force mitigation
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many failed login attempts. Please try again after 15 minutes.' }
});

/**
 * Builds standard MongoDB filter object from request query or body
 */
function buildStudentFilter(params = {}) {
  const query = { isDeleted: false };

  const directMappings = {
    class: 'educationalDetails.class',
    section: 'educationalDetails.section',
    group: 'educationalDetails.group',
    shift: 'educationalDetails.shift',
    mediumOfInstruction: 'educationalDetails.mediumOfInstruction',
    modeOfStudy: 'educationalDetails.modeOfStudy',
    gender: 'personalDetails.gender',
    provinceOfBirth: 'personalDetails.provinceOfBirth',
    domicileProvince: 'domicileInformation.domicileProvince',
    religion: 'religionLanguageDetails.religion',
    motherLanguage: 'religionLanguageDetails.motherLanguage',
    bloodGroup: 'religionLanguageDetails.bloodGroup',
    nationality: 'domicileInformation.nationality',
    orphanType: 'parentGuardian.orphanGuardian.orphanType',
    recipientOfScholarship: 'transportScholarship.recipientOfScholarship',
    transportFacility: 'transportScholarship.transportFacility',
    hasMajorDisability: 'healthDetails.majorDisability.hasDisability',
    disabilityType: 'healthDetails.majorDisability.type',
    hasMentalDisability: 'healthDetails.mentalHealth.hasMentalDisability',
    hasDigitalDeviceAtHome: 'digitalAccess.hasDigitalDeviceAtHome',
    hasInternetAtHome: 'digitalAccess.hasInternetAtHome',
    submissionStatus: 'submissionStatus'
  };

  Object.entries(directMappings).forEach(([paramKey, modelKey]) => {
    if (params[paramKey] && typeof params[paramKey] === 'string' && params[paramKey].trim() !== '') {
      query[modelKey] = params[paramKey].trim();
    }
  });

  if (params.isOrphan !== undefined && params.isOrphan !== '') {
    query['parentGuardian.orphanGuardian.isOrphan'] =
      params.isOrphan === true || params.isOrphan === 'true' || params.isOrphan === 'Yes';
  }

  if (params.incomePerMonth && params.incomePerMonth.trim()) {
    query.$or = [
      { 'parentGuardian.father.incomePerMonth': params.incomePerMonth.trim() },
      { 'parentGuardian.mother.incomePerMonth': params.incomePerMonth.trim() }
    ];
  }

  if (params.admissionDateFrom || params.admissionDateTo) {
    query['educationalDetails.dateOfAdmission'] = {};
    if (params.admissionDateFrom) {
      query['educationalDetails.dateOfAdmission'].$gte = new Date(params.admissionDateFrom);
    }
    if (params.admissionDateTo) {
      query['educationalDetails.dateOfAdmission'].$lte = new Date(params.admissionDateTo);
    }
  }

  if (params.search && params.search.trim()) {
    const s = params.search.trim();
    const regex = new RegExp(s, 'i');
    query.$or = [
      { 'personalDetails.studentName': regex },
      { 'personalDetails.cnicOrFormBNumber': regex },
      { 'educationalDetails.admissionNumber': regex },
      { submissionReference: regex }
    ];
  }

  return query;
}

// ----------------------------------------------------
// 3.1 AUTHENTICATION
// ----------------------------------------------------

/**
 * POST /api/admin/login
 */
adminRouter.post('/login', loginLimit, async (request, response, next) => {
  try {
    const { email, password } = loginSchema.parse(request.body);
    const admin = await Admin.findOne({ email });

    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return response.status(401).json({ error: 'Invalid email or password' });
    }

    if (admin.isActive === false) {
      return response.status(403).json({ error: 'This administrator account is disabled' });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const { accessToken, refreshToken } = signTokens(admin);

    // Set secure httpOnly cookie for refresh token
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Also set accessToken cookie for server-rendered admin views
    response.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    await logAuditAction({
      adminId: admin._id,
      action: 'VIEW',
      details: 'Administrator logged into portal',
      ipAddress: request.ip
    });

    return response.json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/admin/refresh-token
 */
adminRouter.post('/refresh-token', async (request, response) => {
  try {
    const token = request.body.refreshToken || request.cookies?.refreshToken;
    if (!token) {
      return response.status(401).json({ error: 'Refresh token required' });
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || 'icb-census-refresh-secret-key-prod-2026'
    );

    const admin = await Admin.findById(payload.sub);
    if (!admin || admin.isActive === false) {
      return response.status(401).json({ error: 'User not authorized or account deactivated' });
    }

    const tokens = signTokens(admin);

    response.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    return response.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    return response.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

/**
 * POST /api/admin/logout
 */
adminRouter.post('/logout', (request, response) => {
  response.clearCookie('accessToken');
  response.clearCookie('refreshToken');
  return response.status(200).json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/admin/me
 */
adminRouter.get('/me', requireAuth, (request, response) => {
  return response.json({
    id: request.admin._id,
    name: request.admin.name,
    email: request.admin.email,
    role: request.admin.role,
    createdAt: request.admin.createdAt
  });
});

/**
 * POST /api/admin/create-admin (SuperAdmin only)
 */
adminRouter.post('/create-admin', requireAuth, allow('SuperAdmin'), async (request, response, next) => {
  try {
    const input = createAdminSchema.parse(request.body);
    const existing = await Admin.findOne({ email: input.email });
    if (existing) {
      return response.status(409).json({ error: 'An admin with this email address already exists' });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const admin = await Admin.create({
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash
    });

    await logAuditAction({
      adminId: request.admin._id,
      action: 'EDIT',
      details: `Created new admin account (${input.email}, role: ${input.role})`,
      ipAddress: request.ip
    });

    return response.status(201).json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/admin/admins (SuperAdmin only)
 */
adminRouter.get('/admins', requireAuth, allow('SuperAdmin'), async (request, response, next) => {
  try {
    const admins = await Admin.find().select('-passwordHash').sort({ createdAt: -1 });
    return response.json(admins);
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/admin/admins/:id (SuperAdmin only)
 */
adminRouter.patch('/admins/:id', requireAuth, allow('SuperAdmin'), async (request, response, next) => {
  try {
    const input = updateAdminSchema.parse(request.body);
    const updates = {};
    if (input.name) updates.name = input.name;
    if (input.role) updates.role = input.role;
    if (input.isActive !== undefined) updates.isActive = input.isActive;
    if (input.password) updates.passwordHash = await bcrypt.hash(input.password, 12);

    const admin = await Admin.findByIdAndUpdate(request.params.id, updates, { new: true }).select('-passwordHash');
    if (!admin) return response.status(404).json({ error: 'Admin account not found' });

    await logAuditAction({
      adminId: request.admin._id,
      action: 'EDIT',
      details: `Updated admin profile (${admin.email})`,
      ipAddress: request.ip
    });

    return response.json(admin);
  } catch (error) {
    return next(error);
  }
});

// ----------------------------------------------------
// 3.2 RECORDS CRUD
// ----------------------------------------------------

/**
 * GET /api/admin/students
 * Paginated, filterable, sortable list with facet counts and role projection
 */
adminRouter.get('/students', requireAuth, async (request, response, next) => {
  try {
    const query = buildStudentFilter(request.query);
    const page = Math.max(Number(request.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(request.query.limit) || 25, 1), 100);
    const skip = (page - 1) * limit;

    const sortField = request.query.sortBy || 'submittedAt';
    const sortOrder = request.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const projection = request.admin.role === 'Viewer' ? SENSITIVE_PROJECTION : null;

    const [items, total, facets] = await Promise.all([
      StudentCensus.find(query, projection).sort(sort).skip(skip).limit(limit).lean(),
      StudentCensus.countDocuments(query),
      StudentCensus.aggregate([
        { $match: { isDeleted: false } },
        {
          $facet: {
            byClass: [{ $group: { _id: '$educationalDetails.class', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
            byGender: [{ $group: { _id: '$personalDetails.gender', count: { $sum: 1 } } }],
            byStatus: [{ $group: { _id: '$submissionStatus', count: { $sum: 1 } } }],
            byShift: [{ $group: { _id: '$educationalDetails.shift', count: { $sum: 1 } } }]
          }
        }
      ])
    ]);

    await logAuditAction({
      adminId: request.admin._id,
      action: 'VIEW',
      details: `Filtered & browsed student census list (Page ${page}, returned ${items.length} records)`,
      ipAddress: request.ip
    });

    return response.json({
      items: items.map((st) => sanitizeStudentForRole(st, request.admin.role)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
      facets: facets[0] || {}
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/admin/students/:id
 */
adminRouter.get('/students/:id', requireAuth, async (request, response, next) => {
  try {
    const projection = request.admin.role === 'Viewer' ? SENSITIVE_PROJECTION : null;
    const student = await StudentCensus.findOne({ _id: request.params.id, isDeleted: false }, projection).lean();

    if (!student) {
      return response.status(404).json({ error: 'Student record not found' });
    }

    await logAuditAction({
      adminId: request.admin._id,
      action: 'VIEW',
      targetStudentId: student._id,
      details: `Viewed full bio-data for student ${student.personalDetails?.studentName || student._id}`,
      ipAddress: request.ip
    });

    return response.json(sanitizeStudentForRole(student, request.admin.role));
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/admin/students/:id
 */
adminRouter.patch('/students/:id', requireAuth, allow('SuperAdmin', 'Registrar'), async (request, response, next) => {
  try {
    const student = await StudentCensus.findOneAndUpdate(
      { _id: request.params.id, isDeleted: false },
      {
        $set: {
          ...request.body,
          lastEditedBy: request.admin._id,
          lastEditedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!student) {
      return response.status(404).json({ error: 'Student record not found' });
    }

    await logAuditAction({
      adminId: request.admin._id,
      action: 'EDIT',
      targetStudentId: student._id,
      details: `Updated census details for student ${student.personalDetails?.studentName}`,
      ipAddress: request.ip
    });

    return response.json(student);
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/admin/students/:id/status
 */
adminRouter.patch('/students/:id/status', requireAuth, allow('SuperAdmin', 'Registrar'), async (request, response, next) => {
  try {
    const { status } = statusUpdateSchema.parse(request.body);

    const student = await StudentCensus.findOneAndUpdate(
      { _id: request.params.id, isDeleted: false },
      {
        $set: {
          submissionStatus: status,
          lastEditedBy: request.admin._id,
          lastEditedAt: new Date()
        }
      },
      { new: true }
    );

    if (!student) {
      return response.status(404).json({ error: 'Student record not found' });
    }

    await logAuditAction({
      adminId: request.admin._id,
      action: 'EDIT',
      targetStudentId: student._id,
      details: `Changed submission status to '${status}'`,
      ipAddress: request.ip
    });

    return response.json({
      id: student._id,
      status: student.submissionStatus,
      lastEditedAt: student.lastEditedAt
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/admin/students/:id (SuperAdmin only)
 */
adminRouter.delete('/students/:id', requireAuth, allow('SuperAdmin'), async (request, response, next) => {
  try {
    const student = await StudentCensus.findOneAndUpdate(
      { _id: request.params.id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          lastEditedBy: request.admin._id,
          lastEditedAt: new Date()
        }
      },
      { new: true }
    );

    if (!student) {
      return response.status(404).json({ error: 'Student record not found' });
    }

    await logAuditAction({
      adminId: request.admin._id,
      action: 'DELETE',
      targetStudentId: student._id,
      details: `Soft-deleted census record for student ${student.personalDetails?.studentName}`,
      ipAddress: request.ip
    });

    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

// ----------------------------------------------------
// 3.3 BULK OPERATIONS
// ----------------------------------------------------

/**
 * POST /api/admin/students/bulk-status-update
 */
adminRouter.post('/students/bulk-status-update', requireAuth, allow('SuperAdmin', 'Registrar'), async (request, response, next) => {
  try {
    const { ids, status } = bulkStatusSchema.parse(request.body);

    const result = await StudentCensus.updateMany(
      { _id: { $in: ids }, isDeleted: false },
      {
        $set: {
          submissionStatus: status,
          lastEditedBy: request.admin._id,
          lastEditedAt: new Date()
        }
      }
    );

    await logAuditAction({
      adminId: request.admin._id,
      action: 'EDIT',
      details: `Bulk updated status to '${status}' across ${result.modifiedCount} records`,
      ipAddress: request.ip
    });

    return response.json({
      success: true,
      updated: result.modifiedCount
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/admin/students/bulk-export
 * Accepts IDs array or query filter, generates role-aware XLSX/CSV
 */
adminRouter.post('/students/bulk-export', requireAuth, allow('SuperAdmin', 'Registrar', 'Viewer'), async (request, response, next) => {
  try {
    let query = { isDeleted: false };
    if (Array.isArray(request.body.ids) && request.body.ids.length > 0) {
      query._id = { $in: request.body.ids };
    } else if (request.body.filter) {
      query = buildStudentFilter(request.body.filter);
    }

    const students = await StudentCensus.find(query).lean();
    const format = (request.body.format || 'xlsx').toLowerCase();

    await logAuditAction({
      adminId: request.admin._id,
      action: 'EXPORT',
      details: `Exported ${students.length} student records as ${format.toUpperCase()} (Role: ${request.admin.role})`,
      ipAddress: request.ip
    });

    return streamStudentExport(students, { format, userRole: request.admin.role }, response);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/admin/students/bulk-print
 * Accepts IDs or filter query, generates combined multi-page PDF
 */
adminRouter.post('/students/bulk-print', requireAuth, allow('SuperAdmin', 'Registrar'), async (request, response, next) => {
  try {
    let query = { isDeleted: false };
    if (Array.isArray(request.body.ids) && request.body.ids.length > 0) {
      query._id = { $in: request.body.ids };
    } else if (request.body.filter) {
      query = buildStudentFilter(request.body.filter);
    }

    const students = await StudentCensus.find(query).lean();

    await logAuditAction({
      adminId: request.admin._id,
      action: 'PRINT',
      details: `Generated bulk print PDF for ${students.length} student records`,
      ipAddress: request.ip
    });

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'inline; filename="icb-census-bulk-sheets.pdf"');

    return streamBulkPdf(students, response);
  } catch (error) {
    return next(error);
  }
});

// ----------------------------------------------------
// 3.4 PRINT (INDIVIDUAL)
// ----------------------------------------------------

/**
 * GET /api/admin/students/:id/print
 * Generates print-ready official census bio-data sheet for physical filing/wet signatures
 */
adminRouter.get('/students/:id/print', requireAuth, async (request, response, next) => {
  try {
    const student = await StudentCensus.findOne({ _id: request.params.id, isDeleted: false }).lean();
    if (!student) {
      return response.status(404).json({ error: 'Student record not found' });
    }

    await logAuditAction({
      adminId: request.admin._id,
      action: 'PRINT',
      targetStudentId: student._id,
      details: `Generated printable census PDF for student ${student.personalDetails?.studentName}`,
      ipAddress: request.ip
    });

    const admission = student.educationalDetails?.admissionNumber || student.submissionReference || student._id;
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `inline; filename="census-${admission}.pdf"`);

    return streamSinglePdf(student, response);
  } catch (error) {
    return next(error);
  }
});

// ----------------------------------------------------
// 3.5 DASHBOARD & ANALYTICS
// ----------------------------------------------------

/**
 * GET /api/admin/dashboard/stats
 * Aggregated analytics computed directly via MongoDB pipelines
 */
adminRouter.get('/dashboard/stats', requireAuth, async (request, response, next) => {
  try {
    const match = { isDeleted: false };

    const [
      totalStudents,
      statusCounts,
      classBreakdown,
      genderBreakdown,
      shiftBreakdown,
      scholarshipCount,
      disabilityCount,
      orphanCount,
      digitalAccessStats
    ] = await Promise.all([
      StudentCensus.countDocuments(match),
      StudentCensus.aggregate([
        { $match: match },
        { $group: { _id: '$submissionStatus', count: { $sum: 1 } } }
      ]),
      StudentCensus.aggregate([
        { $match: match },
        { $group: { _id: '$educationalDetails.class', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      StudentCensus.aggregate([
        { $match: match },
        { $group: { _id: '$personalDetails.gender', count: { $sum: 1 } } }
      ]),
      StudentCensus.aggregate([
        { $match: match },
        { $group: { _id: '$educationalDetails.shift', count: { $sum: 1 } } }
      ]),
      StudentCensus.countDocuments({ ...match, 'transportScholarship.recipientOfScholarship': 'Yes' }),
      StudentCensus.countDocuments({ ...match, 'healthDetails.majorDisability.hasDisability': 'Yes' }),
      StudentCensus.countDocuments({ ...match, 'parentGuardian.orphanGuardian.isOrphan': true }),
      StudentCensus.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalWithDevice: {
              $sum: {
                $cond: [{ $eq: ['$digitalAccess.hasDigitalDeviceAtHome', 'Yes'] }, 1, 0]
              }
            },
            totalWithInternet: {
              $sum: {
                $cond: [{ $eq: ['$digitalAccess.hasInternetAtHome', 'Yes'] }, 1, 0]
              }
            },
            total: { $sum: 1 }
          }
        }
      ])
    ]);

    const digital = digitalAccessStats[0] || { totalWithDevice: 0, totalWithInternet: 0, total: 0 };
    const devicePercentage = digital.total ? Math.round((digital.totalWithDevice / digital.total) * 100) : 0;
    const internetPercentage = digital.total ? Math.round((digital.totalWithInternet / digital.total) * 100) : 0;

    return response.json({
      totalStudents,
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr._id || 'Unknown'] = curr.count;
        return acc;
      }, {}),
      byClass: classBreakdown,
      byGender: genderBreakdown,
      byShift: shiftBreakdown,
      scholarshipRecipients: scholarshipCount,
      disabilities: disabilityCount,
      orphans: orphanCount,
      digitalAccess: {
        devicePercentage,
        internetPercentage,
        withDevice: digital.totalWithDevice,
        withInternet: digital.totalWithInternet
      }
    });
  } catch (error) {
    return next(error);
  }
});

// ----------------------------------------------------
// 3.6 AUDIT LOG VIEWER
// ----------------------------------------------------

/**
 * GET /api/admin/audit-log (SuperAdmin only)
 */
adminRouter.get('/audit-log', requireAuth, allow('SuperAdmin'), async (request, response, next) => {
  try {
    const query = {};

    if (request.query.adminId) {
      query.adminId = request.query.adminId;
    }
    if (request.query.action) {
      query.action = request.query.action.toUpperCase();
    }
    if (request.query.dateFrom || request.query.dateTo) {
      query.timestamp = {};
      if (request.query.dateFrom) query.timestamp.$gte = new Date(request.query.dateFrom);
      if (request.query.dateTo) query.timestamp.$lte = new Date(request.query.dateTo);
    }
    if (request.query.search) {
      query.details = new RegExp(request.query.search.trim(), 'i');
    }

    const page = Math.max(Number(request.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(request.query.limit) || 50, 1), 200);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('adminId', 'name email role')
        .populate('targetStudentId', 'submissionReference personalDetails.studentName')
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return response.json({
      logs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = { adminRouter };
