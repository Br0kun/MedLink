import { prisma } from '../config/db.js'
import { io } from '../index.js'

/**
 * Build a deterministic conversation key from two user IDs.
 * Always produces the same key regardless of caller order.
 */
const conversationKey = (a, b) => [a, b].sort().join('_')

// ─── GET /doctor/chat/doctors ─────────────────────────────────────────────────
// Returns all other verified & active doctors plus unread count per conversation
export const listChatDoctors = async (req, res) => {
  try {
    const { userId } = req.user

    const doctors = await prisma.doctor.findMany({
      where: {
        isVerified: true,
        user: { isActive: true, accountStatus: 'ACTIVE', NOT: { id: userId } }
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } }
      }
    })

    // Attach unread count (messages sent TO me FROM that doctor)
    const withUnread = await Promise.all(
      doctors.map(async (doc) => {
        const unread = await prisma.chatMessage.count({
          where: {
            senderId:   doc.user.id,
            receiverId: userId,
            isRead:     false,
          }
        })
        return {
          doctorId:   doc.id,
          userId:     doc.user.id,
          fullName:   doc.user.fullName,
          email:      doc.user.email,
          specialty:  doc.specialty,
          unread,
        }
      })
    )

    return res.json(withUnread)
  } catch (err) {
    console.error('[Chat] listChatDoctors error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ─── GET /doctor/chat/:otherUserId/messages ────────────────────────────────────
// Returns paginated message history between current doctor and another (by userId)
export const getMessages = async (req, res) => {
  try {
    const { userId } = req.user
    const { otherUserId } = req.params

    const key = conversationKey(userId, otherUserId)

    const messages = await prisma.chatMessage.findMany({
      where: { conversationKey: key },
      orderBy: { sentAt: 'asc' },
      take: 100,
    })

    // Mark messages sent TO me as read
    await prisma.chatMessage.updateMany({
      where: {
        conversationKey: key,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true }
    })

    // Notify the other doctor via socket that messages are now read
    io.to(otherUserId).emit('messages_read', { conversationKey: key })

    return res.json(messages)
  } catch (err) {
    console.error('[Chat] getMessages error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ─── POST /doctor/chat/:otherUserId ───────────────────────────────────────────
// Send a message to another doctor
export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.user
    const { otherUserId } = req.params
    const { content } = req.body

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' })
    }

    // Verify target is a verified active doctor
    const targetDoctor = await prisma.doctor.findFirst({
      where: {
        userId: otherUserId,
        isVerified: true,
        user: { isActive: true, accountStatus: 'ACTIVE' }
      }
    })

    if (!targetDoctor) {
      return res.status(404).json({ error: 'Target doctor not found or not verified' })
    }

    const key = conversationKey(userId, otherUserId)

    const message = await prisma.chatMessage.create({
      data: {
        senderId:        userId,
        receiverId:      otherUserId,
        conversationKey: key,
        content:         content.trim(),
      }
    })

    // Real-time delivery to recipient's private room
    io.to(otherUserId).emit('chat_message', {
      ...message,
      conversationKey: key,
    })

    return res.status(201).json(message)
  } catch (err) {
    console.error('[Chat] sendMessage error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ─── GET /doctor/chat/unread-total ────────────────────────────────────────────
// Quick total unread count (for nav badge)
export const getUnreadTotal = async (req, res) => {
  try {
    const { userId } = req.user
    const count = await prisma.chatMessage.count({
      where: { receiverId: userId, isRead: false }
    })
    return res.json({ count })
  } catch (err) {
    console.error('[Chat] getUnreadTotal error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
