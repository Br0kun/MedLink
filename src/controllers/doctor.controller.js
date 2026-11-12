import { prisma } from '../config/db.js'

// Doctor triage inbox — pending reviews sorted by priority
export const getInbox = async (req, res) => {
  const { userId } = req.user

  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

  // Get all approved patients for this doctor
  const grants = await prisma.accessGrant.findMany({
    where: { doctorId: doctor.id, status: 'APPROVED' },
    select: { medicalRecordId: true }
  })

  const recordIds = grants.map((g) => g.medicalRecordId)

  // Get unreviewed analyses sorted by priority
  const priorityOrder = { CRITICAL: 0, URGENT: 1, ROUTINE: 2 }

  const analyses = await prisma.analysis.findMany({
    where: {
      medicalRecordId: { in: recordIds },
      isReviewed: false,
    },
    include: {
      medicalRecord: {
        include: {
          patient: {
            include: { user: { select: { fullName: true, email: true } } }
          }
        }
      },
      lab: { include: { user: { select: { fullName: true } } } }
    },
    orderBy: { uploadedAt: 'desc' }
  })

  // Sort by priority
  const sorted = analyses.sort((a, b) =>
    (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
  )

  return res.json(sorted)
}

// Mark analysis as reviewed
export const markReviewed = async (req, res) => {
  const { id } = req.params
  const { userId } = req.user

  const doctor = await prisma.doctor.findUnique({ where: { userId }, include: { user: { select: { fullName: true } } } })
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

  const analysis = await prisma.analysis.update({
    where: { id },
    data: { isReviewed: true, reviewedAt: new Date() },
    include: {
      medicalRecord: {
        include: { patient: { include: { user: { select: { fullName: true } } } } }
      }
    }
  })

  // Audit log for review event
  const patientName = analysis.medicalRecord?.patient?.user?.fullName || 'Patient'
  await prisma.auditLog.create({
    data: {
      userId,
      action: `[Doctor Inbox] Dr. ${doctor.user.fullName} marked lab report "${analysis.analysisType}" for patient "${patientName}" as REVIEWED (Analysis ID: ${analysis.id})`
    }
  })

  return res.json(analysis)
}

// Get doctor's Safety Net settings
export const getSafetyNetSettings = async (req, res) => {
  const { userId } = req.user

  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

  return res.json({
    routineDelayHours: doctor.routineDelayHours ?? 12,
    quietHoursStart: doctor.quietHoursStart ?? null,
    quietHoursEnd: doctor.quietHoursEnd ?? null,
  })
}

// Update doctor's Safety Net settings
export const updateSafetyNetSettings = async (req, res) => {
  const { userId } = req.user
  const { routineDelayHours, quietHoursStart, quietHoursEnd } = req.body

  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

  const updated = await prisma.doctor.update({
    where: { id: doctor.id },
    data: {
      routineDelayHours: routineDelayHours !== undefined ? Math.max(1, parseInt(routineDelayHours) || 12) : doctor.routineDelayHours,
      quietHoursStart: quietHoursStart !== undefined ? (quietHoursStart !== null && quietHoursStart !== '' ? String(quietHoursStart).trim() : null) : doctor.quietHoursStart,
      quietHoursEnd: quietHoursEnd !== undefined ? (quietHoursEnd !== null && quietHoursEnd !== '' ? String(quietHoursEnd).trim() : null) : doctor.quietHoursEnd,
    }
  })

  return res.json({
    message: 'Safety Net settings updated successfully',
    settings: {
      routineDelayHours: updated.routineDelayHours,
      quietHoursStart: updated.quietHoursStart,
      quietHoursEnd: updated.quietHoursEnd,
    }
  })
}

// Get pending reviews count (for badge)
export const getInboxCount = async (req, res) => {
  const { userId } = req.user

  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

  const grants = await prisma.accessGrant.findMany({
    where: { doctorId: doctor.id, status: 'APPROVED' },
    select: { medicalRecordId: true }
  })

  const count = await prisma.analysis.count({
    where: {
      medicalRecordId: { in: grants.map((g) => g.medicalRecordId) },
      isReviewed: false,
    }
  })

  return res.json({ count })
}

// Get items shared directly with this doctor (by patient or another doctor)
export const getSharedWithMe = async (req, res) => {
  const { userId } = req.user

  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

  const grants = await prisma.accessGrant.findMany({
    where: {
      doctorId: doctor.id,
      status: 'APPROVED',
      OR: [
        { fileId: { not: null } },
        { prescriptionId: { not: null } },
        { diagnosisId: { not: null } }
      ]
    },
    include: {
      medicalRecord: {
        include: {
          patient: {
            include: { user: { select: { fullName: true, email: true } } }
          }
        }
      },
      file: {
        include: { lab: { include: { user: { select: { fullName: true } } } } }
      },
      prescription: {
        include: { doctor: { include: { user: { select: { fullName: true } } } } }
      },
      diagnosis: {
        include: { doctor: { include: { user: { select: { fullName: true } } } } }
      }
    },
    orderBy: { respondedAt: 'desc' }
  })

  return res.json(grants)
}

// ─── Dashboard KPIs ──────────────────────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.userId } })
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // 1. Appointments Today
    const appointmentsToday = await prisma.appointment.count({
      where: {
        doctorId: doctor.id,
        appointmentTime: { gte: todayStart, lte: todayEnd },
        status: { notIn: ['CANCELLED'] }
      }
    })

    // 2. Pending Appointments
    const pendingAppointments = await prisma.appointment.count({
      where: {
        doctorId: doctor.id,
        status: 'PENDING'
      }
    })

    // 3. Patients (approved access grants)
    const uniquePatientsCount = await prisma.accessGrant.groupBy({
      by: ['medicalRecordId'],
      where: {
        doctorId: doctor.id,
        status: 'APPROVED'
      }
    })
    const totalPatients = uniquePatientsCount.length

    // 4. Pending Lab Results (Inbox)
    const grants = await prisma.accessGrant.findMany({
      where: { doctorId: doctor.id, status: 'APPROVED' },
      select: { medicalRecordId: true }
    })
    const recordIds = grants.map(g => g.medicalRecordId)

    const pendingLabs = await prisma.analysis.count({
      where: {
        medicalRecordId: { in: recordIds },
        isReviewed: false
      }
    })

    return res.json({
      appointmentsToday,
      pendingAppointments,
      totalPatients,
      pendingLabs
    })
  } catch (err) {
    console.error('getDashboardStats error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
