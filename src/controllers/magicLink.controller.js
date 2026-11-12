import { prisma } from '../config/db.js'

/**
 * GET /api/a/:token
 * Public preview endpoint for One-Tap Resolution Magic Link.
 * Allows doctor to view core values on mobile.
 */
export const getMagicLinkPreview = async (req, res) => {
  try {
    const { token } = req.params

    if (!token) {
      return res.status(400).json({ error: 'Magic link token is required' })
    }

    const analysis = await prisma.analysis.findUnique({
      where: { magicToken: token },
      include: {
        medicalRecord: {
          include: {
            patient: {
              include: {
                user: { select: { fullName: true, email: true } }
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

    if (!analysis) {
      return res.status(404).json({ error: 'Magic link is invalid or expired.' })
    }

    return res.json({
      id: analysis.id,
      patientName: analysis.medicalRecord.patient.user.fullName || 'Patient',
      patientEmail: analysis.medicalRecord.patient.user.email,
      analysisType: analysis.analysisType,
      category: analysis.category,
      priority: analysis.priority,
      summary: analysis.summary,
      fileUrl: analysis.fileUrl,
      uploadedAt: analysis.uploadedAt,
      isReviewed: analysis.isReviewed,
      reviewedAt: analysis.reviewedAt,
      labName: analysis.lab.labName || analysis.lab.user.fullName || 'Diagnostic Lab'
    })
  } catch (error) {
    console.error('[Magic Link Preview Error]', error)
    return res.status(500).json({ error: 'Internal server error processing magic link preview.' })
  }
}

/**
 * POST /api/a/:token/review
 * One-Tap Resolution endpoint.
 * Marks isReviewed = true, stops Cron monitoring, and records AuditLog.
 */
export const markReviewedViaMagicLink = async (req, res) => {
  try {
    const { token } = req.params

    if (!token) {
      return res.status(400).json({ error: 'Magic link token is required' })
    }

    const analysis = await prisma.analysis.findUnique({
      where: { magicToken: token },
      include: {
        medicalRecord: {
          include: {
            patient: {
              include: {
                user: { select: { fullName: true } }
              }
            },
            accessGrants: {
              where: { status: 'APPROVED' },
              include: {
                doctor: { select: { userId: true, user: { select: { fullName: true } } } }
              }
            }
          }
        }
      }
    })

    if (!analysis) {
      return res.status(404).json({ error: 'Magic link is invalid or expired.' })
    }

    if (analysis.isReviewed) {
      return res.json({
        message: 'This lab report has already been marked as reviewed.',
        analysis
      })
    }

    // Update analysis
    const updated = await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        isReviewed: true,
        reviewedAt: new Date()
      }
    })

    const patientName = analysis.medicalRecord.patient.user.fullName || 'Patient'
    const doctors = analysis.medicalRecord.accessGrants.map((g) => g.doctor)
    const reviewerDoc = doctors[0]

    // Fallback system user if no doctor found
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    const auditUserId = reviewerDoc?.userId || adminUser?.id || analysis.labId

    // Record One-Tap "Mark Reviewed" event in Admin Audit Trail
    await prisma.auditLog.create({
      data: {
        userId: auditUserId,
        action: `[One-Tap Magic Link] Marked lab report "${analysis.analysisType}" for patient "${patientName}" as REVIEWED (Analysis ID: ${analysis.id})`
      }
    })

    console.log(`[Magic Link] Analysis ${analysis.id} marked as REVIEWED via One-Tap link.`)

    return res.json({
      message: 'Lab report successfully marked as reviewed.',
      analysis: updated
    })
  } catch (error) {
    console.error('[Magic Link Mark Reviewed Error]', error)
    return res.status(500).json({ error: 'Internal server error processing review.' })
  }
}
