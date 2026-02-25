# Stellarchain V4 Frontend

Stellarchain V4 is a Next.js App Router frontend for Stellar and Soroban data exploration:
- ledger / transaction / operation / effect browsing
- accounts and labels
- markets, assets, liquidity pools
- Soroban contracts, events, metadata, verification

The app is client-first (`'use client'`) and targets static-friendly behavior with client-side data loading.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- `@stellar/stellar-sdk`
- Axios (for Stellarchain API service client)

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # serve production build
npm run lint     # lint
npx tsc --noEmit # type-check
```

## Docker (Static + Nginx)

Use this for end-to-end local testing of the built static app served by Nginx:

```bash
docker build --no-cache -t stellarchain-static .
docker run --rm -p 8080:80 stellarchain-static
```

Then open `http://localhost:8080`.

## Project Structure

```txt
src/
  app/                 # Next.js routes
  components/          # UI components (desktop/mobile/shared)
  contexts/            # React contexts
  services/            # external clients (api, horizon, soroban)
  lib/
    network/           # network config/state
    stellar/           # Stellar domain client + graph + types
    soroban/           # Soroban domain (client, events, metadata, storage, tokens, verification)
    shared/            # shared types/utilities aliases (interfaces/routes/xdr/design)
    helpers.ts
    projects.ts
    searchRouting.ts
```

## Data / Service Boundaries

- `src/services/api.js`
  - Stellarchain API base: `https://api.stellarchain.dev`
  - v1 base: `https://api.stellarchain.dev/v1`
  - default query param `network=mainnet`

- `src/services/horizon.js`
  - single place for Horizon server creation and base URL resolution

- `src/services/soroban.js`
  - single place for Soroban RPC server creation and passphrase resolution

- `src/lib/stellar/*`
  - business/domain logic for Horizon + market/account transformations

- `src/lib/soroban/*`
  - Soroban reads, event parsing, contract metadata/storage/verification/token registry

## Development Guidelines

1. Prefer `services/*` for external client setup.
2. Keep `lib/*` for domain logic and transformations.
3. Avoid new raw `fetch`/`new Horizon.Server` scattered in pages/components when a service/client helper exists.
4. Use `@stellar/stellar-sdk` flows for Horizon/Soroban where available.
5. Keep network behavior consistent (`mainnet`, `testnet`, `futurenet`) via `lib/network/*`.
6. Preserve client-side data loading pattern (`useEffect`, `useState`) for route pages.
7. Keep UI style consistent with existing Tailwind patterns.

## System Prompt

Use this checklist before submitting changes:

1. Architecture
- Do not add new API clients in random files.
- Reuse `src/services/api.js`, `src/services/horizon.js`, `src/services/soroban.js`.
- Place new Stellar logic under `src/lib/stellar/*` and Soroban logic under `src/lib/soroban/*`.

2. Types
- Put reusable interfaces/types in `src/lib/shared/interfaces.ts` (or domain `types.ts` files).
- Avoid `any` unless strictly unavoidable.

3. Networking
- Keep Stellarchain API requests using `network=mainnet` by default unless explicit override is required.
- Prefer SDK page shape (`records`, `next()`) and guard optional `_links` when API payloads can vary.
- Use `axios` via `src/services/api.js` for Stellarchain API HTTP requests.
- Use `@stellar/stellar-sdk` (through `src/services/horizon.js` / `src/services/soroban.js` and lib wrappers) for Horizon and Soroban requests.
- Avoid introducing direct `fetch` calls for new request flows unless there is a clear technical reason.

4. Refactoring style
- Prefer `async/await` over nested `.then/.catch`.
- Reduce callback chains and keep effects readable.
- Avoid unnecessary abstractions if they increase complexity without value.

5. Validation
- Run:
  - `npm run lint`
  - `npx tsc --noEmit`
- For large changes, run targeted lint/type-check on touched files first, then full checks.

6. Safety
- Do not revert unrelated changes.
- Do not use destructive git commands unless explicitly requested.

## Notes

- No environment variables are required by default.
- If new env vars are introduced, update this README and document defaults/fallbacks.
