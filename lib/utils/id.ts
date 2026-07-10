import { randomUUID } from "crypto";

export function generateId(): string {
  try {
    return randomUUID();
  } catch {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function caseNumberFromIndex(index: number): string {
  return `PG-${String(index + 1).padStart(4, "0")}`;
}
