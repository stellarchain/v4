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

## Layout

Investigator preserves its existing 1400px maximum width and 16px panel rhythm. Graph and context panels sit side by side on large screens and stack on phones. Genuine evidence tables scroll horizontally inside their own region; the document retains vertical scrolling. No table-height constraint is applied to the route or form.

## Elevation & Depth

Existing Card uses tonal surfaces, a border and subtle shadow. Retain that treatment. No decorative gradients, glass layers or new elevated shells are introduced for this package.

## Shapes

Existing cards use 16px rounding; controls use 12px. Direction buttons keep their existing segmented treatment. Do not introduce a second component shape vocabulary.

## Components

Reuse shared `ui/Card`, `ui/Button`, `ui/Badge`, `PaymentFlowMap`, `PaymentFlowAccountIdentity` and `PaymentFlowTimeline`. Investigator owns its domain-specific search/filter form and evidence table. Native operation select is intentional: platform popup geometry is acceptable for five simple operation choices; no custom listbox is needed. Focus is visible, field errors are associated, requests are cancellable, and busy controls have stable geometry.

Inline outline SVGs remain the established icon style. Motion communicates loading only and respects reduced-motion preferences for new controls. Coverage and page scope accompany graph, summary and exports. Dates in new evidence surfaces use explicit UTC, amounts remain exact strings.

Historical chart pages reuse this explorer palette and Card/Button controls. An area chart is orientation only; an adjacent horizontally scrollable table is the canonical exact-value view. Metric families are grouped in the index, while pagination and bucket controls retain the same shape and focus treatment as Investigator.

## Do's and Don'ts

- Do preserve the existing light/dark variable mapping and shared component owners.
- Do qualify page totals and latest-observed timestamps.
- Don't introduce marketing typography, gradients or a new visual system for one screen.
- Don't imply full-history verification, safety verdicts, or full-dataset export from one page.
