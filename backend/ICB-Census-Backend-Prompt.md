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
mirror the physical form's sections, since admin filtering and CSV export need to reflect this
structure. All fields are optional at the schema level unless marked **required** — the physical
form explicitly allows blank fields ("If any information is not applicable, you may leave the
field blank").

### 1.1 `personalDetails` (required sub-object)
- `studentName` (String, **required**)
- `cnicFormAvailable` (Enum: `Yes`, `No`)
- `cnicOrFormBNumber` (String, format `XXXXX-XXXXXXX-X`, validate pattern but allow blank)
- `gender` (Enum: `Male`, `Female`, `Transgender`)
- `dateOfBirth` (Date)
- `provinceOfBirth` (Enum: `Islamabad Capital Territory`, `Punjab`, `Balochistan`, `Sindh`,
  `Khyber Pakhtunkhwa`, `Gilgit Baltistan`, `AJK`, `Other than Pakistan`)
- `districtOfBirth` (String)

### 1.2 `domicileInformation`
- `nationality` (Enum: `Pakistani`, `Others`) + `otherNationality` (String, conditional)
- `domicileProvince` (Enum, same list as province of birth minus "Other than Pakistan")
- `domicileDistrict` (String)

### 1.3 `address` — present + permanent, each an embedded sub-schema
Fields per address block:
- `addressType` (Enum: `Sector`, `Housing Society`, `Village`, `Others`)
- `sectorSocietyVillageName` (String)
- `houseNo` (String)
- `streetNo` (String)
- `contactNumber` (String, WhatsApp format)
- `city` (String)

### 1.4 `religionLanguageDetails`
- `religion` (Enum: `Muslim`, `Non-Muslim`) + `otherReligion` (String, conditional)
- `motherLanguage` (Enum: `Pashto`, `English`, `Saraiki`, `Punjabi`, `Balti`, `Shina`, `Urdu`,
  `Hindko`, `Sindhi`, `Balochi`)
- `bloodGroup` (Enum: `A+`, `A-`, `AB+`, `AB-`, `O+`, `O-`, `B+`, `B-`)
- `isHafiz` (Enum: `Yes`, `No`)
- `email` (String, validated email format)

### 1.5 `parentGuardian`
Object with two nested identical sub-schemas, `father` and `mother`:
- `name`, `cnic`, `isAlive` (Enum Yes/No), `domicileProvince`, `domicileDistrict`,
  `contactNumber`, `landlineNumber`, `email`
- `qualification` (Enum: `Below Matric`, `Matric`, `Intermediate`, `Graduate`, `Post Graduate`,
  `Ph.D.`, `Other`) + `otherQualification`
- `profession` (Enum: `Govt Employee`, `Private Employee`, `Businessman`, `Farmer`, `Overseas`,
  `Other`) + `otherProfession`
- `incomePerMonth` (Enum: `Less than 50,000`, `50,001–100,000`, `100,001–200,000`,
  `200,001–300,000`, `Above 300,000`)
- `bps` (String, only relevant if profession is Govt Employee)

Plus `orphanGuardian` (sub-object, all conditional on `isOrphan`):
- `isOrphan` (Boolean)
- `orphanType` (Enum: `Double Orphan`, `Single Orphan`)
- `guardianContactNumber`, `guardianEmail`, `guardianQualification`, `guardianProfession`,
  `guardianIncome`, `guardianBps`

### 1.6 `educationalDetails`
- `class`, `section`, `group` (String; group only applies to grades 9–12 — enforce conditionally)
- `resultPercentageLastClass` (String/Number)
- `dateOfAdmission` (Date)
- `admissionNumber` (String, should be unique — index it)
- `classAdmittedIn` (String)
- `shift` (Enum: `Morning`, `Evening`)
- `mediumOfInstruction` (Enum: `Urdu`, `English`)
- `modeOfStudy` (Enum: `Day Scholars`, `Boarders`)
- `lastInstitutionFDE` (String)
- `lastInstitutionOther` (String)
- `availingMealProgram` (Enum: `Yes`, `No`)
- `yearsToCompletePrimary` (Number)

### 1.7 `siblingDetails`
- `totalSiblings` (Number)
- `siblingsSameInstitution` (Number)
- `siblingsOtherFDE` (Number)
- `siblingsPrivateInstitutions` (Number)

### 1.8 `transportScholarship`
- `transportFacility` (Enum: `Institution Bus`, `Private`)
- `recipientOfScholarship` (Enum: `Yes`, `No`)
- `scholarshipDetails` (String, conditional)
- `specialCoCurricularAchievement` (Enum: `Yes`, `No`)
- `achievementDetails` (String, conditional)

### 1.9 `emergencyContact`
- `name` (String), `contactNumber` (String)
- `relation` (Enum: `Father`, `Mother`, `Sister`, `Brother`, `Aunt`, `Uncle`, `Other`)
- `specifyRelation` (String, conditional on Other)

### 1.10 `idpDetails`
- `isRefugeeOrIDP` (Enum: `Yes`, `No`)
- `idpStatus` (Enum: `Registered`, `Unregistered`)
- `isRegisteredAsRefugee` (Boolean)
- `refugeeCardNumber` (String)

### 1.11 `healthDetails`
- `majorDisability`: `{ hasDisability: Enum Yes/No, type: Enum[Physical, Visual, Hearing, Intellectual, Multiple, Other], certificateAttached: Enum[Attached, Not available], certificateFileUrl: String }`
- `mentalHealth`: `{ hasMentalDisability: Enum Yes/No, type: Enum[Autism, ADHD, Other], otherSpecify: String }`
- `otherMedicalConditions` (String, free text)
- `visionDetails`: `{ visuallyFit6x6: Yes/No, glassesPrescription: String, wearsGlasses: Yes/No, boardReadingDifficulty: Enum[No Difficulty, Some Difficulty, A lot of Difficulty, Cannot Do at All] }`
- `hearingDetails`: `{ hasHearingDifficulty: Yes/No, details: String, usesHearingAid: Yes/No, difficultyListening: Yes/No }`
- `mobilityDetails`: `{ difficultyWalking: Yes/No, usesCrutchesWalker: Yes/No }`
- `learningAbilities`: `{ difficultyReadingWriting, difficultyRemembering, difficultyConcentrating }` — each same 4-value enum as boardReadingDifficulty
- `vaccinationCompleted` (Enum: `Yes`, `No`)

> ⚠️ **Sensitive data note**: health/disability data, religion, CNIC numbers, and income are
> sensitive personal data. Implement field-level access control in the admin portal (see §4) so
> only authorized roles can view/export these columns, and log all exports/views of this data in
> an audit trail collection (`AuditLog`).

### 1.12 `digitalAccess`
- `hasDigitalDeviceAtHome` (Enum: `Yes`, `No`)
- `deviceTypes` (Array of Enum: `Mobile Phone`, `Laptop`, `Desktop Computer`, `Tablet`, `Chromebook`)
- `hasInternetAtHome` (Enum: `Yes`, `No`)

### 1.13 Signatures & submission meta
- `parentGuardianSignatureUrl` (String — captured as uploaded image/e-signature, or a
  typed-name legal attestation if e-signature isn't in scope for v1)
- `principalSignature`: filled internally by admin, not by the public submitter
- `submissionStatus` (Enum: `Submitted`, `Under Review`, `Verified`, `Rejected`) default `Submitted`
- `submittedAt` (Date, auto)
- `submittedByIp` (String, for basic fraud/duplicate tracking)
- `formVersion` (String, e.g. `"2026-v1"`)
- `lastEditedBy` (ObjectId ref to Admin, nullable)
- `lastEditedAt` (Date)

### 1.14 `Admin` model (separate collection)
- `name`, `email` (unique), `passwordHash`, `role` (Enum: `SuperAdmin`, `Registrar`, `Viewer`),
  `createdAt`, `lastLoginAt`

### 1.15 `AuditLog` model
- `adminId`, `action` (Enum: `VIEW`, `EXPORT`, `EDIT`, `DELETE`, `PRINT`), `targetStudentId`,
  `timestamp`, `details` (String)

---

## 2. Public API (Student/Parent-Facing)

No auth required — these are public submission endpoints, but must be rate-limited and validated.

- `POST /api/census/submit` — accepts the full form payload, validates against schema, saves with
  `submissionStatus: "Submitted"`. Return a confirmation reference number the parent can save
  (per form instruction #19: "keep a record of the submission/confirmation").
- `GET /api/census/check-status/:admissionNumber` — optional: lets a parent check submission
  status using their admission number + a submission reference code (do NOT expose full record
  data on this public route — return status only).
- `POST /api/census/upload-attachment` — for the disability certificate upload (Multer, restrict
  file type to PDF/JPG/PNG, max size, return a signed URL/reference to attach to the form payload).

Apply **rate limiting** (e.g. express-rate-limit) and **honeypot/CAPTCHA-ready hooks** on the
submit endpoint to prevent spam/duplicate submissions. Add server-side duplicate detection
(same CNIC/Form-B number + name combo already exists → warn/flag, don't hard-block, since
siblings can legitimately share addresses).

---

## 3. Admin API (Authenticated)

All routes under `/api/admin/*`, protected by JWT middleware + role checks.

### 3.1 Auth
- `POST /api/admin/login` — email + password → access + refresh token
- `POST /api/admin/refresh-token`
- `POST /api/admin/logout`
- `POST /api/admin/create-admin` (SuperAdmin only)

### 3.2 Records CRUD
- `GET /api/admin/students` — **paginated, filterable, sortable** list. This is the core feature.
  Support query params for filtering on ANY meaningful field, combinable (AND logic):
  - `class`, `section`, `group`, `shift`, `mediumOfInstruction`, `modeOfStudy`
  - `gender`, `provinceOfBirth`, `domicileProvince`, `religion`, `motherLanguage`, `bloodGroup`
  - `nationality`, `isOrphan`, `orphanType`
  - `recipientOfScholarship`, `transportFacility`
  - `hasMajorDisability`, `disabilityType`, `hasMentalDisability`, `mentalDisabilityType`
  - `hasDigitalDeviceAtHome`, `hasInternetAtHome`
  - `submissionStatus`
  - `admissionDateFrom` / `admissionDateTo` (date range)
  - `incomePerMonth` (father or mother)
  - free-text `search` (name, CNIC, admission number — use a text index or regex)
  - `sortBy`, `sortOrder`, `page`, `limit`
  Return total count + facet counts (e.g., how many per class/gender) so the admin UI can show
  filter chip counts.
- `GET /api/admin/students/:id` — full single record
- `PATCH /api/admin/students/:id` — edit a record (Registrar/SuperAdmin only), auto-set
  `lastEditedBy`/`lastEditedAt`, write an AuditLog entry
- `DELETE /api/admin/students/:id` — SuperAdmin only, soft-delete (add `isDeleted` flag, don't
  hard-delete official records) + AuditLog entry
- `PATCH /api/admin/students/:id/status` — quick status change (Submitted → Under Review →
  Verified/Rejected)

### 3.3 Bulk operations
- `POST /api/admin/students/bulk-export` — accepts an array of IDs **or** the current filter
  query, returns CSV/XLSX export of matching records (use exceljs). Respect field-level
  permissions — e.g., Viewer role export excludes health/CNIC columns.
- `POST /api/admin/students/bulk-print` — accepts IDs or a filter, generates a single combined
  PDF with one formatted census sheet per student (reuses the same print template as the single
  print below), for handing to the registrar's office.
- `POST /api/admin/students/bulk-status-update` — set status on multiple records at once

### 3.4 Print (individual)
- `GET /api/admin/students/:id/print` — generates a print-ready PDF replicating the **original
  form layout** (all sections, checkboxes shown as filled/unfilled) so it looks like the physical
  form was filled digitally. Use Puppeteer rendering an HTML template, or pdfkit with a defined
  layout — either is fine, but the output must be print/signature-ready (admin prints it, gets
  the principal's wet signature, files it).

### 3.5 Dashboard/analytics
- `GET /api/admin/dashboard/stats` — summary counts: total students, by class, by gender, by
  shift, scholarship recipients count, disability count, orphan count, digital-access %, etc.
  (This powers admin dashboard charts — return aggregated data via MongoDB aggregation pipelines,
  don't compute in JS.)

### 3.6 Audit log
- `GET /api/admin/audit-log` — filterable by admin, action type, date range (SuperAdmin only)

---

## 4. Admin Portal (hosted by this backend)

Since you specified the admin portal should run in/from the backend, build it as a server-rendered
app (EJS/Pug + a lightweight frontend framework, or a bundled React admin build served as static
files from Express) with these screens:

1. **Login** screen
2. **Dashboard** — stat cards + charts from §3.5
3. **Student Records table** — server-side paginated table, filter sidebar (checkboxes/dropdowns
   matching §3.2's filter list), search bar, column visibility toggle (hide sensitive columns for
   Viewer role), row actions: View / Edit / Print / Delete
4. **Student Detail view** — full record laid out by the same sections as the physical form,
   with an "Edit" toggle and a "Print" button
5. **Bulk actions bar** — appears when rows are checked: Export Selected, Print Selected,
   Update Status
6. **Admin management** (SuperAdmin only) — create/deactivate admin accounts, assign roles
7. **Audit log viewer** (SuperAdmin only)

Enforce **role-based UI**: Viewer sees records but can't edit/delete/export sensitive fields;
Registrar can edit/export; SuperAdmin has full control including admin management.

---

## 5. Security & Compliance Requirements

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
