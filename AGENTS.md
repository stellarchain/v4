# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router pages and layouts. Route folders follow `page.tsx`, with dynamic segments like `src/app/account/[id]/page.tsx`.
- `src/components`: Reusable UI components; platform-specific variants live under `src/components/mobile` and `src/components/desktop`.
- `src/contexts`: React context providers (for example, `ThemeContext.tsx`).
- `src/lib`: Stellar SDK access, data fetching, and helpers.
- `public`: Static assets served as-is.

## Build, Test, and Development Commands
- `npm run dev`: Start the Next.js dev server at `http://localhost:3000`.
- `npm run build`: Create an optimized production build.
- `npm run start`: Run the production build locally.
- `npm run lint`: Run ESLint with Next.js core-web-vitals and TypeScript rules.

## Coding Style & Naming Conventions

You are working on a Next.js App Router project with client-only pages. All data fetching happens on the client using React function components, useState, and useEffect (with 'use client' at the top). Avoid SSR
  and server components; the final goal is to serve a static build with client-side data loading. Keep components simple and consistent with existing Tailwind styles. Prefer minimal, clear state handling and avoid
  unnecessary effects. Use always stellar-sdk for query api endpoints and not raw requests from stellar.ts.
  
- TypeScript + React with Next.js App Router; use the `@/` alias for imports rooted at `src`.
- Indentation is 2 spaces; keep semicolons and single-quoted strings in TS/TSX.
- Components are `PascalCase` (`StatsCard.tsx`), route folders use lowercase with `page.tsx` entrypoints, and dynamic params use `[param]`.
- Styling is primarily via Tailwind CSS (imported in `src/app/globals.css`) plus project-wide CSS variables.
- We need consistency in the design, use the same colors, fonts, and spacing throughout the website, for example tabs have a specific style, should be use everywhere the same style, also lists have a specific style, with a bubble for each item.
## Testing Guidelines
- No automated test framework is currently configured.
- If you add tests, keep them close to the source (for example, `src/components/__tests__/Component.test.tsx`) and document any new command in this file.


## Commit & Pull Request Guidelines
- Git history shows short, informal commit messages with no strict convention. Prefer concise, imperative summaries (for example, "Add ledger filters").
- PRs should include: a clear description of changes, linked issues if any, and screenshots or GIFs for UI updates.
- Call out data or API changes in the PR description when relevant.

## Configuration Notes
- No environment variables are required by default.
- Optional Sentry browser monitoring uses `NEXT_PUBLIC_SENTRY_DSN`. If omitted, Sentry initialization is skipped.
- If you introduce any environment variables, document them in this file and update `README.md`.
