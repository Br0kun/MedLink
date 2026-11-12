import { prisma } from '../config/db.js'

// ─── Public: Doctor Directory ─────────────────────────────────────────────────
export const listPublicDoctors = async (req, res) => {
  try {
    const { name, specialty, city } = req.query

    const doctors = await prisma.doctor.findMany({
      where: {
        // isVerified: true,
        user: {
          // accountStatus: 'ACTIVE',
          isActive: true,
          ...(name ? { fullName: { contains: name, mode: 'insensitive' } } : {})
        },
        ...(specialty ? { specialty } : {}),
        ...(city ? { city: { contains: city, mode: 'insensitive' } } : {})
      },
      select: {
        id: true,
        specialty: true,
        customSpecialty: true,
        licenseNumber: true,
        city: true,
        slotDurationMinutes: true,
        user: { select: { fullName: true, email: true } }
      },
      orderBy: { user: { fullName: 'asc' } }
    })

    return res.json(doctors)
  } catch (err) {
    console.error('listPublicDoctors error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ─── Public: Single Doctor Profile ───────────────────────────────────────────
export const getPublicDoctorProfile = async (req, res) => {
  try {
    const { id } = req.params

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      select: {
        id: true,
        specialty: true,
        customSpecialty: true,
        licenseNumber: true,
        city: true,
        slotDurationMinutes: true,
        isVerified: true,
        user: { select: { fullName: true, email: true } },
        schedule: {
          select: { dayOfWeek: true, startTime: true, endTime: true, isDayOff: true },
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    })

    if (!doctor) return res.status(404).json({ error: 'Doctor not found' })
    if (!doctor.isVerified) return res.status(404).json({ error: 'Doctor not available' })

    return res.json(doctor)
  } catch (err) {
    console.error('getPublicDoctorProfile error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ─── Public: Dynamic Slot Generator ──────────────────────────────────────────
export const getAvailableSlots = async (req, res) => {
  try {
    const { id } = req.params
    const { date } = req.query

    if (!date) return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' })

    const targetDate = new Date(date)
    if (isNaN(targetDate)) return res.status(400).json({ error: 'Invalid date format' })

    const dayOfWeek = targetDate.getDay() // 0=Sunday … 6=Saturday

    // Fetch doctor's schedule for this day and slot duration — all from DB, nothing hardcoded
    const [doctor, daySchedule] = await Promise.all([
      prisma.doctor.findUnique({ where: { id }, select: { slotDurationMinutes: true } }),
      prisma.doctorSchedule.findUnique({ where: { doctorId_dayOfWeek: { doctorId: id, dayOfWeek } } })
    ])

    if (!doctor) return res.status(404).json({ error: 'Doctor not found' })
    if (!daySchedule || daySchedule.isDayOff) return res.json({ slots: [], isDayOff: true })

    const slotDuration = doctor.slotDurationMinutes

    // Parse startTime and endTime from DB strings ("HH:MM")
    const [startH, startM] = daySchedule.startTime.split(':').map(Number)
    const [endH, endM]     = daySchedule.endTime.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes   = endH * 60 + endM

    // Generate all possible slots dynamically from DB values
    const allSlots = []
    for (let m = startMinutes; m + slotDuration <= endMinutes; m += slotDuration) {
      const hour = Math.floor(m / 60)
      const min  = m % 60
      const slotTime = new Date(date)
      slotTime.setHours(hour, min, 0, 0)
      allSlots.push(slotTime)
    }

    // Fetch existing appointments for that day
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
    const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999)

    const existing = await prisma.appointment.findMany({
      where: {
        doctorId: id,
        appointmentTime: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELLED'] }
      },
      select: { appointmentTime: true }
    })

    const bookedTimes = new Set(existing.map(a => a.appointmentTime.getTime()))

    const availableSlots = allSlots
      .filter(slot => !bookedTimes.has(slot.getTime()))
      .map(slot => ({
        time: slot.toISOString(),
        label: slot.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
      }))

    return res.json({ slots: availableSlots, isDayOff: false, slotDurationMinutes: slotDuration })
  } catch (err) {
    console.error('getAvailableSlots error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ─── Public: Book an Appointment ─────────────────────────────────────────────
export const bookAppointment = async (req, res) => {
  try {
    const { doctorId, patientName, patientPhone, reason, appointmentTime } = req.body

    if (!doctorId || !patientName || !patientPhone || !appointmentTime) {
      return res.status(400).json({ error: 'doctorId, patientName, patientPhone, appointmentTime are required' })
    }

    const slotTime = new Date(appointmentTime)
    if (isNaN(slotTime)) return res.status(400).json({ error: 'Invalid appointmentTime' })

    // Check slot is not already taken
    const conflict = await prisma.appointment.findFirst({
      where: { doctorId, appointmentTime: slotTime, status: { notIn: ['CANCELLED'] } }
    })
    if (conflict) return res.status(409).json({ error: 'This slot is no longer available. Please choose another.' })

    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientName,
        patientPhone,
        reason: reason || null,
        appointmentTime: slotTime,
        bookedBy: 'PATIENT'
      }
    })

    return res.status(201).json({ message: 'Appointment booked successfully', appointment })
  } catch (err) {
    console.error('bookAppointment error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ─── Doctor: View own appointments ───────────────────────────────────────────
export const getDoctorAppointments = async (req, res) => {
  try {
    let resolvedDoctorId = null
    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.userId } })
      if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' })
      resolvedDoctorId = doctor.id
    } else if (req.user.role === 'ASSISTANT') {
      const assistant = await prisma.assistant.findUnique({ where: { userId: req.user.userId } })
      if (!assistant) return res.status(404).json({ error: 'Assistant profile not found' })
      resolvedDoctorId = assistant.doctorId
    }

    const { status, date } = req.query
    const where = { doctorId: resolvedDoctorId }
    if (status) where.status = status
    if (date) {
      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
      const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999)
      where.appointmentTime = { gte: dayStart, lte: dayEnd }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { appointmentTime: 'asc' }
    })

    return res.json(appointments)
  } catch (err) {
    console.error('getDoctorAppointments error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ─── Doctor: Update appointment status ───────────────────────────────────────
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, notes } = req.body

    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' })

    let resolvedDoctorId = null
    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.userId } })
      if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' })
      resolvedDoctorId = doctor.id
    } else if (req.user.role === 'ASSISTANT') {
      const assistant = await prisma.assistant.findUnique({ where: { userId: req.user.userId } })
      if (!assistant) return res.status(404).json({ error: 'Assistant profile not found' })
      resolvedDoctorId = assistant.doctorId
    }

    const appointment = await prisma.appointment.findFirst({ where: { id, doctorId: resolvedDoctorId } })
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' })

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status, ...(notes !== undefined ? { notes } : {}) }
    })

    return res.json(updated)
  } catch (err) {
    console.error('updateAppointmentStatus error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ─── Assistant: Book appointment on behalf of patient ────────────────────────
export const assistantBookAppointment = async (req, res) => {
  try {
    const { patientName, patientPhone, reason, appointmentTime } = req.body
    const doctorId = req.assistantDoctorId

    if (!patientName || !patientPhone || !appointmentTime) {
      return res.status(400).json({ error: 'patientName, patientPhone, appointmentTime are required' })
    }

    const slotTime = new Date(appointmentTime)
    if (isNaN(slotTime)) return res.status(400).json({ error: 'Invalid appointmentTime' })

    const conflict = await prisma.appointment.findFirst({
      where: { doctorId, appointmentTime: slotTime, status: { notIn: ['CANCELLED'] } }
    })
    if (conflict) return res.status(409).json({ error: 'This slot is already booked' })

    const appointment = await prisma.appointment.create({
      data: { doctorId, patientName, patientPhone, reason: reason || null, appointmentTime: slotTime, bookedBy: 'ASSISTANT' }
    })

    return res.status(201).json({ message: 'Appointment booked successfully', appointment })
  } catch (err) {
    console.error('assistantBookAppointment error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
