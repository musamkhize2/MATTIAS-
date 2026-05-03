import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  description?: string;
  monthlyRevenue?: number;
  employeeCount?: number;
  foundedYear?: number;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyMemory {
  id: string;
  companyId: string;
  memoryType: "interaction_history" | "performance_notes" | "campaign_insights" | "customer_feedback" | "market_analysis" | "strategic_goals" | "custom_note";
  title: string;
  content: string;
  tags?: string[];
  importance?: "low" | "medium" | "high";
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyMetrics {
  id: string;
  companyId: string;
  totalCampaigns: number;
  activeCampaigns: number;
  totalAdSpend: number;
  totalConversions: number;
  averageROAS: number;
  leadGenerated: number;
  conversionRate: number;
  customerAcquisitionCost: number;
  monthOverMonthGrowth: number;
  yearOverYearGrowth: number;
}

interface CompanyContextType {
  // Current company
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;

  // Company list
  companies: Company[];
  setCompanies: (companies: Company[]) => void;

  // Memories
  memories: CompanyMemory[];
  setMemories: (memories: CompanyMemory[]) => void;
  addMemory: (memory: CompanyMemory) => void;
  removeMemory: (memoryId: string) => void;
  updateMemory: (memoryId: string, memory: Partial<CompanyMemory>) => void;

  // Metrics
  metrics: CompanyMetrics | null;
  setMetrics: (metrics: CompanyMetrics | null) => void;

  // Actions
  selectCompany: (company: Company) => void;
  createCompany: (company: Company) => void;
  updateCompany: (company: Company) => void;
  deleteCompany: (companyId: string) => void;
  clearCurrentCompany: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [memories, setMemories] = useState<CompanyMemory[]>([]);
  const [metrics, setMetrics] = useState<CompanyMetrics | null>(null);

  const selectCompany = useCallback((company: Company) => {
    setCurrentCompany(company);
    // In a real app, fetch memories and metrics for this company
  }, []);

  const createCompany = useCallback((company: Company) => {
    setCompanies((prev) => [company, ...prev]);
    setCurrentCompany(company);
  }, []);

  const updateCompany = useCallback((company: Company) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === company.id ? company : c))
    );
    if (currentCompany?.id === company.id) {
      setCurrentCompany(company);
    }
  }, [currentCompany]);

  const deleteCompany = useCallback((companyId: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== companyId));
    if (currentCompany?.id === companyId) {
      setCurrentCompany(null);
      setMemories([]);
      setMetrics(null);
    }
  }, [currentCompany]);

  const clearCurrentCompany = useCallback(() => {
    setCurrentCompany(null);
    setMemories([]);
    setMetrics(null);
  }, []);

  const addMemory = useCallback((memory: CompanyMemory) => {
    setMemories((prev) => [memory, ...prev]);
  }, []);

  const removeMemory = useCallback((memoryId: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
  }, []);

  const updateMemory = useCallback((memoryId: string, updates: Partial<CompanyMemory>) => {
    setMemories((prev) =>
      prev.map((m) =>
        m.id === memoryId ? { ...m, ...updates, updatedAt: new Date() } : m
      )
    );
  }, []);

  const value: CompanyContextType = {
    currentCompany,
    setCurrentCompany,
    companies,
    setCompanies,
    memories,
    setMemories,
    addMemory,
    removeMemory,
    updateMemory,
    metrics,
    setMetrics,
    selectCompany,
    createCompany,
    updateCompany,
    deleteCompany,
    clearCurrentCompany,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
