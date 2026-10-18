"use client";
import { useEffect } from 'react';

// Visual feedback only: never intercept navigation, forms or application actions.
export default function InteractionGlow() {
  useEffect(() => {
    const timers = new Map();
    function illuminate(event) {
      const control = event.target instanceof Element
        ? event.target.closest('button, a[href], input[type="submit"], [role="button"]') : null;
      if (!control || control.matches(':disabled, [aria-disabled="true"]')) return;
      clearTimeout(timers.get(control));
      control.setAttribute('data-cmd-glow', 'true');
      timers.set(control, setTimeout(() => {
        control.removeAttribute('data-cmd-glow');
        timers.delete(control);
      }, 850));
    }
    document.addEventListener('click', illuminate, true);
    return () => {
      document.removeEventListener('click', illuminate, true);
      timers.forEach((timer, control) => {
        clearTimeout(timer);
        control.removeAttribute('data-cmd-glow');
      });
    };
  }, []);
  return null;
}
