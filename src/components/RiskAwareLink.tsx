'use client';

import Link from 'next/link';
import type { MouseEventHandler, ReactNode } from 'react';
import { getRiskLinkClassName, isRiskLinkDisabled } from '@/lib/shared/riskLabels';

interface RiskAwareLinkProps {
  href: string;
  riskLabelText?: string | null;
  className?: string;
  blockedClassName?: string;
  target?: string;
  rel?: string;
  title?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
}

export default function RiskAwareLink({
  href,
  riskLabelText,
  className = '',
  blockedClassName = '',
  target,
  rel,
  title,
  onClick,
  children,
}: RiskAwareLinkProps) {
  if (isRiskLinkDisabled(riskLabelText)) {
    return (
      <span
        aria-disabled="true"
        title={title || `Link disabled because this item is marked as ${riskLabelText}`}
        className={`${className} ${getRiskLinkClassName(riskLabelText)} ${blockedClassName}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className} target={target} rel={rel} title={title} onClick={onClick}>
      {children}
    </Link>
  );
}
