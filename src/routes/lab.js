import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.js'
import { upload } from '../utils/upload.js'
import {
  uploadAnalysis,
  getMyUploads,
  getMyAnalyses,
  getAnalysesAsDoctor
} from '../controllers/lab.controller.js'

const router = Router()

// Lab routes
router.post('/upload',   authenticate, authorize('LAB'),     upload.single('file'), uploadAnalysis)
router.get('/uploads',   authenticate, authorize('LAB'),     getMyUploads)

// Patient routes
router.get('/mine',      authenticate, authorize('PATIENT'), getMyAnalyses)

// Doctor routes
router.get('/:patientId', authenticate, authorize('DOCTOR'), getAnalysesAsDoctor)

export default router