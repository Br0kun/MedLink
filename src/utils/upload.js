import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Create uploads folder if it doesn't exist
const uploadDir = 'uploads/analyses'
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  }
})

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowed.includes(ext)) cb(null, true)
  else cb(new Error('Only PDF and image files are allowed'))
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
})