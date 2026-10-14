# Backend Codebase Audit Report

## File: ICB-Census-Backend-Prompt.md
**Full Path:** `D:\Web Projects\cences-form\backend\ICB-Census-Backend-Prompt.md`

### Metadata & Analysis
- **Syntax Errors:** None detected (basic check).
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** Yes

### File Contents
```text
# ICB Student Census System — Backend Engineering Prompt

You are building the backend for the **ICB Student Census System**, a production system that
digitizes the official "ICB Student Census Form" so parents/students can submit it online and
college admin staff can manage, filter, export, and print the collected records.

## Stack

- **Runtime**: Node.js (LTS), Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Auth**: JWT-based auth for the admin portal (access + refresh tokens), bcrypt for password hashing
- **Validation**: Zod or Joi for request validation — validate every field against the schema below
- **File handling**: Multer (or S3/Cloudinary adapter) for the optional disability-certificate attachment
- **PDF generation**: For individual and bulk "print form" endpoints (puppeteer or pdfkit)
- **Environment**: dotenv-based config, ready for deployment (PM2/Docker-friendly)

This backend also **hosts the Admin Portal** (server-rendered or serves a bundled admin SPA) — see
the "Admin Portal" section below. It is not just an API; it is the full backend + admin application.

---

## 1. Data Model

Build a single primary Mongoose model: `StudentCensus`. Group fields into nested sub-schemas that
mirror the physical form's 
... [TRUNCATED] ...
rements

- Hash all passwords with bcrypt (cost factor ≥ 10)
- Validate and sanitize every field server-side regardless of frontend validation
- CNIC numbers, health data, and income are sensitive — encrypt CNIC fields at rest if feasible
  (mongoose-encryption or field-level AES), and never log them in plaintext application logs
- HTTPS-only cookies for refresh tokens (httpOnly, secure, sameSite)
- Implement CORS restricted to the known frontend origin
- Rate-limit both the public submit endpoint and the admin login endpoint (brute-force protection)
- All admin actions that touch sensitive fields (view/export/print of health/CNIC data) must
  write an AuditLog entry

## 6. Deliverables Expected From This Prompt

1. Full Mongoose schema files matching §1
2. Express route/controller files for all endpoints in §2 and §3
3. JWT auth middleware + role-guard middleware
4. Admin portal views/pages per §4 (can be server-rendered templates or a small bundled SPA
   served from `/admin`)
5. PDF generation module for individual + bulk print
6. CSV/XLSX export module
7. Seed script to create the first SuperAdmin account
8. `.env.example` with all required environment variables
9. Postman collection or OpenAPI spec documenting every endpoint

```

## File: package.json
**Full Path:** `D:\Web Projects\cences-form\backend\package.json`

### Metadata & Analysis
- **Syntax Errors:** None detected (basic check).
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** Yes
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** Yes

### File Contents
```json
{
  "name": "cences-form-backend",
  "version": "1.0.0",
  "private": true,
  "description": "Backend API for the Cences form application",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "seed:admin": "node src/scripts/seed-admin.js"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "bcryptjs": "^3.0.2",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "exceljs": "^4.4.0",
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.12.1",
    "multer": "^1.4.5-lts.1",
    "pdfkit": "^0.16.0",
    "zod": "^3.24.2"
  }
}

```

## File: .env.example
**Full Path:** `D:\Web Projects\cences-form\backend\.env.example`

### Metadata & Analysis
- **Syntax Errors:** None detected (basic check).
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```text
# Server Port
PORT=3000

# Allowed Frontend Origins (comma-separated if multiple)
CLIENT_ORIGIN=http://localhost:5173,http://localhost:3000

# MongoDB Database Connection String
MONGODB_URI=mongodb://127.0.0.1:27017/icb_census

# Security Secrets (Generate secure random strings in production)
JWT_ACCESS_SECRET=icb-census-super-secret-access-key-2026
JWT_REFRESH_SECRET=icb-census-super-secret-refresh-key-2026

# Token Lifespans
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d

# Form & Upload Configurations
FORM_VERSION=2026-v1
UPLOAD_DIR=uploads

# Initial Administrator Credentials (used by npm run seed:admin)
ADMIN_NAME=Chief System Administrator
ADMIN_EMAIL=admin@icb.edu.pk
ADMIN_PASSWORD=AdminPass123!

```

## File: src/models.js
**Full Path:** `D:\Web Projects\cences-form\backend\src\models.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** StudentCensus, Admin, AuditLog
- **App-Level Middleware:** None
- **Environment Variables Used:** FORM_VERSION
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```javascript
const mongoose = require('mongoose');
const {
  YES_NO,
  GENDERS,
  PROVINCES_OF_BIRTH,
  DOMICILE_PROVINCES,
  NATIONALITIES,
  ADDRESS_TYPES,
  RELIGIONS,
  MOTHER_LANGUAGES,
  BLOOD_GROUPS,
  QUALIFICATIONS,
  PROFESSIONS,
  INCOME_RANGES,
  ORPHAN_TYPES,
  SHIFTS,
  MEDIUMS_OF_INSTRUCTION,
  MODES_OF_STUDY,
  TRANSPORT_FACILITIES,
  EMERGENCY_RELATIONS,
  IDP_STATUSES,
  DISABILITY_TYPES,
  CERTIFICATE_STATUSES,
  MENTAL_HEALTH_TYPES,
  DIFFICULTY_LEVELS,
  DEVICE_TYPES,
  SUBMISSION_STATUSES,
  ADMIN_ROLES,
  AUDIT_ACTIONS
} = require('./constants/enums');

const emailField = {
  type: String,
  lowercase: true,
  trim: true,
  default: ''
};

// 1.3 Address Sub-schema
const addressSchema = new mongoose.Schema(
  {
    addressType: { type: String, enum: [...ADDRESS_TYPES, ''], default: '' },
    sectorSocietyVillageName: { type: String, trim: true, default: '' },
    houseNo: { type: String, trim: true, default: '' },
    streetNo: { type: String, trim: true, default: '' },
    contactNumber: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: 'Islamabad' }
  },
  { _id: false }
);

// 1.5 Parent Sub-schema
const personSchema = new mongoose.Schema(
  {
    name: { type: String, trim: tru
... [TRUNCATED] ...
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ADMIN_ROLES, default: 'Viewer', index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// 3. AuditLog Schema
const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    targetStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentCensus', default: null, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    details: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { minimize: false }
);

const StudentCensus = mongoose.models.StudentCensus || mongoose.model('StudentCensus', studentCensusSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  StudentCensus,
  Admin,
  AuditLog
};

```

## File: src/server.js
**Full Path:** `D:\Web Projects\cences-form\backend\src\server.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** cookieParser(, express.json({ limit: '5mb' }, express.urlencoded({ extended: true, limit: '5mb' }, '/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || 'uploads', '/admin', express.static(path.resolve(__dirname, '../public/admin', '/docs', express.static(path.resolve(__dirname, '../docs', '/api/census', censusRouter, '/api/admin', adminRouter, (request, response, errorHandler
- **Environment Variables Used:** PORT, CLIENT_ORIGIN, UPLOAD_DIR, FORM_VERSION, MONGODB_URI
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** Yes
- **Auth/Authorization Logic Detected:** No

### File Contents
```javascript
require('dotenv').config();

const path = require('node:path');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const { censusRouter } = require('./routes/census');
const { adminRouter } = require('./routes/admin');
const { errorHandler } = require('./middleware/error-handler');

const app = express();
const port = Number(process.env.PORT) || 3000;

// Security headers with CSP configured for admin console CDNs
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.tailwindcss.com',
          'https://cdnjs.cloudflare.com'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"]
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration 
... [TRUNCATED] ...
se.redirect('/admin');
});

// 404 Route handler
app.use((request, response) => {
  if (request.accepts('html')) {
    return response.redirect('/admin');
  }
  return response.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected successfully');
    } catch (err) {
      console.warn('MongoDB connection error:', err.message);
    }
  } else {
    console.warn('Notice: MONGODB_URI is not defined in environment.');
  }

  app.listen(port, () => {
    console.log(`===================================================`);
    console.log(` ICB Student Census System — Backend & Admin Portal`);
    console.log(` Listening on: http://localhost:${port}`);
    console.log(` Admin Portal: http://localhost:${port}/admin`);
    console.log(` OpenAPI Spec: http://localhost:${port}/api/docs`);
    console.log(`===================================================`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Fatal startup error:', error);
    process.exit(1);
  });
}

module.exports = { app, start };

```

## File: src/validation.js
**Full Path:** `D:\Web Projects\cences-form\backend\src\validation.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```javascript
const { z } = require('zod');
const {
  YES_NO,
  GENDERS,
  PROVINCES_OF_BIRTH,
  DOMICILE_PROVINCES,
  NATIONALITIES,
  ADDRESS_TYPES,
  RELIGIONS,
  MOTHER_LANGUAGES,
  BLOOD_GROUPS,
  QUALIFICATIONS,
  PROFESSIONS,
  INCOME_RANGES,
  ORPHAN_TYPES,
  SHIFTS,
  MEDIUMS_OF_INSTRUCTION,
  MODES_OF_STUDY,
  TRANSPORT_FACILITIES,
  EMERGENCY_RELATIONS,
  IDP_STATUSES,
  DISABILITY_TYPES,
  CERTIFICATE_STATUSES,
  MENTAL_HEALTH_TYPES,
  DIFFICULTY_LEVELS,
  DEVICE_TYPES,
  SUBMISSION_STATUSES,
  ADMIN_ROLES
} = require('./constants/enums');

// Helpers for permissive and forgiving schemas
const optString = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((val) => (val === undefined || val === null ? '' : String(val).trim()));

const optEnum = (values, defaultVal = '') =>
  z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === undefined || val === null ? '' : String(val).trim()))
    .refine((val) => val === '' || values.includes(val), {
      message: `Must be one of: ${values.join(', ')}`
    });

const optEmail = z
  .string()
  .optional()
  .nullable()
  .transform((val) => (val === undefined || val === null ? '' : String(val).trim().toLowerCase()))
  .refine((val) => val ==
... [TRUNCATED] ...
rtial()
      .default({}),

    honeypot: optString
  })
  .strip();

// Admin Authentication Schemas
const loginSchema = z.object({
  email: z.string().trim().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const createAdminSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(ADMIN_ROLES).default('Viewer')
});

const updateAdminSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.enum(ADMIN_ROLES).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional()
});

const statusUpdateSchema = z.object({
  status: z.enum(SUBMISSION_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${SUBMISSION_STATUSES.join(', ')}` })
  })
});

const bulkStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one student ID is required'),
  status: z.enum(SUBMISSION_STATUSES)
});

module.exports = {
  censusSchema,
  loginSchema,
  createAdminSchema,
  updateAdminSchema,
  statusUpdateSchema,
  bulkStatusSchema
};

```

## File: src/constants/enums.js
**Full Path:** `D:\Web Projects\cences-form\backend\src\constants\enums.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```javascript
const YES_NO = ['Yes', 'No'];

const GENDERS = ['Male', 'Female', 'Transgender'];

const PROVINCES_OF_BIRTH = [
  'Islamabad Capital Territory',
  'Punjab',
  'Balochistan',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Gilgit Baltistan',
  'Gilgit-Baltistan',
  'AJK',
  'Azad Jammu & Kashmir',
  'Other than Pakistan'
];

const DOMICILE_PROVINCES = [
  'Islamabad Capital Territory',
  'Punjab',
  'Balochistan',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Gilgit Baltistan',
  'Gilgit-Baltistan',
  'AJK',
  'Azad Jammu & Kashmir'
];

const NATIONALITIES = ['Pakistani', 'Others', 'Other'];

const ADDRESS_TYPES = ['Sector', 'Housing Society', 'Village', 'Others', 'Other'];

const RELIGIONS = ['Muslim', 'Non-Muslim'];

const MOTHER_LANGUAGES = [
  'Pashto',
  'English',
  'Saraiki',
  'Punjabi',
  'Balti',
  'Shina',
  'Urdu',
  'Hindko',
  'Sindhi',
  'Balochi',
  'Other',
  'Pothohari',
  'Kashmiri'
];

const BLOOD_GROUPS = ['A+', 'A-', 'AB+', 'AB-', 'O+', 'O-', 'B+', 'B-'];

const QUALIFICATIONS = [
  'Below Matric',
  'Matric',
  'Intermediate',
  'Graduate',
  'Post Graduate',
  'Ph.D.',
  'Other',
  'Matric (SSC)',
  'Intermediate (HSSC)',
  'Bachelor (BA / BSc / BS)',
  'Master (MA / MSc / MS)',
  'MPhil / MS',
  'PhD / Doctorate'
];

const P
... [TRUNCATED] ...
 Friend'
];

const IDP_STATUSES = ['Registered', 'Unregistered'];

const DISABILITY_TYPES = ['Physical', 'Visual', 'Hearing', 'Intellectual', 'Multiple', 'Other'];

const CERTIFICATE_STATUSES = ['Attached', 'Not available'];

const MENTAL_HEALTH_TYPES = ['Autism', 'ADHD', 'Other'];

const DIFFICULTY_LEVELS = [
  'No Difficulty',
  'Some Difficulty',
  'A lot of Difficulty',
  'Cannot Do at All',
  'No issue'
];

const DEVICE_TYPES = ['Mobile Phone', 'Laptop', 'Desktop Computer', 'Tablet', 'Chromebook', 'Smart Phone'];

const SUBMISSION_STATUSES = ['Submitted', 'Under Review', 'Verified', 'Rejected'];

const ADMIN_ROLES = ['SuperAdmin', 'Registrar', 'Viewer'];

const AUDIT_ACTIONS = ['VIEW', 'EXPORT', 'EDIT', 'DELETE', 'PRINT'];

module.exports = {
  YES_NO,
  GENDERS,
  PROVINCES_OF_BIRTH,
  DOMICILE_PROVINCES,
  NATIONALITIES,
  ADDRESS_TYPES,
  RELIGIONS,
  MOTHER_LANGUAGES,
  BLOOD_GROUPS,
  QUALIFICATIONS,
  PROFESSIONS,
  INCOME_RANGES,
  ORPHAN_TYPES,
  SHIFTS,
  MEDIUMS_OF_INSTRUCTION,
  MODES_OF_STUDY,
  TRANSPORT_FACILITIES,
  EMERGENCY_RELATIONS,
  IDP_STATUSES,
  DISABILITY_TYPES,
  CERTIFICATE_STATUSES,
  MENTAL_HEALTH_TYPES,
  DIFFICULTY_LEVELS,
  DEVICE_TYPES,
  SUBMISSION_STATUSES,
  ADMIN_ROLES,
  AUDIT_ACTIONS
};

```

## File: src/middleware/auth.js
**Full Path:** `D:\Web Projects\cences-form\backend\src\middleware\auth.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** JWT_ACCESS_SECRET, ACCESS_TOKEN_TTL, JWT_REFRESH_SECRET, REFRESH_TOKEN_TTL
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** Yes

### File Contents
```javascript
const jwt = require('jsonwebtoken');
const { Admin } = require('../models');

const SENSITIVE_PROJECTION = [
  '-healthDetails',
  '-parentGuardian.father.cnic',
  '-parentGuardian.mother.cnic',
  '-parentGuardian.father.incomePerMonth',
  '-parentGuardian.mother.incomePerMonth',
  '-parentGuardian.father.bps',
  '-personalDetails.cnicOrFormBNumber',
  '-idpDetails.refugeeCardNumber'
].join(' ');

/**
 * Signs both Access Token and Refresh Token for an admin
 */
function signTokens(admin) {
  const payload = {
    sub: admin._id.toString(),
    role: admin.role,
    email: admin.email,
    name: admin.name
  };

  const accessSecret = process.env.JWT_ACCESS_SECRET;
  if (!accessSecret) throw new Error('JWT_ACCESS_SECRET environment variable must be set');
  const accessToken = jwt.sign(
    payload,
    accessSecret,
    { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' }
  );

  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET environment variable must be set');
  const refreshToken = jwt.sign(
    payload,
    refreshSecret,
    { expiresIn: process.env.REFRESH_TOKEN_TTL || '7d' }
  );

  return { accessToken, refreshToken };
}

/**
 * Authentication middleware chec
... [TRUNCATED] ...
).json({
        error: `Forbidden: Requires one of [${roles.join(', ')}] roles. Your role is '${request.admin.role}'.`
      });
    }
    return next();
  };
}

/**
 * Strips sensitive personal fields for Viewer role
 */
function sanitizeStudentForRole(student, role) {
  if (!student || role !== 'Viewer') return student;
  const clone = typeof student.toObject === 'function' ? student.toObject() : JSON.parse(JSON.stringify(student));

  if (clone.personalDetails) {
    clone.personalDetails.cnicOrFormBNumber = '***-***-*** (Protected)';
  }
  if (clone.parentGuardian) {
    if (clone.parentGuardian.father) {
      clone.parentGuardian.father.cnic = '***-***-*** (Protected)';
      clone.parentGuardian.father.incomePerMonth = '[Confidential]';
      clone.parentGuardian.father.bps = '[Confidential]';
    }
    if (clone.parentGuardian.mother) {
      clone.parentGuardian.mother.cnic = '***-***-*** (Protected)';
      clone.parentGuardian.mother.incomePerMonth = '[Confidential]';
    }
  }
  delete clone.healthDetails;
  if (clone.idpDetails) {
    clone.idpDetails.refugeeCardNumber = '[Protected]';
  }

  return clone;
}

module.exports = {
  signTokens,
  requireAuth,
  allow,
  sanitizeStudentForRole,
  SENSITIVE_PROJECTION
};

```

## File: src/middleware/error-handler.js
**Full Path:** `D:\Web Projects\cences-form\backend\src\middleware\error-handler.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```javascript
/**
 * Global error handler returning structured, descriptive API error responses
 */
function errorHandler(error, request, response, next) {
  // Zod schema validation error
  if (error.name === 'ZodError') {
    const formattedErrors = {};
    if (Array.isArray(error.issues)) {
      error.issues.forEach((issue) => {
        const path = issue.path.join('.') || 'root';
        formattedErrors[path] = issue.message;
      });
    }
    return response.status(400).json({
      error: 'Validation failed. Please check the submitted fields.',
      details: error.issues,
      fields: formattedErrors
    });
  }

  // MongoDB duplicate key error
  if (error.code === 11000) {
    const fields = Object.keys(error.keyPattern || {});
    return response.status(409).json({
      error: `A record with this ${fields.join(', ') || 'field'} already exists in the system.`,
      fields
    });
  }

  // Multer file upload errors
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return response.status(400).json({ error: 'Uploaded file exceeds the maximum allowed size of 5MB.' });
    }
    return response.status(400).json({ error: `File upload error: ${error.message}` });
  }

  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    return response.status(400).json({
      error: 'Database schema validation failed',
      details: Object.values(error.errors).map((e) => e.message)
    });
  }

  // Mongoose CastError (invalid ObjectId, etc.)
  if (error.name === 'CastError') {
    return response.status(400).json({
      error: `Invalid identifier format for ${error.path}.`
    });
  }

  // JSON syntax error in request body
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return response.status(400).json({ error: 'Malformed JSON payload in request body.' });
  }

  console.error('Unhandled server error:', error);
  return response.status(error.status || 500).json({
    error: error.status ? error.message : 'An unexpected internal server error occurred.'
  });
}

module.exports = { errorHandler };

```

## File: src/routes/admin.js
**Full Path:** `D:\Web Projects\cences-form\backend\src\routes\admin.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** NODE_ENV, JWT_REFRESH_SECRET
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** Yes

### File Contents
```javascript
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
    s
... [TRUNCATED] ...
Id) {
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

```

## File: src/routes/census.js
**Full Path:** `D:\Web Projects\cences-form\backend\src\routes\census.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** UPLOAD_DIR, FORM_VERSION
- **TODOs/FIXMEs:** None
- **File Upload Handling:** Yes
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```javascript
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { StudentCensus } = require('../models');
const { censusSchema } = require('../validation');
const { normalizeCensusPayload } = require('../utils/normalizer');

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
  limits: { fileSize: 5 *
... [TRUNCATED] ...
onst rawName = student.personalDetails?.studentName || '';
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

module.exports = { censusRouter };

```

## File: src/scripts/seed-admin.js
**Full Path:** `D:\Web Projects\cences-form\backend\src\scripts\seed-admin.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, SEED_SAMPLE_DATA
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** Yes

### File Contents
```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Admin, StudentCensus } = require('../models');

async function seed() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/icb_census';
  console.log(`Connecting to MongoDB at: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  const email = (process.env.ADMIN_EMAIL || 'admin@icb.edu.pk').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'AdminPass123!';
  const name = process.env.ADMIN_NAME || 'Chief System Administrator';

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await Admin.findOneAndUpdate(
    { email },
    {
      name,
      email,
      passwordHash,
      role: 'SuperAdmin',
      isActive: true,
      lastLoginAt: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('----------------------------------------------------');
  console.log(' SuperAdmin Account Configured Successfully');
  console.log(` Name:     ${admin.name}`);
  console.log(` Email:    ${admin.email}`);
  console.log(` Role:     ${admin.role}`);
  console.log(` Password: ${password}`);
  console.log('----------------------------------
... [TRUNCATED] ...
ility: 'Private',
          recipientOfScholarship: 'No',
          specialCoCurricularAchievement: 'No'
        },
        emergencyContact: {
          name: 'Nasreen Akhtar',
          contactNumber: '0312-9876543',
          relation: 'Mother'
        },
        idpDetails: { isRefugeeOrIDP: 'No' },
        healthDetails: {
          majorDisability: { hasDisability: 'No' },
          mentalHealth: { hasMentalDisability: 'No' },
          vaccinationCompleted: 'Yes'
        },
        digitalAccess: {
          hasDigitalDeviceAtHome: 'Yes',
          deviceTypes: ['Mobile Phone'],
          hasInternetAtHome: 'Yes'
        },
        submissionStatus: 'Submitted',
        submissionReference: 'ICB-2026-B83C01'
      }
    ];

    for (const st of sampleStudents) {
      await StudentCensus.findOneAndUpdate(
        { 'educationalDetails.admissionNumber': st.educationalDetails.admissionNumber },
        st,
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${sampleStudents.length} sample student records for testing.`);
  }

  await mongoose.disconnect();
  console.log('Seeding procedure complete.');
}

seed().catch((error) => {
  console.error('Seeding failure:', error.message);
  process.exit(1);
});

```

## File: src/services/audit-service.js
**Full Path:** `D:\Web Projects\cences-form\backend\src\services\audit-service.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```javascript
const { AuditLog } = require('../models');

/**
 * Asynchronously logs admin actions to maintain a tamper-evident audit trail
 * without interrupting the primary request pipeline.
 */
async function logAuditAction({
  adminId,
  action,
  targetStudentId = null,
  details = '',
  ipAddress = '',
  metadata = {}
}) {
  try {
    if (!adminId || !action) return null;
    return await AuditLog.create({
      adminId,
      action,
      targetStudentId,
      details,
      ipAddress,
      metadata,
      timestamp: new Date()
    });
  } catch (error) {
    console.error(`Failed to record audit log (${action}):`, error.message);
    return null;
  }
}

module.exports = { logAuditAction };

```

## File: src/services/export-service.js
**Full Path:** `D:\Web Projects\cences-form\backend\src\services\export-service.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```javascript
const ExcelJS = require('exceljs');

/**
 * Builds and streams an Excel or CSV export for student census records,
 * strictly enforcing field-level role-based masking for the 'Viewer' role.
 */
async function streamStudentExport(students = [], { format = 'xlsx', userRole = 'Viewer' }, responseStream) {
  const isViewer = userRole === 'Viewer';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ICB Census System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Student Census Records', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  const columns = [
    { header: 'Submission Ref', key: 'ref', width: 18 },
    { header: 'Admission #', key: 'admissionNumber', width: 14 },
    { header: 'Student Name', key: 'studentName', width: 24 },
    { header: 'Gender', key: 'gender', width: 10 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Class', key: 'class', width: 10 },
    { header: 'Section', key: 'section', width: 10 },
    { header: 'Group', key: 'group', width: 12 },
    { header: 'Shift', key: 'shift', width: 10 },
    { header: 'Medium', key: 'medium', width: 12 }
  ];

  if (!isViewer) {
    columns.push(
      { header: 'CNIC / Form-B', key: 'cnic', width: 18 },
 
... [TRUNCATED] ...
 || '';
      rowData.dob = p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : '';
      rowData.provinceOfBirth = p.provinceOfBirth || '';
      rowData.districtOfBirth = p.districtOfBirth || '';
      rowData.fatherCnic = f.cnic || '';
      rowData.fatherIncome = f.incomePerMonth || '';
      rowData.motherCnic = m.cnic || '';
      rowData.motherIncome = m.incomePerMonth || '';
      rowData.hasDisability = dis.hasDisability || 'No';
      rowData.disabilityType = dis.type || '';
      rowData.vaccinated = health.vaccinationCompleted || 'Yes';
      rowData.isIdp = idp.isRefugeeOrIDP || 'No';
    }

    sheet.addRow(rowData);
  });

  if (format.toLowerCase() === 'csv') {
    responseStream.setHeader('Content-Type', 'text/csv; charset=utf-8');
    responseStream.setHeader('Content-Disposition', 'attachment; filename="icb-student-census.csv"');
    await workbook.csv.write(responseStream);
  } else {
    responseStream.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    responseStream.setHeader('Content-Disposition', 'attachment; filename="icb-student-census.xlsx"');
    await workbook.xlsx.write(responseStream);
  }
}

module.exports = { streamStudentExport };

```

## File: src/services/pdf-service.js
**Full Path:** `D:\Web Projects\cences-form\backend\src\services\pdf-service.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```javascript
const PDFDocument = require('pdfkit');

/**
 * Draws a section header bar
 */
function drawSectionHeader(doc, title, y) {
  doc.save();
  doc.rect(36, y, 523, 16).fill('#1e3a8a');
  doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text(title.toUpperCase(), 42, y + 3.5);
  doc.restore();
  return y + 18;
}

/**
 * Draws a key-value row with border
 */
function drawFieldRow(doc, fields, y, rowHeight = 16) {
  const totalWidth = 523;
  const colWidth = totalWidth / fields.length;

  doc.save();
  doc.rect(36, y, totalWidth, rowHeight).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

  fields.forEach((field, index) => {
    const x = 36 + index * colWidth;
    if (index > 0) {
      doc.moveTo(x, y).lineTo(x, y + rowHeight).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
    }

    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold')
      .text(`${field.label}: `, x + 4, y + 4, { continued: true, width: colWidth - 8 });
    
    doc.fillColor('#0f172a').font('Helvetica')
      .text(field.value || 'N/A');
  });

  doc.restore();
  return y + rowHeight;
}

/**
 * Renders a full official ICB Student Census Form for a single student
 */
function renderStudentCensusPage(doc, student) {
  const personal = student.per
... [TRUNCATED] ...
, y + 66).lineTo(540, y + 66).strokeColor('#475569').stroke();

  doc.restore();

  // Footer note
  doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica')
    .text('ICB Student Census Record  •  Islamabad College for Boys, Sector G-6/3, Islamabad  •  Confidential Educational Record', 36, 786, { align: 'center', width: 523 });
}

/**
 * Streams a single student census PDF
 */
function streamSinglePdf(student, outputStream) {
  const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: false });
  doc.pipe(outputStream);
  doc.addPage();
  renderStudentCensusPage(doc, student);
  doc.end();
}

/**
 * Streams a combined multi-page PDF with one census sheet per student
 */
function streamBulkPdf(students = [], outputStream) {
  const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: false });
  doc.pipe(outputStream);

  if (students.length === 0) {
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').text('No student records matched the export criteria.', 36, 100, { align: 'center' });
    doc.end();
    return;
  }

  students.forEach((student, index) => {
    doc.addPage();
    renderStudentCensusPage(doc, student);
  });

  doc.end();
}

module.exports = {
  streamSinglePdf,
  streamBulkPdf
};

```

## File: src/utils/normalizer.js
**Full Path:** `D:\Web Projects\cences-form\backend\src\utils\normalizer.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```javascript
/**
 * Normalizes input census payloads to guarantee backward and cross-compatibility
 * between the React frontend structure and the ICB-Census-Backend-Prompt standard.
 */
function normalizeCensusPayload(input = {}) {
  const data = JSON.parse(JSON.stringify(input));

  // 1. Personal details
  if (data.personalDetails) {
    if (data.personalDetails.cnicOrFormBNumber) {
      data.personalDetails.cnicOrFormBNumber = String(data.personalDetails.cnicOrFormBNumber).trim();
    }
    if (data.personalDetails.studentName) {
      data.personalDetails.studentName = String(data.personalDetails.studentName).trim();
    }
  }

  // 2. Domicile
  if (data.domicileInformation) {
    if (data.domicileInformation.province && !data.domicileInformation.domicileProvince) {
      data.domicileInformation.domicileProvince = data.domicileInformation.province;
    }
    if (data.domicileInformation.district && !data.domicileInformation.domicileDistrict) {
      data.domicileInformation.domicileDistrict = data.domicileInformation.district;
    }
  }

  // 3. Address
  if (data.address) {
    if (data.address.sameAsPresent && data.address.present) {
      data.address.permanent = { ...data.address.present };
    }
  }

  // 4. Religion & Language
  
... [TRUNCATED] ...
ingAbilities) {
      const val = data.healthDetails.learning;
      data.healthDetails.learningAbilities = {
        difficultyReadingWriting: val === 'No issue' ? 'No Difficulty' : 'Some Difficulty',
        difficultyRemembering: val === 'No issue' ? 'No Difficulty' : 'Some Difficulty',
        difficultyConcentrating: val === 'No issue' ? 'No Difficulty' : 'Some Difficulty'
      };
    }
  }

  // 12. Digital Access
  if (data.digitalAccess) {
    if (data.digitalAccess.device && !data.digitalAccess.hasDigitalDeviceAtHome) {
      data.digitalAccess.hasDigitalDeviceAtHome = data.digitalAccess.device;
    }
    if (data.digitalAccess.devices && !data.digitalAccess.deviceTypes) {
      data.digitalAccess.deviceTypes = Array.isArray(data.digitalAccess.devices) ? data.digitalAccess.devices : [];
    }
    if (data.digitalAccess.internet && !data.digitalAccess.hasInternetAtHome) {
      data.digitalAccess.hasInternetAtHome = data.digitalAccess.internet;
    }
  }

  // 13. Attestation & Signatures
  if (!data.parentGuardianSignatureUrl) {
    if (data.attestation?.signatureDataUrl) {
      data.parentGuardianSignatureUrl = data.attestation.signatureDataUrl;
    }
  }

  return data;
}

module.exports = { normalizeCensusPayload };

```

## File: public/admin/app.js
**Full Path:** `D:\Web Projects\cences-form\backend\public\admin\app.js`

### Metadata & Analysis
- **Syntax Errors:** TypeError: Class constructor Script cannot be invoked without 'new'
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```javascript
// ICB Census Administration Portal Application Logic

const state = {
  token: localStorage.getItem('icb_access_token') || '',
  admin: JSON.parse(localStorage.getItem('icb_admin_profile') || 'null'),
  currentView: 'dashboard',
  students: [],
  selectedStudentIds: new Set(),
  currentPage: 1,
  totalPages: 1,
  totalStudents: 0,
  pageSize: 20,
  activeFilters: {},
  stats: null
};

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const bgColors = {
    info: 'bg-slate-900 text-white',
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    warning: 'bg-amber-600 text-white'
  };

  const toast = document.createElement('div');
  toast.className = `${bgColors[type] || bgColors.info} px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2
... [TRUNCATED] ...
tListener('submit', handleCreateAdmin);
  }

  // Search input debounced
  let searchTimeout = null;
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.currentPage = 1;
        loadStudents();
      }, 400);
    });
  }

  // Filter dropdown listeners
  ['filterClass', 'filterGender', 'filterShift', 'filterStatus', 'filterScholarship', 'filterDisability'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        const keyMap = {
          filterClass: 'class',
          filterGender: 'gender',
          filterShift: 'shift',
          filterStatus: 'submissionStatus',
          filterScholarship: 'recipientOfScholarship',
          filterDisability: 'hasMajorDisability'
        };
        const paramKey = keyMap[id];
        if (el.value) {
          state.activeFilters[paramKey] = el.value;
        } else {
          delete state.activeFilters[paramKey];
        }
        state.currentPage = 1;
        updateActiveFilterBadge();
        loadStudents();
      });
    }
  });

  initApp();
});

```

## File: public/admin/index.html
**Full Path:** `D:\Web Projects\cences-form\backend\public\admin\index.html`

### Metadata & Analysis
- **Syntax Errors:** None detected (basic check).
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ICB Student Census — Administration Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    [x-cloak] { display: none !important; }
    .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white">

  <!-- Toast Notification Center -->
  <div id="toastContainer" class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"></div>

  <!-- AUTH VIEW (L
... [TRUNCATED] ...
      <div>
          <label class="font-bold text-slate-600">Password (min 8 chars)</label>
          <input type="password" id="newAdminPassword" required minlength="8" placeholder="••••••••" class="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
        </div>
        <div>
          <label class="font-bold text-slate-600">Administrative Role</label>
          <select id="newAdminRole" class="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="Viewer">Viewer (Read-only, masked health & CNIC)</option>
            <option value="Registrar">Registrar (Full access, edit & export records)</option>
            <option value="SuperAdmin">SuperAdmin (Complete system authority)</option>
          </select>
        </div>

        <div class="pt-3 flex justify-end gap-2">
          <button type="button" onclick="closeCreateAdminModal()" class="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-semibold">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-semibold">Create Account</button>
        </div>
      </form>
    </div>
  </div>

  <script src="/admin/app.js"></script>
</body>
</html>

```

## File: docs/openapi.json
**Full Path:** `D:\Web Projects\cences-form\backend\docs\openapi.json`

### Metadata & Analysis
- **Syntax Errors:** None detected (basic check).
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "ICB Student Census System API",
    "description": "Production REST API and Administration Engine for Islamabad College for Boys Student Census digitization.",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "http://localhost:3000",
      "description": "Local Development Server"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  },
  "paths": {
    "/health": {
      "get": {
        "summary": "System Health & DB Connectivity Check",
        "responses": {
          "200": {
            "description": "Service status"
          }
        }
      }
    },
    "/api/census/submit": {
      "post": {
        "summary": "Submit Student Census Form (Public)",
        "description": "Accepts the comprehensive census questionnaire, performs validation, checks for duplicates, and assigns a unique reference code.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["personalDetails", "educationalDetails"],
  
... [TRUNCATED] ...
t": {
      "post": {
        "summary": "Export Records to Excel or CSV",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "ids": { "type": "array", "items": { "type": "string" } },
                  "filter": { "type": "object" },
                  "format": { "type": "string", "enum": ["xlsx", "csv"], "default": "xlsx" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Streamed XLSX or CSV file"
          }
        }
      }
    },
    "/api/admin/dashboard/stats": {
      "get": {
        "summary": "Retrieve Aggregated Dashboard Metrics",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Aggregated analytics" }
        }
      }
    },
    "/api/admin/audit-log": {
      "get": {
        "summary": "View Security Audit Trail (SuperAdmin only)",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Audit trail log records" }
        }
      }
    }
  }
}

```

## File: docs/postman_collection.json
**Full Path:** `D:\Web Projects\cences-form\backend\docs\postman_collection.json`

### Metadata & Analysis
- **Syntax Errors:** None detected (basic check).
- **API Routes Defined:** None
- **Database Models:** None
- **App-Level Middleware:** None
- **Environment Variables Used:** None
- **TODOs/FIXMEs:** None
- **File Upload Handling:** No
- **CORS Configuration Detected:** No
- **Auth/Authorization Logic Detected:** No

### File Contents
```json
{
  "info": {
    "_postman_id": "icb-census-api-collection",
    "name": "ICB Student Census API",
    "description": "Postman Collection for ICB Student Census System",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Public API",
      "item": [
        {
          "name": "Health Check",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/health"
          }
        },
        {
          "name": "Submit Census Form",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"personalDetails\": {\n    \"studentName\": \"Muhammad Hamza Khan\",\n    \"cnicFormAvailable\": \"Yes\",\n    \"cnicOrFormBNumber\": \"61101-1234567-1\",\n    \"gender\": \"Male\",\n    \"dateOfBirth\": \"2010-04-15\"\n  },\n  \"educationalDetails\": {\n    \"admissionNumber\": \"ICB-2024-8841\",\n    \"class\": \"9\",\n    \"section\": \"A\",\n    \"shift\": \"Morning\"\n  }\n}"
            },
            "url": "{{baseUrl}}/api/census/submit"
          }
        },
        {
          "name": "Chec
... [TRUNCATED] ...
e=1&limit=25",
              "host": ["{{baseUrl}}"],
              "path": ["api", "admin", "students"],
              "query": [
                { "key": "page", "value": "1" },
                { "key": "limit", "value": "25" }
              ]
            }
          }
        },
        {
          "name": "Print Single Student PDF",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{accessToken}}" }],
            "url": "{{baseUrl}}/api/admin/students/{{studentId}}/print"
          }
        },
        {
          "name": "Bulk Export (Excel)",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Authorization", "value": "Bearer {{accessToken}}" },
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"format\": \"xlsx\"\n}"
            },
            "url": "{{baseUrl}}/api/admin/students/bulk-export"
          }
        }
      ]
    }
  ],
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:3000" },
    { "key": "accessToken", "value": "" },
    { "key": "studentId", "value": "" }
  ]
}

```

