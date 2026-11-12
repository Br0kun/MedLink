# Medical Platform 🏥

A secure, real-time medical platform for managing patient dossiers (medical records), processing lab analysis uploads, handling doctor-patient access permissions, and automated triage escalation.

Built as a multi-role EMR-inspired web platform using a modern JavaScript stack with a Next.js frontend and an Express.js backend.

---

## 🏗️ Architecture & Stack

The project is structured as a monorepo containing a Node/Express backend and a Next.js frontend.

### Backend (`/` & `/src`)
*   **Runtime:** Node.js (ES Modules)
*   **Framework:** Express.js
*   **Database ORM:** [Prisma](https://www.prisma.io/) with PostgreSQL
*   **Real-time Communication:** Socket.IO for live alerts & notifications
*   **Authentication:** JWT (JSON Web Tokens) & bcryptjs hashing
*   **Triage Automation:** `node-cron` for scheduled background jobs
*   **Document Generation:** `pdfkit` for generating downloadable patient dossiers

### Frontend (`/medical-platform-frontend`)
*   **Framework:** [Next.js](https://nextjs.org/) (App Router, React 19)
*   **Styling:** Tailwind CSS v4 & PostCSS with custom global theme overrides
*   **State Management:** Zustand
*   **HTTP Client:** Axios
*   **Real-time Communication:** Socket.io-client
*   **Icons:** Lucide React

---

## 🌟 Core Features & Workflows

### 1. Role-Based Access Control (RBAC)
Four user roles are fully supported:
*   **Patients:** Can view their own medical record, review/respond to pending access requests from doctors, revoke active grants, proactively share access with doctors, and export/download their dossier as a PDF.
*   **Doctors:** Can request access to patient records by email, view patient records they are authorized for, prescribe medications, add diagnoses, perform emergency break-glass overrides, and monitor their incoming lab result review inbox.
*   **Labs:** Can upload medical analysis files (PDFs, images) for specific patient records and classify them by priority and medical specialty.
*   **Admins:** Monitor platform statistics, manage/toggle user account statuses (active, suspended), review and approve pending Doctor and Lab credentials, audit security-sensitive actions via the filterable system log, and monitor emergency break-glass logs.

### 2. Registration & Account Verification Workflow
*   To maintain medical credibility, **Doctors** and **Labs** register with a status of `PENDING`. They are locked out of the platform until an **Admin** verifies their credentials (e.g., medical license number for doctors, address for labs).
*   **Patients** and **Admins** are activated immediately upon registration.

### 3. Patient Dossier & Multi-Layer Access Permissions
Each patient has a dedicated `MedicalRecord` (Dossier) containing laboratory analyses, prescriptions, diagnoses, and active access grants. Doctor access is governed by three specific layers of access control:

*   **Layer 1: Base Access Grant**
    *   Before a doctor can view a patient's dossier at all, they must hold a valid base `AccessGrant` (category: `null`) approved by the patient. A doctor can request access by patient email, or a patient can proactively share it.
*   **Layer 2: Specialty Isolation**
    *   A dossier's analyses, prescriptions, and diagnoses are tagged with a medical specialty (category).
    *   By default, a doctor can only see records matching their own specialty (e.g. a cardiologist only sees `CARDIOLOGY` records) or `GENERAL` records. Specialized records from other fields (e.g., `PSYCHIATRY`) are isolated automatically.
*   **Layer 3: Cross-Specialty Opt-In & Scope Restrictions**
    *   A patient can grant a specific doctor access to other specialties by creating a specialty-scoped grant (e.g., scoped to `PSYCHIATRY`).
    *   A grant can also restrict access to specific dossier sections (`scope: ['ANALYSIS', 'PRESCRIPTION', 'DIAGNOSIS']`). An empty scope array defaults to all sections.
    *   Grants can have optional expiration dates (`expiresAt`), after which they transition to `EXPIRED`.

### 4. Proactive Sharing ("Google Drive" Model)
*   Instead of waiting for a doctor's access request, patients can proactively search for a doctor by email and grant them dossier access directly.
*   The patient can select the allowed specialty category, restrict scopes to specific record types, and set a custom time limit for access.

### 5. Emergency Override ("Break-Glass" Protocol)
*   In critical situations, a doctor can perform a "Break-Glass" override to bypass the normal patient approval queue and gain immediate temporary access to a patient's dossier.
*   This action requires a written justification reason.
*   Upon execution, a real-time `BREAK_GLASS_ACCESS` notification alert is sent to the patient.
*   Every break-glass event creates an immutable security log entry in the `BreakGlassLog` table, accessible only by platform Administrators.

### 6. Lab Results Triage & Auto-Escalation Job
*   When uploading results, labs specify a priority: `ROUTINE`, `URGENT`, or `CRITICAL`.
*   Unreviewed results are sent to the authorized doctor's Inbox, sorted by severity.
*   **Safety Net Background Job (Cron):**
    *   Runs every **15 minutes** (`*/15 * * * *`).
    *   Finds all unreviewed analyses and fires SMS + WebSocket alerts to authorized doctors:
        *   **CRITICAL** results: alert after 15 min, re-alert every 6 hours until reviewed.
        *   **ROUTINE** results: alert after the doctor's configured delay (default 12h), re-alert every 24h, respecting quiet hours.
    *   Generates a magic-link in each alert so the doctor can open the report directly without logging in.
    *   Every dispatch is recorded in the `AuditLog` with the Textbee SMS message ID.

### 7. Comprehensive Audit Logging
All significant platform actions are recorded in the `AuditLog` table with the acting user's ID, role, and a human-readable action description. Logged events include:
*   **Doctor:** Accessing a patient's dossier (approved access only).
*   **Patient:** Viewing their own dossier, approving or denying a doctor's access request, proactively creating direct grants.
*   **Lab:** Uploading a new analysis for a patient.
*   **Admin:** Toggling user account status (suspend/reactivate), verifying doctor/lab accounts.

### 8. Light / Dark Theme System
*   A globally accessible floating toggle button (☀️/🌙) allows switching between light and dark modes across the entire platform.
*   Theme preference is persisted in `localStorage` and synced instantly across all pages via a custom `themechange` event.
*   **Dark Mode:** Pitch black (`#000000`) page backgrounds, charcoal (`#0a0a0c`) sidebars/headers, and clean zinc-800 borders.
*   **Light Mode:** Cool slate-100 (`#f1f5f9`) page backgrounds, crisp white (`#ffffff`) sidebars/panels, and slate-300 (`#cbd5e1`) borders for strong visual separation.
*   Authentication pages (Login/Register) use a fixed dark clinical background so the EKG cardiac monitor animation always remains readable.

---

## 📂 Project Directory Structure

```
medical-platform/
├── prisma/
│   ├── migrations/             # SQL migration files generated by Prisma
│   └── schema.prisma           # Prisma database schema definition
├── src/
│   ├── config/
│   │   └── db.js               # Prisma client initialization
│   ├── controllers/            # Request handlers for API business logic
│   │   ├── admin.controller.js
│   │   ├── api.controller.js
│   │   ├── appointment.controller.js
│   │   ├── auth.controller.js
│   │   ├── chat.controller.js
│   │   ├── doctor.controller.js
│   │   ├── dossier.controller.js
│   │   ├── lab.controller.js
│   │   ├── magicLink.controller.js
│   │   ├── notification.controller.js
│   │   ├── staff_schedule.controller.js
│   │   └── user.controller.js
│   ├── jobs/
│   │   ├── safetyNet.js        # 15-min cron: SMS alerts for unreviewed lab results
│   │   └── escalation.js       # Re-export alias for safetyNet job
│   ├── middlewares/
│   │   └── auth.js             # Express & Socket.io authentication guards
│   ├── routes/                 # Express Router endpoint mappings
│   ├── utils/
│   │   ├── access.js           # Specialty permissions & grant matching logic
│   │   ├── notify.js           # Real-time and database notification handler
│   │   └── upload.js           # Multer file upload setup for lab results
│   ├── index.js                # App entrypoint, Express app & Socket.IO server
│   └── generated/              # Auto-generated Prisma client build target
├── uploads/                    # Local storage directory for analysis files and PDFs
├── run-safety-net.mjs          # Demo helper: trigger safety net evaluation immediately
├── reset-safety-net.mjs        # Demo helper: backdate analyses to bypass 15-min gate
├── package.json                # Backend dependency and script manager
├── prisma.config.js            # Prisma configuration overrides
├── .env                        # Local environment credentials (git-ignored)
└── medical-platform-frontend/  # Next.js App Router Frontend
    ├── public/                 # Static assets
    └── src/
        ├── app/                # App Router pages and layouts
        │   ├── (auth)/         # Login / registration routing groups
        │   │   ├── login/      # Login page with animated EKG cardiac monitor
        │   │   └── register/   # Register page with animated EKG cardiac monitor
        │   ├── (dashboard)/    # Layouts & pages for Patient/Doctor/Lab/Admin panels
        │   │   ├── patient/    # Patient workspace, dossier, access, and notifications
        │   │   ├── doctor/     # Doctor dashboard, inbox, and patients list
        │   │   ├── lab/        # Lab upload dashboard
        │   │   └── admin/      # Admin overview, users, verifications, audit log
        │   ├── globals.css     # Global theme overrides & sidebar hover system
        │   ├── layout.js       # Root layout with floating light/dark theme toggle
        │   └── page.jsx        # Landing page with auth-role redirects
        ├── lib/
        │   ├── api.js          # Centralized Axios setup
        │   └── socket.js       # Socket.IO connection client
        └── store/
            └── auth.js         # Zustand global authentication state store
```

---

## 💾 Database Schema (Prisma)

The application uses the following main tables defined in [`prisma/schema.prisma`](file:///c:/Users/ilyas/Documents/medical-platform/prisma/schema.prisma):
*   **`User`**: Handles authentication. Links to profile tables based on `Role` (`PATIENT`, `DOCTOR`, `LAB`, `ADMIN`).
*   **`Patient`**: Custom patient attributes, pointing to their single `MedicalRecord` (Dossier).
*   **`Doctor`**: Stores license number, specialty (e.g. `CARDIOLOGY`), verification state, and access relationships.
*   **`Lab`**: Lab organization details and verification state.
*   **`MedicalRecord`**: Container model joining diagnoses, prescriptions, analyses, and access grants.
*   **`AccessGrant`**: Track access requests and proactive permissions. Includes columns for `category` (Specialty restriction), `scope` (array of `Section` parts), and `expiresAt` (expiry datetime).
*   **`Analysis`**: Laboratory test uploads. Tracks priority, category, file attachments, and review states.
*   **`Prescription`** & **`Diagnosis`**: Detailed health entries logged by doctors on dossiers.
*   **`Notification`**: Standard user-targeted messages.
*   **`AuditLog`**: Full immutable audit trail recording actions by all user roles. Searchable and filterable in the Admin UI.
*   **`BreakGlassLog`**: Emergency access logger recording doctor name, reason, dossier accessed, and timestamps.

---

## 🚀 Local Development Setup

Follow these steps to run both the backend and frontend locally.

### 📋 Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   [PostgreSQL](https://www.postgresql.org/) database server running locally or hosted

---

### Step 1: Configure Environment Variables
Create a file named `.env` in the root backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Connection (replace with your PostgreSQL credentials)
DATABASE_URL="postgresql://postgres:password@localhost:5432/medical_platform_db"

# JWT Config
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=7d
```

---

### Step 2: Database Initialization (Backend)
1.  Install backend dependencies:
    ```bash
    npm install
    ```
2.  Generate the Prisma client code and apply migrations to initialize your database:
    ```bash
    npx prisma migrate dev --name init
    ```
3.  *(Optional)* If you need to browse your database visually, start Prisma Studio:
    ```bash
    npx prisma studio
    ```

---

### Step 3: Run the Backend Server
Start the backend Express server with nodemon auto-restart:
```bash
npm run dev
```
The backend server will launch on [http://localhost:5000](http://localhost:5000).

---

### Step 4: Run the Next.js Frontend
1.  Navigate into the frontend directory:
    ```bash
    cd medical-platform-frontend
    ```
2.  Install frontend dependencies:
    ```bash
    npm install
    ```
3.  Start the Next.js dev server:
    ```bash
    npm run dev
    ```
The frontend application will launch on [http://localhost:3000](http://localhost:3000).

---

## ⚡ Real-Time Socket Events Reference

The Socket.IO connection is initialized upon user login. Standard events include:
*   `notification`: Fired for all system notifications (new access requests, lab result uploads, admin verification updates).
*   `safety_net_alert`: Sent to doctors by the 15-min cron job when a lab result is unreviewed past the threshold. Payload includes `analysisId`, `patientName`, `analysisType`, `priority`, and a one-click `magicLink`.
*   `BREAK_GLASS_ACCESS`: Sent to a patient when a doctor performs an emergency break-glass override on their dossier.
*   *Rooms:* Every connected socket automatically joins a room named after their unique `userId` (`socket.join(userId)`), ensuring target notifications are delivered securely.

---

## 📝 REST API Endpoints Reference

All requests must supply the HTTP Header `Authorization: Bearer <your_jwt_token>` for authenticated endpoints.

### Authentication (`/auth`)
*   `POST /auth/register`: Create user account. Returns token (if Patient/Admin) or pending message (if Doctor/Lab).
*   `POST /auth/login`: Authenticate existing user credentials.

### Patient & Doctor Dossiers (`/dossier`)
*   `GET /dossier/me`: *(Patient)* Fetch own dossier with full analyses, prescriptions, and active access grants. Logs a `PATIENT` audit entry.
*   `GET /dossier/access/pending`: *(Patient)* View incoming access requests from doctors.
*   `PUT /dossier/access/:id/respond`: *(Patient)* Approve (`APPROVED`) or Deny (`DENIED`) an access request. Scopes and durations are supported. Logs a `PATIENT` audit entry.
*   `PUT /dossier/access/:id/revoke`: *(Patient)* Revoke a doctor's active access grant.
*   `POST /dossier/access/grant`: *(Patient)* Proactively grant direct access to a doctor by email with specialty categories, expiration date, and section scopes.
*   `GET /dossier/download/pdf`: *(Patient)* Generate and download the patient record as a formatted PDF.
*   `GET /dossier/my-patients`: *(Doctor)* List all patient records authorized for review.
*   `GET /dossier/by-email/:email`: *(Doctor)* Fetch patient dossier by email (if access is approved). Specialty isolation filters out unauthorized records. Logs a `DOCTOR` audit entry.
*   `POST /dossier/access/request`: *(Doctor)* Submit access request for a patient by email.
*   `POST /dossier/prescription/:patientEmail`: *(Doctor)* Append a new medication prescription to a patient's dossier. Requires specialty validation.
*   `POST /dossier/diagnosis/:patientEmail`: *(Doctor)* Append a new diagnosis to a patient's dossier. Requires specialty validation.
*   `POST /dossier/break-glass/:patientEmail`: *(Doctor)* Bypasses permissions to gain temporary emergency access. Generates a patient notification and a break glass audit log.
*   `GET /dossier/:patientId`: *(Doctor)* Retrieve patient details (if access is approved).

### Labs (`/lab`)
*   `POST /lab/upload`: *(Lab)* Upload analysis file (`multer` multipart upload) for a patient. Must be verified. Logs a `LAB` audit entry.
*   `GET /lab/uploads`: *(Lab)* Fetch all analysis files uploaded by this lab.
*   `GET /lab/mine`: *(Patient)* View all analyses uploaded for the logged-in patient.
*   `GET /lab/:patientId`: *(Doctor)* Retrieve analyses of a patient under the doctor's supervision.

### Doctor Inbox (`/doctor`)
*   `GET /doctor/inbox`: *(Doctor)* Fetch all unreviewed analyses for authorized patients, prioritized (Critical first).
*   `GET /doctor/inbox/count`: *(Doctor)* Return count of unreviewed analyses (for UI badges).
*   `PUT /doctor/inbox/:id/review`: *(Doctor)* Mark a specific analysis as reviewed.

### Admin Management (`/admin`)
*   `GET /admin/stats`: Fetch overall metrics (user counts, analysis totals, pending access grants count).
*   `GET /admin/users`: List all platform users with pagination and role filters.
*   `GET /admin/users/:id`: View detailed user profiles, including records or professional settings.
*   `PUT /admin/users/:id/toggle`: Suspend or reactivate a user account. Logs an `ADMIN` audit entry.
*   `GET /admin/verifications`: Get a list of pending doctor and lab verification requests.
*   `PUT /admin/verifications/:id`: Verify (`APPROVED` or `REJECTED`) a doctor's or lab's registration status. Logs an `ADMIN` audit entry.
*   `GET /admin/audit-logs`: View search-filterable system logs of administrative actions. Supports `?role=PATIENT|DOCTOR|LAB|ADMIN` and `?search=` query params.
*   `GET /admin/access-grants`: Retrieve all dossier access permissions granted.
*   `GET /admin/break-glass-logs`: Retrieve logs of all emergency doctor overrides.

### Notifications (`/notifications`)
*   `GET /notifications`: Get all user notifications.
*   `GET /notifications/unread`: Count of unread user notifications.
*   `PUT /notifications/read-all`: Mark all notifications as read.
*   `PUT /notifications/:id/read`: Mark a single notification as read.
