# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router pages and layouts. Route folders follow `page.tsx`, with dynamic segments like `src/app/account/[id]/page.tsx`.
- `src/components`: Reusable UI components; platform-specific variants live under `src/components/mobile` and `src/components/desktop`.
- `src/contexts`: React context providers (for example, `ThemeContext.tsx`).
- `src/lib`: Stellar SDK access, data fetching, and helpers.
- `src/data`: JSON data used by pages (for example, `projects.json`).
- `public`: Static assets served as-is.
- `test-xdr.js`: Standalone Node script for quick XDR decoding checks.

## Build, Test, and Development Commands
- `npm run dev`: Start the Next.js dev server at `http://localhost:3000`.
- `npm run build`: Create an optimized production build.
- `npm run start`: Run the production build locally.
- `npm run lint`: Run ESLint with Next.js core-web-vitals and TypeScript rules.
- `node test-xdr.js`: Manually run the XDR decoding sample (optional).

## Coding Style & Naming Conventions
- TypeScript + React with Next.js App Router; use the `@/` alias for imports rooted at `src`.
- Indentation is 2 spaces; keep semicolons and single-quoted strings in TS/TSX.
- Components are `PascalCase` (`StatsCard.tsx`), route folders use lowercase with `page.tsx` entrypoints, and dynamic params use `[param]`.
- Styling is primarily via Tailwind CSS (imported in `src/app/globals.css`) plus project-wide CSS variables.

## Testing Guidelines
- No automated test framework is currently configured.
- If you add tests, keep them close to the source (for example, `src/components/__tests__/Component.test.tsx`) and document any new command in this file.

## Commit & Pull Request Guidelines
- Git history shows short, informal commit messages with no strict convention. Prefer concise, imperative summaries (for example, "Add ledger filters").
- PRs should include: a clear description of changes, linked issues if any, and screenshots or GIFs for UI updates.
- Call out data or API changes in the PR description when relevant.

## Configuration Notes
- No environment variables are required by default. If you introduce any, document them in this file and update `README.md`.
