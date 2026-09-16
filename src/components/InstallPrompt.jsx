import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const DISMISS_KEY = 'install_dismissed';

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream
  );
}

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * In-app install helper. Rendered globally (login + main), because iOS never
 * shows an automatic install prompt.
 *  - Chromium (Android/desktop): captures beforeinstallprompt → "Install" button.
 *  - iOS Safari: shows the manual "Share → Add to Home Screen" hint.
 * Hidden when already installed or dismissed.
 */
export default function InstallPrompt() {
  const { t } = useTranslation();
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    const onInstalled = () => setShow(false);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS can't fire beforeinstallprompt → show the manual hint instead.
    if (isIOS()) setShow(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      setShow(false);
    } else {
      // iOS: no programmatic install; reveal the instructions.
      setShowIosHelp((v) => !v);
    }
  };

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-x-0 z-[55] flex justify-center px-4 bottom-24 md:bottom-6"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="w-full max-w-md rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💪</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{t('install.title')}</p>
                <p className="text-xs opacity-70 truncate">{t('install.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={handleInstall}
                className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white"
              >
                {deferred ? t('install.button') : t('install.how')}
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label={t('install.dismiss')}
                className="shrink-0 h-8 w-8 grid place-items-center rounded-full opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>
            {showIosHelp && (
              <p className="mt-3 text-xs opacity-80 border-t border-white/15 dark:border-black/10 pt-3">
                {t('install.iosHelp')}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
