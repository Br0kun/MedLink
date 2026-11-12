import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.js'
import {
  getMyDossier,
  requestAccess,
  respondToAccess,
  grantAccess,
  getDossierAsDoctor,
  getPendingRequests,
  getDossierByEmail,
  addPrescription,
  addDiagnosis,
  revokeAccess,
  downloadDossierPDF,
  getMyPatients,
  breakGlass,
  updateMyProfile,
} from '../controllers/dossier.controller.js'

const router = Router()

// Patient routes
router.get('/me',                          authenticate, authorize('PATIENT'), getMyDossier)
router.put('/profile',                     authenticate, authorize('PATIENT'), updateMyProfile)
router.get('/access/pending',              authenticate, authorize('PATIENT'), getPendingRequests)
router.put('/access/:id/respond',          authenticate, authorize('PATIENT'), respondToAccess)
router.put('/access/:id/revoke',           authenticate, authorize('PATIENT'), revokeAccess)
router.post('/access/grant',               authenticate, authorize('PATIENT'), grantAccess)
router.get('/download/pdf',                authenticate, authorize('PATIENT'), downloadDossierPDF)

// Doctor routes
router.get('/my-patients',                 authenticate, authorize('DOCTOR'),  getMyPatients)
router.get('/by-email/:email',             authenticate, authorize('DOCTOR'),  getDossierByEmail)
router.post('/access/request',             authenticate, authorize('DOCTOR'),  requestAccess)
router.post('/prescription/:patientEmail', authenticate, authorize('DOCTOR'),  addPrescription)
router.post('/diagnosis/:patientEmail',    authenticate, authorize('DOCTOR'),  addDiagnosis)
router.post('/break-glass/:patientEmail',  authenticate, authorize('DOCTOR'),  breakGlass)
router.get('/:patientId',                  authenticate, authorize('DOCTOR'),  getDossierAsDoctor)

export default router
