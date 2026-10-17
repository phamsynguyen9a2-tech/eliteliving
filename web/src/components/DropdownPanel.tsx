'use client';

import { useEffect, useRef, type Dispatch, type ReactNode, type SetStateAction } from 'react';

interface DropdownPanelProps {
  id: string;
  triggerId: string;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  className?: string;
  children: ReactNode;
}

/** Keep the panel mounted so both opening and closing can transition. */
export default function DropdownPanel({
  id, triggerId, open, onOpenChange, className = '', children,
}: DropdownPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const isOutside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      return !panelRef.current?.contains(target)
        && !document.getElementById(triggerId)?.contains(target);
    };
    const dismissOutside = (event: PointerEvent | FocusEvent) => {
      if (isOutside(event.target)) onOpenChange(false);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onOpenChange(false);
      document.getElementById(triggerId)?.focus();
    };

    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('focusin', dismissOutside);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('focusin', dismissOutside);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [open, onOpenChange, triggerId]);

  return (
    <div
      ref={panelRef}
      id={id}
      aria-labelledby={triggerId}
      aria-hidden={!open}
      inert={!open}
      data-state={open ? 'open' : 'closed'}
      className={`elite-dropdown-panel ${className}`}
    >
      {children}
    </div>
  );
}
