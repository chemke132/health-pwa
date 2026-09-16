import { useEffect, useState } from 'react';

/**
 * True while a text field is focused (i.e. the mobile virtual keyboard is
 * likely up). Used to hide the bottom tab bar so it doesn't get pushed over the
 * keyboard and cover the screen.
 *
 * Uses focusin/focusout (works on iOS Safari). When available, visualViewport
 * height shrinkage refines the signal.
 */
const isField = (el) =>
  el &&
  (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onFocusIn = (e) => {
      if (isField(e.target)) setOpen(true);
    };
    const onFocusOut = () => {
      // small delay so focus moving between fields doesn't flicker the tab bar
      setTimeout(() => {
        if (!isField(document.activeElement)) setOpen(false);
      }, 50);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return open;
}
