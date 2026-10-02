export interface InvestigationFilters {
  ledgerFrom: string;
  ledgerTo: string;
  dateFrom: string;
  dateTo: string;
  operationType: string;
  depth: string;
  asset: string;
  minAssetAmount: string;
}

export type InvestigationMode = 'basic' | 'advanced';

export type InvestigationErrors = Partial<Record<'query' | keyof InvestigationFilters, string>>;
