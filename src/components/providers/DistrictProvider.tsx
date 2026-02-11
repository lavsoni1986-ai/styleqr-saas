"use client";

import { createContext, useContext, ReactNode } from "react";

/**
 * District Context
 * 
 * Provides district branding and context to all components.
 * Used for custom domain white-label support.
 */
export interface DistrictContextType {
  district: {
    id: string;
    name: string;
    code: string;
    customDomain: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    isActive: boolean;
    subscriptionStatus: "INACTIVE" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";
  } | null;
}

const DistrictContext = createContext<DistrictContextType | undefined>(undefined);

export function DistrictProvider({
  children,
  district,
}: {
  children: ReactNode;
  district: DistrictContextType["district"];
}) {
  return (
    <DistrictContext.Provider value={{ district }}>
      {children}
    </DistrictContext.Provider>
  );
}

export function useDistrict() {
  const context = useContext(DistrictContext);
  if (context === undefined) {
    throw new Error("useDistrict must be used within DistrictProvider");
  }
  return context;
}

