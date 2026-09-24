import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import type { Profile, Skill, UserSkill, AvailabilitySlot, Swap, SkillCategory } from '@/types';
import { CATEGORY_TAG_CLASS } from '@/types';
import type { Lang } from '@/context/I18nContext';
import { getIcon, formatTime } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { Modal } from '@/components/Modal';
import {
  Search, MapPin, Clock, Repeat, ArrowRight, ArrowLeftRight,
  Sparkles, Filter, Check, Calendar, Users, Zap,
} from 'lucide-react';

const CATEGORY_KEYS: Record<SkillCategory, string> = {
  Creative: 'cat_creative',
  Technology: 'cat_technology',
  Languages: 'cat_languages',
  Music: 'cat_music',
  Business: 'cat_business',
  Lifestyle: 'cat_lifestyle',
};

function categoryLabel(cat: SkillCategory, t: (k: string) => string): string {
  return t(CATEGORY_KEYS[cat]);
}

interface Match {
  profile: Profile;
  teachesMe: UserSkill[];
  learnsFromMe: UserSkill[];
  exactMatches: { theyTeach: UserSkill; iTeach: UserSkill }[];
  availability: AvailabilitySlot[];
  score: number;
}

export function DiscoverPage({ onOpenSwap, onViewProfile }: { onOpenSwap: (swapId: string) => void; onViewProfile: (userId: string) => void }) {
  const { user, profile } = useAuth();
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<SkillCategory | 'All'>('All');
  const [showExactOnly, setShowExactOnly] = useState(false);

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [creating, setCreating] = useState(false);

  const [myTeachSkills, setMyTeachSkills] = useState<UserSkill[]>([]);
  const [myLearnSkills, setMyLearnSkills] = useState<UserSkill[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);

      const { data: mySkills } = await supabase
        .from('user_skills')
        .select('*, skill:skills_catalog(*)')
        .eq('user_id', user.id);

      const skills = (mySkills as UserSkill[]) ?? [];
      setMyTeachSkills(skills.filter((s) => s.can_teach));
      setMyLearnSkills(skills.filter((s) => s.wants_to_learn));

      const myLearnSkillIds = skills.filter((s) => s.wants_to_learn).map((s) => s.skill_id);
      const myTeachSkillIds = skills.filter((s) => s.can_teach).map((s) => s.skill_id);

      if (myLearnSkillIds.length === 0 && myTeachSkillIds.length === 0) {
        setLoading(false);
        return;
      }

      let teachQuery = supabase
        .from('user_skills')
        .select('*, skill:skills_catalog(*), profile:profiles!user_skills_user_id_profiles_fkey(*)')
        .neq('user_id', user.id)
        .eq('can_teach', true);

      if (myLearnSkillIds.length > 0) {
        teachQuery = teachQuery.in('skill_id', myLearnSkillIds);
      } else {
        teachQuery = teachQuery.eq('skill_id', '00000000-0000-0000-0000-000000000000');
      }

      const { data: teachers } = await teachQuery;

      let learnQuery = supabase
        .from('user_skills')
        .select('*, skill:skills_catalog(*), profile:profiles!user_skills_user_id_profiles_fkey(*)')
        .neq('user_id', user.id)
        .eq('wants_to_learn', true);

      if (myTeachSkillIds.length > 0) {
        learnQuery = learnQuery.in('skill_id', myTeachSkillIds);
      } else {
        learnQuery = learnQuery.eq('skill_id', '00000000-0000-0000-0000-000000000000');
      }

      const { data: learners } = await learnQuery;

      const matchMap = new Map<string, Match>();

      for (const row of (teachers as UserSkill[]) ?? []) {
        const prof = (row as any).profile as Profile;
        if (!prof || !prof.onboarding_complete) continue;
        if (!matchMap.has(prof.id)) {
          matchMap.set(prof.id, {
            profile: prof,
            teachesMe: [],
            learnsFromMe: [],
            exactMatches: [],
            availability: [],
            score: 0,
          });
        }
        matchMap.get(prof.id)!.teachesMe.push({ ...row } as UserSkill);
      }

      for (const row of (learners as UserSkill[]) ?? []) {
        const prof = (row as any).profile as Profile;
        if (!prof || !prof.onboarding_complete) continue;
        if (!matchMap.has(prof.id)) {
          matchMap.set(prof.id, {
            profile: prof,
            teachesMe: [],
            learnsFromMe: [],
            exactMatches: [],
            availability: [],
            score: 0,
          });
        }
        matchMap.get(prof.id)!.learnsFromMe.push({ ...row } as UserSkill);
      }

      for (const match of matchMap.values()) {
        for (const theyTeach of match.teachesMe) {
          for (const theyLearn of match.learnsFromMe) {
            const iCanTeachTheyLearn = myTeachSkills.some((s) => s.skill_id === theyLearn.skill_id);
            if (iCanTeachTheyLearn) {
              match.exactMatches.push({
                theyTeach,
                iTeach: myTeachSkills.find((s) => s.skill_id === theyLearn.skill_id)!,
              });
            }
          }
        }

        const { data: avail } = await supabase
          .from('availability')
          .select('*')
          .eq('user_id', match.profile.id);
        match.availability = (avail as AvailabilitySlot[]) ?? [];

        match.score =
          match.exactMatches.length * 100 +
          match.teachesMe.length * 10 +
          match.learnsFromMe.length * 5 +
          match.profile.rating_avg * 2;
      }

      let matchArray = Array.from(matchMap.values());
      if (showExactOnly) {
        matchArray = matchArray.filter((m) => m.exactMatches.length > 0);
      }
      matchArray.sort((a, b) => b.score - a.score);

      setMatches(matchArray);
      setLoading(false);
    })();
  }, [user, showExactOnly]);

  const [existingSwaps, setExistingSwaps] = useState<Swap[]>([]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('swaps')
        .select('*')
        .or(`requester_id.eq.${user.id},provider_id.eq.${user.id}`)
        .in('status', ['proposed', 'accepted', 'scheduled']);
      setExistingSwaps((data as Swap[]) ?? []);
    })();
  }, [user]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (filterCategory !== 'All') {
        const hasCategory = [...m.teachesMe, ...m.learnsFromMe].some(
          (s) => s.skill?.category === filterCategory
        );
        if (!hasCategory) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.profile.display_name.toLowerCase().includes(q);
        const matchesLocation = (m.profile.location || '').toLowerCase().includes(q);
        const matchesSkill = [...m.teachesMe, ...m.learnsFromMe].some((s) =>
          s.skill?.name.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesLocation && !matchesSkill) return false;
      }
      return true;
    });
  }, [matches, filterCategory, searchQuery]);

  const hasExistingSwap = (otherUserId: string) => {
    return existingSwaps.some(
      (s) =>
        (s.requester_id === otherUserId || s.provider_id === otherUserId) &&
        s.status !== 'declined' &&
        s.status !== 'cancelled'
    );
  };

  const handleCreateSwap = async (
    match: Match,
    skillTaughtId: string,
    skillOfferedId: string
  ) => {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('swaps')
      .insert({
        requester_id: user.id,
        provider_id: match.profile.id,
        skill_taught_id: skillTaughtId,
        skill_offered_id: skillOfferedId,
        status: 'proposed',
        duration_minutes: 60,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Swap creation error:', error);
      setCreating(false);
      return;
    }

    setCreating(false);
    setSelectedMatch(null);
    onOpenSwap(data.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (myLearnSkills.length === 0) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-50 text-teal-400 mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-display font-bold text-charcoal-800 mb-2">
          {t('what_want_to_learn')}
        </h2>
        <p className="text-charcoal-400 text-sm">
          {t('add_skills_to_discover')}
        </p>
      </div>
    );
  }

  const allCategories: (SkillCategory | 'All')[] = ['All', 'Creative', 'Technology', 'Languages', 'Music', 'Business', 'Lifestyle'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-charcoal-800">
            {t('discover_partners')}
          </h1>
          <p className="mt-1 text-charcoal-400 text-sm">
            {t('discover_sub')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-charcoal-400 text-xs font-medium">
            <Users className="w-3.5 h-3.5" /> {t('total_matches')}
          </div>
          <p className="mt-1 text-2xl font-display font-bold text-charcoal-800">
            {matches.length}
          </p>
        </div>
        <div className="card p-4 bg-teal-50/50">
          <div className="flex items-center gap-2 text-teal-600 text-xs font-medium">
            <ArrowLeftRight className="w-3.5 h-3.5" /> {t('exact_swaps')}
          </div>
          <p className="mt-1 text-2xl font-display font-bold text-teal-700">
            {matches.filter((m) => m.exactMatches.length > 0).length}
          </p>
        </div>
        <div className="card p-4 bg-terracotta-50/50">
          <div className="flex items-center gap-2 text-terracotta-600 text-xs font-medium">
            <Zap className="w-3.5 h-3.5" /> {t('skills_to_learn')}
          </div>
          <p className="mt-1 text-2xl font-display font-bold text-terracotta-700">
            {myLearnSkills.length}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_name_skill')}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as SkillCategory | 'All')}
            className="input w-auto"
          >
            <option value="All">{t('all_categories')}</option>
            {(['Creative', 'Technology', 'Languages', 'Music', 'Business', 'Lifestyle'] as SkillCategory[]).map((c) => (
              <option key={c} value={c}>{categoryLabel(c, t)}</option>
            ))}
          </select>
          <button
            onClick={() => setShowExactOnly(!showExactOnly)}
            className={`btn whitespace-nowrap ${
              showExactOnly ? 'bg-teal-500 text-white' : 'btn-secondary'
            }`}
          >
            <Filter className="w-4 h-4" />
            {t('exact_only')}
          </button>
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ivory-200 text-charcoal-300 mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-display font-semibold text-charcoal-700">
            {t('no_matches')}
          </h3>
          <p className="mt-1 text-sm text-charcoal-400 max-w-sm mx-auto">
            {searchQuery || filterCategory !== 'All'
              ? t('try_adjusting')
              : t('add_more_skills')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.profile.id}
              match={match}
              hasExisting={hasExistingSwap(match.profile.id)}
              onPropose={() => setSelectedMatch(match)}
              onViewProfile={onViewProfile}
              t={t}
              lang={lang}
            />
          ))}
        </div>
      )}

      {selectedMatch && (
        <ProposeSwapModal
          match={selectedMatch}
          myTeachSkills={myTeachSkills}
          creating={creating}
          onClose={() => setSelectedMatch(null)}
          onCreate={handleCreateSwap}
          t={t}
        />
      )}
    </div>
  );
}

function MatchCard({
  match,
  hasExisting,
  onPropose,
  onViewProfile,
  t,
  lang,
}: {
  match: Match;
  hasExisting: boolean;
  onPropose: () => void;
  onViewProfile: (userId: string) => void;
  t: (k: string) => string;
  lang: Lang;
}) {
  const isExact = match.exactMatches.length > 0;

  return (
    <div className={`card p-5 ${isExact ? 'ring-2 ring-teal-100' : ''} hover:shadow-card-hover transition-all`}>
      <button
        onClick={() => onViewProfile(match.profile.id)}
        className="flex items-start gap-3 mb-4 text-left w-full rounded-xl transition-opacity hover:opacity-70"
        title={t('view_profile')}
      >
        <Avatar
          name={match.profile.display_name}
          avatarUrl={match.profile.avatar_url}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-charcoal-800 truncate">
              {match.profile.display_name}
            </h3>
            {isExact && (
              <span className="badge bg-teal-100 text-teal-700">
                <ArrowLeftRight className="w-3 h-3" /> {t('exact_match')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {match.profile.rating_count > 0 ? (
              <StarRating value={match.profile.rating_avg} showNumber />
            ) : (
              <span className="text-xs text-charcoal-300">{t('new_member')}</span>
            )}
            {match.profile.location && (
              <span className="flex items-center gap-1 text-xs text-charcoal-400">
                <MapPin className="w-3 h-3" />
                {match.profile.location}
              </span>
            )}
          </div>
          {match.profile.bio && (
            <p className="mt-2 text-sm text-charcoal-400 line-clamp-2">{match.profile.bio}</p>
          )}
        </div>
      </button>

      {isExact && (
        <div className="mb-4 space-y-2">
          {match.exactMatches.slice(0, 2).map((em, i) => {
            const TeachIcon = getIcon(em.theyTeach.skill?.icon || '');
            const LearnIcon = getIcon(em.iTeach.skill?.icon || '');
            return (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-teal-50 border border-teal-100">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white flex-shrink-0">
                    <TeachIcon className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  <span className="text-xs font-medium text-teal-800 truncate">
                    {em.theyTeach.skill?.name}
                  </span>
                </div>
                <ArrowLeftRight className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                  <span className="text-xs font-medium text-teal-800 truncate">
                    {em.iTeach.skill?.name}
                  </span>
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white flex-shrink-0">
                    <LearnIcon className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isExact && match.teachesMe.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-charcoal-400 mb-1.5">{t('can_teach_you')}</p>
          <div className="flex flex-wrap gap-1.5">
            {match.teachesMe.slice(0, 4).map((s) => {
              const Icon = getIcon(s.skill?.icon || '');
              return (
                <span key={s.id} className={CATEGORY_TAG_CLASS[s.skill?.category || 'Technology']}>
                  <Icon className="w-3 h-3" />
                  {s.skill?.name}
                </span>
              );
            })}
            {match.teachesMe.length > 4 && (
              <span className="text-xs text-charcoal-400 px-1">+{match.teachesMe.length - 4} {t('more')}</span>
            )}
          </div>
        </div>
      )}

      {!isExact && match.learnsFromMe.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-charcoal-400 mb-1.5">{t('wants_from_you')}</p>
          <div className="flex flex-wrap gap-1.5">
            {match.learnsFromMe.slice(0, 4).map((s) => {
              const Icon = getIcon(s.skill?.icon || '');
              return (
                <span key={s.id} className={CATEGORY_TAG_CLASS[s.skill?.category || 'Technology']}>
                  <Icon className="w-3 h-3" />
                  {s.skill?.name}
                </span>
              );
            })}
            {match.learnsFromMe.length > 4 && (
              <span className="text-xs text-charcoal-400 px-1">+{match.learnsFromMe.length - 4} {t('more')}</span>
            )}
          </div>
        </div>
      )}

      {match.availability.length > 0 && (
        <div className="mb-4 flex items-center gap-1.5 text-xs text-charcoal-400">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {t('free_slots')} {match.availability.length} {t('slots_week')}
          </span>
        </div>
      )}

      <button
        onClick={onPropose}
        disabled={hasExisting}
        className="btn-primary w-full"
      >
        {hasExisting ? (
          <>
            <Check className="w-4 h-4" /> {t('swap_already_proposed')}
          </>
        ) : (
          <>
            <Repeat className="w-4 h-4" /> {t('propose_swap')}
          </>
        )}
      </button>
    </div>
  );
}

function ProposeSwapModal({
  match,
  myTeachSkills,
  creating,
  onClose,
  onCreate,
  t,
}: {
  match: Match;
  myTeachSkills: UserSkill[];
  creating: boolean;
  onClose: () => void;
  onCreate: (match: Match, skillTaughtId: string, skillOfferedId: string) => void;
  t: (k: string) => string;
}) {
  const [skillTaughtId, setSkillTaughtId] = useState(match.teachesMe[0]?.skill_id || '');
  const [skillOfferedId, setSkillOfferedId] = useState('');

  useEffect(() => {
    if (match.exactMatches.length > 0) {
      setSkillTaughtId(match.exactMatches[0].theyTeach.skill_id);
      setSkillOfferedId(match.exactMatches[0].iTeach.skill_id);
    }
  }, [match]);

  const selectedTaught = match.teachesMe.find((s) => s.skill_id === skillTaughtId);
  const selectedOffered = myTeachSkills.find((s) => s.skill_id === skillOfferedId);

  return (
    <Modal open onClose={onClose} title={t('propose_a_swap')} maxWidth="max-w-md">
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50">
          <Avatar name={match.profile.display_name} avatarUrl={match.profile.avatar_url} size="md" />
          <div>
            <p className="font-medium text-charcoal-700">{match.profile.display_name}</p>
            <p className="text-xs text-charcoal-400">{t('swap_partner')}</p>
          </div>
        </div>

        <div>
          <label className="label">{t('they_teach_you')}</label>
          <div className="space-y-2">
            {match.teachesMe.map((s) => {
              const Icon = getIcon(s.skill?.icon || '');
              const selected = skillTaughtId === s.skill_id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSkillTaughtId(s.skill_id)}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all ${
                    selected
                      ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-100'
                      : 'border-ivory-200 hover:border-teal-200'
                  }`}
                >
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 ${
                    selected ? 'bg-teal-100 text-teal-600' : 'bg-ivory-100 text-charcoal-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-700">{s.skill?.name}</p>
                    <p className="text-xs text-charcoal-300">{s.skill?.category}</p>
                  </div>
                  {selected && <Check className="w-4 h-4 text-teal-500" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">{t('you_teach_them')}</label>
          <div className="space-y-2">
            {match.learnsFromMe.length > 0 ? (
              myTeachSkills
                .filter((ms) => match.learnsFromMe.some((lm) => lm.skill_id === ms.skill_id))
                .map((s) => {
                  const Icon = getIcon(s.skill?.icon || '');
                  const selected = skillOfferedId === s.skill_id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSkillOfferedId(s.skill_id)}
                      className={`flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-terracotta-300 bg-terracotta-50 ring-2 ring-terracotta-100'
                          : 'border-ivory-200 hover:border-terracotta-200'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 ${
                        selected ? 'bg-terracotta-100 text-terracotta-600' : 'bg-ivory-100 text-charcoal-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal-700">{s.skill?.name}</p>
                        <p className="text-xs text-charcoal-300">{t('they_want_this')}</p>
                      </div>
                      {selected && <Check className="w-4 h-4 text-terracotta-400" />}
                    </button>
                  );
                })
            ) : (
              <div className="p-3 rounded-xl bg-ivory-50 text-sm text-charcoal-400 text-center">
                {t('they_dont_want')}
              </div>
            )}

            {match.learnsFromMe.length === 0 && (
              <>
                {myTeachSkills.map((s) => {
                  const Icon = getIcon(s.skill?.icon || '');
                  const selected = skillOfferedId === s.skill_id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSkillOfferedId(s.skill_id)}
                      className={`flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-terracotta-300 bg-terracotta-50'
                          : 'border-ivory-200 hover:border-terracotta-200'
                      }`}
                    >
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-ivory-100 text-charcoal-400 flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal-700">{s.skill?.name}</p>
                        <p className="text-xs text-charcoal-300">{s.skill?.category}</p>
                      </div>
                      {selected && <Check className="w-4 h-4 text-terracotta-400" />}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {selectedTaught && selectedOffered && (
          <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-teal-50 border border-teal-100">
            <div className="text-center">
              <p className="text-xs text-teal-600 font-medium">{t('you_learn')}</p>
              <p className="text-sm font-semibold text-teal-800">{selectedTaught.skill?.name}</p>
            </div>
            <ArrowLeftRight className="w-5 h-5 text-teal-400" />
            <div className="text-center">
              <p className="text-xs text-terracotta-600 font-medium">{t('you_teach')}</p>
              <p className="text-sm font-semibold text-terracotta-700">{selectedOffered.skill?.name}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => onCreate(match, skillTaughtId, skillOfferedId)}
          disabled={creating || !skillTaughtId || !skillOfferedId}
          className="btn-primary w-full"
        >
          {creating ? t('sending') : t('send_proposal')}
          {!creating && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </Modal>
  );
}
