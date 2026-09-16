import { Outlet } from 'react-router-dom';
import Header from './Header';
import BubbleTabBar from './BubbleTabBar';
import DesktopSidebar from './DesktopSidebar';
import DateStrip from './DateStrip';
import OfflineBanner from './OfflineBanner';

/**
 * Adaptive shell.
 *  - Mobile (< md): Header on top, page body, fixed BubbleTabBar at the bottom.
 *  - Desktop (>= md): DesktopSidebar on the left, page body on the right.
 * The Tailwind `md:` breakpoint (768px) is the single switch point.
 */
export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 md:flex">
      <OfflineBanner />
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        {/* pb-24 keeps content clear of the mobile tab bar; md removes it */}
        <main className="flex-1 px-4 py-4 pb-24 md:px-8 md:py-8 md:pb-8 max-w-6xl w-full mx-auto">
          <DateStrip />
          <Outlet />
        </main>
      </div>

      <BubbleTabBar />
    </div>
  );
}
