import { prisma } from '../config/db.js'
import { io } from '../index.js'

export const notify = async (userId, type, message) => {
  const notification = await prisma.notification.create({
    data: { userId, type, message }
  })

  // Emit to the user's private room instantly
  io.to(userId).emit('notification', notification)

  return notification
}