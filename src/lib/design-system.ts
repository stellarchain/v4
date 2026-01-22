/**
 * Stellarchain Mobile Design System - Deep Ocean Theme
 *
 * Centralized design tokens and class utilities for consistent styling
 * across all mobile views (Account, Markets, Asset, Transaction, etc.)
 *
 * Theme: Deep Ocean
 * - Primary: Deep Sapphire Blue (#0F4C81)
 * - Background: Cool Slate Gray (slate-100)
 * - Cards: White with subtle shadows and borders
 * - Accents: Sky blue tints, Emerald for success, Red for errors
 */

// =============================================================================
// CORE COLORS (CSS values for inline styles)
// =============================================================================

export const coreColors = {
  // Primary brand color - Deep Sapphire Blue
  primary: '#0F4C81',

  // Backgrounds
  pageBg: '#F1F5F9',        // slate-100
  cardBg: '#FFFFFF',         // white
  cardInnerBg: '#F8FAFC',    // slate-50 (for nested sections)

  // Accent backgrounds
  skyTint: '#E0F2FE',        // sky-50 (for fee sections, highlights)
  skyTintStrong: '#BAE6FD',  // sky-200

  // Status colors
  success: '#10B981',        // emerald-500
  successLight: '#D1FAE5',   // emerald-100
  error: '#EF4444',          // red-500
  errorLight: '#FEE2E2',     // red-100

  // Border
  border: '#E2E8F0',         // slate-200
  borderLight: '#F1F5F9',    // slate-100
} as const;

// =============================================================================
// TAILWIND CLASS COLORS
// =============================================================================

export const colors = {
  // Primary (use inline style for exact color: style={{ color: coreColors.primary }})
  primary: 'text-[#0F4C81]',
  primaryBg: 'bg-[#0F4C81]',

  // Backgrounds
  pageBg: 'bg-slate-100',
  cardBg: 'bg-white',
  cardInnerBg: 'bg-slate-50',

  // Accent backgrounds
  skyTint: 'bg-sky-50',
  skyTintHalf: 'bg-sky-50/50',

  // Text hierarchy
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
  // Main page wrapper - Deep Ocean style
  page: 'w-full bg-slate-100 min-h-screen pb-24 font-sans',

  // Card container - Premium white with soft shadow (no border)
  card: 'bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden',

  // Card extended to edges (for full-width lists)
  cardEdge: 'bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden -mx-4',

  // Card container (compact - smaller, no negative margin)
  cardCompact: 'bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden',

  // Card container (full width - edge to edge, no rounded corners)
  cardFullWidth: 'bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden -mx-6',

  // Card with list dividers (default for lists)
  cardList: 'bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden divide-y divide-slate-100',

  // Card with subtle border (when you need more definition)
  cardBordered: 'bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden',

  // Inner section (nested inside cards) - softer styling
  innerSection: 'bg-slate-50/70 rounded-xl p-3',

  // Content section with padding
  section: 'px-4 py-4',

  // Sky tint footer (for fees, totals)
  skyFooter: 'bg-sky-50/50 border-t border-slate-100',
} as const;

// =============================================================================
// HEADERS
// =============================================================================

export const headers = {
  // Sticky header with blur - Deep Ocean style
  sticky: 'sticky top-0 z-10 bg-slate-100/95 backdrop-blur-md border-b border-slate-200',

  // Page title (use with inline style for primary color)
  pageTitle: 'text-xl font-bold tracking-tight',
  pageTitleColor: 'text-[#0F4C81]',

  // Section title
  sectionTitle: 'text-sm font-bold text-slate-900',
  sectionTitlePrimary: 'text-sm font-bold text-[#0F4C81]',

  // Section label (uppercase)
  sectionLabel: 'text-[10px] uppercase tracking-widest text-slate-400 font-bold',
} as const;

// =============================================================================
// DIVIDERS & BORDERS
// =============================================================================

export const dividers = {
  // List divider
  list: 'divide-y divide-slate-100',

  // Border bottom
  borderBottom: 'border-b border-slate-200',
  borderBottomLight: 'border-b border-slate-100',

  // Border for sections
  borderSection: 'border-b border-slate-100',

  // Dashed border (for connectors)
  dashed: 'border-t-2 border-dashed border-slate-200',
} as const;

// =============================================================================
// INTERACTIVE STATES
// =============================================================================

export const interactive = {
  // Clickable row
  row: 'active:bg-slate-50 transition-colors cursor-pointer',

  // Button base
  button: 'transition-colors',

  // Primary button
  buttonPrimary: 'bg-[#0F4C81] text-white font-bold rounded-lg hover:opacity-90 transition-colors',

  // Secondary button (white with border)
  buttonSecondary: 'bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm',

  // Tab (inactive)
  tabInactive: 'text-slate-500 hover:text-[#0F4C81] border-transparent',

  // Tab (active)
  tabActive: 'text-[#0F4C81] border-[#0F4C81]',

  // Link with primary color
  link: 'text-[#0F4C81] hover:opacity-80 transition-opacity',
} as const;

// =============================================================================
// BADGES & PILLS
// =============================================================================

export const badges = {
  // Primary badge (filled)
  primary: 'bg-[#0F4C81] text-white text-[10px] font-bold px-2 py-0.5 rounded',

  // Secondary badge (outline)
  secondary: 'bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded',

  // Success badge
  success: 'bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-semibold px-2.5 py-0.5 rounded-full',

  // Error badge
  error: 'bg-red-50 text-red-600 border border-red-100 text-xs font-semibold px-2.5 py-0.5 rounded-full',

  // Count badge (for tabs)
  count: 'bg-slate-100 text-slate-500 text-xs font-semibold py-0.5 px-2 rounded-full',
  countActive: 'bg-slate-100 text-slate-600 text-xs font-semibold py-0.5 px-2 rounded-full',
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Large number display
  displayLarge: 'text-4xl font-bold tracking-tight text-slate-900',

  // Medium number display
  displayMedium: 'text-2xl font-bold text-slate-900',

  // Large with primary color
  displayPrimary: 'text-lg font-bold text-[#0F4C81]',

  // Body text
  body: 'text-sm text-slate-700',

  // Small text
  small: 'text-xs text-slate-500',

  // Tiny text (labels)
  tiny: 'text-[10px] text-slate-400',

  // Uppercase label
  label: 'text-[10px] font-bold uppercase tracking-wider text-slate-400',

  // Monospace (for numbers, addresses)
  mono: 'font-mono',

  // Tabular numbers (for aligned columns)
  tabular: 'tabular-nums',

  // Amount styles
  amountPositive: 'text-emerald-500 font-bold',
  amountNegative: 'text-red-500 font-bold',
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  // Page padding
  pagePadding: 'px-4',
  pagePaddingLarge: 'px-6',

  // Card padding
  cardPadding: 'p-4',
  cardPaddingLarge: 'p-5',

  // Row padding
  rowPadding: 'px-4 py-4',

  // Compact row padding
  rowPaddingCompact: 'px-4 py-3',

  // List item gap
  listGap: 'gap-3',

  // Section gap
  sectionGap: 'space-y-4',

  // Card margin bottom
  cardMargin: 'mb-4',
} as const;

// =============================================================================
// ICONS & BADGES
// =============================================================================

export const icons = {
  // Icon container (rounded square - Deep Ocean style)
  container: 'rounded-xl flex items-center justify-center shadow-sm',

  // Icon container (circle)
  circle: 'rounded-full flex items-center justify-center',

  // Icon sizes
  sizeSm: 'w-8 h-8',
  sizeMd: 'w-10 h-10',
  sizeLg: 'w-12 h-12',

  // Icon backgrounds
  bgSuccess: 'bg-emerald-50 text-emerald-500',
  bgError: 'bg-red-50 text-red-500',
  bgInfo: 'bg-blue-50 text-blue-500',
  bgPrimary: 'bg-sky-50 text-[#0F4C81]',
  bgWarning: 'bg-orange-50 text-orange-500',
  bgPurple: 'bg-purple-50 text-purple-500',
} as const;

// =============================================================================
// TABS NAVIGATION
// =============================================================================

export const tabs = {
  // Container
  container: 'border-b border-slate-200',

  // Nav wrapper
  nav: 'flex gap-6 overflow-x-auto',

  // Tab button base
  tab: 'whitespace-nowrap pb-3 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors',

  // Active tab
  tabActive: 'border-[#0F4C81] text-[#0F4C81]',

  // Inactive tab
  tabInactive: 'border-transparent text-slate-500 hover:text-[#0F4C81]',
} as const;

// =============================================================================
// FORM INPUTS
// =============================================================================

export const inputs = {
  // Search input
  search: 'w-full pl-10 pr-3 py-2 bg-slate-200 border-none rounded-full text-sm text-slate-700 placeholder-slate-500 focus:ring-2 focus:ring-[#0F4C81] focus:bg-white transition-all',

  // Standard input
  input: 'w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-[#0F4C81] focus:border-transparent transition-all',

  // Select dropdown
  select: 'w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-[#0F4C81] focus:border-transparent transition-all appearance-none',
} as const;

// =============================================================================
// PAGINATION
// =============================================================================

export const pagination = {
  // Container
  container: 'flex items-center justify-center gap-1 mt-4 pt-3',

  // Nav button (prev/next)
  navButton: 'w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors',

  // Page button (inactive)
  pageButton: 'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors',

  // Page button (active) - use with inline style for bg color
  pageButtonActive: 'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm',
} as const;

// =============================================================================
// TRANSFER FLOW CARD (for transactions)
// =============================================================================

export const transferFlow = {
  // Card wrapper
  card: 'bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden',

  // FROM section
  fromSection: 'p-5 pb-8 relative bg-gradient-to-br from-slate-50 to-white',

  // TO section
  toSection: 'p-5 pt-8 bg-white',

  // Connector circle
  connector: 'w-8 h-8 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center',

  // Dashed line
  dashedLine: 'border-t-2 border-dashed border-slate-200',

  // Fee footer
  feeFooter: 'flex justify-between items-center px-5 py-3 bg-sky-50/50 border-t border-slate-100',
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
 * Get the primary color value for inline styles
 */
export function getPrimaryColor(): string {
  return coreColors.primary;
}

/**
 * Get color classes for transaction type
 */
export function getTransactionColors(type: 'receive' | 'send' | 'swap' | 'contract') {
  switch (type) {
    case 'receive':
      return { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-500' };
    case 'send':
      return { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-500' };
    case 'swap':
      return { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-500' };
    case 'contract':
      return { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'text-purple-500' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-600', icon: 'text-slate-500' };
  }
}

/**
 * Get color classes for operation type
 */
export function getOperationColors(type: string) {
  if (type.includes('payment') || type === 'create_account') {
    return { bg: 'bg-emerald-50', text: 'text-emerald-500' };
  }
  if (type.includes('path_payment')) {
    return { bg: 'bg-blue-50', text: 'text-blue-500' };
  }
  if (type.includes('offer')) {
    return { bg: 'bg-purple-50', text: 'text-purple-500' };
  }
  if (type === 'invoke_host_function') {
    return { bg: 'bg-orange-50', text: 'text-orange-500' };
  }
  return { bg: 'bg-slate-100', text: 'text-slate-500' };
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
    'active:bg-slate-50 transition-colors cursor-pointer'
  );
}

/**
 * Build classes for a card container
 * Default is white with shadow (Deep Ocean style)
 */
export function card(options?: { compact?: boolean; fullWidth?: boolean; withDividers?: boolean; edge?: boolean }) {
  if (options?.fullWidth) return containers.cardFullWidth;
  if (options?.edge) return containers.cardEdge;
  if (options?.compact) return containers.cardCompact;
  if (options?.withDividers) return containers.cardList;
  return containers.card;
}

/**
 * Build classes for section header
 */
export function sectionHeader() {
  return 'text-[10px] uppercase tracking-widest text-slate-400 font-bold pb-2 border-b border-slate-100 mb-3';
}

/**
 * Build tab classes based on active state
 */
export function tabClasses(isActive: boolean) {
  return cn(
    tabs.tab,
    isActive ? tabs.tabActive : tabs.tabInactive
  );
}

/**
 * Build pagination page button classes
 */
export function pageButtonClasses(isActive: boolean) {
  return isActive ? pagination.pageButtonActive : pagination.pageButton;
}
