const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { StudentCensus } = require('../models');
const { censusSchema } = require('../validation');
const { normalizeCensusPayload } = require('../utils/normalizer');
const { streamSinglePdf } = require('../services/pdf-service');

const censusRouter = express.Router();

// Rate limiting for public submission: 45 requests per 15 minutes per IP
const submitLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 45,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this connection. Please wait 15 minutes before retrying.' }
});

// Configure file upload storage
const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowedMime = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowedMime.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF, JPG, PNG, and WebP attachments are permitted.'));
    }
  }
});

/**
 * Generates an official reference code: ICB-YYYY-XXXXXX
 */
function generateReference() {
  const year = new Date().getFullYear();
  const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ICB-${year}-${hex}`;
}

/**
 * POST /api/census/submit
 * Public student/parent submission endpoint
 */
censusRouter.post('/submit', submitLimit, async (request, response, next) => {
  try {
    const normalized = normalizeCensusPayload(request.body);
    const payload = censusSchema.parse(normalized);

    // Anti-bot honeypot field
    if (payload.honeypot && payload.honeypot.trim().length > 0) {
      return response.status(201).json({
        success: true,
        reference: generateReference(),
        message: 'Census record registered successfully.'
      });
    }
    delete payload.honeypot;

    const reference = generateReference();
    const cnic = payload.personalDetails?.cnicOrFormBNumber;
    const studentName = payload.personalDetails?.studentName;

    // Server-side duplicate detection check
    let duplicateWarning = false;
    let existingSubmission = null;
    if (cnic) {
      existingSubmission = await StudentCensus.findOne({
        'personalDetails.cnicOrFormBNumber': cnic,
        isDeleted: false
      }).select('_id submissionReference personalDetails.studentName submittedAt');

      if (existingSubmission) {
        duplicateWarning = true;
      }
    }

    const newRecord = await StudentCensus.create({
      ...payload,
      submissionReference: reference,
      submissionStatus: 'Submitted',
      submittedAt: new Date(),
      submittedByIp: request.ip || request.connection.remoteAddress || '',
      formVersion: process.env.FORM_VERSION || '2026-v1'
    });

    return response.status(201).json({
      success: true,
      reference,
      id: newRecord._id,
      duplicateWarning,
      existingRecordReference: existingSubmission ? existingSubmission.submissionReference : null,
      message: duplicateWarning
        ? 'Census submitted successfully. Note: A record with this CNIC was previously registered.'
        : 'Official ICB Student Census Form submitted successfully.'
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/census/check-status/:admissionNumber
 * Public status inquiry endpoint with admissionNumber and optional reference
 */
censusRouter.get('/check-status/:admissionNumber', submitLimit, async (request, response, next) => {
  try {
    const admissionNumber = (request.params.admissionNumber || '').trim();
    const reference = (request.query.reference || '').trim();

    const query = {
      'educationalDetails.admissionNumber': admissionNumber,
      isDeleted: false
    };

    if (reference) {
      query.submissionReference = reference;
    }

    const student = await StudentCensus.findOne(query)
      .select('submissionStatus submittedAt submissionReference educationalDetails.admissionNumber educationalDetails.class educationalDetails.section personalDetails.studentName');

    if (!student) {
      return response.status(404).json({
        error: 'No census record found matching this Admission Number and Reference code.'
      });
    }

    // Mask name for privacy on public lookup
    const rawName = student.personalDetails?.studentName || '';
    const maskedName = rawName.length > 3 ? `${rawName.slice(0, 3)}***` : '***';

    return response.json({
      success: true,
      admissionNumber: student.educationalDetails?.admissionNumber,
      reference: student.submissionReference,
      status: student.submissionStatus,
      class: student.educationalDetails?.class || '',
      section: student.educationalDetails?.section || '',
      submittedAt: student.submittedAt,
      studentName: maskedName
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/census/upload-attachment
 * Upload disability certificates or supporting health documentation
 */
censusRouter.post('/upload-attachment', submitLimit, upload.single('file'), (request, response) => {
  if (!request.file) {
    return response.status(400).json({ error: 'Please select a file to upload (PDF, JPG, or PNG).' });
  }

  const fileUrl = `/uploads/${request.file.filename}`;
  return response.status(201).json({
    success: true,
    fileUrl,
    fileName: request.file.filename,
    originalName: request.file.originalname,
    size: request.file.size,
    mimeType: request.file.mimetype
  });
});

/**
 * GET /api/census/pdf/:reference
 * Public endpoint allowing parents/students to download the official census PDF sheet
 */
censusRouter.get('/pdf/:reference', submitLimit, async (request, response, next) => {
  try {
    const reference = (request.params.reference || '').trim();
    const student = await StudentCensus.findOne({
      submissionReference: reference,
      isDeleted: false
    });

    if (!student) {
      return response.status(404).json({
        error: 'No submitted census record found matching this reference code.'
      });
    }

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="ICB-Census-${student.submissionReference}.pdf"`
    );

    streamSinglePdf(student, response);
  } catch (error) {
    return next(error);
  }
});

module.exports = { censusRouter };
