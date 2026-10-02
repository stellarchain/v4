export interface InvestigationFilters {
  ledgerFrom: string;
  ledgerTo: string;
  dateFrom: string;
  dateTo: string;
  operationType: string;
  asset: string;
  minAssetAmount: string;
}

export type InvestigationErrors = Partial<Record<'query' | keyof InvestigationFilters, string>>;
