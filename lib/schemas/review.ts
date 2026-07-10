import { z } from "zod";

export const reviewActionTypeSchema = z.enum([
  "approve",
  "reject",
  "request_info",
  "send_to_prior_auth",
  "assign_to_pharmacist",
]);
export type ReviewActionType = z.infer<typeof reviewActionTypeSchema>;

export const reviewActionSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  reviewerName: z.string(),
  action: reviewActionTypeSchema,
  note: z.string(),
  createdAt: z.string(),
});
export type ReviewAction = z.infer<typeof reviewActionSchema>;

export const createReviewBodySchema = z.object({
  action: reviewActionTypeSchema,
  reviewerName: z.string().min(1),
  note: z.string().default(""),
});
