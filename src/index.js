import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { verifySocketToken } from './middlewares/auth.js'

import authRoutes from './routes/auth.js'
import dossierRoutes from './routes/dossier.js'
import labRoutes from './routes/lab.js'
import notifRoutes from './routes/notification.js'
import adminRoutes from './routes/admin.js'
import doctorRoutes from './routes/doctor.js'
import apiRoutes from './routes/api.js'
import appointmentRoutes from './routes/appointment.js'
import { startSafetyNetJob } from './jobs/safetyNet.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const server = createServer(app)

// ─── Socket.IO setup ──────────────────────────────────────
export const io = new Server(server, {
  cors: { origin: '*' }
})

io.use(verifySocketToken)

io.on('connection', (socket) => {
  const userId = socket.user.userId
  socket.join(userId)            // each user gets their own private room
  console.log(`User ${userId} connected`)

  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected`)
  })
})

// ─── Express middleware ───────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
}, express.static(join(__dirname, '..', 'uploads')))

// ─── Routes ───────────────────────────────────────────────
app.use('/auth', authRoutes)
app.use('/dossier', dossierRoutes)
app.use('/lab', labRoutes)
app.use('/notifications', notifRoutes)
app.use('/admin', adminRoutes)
app.use('/doctor', doctorRoutes)
app.use('/api', apiRoutes)
app.use('/api', appointmentRoutes)
// ─── Health check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' })
})

// ─── 404 ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// ─── Error handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000
  server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))

  // Start Safety Net Cron job (runs every 15 mins)
  startSafetyNetJob()
}