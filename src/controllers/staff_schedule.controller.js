
// ─── Staff Management ─────────────────────────────────────────────────────────
export const getStaff = async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.userId } })
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' })

    const assistants = await prisma.assistant.findMany({
      where: { doctorId: doctor.id },
      include: {
        user: { select: { id: true, fullName: true, email: true, phoneNumber: true, accountStatus: true, createdAt: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return res.json(assistants)
  } catch (err) {
    console.error('getStaff error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const approveAssistant = async (req, res) => {
  try {
    const { id } = req.params
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.userId } })
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' })

    const assistant = await prisma.assistant.findFirst({ where: { id, doctorId: doctor.id } })
    if (!assistant) return res.status(404).json({ error: 'Assistant not found' })

    await prisma.user.update({ where: { id: assistant.userId }, data: { accountStatus: 'ACTIVE' } })
    return res.json({ message: 'Assistant approved successfully' })
  } catch (err) {
    console.error('approveAssistant error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const banAssistant = async (req, res) => {
  try {
    const { id } = req.params
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.userId } })
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' })

    const assistant = await prisma.assistant.findFirst({ where: { id, doctorId: doctor.id } })
    if (!assistant) return res.status(404).json({ error: 'Assistant not found' })

    await prisma.user.update({ where: { id: assistant.userId }, data: { accountStatus: 'SUSPENDED' } })
    return res.json({ message: 'Assistant banned successfully' })
  } catch (err) {
    console.error('banAssistant error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ─── Schedule Management ──────────────────────────────────────────────────────
export const getDoctorSchedule = async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user.userId },
      select: { id: true, slotDurationMinutes: true }
    })
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' })

    const schedule = await prisma.doctorSchedule.findMany({
      where: { doctorId: doctor.id },
      orderBy: { dayOfWeek: 'asc' }
    })

    return res.json({ slotDurationMinutes: doctor.slotDurationMinutes, schedule })
  } catch (err) {
    console.error('getDoctorSchedule error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const updateDoctorSchedule = async (req, res) => {
  try {
    const { slotDurationMinutes, schedule } = req.body
    // schedule is an array of { dayOfWeek, startTime, endTime, isDayOff }

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.userId } })
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' })

    // Update slot duration if provided (no hardcoded fallback — trust the DB)
    if (slotDurationMinutes != null) {
      await prisma.doctor.update({ where: { id: doctor.id }, data: { slotDurationMinutes: parseInt(slotDurationMinutes) } })
    }

    if (Array.isArray(schedule)) {
      // Upsert each day
      await Promise.all(schedule.map(day =>
        prisma.doctorSchedule.upsert({
          where: { doctorId_dayOfWeek: { doctorId: doctor.id, dayOfWeek: day.dayOfWeek } },
          update: { startTime: day.startTime, endTime: day.endTime, isDayOff: !!day.isDayOff },
          create: { doctorId: doctor.id, dayOfWeek: day.dayOfWeek, startTime: day.startTime || '09:00', endTime: day.endTime || '17:00', isDayOff: !!day.isDayOff }
        })
      ))
    }

    return res.json({ message: 'Schedule updated successfully' })
  } catch (err) {
    console.error('updateDoctorSchedule error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
