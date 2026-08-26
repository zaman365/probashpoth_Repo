'use client';

import type { FocusEvent, MouseEvent, ReactNode } from 'react';
import { useEffect, useRef } from 'react';

export function DismissibleDetails({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeFromOutside(event: PointerEvent) {
      const details = detailsRef.current;
      if (!details?.open || !(event.target instanceof Node) || details.contains(event.target))
        return;
      details.open = false;
    }

    function closeFromKeyboard(event: KeyboardEvent) {
      const details = detailsRef.current;
      if (event.key !== 'Escape' || !details?.open) return;

      event.preventDefault();
      details.open = false;
      details.querySelector<HTMLElement>('summary')?.focus();
    }

    document.addEventListener('pointerdown', closeFromOutside);
    document.addEventListener('keydown', closeFromKeyboard);

    return () => {
      document.removeEventListener('pointerdown', closeFromOutside);
      document.removeEventListener('keydown', closeFromKeyboard);
    };
  }, []);

  function closeAfterSelection(event: MouseEvent<HTMLDetailsElement>) {
    if (!(event.target instanceof Element) || !event.target.closest('[data-dismiss-details]'))
      return;
    if (detailsRef.current) detailsRef.current.open = false;
  }

  function closeAfterFocusLeaves(event: FocusEvent<HTMLDetailsElement>) {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))
      return;
    event.currentTarget.open = false;
  }

  return (
    <details
      ref={detailsRef}
      className={className}
      onBlur={closeAfterFocusLeaves}
      onClick={closeAfterSelection}
    >
      {children}
    </details>
  );
}
