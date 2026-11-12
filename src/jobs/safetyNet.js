import cron from 'node-cron'
import crypto from 'crypto'
import { prisma } from '../config/db.js'
import { sendSMS } from '../services/sms.service.js'

/**
 * Checks if a given time falls within quiet hours [start, end].
 * Supports HH:mm strings (e.g. "12:45", "22:00") and whole hour numbers (e.g. 12, 22).
 * Handles daytime windows (e.g. 12:45 to 16:30 or 08:00 to 12:00) and overnight windows (e.g. 22:00 to 07:30).
 */
export const isQuietHours = (startVal, endVal, dateObj = new Date()) => {
  if (
    startVal === null || startVal === undefined || startVal === '' ||
    endVal === null || endVal === undefined || endVal === ''
  ) {
    return false
  }

  const parseToMinutes = (val) => {
    if (typeof val === 'number') return val * 60
    const str = String(val).trim()
    if (str.includes(':')) {
      const [h, m] = str.split(':').map((x) => parseInt(x, 10) || 0)
      return (h % 24) * 60 + (m % 60)
    }
    const h = parseInt(str, 10)
    return isNaN(h) ? null : (h % 24) * 60
  }

  const startMinutes = parseToMinutes(startVal)
  const endMinutes = parseToMinutes(endVal)

  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) {
    return false
  }

  const currentMinutes = dateObj.getHours() * 60 + dateObj.getMinutes()

  if (startMinutes < endMinutes) {
    // Same-day range e.g. 08:00 to 12:00 or 12:45 to 16:30
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  } else {
    // Spans midnight e.g. 22:00 to 07:30
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }
}

/**
 * Core Safety Net evaluation logic. Can be run manually or by the 15-min Cron schedule.
 */
export const runSafetyNetEvaluation = async () => {
  console.log('[Safety Net Engine] Running unreviewed lab report evaluation...')

  // Find system or admin user for logging evaluation runs
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })
  const systemUserId = adminUser?.id

  // Fetch all unreviewed lab reports
  const unreviewedAnalyses = await prisma.analysis.findMany({
    where: { isReviewed: false },
    include: {
      medicalRecord: {
        include: {
          patient: {
            include: {
              user: { select: { fullName: true, email: true } }
            }
          },
          accessGrants: {
            where: { status: 'APPROVED' },
            include: {
              doctor: {
                include: {
                  user: { select: { id: true, fullName: true, phoneNumber: true, email: true } }
                }
              }
            }
          }
        }
      },
      lab: {
        include: {
          user: { select: { fullName: true } }
        }
      }
    }
  })

  // Log Cron evaluation start in AuditLog
  if (systemUserId) {
    await prisma.auditLog.create({
      data: {
        userId: systemUserId,
        action: `[Cron Safety Net] Evaluated ${unreviewedAnalyses.length} unreviewed lab report(s).`
      }
    })
  }

  const now = new Date()
  let totalSmsDispatched = 0

  for (const analysis of unreviewedAnalyses) {
    const { priority, uploadedAt, lastNotifiedAt, medicalRecord } = analysis
    const patientName = medicalRecord.patient.user.fullName || 'Patient'
    const doctors = medicalRecord.accessGrants.map((g) => g.doctor)

    if (doctors.length === 0) continue

    const minutesSinceUpload = (now - new Date(uploadedAt)) / (1000 * 60)

    for (const doctor of doctors) {
      if (!doctor.user) continue

      const doctorUserId = doctor.user.id
      const doctorPhone = doctor.user.phoneNumber

      // Generate magic token if missing
      let magicToken = analysis.magicToken
      if (!magicToken) {
        magicToken = crypto.randomBytes(16).toString('hex')
        await prisma.analysis.update({
          where: { id: analysis.id },
          data: { magicToken }
        })
      }

      const appUrl = process.env.APP_URL || 'http://localhost:3000'
      const magicLink = `${appUrl}/a/${magicToken}`

      // Cooldown windows: re-alert if still unreviewed and enough time passed since last notification
      const CRITICAL_COOLDOWN_MINUTES = 6 * 60  // re-alert CRITICAL every 6 hours
      const ROUTINE_COOLDOWN_HOURS = 24          // re-alert ROUTINE every 24 hours

      const minutesSinceLastNotified = lastNotifiedAt
        ? (now - new Date(lastNotifiedAt)) / (1000 * 60)
        : Infinity  // never notified → treat as always past cooldown

      let shouldDispatch = false
      let alertType = ''

      if (priority === 'CRITICAL') {
        // CRITICAL: fire after 15 min upload delay, then re-alert every 6h
        if (minutesSinceUpload >= 15 && minutesSinceLastNotified >= CRITICAL_COOLDOWN_MINUTES) {
          shouldDispatch = true
          alertType = 'CRITICAL'
        }
      } else {
        // ROUTINE: respect initial delay & quiet hours, then re-alert every 24h
        const delayHours = doctor.routineDelayHours || 12
        const hoursSinceUpload = minutesSinceUpload / 60

        if (hoursSinceUpload >= delayHours && minutesSinceLastNotified >= ROUTINE_COOLDOWN_HOURS * 60) {
          const inQuiet = isQuietHours(doctor.quietHoursStart, doctor.quietHoursEnd, now)

          if (!inQuiet) {
            shouldDispatch = true
            alertType = 'ROUTINE'
          } else {
            console.log(
              `[Safety Net Engine] Doctor ${doctor.user.fullName} is currently in Quiet Hours (${doctor.quietHoursStart} - ${doctor.quietHoursEnd}). Skipping routine SMS for analysis ${analysis.id}.`
            )
          }
        }
      }

      if (shouldDispatch) {
        let messageText = ''
        if (alertType === 'CRITICAL') {
          messageText = `[CRITICAL LAB ALERT] Patient: ${patientName} | Test: ${analysis.analysisType}. Immediate review required: ${magicLink}`
        } else {
          messageText = `[Lab Alert Reminder] Patient: ${patientName} | Test: ${analysis.analysisType}. Review report: ${magicLink}`
        }

        let smsMessageId = null
        let smsSuccess = false

        if (doctorPhone) {
          const smsRes = await sendSMS(doctorPhone, messageText)
          smsSuccess = smsRes.success
          smsMessageId = smsRes.messageId || 'MOCK_MSG_ID'
        } else {
          console.warn(`[Safety Net Engine] Dr. ${doctor.user.fullName} has no phone number configured. SMS dispatch simulated.`)
          smsSuccess = true
          smsMessageId = 'NO_PHONE_SIMULATED'
        }

        // Update analysis notification status
        await prisma.analysis.update({
          where: { id: analysis.id },
          data: { lastNotifiedAt: new Date() }
        })

        // Also emit Socket.IO notification to doctor inbox
        try {
          const { io } = await import('../index.js')
          if (io) {
            io.to(doctorUserId).emit('safety_net_alert', {
              analysisId: analysis.id,
              patientName,
              analysisType: analysis.analysisType,
              priority,
              magicLink,
              message: messageText
            })
          }
        } catch (err) {
          // Socket.IO optional emit error handler
        }

        // Audit Trail entry for SMS dispatch with Textbee message ID
        await prisma.auditLog.create({
          data: {
            userId: doctorUserId,
            action: `[Cron Safety Net] Dispatched ${alertType} SMS to Dr. ${doctor.user.fullName} (${doctorPhone || 'No Phone'}) [Textbee ID: ${smsMessageId}] for analysis "${analysis.analysisType}" (ID: ${analysis.id})`
          }
        })

        totalSmsDispatched++
      }
    }
  }

  console.log(`[Safety Net Engine] Evaluation complete. Dispatched ${totalSmsDispatched} SMS alert(s).`)
  return { evaluatedCount: unreviewedAnalyses.length, smsDispatchedCount: totalSmsDispatched }
}

/**
 * Start the background Cron job running every 15 minutes (every 15 mins)
 */
export const startSafetyNetJob = () => {
  console.log('[Safety Net Job] Initializing 15-minute background Cron job...')
  cron.schedule('*/15 * * * *', async () => {
    try {
      await runSafetyNetEvaluation()
    } catch (err) {
      console.error('[Safety Net Job Error]', err)
    }
  })
}
