'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  exportPartnerClicks,
  loadPartnerCatalog,
  PartnerApiError,
  savePartnerCatalog,
} from '@/lib/partners/api';
import {
  PARTNER_CATEGORIES,
  RELATIONSHIP_LABELS,
  type PartnerCatalogResponse,
  type PartnerEntry,
} from '@/lib/partners/types';
import {
  validatePartnerEntry,
  validPartnerReportRange,
  type PartnerFieldErrors,
} from '@/lib/partners/validation';
import DiscardPartnerChangesDialog from './DiscardPartnerChangesDialog';

const inputClass =
  'min-h-11 min-w-0 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)] disabled:opacity-60';
const buttonClass =
  'min-h-11 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)]';
const TEXT_FIELDS = [
  ['id', 'Stable ID', 64],
  ['name', 'Name', 100],
  ['websiteUrl', 'Website URL', 2048],
  ['trackingUrl', 'Tracking URL (optional)', 2048],
  ['description', 'Description', 1000],
  ['regionNotes', 'Availability & region', 500],
  ['networkNotes', 'Network notes', 500],
] as const;

function newEntry(): PartnerEntry {
  return {
    id: '',
    name: '',
    description: '',
    websiteUrl: '',
    trackingUrl: null,
    regionNotes: '',
    networkNotes: '',
    category: 'wallets',
    relationship: 'directory',
    status: 'draft',
    position: 0,
  };
}

type PendingAction =
  | { type: 'edit'; entry: PartnerEntry }
  | { type: 'new' | 'signout' | 'reload' }
  | { type: 'navigate'; href: string };

export default function PartnerAdmin() {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');
  const [catalog, setCatalog] = useState<PartnerCatalogResponse | null>(null);
  const [entry, setEntry] = useState<PartnerEntry | null>(null);
  const [original, setOriginal] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [errors, setErrors] = useState<PartnerFieldErrors>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const login = useRef<HTMLInputElement>(null);
  const fromInput = useRef<HTMLInputElement>(null);
  const loadController = useRef<AbortController | null>(null);
  const leavingAfterDiscard = useRef(false);
  const dirty = entry !== null && JSON.stringify(entry) !== original;

  useEffect(() => () => loadController.current?.abort(), []);
  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      if (leavingAfterDiscard.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    function beforeNavigate(event: MouseEvent) {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      const anchor = event.target.closest('a');
      if (
        !anchor?.href ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (busy) {
        setError('Please wait until saving completes before leaving.');
        return;
      }
      setPending({ type: 'navigate', href: anchor.href });
    }
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', beforeNavigate, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', beforeNavigate, true);
    };
  }, [dirty, busy]);

  function selectEntry(next: PartnerEntry, creating: boolean) {
    setEntry({ ...next });
    setOriginal(JSON.stringify(next));
    setIsNew(creating);
    setErrors({});
    setError('');
    setNotice('');
    requestAnimationFrame(() =>
      form.current
        ?.querySelector<HTMLInputElement>('input:not([readonly])')
        ?.focus(),
    );
  }

  async function load(secret: string) {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setBusy(true);
    setError('');
    try {
      const data = await loadPartnerCatalog(controller.signal, secret);
      if (controller.signal.aborted) return;
      setToken(secret);
      setTokenInput('');
      setCatalog(data);
      setEntry(null);
      setConflict(false);
      setNotice('Catalog loaded.');
      requestAnimationFrame(() =>
        document.getElementById('partner-add-listing')?.focus(),
      );
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(
          failure instanceof Error
            ? failure.message
            : 'Catalog could not be loaded. Retry.',
        );
        login.current?.focus();
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function execute(action: PendingAction) {
    setPending(null);
    if (action.type === 'edit') selectEntry(action.entry, false);
    if (action.type === 'new') selectEntry(newEntry(), true);
    if (action.type === 'reload') {
      setEntry(null);
      void load(token);
    }
    if (action.type === 'navigate') {
      leavingAfterDiscard.current = true;
      setEntry(null);
      window.location.assign(action.href);
    }
    if (action.type === 'signout') {
      setToken('');
      setTokenInput('');
      setCatalog(null);
      setEntry(null);
      setError('');
      setNotice('');
      setShowToken(false);
      requestAnimationFrame(() => login.current?.focus());
    }
  }

  function act(action: PendingAction) {
    if (dirty) setPending(action);
    else execute(action);
  }

  function update(field: keyof PartnerEntry, value: string) {
    if (!entry) return;
    setEntry({
      ...entry,
      [field]:
        field === 'position'
          ? value === ''
            ? -1
            : Number(value)
          : field === 'trackingUrl'
            ? value || null
            : value,
    });
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setNotice('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!entry || !catalog?.revision || busy || conflict) return;
    const issues = validatePartnerEntry(entry);
    if (isNew && catalog.entries.some((item) => item.id === entry.id))
      issues.id = 'This ID already exists. Choose a unique ID.';
    setErrors(issues);
    if (Object.keys(issues).length) {
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    const entries = isNew
      ? [...catalog.entries, entry]
      : catalog.entries.map((item) => (item.id === entry.id ? entry : item));
    try {
      const data = await savePartnerCatalog(entries, catalog.revision, token);
      setCatalog(data);
      setEntry(null);
      setErrors({});
      setNotice(
        entry.status === 'active'
          ? 'Listing saved and published.'
          : 'Listing saved. It is hidden from the public directory.',
      );
      requestAnimationFrame(() =>
        document.getElementById(`partner-edit-${entry.id}`)?.focus(),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Save failed. Your edits are preserved.',
      );
      if (failure instanceof PartnerApiError && failure.status === 412)
        setConflict(true);
    } finally {
      setBusy(false);
    }
  }

  async function download(event: FormEvent) {
    event.preventDefault();
    if (exporting) return;
    setExportError('');
    if (!validPartnerReportRange(from, to)) {
      setExportError(
        'Enter a valid inclusive UTC range of at most 90 days using YYYY-MM-DD.',
      );
      fromInput.current?.focus();
      return;
    }
    setExporting(true);
    try {
      const blob = await exportPartnerClicks(from, to, token);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `partner-clicks-${from}_${to}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Click report downloaded.');
    } catch (failure) {
      setExportError(
        failure instanceof Error
          ? failure.message
          : 'Export failed. Please retry.',
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-5 pb-24 md:py-6">
      <header>
        <Link
          href="/partners"
          className="text-sm text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]"
        >
          Public directory
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
          Partner administration
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Manage listings, disclosures, destinations and availability. Only
          active listings appear publicly.
        </p>
      </header>
      <div className="min-h-6 text-sm">
        <p
          id="partner-admin-error"
          role="alert"
          className="text-[var(--error)]"
        >
          {error}
        </p>
        <p role="status" className="text-[var(--text-secondary)]">
          {notice}
        </p>
      </div>
      {!catalog ? (
        <Card variant="bordered" className="max-w-xl p-5">
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (tokenInput.trim() && !busy) void load(tokenInput.trim());
            }}
            className="space-y-4"
          >
            <label
              htmlFor="partner-admin-token"
              className="block text-sm font-semibold text-[var(--text-primary)]"
            >
              Administration token
            </label>
            <div className="flex gap-2">
              <input
                ref={login}
                id="partner-admin-token"
                type={showToken ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error
                    ? 'partner-token-help partner-admin-error'
                    : 'partner-token-help'
                }
                className={inputClass}
                disabled={busy}
              />
              <Button
                type="button"
                onClick={() => setShowToken(!showToken)}
                aria-label={
                  showToken
                    ? 'Hide administration token'
                    : 'Show administration token'
                }
                aria-pressed={showToken}
                className={buttonClass}
              >
                {showToken ? 'Hide' : 'Show'}
              </Button>
            </div>
            <p
              id="partner-token-help"
              className="text-sm leading-6 text-[var(--text-secondary)]"
            >
              Use the token configured by your administrator. It stays in this
              tab’s memory and is cleared when you sign out or reload.
            </p>
            <Button
              type="submit"
              variant="primary"
              disabled={busy || !tokenInput.trim()}
              aria-busy={busy}
              className={`${buttonClass} min-w-36`}
            >
              {busy ? 'Connecting…' : 'Unlock catalog'}
            </Button>
          </form>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              id="partner-add-listing"
              onClick={() => act({ type: 'new' })}
              disabled={busy || catalog.entries.length >= 100}
              className={buttonClass}
            >
              Add listing
            </Button>
            <Button
              onClick={() => act({ type: 'reload' })}
              disabled={busy}
              className={buttonClass}
            >
              Reload catalog
            </Button>
            <Button
              onClick={() => act({ type: 'signout' })}
              disabled={busy || exporting}
              className={buttonClass}
            >
              Sign out
            </Button>
            <span className="text-sm text-[var(--text-secondary)]">
              {catalog.entries.length} / 100 listings
            </span>
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
            <Card variant="bordered" className="p-4">
              <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
                Listings
              </h2>
              {catalog.entries.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  No listings yet. Add your first listing.
                </p>
              ) : (
                <ul className="space-y-2">
                  {catalog.entries.map((item) => (
                    <li key={item.id}>
                      <button
                        id={`partner-edit-${item.id}`}
                        type="button"
                        disabled={busy}
                        onClick={() => act({ type: 'edit', entry: item })}
                        aria-current={
                          entry?.id === item.id ? 'true' : undefined
                        }
                        className="w-full cursor-pointer rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 text-left hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="block break-words text-sm font-semibold text-[var(--text-primary)]">
                          {item.name}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                          {PARTNER_CATEGORIES[item.category]} · {item.status} ·
                          Position {item.position}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card variant="bordered" className="min-w-0 p-5">
              {!entry ? (
                <p className="py-5 text-sm text-[var(--text-secondary)]">
                  Select a listing to edit, or add a new listing.
                </p>
              ) : (
                <form
                  ref={form}
                  noValidate
                  onSubmit={save}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    {isNew ? 'Add listing' : `Edit ${entry.name}`}
                  </h2>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    Active publishes the listing. Draft and inactive hide it.
                    The stable ID preserves click history. Tracking URLs are
                    used only with optional-cookie consent.
                  </p>
                  <fieldset disabled={busy} className="space-y-4">
                    {TEXT_FIELDS.map(([field, label, max]) => (
                      <div key={field}>
                        <label
                          htmlFor={`partner-${field}`}
                          className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
                        >
                          {label}
                        </label>
                        {[
                          'description',
                          'regionNotes',
                          'networkNotes',
                        ].includes(field) ? (
                          <textarea
                            id={`partner-${field}`}
                            name={field}
                            rows={4}
                            maxLength={max}
                            value={entry[field] || ''}
                            onChange={(event) =>
                              update(field, event.target.value)
                            }
                            aria-invalid={Boolean(errors[field])}
                            aria-describedby={
                              errors[field]
                                ? `partner-${field}-error`
                                : undefined
                            }
                            className={`${inputClass} resize-none`}
                          />
                        ) : (
                          <input
                            id={`partner-${field}`}
                            name={field}
                            type={field.endsWith('Url') ? 'url' : 'text'}
                            maxLength={max}
                            readOnly={field === 'id' && !isNew}
                            value={entry[field] || ''}
                            onChange={(event) =>
                              update(field, event.target.value)
                            }
                            aria-invalid={Boolean(errors[field])}
                            aria-describedby={
                              errors[field]
                                ? `partner-${field}-error`
                                : undefined
                            }
                            className={inputClass}
                          />
                        )}
                        {errors[field] && (
                          <p
                            id={`partner-${field}-error`}
                            className="mt-1 text-sm text-[var(--error)]"
                          >
                            {errors[field]}
                          </p>
                        )}
                      </div>
                    ))}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="partner-category"
                          className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
                        >
                          Category
                        </label>
                        <select
                          id="partner-category"
                          value={entry.category}
                          onChange={(event) =>
                            update('category', event.target.value)
                          }
                          className={inputClass}
                        >
                          {Object.entries(PARTNER_CATEGORIES).map(
                            ([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="partner-relationship"
                          className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
                        >
                          Relationship disclosure
                        </label>
                        <select
                          id="partner-relationship"
                          value={entry.relationship}
                          onChange={(event) =>
                            update('relationship', event.target.value)
                          }
                          className={inputClass}
                        >
                          {Object.entries(RELATIONSHIP_LABELS).map(
                            ([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="partner-status"
                          className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
                        >
                          Publication status
                        </label>
                        <select
                          id="partner-status"
                          value={entry.status}
                          onChange={(event) =>
                            update('status', event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="partner-position"
                          className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
                        >
                          Position (lower first)
                        </label>
                        <input
                          id="partner-position"
                          type="number"
                          min="0"
                          max="9999"
                          step="1"
                          value={entry.position < 0 ? '' : entry.position}
                          onChange={(event) =>
                            update('position', event.target.value)
                          }
                          aria-invalid={Boolean(errors.position)}
                          aria-describedby={
                            errors.position
                              ? 'partner-position-error'
                              : undefined
                          }
                          className={inputClass}
                        />
                        {errors.position && (
                          <p
                            id="partner-position-error"
                            className="mt-1 text-sm text-[var(--error)]"
                          >
                            {errors.position}
                          </p>
                        )}
                      </div>
                    </div>
                  </fieldset>
                  {conflict && (
                    <p role="alert" className="text-sm text-[var(--error)]">
                      Another session changed the catalog. Copy any edits you
                      need, then reload the catalog and review the latest
                      listing before saving.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={busy || conflict}
                      aria-busy={busy}
                      className={`${buttonClass} min-w-44`}
                    >
                      {busy
                        ? 'Saving…'
                        : entry.status === 'active'
                          ? 'Save & publish'
                          : 'Save listing'}
                    </Button>
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() => act({ type: 'reload' })}
                      className={buttonClass}
                    >
                      Cancel edits
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
          <Card variant="bordered" className="p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Click report
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Download daily UTC totals by service and directory placement.
              These are consented link activations, not unique visitors,
              conversions or Sevio ad campaign clicks. Repeated and automated
              activations may be included. Maximum range: 90 days.
            </p>
            <form
              noValidate
              onSubmit={download}
              className="mt-4 flex flex-wrap items-end gap-3"
            >
              <div>
                <label
                  htmlFor="partner-report-from"
                  className="mb-1 block text-sm text-[var(--text-primary)]"
                >
                  From (UTC)
                </label>
                <input
                  ref={fromInput}
                  id="partner-report-from"
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY-MM-DD"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  aria-invalid={Boolean(exportError)}
                  aria-describedby="partner-report-help"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="partner-report-to"
                  className="mb-1 block text-sm text-[var(--text-primary)]"
                >
                  To (UTC, inclusive)
                </label>
                <input
                  id="partner-report-to"
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY-MM-DD"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  aria-invalid={Boolean(exportError)}
                  aria-describedby="partner-report-help"
                  className={inputClass}
                />
              </div>
              <Button
                type="submit"
                disabled={exporting}
                aria-busy={exporting}
                className={`${buttonClass} min-w-44`}
              >
                {exporting ? 'Exporting…' : 'Download CSV'}
              </Button>
            </form>
            <p
              id="partner-report-help"
              role={exportError ? 'alert' : undefined}
              className="mt-2 min-h-6 text-sm text-[var(--text-secondary)]"
            >
              {exportError || 'Use YYYY-MM-DD. Both dates are included.'}
            </p>
          </Card>
        </>
      )}
      {pending && (
        <DiscardPartnerChangesDialog
          onCancel={() => setPending(null)}
          onDiscard={() => execute(pending)}
        />
      )}
    </div>
  );
}
