'use client';

import { useState } from 'react';
import type { AccountLabel } from '@/lib/stellar';

interface AccountBadgesProps {
  address: string;
  labels: Record<string, AccountLabel>;
  size?: 'sm' | 'md';
}

interface BadgeTooltipProps {
  children: React.ReactNode;
  content: string;
}

function BadgeTooltip({ children, content }: BadgeTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-default"
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-[10px] leading-tight rounded-lg shadow-lg z-50 whitespace-nowrap">
          {content}
          <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-slate-200 dark:border-t-slate-700" />
        </div>
      )}
    </div>
  );
}

// Checkmark icon for verified accounts
function VerifiedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  );
}

// Tag icon for labeled (but not verified) accounts
function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 003 5.5v2.879a2.5 2.5 0 00.732 1.767l6.5 6.5a2.5 2.5 0 003.536 0l2.878-2.878a2.5 2.5 0 000-3.536l-6.5-6.5A2.5 2.5 0 008.38 3H5.5zM6 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );
}

// Building icon for organization
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 16.5v-13h-.25a.75.75 0 010-1.5h12.5a.75.75 0 010 1.5H16v13h.25a.75.75 0 010 1.5h-12.5a.75.75 0 010-1.5H4zm3-11a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm4 0a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm-4 4a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm4 0a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm-3 4a.5.5 0 00-.5.5v3h4v-3a.5.5 0 00-.5-.5h-3z" clipRule="evenodd" />
    </svg>
  );
}

export default function AccountBadges({ address, labels, size = 'sm' }: AccountBadgesProps) {
  const label = labels[address];

  if (!label) {
    return null;
  }

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span className="inline-flex items-center gap-0.5 ml-1 mr-0.5 shrink-0">
      {/* Verified badge */}
      {label.verified && label.name && (
        <BadgeTooltip content={`Verified: ${label.name}`}>
          <VerifiedIcon className={`${iconSize} text-sky-500`} />
        </BadgeTooltip>
      )}

      {/* Label badge (only if not verified, to avoid redundancy) */}
      {!label.verified && label.name && (
        <BadgeTooltip content={label.name}>
          <TagIcon className={`${iconSize} text-slate-400`} />
        </BadgeTooltip>
      )}

      {/* Organization badge */}
      {label.org_name && (
        <BadgeTooltip content={`Org: ${label.org_name}`}>
          <BuildingIcon className={`${iconSize} text-slate-500`} />
        </BadgeTooltip>
      )}
    </span>
  );
}
