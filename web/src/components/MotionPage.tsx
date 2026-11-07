'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface MotionPageProps {
  children: ReactNode;
  className?: string;
}

const REVEAL_TARGETS = '[data-reveal], [data-reveal-group] > *';
const COUNTER_TARGETS = '[data-count-to]';

/** Opt-in motion only: content stays visible before hydration and without JS. */
export default function MotionPage({ children, className = '' }: MotionPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const seen = new WeakSet<Element>();
    const pending = new Set<Element>();
    const counted = new WeakSet<Element>();
    const animations = new Map<Element, Animation>();
    let frame = 0;
    let pointerFrame = 0;
    let disposed = false;
    let activeTiltCard: HTMLElement | null = null;
    let pointerX = 0;
    let pointerY = 0;

    const updateProgress = () => {
      frame = 0;
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      const progress = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    };
    const scheduleProgress = () => {
      if (!frame && !disposed) frame = window.requestAnimationFrame(updateProgress);
    };

    const animateCounter = (el: HTMLElement) => {
      if (counted.has(el) || preference.matches) return;
      counted.add(el);
      const rawTarget = Number(el.dataset.countTo || '0');
      if (!Number.isFinite(rawTarget) || rawTarget <= 0) return;
      const suffix = el.dataset.countSuffix || '';
      const prefix = el.dataset.countPrefix || '';
      const duration = 1350;
      const startTime = performance.now();

      const step = (now: number) => {
        if (disposed) return;
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.round(rawTarget * eased);
        el.textContent = `${prefix}${current.toLocaleString('vi-VN')}${suffix}`;
        if (t < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    };

    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      let stagger = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        observer?.unobserve(element);
        pending.delete(element);
        seen.add(element);

        if (element.hasAttribute('data-count-to')) {
          animateCounter(element);
        }
        element.querySelectorAll<HTMLElement>(COUNTER_TARGETS).forEach(animateCounter);

        // Never animate a focused control or replay content above a restored scroll position.
        if (preference.matches || element.matches(':focus-within') || entry.boundingClientRect.top < 0 || !element.animate) return;
        const direction = element.dataset.reveal;
        const offset = direction === 'left' ? '-24px 0' : direction === 'right' ? '24px 0' : '0 26px';
        const delay = element.parentElement?.hasAttribute('data-reveal-group') ? Math.min(stagger++ * 65, 260) : 0;
        const animation = element.animate(
          [
            { opacity: 0, translate: offset, scale: '0.968', filter: 'blur(4px)' },
            { opacity: 1, translate: '0 0', scale: '1', filter: 'blur(0px)' },
          ],
          { duration: 680, delay, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' },
        );
        animations.set(element, animation);
        animation.onfinish = animation.oncancel = () => animations.delete(element);
      });
    }, { threshold: 0.08 });

    const register = () => {
      if (!observer || preference.matches) return;
      root.querySelectorAll<HTMLElement>(`${REVEAL_TARGETS}, ${COUNTER_TARGETS}`).forEach((element) => {
        if (seen.has(element) || pending.has(element)) return;
        pending.add(element);
        observer.observe(element);
      });
      pending.forEach((element) => {
        if (!root.contains(element)) {
          observer.unobserve(element);
          pending.delete(element);
        }
      });
      animations.forEach((animation, element) => {
        if (!root.contains(element)) animation.cancel();
      });
    };

    const resetTiltCard = (card: HTMLElement | null) => {
      if (!card) return;
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--spot-opacity', '0');
    };

    const updatePointerEffects = () => {
      pointerFrame = 0;
      if (disposed || preference.matches || coarsePointer.matches) return;

      if (auraRef.current) {
        auraRef.current.style.opacity = '1';
        auraRef.current.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
      }

      const targetEl = document.elementFromPoint(pointerX, pointerY) as HTMLElement | null;
      const card = targetEl?.closest<HTMLElement>('.elite-spotlight-card, .elite-tilt-card') ?? null;

      if (activeTiltCard && activeTiltCard !== card) {
        resetTiltCard(activeTiltCard);
      }
      activeTiltCard = card;

      if (card) {
        const rect = card.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const localX = pointerX - rect.left;
          const localY = pointerY - rect.top;
          card.style.setProperty('--spot-x', `${localX.toFixed(1)}px`);
          card.style.setProperty('--spot-y', `${localY.toFixed(1)}px`);
          card.style.setProperty('--spot-opacity', '1');

          if (card.classList.contains('elite-tilt-card')) {
            const normX = (localX / rect.width) - 0.5;
            const normY = (localY / rect.height) - 0.5;
            const maxDeg = Number(card.dataset.tiltMax || '2.8');
            const rx = (-normY * maxDeg * 2).toFixed(2);
            const ry = (normX * maxDeg * 2).toFixed(2);
            card.style.setProperty('--rx', `${rx}deg`);
            card.style.setProperty('--ry', `${ry}deg`);
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (preference.matches || coarsePointer.matches) return;
      pointerX = e.clientX;
      pointerY = e.clientY;
      if (!pointerFrame && !disposed) {
        pointerFrame = window.requestAnimationFrame(updatePointerEffects);
      }
    };

    const onPointerLeaveWindow = () => {
      if (auraRef.current) auraRef.current.style.opacity = '0';
      resetTiltCard(activeTiltCard);
      activeTiltCard = null;
    };

    const onPreferenceChange = () => {
      if (preference.matches) {
        animations.forEach((animation) => animation.cancel());
        observer?.disconnect();
        pending.clear();
        resetTiltCard(activeTiltCard);
      } else {
        register();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Node)) return;
      const target = event.target;
      animations.forEach((animation, element) => {
        if (element.contains(target)) animation.cancel();
      });
    };

    register();
    updateProgress();
    const mutations = new MutationObserver(() => {
      register();
      scheduleProgress();
    });
    mutations.observe(root, { childList: true, subtree: true });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleProgress);
    resize?.observe(root);
    root.addEventListener('focusin', onFocus);
    preference.addEventListener('change', onPreferenceChange);
    window.addEventListener('scroll', scheduleProgress, { passive: true });
    window.addEventListener('resize', scheduleProgress);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeaveWindow);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(pointerFrame);
      resetTiltCard(activeTiltCard);
      observer?.disconnect();
      mutations.disconnect();
      resize?.disconnect();
      animations.forEach((animation) => animation.cancel());
      root.removeEventListener('focusin', onFocus);
      preference.removeEventListener('change', onPreferenceChange);
      window.removeEventListener('scroll', scheduleProgress);
      window.removeEventListener('resize', scheduleProgress);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeaveWindow);
    };
  }, []);

  return (
    <div ref={rootRef} className={`elite-motion-page ${className}`}>
      <div ref={progressRef} className="elite-scroll-progress" aria-hidden="true" />
      <div ref={auraRef} className="elite-cursor-aura" aria-hidden="true" />
      {children}
    </div>
  );
}
