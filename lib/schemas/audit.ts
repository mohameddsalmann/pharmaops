import { z } from "zod";

export const actorTypeSchema = z.enum(["agent", "human", "system"]);
export type ActorType = z.infer<typeof actorTypeSchema>;

export const auditLogSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  actorType: actorTypeSchema,
  actorName: z.string(),
  action: z.string(),
  details: z.record(z.unknown()).default({}),
  confidence: z.number().nullable(),
  createdAt: z.string(),
});
export type AuditLog = z.infer<typeof auditLogSchema>;

export const auditFiltersSchema = z.object({
  caseId: z.string().optional(),
  actorType: z.string().optional(),
  action: z.string().optional(),
});
