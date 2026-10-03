'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
  label?: ReactNode;
  content: ReactNode;
  ariaLabel?: string;
  direction?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

const SHOW_DELAY_MS = 150;
const HIDE_DELAY_MS = 100;
const VIEWPORT_MARGIN = 16;
const TOOLTIP_GAP = 8;

interface TooltipPosition {
  top: number;
  left: number;
  arrowLeft: number;
}

export default function InfoTooltip({
  label,
  content,
  ariaLabel,
  direction = 'top',
  align = 'center',
  className = '',
}: InfoTooltipProps) {
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    showTimerRef.current = null;
    hideTimerRef.current = null;
  }

  function scheduleOpen() {
    clearTimers();
    showTimerRef.current = setTimeout(() => setIsOpen(true), SHOW_DELAY_MS);
  }

  function scheduleClose() {
    clearTimers();
    hideTimerRef.current = setTimeout(() => setIsOpen(false), HIDE_DELAY_MS);
  }

  function keepOpen() {
    clearTimers();
    setIsOpen(true);
  }

  function toggleOpen() {
    clearTimers();
    setIsOpen((current) => !current);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Escape') return;
    clearTimers();
    setIsOpen(false);
  }

  useEffect(() => clearTimers, []);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    function placeTooltip() {
      if (!trigger || !tooltip) return;
      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      let left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      if (align === 'start') left = triggerRect.left;
      if (align === 'end') left = triggerRect.right - tooltipRect.width;
      left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - tooltipRect.width - VIEWPORT_MARGIN);

      const top = direction === 'top'
        ? triggerRect.top - tooltipRect.height - TOOLTIP_GAP
        : triggerRect.bottom + TOOLTIP_GAP;
      const triggerCenter = triggerRect.left + triggerRect.width / 2;
      const arrowLeft = Math.min(Math.max(triggerCenter - left, 12), tooltipRect.width - 12);
      setPosition({ top, left, arrowLeft });
    }

    function closeOnScroll() {
      clearTimers();
      setIsOpen(false);
    }

    placeTooltip();
    window.addEventListener('resize', placeTooltip);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      window.removeEventListener('resize', placeTooltip);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [align, direction, isOpen]);

  const tooltip = isOpen && typeof document !== 'undefined' ? createPortal(
    <span
      ref={tooltipRef}
      id={tooltipId}
      role="tooltip"
      onMouseEnter={keepOpen}
      onMouseLeave={scheduleClose}
      className="fixed w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-[var(--text-primary)] p-3 text-left text-xs leading-relaxed text-[var(--bg-secondary)] shadow-xl"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? 'visible' : 'hidden',
        zIndex: 'var(--z-popover)',
      }}
    >
      {content}
      <span
        aria-hidden="true"
        className={`absolute -translate-x-1/2 border-8 border-transparent ${direction === 'top' ? 'top-full border-t-[var(--text-primary)]' : 'bottom-full border-b-[var(--text-primary)]'}`}
        style={{ left: position?.arrowLeft ?? 16 }}
      />
    </span>,
    document.body,
  ) : null;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center ${className}`}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-describedby={isOpen ? tooltipId : undefined}
        onClick={toggleOpen}
        onFocus={scheduleOpen}
        onBlur={scheduleClose}
        onKeyDown={handleKeyDown}
        className="inline-flex min-h-7 min-w-7 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)]"
      >
        {label}
        <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {tooltip}
    </span>
  );
}
