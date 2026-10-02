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
| Case queue/watchlist | InvestigationCaseQueue | Browser localStorage, versioned JSON | Per-network list; explicit import/export only | Invalid import, storage failure, cross-network, duplicate and size tests |

No selection, bulk actions, CRUD, toast or date-picker capability is added. Ledger filters are inclusive integer bounds; typed YYYY-MM-DD date filters use inclusive UTC days and indexed ledger boundaries. Evidence times are UTC. English copy follows existing app policy.

## Search and dataset navigation

Account/transaction, direction, operation type, asset key, optional minimum amount in that asset, ledger/date bounds and cursor are URL-backed committed state. Asset keys use the exact canonical value displayed in evidence; matching checks both source and destination assets. The positive minimum requires an asset; an event passes if either matching side has a known amount at least that large. The SQL applies it before the page limit; unknown amounts do not pass. Draft filter edits require Investigate. Changing committed filters drops the cursor. Page size is 50; order is ledger descending then event ID descending. Older pages replace the page, not append ambiguous totals. Latest page resets pagination. Back restores the prior URL/query. Clear cancels pending work, removes target and filters and focuses search.

The public `/v1/trace/address/{id}` and `/v1/trace/tx/{hash}` routes share this first-hop classic payment-flow reader. Their `depth` parameter accepts only `1`; larger or invalid values return a typed 422, not an incomplete multi-hop result.

Graph, heuristics, grouped flow table, grouped transaction table and exports describe the current page only. The Investigator UI shows observed patterns without a numeric risk score or account-level risk badge; legacy `riskContext.score` and `level` remain in the API for compatibility and must not be presented as a verdict. The evidence switch toggles grouped flows and individual events without changing the underlying page. Flow groups keep source and destination amounts in separate asset units; an unknown event amount makes that side's group total unknown. A transaction may span two pages; grouping never claims a complete transaction. JSON includes query/coverage; CSV repeats network, page scope and filter metadata. The standalone HTML report is print-ready, escapes all untrusted evidence and carries an explicit page-scope warning. Exported decimal and bigint values remain strings; CSV neutralizes spreadsheet formulas.

Account labels and verification badges may appear as directory context, but the separate account-metric payment counts and dates are not displayed beside historical payment-flow evidence: their retained-source coverage is different and a zero can contradict events on this page.

Counterparty cards link separately to the account detail and to a new one-hop Investigator search for that address. This is a manual pivot to a different page-scoped query, not a chained flow or multi-hop funding claim.

The case queue stores only a network, account/transaction identifier, watch flag and local save time. It does not store report content, notes or raw evidence; saved identifiers can still be sensitive. Watchlist means a local marker, not monitoring or notifications. The UI warns that anyone using the same browser profile can view saved targets, especially on shared devices. Queue entries for other networks remain in storage/export but are not opened on the current network. Import is explicit, validates every entry before merging, does not overwrite existing watch flags and is capped at 100 entries/128 KB. A corrupt or inaccessible stored queue disables writes to avoid accidental replacement; browser storage loss cannot be recovered unless the user exported a file.

## State and recovery

Initial search, pending, empty results, loaded data, validation errors and API errors are distinct. An empty filtered page says no indexed events match the target and selected filters; it does not claim that the target has no other activity. Submit is IME-safe, `noValidate` delegates errors to the app, and invalid submit focuses the first invalid field. Nonempty search has an explicit Clear action. AbortController plus stale guards prevent older requests replacing a new query; HTTP requests time out. Retry repeats the same committed query. Error text never exposes raw connection details.

Pagination and export are disabled while pending. No success notice is shown for unavailable data. The latest observed indexed ledger is explicitly not a contiguous-ingestion watermark. Heuristics are not verdicts. Document title is `Investigator — StellarChain`.

## Verification and existing drift

Use targeted Node regression tests, TypeScript, changed-file ESLint, production build and browser smoke checks on desktop/mobile, light/dark, keyboard, loading, empty/error and success. No project-wide WCAG certification is implied. Canonical sibling: the Statistics page's client-only API and paginated dataset behavior.

This package retains established styles. Existing low-contrast muted text and unrelated routes lacking form contracts are migration debt, not newly accepted design rules. Static skill audit results are kept outside the source tree and reported separately from runtime evidence.

## Historical charts

The Statistics overview excludes an `active-addresses` range card: averaging five-minute distinct transaction sources cannot give period-unique accounts. The dedicated chart still exposes the truthful five-minute series. Contract cards are explicitly labeled as indexed detail-text matches, not complete verified creation/invocation totals.

`/chart` lists only metrics enabled by the backend catalog; `/chart/{slug}` uses the same `/v1/network-metrics` collection as external API clients. Metric, bucket size, page and optional `before` boundary are navigation state. Chart requests use `windowDays=30`: the API anchors the latest window to the latest indexed source bucket, aligns UTC boundaries to the selected bucket size, and returns an exclusive end plus older/newer window boundaries. Page totals and source choices apply only to this window; pagination never implies a verified gap-free chain interval. The selected source applies only to the displayed page. The chart converts decimal strings to floating-point for visual position; exact `valueDecimal` strings remain in the table and CSV. Export is explicitly current-page only. Empty, pending and failed requests are distinct; old requests are aborted on navigation and retry preserves the current route. No gap filling or contiguous-history assertion is made. The public API requires `windowDays=1..30` and returns `422 window_required` when absent, so unbounded full-history aggregation is no longer available. Bounded-window grouped-count and resampling cost still require runtime validation against production-sized statistics before rollout.

Each enabled metric has a separate static `/chart/{slug}` URL and SEO description, backed by one shared client component and a metric-definition catalog. The catalog owns the value label, precise source-derived definition and interpretation caveat; page and CSV export carry that context. Export contains only the currently visible source rows, never all sources when one is selected. Request-key gating prevents a previous metric/window response appearing briefly during navigation. Related charts link to distinct routes within the same metric family. `output-value` combines nominal amounts from different asset types, so the page shows indexed values for audit but suppresses the trend until asset-scoped values exist. `active-addresses` is available only at five-minute distinct-source grain; hour/day requests return 422 until period-unique identities can be rebuilt. `max-fee` currently stores sums of the Horizon `max_fee` field per five-minute bucket and resamples with `MAX`; it must not be called a per-transaction maximum. Contract creation/invocation counts are detail-text matches, not completeness claims.

Chart lines break when two adjacent displayed rows are separated by an unindexed bucket. The page labels only gaps detectable between the current page's selected-source rows; it makes no claim about the rest of the window. Out-of-range API pages return no rows without executing a large OFFSET query and link back to the last valid page.

On chart request failure, Retry repeats the current request; Latest window clears a stale or malformed historical boundary so the user has an explicit recovery path.

## Contract provenance and SAC comparison

SEP-55 build attestation, indexed/decompiled code availability and registry metadata are separate signals. A decompiler result must never set a build-verified badge. SEP-58 is draft and no reproducible-build claim is displayed until a rebuild has actually completed and matched bytes. SAC comparison uses seven-decimal raw units; non-integer or missing supply is unavailable rather than truncated. Soroban indexed holder balance and Horizon total asset supply have different scopes and observation times, so equality is not an expected invariant or a safety verdict.
