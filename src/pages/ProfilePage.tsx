import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import type { UserSkill, AvailabilitySlot, Skill, SkillCategory, Review, SkillRatingSummary } from '@/types';
import { daysForLang } from '@/types';
import { Avatar } from '@/components/Avatar';
import { StarRating } from '@/components/StarRating';
import { Modal } from '@/components/Modal';
import { getIcon, formatTime, timeAgo } from '@/lib/utils';
import {
  Edit2, Check, X, Plus, MapPin, Clock, BookOpen, GraduationCap,
  Star, Trash2, Search, Camera, Loader2, Sparkles, Lightbulb, Award,
} from 'lucide-react';

const CATEGORY_KEYS: Record<SkillCategory, string> = {
  Creative: 'cat_creative',
  Technology: 'cat_technology',
  Languages: 'cat_languages',
  Music: 'cat_music',
  Business: 'cat_business',
  Lifestyle: 'cat_lifestyle',
};

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { t, lang } = useI18n();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mySkills, setMySkills] = useState<UserSkill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [skillRatings, setSkillRatings] = useState<(SkillRatingSummary & { skill_name: string; skill_icon: string })[]>([]);

  const [showAddSkill, setShowAddSkill] = useState(false);
  const [skillMode, setSkillMode] = useState<'teach' | 'learn'>('teach');
  const [skillSearch, setSkillSearch] = useState('');
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [customCategory, setCustomCategory] = useState<SkillCategory>('Creative');

  const DAYS = daysForLang(lang);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio);
      setLocation(profile.location);
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    // Only the app's curated skills show in the shared browsable grid.
    // The user's own previously-typed custom skills are fetched separately
    // so they can still find/reuse them, without leaking into everyone
    // else's list.
    const [skillsRes, officialCatalogRes, myCatalogRes, availRes, reviewsRes, ratingsRes] = await Promise.all([
      supabase.from('user_skills').select('*, skill:skills_catalog(*)').eq('user_id', user.id),
      supabase.from('skills_catalog').select('*').eq('is_custom', false).order('category, name'),
      supabase.from('skills_catalog').select('*').eq('is_custom', true).eq('created_by', user.id).order('name'),
      supabase.from('availability').select('*').eq('user_id', user.id).order('day_of_week, start_hour'),
      supabase.from('reviews').select('*, skill:skills_catalog(*)').eq('reviewee_id', user.id).order('created_at', { ascending: false }),
      supabase.from('skill_rating_summary').select('*, skill:skills_catalog(name, icon)').eq('reviewee_id', user.id),
    ]);

    setMySkills((skillsRes.data as UserSkill[]) ?? []);
    setAllSkills([...((officialCatalogRes.data as Skill[]) ?? []), ...((myCatalogRes.data as Skill[]) ?? [])]);
    setAvailability((availRes.data as AvailabilitySlot[]) ?? []);
    setReviews((reviewsRes.data as Review[]) ?? []);
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
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(urlData.publicUrl);

      await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      await refreshProfile();
    } catch (err) {
      console.error('Avatar upload error:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
      })
      .eq('id', user.id);
    await refreshProfile();
    setEditing(false);
    setSaving(false);
  };

  const findOrCreateSkill = async (name: string, category: SkillCategory): Promise<string | null> => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return null;

    const existing = allSkills.find(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from('skills_catalog')
      .insert({ name: trimmed, category, icon: 'Lightbulb' })
      .select('*')
      .maybeSingle();

    if (error || !data) return null;

    const newSkill = data as Skill;
    setAllSkills((prev) => [...prev, newSkill]);
    return newSkill.id;
  };

  const handleAddCustomSkill = async () => {
    const id = await findOrCreateSkill(customSkillInput, customCategory);
    if (id) {
      await handleAddSkill(id, skillMode);
      setCustomSkillInput('');
    }
  };

  const handleAddSkill = async (skillId: string, mode: 'teach' | 'learn') => {
    if (!user) return;
    const existing = mySkills.find((s) => s.skill_id === skillId);

    if (existing) {
      await supabase
        .from('user_skills')
        .update({
          can_teach: mode === 'teach' ? true : existing.can_teach,
          wants_to_learn: mode === 'learn' ? true : existing.wants_to_learn,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('user_skills').insert({
        user_id: user.id,
        skill_id: skillId,
        can_teach: mode === 'teach',
        wants_to_learn: mode === 'learn',
        proficiency: 3,
        urgency: 2,
      });
    }
    await fetchProfileData();
  };

  const handleRemoveSkill = async (skillId: string, mode: 'teach' | 'learn') => {
    if (!user) return;
    const existing = mySkills.find((s) => s.skill_id === skillId);
    if (!existing) return;

    if (mode === 'teach' && existing.wants_to_learn) {
      await supabase.from('user_skills').update({ can_teach: false }).eq('id', existing.id);
    } else if (mode === 'learn' && existing.can_teach) {
      await supabase.from('user_skills').update({ wants_to_learn: false }).eq('id', existing.id);
    } else {
      await supabase.from('user_skills').delete().eq('id', existing.id);
    }
    await fetchProfileData();
  };

  const handleAddAvailability = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('availability')
      .insert({ user_id: user.id, day_of_week: 1, start_hour: 18, end_hour: 20 })
      .select('*')
      .single();
    if (data) setAvailability((prev) => [...prev, data as AvailabilitySlot]);
  };

  const handleUpdateAvailability = async (id: string, field: keyof AvailabilitySlot, value: number) => {
    setAvailability((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
    await supabase.from('availability').update({ [field]: value }).eq('id', id);
  };

  const handleRemoveAvailability = async (id: string) => {
    await supabase.from('availability').delete().eq('id', id);
    setAvailability((prev) => prev.filter((a) => a.id !== id));
  };

  const teachSkills = mySkills.filter((s) => s.can_teach);
  const learnSkills = mySkills.filter((s) => s.wants_to_learn);

  const filteredAddSkills = allSkills.filter((s) =>
    s.name.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const categories: (SkillCategory | 'All')[] = ['All', 'Creative', 'Technology', 'Languages', 'Music', 'Business', 'Lifestyle'];
  const [addCategory, setAddCategory] = useState<SkillCategory | 'All'>('All');
  const filteredByCat = filteredAddSkills.filter((s) => addCategory === 'All' || s.category === addCategory);

  const categoryLabel = (cat: SkillCategory | 'All'): string => {
    if (cat === 'All') return t('cat_all');
    return t(CATEGORY_KEYS[cat]);
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-teal-50/60 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar name={profile.display_name} avatarUrl={avatarUrl} size="xl" />
                {editing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-full bg-charcoal-900/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                  }}
                />
              </div>

              <div>
                {editing ? (
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input text-lg font-display font-bold"
                    placeholder={t('your_name_placeholder')}
                  />
                ) : (
                  <h1 className="text-xl font-display font-bold text-charcoal-800">
                    {profile.display_name}
                  </h1>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  {profile.rating_count > 0 ? (
                    <StarRating value={profile.rating_avg} showNumber />
                  ) : (
                    <span className="text-xs text-charcoal-300">{t('no_reviews_yet_short')}</span>
                  )}
                  <span className="text-xs text-charcoal-400">
                    {profile.rating_count} {t('swaps')}
                  </span>
                </div>
              </div>
            </div>

            {editing ? (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="btn-ghost">
                  <X className="w-4 h-4" /> {t('cancel')}
                </button>
                <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
                  <Check className="w-4 h-4" /> {t('save')}
                </button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="btn-secondary">
                <Edit2 className="w-4 h-4" /> {t('edit')}
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="label">{t('bio')}</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="input min-h-[60px] resize-y"
                  maxLength={300}
                  placeholder={t('bio_placeholder')}
                />
              </div>
              <div>
                <label className="label">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" /> {t('location')}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input"
                  placeholder={t('location_placeholder')}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {profile.bio && (
                <p className="text-sm text-charcoal-500 leading-relaxed">{profile.bio}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-charcoal-400">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {profile.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  {t('joined')} {timeAgo(profile.created_at, lang)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Teaching skills */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-terracotta-400" />
            <h2 className="font-display font-semibold text-charcoal-800">{t('teaching_skills')}</h2>
            <span className="text-xs text-charcoal-300">({teachSkills.length})</span>
          </div>
          <button
            onClick={() => { setSkillMode('teach'); setShowAddSkill(true); }}
            className="btn-ghost text-teal-600"
          >
            <Plus className="w-4 h-4" /> {t('add_btn')}
          </button>
        </div>
        {teachSkills.length === 0 ? (
          <p className="text-sm text-charcoal-300 py-2">
            {t('no_teaching_yet')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {teachSkills.map((s) => {
              const Icon = getIcon(s.skill?.icon || '');
              return (
                <div key={s.id} className="skill-tag-creative group">
                  <Icon className="w-3 h-3" />
                  {s.skill?.name}
                  <button
                    onClick={() => handleRemoveSkill(s.skill_id, 'teach')}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Learning skills */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-sage-500" />
            <h2 className="font-display font-semibold text-charcoal-800">{t('learning_skills')}</h2>
            <span className="text-xs text-charcoal-300">({learnSkills.length})</span>
          </div>
          <button
            onClick={() => { setSkillMode('learn'); setShowAddSkill(true); }}
            className="btn-ghost text-teal-600"
          >
            <Plus className="w-4 h-4" /> {t('add_btn')}
          </button>
        </div>
        {learnSkills.length === 0 ? (
          <p className="text-sm text-charcoal-300 py-2">
            {t('no_learning_yet')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {learnSkills.map((s) => {
              const Icon = getIcon(s.skill?.icon || '');
              return (
                <div key={s.id} className="skill-tag-language group">
                  <Icon className="w-3 h-3" />
                  {s.skill?.name}
                  <button
                    onClick={() => handleRemoveSkill(s.skill_id, 'learn')}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Availability */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-500" />
            <h2 className="font-display font-semibold text-charcoal-800">{t('weekly_availability')}</h2>
          </div>
          <button onClick={handleAddAvailability} className="btn-ghost text-teal-600">
            <Plus className="w-4 h-4" /> {t('add_slot')}
          </button>
        </div>
        {availability.length === 0 ? (
          <p className="text-sm text-charcoal-300 py-2">
            {t('no_availability_set')}
          </p>
        ) : (
          <div className="space-y-2">
            {availability.map((slot) => (
              <div key={slot.id} className="flex items-center gap-2 flex-wrap">
                <select
                  value={slot.day_of_week}
                  onChange={(e) => handleUpdateAvailability(slot.id, 'day_of_week', Number(e.target.value))}
                  className="input flex-1 min-w-[120px]"
                >
                  {DAYS.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
                <select
                  value={slot.start_hour}
                  onChange={(e) => handleUpdateAvailability(slot.id, 'start_hour', Number(e.target.value))}
                  className="input w-24"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>{formatTime(h, lang)}</option>
                  ))}
                </select>
                <span className="text-charcoal-300 text-sm">{t('to')}</span>
                <select
                  value={slot.end_hour}
                  onChange={(e) => handleUpdateAvailability(slot.id, 'end_hour', Number(e.target.value))}
                  className="input w-24"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h + 1} value={h + 1}>{formatTime(h + 1, lang)}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleRemoveAvailability(slot.id)}
                  className="p-2 text-charcoal-300 hover:text-coral-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skill ratings — anonymous: average + count only, never who rated */}
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
                    <p className="text-sm font-medium text-charcoal-700">{t('rated_on')} {r.skill_name}</p>
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

      {/* Reviews — anonymous: never shows who wrote it */}
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
                {review.body && (
                  <p className="text-sm text-charcoal-500 italic">"{review.body}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add skill modal */}
      <Modal
        open={showAddSkill}
        onClose={() => setShowAddSkill(false)}
        title={skillMode === 'teach' ? t('add_teaching_skill') : t('add_learning_skill')}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-gradient-to-br from-teal-50/50 to-terracotta-50/30 border border-teal-100 p-3 space-y-2">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {t('cant_find_it')}
            </p>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSkill();
                  }
                }}
                placeholder="e.g. Pottery, Kubernetes, Calligraphy..."
                className="input flex-1 min-w-[160px]"
              />
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as SkillCategory)}
                className="input w-auto"
              >
                {categories.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>{categoryLabel(cat)}</option>
                ))}
              </select>
              <button
                onClick={handleAddCustomSkill}
                disabled={customSkillInput.trim().length < 2}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" /> {t('add')}
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300" />
            <input
              type="text"
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              placeholder={t('search_skills')}
              className="input pl-10"
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setAddCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  addCategory === cat
                    ? 'bg-teal-500 text-white'
                    : 'bg-ivory-100 text-charcoal-500 hover:bg-ivory-200'
                }`}
              >
                {categoryLabel(cat)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {filteredByCat.map((skill) => {
              const Icon = getIcon(skill.icon);
              const alreadyHas = mySkills.find((s) => s.skill_id === skill.id);
              const alreadyInMode =
                skillMode === 'teach' ? alreadyHas?.can_teach : alreadyHas?.wants_to_learn;
              return (
                <button
                  key={skill.id}
                  onClick={() => handleAddSkill(skill.id, skillMode)}
                  disabled={alreadyInMode}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    alreadyInMode
                      ? 'border-teal-200 bg-teal-50 opacity-60'
                      : 'border-ivory-200 hover:border-teal-200 hover:bg-ivory-50'
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-ivory-100 text-charcoal-400 flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-charcoal-700 truncate">{skill.name}</p>
                    <p className="text-[11px] text-charcoal-300">{categoryLabel(skill.category)}</p>
                  </div>
                  {alreadyInMode && <Check className="w-3.5 h-3.5 text-teal-500" />}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
