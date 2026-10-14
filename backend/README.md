# ICB Student Census System — Backend & Admin Portal

Production backend application and administrative suite for Islamabad College for Boys (G-6/3, Islamabad) student census digitization.

---

## Architecture Overview

- **Runtime**: Node.js (>=20) & Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Role-based JWT authentication (`SuperAdmin`, `Registrar`, `Viewer`) with httpOnly cookie refresh tokens
- **Data Validation**: Strict & forgiving Zod schemas matching official census form specifications
- **Document Generation**: High-fidelity PDF census bio-data sheets using PDFKit (with principal signature and stamp block)
- **Data Export**: Role-aware Excel (`.xlsx`) & CSV export using ExcelJS (masks health and CNIC data for Viewer role)
- **Hosted Admin Portal**: Full single-page administrative console served directly at `/admin`
- **Security & Compliance**: Rate-limiting, anti-bot honeypots, field-level access control, and complete audit trail logging (`AuditLog`)

---

## Project Structure

```
backend/
├── docs/
│   ├── openapi.json            # OpenAPI 3.0 API Specification
│   └── postman_collection.json # Postman Collection
├── public/
│   └── admin/                  # Hosted Administration Portal
│       ├── index.html          # Modern Tailwind CSS Admin Interface
│       └── app.js              # Admin Dashboard, Tables, & Filters logic
├── src/
│   ├── constants/
│   │   └── enums.js            # Standardized schema enums & options
│   ├── middleware/
│   │   ├── auth.js             # JWT authentication & role-based guards
│   │   └── error-handler.js    # Global error formatter
│   ├── models/                 # Mongoose Data Models
│   │   └── ...                 # (Exported via models.js)
│   ├── routes/
│   │   ├── admin.js            # Admin CRUD, Bulk Operations & Analytics
│   │   └── census.js           # Public submission & status inquiry
│   ├── scripts/
│   │   └── seed-admin.js       # SuperAdmin & Sample Data seeder
│   ├── services/
│   │   ├── audit-service.js    # Security & compliance audit logger
│   │   ├── export-service.js   # Role-aware XLSX and CSV streaming
│   │   └── pdf-service.js      # Individual and bulk PDF generator
│   ├── utils/
│   │   └── normalizer.js       # Payload compatibility normalizer
│   ├── models.js               # Model definitions
│   ├── server.js               # Express application entrypoint
│   └── validation.js           # Zod schema definitions
├── .env.example
├── package.json
└── README.md
```

---

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
# Windows
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

### 3. Initialize SuperAdmin & Sample Records

```bash
# Create the initial SuperAdmin account:
npm run seed:admin

# Or seed SuperAdmin along with realistic sample student records:
node src/scripts/seed-admin.js --sample-data
```

Default credentials:
- **Email**: `admin@icb.edu.pk`
- **Password**: `AdminPass123!`

### 4. Run the Server

```bash
# Production mode:
npm start

# Development mode (with file watch):
npm run dev
```

---

## Endpoints Reference

### Public API (Student / Parent)
- `POST /api/census/submit` — Submit completed census form. Returns reference number (e.g. `ICB-2026-A19F42`). Includes rate-limiting and duplicate warning.
- `GET /api/census/check-status/:admissionNumber?reference=...` — Safe submission status check without exposing sensitive personal info.
- `POST /api/census/upload-attachment` — Upload disability certificate or medical document (PDF/JPG/PNG, up to 5MB).

### Administrative API (`/api/admin`)
- `POST /api/admin/login` — Administrator authentication; sets httpOnly refresh cookie.
- `POST /api/admin/refresh-token` — Rotate access token.
- `POST /api/admin/logout` — Revoke session.
- `GET /api/admin/me` — Currently authenticated admin profile.
- `GET /api/admin/dashboard/stats` — Aggregated demographics (counts, gender breakdown, class distribution, shift, digital access rates).
- `GET /api/admin/students` — Paginated, filterable student records list with search and facet counts.
- `GET /api/admin/students/:id` — Full student record (masks sensitive fields if Viewer role).
- `PATCH /api/admin/students/:id` — Update student record (Registrar & SuperAdmin).
- `PATCH /api/admin/students/:id/status` — Quick status change (Submitted / Under Review / Verified / Rejected).
- `DELETE /api/admin/students/:id` — Soft delete record (SuperAdmin only).
- `POST /api/admin/students/bulk-status-update` — Batch update status across multiple records.
- `POST /api/admin/students/bulk-export` — Export matching records as XLSX or CSV (role-aware redaction).
- `POST /api/admin/students/bulk-print` — Combined multi-page PDF generation for selected records.
- `GET /api/admin/students/:id/print` — Official printable census sheet PDF replicating the physical form with signature blocks.
- `GET /api/admin/admins` — List administrator accounts (SuperAdmin only).
- `POST /api/admin/create-admin` — Create new administrator account (SuperAdmin only).
- `PATCH /api/admin/admins/:id` — Toggle active status or change roles (SuperAdmin only).
- `GET /api/admin/audit-log` — Filterable compliance audit logs (SuperAdmin only).

---

## Admin Portal

Open your browser to:
```
http://localhost:3000/admin
```
Features:
- **Interactive Analytics Dashboard**: Visual breakdown of enrollment by class, status distribution, and digital access equity.
- **Advanced Record Management**: Filter by Class, Shift, Gender, Status, Scholarship, and Disability.
- **Bulk Action Bar**: Select multiple records for batch status change, combined PDF printing, or spreadsheet export.
- **Printable Bio-data Sheets**: One-click generation of the official printable ICB student census archive sheet with principal endorsement box.
