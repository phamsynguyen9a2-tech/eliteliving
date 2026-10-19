'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface MotionPageProps {
  children: ReactNode;
  className?: string;
}

const REVEAL_TARGETS = '[data-reveal], [data-reveal-group] > *';

/** Opt-in motion only: content stays visible before hydration and without JS. */
export default function MotionPage({ children, className = '' }: MotionPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const seen = new WeakSet<Element>();
    const pending = new Set<Element>();
    const animations = new Map<Element, Animation>();
    let frame = 0;
    let disposed = false;

    const updateProgress = () => {
      frame = 0;
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      const progress = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    };
    const scheduleProgress = () => {
      if (!frame && !disposed) frame = window.requestAnimationFrame(updateProgress);
    };

    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      let stagger = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        observer?.unobserve(element);
        pending.delete(element);
        seen.add(element);

        // Never animate a focused control or replay content above a restored scroll position.
        if (preference.matches || element.matches(':focus-within') || entry.boundingClientRect.top < 0 || !element.animate) return;
        const direction = element.dataset.reveal;
        const offset = direction === 'left' ? '-18px 0' : direction === 'right' ? '18px 0' : '0 22px';
        const delay = element.parentElement?.hasAttribute('data-reveal-group') ? Math.min(stagger++ * 55, 165) : 0;
        const animation = element.animate(
          [{ opacity: 0, translate: offset }, { opacity: 1, translate: '0 0' }],
          { duration: 560, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' },
        );
        animations.set(element, animation);
        animation.onfinish = animation.oncancel = () => animations.delete(element);
      });
    }, { threshold: 0.08 });

    const register = () => {
      if (!observer || preference.matches) return;
      root.querySelectorAll<HTMLElement>(REVEAL_TARGETS).forEach((element) => {
        if (seen.has(element) || pending.has(element)) return;
        pending.add(element);
        observer.observe(element);
      });
      // Lists can change after filters or requests finish; release removed targets.
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
    const onPreferenceChange = () => {
      if (preference.matches) {
        animations.forEach((animation) => animation.cancel());
        observer?.disconnect();
        pending.clear();
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

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      mutations.disconnect();
      resize?.disconnect();
      animations.forEach((animation) => animation.cancel());
      root.removeEventListener('focusin', onFocus);
      preference.removeEventListener('change', onPreferenceChange);
      window.removeEventListener('scroll', scheduleProgress);
      window.removeEventListener('resize', scheduleProgress);
    };
  }, []);

  return (
    <div ref={rootRef} className={`elite-motion-page ${className}`}>
      <div ref={progressRef} className="elite-scroll-progress" aria-hidden="true" />
      {children}
    </div>
  );
}
