# 🏥 Medical Platform — Presentation Guide

> **Project:** Secure, real-time Electronic Medical Record (EMR) platform
> **Stack:** Node.js + Express backend · Next.js (React 19) frontend · PostgreSQL (Prisma ORM)

---

## Slide 1 — What Is This Project?

A **multi-role web platform** that digitizes the entire lifecycle of a patient's medical record:

- A **patient** owns their medical dossier and controls who sees it.
- A **doctor** requests access, views records, writes prescriptions and diagnoses.
- A **lab** uploads test results (analyses) for patients.
- An **admin** governs the platform: verifies credentials, monitors security logs.
- A **medical assistant** manages the clinic's appointment schedule.

Everything is connected in **real-time** via WebSockets (Socket.IO), and the system includes an **automated background alert engine** that sends SMS messages to doctors when lab results go unreviewed.

---

## Slide 2 — Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend runtime | Node.js (ES Modules) |
| Backend framework | Express.js |
| Database | PostgreSQL via **Prisma ORM** |
| Real-time | **Socket.IO** |
| Authentication | **JWT** + bcryptjs |
| File uploads | **Multer** (PDFs, images) |
| PDF generation | **pdfkit** |
| SMS alerts | **Textbee** API |
| Background jobs | **node-cron** |
| Frontend framework | **Next.js** App Router (React 19) |
| Styling | **Tailwind CSS v4** |
| State management | **Zustand** |
| HTTP client | **Axios** |

---

## Slide 3 — The 5 Roles

```
+--------------+   +--------------+   +--------------+
|   PATIENT    |   |   DOCTOR     |   |     LAB      |
|  owns their  |   |  requests    |   |  uploads     |
|   dossier    |   |   access     |   |  analyses    |
+--------------+   +--------------+   +--------------+

        +--------------+   +------------------+
        |    ADMIN     |   |    ASSISTANT     |
        |  verifies    |   |  manages clinic  |
        |  everyone    |   |  appointments    |
        +--------------+   +------------------+
```

> **Important:** Doctors and Labs **cannot use the platform** until an Admin verifies their credentials. Patients and Admins are activated immediately.

---

## Slide 4 — Role: PATIENT

| Feature | Description |
|---------|-------------|
| View dossier | See all analyses, prescriptions, and diagnoses in one place |
| Approve / Deny access requests | A doctor requests access → patient gets a notification and decides |
| Revoke access | Can revoke a doctor's active access at any time |
| Proactive sharing | Share dossier directly with any doctor by email (no waiting) |
| Fine-grained control | Set specialty, restrict sections (ANALYSIS / PRESCRIPTION / DIAGNOSIS), set expiry |
| Export PDF | Download their entire medical record as a formatted PDF |
| Notifications | Real-time alerts for break-glass overrides and new access requests |

---

## Slide 5 — Role: DOCTOR

| Feature | Description |
|---------|-------------|
| Request access | Send an access request to a patient by email |
| View patient dossier | See authorized records filtered by medical specialty |
| Add prescriptions | Write and attach prescriptions to a patient's dossier |
| Add diagnoses | Record diagnoses on the dossier |
| Break-Glass override | Emergency bypass to access a patient immediately (with justification) |
| Inbox | View all unreviewed lab results sorted by priority (Critical first) |
| Mark as reviewed | Close out a lab result from the inbox |
| Chat | Real-time messaging with other doctors |
| Schedule | View personal duty schedule |
| Settings | Configure quiet hours (SMS pause) and notification delay |

**Specialty Isolation:** A cardiologist automatically only sees `CARDIOLOGY` or `GENERAL` records. Cross-specialty access requires the patient to explicitly grant it.

---

## Slide 6 — Role: LAB

| Feature | Description |
|---------|-------------|
| Upload analysis | Upload a PDF or image file for a specific patient |
| Set priority | `ROUTINE`, `URGENT`, or `CRITICAL` |
| Set specialty | Tag results with a medical specialty category |
| View own uploads | See all analyses uploaded by this lab |

> Labs must be verified by an Admin before they can upload anything.

---

## Slide 7 — Role: ADMIN

| Feature | Description |
|---------|-------------|
| Dashboard stats | Total users, analyses, pending access grants |
| Manage users | List all users, view profiles, suspend or reactivate accounts |
| Verify doctors and labs | Approve or reject registration requests |
| Audit log | Full searchable log of every significant action on the platform |
| Break-glass log | View all emergency overrides — who, why, when, on which patient |
| Access grants | See all active dossier permissions across the platform |
| SLA monitoring | Monitor lab result review times against service-level targets |

---

## Slide 8 — Role: ASSISTANT (Medical Secretary)

| Feature | Description |
|---------|-------------|
| View appointments | See all clinic appointments filtered by date |
| Book appointments | Schedule new patient appointments |
| Update status | Mark appointments as CONFIRMED, COMPLETED, CANCELLED |
| Filter by status | Filter appointment list by current status |

---

## Slide 9 — Key Feature: 3-Layer Access Control

This is the core security model of the platform.

```
Layer 1: BASE ACCESS GRANT
  Doctor requests access by patient email.
  Patient approves or denies.
  Without this, doctor sees NOTHING.

Layer 2: SPECIALTY ISOLATION (automatic)
  Doctor can only see records tagged with their own specialty.
  e.g. A cardiologist cannot see a psychiatry record by default.

Layer 3: CROSS-SPECIALTY OPT-IN (patient choice)
  Patient can explicitly grant access to other specialties.
  Patient can restrict to specific sections only.
  Patient can set an expiration date on any grant.
```

---

## Slide 10 — Key Feature: Proactive Sharing (Google Drive Model)

Instead of waiting for a doctor to request access:

1. Patient goes to **Share Access** tab
2. Searches for a doctor by **email**
3. Selects: specialty category, sections to include, optional expiration date
4. Clicks Share → access is granted **immediately**

This mirrors how you share a Google Drive file — you push access without waiting to be asked.

---

## Slide 11 — Key Feature: Break-Glass Emergency Override

When a doctor faces a life-critical situation and the patient cannot respond:

1. Doctor clicks **"Emergency Access (Break-Glass)"**
2. Enters a written **justification reason**
3. Access is **immediately granted** — bypasses approval queue
4. The patient receives a **real-time alert** about the override
5. An **immutable log entry** is created — only visible to Admins

> Every emergency override is permanently recorded with who did it, why, and when.

---

## Slide 12 — Key Feature: Safety Net Alert Engine (Cron Job)

**Problem:** What if a lab uploads a critical result and the doctor never sees it?

**Solution:** An automated background job runs every 15 minutes.

```
Every 15 minutes:
  → Find all UNREVIEWED lab analyses

  For each CRITICAL result:
    If uploaded > 15 min ago AND not alerted in last 6 hours:
      Send SMS to doctor (via Textbee)
      Emit WebSocket alert to doctor inbox
      Log dispatch in AuditLog with SMS message ID

  For each ROUTINE result:
    If uploaded > doctor delay threshold (default: 12h)
    AND not alerted in last 24 hours
    AND NOT in doctor quiet hours:
      Send SMS to doctor
      Emit WebSocket alert
      Log dispatch in AuditLog
```

**Each SMS contains a Magic Link** — doctor opens the result directly without logging in.

---

## Slide 13 — Key Feature: Magic Links

Each SMS alert contains a unique one-click link:

```
[CRITICAL LAB ALERT] Patient: Ahmed Ben Ali | Test: Blood Panel.
Immediate review: http://localhost:3000/a/f3a9b2c1d4e5...
```

- Random 32-character hex token stored in the database
- Opens the full analysis page — **no login required**
- Works from any device, even without the app open

---

## Slide 14 — Key Feature: Real-Time Notifications (Socket.IO)

| Event | Who receives it | When |
|-------|----------------|------|
| `notification` | Any user | New access request, lab upload, admin verification |
| `safety_net_alert` | Doctor | Cron job fires an unreviewed analysis alert |
| `BREAK_GLASS_ACCESS` | Patient | A doctor performed an emergency override |

Every user joins a **private Socket.IO room** named after their `userId` on login.

---

## Slide 15 — Key Feature: Comprehensive Audit Log

| Actor | Logged actions |
|-------|---------------|
| **Patient** | Viewing dossier, approving/denying access, creating direct grants |
| **Doctor** | Accessing a patient dossier, writing prescriptions, break-glass events |
| **Lab** | Uploading an analysis |
| **Admin** | Suspending/reactivating users, verifying doctors/labs |
| **Cron** | Every SMS dispatch with Textbee message ID |

Admins can **search and filter** the audit log by role or keyword.

---

## Slide 16 — Key Feature: PDF Dossier Export

- Patients download their entire medical record as a **formatted PDF**
- Generated server-side using `pdfkit`
- Includes analyses, prescriptions, and diagnoses
- Endpoint: `GET /dossier/download/pdf`

---

## Slide 17 — Key Feature: Light / Dark Theme

- Floating toggle button available on every page
- Preference saved in `localStorage` — restored on next visit
- Custom `themechange` event syncs theme across all open tabs
- Login / Register pages are always dark (EKG animation stays readable)

---

## Slide 18 — Database Models (Quick Overview)

```
User ──── Patient ──── MedicalRecord ──── Analysis
      |                              |─── Prescription
      |── Doctor                     |─── Diagnosis
      |── Lab                        └─── AccessGrant
      └── Admin

AuditLog       (all platform actions)
BreakGlassLog  (emergency overrides only)
Notification   (user-targeted alerts)
Appointment    (clinic schedule)
```

---

## Slide 19 — Demo Cheat Sheet

### Trigger the Safety Net immediately (bypass 15-min wait)
```bash
# Step 1 — backdate all unreviewed analyses to 1 hour ago
node reset-safety-net.mjs

# Step 2 — run the evaluation now
node run-safety-net.mjs
```

### Start the full platform
```bash
# Terminal 1 — backend
npm run dev

# Terminal 2 — frontend
cd medical-platform-frontend && npm run dev
```

### URLs
| URL | Page |
|-----|------|
| http://localhost:3000 | Landing / role redirect |
| http://localhost:3000/login | Login |
| http://localhost:3000/register | Register |
| http://localhost:5000 | Backend API |

---

## Slide 20 — Summary: What Makes This Platform Different

| Feature | Why it matters |
|---------|---------------|
| 3-layer access control | Patient has real sovereignty over their data |
| Specialty isolation | Automatic privacy between medical fields |
| Break-glass with audit | Emergency access that cannot be abused silently |
| Safety net cron + SMS | No critical result ever gets silently ignored |
| Magic links | Doctors can act from any device instantly |
| Real-time WebSockets | Platform feels live and responsive |
| Full audit trail | Every action is traceable and accountable |
| PDF export | Patient data is truly portable |
| 5 distinct roles | Realistic simulation of a real clinic hierarchy |
