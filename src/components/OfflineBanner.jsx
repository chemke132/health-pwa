import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * Subtle toast shown only while offline. Sits at the top, below the header,
 * out of the way. Data still saves locally (see the offline outbox).
 */
export default function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnlineStatus();

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed top-3 inset-x-0 z-[60] flex justify-center pointer-events-none px-4"
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-800/90 dark:bg-slate-200/90 text-white dark:text-slate-900 text-xs font-semibold px-4 py-2 shadow-lg backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            {t('offline.message')}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
