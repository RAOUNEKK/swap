import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import type { Swap, Message, Profile, Skill, SwapStatus, Review } from '@/types';
import { swapStatusLabelsForLang, SWAP_STATUS_COLORS } from '@/types';
import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { Modal } from '@/components/Modal';
import { getIcon, formatDateTime, formatTime, timeAgo, hoursFromMinutes } from '@/lib/utils';
import {
  ArrowLeft, ArrowLeftRight, Send, Check, X, Calendar, Clock,
  CheckCircle2, Star, MessageSquare, AlertCircle, Repeat,
} from 'lucide-react';

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney',
];

export function SwapDetailPage({
  swapId,
  onBack,
  onViewProfile,
}: {
  swapId: string;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}) {
  const { user, profile, refreshProfile } = useAuth();
  const { t, lang } = useI18n();
  const [swap, setSwap] = useState<Swap | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const [schedDate, setSchedDate] = useState('');
  const [schedHour, setSchedHour] = useState(18);
  const [schedDuration, setSchedDuration] = useState(60);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesSubscription = useRef<any>(null);

  const statusLabels = swapStatusLabelsForLang(lang);

  const fetchSwap = useCallback(async () => {
    const { data, error } = await supabase
      .from('swaps')
      .select(`
        *,
        requester:profiles!swaps_requester_id_profiles_fkey(*),
        provider:profiles!swaps_provider_id_profiles_fkey(*),
        skill_taught:skills_catalog!swaps_skill_taught_id_fkey(*),
        skill_offered:skills_catalog!swaps_skill_offered_id_fkey(*)
      `)
      .eq('id', swapId)
      .maybeSingle();

    if (error) {
      console.error('Fetch swap error:', error);
      return;
    }
    setSwap(data as Swap);
  }, [swapId]);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('swap_id', swapId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch messages error:', error);
      return;
    }
    setMessages((data as Message[]) ?? []);

    if (user && data) {
      const unread = (data as Message[]).filter(
        (m) => m.sender_id !== user.id && !m.read_at
      );
      if (unread.length > 0) {
        for (const m of unread) {
          await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', m.id);
        }
      }
    }
  }, [swapId, user]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchSwap();
      await fetchMessages();
      setLoading(false);
    })();
  }, [fetchSwap, fetchMessages]);

  useEffect(() => {
    messagesSubscription.current = supabase
      .channel(`messages:${swapId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `swap_id=eq.${swapId}` },
        () => fetchMessages()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'swaps', filter: `id=eq.${swapId}` },
        () => fetchSwap()
      )
      .subscribe();

    return () => {
      messagesSubscription.current?.unsubscribe();
    };
  }, [swapId, fetchSwap, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const body = newMessage.trim();
    setNewMessage('');

    const { data, error } = await supabase
      .from('messages')
      .insert({ swap_id: swapId, sender_id: user.id, body })
      .select('*')
      .single();

    if (error) {
      console.error('Send message error:', error);
      setNewMessage(body);
      return;
    }

    setMessages((prev) => [...prev, data as Message]);
  };

  const updateSwapStatus = async (status: SwapStatus, extra: Record<string, any> = {}) => {
    setActionLoading(true);
    const { error } = await supabase
      .from('swaps')
      .update({ status, ...extra })
      .eq('id', swapId);

    if (error) {
      console.error('Update swap error:', error);
    } else {
      await fetchSwap();
    }
    setActionLoading(false);
  };

  const handleAccept = () => updateSwapStatus('accepted');
  const handleDecline = () => updateSwapStatus('declined', { declined_at: new Date().toISOString() });
  const handleCancel = () => updateSwapStatus('cancelled', { cancelled_at: new Date().toISOString() });

  const handleSchedule = async () => {
    if (!schedDate) return;
    const scheduledAt = new Date(`${schedDate}T${String(schedHour).padStart(2, '0')}:00:00`).toISOString();
    await updateSwapStatus('scheduled', {
      scheduled_at: scheduledAt,
      duration_minutes: schedDuration,
    });
    setShowSchedule(false);
  };

  const handleMarkComplete = async () => {
    if (!swap || !user) return;
    const isRequester = user.id === swap.requester_id;
    // Only ever set our own completion flag. The database (trg_swap_auto_complete)
    // is the single source of truth for flipping the swap to 'completed' once
    // BOTH sides are done — this avoids a race where two near-simultaneous
    // client reads both think they're "the second" to finish.
    const updates = isRequester
      ? { requester_completed: true }
      : { provider_completed: true };

    setActionLoading(true);
    const { error } = await supabase.from('swaps').update(updates).eq('id', swapId);
    if (error) {
      console.error('Mark complete error:', error);
    } else {
      await fetchSwap();
    }
    setActionLoading(false);
  };

  const handleConfirmAndLedger = async () => {
    if (!swap || !user) return;
    setActionLoading(true);

    // Server-side RPC: validates the caller is a participant, atomically
    // flips completed -> confirmed exactly once, and settles the hours
    // ledger + both balances. All of that must happen server-side because
    // RLS only lets each user write their own profile row.
    const { error } = await supabase.rpc('confirm_swap_and_settle_ledger', {
      p_swap_id: swapId,
    });

    if (error) {
      console.error('Confirm error:', error);
      setActionLoading(false);
      return;
    }

    await fetchSwap();
    await refreshProfile();
    setActionLoading(false);
  };

  const handleSubmitReview = async () => {
    if (!swap || !user) return;
    const revieweeId = user.id === swap.requester_id ? swap.provider_id : swap.requester_id;

    setActionLoading(true);
    const { error } = await supabase.from('reviews').insert({
      swap_id: swapId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating: reviewRating,
      body: reviewBody.trim(),
    });

    if (error) {
      console.error('Review error:', error);
      setActionLoading(false);
      return;
    }

    await supabase.from('swaps').update({ status: 'reviewed' }).eq('id', swapId);
    await fetchSwap();
    setReviewSubmitted(true);
    setShowReview(false);
    setActionLoading(false);
  };

  useEffect(() => {
    if (!swap || !user) return;
    (async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('swap_id', swapId)
        .eq('reviewer_id', user.id)
        .maybeSingle();
      setReviewSubmitted(!!data);
    })();
  }, [swap, user, swapId]);

  if (loading || !swap || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  const isRequester = user.id === swap.requester_id;
  const partner = isRequester ? swap.provider : swap.requester;
  const partnerProfile = partner as Profile;
  const myProfile = (isRequester ? swap.requester : swap.provider) as Profile;

  const TaughtIcon = getIcon(swap.skill_taught?.icon || '');
  const OfferedIcon = getIcon(swap.skill_offered?.icon || '');

  const canAct = swap.status === 'proposed' || swap.status === 'accepted' || swap.status === 'scheduled' || swap.status === 'completed';

  const durationLabels: Record<number, string> = {
    30: t('30_min'),
    60: t('1_hour'),
    90: t('1.5_hours'),
    120: t('2_hours'),
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={onBack} className="btn-ghost">
        <ArrowLeft className="w-4 h-4" /> {t('back_to_swaps')}
      </button>

      {/* Swap header card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => partner && onViewProfile(partner.id)}
              className="flex items-center gap-3 text-left rounded-xl transition-opacity hover:opacity-70"
              title={t('view_profile')}
            >
              <Avatar name={partnerProfile?.display_name || ''} avatarUrl={partnerProfile?.avatar_url} size="lg" />
              <div>
                <h1 className="font-display text-xl font-bold text-charcoal-800">
                  {partnerProfile?.display_name}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`badge ${SWAP_STATUS_COLORS[swap.status]}`}>
                    {statusLabels[swap.status]}
                  </span>
                  <span className="text-xs text-charcoal-400">
                    {t('proposed')} {timeAgo(swap.created_at, lang)}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Swap exchange visualization */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
            <p className="text-xs font-semibold text-teal-600 mb-2">
              {isRequester ? t('they_teach_you') : t('you_teach_them')}
            </p>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-teal-100 flex-shrink-0">
                <TaughtIcon className="w-5 h-5 text-teal-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-teal-800 truncate">{swap.skill_taught?.name}</p>
                <p className="text-xs text-teal-500">{swap.skill_taught?.category}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white border border-ivory-200 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-charcoal-400" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-terracotta-50 border border-terracotta-100">
            <p className="text-xs font-semibold text-terracotta-600 mb-2">
              {isRequester ? t('you_teach_them') : t('they_teach_you')}
            </p>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-terracotta-100 flex-shrink-0">
                <OfferedIcon className="w-5 h-5 text-terracotta-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-terracotta-800 truncate">{swap.skill_offered?.name}</p>
                <p className="text-xs text-terracotta-500">{swap.skill_offered?.category}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule info */}
        {swap.scheduled_at && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-sage-50 border border-sage-100">
            <Calendar className="w-4 h-4 text-sage-600" />
            <span className="text-sm font-medium text-sage-700">
              {t('scheduled_for')} {formatDateTime(swap.scheduled_at, lang)}
            </span>
            <span className="text-xs text-sage-500 ml-auto">
              {swap.duration_minutes} {t('min')} ({hoursFromMinutes(swap.duration_minutes)}h)
            </span>
          </div>
        )}

        {/* Completion status */}
        {(swap.requester_completed || swap.provider_completed) && swap.status !== 'confirmed' && swap.status !== 'reviewed' && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-teal-50 border border-teal-100">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span className="text-sm text-teal-700">
              {swap.requester_completed && swap.provider_completed
                ? t('both_marked')
                : swap.requester_completed
                ? t('you_marked_waiting')
                : t('partner_marked_waiting')}
            </span>
          </div>
        )}
      </div>

      {/* Action bar */}
      {canAct && (
        <div className="card p-5">
          {swap.status === 'proposed' && !isRequester && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleAccept} disabled={actionLoading} className="btn-primary flex-1">
                <Check className="w-4 h-4" /> {t('accept_proposal')}
              </button>
              <button onClick={handleDecline} disabled={actionLoading} className="btn-danger flex-1">
                <X className="w-4 h-4" /> {t('decline')}
              </button>
            </div>
          )}

          {swap.status === 'proposed' && isRequester && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-charcoal-400">{t('waiting_for_response')} {partnerProfile?.display_name} {t('to_respond')}</p>
              <button onClick={handleCancel} disabled={actionLoading} className="btn-ghost text-coral-500">
                {t('cancel_proposal')}
              </button>
            </div>
          )}

          {swap.status === 'accepted' && (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <p className="text-sm text-charcoal-400 flex-1">
                {t('proposal_accepted')}
              </p>
              <button onClick={() => setShowSchedule(true)} className="btn-primary">
                <Calendar className="w-4 h-4" /> {t('schedule_session')}
              </button>
              <button onClick={handleCancel} disabled={actionLoading} className="btn-ghost text-coral-500">
                {t('cancel')}
              </button>
            </div>
          )}

          {swap.status === 'scheduled' && (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="text-sm text-charcoal-400 flex-1">
                <p className="font-medium text-charcoal-600">
                  {t('session_on')} {formatDateTime(swap.scheduled_at, lang)}
                </p>
                <p className="text-xs">{t('mark_complete_after')}</p>
              </div>
              <button
                onClick={() => setShowSchedule(true)}
                className="btn-secondary"
              >
                <Calendar className="w-4 h-4" /> {t('reschedule')}
              </button>
              <button
                onClick={handleMarkComplete}
                disabled={actionLoading || (isRequester ? swap.requester_completed : swap.provider_completed)}
                className="btn-primary"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isRequester
                  ? swap.requester_completed ? t('completed') : t('mark_complete')
                  : swap.provider_completed ? t('completed') : t('mark_complete')}
              </button>
            </div>
          )}

          {swap.status === 'completed' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-50 border border-teal-100">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span className="text-sm text-teal-700 font-medium">
                  {t('session_complete')}
                </span>
              </div>
              <button onClick={handleConfirmAndLedger} disabled={actionLoading} className="btn-primary w-full">
                <Check className="w-4 h-4" /> {t('confirm_update_hours')}
              </button>
            </div>
          )}

          {swap.status === 'confirmed' && !reviewSubmitted && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-sage-50 border border-sage-100">
                <Star className="w-4 h-4 text-sage-600" />
                <span className="text-sm text-sage-700 font-medium">
                  {t('swap_confirmed')} {partnerProfile?.display_name}.
                </span>
              </div>
              <button onClick={() => setShowReview(true)} className="btn-primary w-full">
                <Star className="w-4 h-4" /> {t('write_a_review')}
              </button>
            </div>
          )}

          {swap.status === 'confirmed' && reviewSubmitted && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-sage-50 border border-sage-100">
              <CheckCircle2 className="w-4 h-4 text-sage-600" />
              <span className="text-sm text-sage-700">
                {t('youve_reviewed')} {partnerProfile?.display_name}'s {t('review')}
              </span>
            </div>
          )}

          {swap.status === 'reviewed' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-50 border border-teal-100">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span className="text-sm text-teal-700 font-medium">
                {t('swap_complete_reviewed')}
              </span>
            </div>
          )}

          {swap.status === 'declined' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-charcoal-50 border border-charcoal-100">
              <AlertCircle className="w-4 h-4 text-charcoal-400" />
              <span className="text-sm text-charcoal-500">{t('swap_declined')}</span>
            </div>
          )}

          {swap.status === 'cancelled' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-coral-50 border border-coral-100">
              <AlertCircle className="w-4 h-4 text-coral-400" />
              <span className="text-sm text-coral-600">{t('swap_cancelled')}</span>
            </div>
          )}
        </div>
      )}

      {/* Chat */}
      {swap.status !== 'declined' && swap.status !== 'cancelled' && (
        <div className="card flex flex-col h-[400px]">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-ivory-200">
            <MessageSquare className="w-4 h-4 text-charcoal-400" />
            <h3 className="font-display font-semibold text-charcoal-700 text-sm">
              {t('messages_with')} {partnerProfile?.display_name}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-charcoal-200 mx-auto mb-2" />
                <p className="text-sm text-charcoal-400">
                  {t('no_messages')} {partnerProfile?.display_name}!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                        isMine
                          ? 'bg-teal-500 text-white rounded-br-md'
                          : 'bg-ivory-100 text-charcoal-700 rounded-bl-md'
                      }`}
                    >
                      <p>{msg.body}</p>
                      <p className={`text-[10px] mt-1 ${isMine ? 'text-teal-100' : 'text-charcoal-300'}`}>
                        {timeAgo(msg.created_at, lang)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-3 border-t border-ivory-200 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={t('type_message')}
              className="input flex-1"
            />
            <button onClick={sendMessage} disabled={!newMessage.trim()} className="btn-primary">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Schedule modal */}
      <Modal open={showSchedule} onClose={() => setShowSchedule(false)} title={t('schedule_session')} maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="label">{t('date')}</label>
            <input
              type="date"
              value={schedDate}
              onChange={(e) => setSchedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="input"
            />
          </div>
          <div>
            <label className="label">{t('start_time')}</label>
            <select value={schedHour} onChange={(e) => setSchedHour(Number(e.target.value))} className="input">
              {Array.from({ length: 24 }).map((_, h) => (
                <option key={h} value={h}>{formatTime(h, lang)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('duration')}</label>
            <div className="flex gap-2">
              {[
                { val: 30, key: '30_min' as const },
                { val: 60, key: '1_hour' as const },
                { val: 90, key: '1.5_hours' as const },
                { val: 120, key: '2_hours' as const },
              ].map((d) => (
                <button
                  key={d.val}
                  onClick={() => setSchedDuration(d.val)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    schedDuration === d.val
                      ? 'bg-teal-500 text-white'
                      : 'bg-ivory-100 text-charcoal-500 hover:bg-ivory-200'
                  }`}
                >
                  {t(d.key)}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-ivory-50 p-3 text-xs text-charcoal-400">
            <p className="mt-1">{t('equals_ledger')} {hoursFromMinutes(schedDuration)} {t('in_ledger')}</p>
          </div>
          <button onClick={handleSchedule} disabled={!schedDate || actionLoading} className="btn-primary w-full">
            <Calendar className="w-4 h-4" /> {t('schedule_session')}
          </button>
        </div>
      </Modal>

      {/* Review modal */}
      <Modal open={showReview} onClose={() => setShowReview(false)} title={t('review_your_swap')} maxWidth="max-w-md">
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50">
            <Avatar name={partnerProfile?.display_name || ''} avatarUrl={partnerProfile?.avatar_url} size="md" />
            <div>
              <p className="font-medium text-charcoal-700">{partnerProfile?.display_name}</p>
              <p className="text-xs text-charcoal-400">{swap.skill_taught?.name} {t('swap_word')}</p>
            </div>
          </div>

          <div>
            <label className="label">{t('rating')}</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="p-2 transition-all hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-all ${
                      star <= reviewRating
                        ? 'fill-terracotta-300 text-terracotta-300'
                        : 'text-charcoal-200'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">{t('your_review')} <span className="text-charcoal-300 font-normal">{t('review_optional')}</span></label>
            <textarea
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder={t('review_placeholder')}
              className="input min-h-[80px] resize-y"
              maxLength={500}
            />
          </div>

          <button onClick={handleSubmitReview} disabled={actionLoading} className="btn-primary w-full">
            <Star className="w-4 h-4" /> {t('submit_review')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
