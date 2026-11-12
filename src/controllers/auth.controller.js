import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/db.js'

export const register = async (req, res) => {
  const { fullName, email, password, role, specialty, licenseNumber, dateOfBirth, bloodType, allergies, labName, inpeCode, phoneNumber, doctorEmail } = req.body

  const validRoles = ['PATIENT', 'DOCTOR', 'LAB', 'ADMIN', 'ASSISTANT']
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' })

  let resolvedDoctorId = null
  if (role === 'ASSISTANT') {
    if (!doctorEmail) return res.status(400).json({ error: 'A doctorEmail is required to register as an assistant' })
    const doctorUser = await prisma.user.findUnique({
      where: { email: doctorEmail },
      include: { doctorProfile: true }
    })
    if (!doctorUser || !doctorUser.doctorProfile) {
      return res.status(404).json({ error: 'No doctor found with that email address' })
    }
    resolvedDoctorId = doctorUser.doctorProfile.id
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'Email already in use' })

  const passwordHash = await bcrypt.hash(password, 10)

  // Doctors, Labs, and Assistants start PENDING until approved
  const accountStatus = (role === 'DOCTOR' || role === 'LAB' || role === 'ASSISTANT') ? 'PENDING' : 'ACTIVE'

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      role,
      accountStatus,
      phoneNumber: phoneNumber || null,
      ...(role === 'PATIENT' && {
        patientProfile: {
          create: {
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            bloodType: bloodType || null,
            allergies: Array.isArray(allergies) ? allergies.filter(Boolean) : [],
            dossier: { create: {} }
          }
        }
      }),
      ...(role === 'DOCTOR' && {
        doctorProfile: {
          create: {
            specialty: specialty || 'GENERAL',
            customSpecialty: specialty === 'OTHER' ? req.body.customSpecialty : null,
            licenseNumber: licenseNumber || null,
          }
        }
      }),
      ...(role === 'LAB' && {
        labProfile: {
          create: {
            labName: labName || null,
            inpeCode: inpeCode || null,
          }
        }
      }),
      ...(role === 'ASSISTANT' && {
        assistantProfile: {
          create: {
            doctorId: resolvedDoctorId,
          }
        }
      }),
    },
  })

  // If pending, don't give token — return message instead
  if (accountStatus === 'PENDING') {
    return res.status(201).json({
      pending: true,
      message: role === 'ASSISTANT'
        ? 'Registration successful. Waiting for your doctor to approve your account.'
        : 'Your account is pending admin approval. You will be notified once approved.'
    })
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  return res.status(201).json({
    token,
    user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role }
  })
}

export const login = async (req, res) => {
  const { email, password } = req.body

  const user = await prisma.user.findUnique({
    where: { email },
    include: { doctorProfile: true }
  })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  if (user.accountStatus === 'PENDING') {
    return res.status(403).json({ error: 'Your account is pending admin approval.' })
  }

  if (!user.isActive || user.accountStatus === 'SUSPENDED') {
    return res.status(403).json({ error: 'Account suspended. Contact admin.' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  const payload = { id: user.id, fullName: user.fullName, email: user.email, role: user.role }
  if (user.role === 'DOCTOR' && user.doctorProfile) {
    payload.specialty = user.doctorProfile.specialty
    payload.licenseNumber = user.doctorProfile.licenseNumber
  }

  return res.json({ token, user: payload })
}
