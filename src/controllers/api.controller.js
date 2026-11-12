import { prisma } from '../config/db.js'
import { sendSMS } from '../services/sms.service.js'
import { notify } from '../utils/notify.js'
import { getActiveGrants, hasBaseAccess, getGrantedFileIds, getGrantedPrescriptionIds, getGrantedDiagnosisIds, isRecordVisible } from '../utils/access.js'
import { io } from '../index.js'

const formatDoctorName = (name) => {
  if (!name) return 'Unknown Doctor'
  const trimmed = name.trim()
  return trimmed.toLowerCase().startsWith('dr.') ? trimmed : `Dr. ${trimmed}`
}

/**
 * 1. Doctor Discovery Endpoint
 * GET /api/doctors
 * Returns a list of active and verified doctors with their ID, name, and specialty.
 * Excludes the logged-in doctor.
 */
export const getDoctors = async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      where: {
        isVerified: true,
        user: {
          isActive: true,
          accountStatus: 'ACTIVE',
          NOT: {
            id: req.user.userId
          }
        }
      },
      include: {
        user: {
          select: {
            fullName: true
          }
        }
      }
    })

    const responseData = doctors.map((doc) => ({
      id: doc.id,
      name: formatDoctorName(doc.user.fullName),
      specialty: doc.specialty
    }))

    return res.status(200).json(responseData)
  } catch (error) {
    console.error('[Discovery Error] Failed to fetch doctors:', error.message)
    return res.status(500).json({ error: 'Internal server error while searching for doctors.' })
  }
}

/**
 * 2. File Sharing Endpoint
 * POST /api/files/share
 * Creates a record in the AccessGrant table to authorize a specific doctor to view a specific item,
 * and sends an SMS notification to the patient.
 */
export const shareFile = async (req, res) => {
  const { fileId, prescriptionId, diagnosisId, doctorId, note, sendChatCard } = req.body

  if (!doctorId) {
    return res.status(400).json({ error: 'doctorId is required' })
  }
  if (!fileId && !prescriptionId && !diagnosisId) {
    return res.status(400).json({ error: 'Either fileId, prescriptionId, or diagnosisId is required' })
  }

  try {
    let medicalRecordId
    let patientUser
    let itemType
    let itemTitle
    let itemObj

    // 1. Fetch item and retrieve patient details
    if (fileId) {
      itemType = 'file'
      const file = await prisma.analysis.findUnique({
        where: { id: fileId },
        include: {
          medicalRecord: {
            include: {
              patient: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                      phoneNumber: true
                    }
                  }
                }
              }
            }
          }
        }
      })
      if (!file) return res.status(404).json({ error: 'Requested file not found' })
      medicalRecordId = file.medicalRecordId
      patientUser = file.medicalRecord.patient.user
      itemTitle = file.analysisType
      itemObj = file
    } else if (prescriptionId) {
      itemType = 'prescription'
      const rx = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: {
          medicalRecord: {
            include: {
              patient: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                      phoneNumber: true
                    }
                  }
                }
              }
            }
          }
        }
      })
      if (!rx) return res.status(404).json({ error: 'Requested prescription not found' })
      medicalRecordId = rx.medicalRecordId
      patientUser = rx.medicalRecord.patient.user
      itemTitle = rx.medications.join(', ') || 'Prescription'
      itemObj = rx
    } else if (diagnosisId) {
      itemType = 'diagnosis'
      const dx = await prisma.diagnosis.findUnique({
        where: { id: diagnosisId },
        include: {
          medicalRecord: {
            include: {
              patient: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                      phoneNumber: true
                    }
                  }
                }
              }
            }
          }
        }
      })
      if (!dx) return res.status(404).json({ error: 'Requested diagnosis not found' })
      medicalRecordId = dx.medicalRecordId
      patientUser = dx.medicalRecord.patient.user
      itemTitle = dx.title
      itemObj = dx
    }

    // Security Check: Ensure the requester is the patient who owns the file, a doctor with access, or an admin
    if (req.user.role === 'PATIENT') {
      if (patientUser.id !== req.user.userId) {
        return res.status(403).json({ error: `Access Denied: You do not own the dossier containing this ${itemType}` })
      }
    } else if (req.user.role === 'DOCTOR') {
      const requesterDoctor = await prisma.doctor.findUnique({
        where: { userId: req.user.userId }
      })
      if (!requesterDoctor) {
        return res.status(403).json({ error: 'Access Denied: Doctor profile not found' })
      }
      const grants = await getActiveGrants(requesterDoctor.id, medicalRecordId)
      
      let canSeeItem = false
      if (itemType === 'file') {
        const fileIds = getGrantedFileIds(grants)
        const hasBase = hasBaseAccess(grants)
        canSeeItem = fileIds.has(itemObj.id) || (hasBase && isRecordVisible(itemObj, 'ANALYSIS', requesterDoctor, grants))
      } else if (itemType === 'prescription') {
        const rxIds = getGrantedPrescriptionIds(grants)
        const hasBase = hasBaseAccess(grants)
        canSeeItem = rxIds.has(itemObj.id) || (hasBase && isRecordVisible(itemObj, 'PRESCRIPTION', requesterDoctor, grants)) || itemObj.doctorId === requesterDoctor.id
      } else if (itemType === 'diagnosis') {
        const dxIds = getGrantedDiagnosisIds(grants)
        const hasBase = hasBaseAccess(grants)
        canSeeItem = dxIds.has(itemObj.id) || (hasBase && isRecordVisible(itemObj, 'DIAGNOSIS', requesterDoctor, grants)) || itemObj.doctorId === requesterDoctor.id
      }

      if (!canSeeItem) {
        return res.status(403).json({ error: `Access Denied: You do not have access to this ${itemType}` })
      }
    } else if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access Denied: Unauthorized role' })
    }

    // 2. Fetch the target doctor to get their name and specialty
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    })

    if (!doctor) {
      return res.status(404).json({ error: 'Target doctor not found' })
    }

    // 3. Create or update AccessGrant in the database
    const existingGrant = await prisma.accessGrant.findFirst({
      where: {
        medicalRecordId,
        doctorId: doctor.id,
        fileId: fileId || null,
        prescriptionId: prescriptionId || null,
        diagnosisId: diagnosisId || null,
        category: null
      }
    })

    let grant
    const data = {
      status: 'APPROVED',
      respondedAt: new Date(),
      expiresAt: null
    }

    if (existingGrant) {
      grant = await prisma.accessGrant.update({
        where: { id: existingGrant.id },
        data
      })
    } else {
      grant = await prisma.accessGrant.create({
        data: {
          medicalRecordId,
          doctorId: doctor.id,
          fileId: fileId || null,
          prescriptionId: prescriptionId || null,
          diagnosisId: diagnosisId || null,
          category: null,
          requestedAt: new Date(),
          ...data
        }
      })
    }

    // Fetch sender info for messages and audit logs
    const senderUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { fullName: true }
    })
    const senderName = req.user.role === 'PATIENT' ? patientUser.fullName : formatDoctorName(senderUser?.fullName)

    // 4. Create an Audit Log for tracking sharing
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: `Shared ${itemType} "${itemTitle}" (ID: ${fileId || prescriptionId || diagnosisId}) with Dr. ${doctor.user.fullName}${note ? ` | Note: ${note}` : ''}`
      }
    })

    // 5. In-app notification — alert the patient that the share was successful
    const notificationMessage = `Dr. ${doctor.user.fullName} was granted access to your ${itemType} "${itemTitle}" by ${senderName}.`
    await notify(
      patientUser.id,
      'ACCESS_GRANTED',
      notificationMessage
    )

    // Send SMS alert to patient
    if (patientUser.phoneNumber) {
      try {
        await sendSMS(
          patientUser.phoneNumber,
          `MedPlatform Alert: ${notificationMessage}`
        )
      } catch (smsError) {
        console.error('[SMS Error] Failed to send share notification SMS:', smsError.message)
      }
    }

    // 6. In-app notification — alert the doctor that new access was granted
    await notify(
      doctor.user.id,
      'ACCESS_GRANTED',
      `${senderName} shared ${itemType} "${itemTitle}" (Patient: ${patientUser.fullName}) with you for consultation.${note ? ` Note: "${note}"` : ''}`
    )

    // 7. Interactive Chat Card — if shared doctor-to-doctor
    if (req.user.role === 'DOCTOR' && sendChatCard !== false) {
      const convKey = [req.user.userId, doctor.user.id].sort().join('_')
      const payloadObj = {
        type: itemType,
        title: itemTitle,
        patientName: patientUser.fullName,
        patientEmail: patientUser.email,
        id: fileId || prescriptionId || diagnosisId,
        note: note ? note.trim() : ''
      }
      const chatContent = `[SHARED_RECORD:${JSON.stringify(payloadObj)}]`

      const chatMsg = await prisma.chatMessage.create({
        data: {
          senderId: req.user.userId,
          receiverId: doctor.user.id,
          conversationKey: convKey,
          content: chatContent
        }
      })

      if (io) {
        try {
          io.to(doctor.user.id).emit('chat_message', {
            ...chatMsg,
            conversationKey: convKey
          })
        } catch (err) {
          console.error('[Socket Emit Error]', err)
        }
      }
    }

    return res.status(existingGrant ? 200 : 201).json({
      message: `${itemType} shared successfully`,
      grant
    })

  } catch (error) {
    console.error('[Sharing Error] Failed to share:', error)
    return res.status(500).json({ error: 'Internal server error during sharing.' })
  }
}
