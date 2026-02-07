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
  primary: 'var(--primary-blue)',

  // Backgrounds - Uses CSS variables for theme support
  pageBg: 'var(--bg-primary)',
  cardBg: 'var(--bg-secondary)',
  cardInnerBg: 'var(--bg-tertiary)',

  // Accent backgrounds
  skyTint: 'var(--info-muted)',
  skyTintStrong: 'var(--info-muted)',

  // Status colors
  success: 'var(--success)',
  successLight: 'var(--success-muted)',
  error: 'var(--error)',
  errorLight: 'var(--error-muted)',

  // Border
  border: 'var(--border-default)',
  borderLight: 'var(--border-subtle)',
} as const;

// =============================================================================
// TAILWIND CLASS COLORS
// =============================================================================

export const colors = {
  // Primary (uses CSS variable for theme support)
  primary: 'text-[var(--info)]',
  primaryBg: 'bg-[var(--info)]',

  // Backgrounds - Uses CSS variables for theme support
  pageBg: 'bg-[var(--bg-primary)]',
  cardBg: 'bg-[var(--bg-secondary)]',
  cardInnerBg: 'bg-[var(--bg-tertiary)]',

  // Accent backgrounds
  skyTint: 'bg-[var(--info-muted)]',
  skyTintHalf: 'bg-[var(--info-muted)]/50',

  // Text hierarchy - Uses CSS variables for theme support
  textPrimary: 'text-[var(--text-primary)]',
  textSecondary: 'text-[var(--text-secondary)]',
  textTertiary: 'text-[var(--text-tertiary)]',
  textMuted: 'text-[var(--text-muted)]',

  // Status - Uses CSS variables for theme support
  success: 'text-[var(--success)]',
  successBg: 'bg-[var(--success-muted)]',
  successIcon: 'text-[var(--success)]',

  error: 'text-[var(--error)]',
  errorBg: 'bg-[var(--error-muted)]',
  errorIcon: 'text-[var(--error)]',

  info: 'text-[var(--info)]',
  infoBg: 'bg-[var(--info-muted)]',
  infoIcon: 'text-[var(--info)]',

  warning: 'text-[var(--warning)]',
  warningBg: 'bg-[var(--warning-muted)]',
  warningIcon: 'text-[var(--warning)]',

  // Accent colors for icons/badges - Theme-aware
  purple: { bg: 'bg-[var(--purple-muted)]', text: 'text-[var(--purple)]' },
  indigo: { bg: 'bg-[var(--indigo-muted)]', text: 'text-[var(--indigo)]' },
  pink: { bg: 'bg-[var(--pink-muted)]', text: 'text-[var(--pink)]' },
  violet: { bg: 'bg-[var(--violet-muted)]', text: 'text-[var(--violet)]' },
} as const;

// =============================================================================
// CONTAINERS
// =============================================================================

export const containers = {
  // Main page wrapper - Theme-aware
  page: 'w-full bg-[var(--bg-primary)] min-h-screen pb-24 font-sans',

  // Card container - Theme-aware with shadow
  card: 'bg-[var(--bg-secondary)] rounded-2xl shadow-[var(--shadow-md)] border border-[var(--border-subtle)] overflow-hidden',

  // Card extended to edges (for full-width lists)
  cardEdge: 'bg-[var(--bg-secondary)] rounded-2xl shadow-[var(--shadow-md)] border border-[var(--border-subtle)] overflow-hidden -mx-4',

  // Card container (compact - smaller, no negative margin)
  cardCompact: 'bg-[var(--bg-secondary)] rounded-2xl shadow-[var(--shadow-md)] border border-[var(--border-subtle)] overflow-hidden',

  // Card container (full width - edge to edge, no rounded corners)
  cardFullWidth: 'bg-[var(--bg-secondary)] shadow-[var(--shadow-md)] border-y border-[var(--border-subtle)] overflow-hidden -mx-4',

  // Card with list dividers (default for lists)
  cardList: 'bg-[var(--bg-secondary)] rounded-2xl shadow-[var(--shadow-md)] border border-[var(--border-subtle)] overflow-hidden divide-y divide-[var(--border-subtle)]',

  // Card with subtle border (when you need more definition)
  cardBordered: 'bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden',

  // Inner section (nested inside cards) - softer styling
  innerSection: 'bg-[var(--bg-tertiary)] rounded-xl p-3',

  // Content section with padding
  section: 'px-4 py-4',

  // Sky tint footer (for fees, totals)
  skyFooter: 'bg-[var(--info-muted)]/50 border-t border-[var(--border-subtle)]',
} as const;

// =============================================================================
// HEADERS
// =============================================================================

export const headers = {
  // Sticky header with blur - Theme-aware
  sticky: 'sticky top-0 z-10 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-subtle)]',

  // Page title
  pageTitle: 'text-xl font-bold tracking-tight text-[var(--text-primary)]',
  pageTitleColor: 'text-[var(--info)]',

  // Section title
  sectionTitle: 'text-sm font-bold text-[var(--text-primary)]',
  sectionTitlePrimary: 'text-sm font-bold text-[var(--info)]',

  // Section label (uppercase)
  sectionLabel: 'text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold',
} as const;

// =============================================================================
// DIVIDERS & BORDERS
// =============================================================================

export const dividers = {
  // List divider
  list: 'divide-y divide-[var(--border-subtle)]',

  // Border bottom
  borderBottom: 'border-b border-[var(--border-default)]',
  borderBottomLight: 'border-b border-[var(--border-subtle)]',

  // Border for sections
  borderSection: 'border-b border-[var(--border-subtle)]',

  // Dashed border (for connectors)
  dashed: 'border-t-2 border-dashed border-[var(--border-default)]',
} as const;

// =============================================================================
// INTERACTIVE STATES
// =============================================================================

export const interactive = {
  // Clickable row
  row: 'active:bg-[var(--bg-tertiary)] transition-colors cursor-pointer',

  // Button base
  button: 'transition-colors',

  // Primary button
  buttonPrimary: 'bg-[var(--info)] text-white font-bold rounded-lg hover:opacity-90 transition-colors',

  // Secondary button - Theme-aware
  buttonSecondary: 'bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] font-semibold rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors shadow-sm',

  // Tab (inactive)
  tabInactive: 'text-[var(--text-tertiary)] hover:text-[var(--info)] border-transparent',

  // Tab (active)
  tabActive: 'text-[var(--info)] border-[var(--info)]',

  // Link with primary color
  link: 'text-[var(--info)] hover:opacity-80 transition-opacity',
} as const;

// =============================================================================
// BADGES & PILLS
// =============================================================================

export const badges = {
  // Primary badge (filled)
  primary: 'bg-[var(--primary)] text-[var(--bg-primary)] text-[10px] font-bold px-2 py-0.5 rounded',

  // Secondary badge (outline)
  secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[10px] font-bold px-2 py-0.5 rounded',

  // Success badge
  success: 'bg-[var(--success-muted)] text-[var(--success)] border border-[var(--success)]/30 text-xs font-semibold px-2.5 py-0.5 rounded-full',

  // Error badge
  error: 'bg-[var(--error-muted)] text-[var(--error)] border border-[var(--error)]/30 text-xs font-semibold px-2.5 py-0.5 rounded-full',

  // Count badge (for tabs)
  count: 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] text-xs font-semibold py-0.5 px-2 rounded-full',
  countActive: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs font-semibold py-0.5 px-2 rounded-full',
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Large number display
  displayLarge: 'text-4xl font-bold tracking-tight text-[var(--text-primary)]',

  // Medium number display
  displayMedium: 'text-2xl font-bold text-[var(--text-primary)]',

  // Large with primary color
  displayPrimary: 'text-lg font-bold text-[var(--info)]',

  // Body text
  body: 'text-sm text-[var(--text-secondary)]',

  // Small text
  small: 'text-xs text-[var(--text-tertiary)]',

  // Tiny text (labels)
  tiny: 'text-[10px] text-[var(--text-muted)]',

  // Uppercase label
  label: 'text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]',

  // Monospace (for numbers, addresses)
  mono: 'font-mono',

  // Tabular numbers (for aligned columns)
  tabular: 'tabular-nums',

  // Amount styles
  amountPositive: 'text-[var(--success)] font-bold',
  amountNegative: 'text-[var(--error)] font-bold',
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  // Page padding
  pagePadding: 'px-4',
  pagePaddingLarge: 'px-4',

  // Card padding
  cardPadding: 'p-4',
  cardPaddingLarge: 'p-4',

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

  // Icon backgrounds - Theme-aware
  bgSuccess: 'bg-[var(--success-muted)] text-[var(--success)]',
  bgError: 'bg-[var(--error-muted)] text-[var(--error)]',
  bgInfo: 'bg-[var(--info-muted)] text-[var(--info)]',
  bgPrimary: 'bg-[var(--info-muted)] text-[var(--info)]',
  bgWarning: 'bg-[var(--warning-muted)] text-[var(--warning)]',
  bgPurple: 'bg-[var(--purple-muted)] text-[var(--purple)]',
} as const;

// =============================================================================
// TABS NAVIGATION
// =============================================================================

export const tabs = {
  // Container
  container: 'border-b border-[var(--border-subtle)]',

  // Nav wrapper
  nav: 'flex gap-4 overflow-x-auto',

  // Tab button base
  tab: 'whitespace-nowrap pb-3 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors',

  // Active tab
  tabActive: 'border-[var(--text-primary)] text-[var(--text-primary)]',

  // Inactive tab
  tabInactive: 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
} as const;

// =============================================================================
// FORM INPUTS
// =============================================================================

export const inputs = {
  // Search input
  search: 'w-full pl-4 pr-3 py-2 bg-[var(--bg-tertiary)] border-none rounded-full text-sm text-[var(--text-secondary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)] focus:bg-[var(--bg-secondary)] transition-colors',

  // Standard input
  input: 'w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-secondary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-colors',

  // Select dropdown
  select: 'w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all appearance-none',
} as const;

// =============================================================================
// PAGINATION
// =============================================================================

export const pagination = {
  // Container
  container: 'flex items-center justify-center gap-1 mt-4 pt-3',

  // Nav button (prev/next)
  navButton: 'w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] shadow-sm border border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors',

  // Page button (inactive)
  pageButton: 'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] transition-colors',

  // Page button (active) - use with inline style for bg color
  pageButtonActive: 'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm',
} as const;

// =============================================================================
// TRANSFER FLOW CARD (for transactions)
// =============================================================================

export const transferFlow = {
  // Card wrapper
  card: 'bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden',

  // FROM section
  fromSection: 'p-4 pb-4 relative bg-[var(--bg-tertiary)]',

  // TO section
  toSection: 'p-4 pt-4 bg-[var(--bg-secondary)]',

  // Connector circle
  connector: 'w-8 h-8 rounded-full bg-[var(--bg-secondary)] shadow-md border border-[var(--border-subtle)] flex items-center justify-center',

  // Dashed line
  dashedLine: 'border-t-2 border-dashed border-[var(--border-default)]',

  // Fee footer
  feeFooter: 'flex justify-between items-center px-4 py-3 bg-[var(--info-muted)]/50 border-t border-[var(--border-subtle)]',
} as const;

// =============================================================================
// ORDERBOOK SPECIFIC
// =============================================================================

export const orderbook = {
  // Bid (buy) styles
  bidText: 'text-[var(--success)]',
  bidBg: 'bg-[var(--success)]/12',
  bidBgStrong: 'bg-[var(--success)]/15',

  // Ask (sell) styles
  askText: 'text-[var(--error)]',
  askBg: 'bg-[var(--error)]/12',
  askBgStrong: 'bg-[var(--error)]/15',

  // Row styling
  row: 'relative flex items-center justify-between px-3 py-[7px]',

  // Header styling
  header: 'flex items-center justify-between px-3 py-2 text-[var(--text-muted)] font-semibold text-[9px] uppercase tracking-wide',
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
      return { bg: 'bg-[var(--success-muted)]', text: 'text-[var(--success)]', icon: 'text-[var(--success)]' };
    case 'send':
      return { bg: 'bg-[var(--error-muted)]', text: 'text-[var(--error)]', icon: 'text-[var(--error)]' };
    case 'swap':
      return { bg: 'bg-[var(--info-muted)]', text: 'text-[var(--info)]', icon: 'text-[var(--info)]' };
    case 'contract':
      return { bg: 'bg-[var(--purple-muted)]', text: 'text-[var(--purple)]', icon: 'text-[var(--purple)]' };
    default:
      return { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-secondary)]', icon: 'text-[var(--text-tertiary)]' };
  }
}

/**
 * Get color classes for operation type
 */
export function getOperationColors(type: string) {
  if (type.includes('payment') || type === 'create_account') {
    return { bg: 'bg-[var(--success-muted)]', text: 'text-[var(--success)]' };
  }
  if (type.includes('path_payment')) {
    return { bg: 'bg-[var(--info-muted)]', text: 'text-[var(--info)]' };
  }
  if (type.includes('offer')) {
    return { bg: 'bg-[var(--purple-muted)]', text: 'text-[var(--purple)]' };
  }
  if (type === 'invoke_host_function') {
    return { bg: 'bg-[var(--warning-muted)]', text: 'text-[var(--warning)]' };
  }
  return { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-tertiary)]' };
}

/**
 * Get asset icon color based on asset code
 * Uses CSS variables for theme support
 */
export function getAssetColors(assetCode: string) {
  const colorOptions = [
    { bg: 'bg-[var(--info-muted)]', text: 'text-[var(--info)]' },
    { bg: 'bg-[var(--purple-muted)]', text: 'text-[var(--purple)]' },
    { bg: 'bg-[var(--success-muted)]', text: 'text-[var(--success)]' },
    { bg: 'bg-[var(--warning-muted)]', text: 'text-[var(--warning)]' },
    { bg: 'bg-[var(--pink-muted)]', text: 'text-[var(--pink)]' },
    { bg: 'bg-[var(--indigo-muted)]', text: 'text-[var(--indigo)]' },
    { bg: 'bg-[var(--violet-muted)]', text: 'text-[var(--violet)]' },
  ];
  const colorIdx = assetCode.length % colorOptions.length;
  return colorOptions[colorIdx];
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
    'active:bg-[var(--bg-tertiary)] transition-colors cursor-pointer'
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
  return 'text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold pb-2 border-b border-[var(--border-subtle)] mb-3';
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
