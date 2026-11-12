import { prisma } from '../config/db.js'
import { notify } from '../utils/notify.js'
import { getActiveGrants, hasBaseAccess, hasAnyAccess, filterDossierForDoctor, canWriteRecord } from '../utils/access.js'

// ─── Patient: get own dossier ─────────────────────────────
export const getMyDossier = async (req, res) => {
  const { userId } = req.user

  const patient = await prisma.patient.findUnique({
    where: { userId },
    include: {
      dossier: {
        include: {
          analyses: { orderBy: { uploadedAt: 'desc' }, include: { lab: { include: { user: { select: { fullName: true } } } } } },
          prescriptions: { orderBy: { issuedAt:   'desc' }, include: { doctor: { include: { user: { select: { fullName: true } } } } } },
          diagnoses:     { orderBy: { diagnosedAt: 'desc' }, include: { doctor: { include: { user: { select: { fullName: true } } } } } },
          accessGrants:  { where: { status: 'APPROVED' },   include: { doctor: { include: { user: { select: { fullName: true } } } } } },
          patient: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phoneNumber: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!patient) return res.status(404).json({ error: 'Patient profile not found' })
  if (!patient.dossier) return res.status(404).json({ error: 'No dossier found' })

  // Audit log — patient viewed their own dossier
  await prisma.auditLog.create({
    data: { userId, action: 'Patient viewed their medical dossier' }
  })

  return res.json(patient.dossier)

}

// ─── Doctor: request access to a patient dossier ─────────
export const requestAccess = async (req, res) => {
  const { userId } = req.user
  const { patientEmail } = req.body

  // Find the doctor profile
  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' })

  // Find the patient by email
  const patientUser = await prisma.user.findUnique({
    where: { email: patientEmail },
    include: { patientProfile: { include: { dossier: true } } }
  })

  if (!patientUser || !patientUser.patientProfile) {
    return res.status(404).json({ error: 'Patient not found' })
  }

  const dossier = patientUser.patientProfile.dossier
  if (!dossier) return res.status(404).json({ error: 'Patient has no dossier yet' })

  // Check if a request already exists
const existing = await prisma.accessGrant.findFirst({
  where: {
    medicalRecordId: dossier.id,
    doctorId: doctor.id,
    category: null
  }
})

if (existing) {
  // Allow re-request if previously denied or revoked
  if (existing.status === 'PENDING' || existing.status === 'APPROVED') {
    return res.status(409).json({ error: `Request already exists with status: ${existing.status}` })
  }
  // Reset the existing grant to PENDING instead of creating a new one
  const updated = await prisma.accessGrant.update({
    where: { id: existing.id },
    data: { status: 'PENDING', requestedAt: new Date(), respondedAt: null }
  })

  await prisma.notification.create({
    data: {
      userId: patientUser.id,
      type: 'ACCESS_REQUEST',
      message: `Dr. ${(await prisma.user.findUnique({ where: { id: userId } })).fullName} requested access to your dossier`
    }
  })

  return res.status(201).json(updated)
}

  const grant = await prisma.accessGrant.create({
    data: {
      medicalRecordId: dossier.id,
      doctorId: doctor.id,
      status: 'PENDING'
    }
  })

  // Get doctor user details to get their full name
  const doctorUser = await prisma.user.findUnique({ where: { id: userId } })

  // Notify the patient via real-time utility
  await notify(
    patientUser.id,
    'ACCESS_REQUEST',
    `Dr. ${doctorUser?.fullName || 'Unknown'} requested access to your dossier`
  )

  return res.status(201).json(grant)
}

// ─── Patient: respond to access request ───────────────────
export const respondToAccess = async (req, res) => {
  const { userId } = req.user
  const { id } = req.params
  const { decision, scope, expiresAt } = req.body // decision: 'APPROVED' or 'DENIED'

  if (!['APPROVED', 'DENIED'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be APPROVED or DENIED' })
  }

  if (scope && (!Array.isArray(scope) || scope.some((s) => !['ANALYSIS', 'PRESCRIPTION', 'DIAGNOSIS'].includes(s)))) {
    return res.status(400).json({ error: 'scope must be an array of ANALYSIS, PRESCRIPTION, DIAGNOSIS' })
  }

  // Make sure this grant belongs to this patient
  const patient = await prisma.patient.findUnique({
    where: { userId },
    include: { dossier: true }
  })

  if (!patient?.dossier) return res.status(404).json({ error: 'Dossier not found' })

  const grant = await prisma.accessGrant.findUnique({ where: { id } })

  if (!grant) return res.status(404).json({ error: 'Access request not found' })
  if (grant.medicalRecordId !== patient.dossier.id) {
    return res.status(403).json({ error: 'This request does not belong to your dossier' })
  }
  if (grant.status !== 'PENDING') {
    return res.status(409).json({ error: `Request already ${grant.status}` })
  }

  const updated = await prisma.accessGrant.update({
    where: { id },
    data: {
      status: decision,
      respondedAt: new Date(),
      ...(decision === 'APPROVED' && scope     ? { scope } : {}),
      ...(decision === 'APPROVED' && expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
    }
  })

  // Find the doctor to target their notification
  const doctor = await prisma.doctor.findUnique({
    where: { id: grant.doctorId },
    include: { user: true }
  })

  // Audit log — record the patient's access decision
  await prisma.auditLog.create({
    data: { userId, action: 'Patient ' + (decision === 'APPROVED' ? 'approved' : 'denied') + ' dossier access for Dr. ' + doctor.user.fullName }
  })

  // Notify the doctor via real-time utility
  await notify(
    doctor.user.id,
    decision === 'APPROVED' ? 'ACCESS_GRANTED' : 'ACCESS_REVOKED',
    decision === 'APPROVED'
      ? 'Your access request was approved'
      : 'Your access request was denied'
  )

  return res.json(updated)
}

// ─── Patient: proactively share access with a doctor ──────
// The "Google Drive" model — the patient does not have to wait for
// a doctor's request. They can pick a doctor by email and grant
// access outright, optionally restricted to a category (specialty),
// a subset of sections, and/or a time limit.
export const grantAccess = async (req, res) => {
  const { userId } = req.user
  const { doctorEmail, category, scope, expiresAt } = req.body

  if (!doctorEmail) return res.status(400).json({ error: 'doctorEmail is required' })

  if (scope && (!Array.isArray(scope) || scope.some((s) => !['ANALYSIS', 'PRESCRIPTION', 'DIAGNOSIS'].includes(s)))) {
    return res.status(400).json({ error: 'scope must be an array of ANALYSIS, PRESCRIPTION, DIAGNOSIS' })
  }

  const patient = await prisma.patient.findUnique({
    where: { userId },
    include: { dossier: true, user: true }
  })

  if (!patient?.dossier) return res.status(404).json({ error: 'Dossier not found' })

  const doctorUser = await prisma.user.findUnique({
    where: { email: doctorEmail },
    include: { doctorProfile: true }
  })

  if (!doctorUser?.doctorProfile) {
    return res.status(404).json({ error: 'Doctor not found' })
  }

  const grantCategory = category ?? null

  const existing = await prisma.accessGrant.findFirst({
    where: {
      medicalRecordId: patient.dossier.id,
      doctorId: doctorUser.doctorProfile.id,
      category: grantCategory
    }
  })

  const data = {
    status: 'APPROVED',
    scope: scope ?? [],
    respondedAt: new Date(),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }

  const grant = existing
    ? await prisma.accessGrant.update({ where: { id: existing.id }, data })
    : await prisma.accessGrant.create({
        data: {
          medicalRecordId: patient.dossier.id,
          doctorId: doctorUser.doctorProfile.id,
          category: grantCategory,
          requestedAt: new Date(),
          ...data
        }
      })

  await notify(
    doctorUser.id,
    'ACCESS_GRANTED',
    `${patient.user.fullName} shared${grantCategory ? ' ' + grantCategory : ''} dossier access with you`
  )

  return res.status(existing ? 200 : 201).json(grant)
}

// ─── Doctor: emergency "Break the Glass" access ────────────
// Bypasses all normal consent checks to open the full dossier
// immediately. Creates a permanent BreakGlassLog entry (no
// update/delete route ever exists for it) plus a matching AuditLog
// entry, and urgently notifies the patient that this happened.
export const breakGlass = async (req, res) => {
  const { userId } = req.user
  const { patientEmail } = req.params
  const { reason } = req.body

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A reason is required to break the glass' })
  }

  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' })

  const patientUser = await prisma.user.findUnique({
    where: { email: patientEmail },
    include: { patientProfile: { include: { dossier: {
      include: {
        analyses:      { orderBy: { uploadedAt:  'desc' } },
        prescriptions: { orderBy: { issuedAt:    'desc' } },
        diagnoses:     { orderBy: { diagnosedAt: 'desc' } },
      }
    } } } }
  })

  if (!patientUser?.patientProfile?.dossier) {
    return res.status(404).json({ error: 'Patient not found' })
  }

  const dossier = patientUser.patientProfile.dossier

  // Permanent audit trail — this row is never updated or deleted.
  await prisma.breakGlassLog.create({
    data: { doctorId: doctor.id, medicalRecordId: dossier.id, reason: reason.trim() }
  })

  const doctorUser = await prisma.user.findUnique({ where: { id: userId } })

  await prisma.auditLog.create({
    data: {
      userId,
      action: `BREAK GLASS: Dr. ${doctorUser.fullName} bypassed access controls for ${patientEmail}. Reason: ${reason.trim()}`
    }
  })

  await notify(
    patientUser.id,
    'BREAK_GLASS_ACCESS',
    `Dr. ${doctorUser.fullName} used emergency access ("Break the Glass") to view your dossier without your prior approval`
  )

  return res.json({
    patientName: patientUser.fullName,
    patientEmail: patientUser.email,
    emergencyAccess: true,
    ...dossier
  })
}

// ─── Doctor: view a patient dossier (if access granted) ───
export const getDossierAsDoctor = async (req, res) => {
  const { userId } = req.user
  const { patientId } = req.params

  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' })

  // Find the dossier
  const dossier = await prisma.medicalRecord.findUnique({
    where: { patientId },
    include: {
      analyses:      { orderBy: { uploadedAt:  'desc' } },
      prescriptions: { orderBy: { issuedAt:    'desc' } },
      diagnoses:     { orderBy: { diagnosedAt: 'desc' } },
    }
  })

  if (!dossier) return res.status(404).json({ error: 'Dossier not found' })

  // Check access — base dossier grants OR file-level grants both suffice
  const grants = await getActiveGrants(doctor.id, dossier.id)

  if (!hasAnyAccess(grants)) {
    return res.status(403).json({ error: 'Access not granted' })
  }

  // Log the access
  await prisma.auditLog.create({
    data: {
      userId,
      action: `Doctor accessed dossier of patient ${patientId}`
    }
  })

  return res.json({
    hasBaseAccess: hasBaseAccess(grants),
    ...filterDossierForDoctor(dossier, doctor, grants)
  })
}

// ─── Patient: see pending access requests ─────────────────
export const getPendingRequests = async (req, res) => {
  const { userId } = req.user

  const patient = await prisma.patient.findUnique({
    where: { userId },
    include: { dossier: true }
  })

  if (!patient?.dossier) return res.status(404).json({ error: 'Dossier not found' })

  const pending = await prisma.accessGrant.findMany({
    where: {
      medicalRecordId: patient.dossier.id,
      status: 'PENDING'
    },
    include: {
      doctor: {
        include: {
          user: { select: { fullName: true, email: true } }
        }
      }
    },
    orderBy: { requestedAt: 'desc' }
  })

  return res.json(pending)
}
export const getDossierByEmail = async (req, res) => {
  const { userId } = req.user
  const { email }  = req.params

  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' })

  const patientUser = await prisma.user.findUnique({
    where: { email },
    include: { patientProfile: { include: { dossier: {
      include: {
        analyses: { orderBy: { uploadedAt: 'desc' }, include: { lab: { include: { user: { select: { fullName: true } } } } } },
        prescriptions: { orderBy: { issuedAt:    'desc' }, include: { doctor: { include: { user: { select: { fullName: true } } } } } },
        diagnoses:     { orderBy: { diagnosedAt: 'desc' }, include: { doctor: { include: { user: { select: { fullName: true } } } } } },
      }
    } } } }
  })

  if (!patientUser?.patientProfile?.dossier) {
    return res.status(404).json({ error: 'Patient not found' })
  }

  const dossier = patientUser.patientProfile.dossier
  const grants  = await getActiveGrants(doctor.id, dossier.id)

  if (!hasAnyAccess(grants)) {
    return res.status(403).json({ error: 'Access not granted' })
  }

  await prisma.auditLog.create({
    data: { userId, action: 'Doctor accessed dossier of ' + email }
  })

  const visible = filterDossierForDoctor(dossier, doctor, grants)

  return res.json({
    patientName: patientUser.fullName,
    patientEmail: patientUser.email,
    patientProfileId: patientUser.patientProfile.id,
    hasBaseAccess: hasBaseAccess(grants),
    ...visible
  })
}
export const addPrescription = async (req, res) => {
  const { userId } = req.user
  const { patientEmail } = req.params
  const { medications, instructions, category } = req.body

  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

  const patientUser = await prisma.user.findUnique({
    where: { email: patientEmail },
    include: { patientProfile: { include: { dossier: true } } }
  })

  if (!patientUser?.patientProfile?.dossier) {
    return res.status(404).json({ error: 'Patient not found' })
  }

  const dossier = patientUser.patientProfile.dossier
  const grants  = await getActiveGrants(doctor.id, dossier.id)

  if (!hasBaseAccess(grants)) {
    return res.status(403).json({ error: 'Access not granted' })
  }

  // Prescriptions default to the doctor's own specialty unless a
  // category is explicitly supplied. Writing follows the same
  // specialty-isolation rule as reading.
  const recordCategory = category || doctor.specialty

  if (!canWriteRecord(recordCategory, 'PRESCRIPTION', doctor, grants)) {
    return res.status(403).json({ error: `You don't have access to write ${recordCategory} records for this patient` })
  }

  const prescription = await prisma.prescription.create({
    data: { medicalRecordId: dossier.id, doctorId: doctor.id, category: recordCategory, medications, instructions }
  })

  const { notify } = await import('../utils/notify.js')
  await notify(patientUser.id, 'PRESCRIPTION_ADDED', 'Dr. ' + (await prisma.user.findUnique({ where: { id: userId } })).fullName + ' added a prescription to your dossier')

  return res.status(201).json(prescription)
}

export const addDiagnosis = async (req, res) => {
  const { userId } = req.user
  const { patientEmail } = req.params
  const { title, notes, category } = req.body

  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

  const patientUser = await prisma.user.findUnique({
    where: { email: patientEmail },
    include: { patientProfile: { include: { dossier: true } } }
  })

  if (!patientUser?.patientProfile?.dossier) {
    return res.status(404).json({ error: 'Patient not found' })
  }

  const dossier = patientUser.patientProfile.dossier
  const grants  = await getActiveGrants(doctor.id, dossier.id)

  if (!hasBaseAccess(grants)) {
    return res.status(403).json({ error: 'Access not granted' })
  }

  const recordCategory = category || doctor.specialty

  if (!canWriteRecord(recordCategory, 'DIAGNOSIS', doctor, grants)) {
    return res.status(403).json({ error: `You don't have access to write ${recordCategory} records for this patient` })
  }

  const diagnosis = await prisma.diagnosis.create({
    data: { medicalRecordId: dossier.id, doctorId: doctor.id, category: recordCategory, title, notes }
  })

  const { notify } = await import('../utils/notify.js')
  await notify(patientUser.id, 'PRESCRIPTION_ADDED', 'Dr. ' + (await prisma.user.findUnique({ where: { id: userId } })).fullName + ' added a diagnosis to your dossier')

  return res.status(201).json(diagnosis)
}
export const revokeAccess = async (req, res) => {
  const { userId } = req.user
  const { id } = req.params

  const patient = await prisma.patient.findUnique({
    where: { userId },
    include: { dossier: true }
  })

  if (!patient?.dossier) return res.status(404).json({ error: 'Dossier not found' })

  const grant = await prisma.accessGrant.findUnique({ where: { id } })
  if (!grant) return res.status(404).json({ error: 'Grant not found' })
  if (grant.medicalRecordId !== patient.dossier.id) {
    return res.status(403).json({ error: 'Not your grant' })
  }

  const updated = await prisma.accessGrant.update({
    where: { id },
    data: { status: 'REVOKED', respondedAt: new Date() }
  })

  const doctor = await prisma.doctor.findUnique({
    where: { id: grant.doctorId },
    include: { user: true }
  })

  const { notify } = await import('../utils/notify.js')
  await notify(doctor.user.id, 'ACCESS_REVOKED', 'Your access to a patient dossier has been revoked')

  return res.json(updated)
}
export const downloadDossierPDF = async (req, res) => {
  const { userId } = req.user

  const patient = await prisma.patient.findUnique({
    where: { userId },
    include: {
      user: true,
      dossier: {
        include: {
          analyses:      { orderBy: { uploadedAt:  'desc' } },
          prescriptions: { orderBy: { issuedAt:    'desc' }, include: { doctor: { include: { user: true } } } },
          diagnoses:     { orderBy: { diagnosedAt: 'desc' }, include: { doctor: { include: { user: true } } } },
        }
      }
    }
  })

  if (!patient?.dossier) return res.status(404).json({ error: 'Dossier not found' })

  const PDFDocument = (await import('pdfkit')).default
  const doc = new PDFDocument({ margin: 50 })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'attachment; filename="medical-dossier.pdf"')
  doc.pipe(res)

  // Header
  doc.fontSize(22).font('Helvetica-Bold').text('Medical Dossier', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(12).font('Helvetica').text(`Patient: ${patient.user.fullName}`, { align: 'center' })
  doc.text(`Email: ${patient.user.email}`, { align: 'center' })
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' })
  doc.moveDown(1)
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
  doc.moveDown(1)

  // Analyses
  doc.fontSize(16).font('Helvetica-Bold').text('Lab Analyses')
  doc.moveDown(0.5)
  if (patient.dossier.analyses.length === 0) {
    doc.fontSize(11).font('Helvetica').fillColor('#666').text('No analyses on record.')
  } else {
    patient.dossier.analyses.forEach((a) => {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text(a.analysisType)
      doc.fontSize(10).font('Helvetica').fillColor('#444').text(`Date: ${new Date(a.uploadedAt).toLocaleDateString('en-GB')}`)
      if (a.summary) doc.text(`Summary: ${a.summary}`)
      doc.moveDown(0.5)
    })
  }

  doc.moveDown(0.5)
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#eee')
  doc.moveDown(1)

  // Prescriptions
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#000').text('Prescriptions')
  doc.moveDown(0.5)
  if (patient.dossier.prescriptions.length === 0) {
    doc.fontSize(11).font('Helvetica').fillColor('#666').text('No prescriptions on record.')
  } else {
    patient.dossier.prescriptions.forEach((p) => {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text(`Prescription — Dr. ${p.doctor?.user?.fullName}`)
      doc.fontSize(10).font('Helvetica').fillColor('#444').text(`Date: ${new Date(p.issuedAt).toLocaleDateString('en-GB')}`)
      doc.text(`Medications: ${p.medications?.join(', ')}`)
      if (p.instructions) doc.text(`Instructions: ${p.instructions}`)
      doc.moveDown(0.5)
    })
  }

  doc.moveDown(0.5)
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#eee')
  doc.moveDown(1)

  // Diagnoses
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#000').text('Diagnoses')
  doc.moveDown(0.5)
  if (patient.dossier.diagnoses.length === 0) {
    doc.fontSize(11).font('Helvetica').fillColor('#666').text('No diagnoses on record.')
  } else {
    patient.dossier.diagnoses.forEach((d) => {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text(d.title)
      doc.fontSize(10).font('Helvetica').fillColor('#444').text(`Date: ${new Date(d.diagnosedAt).toLocaleDateString('en-GB')}`)
      doc.text(`Doctor: Dr. ${d.doctor?.user?.fullName}`)
      if (d.notes) doc.text(`Notes: ${d.notes}`)
      doc.moveDown(0.5)
    })
  }

  doc.end()
}
export const getMyPatients = async (req, res) => {
  const { userId } = req.user

  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

  const grants = await prisma.accessGrant.findMany({
    where: { doctorId: doctor.id, status: 'APPROVED' },
    include: {
      medicalRecord: {
        include: {
          patient: {
            include: {
              user: { select: { fullName: true, email: true } },
              dossier: { select: { updatedAt: true } }
            }
          },
          analyses:      { orderBy: { uploadedAt:  'desc' }, take: 1 },
          prescriptions: { orderBy: { issuedAt:    'desc' }, take: 1 },
          diagnoses:     { orderBy: { diagnosedAt: 'desc' }, take: 1 },
        }
      }
    },
    orderBy: { requestedAt: 'desc' }
  })

  // Deduplicate by patientId — a doctor may have multiple grants
  // (base + file-level) for the same patient.
  const seen = new Map()
  for (const g of grants) {
    const pid = g.medicalRecord.patient.id
    if (!seen.has(pid)) {
      seen.set(pid, {
        grantId:       g.id,
        patientId:     pid,
        name:          g.medicalRecord.patient.user.fullName,
        email:         g.medicalRecord.patient.user.email,
        updatedAt:     g.medicalRecord.updatedAt,
        analyses:      g.medicalRecord.analyses.length,
        prescriptions: g.medicalRecord.prescriptions.length,
        diagnoses:     g.medicalRecord.diagnoses.length,
      })
    }
  }

  return res.json([...seen.values()])
}

// ─── Patient: update own medical profile ──────────────────
export const updateMyProfile = async (req, res) => {
  const { userId } = req.user
  const { dateOfBirth, bloodType, allergies, phoneNumber } = req.body

  const patient = await prisma.patient.findUnique({ where: { userId } })
  if (!patient) return res.status(404).json({ error: 'Patient profile not found' })

  const data = {}
  if (dateOfBirth !== undefined) {
    data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
  }
  if (bloodType !== undefined) {
    data.bloodType = bloodType || null
  }
  if (allergies !== undefined) {
    data.allergies = Array.isArray(allergies) ? allergies.filter(Boolean) : []
  }

  const updated = await prisma.patient.update({
    where: { userId },
    data,
  })

  if (phoneNumber !== undefined) {
    await prisma.user.update({
      where: { id: userId },
      data: { phoneNumber: phoneNumber || null }
    })
  }

  return res.json({ success: true, patient: updated })
}