import jwt from 'jsonwebtoken'
import { prisma } from '../config/db.js'

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // DB check: block PENDING or SUSPENDED accounts (critical for ASSISTANT approval flow)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, accountStatus: true, isActive: true }
    })

    if (!user) return res.status(401).json({ error: 'Account not found' })
    if (user.accountStatus === 'PENDING') {
      return res.status(403).json({ error: 'Your account is pending approval.' })
    }
    if (user.accountStatus === 'SUSPENDED' || !user.isActive) {
      return res.status(403).json({ error: 'Your account has been suspended.' })
    }

    req.user = { ...decoded, userId: user.id, role: user.role }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    next()
  }
}

/**
 * Middleware for ASSISTANT: verifies the assistant is linked to the doctor
 * being accessed. Attach doctorId to req for downstream controllers.
 */
export const authorizeAssistant = async (req, res, next) => {
  try {
    const assistant = await prisma.assistant.findUnique({
      where: { userId: req.user.userId },
      select: { doctorId: true }
    })
    if (!assistant) return res.status(403).json({ error: 'Assistant profile not found' })
    req.assistantDoctorId = assistant.doctorId
    next()
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const verifySocketToken = (socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('No token provided'))
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.user = decoded
    next()
  } catch {
    next(new Error('Invalid token'))
  }
}
