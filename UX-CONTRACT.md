# Investigator UX contract

Scope: the first Q3 Investigator integration, not a retrospective certification of every route.

## Sources and ownership

Product scope: `../plans-docs/q3.md`, Investigator deliverable. Runtime API contract: `../v4-api/src/Controller/PaymentFlowInvestigationController.php` and `../v4-api/src/Service/Trace/PaymentFlowInvestigationReadService.php`. The feature is read-only; this package introduces no wallet signing, account changes or deletion. Visual ownership is documented in [DESIGN.md](DESIGN.md).

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | PaymentFlowInvestigationView + InvestigateClient | This contract / API controller | Explicit submit; drafts stay local until committed | Validation, retry, clear and keyboard |
| Select/Listbox | Native operation select in investigation form | DESIGN.md | Platform-owned popup geometry | Keyboard selection, narrow viewport |
| Dataset navigation | InvestigateClient URL state + API cursor | API read service | Latest page / older page; browser Back | Cursor and stale-response tests |
| Data display | PaymentFlowMap, evidence table, PaymentFlowTimeline | API page response | All derived from the same returned page | Empty/success/export parity |
| Scrollbar | app/globals.css | DESIGN.md | Global theme baseline; table-only horizontal overflow | Browser layout check |
| Actions | ui/Button | Shared component | Native disabled and visible focus | Keyboard and pending checks |

No selection, bulk actions, CRUD, toast or date-picker capability is added. Ledger filters are inclusive integer bounds; evidence times are UTC. English copy follows existing app policy.

## Search and dataset navigation

Account/transaction, direction, operation type, ledger bounds and cursor are URL-backed committed state. Draft filter edits require Investigate. Changing committed filters drops the cursor. Page size is 50; order is ledger descending then event ID descending. Older pages replace the page, not append ambiguous totals. Latest page resets pagination. Back restores the prior URL/query. Clear cancels pending work, removes target and filters and focuses search.

Graph, heuristics, grouped transaction table and exports describe the current page only. A transaction may span two pages; grouping never claims a complete transaction. JSON includes query/coverage; CSV repeats network, page scope and filter metadata. Exported decimal and bigint values remain strings; CSV neutralizes spreadsheet formulas.

## State and recovery

Initial search, pending, empty results, loaded data, validation errors and API errors are distinct. Submit is IME-safe, `noValidate` delegates errors to the app, and invalid submit focuses the first invalid field. Nonempty search has an explicit Clear action. AbortController plus stale guards prevent older requests replacing a new query; HTTP requests time out. Retry repeats the same committed query. Error text never exposes raw connection details.

Pagination and export are disabled while pending. No success notice is shown for unavailable data. The latest observed indexed ledger is explicitly not a contiguous-ingestion watermark. Heuristics are not verdicts. Document title is `Investigator — StellarChain`.

## Verification and existing drift

Use targeted Node regression tests, TypeScript, changed-file ESLint, production build and browser smoke checks on desktop/mobile, light/dark, keyboard, loading, empty/error and success. No project-wide WCAG certification is implied. Canonical sibling: the Statistics page's client-only API and paginated dataset behavior.

This package retains established styles. Existing low-contrast muted text and unrelated routes lacking form contracts are migration debt, not newly accepted design rules. Static skill audit results are kept outside the source tree and reported separately from runtime evidence.
