import { prisma } from '../config/db.js'

// ─── Platform stats ───────────────────────────────────────
export const getStats = async (req, res) => {
  const [patients, doctors, labs, analyses, pendingAccess] = await Promise.all([
    prisma.user.count({ where: { role: 'PATIENT' } }),
    prisma.user.count({ where: { role: 'DOCTOR' } }),
    prisma.user.count({ where: { role: 'LAB' } }),
    prisma.analysis.count(),
    prisma.accessGrant.count({ where: { status: 'PENDING' } }),
  ])

  return res.json({ patients, doctors, labs, analyses, pendingAccess })
}

// ─── List all users (with optional role filter) ───────────
export const getAllUsers = async (req, res) => {
  const { role, page = 1, limit = 20 } = req.query

  const where = role ? { role: role.toUpperCase() } : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    }),
    prisma.user.count({ where })
  ])

  return res.json({
    users,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit))
  })
}

// ─── Get single user detail ───────────────────────────────
export const getUserDetail = async (req, res) => {
  const { id } = req.params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      patientProfile: {
        include: {
          dossier: {
            include: {
              analyses: { orderBy: { uploadedAt: 'desc' }, take: 5 },
              prescriptions: { orderBy: { issuedAt: 'desc' }, take: 5 },
              diagnoses: { orderBy: { diagnosedAt: 'desc' }, take: 5 },
              accessGrants: { orderBy: { requestedAt: 'desc' }, take: 5 },
            }
          }
        }
      },
      doctorProfile: true,
      labProfile: true,
    }
  })

  if (!user) return res.status(404).json({ error: 'User not found' })

  return res.json(user)
}

// ─── Suspend or reactivate a user ────────────────────────
export const toggleUserStatus = async (req, res) => {
  const { id } = req.params

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return res.status(404).json({ error: 'User not found' })

  // Prevent admin from suspending themselves
  if (user.id === req.user.userId) {
    return res.status(400).json({ error: 'You cannot suspend your own account' })
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: { id: true, fullName: true, email: true, role: true, isActive: true }
  })

  // Log the action
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: `Admin ${updated.isActive ? 'reactivated' : 'suspended'} user ${user.email}`
    }
  })

  return res.json({
    message: `User ${updated.isActive ? 'reactivated' : 'suspended'} successfully`,
    user: updated
  })
}

// ─── Audit logs ───────────────────────────────────────────
export const getAuditLogs = async (req, res) => {
  const { page = 1, limit = 50, role, search } = req.query

  const where = {}

  if (role && search) {
    where.AND = [
      { user: { role: role.toUpperCase() } },
      {
        OR: [
          { action: { contains: search, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        ]
      }
    ]
  } else if (role) {
    where.user = { role: role.toUpperCase() }
  } else if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      {
        user: {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }
      }
    ]
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        user: { select: { fullName: true, email: true, role: true } }
      }
    }),
    prisma.auditLog.count({ where })
  ])

  return res.json({
    logs,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit))
  })
}

// ─── All access grants (overview) ────────────────────────
export const getAccessGrants = async (req, res) => {
  const { status } = req.query

  const where = status ? { status: status.toUpperCase() } : {}

  const grants = await prisma.accessGrant.findMany({
    where,
    orderBy: { requestedAt: 'desc' },
    take: 100,
    include: {
      doctor: { include: { user: { select: { fullName: true, email: true } } } },
      medicalRecord: {
        include: {
          patient: { include: { user: { select: { fullName: true, email: true } } } }
        }
      }
    }
  })

  return res.json(grants)
}

// Permanent emergency-access audit trail. Read-only — there is no
// update or delete endpoint for BreakGlassLog anywhere in the API.
export const getBreakGlassLogs = async (req, res) => {
  const logs = await prisma.breakGlassLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      doctor: { include: { user: { select: { fullName: true, email: true } } } },
      medicalRecord: {
        include: {
          patient: { include: { user: { select: { fullName: true, email: true } } } }
        }
      }
    }
  })

  return res.json(logs)
}
// Get pending verifications (doctors + labs awaiting approval)
export const getPendingVerifications = async (req, res) => {
  const pending = await prisma.user.findMany({
    where: {
      accountStatus: 'PENDING',
      role: { in: ['DOCTOR', 'LAB'] }
    },
    include: {
      doctorProfile: true,
      labProfile: true,
    },
    orderBy: { createdAt: 'desc' }
  })
  return res.json(pending)
}

// Approve or reject a doctor/lab account
export const verifyAccount = async (req, res) => {
  const { id } = req.params
  const { decision } = req.body // 'APPROVED' or 'REJECTED'

  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be APPROVED or REJECTED' })
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return res.status(404).json({ error: 'User not found' })

  const accountStatus = decision === 'APPROVED' ? 'ACTIVE' : 'SUSPENDED'

  await prisma.user.update({
    where: { id },
    data: { accountStatus, isActive: decision === 'APPROVED' }
  })

  // If doctor, mark as verified
  if (user.role === 'DOCTOR') {
    await prisma.doctor.update({
      where: { userId: id },
      data: { isVerified: decision === 'APPROVED' }
    })
  }
  if (user.role === 'LAB') {
    await prisma.lab.update({
      where: { userId: id },
      data: { isVerified: decision === 'APPROVED' }
    })
  }

  // Notify the user
  const { notify } = await import('../utils/notify.js')
  await notify(
    id,
    'ACCOUNT_APPROVED',
    decision === 'APPROVED'
      ? 'Your account has been approved. You can now log in.'
      : 'Your account application was rejected. Contact support for more information.'
  )

  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'Admin ' + decision.toLowerCase() + ' account of ' + user.email
    }
  })

  return res.json({ message: 'Account ' + decision.toLowerCase() })
}

// Count pending verifications (for sidebar badge)
export const getPendingVerificationsCount = async (req, res) => {
  const count = await prisma.user.count({
    where: { accountStatus: 'PENDING', role: { in: ['DOCTOR', 'LAB'] } }
  })
  return res.json({ count })
}