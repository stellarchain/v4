/**
 * Stellarchain Mobile Design System
 *
 * Centralized design tokens and class utilities for consistent styling
 * across all mobile views (Account, Markets, Asset, etc.)
 */

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
  // Backgrounds
  pageBg: '#f0f4f3',
  containerBg: '#e8edec',

  // Text
  textPrimary: 'text-slate-900',
  textSecondary: 'text-slate-700',
  textTertiary: 'text-slate-500',
  textMuted: 'text-slate-400',

  // Status
  success: 'text-emerald-500',
  successBg: 'bg-emerald-50',
  successIcon: 'text-emerald-600',

  error: 'text-red-500',
  errorBg: 'bg-red-50',
  errorIcon: 'text-red-600',

  info: 'text-blue-500',
  infoBg: 'bg-blue-50',
  infoIcon: 'text-blue-600',

  warning: 'text-orange-500',
  warningBg: 'bg-orange-50',
  warningIcon: 'text-orange-600',

  // Accent colors for icons/badges
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
} as const;

// =============================================================================
// CONTAINERS
// =============================================================================

export const containers = {
  // Main page wrapper
  page: 'w-full bg-[#f0f4f3] min-h-screen pb-24 font-sans',

  // Card container - DEFAULT for mobile (extended to edges with rounded corners)
  card: 'bg-[#e8edec] rounded-2xl overflow-hidden -mx-4',

  // Card container (compact - more margin from edges, for smaller cards)
  cardCompact: 'bg-[#e8edec] rounded-2xl overflow-hidden',

  // Card container (full width - edge to edge, no rounded corners)
  cardFullWidth: 'bg-[#e8edec] rounded-none overflow-hidden -mx-6',

  // Card with list dividers (default for lists)
  cardList: 'bg-[#e8edec] rounded-2xl overflow-hidden -mx-4 divide-y divide-slate-200/50',

  // Content section with padding
  section: 'px-4 py-4',
} as const;

// =============================================================================
// HEADERS
// =============================================================================

export const headers = {
  // Sticky header with blur
  sticky: 'sticky top-0 z-20 bg-[#f0f4f3]/90 backdrop-blur-md',

  // Page title
  pageTitle: 'text-2xl font-bold tracking-tight text-slate-900',

  // Section title
  sectionTitle: 'text-sm font-bold text-slate-900',

  // Section label (uppercase)
  sectionLabel: 'text-[10px] uppercase tracking-widest text-slate-400 font-bold',
} as const;

// =============================================================================
// DIVIDERS & BORDERS
// =============================================================================

export const dividers = {
  // List divider
  list: 'divide-y divide-slate-200/50',

  // Border bottom
  borderBottom: 'border-b border-slate-200/50',

  // Border for sections
  borderSection: 'border-b border-slate-100',
} as const;

// =============================================================================
// INTERACTIVE STATES
// =============================================================================

export const interactive = {
  // Clickable row
  row: 'active:bg-slate-200/50 transition-colors cursor-pointer',

  // Button base
  button: 'transition-colors',

  // Tab (inactive)
  tabInactive: 'text-slate-400 hover:text-slate-600',

  // Tab (active)
  tabActive: 'text-slate-900',
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Large number display
  displayLarge: 'text-4xl font-bold tracking-tight text-slate-900',

  // Medium number display
  displayMedium: 'text-2xl font-bold text-slate-900',

  // Body text
  body: 'text-sm text-slate-700',

  // Small text
  small: 'text-xs text-slate-500',

  // Tiny text (labels)
  tiny: 'text-[10px] text-slate-400',

  // Monospace (for numbers, addresses)
  mono: 'font-mono',

  // Tabular numbers (for aligned columns)
  tabular: 'tabular-nums',
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  // Page padding
  pagePadding: 'px-6',

  // Card padding
  cardPadding: 'px-4 py-4',

  // Row padding
  rowPadding: 'px-4 py-4',

  // Compact row padding
  rowPaddingCompact: 'px-4 py-3',

  // List item gap
  listGap: 'gap-3',

  // Section gap
  sectionGap: 'space-y-4',
} as const;

// =============================================================================
// ICONS & BADGES
// =============================================================================

export const icons = {
  // Icon container (circle)
  circle: 'rounded-full flex items-center justify-center',

  // Icon sizes
  sizeSm: 'w-8 h-8',
  sizeMd: 'w-10 h-10',
  sizeLg: 'w-12 h-12',
} as const;

// =============================================================================
// ORDERBOOK SPECIFIC
// =============================================================================

export const orderbook = {
  // Bid (buy) styles
  bidText: 'text-emerald-500',
  bidBg: 'bg-emerald-500/12',
  bidBgStrong: 'bg-emerald-500/15',

  // Ask (sell) styles
  askText: 'text-red-500',
  askBg: 'bg-red-500/12',
  askBgStrong: 'bg-red-500/15',

  // Row styling
  row: 'relative flex items-center justify-between px-3 py-[7px]',

  // Header styling
  header: 'flex items-center justify-between px-3 py-2 text-slate-400 font-semibold text-[9px] uppercase tracking-wide',
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Combine multiple class strings
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Get color classes for transaction type
 */
export function getTransactionColors(type: 'receive' | 'send' | 'swap' | 'contract') {
  switch (type) {
    case 'receive':
      return { bg: 'bg-emerald-50', text: 'text-emerald-600' };
    case 'send':
      return { bg: 'bg-red-50', text: 'text-red-600' };
    case 'swap':
      return { bg: 'bg-blue-50', text: 'text-blue-600' };
    case 'contract':
      return { bg: 'bg-purple-50', text: 'text-purple-600' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-600' };
  }
}

/**
 * Get asset icon color based on asset code
 */
export function getAssetColors(assetCode: string) {
  const bgColors = ['bg-blue-50', 'bg-purple-50', 'bg-emerald-50', 'bg-orange-50', 'bg-pink-50', 'bg-indigo-50', 'bg-violet-50'];
  const textColors = ['text-blue-600', 'text-purple-600', 'text-emerald-600', 'text-orange-600', 'text-pink-600', 'text-indigo-600', 'text-violet-600'];
  const colorIdx = assetCode.length % bgColors.length;
  return { bg: bgColors[colorIdx], text: textColors[colorIdx] };
}

// =============================================================================
// COMPONENT CLASS BUILDERS
// =============================================================================

/**
 * Build classes for a list row
 */
export function listRow(options?: { extended?: boolean }) {
  return cn(
    options?.extended ? 'px-4 py-4' : 'px-4 py-3',
    'active:bg-slate-200/50 transition-colors cursor-pointer'
  );
}

/**
 * Build classes for a card container
 * Default is extended (close to edges with rounded corners)
 */
export function card(options?: { compact?: boolean; fullWidth?: boolean; withDividers?: boolean }) {
  if (options?.fullWidth) return containers.cardFullWidth;
  if (options?.compact) return containers.cardCompact;
  if (options?.withDividers) return containers.cardList;
  return containers.card;
}

/**
 * Build classes for section header
 */
export function sectionHeader() {
  return 'text-[10px] uppercase tracking-widest text-slate-400 font-bold pb-2 border-b border-slate-200/50 mb-3';
}
