import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import type { Swap, SwapStatus } from '@/types';
import { swapStatusLabelsForLang, SWAP_STATUS_COLORS } from '@/types';
import { Avatar } from '@/components/Avatar';
import { getIcon, formatDateTime, timeAgo, hoursFromMinutes } from '@/lib/utils';
import {
  Repeat, Inbox, ArrowLeftRight, Calendar, CheckCircle2,
  Clock, XCircle, ArrowRight, MessageSquare,
} from 'lucide-react';

type Tab = 'active' | 'pending' | 'past';

const ACTIVE_STATUSES: SwapStatus[] = ['accepted', 'scheduled', 'completed'];
const PENDING_STATUSES: SwapStatus[] = ['proposed'];
const PAST_STATUSES: SwapStatus[] = ['confirmed', 'reviewed', 'declined', 'cancelled'];

export function SwapsPage({ onOpenSwap }: { onOpenSwap: (id: string) => void }) {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('active');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const TAB_LABELS: Record<Tab, string> = {
    active: t('active'),
    pending: t('pending'),
    past: t('past'),
  };

  const statusLabels = swapStatusLabelsForLang(lang);

  const fetchSwaps = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('swaps')
      .select(`
        *,
        requester:profiles!swaps_requester_id_profiles_fkey(*),
        provider:profiles!swaps_provider_id_profiles_fkey(*),
        skill_taught:skills_catalog!swaps_skill_taught_id_fkey(*),
        skill_offered:skills_catalog!swaps_skill_offered_id_fkey(*)
      `)
      .or(`requester_id.eq.${user.id},provider_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Fetch swaps error:', error);
      setLoadError(t('load_error'));
      setLoading(false);
      return;
    }
    setSwaps((data as Swap[]) ?? []);

    const { data: msgs } = await supabase
      .from('messages')
      .select('swap_id, read_at, sender_id')
      .in('swap_id', (data as Swap[])?.map((s) => s.id) ?? []);

    if (msgs) {
      const counts: Record<string, number> = {};
      for (const m of msgs as any[]) {
        if (m.sender_id !== user.id && !m.read_at) {
          counts[m.swap_id] = (counts[m.swap_id] || 0) + 1;
        }
      }
      setUnreadCounts(counts);
    }

    setLoading(false);
  }, [user, t]);

  useEffect(() => {
    fetchSwaps();
  }, [fetchSwaps]);

  const filteredSwaps = swaps.filter((s) => {
    if (tab === 'active') return ACTIVE_STATUSES.includes(s.status);
    if (tab === 'pending') return PENDING_STATUSES.includes(s.status);
    return PAST_STATUSES.includes(s.status);
  });

  const counts = {
    active: swaps.filter((s) => ACTIVE_STATUSES.includes(s.status)).length,
    pending: swaps.filter((s) => PENDING_STATUSES.includes(s.status)).length,
    past: swaps.filter((s) => PAST_STATUSES.includes(s.status)).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-16">
        <p className="text-sm font-bold text-red-500">{loadError}</p>
        <button
          onClick={() => fetchSwaps()}
          className="mt-4 rounded-full border-2 border-app-border bg-app-surface px-4 py-2 text-sm font-black text-app-text shadow-[3px_3px_0_var(--app-shadow)] transition-all hover:-translate-y-0.5"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-charcoal-800">{t('my_swaps')}</h1>
        <p className="mt-1 text-charcoal-400 text-sm">
          {t('manage_swaps')}
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-white rounded-xl border border-ivory-200 w-fit">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t2) => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === t2
                ? 'bg-teal-500 text-white'
                : 'text-charcoal-500 hover:text-charcoal-700 hover:bg-ivory-50'
            }`}
          >
            {TAB_LABELS[t2]}
            {counts[t2] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t2 ? 'bg-white/20' : 'bg-ivory-200 text-charcoal-500'
              }`}>
                {counts[t2]}
              </span>
            )}
          </button>
        ))}
      </div>

      {filteredSwaps.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ivory-200 text-charcoal-300 mb-3">
            {tab === 'pending' ? <Inbox className="w-7 h-7" /> : <Repeat className="w-7 h-7" />}
          </div>
          <h3 className="text-lg font-display font-semibold text-charcoal-700">
            {tab === 'active' && t('no_active')}
            {tab === 'pending' && t('no_pending')}
            {tab === 'past' && t('no_past')}
          </h3>
          <p className="mt-1 text-sm text-charcoal-400 max-w-sm mx-auto">
            {tab === 'active' && t('active_desc')}
            {tab === 'pending' && t('pending_desc')}
            {tab === 'past' && t('past_desc')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSwaps.map((swap) => {
            const isRequester = user?.id === swap.requester_id;
            const partner = (isRequester ? swap.provider : swap.requester) as any;
            const TaughtIcon = getIcon(swap.skill_taught?.icon || '');
            const OfferedIcon = getIcon(swap.skill_offered?.icon || '');
            const unread = unreadCounts[swap.id] || 0;

            return (
              <button
                key={swap.id}
                onClick={() => onOpenSwap(swap.id)}
                className="card p-5 w-full text-left hover:shadow-card-hover transition-all group"
              >
                <div className="flex items-center gap-4">
                  <Avatar
                    name={partner?.display_name || ''}
                    avatarUrl={partner?.avatar_url}
                    size="md"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-charcoal-800 truncate">
                        {partner?.display_name}
                      </h3>
                      <span className={`badge ${SWAP_STATUS_COLORS[swap.status]}`}>
                        {statusLabels[swap.status]}
                      </span>
                      {unread > 0 && (
                        <span className="badge bg-teal-500 text-white">
                          <MessageSquare className="w-2.5 h-2.5" /> {unread}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-charcoal-500">
                      <span className="flex items-center gap-1.5">
                        <TaughtIcon className="w-3.5 h-3.5 text-teal-500" />
                        {swap.skill_taught?.name}
                      </span>
                      <ArrowLeftRight className="w-3 h-3 text-charcoal-300" />
                      <span className="flex items-center gap-1.5">
                        <OfferedIcon className="w-3.5 h-3.5 text-terracotta-400" />
                        {swap.skill_offered?.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-charcoal-400">
                      {swap.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDateTime(swap.scheduled_at, lang)}
                        </span>
                      )}
                      <span>{timeAgo(swap.updated_at, lang)}</span>
                      {swap.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {hoursFromMinutes(swap.duration_minutes)}h
                        </span>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-charcoal-200 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
