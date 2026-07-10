import type { PatientProfile, InsuranceProfile, SourceType } from "@/lib/schemas/case";
import { samplePatientProfiles } from "./sample-profiles";
import { sampleInsuranceProfiles } from "./sample-insurance";

export interface SampleCase {
  id: string;
  label: string;
  description: string;
  expectedDecision: string;
  sourceType: SourceType;
  prescriptionText: string;
  patientProfile: PatientProfile;
  insuranceProfile: InsuranceProfile;
}

export const sampleCases: SampleCase[] = [
  {
    id: "case-01-clean-approved",
    label: "Clean Approved Case",
    description: "All fields present, high confidence, no prior auth needed.",
    expectedDecision: "approved",
    sourceType: "erx",
    prescriptionText: `Patient: John Doe
DOB: 1985-03-15
Medication: Atorvastatin
Strength: 20 mg
Sig: Take 1 tablet by mouth once daily
Qty: 30
Refills: 3
Prescriber: Dr. Emily Carter, MD
Pharmacy Notes: New prescription, eRx received`,
    patientProfile: samplePatientProfiles.john_doe,
    insuranceProfile: sampleInsuranceProfiles.standard,
  },
  {
    id: "case-02-dob-mismatch",
    label: "DOB Mismatch",
    description: "Prescription DOB differs from patient profile DOB.",
    expectedDecision: "needs_human_review",
    sourceType: "fax",
    prescriptionText: `Patient: Jane Smith
DOB: 1990-07-25
Medication: Lisinopril
Strength: 10 mg
Sig: Take 1 tablet by mouth once daily
Qty: 30
Refills: 1
Prescriber: Dr. Robert Lee, MD
Pharmacy Notes: Fax received, legible`,
    patientProfile: samplePatientProfiles.jane_smith,
    insuranceProfile: sampleInsuranceProfiles.premium,
  },
  {
    id: "case-03-missing-directions",
    label: "Missing Dosage Directions",
    description: "Medication exists but directions/sig are missing.",
    expectedDecision: "missing_information",
    sourceType: "provider_portal",
    prescriptionText: `Patient: Robert Johnson
DOB: 1978-11-30
Medication: Metformin
Strength: 500 mg
Sig:
Qty: 60
Refills: 2
Prescriber: Dr. Sarah Chen, MD
Pharmacy Notes: Portal submission`,
    patientProfile: samplePatientProfiles.robert_johnson,
    insuranceProfile: sampleInsuranceProfiles.basic,
  },
  {
    id: "case-04-prior-auth",
    label: "Prior Authorization Required",
    description: "Medication appears in mock prior auth list.",
    expectedDecision: "prior_authorization_required",
    sourceType: "erx",
    prescriptionText: `Patient: Mary Williams
DOB: 1995-04-10
Medication: Ozempic
Strength: 0.5 mg
Sig: Inject subcutaneously once weekly
Qty: 4
Refills: 5
Prescriber: Dr. James Wilson, MD
Pharmacy Notes: New eRx for Ozempic`,
    patientProfile: samplePatientProfiles.mary_williams,
    insuranceProfile: sampleInsuranceProfiles.standard,
  },
  {
    id: "case-05-low-confidence-fax",
    label: "Low Confidence Fax",
    description: "Messy fax prescription with low extraction confidence.",
    expectedDecision: "needs_human_review",
    sourceType: "fax",
    prescriptionText: `Pt: James Brwn (illegible)
DOB: 19?? (smudged)
Rx: possibly Lisinopril or Lsinopril
Str: 10mg? or 20mg?
Sig: hard to read... take once daily?
Qty: 30 maybe
Refills: unclear
Prescriber: Dr. ??? (fax degraded)
Notes: Fax quality very poor, multiple fields illegible`,
    patientProfile: samplePatientProfiles.james_brown,
    insuranceProfile: sampleInsuranceProfiles.premium,
  },
  {
    id: "case-06-missing-prescriber",
    label: "Missing Prescriber",
    description: "Prescriber name is missing from the prescription.",
    expectedDecision: "needs_human_review",
    sourceType: "provider_portal",
    prescriptionText: `Patient: Patricia Davis
DOB: 1988-12-05
Medication: Atorvastatin
Strength: 40 mg
Sig: Take 1 tablet by mouth at bedtime
Qty: 30
Refills: 3
Prescriber:
Pharmacy Notes: Portal submission, prescriber field blank`,
    patientProfile: samplePatientProfiles.patricia_davis,
    insuranceProfile: sampleInsuranceProfiles.basic,
  },
  {
    id: "case-07-quantity-limit",
    label: "Quantity Limit Issue",
    description: "Quantity exceeds mock insurance plan limit.",
    expectedDecision: "prior_authorization_required",
    sourceType: "erx",
    prescriptionText: `Patient: Michael Miller
DOB: 1975-06-25
Medication: Atorvastatin
Strength: 80 mg
Sig: Take 1 tablet by mouth once daily
Qty: 120
Refills: 3
Prescriber: Dr. Lisa Anderson, MD
Pharmacy Notes: High quantity prescribed`,
    patientProfile: samplePatientProfiles.michael_miller,
    insuranceProfile: sampleInsuranceProfiles.basic,
  },
  {
    id: "case-08-high-review-med",
    label: "High Review Medication Rule",
    description: "Medication flagged for pharmacist review per safety policy.",
    expectedDecision: "needs_human_review",
    sourceType: "fax",
    prescriptionText: `Patient: Linda Wilson
DOB: 1992-02-14
Medication: Warfarin
Strength: 5 mg
Sig: Take 1 tablet by mouth once daily as directed
Qty: 30
Refills: 1
Prescriber: Dr. Kevin Martinez, MD
Pharmacy Notes: Warfarin requires pharmacist review per safety policy`,
    patientProfile: samplePatientProfiles.linda_wilson,
    insuranceProfile: sampleInsuranceProfiles.standard,
  },
];

export function getSampleCaseTemplate(id: string): SampleCase | undefined {
  return sampleCases.find((c) => c.id === id);
}

export const sampleCaseButtons = [
  { id: "case-01-clean-approved", label: "Load Clean Case" },
  { id: "case-02-dob-mismatch", label: "Load DOB Mismatch" },
  { id: "case-04-prior-auth", label: "Load Prior Auth Case" },
  { id: "case-05-low-confidence-fax", label: "Load Low Confidence Fax" },
  { id: "case-03-missing-directions", label: "Load Missing Directions" },
];

export const goldenDemoCaseIds = [
  "case-01-clean-approved",
  "case-02-dob-mismatch",
  "case-04-prior-auth",
  "case-06-missing-prescriber",
];
