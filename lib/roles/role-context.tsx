"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type UserRole = "admin" | "pharmacist_reviewer" | "qa_analyst";

export interface RoleInfo {
  role: UserRole;
  label: string;
  canReview: boolean;
  canApprove: boolean;
  canReject: boolean;
  canRequestInfo: boolean;
  canSendToPriorAuth: boolean;
  canViewAudit: boolean;
  canResetDemo: boolean;
}

const roleConfig: Record<UserRole, Omit<RoleInfo, "role">> = {
  admin: {
    label: "Admin",
    canReview: false,
    canApprove: false,
    canReject: false,
    canRequestInfo: false,
    canSendToPriorAuth: false,
    canViewAudit: true,
    canResetDemo: true,
  },
  pharmacist_reviewer: {
    label: "Pharmacist Reviewer",
    canReview: true,
    canApprove: true,
    canReject: true,
    canRequestInfo: true,
    canSendToPriorAuth: true,
    canViewAudit: true,
    canResetDemo: false,
  },
  qa_analyst: {
    label: "QA Analyst",
    canReview: false,
    canApprove: false,
    canReject: false,
    canRequestInfo: false,
    canSendToPriorAuth: false,
    canViewAudit: true,
    canResetDemo: false,
  },
};

interface RoleContextValue {
  role: UserRole;
  roleInfo: RoleInfo;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("pharmacist_reviewer");
  const roleInfo: RoleInfo = { role, ...roleConfig[role] };
  return (
    <RoleContext.Provider value={{ role, roleInfo, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
