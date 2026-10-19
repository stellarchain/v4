'use client';

import { useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';

export default function DiscardPartnerChangesDialog({
  onDiscard,
  onCancel,
}: {
  onDiscard: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      onCancel={onCancel}
      aria-labelledby="discard-partner-title"
      aria-describedby="discard-partner-description"
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 text-[var(--text-primary)] shadow-xl backdrop:bg-black/50"
    >
      <h2 id="discard-partner-title" className="text-lg font-semibold">
        Discard unsaved changes?
      </h2>
      <p
        id="discard-partner-description"
        className="my-4 text-sm leading-6 text-[var(--text-secondary)]"
      >
        Your listing edits have not been saved. Discard them to continue.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          autoFocus
          onClick={onCancel}
          className="cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]"
        >
          Keep editing
        </Button>
        <Button
          onClick={onDiscard}
          className="cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]"
        >
          Discard changes
        </Button>
      </div>
    </dialog>
  );
}
