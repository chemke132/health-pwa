/**
 * Shared nav config for BubbleTabBar (mobile) and DesktopSidebar (desktop).
 * `labelKey` goes through i18n so tab names are translated.
 * `icon` is an inline emoji to keep the scaffold dependency-free; swap for an
 * icon component later.
 */
export const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.home', icon: '🏠', end: true },
  { to: '/meal', labelKey: 'nav.meal', icon: '🍽️' },
  { to: '/workout', labelKey: 'nav.workout', icon: '🏋️' },
  { to: '/goal', labelKey: 'nav.goal', icon: '🎯' },
];
