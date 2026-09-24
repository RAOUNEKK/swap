import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import type { AppNotification } from '@/types';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { Bell, ArrowLeftRight, CheckCircle2, CalendarClock } from 'lucide-react';

const ICONS = {
  swap_proposed: ArrowLeftRight,
  swap_accepted: CheckCircle2,
  swap_scheduled: CalendarClock,
};

export function NotificationBell({ onOpenSwap }: { onOpenSwap: (swapId: string) => void }) {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications((data as AppNotification[]) ?? []);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime: new notifications appear without a refresh.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, fetchNotifications]);

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
  };

  const handleClick = (n: AppNotification) => {
    if (!n.read) markRead(n.id);
    setOpen(false);
    if (n.reference_id) onOpenSwap(n.reference_id);
  };

  const messageFor = (n: AppNotification) => {
    const suffix = t(`notif_${n.type}_suffix`);
    if (n.type === 'swap_scheduled' && n.data.scheduled_at) {
      return `${n.data.partner_name} ${suffix} — ${formatDateTime(n.data.scheduled_at, lang)}`;
    }
    return `${n.data.partner_name} ${suffix}`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/10"
        aria-label={t('notifications')}
      >
        <Bell className="w-[18px] h-[18px] text-[var(--app-header-text)]" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-terracotta-400 text-white text-[10px] font-black">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} mt-2 w-80 max-w-[90vw] rounded-2xl border-2 border-app-border bg-app-surface shadow-card-hover z-50 overflow-hidden`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-ivory-200">
            <span className="font-display font-bold text-charcoal-800">{t('notifications')}</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-bold text-teal-600 hover:underline">
                {t('mark_all_read')}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-charcoal-300 text-center py-8">{t('no_notifications')}</p>
            ) : (
              notifications.map((n) => {
                const Icon = ICONS[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-ivory-50 ${!n.read ? 'bg-teal-50/50' : ''}`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-ivory-100 flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-charcoal-700 leading-snug">{messageFor(n)}</p>
                      <p className="text-xs text-charcoal-300 mt-0.5">{timeAgo(n.created_at, lang)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-terracotta-400 flex-shrink-0 mt-1.5" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
