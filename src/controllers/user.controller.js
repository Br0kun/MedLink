import { prisma } from '../config/db.js'
import bcrypt from 'bcrypt'

export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        patientProfile: true,
        doctorProfile: true,
        labProfile: true
      }
    })
    
    if (!user) return res.status(404).json({ error: 'User not found' })
    
    const { passwordHash, resetCode, resetCodeExpiry, patientProfile, doctorProfile, labProfile, ...basicInfo } = user
    let profileData = { ...basicInfo }

    if (user.role === 'PATIENT' && patientProfile) {
      profileData = { ...profileData, ...patientProfile }
    } else if (user.role === 'DOCTOR' && doctorProfile) {
      profileData = { ...profileData, ...doctorProfile }
    } else if (user.role === 'LAB' && labProfile) {
      profileData = { ...profileData, ...labProfile }
    }

    return res.json(profileData)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const updateProfile = async (req, res) => {
  try {
    const { fullName, phoneNumber, specialty, licenseNumber, allergies, bloodType, dateOfBirth, labName, inpeCode, address } = req.body
    
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { fullName, phoneNumber }
    })
    
    if (user.role === 'PATIENT') {
      await prisma.patient.update({
        where: { userId: user.id },
        data: {
          bloodType: bloodType || null,
          allergies: Array.isArray(allergies) ? allergies : (allergies ? allergies.split(',').map(a => a.trim()) : []),
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null
        }
      })
    } else if (user.role === 'DOCTOR') {
      await prisma.doctor.update({
        where: { userId: user.id },
        data: { specialty, licenseNumber }
      })
    } else if (user.role === 'LAB') {
      await prisma.lab.update({
        where: { userId: user.id },
        data: { labName, inpeCode, address }
      })
    }

    return res.json({ message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Error updating profile:', error)
    return res.status(500).json({ error: 'Failed to update profile' })
  }
}

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' })
    }
    
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } })
    
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Incorrect current password' })
    
    const passwordHash = await bcrypt.hash(newPassword, 10)
    
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    })
    
    return res.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Error updating password:', error)
    return res.status(500).json({ error: 'Failed to update password' })
  }
}
