#                                        Medlink
<p align="center">
  <img src="https://media.giphy.com/media/3o7TKuFYevgE2b6Mx2/giphy.gif" width="350" alt="Medical Humor GIF">
</p>

A multi-role medical records platform designed to manage patient dossiers, coordinate access between healthcare professionals, and handle laboratory results through a centralized system.

The platform brings patients, doctors, laboratories, and administrators into a shared environment where medical information can be managed, accessed, and reviewed according to clearly defined permissions.

Rather than treating medical records as simple documents, the system introduces multiple layers of access control, specialty-based isolation, temporary permissions, emergency access procedures, and automated follow-up mechanisms for unreviewed laboratory results.

Built with Next.js, Express.js, and PostgreSQL, the project combines a modern web interface with a backend responsible for authentication, authorization, medical data management, and real-time communication.

---

## Architecture & Technology Stack

The application follows a monorepo structure, separating the frontend and backend while maintaining a shared project environment.

### Backend

The backend handles authentication, business logic, database operations, access control, background jobs, and communication between platform roles.

| Component | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT |
| Password Hashing | bcryptjs |
| Real-time Communication | Socket.IO |
| Background Jobs | node-cron |
| PDF Generation | pdfkit |
| File Uploads | Multer |

### Frontend

The frontend provides separate workspaces for each platform role, with centralized authentication state and real-time notification handling.

| Component | Technology |
|---|---|
| Framework | Next.js (App Router) |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 |
| State Management | Zustand |
| HTTP Client | Axios |
| Real-time Communication | Socket.io-client |
| Icons | Lucide React |

---

## Core Features & System Workflows

### 1. Multi-Role Architecture & Access Control

The platform operates around four distinct user roles. Each role has its own responsibilities, interface, and permitted operations.

**Patients**

Patients remain in control of their medical information. They can:

- Access and review their medical dossier.
- Receive and respond to doctors' access requests.
- Approve, deny, or revoke access permissions.
- Share their records directly with doctors.
- Configure specialty restrictions and access durations.
- Download their medical dossier as a PDF.
- Receive notifications about access requests and emergency access events.

**Doctors**

Doctors interact with patient records according to their verified professional specialty and the permissions granted to them.

They can:

- Request access to patient dossiers.
- Review authorized patient records.
- Add diagnoses and prescriptions.
- Access laboratory results through a dedicated inbox.
- Perform emergency access overrides when necessary.

**Laboratories**

Laboratories are responsible for submitting medical analysis results.

They can:

- Upload laboratory reports in PDF or image format.
- Associate results with specific patient records.
- Classify submissions according to priority and medical specialty.
- Track previously uploaded analyses.

**Administrators**

Administrators oversee platform operations and account verification.

They can:

- Monitor platform statistics.
- Manage user accounts and their active or suspended status.
- Review and approve doctor and laboratory registrations.
- Inspect system audit logs.
- Monitor emergency access events.

### 2. Registration & Professional Verification

Not every account receives immediate access to the platform.

Patients and administrators become active immediately after registration. Doctors and laboratories follow a separate verification process.

When a doctor or laboratory creates an account, its status is initially set to `PENDING`. Access to the platform remains restricted until an administrator reviews and approves the submitted professional information.

For example, doctors must provide their medical license information, while laboratories submit their organizational details.

This introduces an additional verification step before professional accounts can interact with patient records.

### 3. Patient Dossiers & Layered Permission Model

Each patient has a dedicated `MedicalRecord` containing their medical information, including:

- Laboratory analyses.
- Medical prescriptions.
- Diagnoses.
- Access grants.

Access to this information is not controlled by a single permission flag. Instead, the platform implements three distinct authorization layers.

**Layer 1 — Base Access Grant**

A doctor must first obtain an approved base `AccessGrant` before accessing a patient's dossier.

This permission can be established through two workflows:

- The doctor submits an access request using the patient's email address.
- The patient proactively grants access to the doctor.

Without an approved base grant, the doctor cannot access the dossier.

**Layer 2 — Specialty Isolation**

Medical information is associated with a specialty category.

By default, doctors can access records belonging to their own specialty or records classified as `GENERAL`.

For example, a cardiologist can access cardiology-related information and general records, but specialized psychiatric records remain isolated.

This prevents a general access grant from automatically exposing every medical section to every doctor.

**Layer 3 — Cross-Specialty Permissions & Scope Restrictions**

Patients can explicitly extend access beyond a doctor's default specialty.

A patient may grant a specific doctor access to another specialty by creating a category-specific permission.

Access grants can also restrict which dossier sections are available:

- `ANALYSIS`
- `PRESCRIPTION`
- `DIAGNOSIS`

The `scope` field determines which sections are accessible. An empty scope array defaults to all sections.

Permissions can additionally include an optional `expiresAt` timestamp. Once the expiration date is reached, the grant transitions to `EXPIRED`.

Together, these layers provide more granular control over who can access medical information and which parts of a dossier they can see.

### 4. Proactive Medical Record Sharing

Access does not always have to begin with a doctor's request.

Patients can search for doctors using their email addresses and directly establish access permissions.

During this process, patients can configure:

- The permitted medical specialty.
- Accessible dossier sections.
- The duration of the permission.

This creates a sharing workflow similar to document-sharing systems, while retaining medical-specific authorization rules.

### 5. Emergency Access — Break-Glass Protocol

Normal access permissions are designed to protect patient information, but emergency situations may require a different approach.

The platform implements a break-glass mechanism that allows doctors to obtain temporary access to a patient's dossier without waiting for the normal approval workflow.

This operation requires a written justification.

However, bypassing the normal approval process does not mean bypassing accountability.

Every emergency access operation triggers two important actions:

1. A real-time `BREAK_GLASS_ACCESS` notification is sent to the patient.
2. An immutable entry is created in the `BreakGlassLog` table.

These events are available to platform administrators for auditing and review.

The mechanism introduces an emergency exception while maintaining visibility over sensitive access operations.

### 6. Laboratory Results & Automated Triage

Laboratory uploads are not treated as passive file attachments.

Each submitted analysis receives a priority classification:

- `ROUTINE`
- `URGENT`
- `CRITICAL`

Unreviewed results are delivered to the inbox of authorized doctors and organized according to their severity.

To reduce the possibility of important results remaining unnoticed, the backend includes an automated safety-net job.

**Background Monitoring**

The safety-net process runs every 15 minutes using `node-cron`.

During each execution, it identifies analyses that remain unreviewed beyond their configured notification thresholds.

The notification rules are:

| Priority | Initial Alert | Subsequent Alerts |
|---|---|---|
| CRITICAL | After 15 minutes | Every 6 hours |
| ROUTINE | After configured delay (12 hours by default) | Every 24 hours |

Routine notifications also respect the doctor's configured quiet hours.

The system uses SMS and WebSocket notifications to reach authorized doctors.

Each alert includes a magic link that allows the doctor to open the associated report directly without going through the standard login flow.

Every notification dispatch is recorded in the `AuditLog`, including the Textbee SMS message ID.

### 7. Audit Logging & Accountability

Sensitive operations throughout the platform generate audit entries.

The `AuditLog` records information about the acting user, their role, and a human-readable description of the performed action.

Examples include:

- Doctors accessing authorized patient dossiers.
- Patients viewing their medical records.
- Patients approving or denying access requests.
- Patients creating direct access grants.
- Laboratories uploading medical analyses.
- Administrators suspending or reactivating accounts.
- Administrators verifying professional registrations.

Administrators can search and filter these events through the administrative interface.

Emergency access events are also tracked separately through `BreakGlassLog`.

This provides a way to inspect how sensitive operations are performed across the platform.

### 8. Interface & Theme System

The frontend includes a global light and dark theme system accessible through a floating toggle.

Theme preferences are stored in `localStorage` and synchronized across pages through a custom `themechange` event.

The visual configuration includes:

**Dark Theme**
- Black page backgrounds (`#000000`).
- Charcoal navigation and header surfaces (`#0a0a0c`).
- Zinc-800 borders.

**Light Theme**
- Cool slate backgrounds (`#f1f5f9`).
- White navigation and panel surfaces (`#ffffff`).
- Slate-300 borders (`#cbd5e1`).

Authentication pages retain a fixed dark clinical background, including the animated EKG cardiac monitor.

---

## Project Structure

The repository separates backend functionality from the Next.js frontend.

```text
medical-platform/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
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
│   │   ├── safetyNet.js
│   │   └── escalation.js
│   ├── middlewares/
│   │   └── auth.js
│   ├── routes/
│   ├── utils/
│   │   ├── access.js
│   │   ├── notify.js
│   │   └── upload.js
│   ├── index.js
│   └── generated/
├── uploads/
├── run-safety-net.mjs
├── reset-safety-net.mjs
├── package.json
├── prisma.config.js
├── .env
└── medical-platform-frontend/
    ├── public/
    └── src/
        ├── app/
        │   ├── (auth)/
        │   │   ├── login/
        │   │   └── register/
        │   ├── (dashboard)/
        │   │   ├── patient/
        │   │   ├── doctor/
        │   │   ├── lab/
        │   │   └── admin/
        │   ├── globals.css
        │   ├── layout.js
        │   └── page.jsx
        ├── lib/
        │   ├── api.js
        │   └── socket.js
        └── store/
            └── auth.js
```

---

## Database Design

The database is managed through Prisma and PostgreSQL.

The main models represent the platform's users, medical information, permissions, and operational events.

| Model | Responsibility |
|---|---|
| `User` | Authentication and role-based identity management. |
| `Patient` | Patient-specific information and relationship with a medical record. |
| `Doctor` | Professional information, specialty, verification status, and access relationships. |
| `Lab` | Laboratory organization information and verification status. |
| `MedicalRecord` | Central container for diagnoses, prescriptions, analyses, and access grants. |
| `AccessGrant` | Access requests and permissions, including specialty, scope, and expiration. |
| `Analysis` | Laboratory reports, attachments, priority, specialty, and review status. |
| `Prescription` | Medication prescriptions associated with patient records. |
| `Diagnosis` | Medical diagnoses recorded by doctors. |
| `Notification` | User-targeted platform notifications. |
| `AuditLog` | Audit trail for actions performed across the platform. |
| `BreakGlassLog` | Records of emergency access operations, including justification and timestamps. |

The complete schema is defined in [`prisma/schema.prisma`](prisma/schema.prisma).

---

## Real-Time Communication

Socket.IO is used to deliver notifications without requiring users to refresh their dashboards.

A socket connection is established after authentication. Each connected user joins a room identified by their unique `userId`.

This allows the backend to target notifications to the appropriate user.

The main socket events include:

| Event | Description |
|---|---|
| `notification` | General notifications, including access requests, laboratory uploads, and verification updates. |
| `safety_net_alert` | Alerts sent to doctors when laboratory results remain unreviewed beyond their notification thresholds. |
| `BREAK_GLASS_ACCESS` | Emergency access notification delivered to the affected patient. |

The `safety_net_alert` payload includes the analysis ID, patient name, analysis type, priority, and magic link.

---

## REST API Reference

Authenticated endpoints require the following HTTP header:

```http
Authorization: Bearer <your_jwt_token>
```

### Authentication — `/auth`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new account. Patients and administrators receive immediate activation; doctors and laboratories enter pending verification. |
| POST | `/auth/login` | Authenticate an existing user. |

### Patient & Doctor Dossiers — `/dossier`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dossier/me` | Retrieve the patient's own dossier, including analyses, prescriptions, and access grants. |
| GET | `/dossier/access/pending` | Retrieve incoming doctor access requests. |
| PUT | `/dossier/access/:id/respond` | Approve or deny an access request, with scope and duration configuration. |
| PUT | `/dossier/access/:id/revoke` | Revoke an active access grant. |
| POST | `/dossier/access/grant` | Directly grant access to a doctor using their email address. |
| GET | `/dossier/download/pdf` | Generate and download a PDF version of the patient's dossier. |
| GET | `/dossier/my-patients` | Retrieve patient records authorized for the doctor. |
| GET | `/dossier/by-email/:email` | Retrieve an authorized patient's dossier with specialty-based filtering. |
| POST | `/dossier/access/request` | Submit a patient access request. |
| POST | `/dossier/prescription/:patientEmail` | Add a prescription to a patient's dossier, subject to specialty validation. |
| POST | `/dossier/diagnosis/:patientEmail` | Add a diagnosis to a patient's dossier, subject to specialty validation. |
| POST | `/dossier/break-glass/:patientEmail` | Initiate emergency access and generate the corresponding notification and audit entry. |
| GET | `/dossier/:patientId` | Retrieve patient details when access is approved. |

### Laboratory Management — `/lab`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/lab/upload` | Upload a laboratory analysis using multipart form data. Requires a verified laboratory account. |
| GET | `/lab/uploads` | Retrieve analyses uploaded by the authenticated laboratory. |
| GET | `/lab/mine` | Retrieve analyses associated with the authenticated patient. |
| GET | `/lab/:patientId` | Retrieve analyses belonging to a patient under the doctor's supervision. |

### Doctor Inbox — `/doctor`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/doctor/inbox` | Retrieve unreviewed analyses for authorized patients, ordered by priority. |
| GET | `/doctor/inbox/count` | Retrieve the number of unreviewed analyses. |
| PUT | `/doctor/inbox/:id/review` | Mark an analysis as reviewed. |

### Administration — `/admin`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | Retrieve platform statistics. |
| GET | `/admin/users` | Retrieve users with pagination and role filters. |
| GET | `/admin/users/:id` | Retrieve detailed user information. |
| PUT | `/admin/users/:id/toggle` | Suspend or reactivate a user account. |
| GET | `/admin/verifications` | Retrieve pending doctor and laboratory verification requests. |
| PUT | `/admin/verifications/:id` | Approve or reject a professional registration. |
| GET | `/admin/audit-logs` | Retrieve filterable administrative and system audit logs. |
| GET | `/admin/access-grants` | Retrieve dossier access permissions. |
| GET | `/admin/break-glass-logs` | Retrieve emergency access records. |

The audit log endpoint supports role and search filters:

```http
GET /admin/audit-logs?role=DOCTOR
GET /admin/audit-logs?search=access
```

### Notifications — `/notifications`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | Retrieve user notifications. |
| GET | `/notifications/unread` | Retrieve the unread notification count. |
| PUT | `/notifications/read-all` | Mark all notifications as read. |
| PUT | `/notifications/:id/read` | Mark a specific notification as read. |

---

## Local Development Setup

The following instructions describe how to run the backend and frontend locally.

### Prerequisites

Make sure the following are installed:

- [Node.js](https://nodejs.org/) (v18 or higher recommended).
- [PostgreSQL](https://www.postgresql.org/) database server.

### 1. Environment Configuration

Create a `.env` file in the backend root directory.

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Connection
DATABASE_URL="postgresql://postgres:password@localhost:5432/medical_platform_db"

# JWT Configuration
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=7d
```

Replace the database credentials and JWT secret with your local configuration.

### 2. Backend Installation & Database Initialization

Install the backend dependencies:

```bash
npm install
```

Generate the Prisma client and initialize the database through migrations:

```bash
npx prisma migrate dev --name init
```

To inspect the database visually, you can optionally launch Prisma Studio:

```bash
npx prisma studio
```

### 3. Start the Backend

Run the Express development server:

```bash
npm run dev
```

The backend will be available at:

`http://localhost:5000`

### 4. Frontend Installation & Startup

Navigate to the frontend directory:

```bash
cd medical-platform-frontend
```

Install the frontend dependencies:

```bash
npm install
```

Start the Next.js development server:

```bash
npm run dev
```

The frontend will be available at:

`http://localhost:3000`

---

## Development Notes

The project includes two additional scripts for working with the automated laboratory notification system:

| Script | Purpose |
|---|---|
| `run-safety-net.mjs` | Trigger the safety-net evaluation immediately for testing. |
| `reset-safety-net.mjs` | Backdate analysis records to bypass the normal 15-minute threshold during testing. |

These scripts are useful when testing notification and escalation behavior without waiting for the scheduled background job.

---

## Project Scope

The platform brings together several interconnected areas of application development:

- Multi-role authentication and authorization.
- Specialty-based access control.
- Granular and time-limited permissions.
- Medical record management.
- Emergency access workflows.
- File uploads and PDF generation.
- Scheduled background processing.
- Real-time notifications.
- Audit logging and administrative monitoring.

Each component contributes to a larger workflow in which medical information is not only stored, but also shared, accessed, reviewed, and monitored through defined application rules.

