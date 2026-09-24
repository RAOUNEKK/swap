import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import type { Swap, Review, UserSkill } from '@/types';
import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { getIcon, timeAgo } from '@/lib/utils';
import {
  Star, Repeat, BookOpen, GraduationCap, Award, CheckCircle2,
} from 'lucide-react';

export function DashboardPage({ onViewProfile }: { onViewProfile: (userId: string) => void }) {
  const { user, profile } = useAuth();
  const { t, lang } = useI18n();
  const [recentSwaps, setRecentSwaps] = useState<Swap[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [mySkills, setMySkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;

    const [swapsRes, countRes, reviewsRes, skillsRes] = await Promise.all([
      supabase
        .from('swaps')
        .select(`
          *,
          requester:profiles!swaps_requester_id_profiles_fkey(*),
          provider:profiles!swaps_provider_id_profiles_fkey(*),
          skill_taught:skills_catalog!swaps_skill_taught_id_fkey(*),
          skill_offered:skills_catalog!swaps_skill_offered_id_fkey(*)
        `)
        .or(`requester_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .limit(5),
      supabase
        .from('swaps')
        .select('id', { count: 'exact', head: true })
        .or(`requester_id.eq.${user.id},provider_id.eq.${user.id}`)
        .in('status', ['confirmed', 'reviewed']),
      supabase
        .from('reviews')
        .select('*, skill:skills_catalog(*)')
        .eq('reviewee_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('user_skills')
        .select('*, skill:skills_catalog(*)')
        .eq('user_id', user.id),
    ]);

    setRecentSwaps((swapsRes.data as Swap[]) ?? []);
    setCompletedCount(countRes.count ?? 0);
    setReviews((reviewsRes.data as Review[]) ?? []);
    setMySkills((skillsRes.data as UserSkill[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  const teachSkills = mySkills.filter((s) => s.can_teach);
  const learnSkills = mySkills.filter((s) => s.wants_to_learn);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-charcoal-800">{t('dashboard_title')}</h1>
        <p className="mt-1 text-charcoal-400 text-sm">
          {t('dashboard_sub')}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t('completed_swaps')}
          value={String(completedCount)}
          subtitle={t('swaps')}
          icon={CheckCircle2}
          color="sage"
        />
        <StatCard
          label={t('rating')}
          value={(profile?.rating_avg ?? 0) > 0 ? (profile!.rating_avg as number).toFixed(1) : t('new_member')}
          subtitle={profile?.rating_count ? `${profile!.rating_count} ${t('reviews')}` : t('no_reviews_yet')}
          icon={Star}
          color="coral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Skills + recent swaps */}
        <div className="lg:col-span-2 space-y-6">
          {/* My skills */}
          <div className="card p-5">
            <h2 className="font-display font-semibold text-charcoal-800 mb-4">{t('my_skills')}</h2>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-terracotta-400" />
                  <p className="text-sm font-medium text-charcoal-600">{t('teaching')} ({teachSkills.length})</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {teachSkills.length === 0 ? (
                    <span className="text-xs text-charcoal-300">{t('no_teaching_skills')}</span>
                  ) : (
                    teachSkills.map((s) => {
                      const Icon = getIcon(s.skill?.icon || '');
                      return (
                        <span key={s.id} className="skill-tag-terracotta">
                          <Icon className="w-3 h-3" />
                          {s.skill?.name}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4 text-sage-500" />
                  <p className="text-sm font-medium text-charcoal-600">{t('learning')} ({learnSkills.length})</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {learnSkills.length === 0 ? (
                    <span className="text-xs text-charcoal-300">{t('no_learning_skills')}</span>
                  ) : (
                    learnSkills.map((s) => {
                      const Icon = getIcon(s.skill?.icon || '');
                      return (
                        <span key={s.id} className="skill-tag-language">
                          <Icon className="w-3 h-3" />
                          {s.skill?.name}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent swaps */}
          <div className="card p-5">
            <h2 className="font-display font-semibold text-charcoal-800 mb-4">{t('recent_activity')}</h2>
            {recentSwaps.length === 0 ? (
              <div className="text-center py-6">
                <Repeat className="w-8 h-8 text-charcoal-200 mx-auto mb-2" />
                <p className="text-sm text-charcoal-400">{t('no_swaps_yet')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSwaps.map((swap) => {
                  const isRequester = user?.id === swap.requester_id;
                  const partner = (isRequester ? swap.provider : swap.requester) as any;
                  const TaughtIcon = getIcon(swap.skill_taught?.icon || '');

                  return (
                    <button
                      key={swap.id}
                      onClick={() => partner && onViewProfile(partner.id)}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-ivory-50 transition-colors w-full text-left"
                    >
                      <Avatar name={partner?.display_name || ''} avatarUrl={partner?.avatar_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal-700 truncate">
                          {partner?.display_name}
                        </p>
                        <p className="text-xs text-charcoal-400 flex items-center gap-1">
                          <TaughtIcon className="w-3 h-3" />
                          {swap.skill_taught?.name}
                        </p>
                      </div>
                      <span className="text-xs text-charcoal-300 flex-shrink-0">
                        {timeAgo(swap.updated_at, lang)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: reviews (anonymous — never shows who rated you) */}
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-charcoal-800">{t('reviews')}</h2>
              <Award className="w-4 h-4 text-charcoal-300" />
            </div>
            {reviews.length === 0 ? (
              <div className="text-center py-6">
                <Star className="w-8 h-8 text-charcoal-200 mx-auto mb-2" />
                <p className="text-sm text-charcoal-400">{t('no_reviews')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="p-3 rounded-xl bg-ivory-50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-charcoal-500">{t('anonymous_swapper')}</span>
                      {review.skill && (
                        <span className="text-xs text-charcoal-300">· {review.skill.name}</span>
                      )}
                      <StarRating value={review.rating} size={12} />
                    </div>
                    {review.body && (
                      <p className="text-xs text-charcoal-500 italic">"{review.body}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: typeof Star;
  color: 'teal' | 'sage' | 'terracotta' | 'coral';
}) {
  const colorMap = {
    teal: 'bg-teal-50 text-teal-600',
    sage: 'bg-sage-50 text-sage-600',
    terracotta: 'bg-terracotta-50 text-terracotta-400',
    coral: 'bg-coral-50 text-coral-500',
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-charcoal-400">{label}</span>
        <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-charcoal-800">{value}</p>
      <p className="text-xs text-charcoal-300 mt-0.5">{subtitle}</p>
    </div>
  );
}
