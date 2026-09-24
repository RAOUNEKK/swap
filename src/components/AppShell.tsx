import { useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/Avatar';
import { ToggleControls } from '@/components/ToggleControls';
import { NotificationBell } from '@/components/NotificationBell';
import { Compass, LayoutDashboard, Menu, Repeat, LogOut, X } from 'lucide-react';

export type Route = 'discover' | 'dashboard' | 'swaps' | 'profile';
interface AppShellProps { currentRoute: Route; onNavigate: (route: Route) => void; onOpenSwap: (swapId: string) => void; children: ReactNode; }

export function AppShell({ currentRoute, onNavigate, onOpenSwap, children }: AppShellProps) {
  const { profile, signOut } = useAuth();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV_ITEMS: { route: Route; label: string; icon: typeof Compass }[] = [
    { route: 'discover', label: t('discover'), icon: Compass },
    { route: 'swaps', label: t('my_swaps'), icon: Repeat },
    { route: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
  ];

  const handleNav = (route: Route) => { onNavigate(route); setMobileOpen(false); };

  return (
    <div className="min-h-screen bg-app-bg">
      <header className="sticky top-0 z-30 border-b-2 border-app-border bg-[var(--app-header-bg)]">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <button onClick={() => handleNav('discover')}><Logo className="[&>div]:bg-[var(--app-header-active-bg)] [&>div]:text-[var(--app-header-active-text)] [&>div]:border-2 [&>div]:border-app-border [&>span]:text-[var(--app-header-text)]" /></button>
            <nav className="hidden items-center gap-1 md:flex">{NAV_ITEMS.map((item) => {
              const active = currentRoute === item.route;
              return <button key={item.route} onClick={() => handleNav(item.route)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition-all ${active ? 'bg-[var(--app-header-active-bg)] text-[var(--app-header-active-text)]' : 'text-[var(--app-header-text)] hover:bg-black/10 dark:hover:bg-white/10'}`}><item.icon className="h-4 w-4" />{item.label}</button>;
            })}</nav>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell onOpenSwap={onOpenSwap} />
            <ToggleControls />
            {profile && <button onClick={() => handleNav('profile')} className={`flex items-center gap-2 rounded-full p-1 pr-3 transition-all ${currentRoute === 'profile' ? 'bg-[var(--app-header-active-bg)]' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}><Avatar name={profile.display_name} avatarUrl={profile.avatar_url} size="sm" /><span className={`hidden text-sm font-black sm:block max-w-[100px] truncate ${currentRoute === 'profile' ? 'text-[var(--app-header-active-text)]' : 'text-[var(--app-header-text)]'}`}>{profile.display_name}</span></button>}
            <button onClick={() => signOut()} className="hidden rounded-full p-2 text-[var(--app-header-text)] transition-all hover:bg-black/10 dark:hover:bg-white/10 md:flex" title={t('sign_out')}><LogOut className="h-4 w-4" /></button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-full p-2 text-[var(--app-header-text)] hover:bg-black/10 dark:hover:bg-white/10 md:hidden">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        {mobileOpen && <div className="border-t-2 border-app-border bg-[var(--app-header-bg)] md:hidden"><nav className="mx-auto max-w-6xl space-y-1 px-4 py-3">{NAV_ITEMS.map((item) => { const active = currentRoute === item.route; return <button key={item.route} onClick={() => handleNav(item.route)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black transition-all ${active ? 'bg-[var(--app-header-active-bg)] text-[var(--app-header-active-text)]' : 'text-[var(--app-header-text)] hover:bg-black/10 dark:hover:bg-white/10'}`}><item.icon className="h-4 w-4" />{item.label}</button>; })}<button onClick={() => signOut()} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black text-[var(--app-header-text)] hover:bg-black/10 dark:hover:bg-white/10"><LogOut className="h-4 w-4" />{t('sign_out')}</button></nav></div>}
      </header>
      <main key={currentRoute} className="mx-auto max-w-6xl px-4 py-8 animate-fade-in sm:px-6">{children}</main>
    </div>
  );
}
