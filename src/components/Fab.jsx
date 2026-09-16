import { motion } from 'framer-motion';

/**
 * Floating "+" action button. Sits above the mobile tab bar; bottom-right on
 * desktop.
 */
export default function Fab({ onClick, label }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      className="fixed right-5 z-40 h-14 w-14 rounded-full bg-brand text-white text-3xl leading-none shadow-lg shadow-brand/40 grid place-items-center"
      style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      +
    </motion.button>
  );
}
