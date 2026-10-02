'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  CASE_QUEUE_LIMIT, CASE_QUEUE_STORAGE_KEY, caseQueueKey, mergeCaseQueues,
  normalizeCaseTarget, parseCaseQueue, serializeCaseQueue,
} from '@/lib/shared/investigationCaseQueue';

type Network = 'mainnet' | 'testnet' | 'futurenet';
type CaseTarget = { type: 'address' | 'transaction'; value: string };
type CaseEntry = CaseTarget & { network: Network; savedAt: string; watching: boolean };

interface Props {
  network: Network;
  target: string | null;
  onOpen: (target: CaseTarget) => void;
}

export default function InvestigationCaseQueue({ network, target, onOpen }: Props) {
  const [entries, setEntries] = useState<CaseEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const storedValue = useRef<string | null>(null);
  const normalizedTarget = target ? normalizeCaseTarget(target) as CaseTarget | null : null;
  const currentKey = normalizedTarget ? caseQueueKey({ network, ...normalizedTarget }) : null;
  const saved = currentKey ? entries.some((entry) => caseQueueKey(entry) === currentKey) : false;
  const visible = entries.filter((entry) => entry.network === network);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CASE_QUEUE_STORAGE_KEY);
      if (raw) setEntries(parseCaseQueue(raw) as CaseEntry[]);
      storedValue.current = raw;
      setReady(true);
    } catch {
      setLoadFailed(true);
      setMessage('Saved queue could not be read. No changes will be written; check browser storage before continuing.');
    }
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== CASE_QUEUE_STORAGE_KEY) return;
      try {
        const next = event.newValue ? parseCaseQueue(event.newValue) as CaseEntry[] : [];
        storedValue.current = event.newValue;
        setEntries(next);
        setMessage('Case queue changed in another tab and was refreshed.');
      } catch {
        setReady(false);
        setLoadFailed(true);
        setMessage('Case queue changed to an invalid value in another tab. No changes will be written.');
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function persist(next: CaseEntry[], success: string) {
    try {
      const latest = window.localStorage.getItem(CASE_QUEUE_STORAGE_KEY);
      if (latest !== storedValue.current) {
        const refreshed = latest ? parseCaseQueue(latest) as CaseEntry[] : [];
        storedValue.current = latest;
        setEntries(refreshed);
        setMessage('Case queue changed in another tab. Review the refreshed list and try again.');
        return;
      }
      const serialized = serializeCaseQueue(next);
      window.localStorage.setItem(CASE_QUEUE_STORAGE_KEY, serialized);
      storedValue.current = serialized;
      setEntries(next);
      setMessage(success);
    } catch {
      setMessage('Could not save the case queue. Check browser storage and try again.');
    }
  }

  function saveTarget() {
    if (!normalizedTarget || saved) return;
    if (entries.length >= CASE_QUEUE_LIMIT) {
      setMessage(`Case queue limit is ${CASE_QUEUE_LIMIT} entries.`);
      return;
    }
    persist([{ network, ...normalizedTarget, savedAt: new Date().toISOString(), watching: false }, ...entries], 'Target saved on this browser.');
  }

  function toggleWatch(entry: CaseEntry) {
    persist(entries.map((item) => caseQueueKey(item) === caseQueueKey(entry) ? { ...item, watching: !item.watching } : item),
      entry.watching ? 'Removed from watchlist.' : 'Added to watchlist.');
  }

  function remove(entry: CaseEntry) {
    persist(entries.filter((item) => caseQueueKey(item) !== caseQueueKey(entry)), 'Target removed from this browser.');
  }

  function exportQueue() {
    const url = URL.createObjectURL(new Blob([serializeCaseQueue(entries)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'stellarchain-investigator-case-queue.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Case queue exported. Keep the file private if your investigation targets are sensitive.');
  }

  async function importQueue(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 128 * 1024) {
      setMessage('Import file exceeds 128 KB. No changes were made.');
      return;
    }
    try {
      const incoming = parseCaseQueue(await file.text()) as CaseEntry[];
      const merged = mergeCaseQueues(entries, incoming) as CaseEntry[];
      persist(merged, `${merged.length - entries.length} new targets imported. Existing watch states were kept.`);
    } catch {
      setMessage('Invalid or unsupported import file. No changes were made.');
    }
  }

  return (
    <Card className="p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Case queue & watchlist</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Stored only in this browser. Anyone using this browser profile can see saved targets; remove them on shared devices. No alerts, account sync or background monitoring.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={saveTarget} disabled={!ready || !normalizedTarget || saved || entries.length >= CASE_QUEUE_LIMIT} className="text-xs">
            {saved ? 'Saved in queue' : 'Save current target'}
          </Button>
          <Button type="button" onClick={exportQueue} disabled={!ready || !entries.length} className="text-xs">Export queue</Button>
          <Button type="button" onClick={() => fileInput.current?.click()} disabled={!ready} className="text-xs">Import queue</Button>
          <input ref={fileInput} type="file" accept="application/json,.json" onChange={importQueue} className="sr-only" aria-label="Import case queue JSON file" tabIndex={-1} />
        </div>
      </div>
      {message && <p role="status" className="mt-3 text-xs text-[var(--text-secondary)]">{message}</p>}
      {!ready ? <p className="mt-3 text-xs text-[var(--text-secondary)]">{loadFailed ? 'Queue unavailable on this browser.' : 'Loading browser queue…'}</p> : visible.length === 0 ? (
        <p className="mt-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3 text-xs text-[var(--text-secondary)]">
          No saved {network} targets. Investigate an address or transaction, then save it here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--border-default)] border-t border-[var(--border-default)]">
          {visible.map((entry) => (
            <li key={caseQueueKey(entry)} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">{entry.type} · {entry.watching ? 'Watchlist' : 'Case queue'}</div>
                <div className="truncate font-mono text-xs text-[var(--text-primary)]" title={entry.value}>{entry.value}</div>
              </div>
              <Button type="button" onClick={() => onOpen(entry)} className="text-xs">Open</Button>
              <Button type="button" onClick={() => toggleWatch(entry)} aria-label={`${entry.watching ? 'Unwatch' : 'Watch'} ${entry.value}`} className="text-xs">
                {entry.watching ? 'Unwatch' : 'Watch'}
              </Button>
              <Button type="button" onClick={() => remove(entry)} aria-label={`Remove ${entry.value} from case queue`} className="text-xs">Remove</Button>
            </li>
          ))}
        </ul>
      )}
      {entries.length > visible.length && <p className="mt-2 text-xs text-[var(--text-secondary)]">{entries.length - visible.length} saved targets belong to another network and remain in your export.</p>}
    </Card>
  );
}
