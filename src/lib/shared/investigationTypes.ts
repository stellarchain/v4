export interface InvestigationFilters {
  ledgerFrom: string;
  ledgerTo: string;
  operationType: string;
}

export type InvestigationErrors = Partial<Record<'query' | keyof InvestigationFilters, string>>;
