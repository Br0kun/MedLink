import { prisma } from '../config/db.js'

// ─────────────────────────────────────────────────────────────
// Patient-Driven Permissions & Specialty Access Control
//
// Every doctor needs a *base* AccessGrant (category: null) approved
// by the patient before they can see anything at all — this is the
// existing "Google Drive share" gate.
//
// On top of that base grant, two more layers narrow what's visible:
//
// 1. Specialty isolation (automatic, no patient action needed):
//    a record tagged with a Specialty category is only visible to a
//    doctor whose own specialty matches, or if the record is GENERAL.
//    An ophthalmologist does not see PSYCHIATRY records by default,
//    even with a fully-approved base grant.
//
// 2. Cross-specialty extension (patient opt-in): the patient can
//    approve an *additional* AccessGrant scoped to a specific
//    category (e.g. category: 'PSYCHIATRY') for a specific doctor,
//    which unlocks that specialty's records for that doctor alone.
//
// A grant's `scope` field (array of Section) restricts which record
// *types* it covers. An empty scope array means "all sections".
// ─────────────────────────────────────────────────────────────

// Fetch every still-valid (approved, non-expired) grant a doctor
// holds on a given medical record.
export async function getActiveGrants(doctorId, medicalRecordId) {
  const now = new Date()

  return prisma.accessGrant.findMany({
    where: {
      doctorId,
      medicalRecordId,
      status: 'APPROVED',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    }
  })
}

// True if the doctor holds any valid base (category: null, fileId: null, prescriptionId: null, diagnosisId: null)
// grant — this is the minimum requirement to open the full dossier.
// Item-specific grants do NOT count as base access.
export function hasBaseAccess(grants) {
  return grants.some((g) => g.category === null && g.fileId === null && g.prescriptionId === null && g.diagnosisId === null)
}

// True if the doctor holds at least one item-specific (file, prescription, or diagnosis) grant.
export function hasSpecificAccess(grants) {
  return grants.some((g) => g.fileId !== null || g.prescriptionId !== null || g.diagnosisId !== null)
}

// True if the doctor has either base dossier access or specific item-specific access.
export function hasAnyAccess(grants) {
  return hasBaseAccess(grants) || hasSpecificAccess(grants)
}

// Collect the set of file IDs the doctor has been explicitly granted.
export function getGrantedFileIds(grants) {
  return new Set(grants.filter((g) => g.fileId !== null).map((g) => g.fileId))
}

// Collect the set of prescription IDs the doctor has been explicitly granted.
export function getGrantedPrescriptionIds(grants) {
  return new Set(grants.filter((g) => g.prescriptionId !== null).map((g) => g.prescriptionId))
}

// Collect the set of diagnosis IDs the doctor has been explicitly granted.
export function getGrantedDiagnosisIds(grants) {
  return new Set(grants.filter((g) => g.diagnosisId !== null).map((g) => g.diagnosisId))
}

// True if a grant's scope covers the given section.
function grantCoversSection(grant, section) {
  return grant.scope.length === 0 || grant.scope.includes(section)
}

// Decide whether a single record (with its own `category`) is visible
// to this doctor, given their specialty and their active grants.
export function isRecordVisible(record, section, doctor, grants) {
  const relevantGrants = grants.filter((g) => grantCoversSection(g, section))
  if (relevantGrants.length === 0) return false

  const recordIsGeneral       = record.category === 'GENERAL'
  const matchesDoctorSpecialty = record.category === doctor.specialty
  const hasCategoryGrant       = relevantGrants.some((g) => g.category === record.category)

  return recordIsGeneral || matchesDoctorSpecialty || hasCategoryGrant
}

// Filter a dossier's analyses/prescriptions/diagnoses down to only
// what this doctor is currently allowed to see.
// If the doctor has base access → normal specialty-based filtering.
// Specific grants additionally unlock specific items regardless of specialty.
export function filterDossierForDoctor(dossier, doctor, grants) {
  const fileIds = getGrantedFileIds(grants)
  const rxIds = getGrantedPrescriptionIds(grants)
  const dxIds = getGrantedDiagnosisIds(grants)
  const hasBase = hasBaseAccess(grants)

  return {
    ...dossier,
    analyses: dossier.analyses.filter((a) => {
      // File-level grant always unlocks the specific analysis
      if (fileIds.has(a.id)) return true
      // Base grant → normal specialty filtering
      if (hasBase) return isRecordVisible(a, 'ANALYSIS', doctor, grants)
      return false
    }),
    prescriptions: dossier.prescriptions.filter((p) => {
      // Prescription-level grant always unlocks the specific prescription
      if (rxIds.has(p.id)) return true
      // Base grant → normal specialty filtering
      if (hasBase) return isRecordVisible(p, 'PRESCRIPTION', doctor, grants)
      return false
    }),
    diagnoses: dossier.diagnoses.filter((d) => {
      // Diagnosis-level grant always unlocks the specific diagnosis
      if (dxIds.has(d.id)) return true
      // Base grant → normal specialty filtering
      if (hasBase) return isRecordVisible(d, 'DIAGNOSIS', doctor, grants)
      return false
    }),
  }
}

// Can this doctor write a new record of `section` type, tagged with
// `category`? Writing follows the same rule as reading that section.
// Requires base access — item-only grants do not allow writing.
export function canWriteRecord(category, section, doctor, grants) {
  if (!hasBaseAccess(grants)) return false
  return isRecordVisible({ category }, section, doctor, grants)
}
