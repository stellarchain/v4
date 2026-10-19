export const PARTNER_CATEGORIES = {
  wallets: 'Wallets',
  exchanges: 'Exchanges',
  ramps: 'On/off ramps',
  infrastructure: 'Infrastructure',
  'developer-tools': 'Developer tools',
  advertising: 'Advertising',
} as const;

export type PartnerCategory = keyof typeof PARTNER_CATEGORIES;
export type PartnerRelationship =
  | 'directory'
  | 'affiliate'
  | 'sponsored'
  | 'integration';

export interface PartnerEntry {
  id: string;
  name: string;
  description: string;
  category: PartnerCategory;
  status: 'draft' | 'active' | 'inactive';
  relationship: PartnerRelationship;
  position: number;
  websiteUrl: string;
  trackingUrl: string | null;
  regionNotes: string;
  networkNotes: string;
}

export interface PartnerCatalogResponse {
  categories: Record<PartnerCategory, string>;
  entries: PartnerEntry[];
  revision?: string;
}

export const RELATIONSHIP_LABELS: Record<PartnerRelationship, string> = {
  directory: 'Directory listing',
  affiliate: 'Affiliate link',
  sponsored: 'Sponsored',
  integration: 'Integrated provider',
};
