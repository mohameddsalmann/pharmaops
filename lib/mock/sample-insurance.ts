import type { InsuranceProfile } from "@/lib/schemas/case";

export const sampleInsuranceProfiles: Record<string, InsuranceProfile> = {
  standard: {
    planName: "BlueCross Demo Health",
    memberId: "MEM001234",
    groupNumber: "GRP-100",
    priorAuthRequiredMeds: ["Adderall", "Ozempic", "Lyrica"],
    quantityLimits: [
      { medication: "Atorvastatin", maxQuantity: 90 },
      { medication: "Lisinopril", maxQuantity: 30 },
      { medication: "Metformin", maxQuantity: 60 },
    ],
    active: true,
  },
  premium: {
    planName: "Aetna Demo Premium",
    memberId: "MEM005678",
    groupNumber: "GRP-200",
    priorAuthRequiredMeds: ["Ozempic", "Humira", "Remicade"],
    quantityLimits: [
      { medication: "Atorvastatin", maxQuantity: 90 },
      { medication: "Lisinopril", maxQuantity: 30 },
    ],
    active: true,
  },
  basic: {
    planName: "Cigna Demo Basic",
    memberId: "MEM009012",
    groupNumber: "GRP-300",
    priorAuthRequiredMeds: ["Adderall", "Vyvanse", "Lyrica", "Cymbalta"],
    quantityLimits: [
      { medication: "Metformin", maxQuantity: 60 },
      { medication: "Atorvastatin", maxQuantity: 30 },
    ],
    active: true,
  },
  no_insurance: {
    planName: "None",
    memberId: null,
    groupNumber: null,
    priorAuthRequiredMeds: [],
    quantityLimits: [],
    active: false,
  },
};

export const priorAuthMedications = [
  "Adderall",
  "Ozempic",
  "Lyrica",
  "Humira",
  "Remicade",
  "Vyvanse",
  "Cymbalta",
];

export const highReviewMedications = [
  "Warfarin",
  "Methotrexate",
  "Fentanyl",
  "Oxycodone",
  "Insulin",
];

export function isPriorAuthMed(medName: string | null): boolean {
  if (!medName) return false;
  return priorAuthMedications.some((m) =>
    medName.toLowerCase().includes(m.toLowerCase())
  );
}

export function isHighReviewMed(medName: string | null): boolean {
  if (!medName) return false;
  return highReviewMedications.some((m) =>
    medName.toLowerCase().includes(m.toLowerCase())
  );
}

export function checkQuantityLimit(
  medName: string | null,
  quantity: number | null,
  insurance: InsuranceProfile
): boolean {
  if (!medName || quantity === null) return false;
  const limit = insurance.quantityLimits.find((q) =>
    medName.toLowerCase().includes(q.medication.toLowerCase())
  );
  if (!limit) return false;
  return quantity > limit.maxQuantity;
}
