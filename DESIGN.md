---
version: alpha
name: StellarChain
description: Evidence-dense Stellar explorer with sapphire accents and restrained data surfaces.
colors:
  primary: '#0F4C81'
  background: '#f1f5f9'
  surface: '#FFFFFF'
  text: '#0f172a'
  secondary: '#475569'
  border: '#e2e8f0'
typography:
  sans:
    fontFamily: "'IBM Plex Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
  mono:
    fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace"
rounded:
  control: '0.75rem'
  card: '1rem'
spacing:
  panel: '1rem'
  investigator-max: '1400px'
components:
  card:
    rounded: '1rem'
  button:
    rounded: '0.75rem'
---

# StellarChain design context

## Overview

Product register: a chain-analysis workbench for explorers, engineers and investigators, not a marketing landing page. The signature is sapphire navigation around evidence-dense, monospaced identifiers. Preserve familiar explorer interactions and qualified claims about data coverage. Current UI copy is English; no geographic-market or Japanese-localization assumptions are made.

This scan documents the existing application, not a rebrand. Runtime CSS remains canonical (mapping model B): `src/app/globals.css` → `src/lib/shared/designSystem.ts` → shared Card, Button, Badge and data views. Frontmatter mirrors the light theme; `[data-theme="dark"]` owns dark overrides.

## Colors

`primary` maps to `--primary-blue`, `background` to `--bg-primary`, `surface` to `--bg-secondary`, `text` to `--text-primary`, `secondary` to `--text-secondary`, and `border` to `--border-default`. Use semantic CSS variables in feature code, not copied hex values. Error/warning/success must include text; heuristics never become verdicts through color alone. New explanatory text uses secondary rather than low-contrast muted text.

## Typography

IBM Plex Sans owns navigation, labels and prose; JetBrains Mono owns chain identifiers and exact decimal strings. Keep tabular numbers aligned. Do not round exported amounts or coerce bigint identifiers into JavaScript numbers. English labels follow the existing sentence-case vocabulary. Full identifiers remain accessible in evidence tables and exports.

Investigator summary surfaces use compact `K` / `M` / `B` notation for values at or above one thousand. The exact source decimal remains available through the shared accessible tooltip and in evidence exports; small nonzero values stay fully visible so dust is never rendered as zero. The Account Trust Checker uses a three-state directory assessment: green `Trusted` for a verified public identity without an adverse label, red `Untrusted` for an explicit adverse directory label, and neutral `Unverified` when evidence is inconclusive or unavailable. Payment-pattern heuristics never change this status, and a visible `Not a guarantee` note accompanies every result.

SAC balance comparison uses the same compact `K` / `M` / `B` notation while preserving exact token decimals in accessible tooltips. The signed calculation is translated into `above`, `below`, or `No gap observed`; a negative difference is never shown as an unexplained negative balance. Comparison status and copy remain neutral because the indexed holder total and Horizon asset supply have different scopes and update times.

## Layout

Investigator preserves its existing 1400px maximum width and 16px panel rhythm. Graph and context panels sit side by side on large screens and stack on phones. Basic mode uses a direct reading order: one evidence snapshot, four plain-language account metrics, short account signals, an always-visible payment-details table and a separate event-timeline card immediately below it. Technical definitions live in the shared accessible tooltip. Recipient confirmation uses neutral blue-gray guidance, explains that an unlisted account is not automatically unsafe and offers a direct full-address copy action; warning and danger styling are reserved for evidence-backed adverse labels. Advanced mode retains complete coverage metadata, exports, metric detail and the same two evidence surfaces. Genuine evidence tables scroll horizontally inside their own region; the document retains vertical scrolling. No table-height constraint is applied to the route or form.

## Elevation & Depth

Existing Card uses tonal surfaces, a border and subtle shadow. Retain that treatment. General cards and page shells do not use decorative gradients, glass layers or new elevated shells. Historical chart plots are the deliberate exception: full chart pages may use a token-based sapphire-to-blue-to-emerald line, while dashboard card previews use solid semantic trend colors with a restrained matching wash.

## Shapes

Existing cards use 16px rounding; controls use 12px. Direction buttons keep their existing segmented treatment. Do not introduce a second component shape vocabulary.

## Components

Reuse shared `ui/Card`, `ui/Button`, `ui/Badge`, `ui/SegmentedControl`, `PaymentFlowMap`, `PaymentFlowAccountIdentity` and `PaymentFlowTimeline`. `SegmentedControl` owns compact, finite, mutually exclusive choices such as Statistics historical range and chart bucket size. Investigator owns its domain-specific search/filter form and evidence table. Native operation select is intentional: platform popup geometry is acceptable for five simple operation choices; no custom listbox is needed. Focus is visible, field errors are associated, requests are cancellable, and busy controls have stable geometry.

Inline outline SVGs remain the established icon style. The shared `InfoTooltip` uses a restrained outlined information icon for supplementary definitions and caveats; essential scope and navigation instructions remain visible. Motion communicates loading only and respects reduced-motion preferences for new controls. Coverage and page scope accompany graph, summary and exports. Dates in new evidence surfaces use explicit UTC, amounts remain exact strings.

Historical chart pages reuse this explorer palette and Card/Button controls. Bucket, dataset and page-export controls form a compact inline toolbar inside the chart surface and wrap naturally on narrow screens. The plot header contains only the metric identity and loaded interval; interaction guidance, loaded/visible counts and CSV scope are consolidated into a quiet metadata row below the plot. An area chart is orientation only: it uses a fixed viewport with direct mouse/touch panning, loads older API pages at the historical edge and overlays progress without moving the plot. Native scrollbars are not used as chart navigation. Keyboard arrows provide the non-drag alternative and the visible guidance row explains both input modes. Within the plot, a fine two-axis grid and a chronological sapphire-to-emerald gradient form the visual signature; color remains decorative and never represents a second metric or status. Chart tooltips use a compact two-row metric card: a short UTC timestamp above an indicator, metric label and monospaced value. The page-scoped CSV retains exact decimal strings and source provenance without duplicating the chart as a large table below it. Related metrics use an icon-led link grid rather than a dense pill cloud. Metric families are grouped in the index, while bucket controls retain the same shape and focus treatment as Investigator.

Sponsored placements are quiet, explicitly labeled interruptions outside evidence and trust surfaces. They use the existing bordered card grammar with a dashed boundary, no decorative gradient, and a visible `Advertisement` label plus the shared explanatory tooltip. Ads never appear inside Account Trust Checker, Investigator evidence, verification, ranking or contract provenance cards. A placement renders nothing until its provider zone is configured and optional-cookie consent has been granted; development preview content never ships in production.

Statistics metric sections use four cards per row on wide desktop, three on compact desktop, two on tablet and one on mobile. Section headers pair a restrained icon tile with a metric count and divider so the long dashboard remains scannable. Each metric card uses a compact 286px minimum height, gives its trend preview the upper visual field with a restrained grid, and places the label, primary value, aggregation scope, comparison and single destination cue below it in reading order. Trend previews and comparison badges share the same semantic color: green for increases, red for decreases and neutral gray when comparison is unavailable or unchanged; blue is not used for these preview lines. The full card remains the chart link. The overview header contains only page identity and indexed coverage dates. The shared historical-range control stays above the main chart because it changes the visualization, while bucket and indexed-count metadata sit discreetly below the plot beside its navigation guidance. The main network chart remains the dominant surface.

## Do's and Don'ts

- Do preserve the existing light/dark variable mapping and shared component owners.
- Do qualify page totals and latest-observed timestamps.
- Do keep sponsored content visibly separate from explorer evidence, assessments and rankings.
- Don't spread the chart-only gradient into page shells, cards or marketing typography, or introduce a new visual system for one screen.
- Don't imply full-history verification, safety verdicts, or full-dataset export from one page.
- Don't render an advertising placeholder, provider script or tracking request when configuration or optional-cookie consent is absent.
