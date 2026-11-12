import crypto from 'crypto'
import { prisma } from '../config/db.js'
import { notify } from '../utils/notify.js'
import { io } from '../index.js'

// ─── Lab: upload analysis to a patient dossier ────────────
export const uploadAnalysis = async (req, res) => {
  const { userId } = req.user
  const { patientEmail, analysisType, summary, priority, category } = req.body

  const urgency = priority === 'CRITICAL' ? 'CRITICAL' : 'ROUTINE'

  const lab = await prisma.lab.findUnique({ where: { userId } })
  if (!lab) return res.status(404).json({ error: 'Lab profile not found' })

  // Check lab is verified
  if (!lab.isVerified) {
    return res.status(403).json({ error: 'Your lab account is pending admin verification.' })
  }

  const patientUser = await prisma.user.findUnique({
    where: { email: patientEmail },
    include: { patientProfile: { include: { dossier: true } } }
  })

  if (!patientUser?.patientProfile?.dossier) {
    return res.status(404).json({ error: 'Patient or dossier not found' })
  }

  const dossier = patientUser.patientProfile.dossier
  const magicToken = crypto.randomBytes(16).toString('hex')

  const analysis = await prisma.analysis.create({
    data: {
      medicalRecordId: dossier.id,
      labId:           lab.id,
      analysisType,
      category:        category || 'GENERAL',
      priority:        urgency,
      summary:         summary ?? null,
      magicToken:      magicToken,
      fileUrl:         req.file ? 'uploads/analyses/' + req.file.filename : null,
    }
  })

  // Notify the patient
  await notify(
    patientUser.id,
    'LAB_RESULT_UPLOADED',
    'A new ' + priority + ' priority lab result (' + analysisType + ') has been uploaded to your dossier'
  )

  // ─── Find every doctor with approved access to this dossier ──
  // A patient can have more than one approved doctor, so notify all of them.
  const grants = await prisma.accessGrant.findMany({
    where: { medicalRecordId: dossier.id, status: 'APPROVED' },
    include: { doctor: { include: { user: true } } }
  })

  for (const grant of grants) {
    const doctorUserId = grant.doctor.user.id

    // Creates the Notification row AND emits the 'notification' socket
    // event to the doctor's private room (see utils/notify.js + index.js
    // socket.join(userId) on connection) — this is what the Doctor Inbox
    // page listens for to instantly refetch its list.
    await notify(
      doctorUserId,
      'LAB_RESULT_UPLOADED',
      'New ' + priority + ' priority result (' + analysisType + ') uploaded for ' + patientUser.fullName
    )

    // For CRITICAL results, also fire the dedicated critical_alert event
    // (same pattern as the escalation job) so the inbox can react to it
    // specifically, separately from the general notification stream.
    if (priority === 'CRITICAL') {
      io.to(doctorUserId).emit('critical_alert', {
        analysisId:   analysis.id,
        patientName:  patientUser.fullName,
        analysisType,
        message:      'CRITICAL result requires immediate review'
      })
    }
  }

  // Audit log — record the lab upload action
  await prisma.auditLog.create({
    data: { userId, action: 'Lab uploaded ' + (priority || 'ROUTINE') + ' analysis (' + analysisType + ') for patient ' + patientEmail }
  })

  return res.status(201).json(analysis)
}

// ─── Lab: get all analyses they uploaded ──────────────────
export const getMyUploads = async (req, res) => {
  const { userId } = req.user

  const lab = await prisma.lab.findUnique({ where: { userId } })
  if (!lab) return res.status(404).json({ error: 'Lab profile not found' })

  const analyses = await prisma.analysis.findMany({
    where:   { labId: lab.id },
    orderBy: { uploadedAt: 'desc' },
    include: {
      medicalRecord: {
        include: {
          patient: {
            include: { user: { select: { fullName: true, email: true } } }
          }
        }
      }
    }
  })

  return res.json(analyses)
}

// ─── Patient: get all their analyses ──────────────────────
export const getMyAnalyses = async (req, res) => {
  const { userId } = req.user

  const patient = await prisma.patient.findUnique({
    where:   { userId },
    include: { dossier: true }
  })

  if (!patient?.dossier) return res.status(404).json({ error: 'Dossier not found' })

  const analyses = await prisma.analysis.findMany({
    where:   { medicalRecordId: patient.dossier.id },
    orderBy: { uploadedAt: 'desc' },
    include: { lab: { include: { user: { select: { fullName: true } } } } }
  })

  return res.json(analyses)
}

// ─── Doctor: get analyses for a patient (if access granted) 
export const getAnalysesAsDoctor = async (req, res) => {
  const { userId } = req.user
  const { patientId } = req.params

  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' })

  const dossier = await prisma.medicalRecord.findUnique({ where: { patientId } })
  if (!dossier) return res.status(404).json({ error: 'Dossier not found' })

  // Check access
  const grant = await prisma.accessGrant.findFirst({
    where: {
      medicalRecordId: dossier.id,
      doctorId:        doctor.id,
      category:        null
    }
  })

  if (!grant || grant.status !== 'APPROVED') {
    return res.status(403).json({ error: 'Access not granted' })
  }

  const analyses = await prisma.analysis.findMany({
    where:   { medicalRecordId: dossier.id },
    orderBy: { uploadedAt: 'desc' },
    include: { lab: { include: { user: { select: { fullName: true } } } } }
  })

  return res.json(analyses)
}