'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SwipeRailProps {
  children: ReactNode;
  label: string;
  className?: string;
  tone?: 'light' | 'dark';
}

type Drag = {
  pointerId: number;
  startX: number;
  startY: number;
  startScroll: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  moved: boolean;
};

/** Native touch/trackpad scrolling, with mouse dragging and optional momentum. */
export default function SwipeRail({ children, label, className = '', tone = 'light' }: SwipeRailProps) {
  const id = useId();
  const railRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const frameRef = useRef(0);
  const suppressClickUntil = useRef(0);
  const [edges, setEdges] = useState({ start: true, end: true });

  const stopMomentum = () => {
    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const updateEdges = () => {
      const start = rail.scrollLeft <= 2;
      const end = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
      setEdges((current) => current.start === start && current.end === end ? current : { start, end });
    };
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onPreferenceChange = () => {
      if (preference.matches) stopMomentum();
    };
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateEdges);
    resize?.observe(rail);
    for (const child of rail.children) resize?.observe(child);
    updateEdges();
    rail.addEventListener('scroll', updateEdges, { passive: true });
    window.addEventListener('resize', updateEdges);
    preference.addEventListener('change', onPreferenceChange);
    return () => {
      stopMomentum();
      resize?.disconnect();
      rail.removeEventListener('scroll', updateEdges);
      window.removeEventListener('resize', updateEdges);
      preference.removeEventListener('change', onPreferenceChange);
    };
  }, [children]);

  const move = (direction: -1 | 1) => {
    stopMomentum();
    const rail = railRef.current;
    rail?.scrollBy({
      left: direction * rail.clientWidth * 0.7,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    stopMomentum();
    suppressClickUntil.current = 0;
    // Touch keeps the browser's native inertia and vertical page gestures.
    if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary) return;
    const rail = event.currentTarget;
    if (rail.scrollWidth <= rail.clientWidth) return;
    dragRef.current = {
      pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      startScroll: rail.scrollLeft, lastX: event.clientX, lastTime: performance.now(), velocity: 0, moved: false,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (!drag.moved) {
      if (Math.abs(distance) < 7 || Math.abs(distance) < Math.abs(event.clientY - drag.startY)) return;
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = 'true';
    }
    event.preventDefault();
    const now = performance.now();
    drag.velocity = (drag.lastX - event.clientX) / Math.max(1, now - drag.lastTime);
    drag.lastX = event.clientX;
    drag.lastTime = now;
    event.currentTarget.scrollLeft = drag.startScroll - distance;
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rail = event.currentTarget;
    dragRef.current = null;
    delete rail.dataset.dragging;
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    if (!drag.moved) return;
    suppressClickUntil.current = performance.now() + 400;
    if (cancelled || performance.now() - drag.lastTime > 100 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let velocity = Math.max(-1.8, Math.min(1.8, drag.velocity));
    let previousTime = performance.now();
    const coast = (now: number) => {
      const elapsed = Math.min(now - previousTime, 32);
      previousTime = now;
      const previousScroll = rail.scrollLeft;
      rail.scrollLeft += velocity * elapsed;
      velocity *= Math.pow(0.92, elapsed / 16.67);
      if (Math.abs(velocity) > 0.025 && Math.abs(rail.scrollLeft - previousScroll) > 0.1) {
        frameRef.current = window.requestAnimationFrame(coast);
      } else {
        frameRef.current = 0;
      }
    };
    frameRef.current = window.requestAnimationFrame(coast);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  };

  return (
    <div className={`elite-swipe-shell ${className}`} data-tone={tone}>
      <div
        id={id}
        ref={railRef}
        className="elite-swipe-rail"
        role="region"
        aria-label={label}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishDrag(event)}
        onPointerCancel={(event) => finishDrag(event, true)}
        onLostPointerCapture={(event) => finishDrag(event, true)}
        onPointerLeave={(event) => { if (!dragRef.current?.moved) finishDrag(event, true); }}
        onWheel={stopMomentum}
        onKeyDown={handleKeyDown}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (event.detail > 0 && performance.now() < suppressClickUntil.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onFocusCapture={() => stopMomentum()}
      >
        {children}
      </div>
      {!(edges.start && edges.end) && (
        <div className="elite-swipe-controls">
          <span className="elite-swipe-hint">Kéo hoặc vuốt để khám phá</span>
          <div className="flex gap-1.5">
            <button type="button" className="elite-swipe-arrow" aria-label={`Cuộn trái: ${label}`} aria-controls={id} disabled={edges.start} onClick={() => move(-1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className="elite-swipe-arrow" aria-label={`Cuộn phải: ${label}`} aria-controls={id} disabled={edges.end} onClick={() => move(1)}>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
