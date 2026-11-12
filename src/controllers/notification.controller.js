import { prisma } from '../config/db.js'

// Get all notifications for the logged-in user
export const getMyNotifications = async (req, res) => {
  const { userId } = req.user

  const notifications = await prisma.notification.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    50
  })

  return res.json(notifications)
}

// Mark one notification as read
export const markAsRead = async (req, res) => {
  const { userId } = req.user
  const { id } = req.params

  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification) return res.status(404).json({ error: 'Not found' })
  if (notification.userId !== userId) return res.status(403).json({ error: 'Forbidden' })

  const updated = await prisma.notification.update({
    where: { id },
    data:  { isRead: true }
  })

  return res.json(updated)
}

// Mark all as read
export const markAllAsRead = async (req, res) => {
  const { userId } = req.user

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true }
  })

  return res.json({ message: 'All notifications marked as read' })
}

// Unread count (for the bell badge)
export const getUnreadCount = async (req, res) => {
  const { userId } = req.user

  const count = await prisma.notification.count({
    where: { userId, isRead: false }
  })

  return res.json({ count })
}