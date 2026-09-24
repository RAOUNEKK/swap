import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import type { UserSkill, Review, SkillRatingSummary, Swap, Profile } from '@/types';
import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { Modal } from '@/components/Modal';
import { getIcon, timeAgo } from '@/lib/utils';
import { ArrowLeft, MapPin, BookOpen, GraduationCap, Star, Award } from 'lucide-react';

interface SkillRatingRow extends SkillRatingSummary {
  skill_name: string;
  skill_icon: string;
}

export function PublicProfilePage({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { t, lang } = useI18n();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [teachSkills, setTeachSkills] = useState<UserSkill[]>([]);
  const [learnSkills, setLearnSkills] = useState<UserSkill[]>([]);
  const [skillRatings, setSkillRatings] = useState<SkillRatingRow[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratableSwap, setRatableSwap] = useState<Swap | null>(null);
  const [loading, setLoading] = useState(true);

  const [showRate, setShowRate] = useState(false);
  const [rateValue, setRateValue] = useState(5);
  const [rateBody, setRateBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [profileRes, skillsRes, ratingsRes, reviewsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_skills').select('*, skill:skills_catalog(*)').eq('user_id', userId),
      supabase.from('skill_rating_summary').select('*, skill:skills_catalog(name, icon)').eq('reviewee_id', userId),
      supabase.from('reviews').select('*, skill:skills_catalog(*)').eq('reviewee_id', userId).order('created_at', { ascending: false }).limit(10),
    ]);

    setProfile((profileRes.data as Profile) ?? null);
    const skills = (skillsRes.data as UserSkill[]) ?? [];
    setTeachSkills(skills.filter((s) => s.can_teach));
    setLearnSkills(skills.filter((s) => s.wants_to_learn));
    setSkillRatings(
      ((ratingsRes.data as any[]) ?? []).map((r) => ({
        reviewee_id: r.reviewee_id,
        skill_id: r.skill_id,
        avg_rating: r.avg_rating,
        rating_count: r.rating_count,
        skill_name: r.skill?.name ?? '',
        skill_icon: r.skill?.icon ?? '',
      }))
    );
    setReviews((reviewsRes.data as Review[]) ?? []);

    // Is there a confirmed swap between us that I haven't reviewed yet?
    if (userId !== user.id) {
      const { data: swapsData } = await supabase
        .from('swaps')
        .select('*, skill_taught:skills_catalog!swaps_skill_taught_id_fkey(*), skill_offered:skills_catalog!swaps_skill_offered_id_fkey(*)')
        .in('status', ['confirmed', 'reviewed'])
        .or(`and(requester_id.eq.${user.id},provider_id.eq.${userId}),and(requester_id.eq.${userId},provider_id.eq.${user.id})`)
        .order('confirmed_at', { ascending: false });

      const { data: myReviews } = await supabase
        .from('reviews')
        .select('swap_id')
        .eq('reviewer_id', user.id);

      const reviewedSwapIds = new Set((myReviews ?? []).map((r) => r.swap_id));
      const eligible = ((swapsData as Swap[]) ?? []).find((s) => !reviewedSwapIds.has(s.id));
      setRatableSwap(eligible ?? null);
    }

    setLoading(false);
  }, [user, userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSubmitRating = async () => {
    if (!user || !ratableSwap) return;
    setSubmitting(true);
    setRateError(null);

    const { error } = await supabase.from('reviews').insert({
      swap_id: ratableSwap.id,
      reviewer_id: user.id,
      reviewee_id: userId,
      rating: rateValue,
      body: rateBody.trim(),
    });

    if (error) {
      console.error('Rating error:', error);
      setRateError(t('load_error'));
      setSubmitting(false);
      return;
    }

    await supabase.from('swaps').update({ status: 'reviewed' }).eq('id', ratableSwap.id);
    setShowRate(false);
    setRateValue(5);
    setRateBody('');
    setSubmitting(false);
    await fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-charcoal-400">{t('load_error')}</p>
        <button onClick={onBack} className="mt-4 btn-secondary">
          <ArrowLeft className="w-4 h-4" /> {t('back_to_profile')}
        </button>
      </div>
    );
  }

  const ratedSkillForSwap = ratableSwap
    ? (ratableSwap.requester_id === user?.id ? ratableSwap.skill_taught : ratableSwap.skill_offered)
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-charcoal-500 hover:text-charcoal-700">
        <ArrowLeft className="w-4 h-4" /> {t('back_to_profile')}
      </button>

      {/* Header */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-teal-50/60 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            <Avatar name={profile.display_name} avatarUrl={profile.avatar_url} size="xl" />
            <div>
              <h1 className="text-xl font-display font-bold text-charcoal-800">{profile.display_name}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                {profile.rating_count > 0 ? (
                  <StarRating value={profile.rating_avg} showNumber />
                ) : (
                  <span className="text-xs text-charcoal-300">{t('new_member')}</span>
                )}
              </div>
            </div>
          </div>
          {profile.bio && <p className="text-sm text-charcoal-500 leading-relaxed mb-2">{profile.bio}</p>}
          <div className="flex items-center gap-4 text-xs text-charcoal-400">
            {profile.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {profile.location}</span>
            )}
            <span>{t('joined')} {timeAgo(profile.created_at, lang)}</span>
          </div>

          {user && userId !== user.id && (
            <div className="mt-4 pt-4 border-t border-ivory-100">
              {ratableSwap ? (
                <button onClick={() => setShowRate(true)} className="btn-primary">
                  <Star className="w-4 h-4" /> {t('rate_this_swapper')}
                </button>
              ) : (
                <p className="text-xs text-charcoal-300">{t('no_swap_to_rate')}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Per-skill ratings — anonymous: average + count only, never who rated */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-terracotta-400" />
          <h2 className="font-display font-semibold text-charcoal-800">{t('skill_ratings')}</h2>
        </div>
        {skillRatings.length === 0 ? (
          <p className="text-sm text-charcoal-300 py-2">{t('no_skill_ratings_yet')}</p>
        ) : (
          <div className="space-y-2.5">
            {skillRatings.map((r) => {
              const Icon = getIcon(r.skill_icon);
              return (
                <div key={r.skill_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-ivory-50">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-ivory-200 flex-shrink-0">
                    <Icon className="w-4 h-4 text-terracotta-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-700">
                      {t('rated_on')} {r.skill_name}
                    </p>
                    <p className="text-xs text-charcoal-400">
                      {r.rating_count === 1 ? t('by_swapper') : t('by_swappers').replace('{n}', String(r.rating_count))}
                    </p>
                  </div>
                  <StarRating value={r.avg_rating} showNumber />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Teaching / learning skills */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-terracotta-400" />
          <h2 className="font-display font-semibold text-charcoal-800">{t('teaching_skills')}</h2>
        </div>
        {teachSkills.length === 0 ? (
          <p className="text-sm text-charcoal-300 py-2">{t('no_teaching_yet')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {teachSkills.map((s) => {
              const Icon = getIcon(s.skill?.icon || '');
              return (
                <span key={s.id} className="skill-tag-creative">
                  <Icon className="w-3 h-3" /> {s.skill?.name}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="w-4 h-4 text-sage-500" />
          <h2 className="font-display font-semibold text-charcoal-800">{t('learning_skills')}</h2>
        </div>
        {learnSkills.length === 0 ? (
          <p className="text-sm text-charcoal-300 py-2">{t('no_learning_yet')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {learnSkills.map((s) => {
              const Icon = getIcon(s.skill?.icon || '');
              return (
                <span key={s.id} className="skill-tag-language">
                  <Icon className="w-3 h-3" /> {s.skill?.name}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Written reviews — anonymous: never shows who wrote it */}
      {reviews.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-terracotta-300" />
            <h2 className="font-display font-semibold text-charcoal-800">{t('reviews')}</h2>
          </div>
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="p-3 rounded-xl bg-ivory-50">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-charcoal-500">{t('anonymous_swapper')}</span>
                  {review.skill && (
                    <span className="text-xs text-charcoal-300">· {review.skill.name}</span>
                  )}
                  <StarRating value={review.rating} size={12} />
                  <span className="text-xs text-charcoal-300 ml-auto">{timeAgo(review.created_at, lang)}</span>
                </div>
                {review.body && <p className="text-sm text-charcoal-500 italic">"{review.body}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rate modal */}
      <Modal open={showRate} onClose={() => setShowRate(false)} title={t('rate_swapper_title')} maxWidth="max-w-md">
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50">
            <Avatar name={profile.display_name} avatarUrl={profile.avatar_url} size="md" />
            <div>
              <p className="font-medium text-charcoal-700">{profile.display_name}</p>
              {ratedSkillForSwap && (
                <p className="text-xs text-charcoal-400">{t('rated_on')} {ratedSkillForSwap.name}</p>
              )}
            </div>
          </div>

          <div>
            <label className="label">{t('rating')}</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRateValue(star)} className="p-2 transition-all hover:scale-110">
                  <Star className={`w-8 h-8 transition-all ${star <= rateValue ? 'fill-terracotta-300 text-terracotta-300' : 'text-charcoal-200'}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">{t('your_review')} <span className="text-charcoal-300 font-normal">{t('review_optional')}</span></label>
            <textarea
              value={rateBody}
              onChange={(e) => setRateBody(e.target.value)}
              placeholder={t('review_placeholder')}
              className="input min-h-[80px] resize-y"
              maxLength={500}
            />
          </div>

          <p className="text-xs text-charcoal-400 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 flex-shrink-0" /> {t('rating_anonymous_note')}
          </p>

          {rateError && <p className="text-xs text-red-500">{rateError}</p>}

          <button onClick={handleSubmitRating} disabled={submitting} className="btn-primary w-full">
            <Star className="w-4 h-4" /> {t('submit_review')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
