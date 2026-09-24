import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import type { Skill, AvailabilitySlot, SkillCategory } from '@/types';
import { daysForLang } from '@/types';
import { getIcon, formatTime } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/Avatar';
import { ToggleControls } from '@/components/ToggleControls';
import {
  Check, ChevronRight, ChevronLeft, Search, X, Plus,
  MapPin, User as UserIcon, Sparkles, BookOpen, GraduationCap,
  Clock, Camera, Loader2,
} from 'lucide-react';

export function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { t, lang } = useI18n();
  const DAYS = daysForLang(lang);
  const [step, setStep] = useState(0);
  const [skillsCatalog, setSkillsCatalog] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SkillCategory | 'All'>('All');

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teachSkills, setTeachSkills] = useState<Map<string, number>>(new Map());
  const [learnSkills, setLearnSkills] = useState<Map<string, number>>(new Map());

  const [customSkillInput, setCustomSkillInput] = useState('');
  const [customCategory, setCustomCategory] = useState<SkillCategory>('Creative');

  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);

  const steps = [t('profile_photo'), t('teaching'), t('learning'), t('weekly_availability')];

  useEffect(() => {
    (async () => {
      // Only the app's curated skills show in the shared browsable grid.
      // A user's own previously-typed custom skills are fetched separately
      // so they can still find/reuse them, without leaking into everyone
      // else's list.
      const [{ data: official }, { data: mine }] = await Promise.all([
        supabase.from('skills_catalog').select('*').eq('is_custom', false).order('category, name'),
        user
          ? supabase.from('skills_catalog').select('*').eq('is_custom', true).eq('created_by', user.id).order('name')
          : Promise.resolve({ data: [] as Skill[] }),
      ]);
      setSkillsCatalog([...((official as Skill[]) ?? []), ...((mine as Skill[]) ?? [])]);
      if (profile) {
        setDisplayName(profile.display_name || '');
        setBio(profile.bio || '');
        setLocation(profile.location || '');
        setAvatarUrl(profile.avatar_url || '');
      }
      setLoading(false);
    })();
  }, [profile, user]);

  const filteredSkills = skillsCatalog.filter((s) => {
    const matchesSearch = searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories: (SkillCategory | 'All')[] = ['All', 'Creative', 'Technology', 'Languages', 'Music', 'Business', 'Lifestyle'];

  const findOrCreateSkill = async (name: string, category: SkillCategory): Promise<string | null> => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return null;
    const existing = skillsCatalog.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const { data, error } = await supabase.from('skills_catalog').insert({ name: trimmed, category, icon: 'Lightbulb' }).select('*').maybeSingle();
    if (error || !data) return null;
    const newSkill = data as Skill;
    setSkillsCatalog((prev) => [...prev, newSkill]);
    return newSkill.id;
  };

  const addCustomSkillToTeach = async () => {
    const id = await findOrCreateSkill(customSkillInput, customCategory);
    if (id) { setTeachSkills((prev) => new Map(prev).set(id, 3)); setCustomSkillInput(''); }
  };

  const addCustomSkillToLearn = async () => {
    const id = await findOrCreateSkill(customSkillInput, customCategory);
    if (id) { setLearnSkills((prev) => new Map(prev).set(id, 2)); setCustomSkillInput(''); }
  };

  const toggleTeach = (skillId: string) => {
    setTeachSkills((prev) => { const next = new Map(prev); if (next.has(skillId)) next.delete(skillId); else next.set(skillId, 3); return next; });
  };

  const toggleLearn = (skillId: string) => {
    setLearnSkills((prev) => { const next = new Map(prev); if (next.has(skillId)) next.delete(skillId); else next.set(skillId, 2); return next; });
  };

  const setProficiency = (skillId: string, level: number) => setTeachSkills((prev) => new Map(prev).set(skillId, level));
  const setUrgency = (skillId: string, level: number) => setLearnSkills((prev) => new Map(prev).set(skillId, level));

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(urlData.publicUrl);
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id);
    } catch (err) { console.error('Avatar upload error:', err); } finally { setUploadingAvatar(false); }
  };

  const addAvailability = () => setAvailability((prev) => [...prev, { id: crypto.randomUUID(), user_id: '', day_of_week: 1, start_hour: 18, end_hour: 20 } as AvailabilitySlot]);
  const updateAvailability = (id: string, field: keyof AvailabilitySlot, value: number) => setAvailability((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  const removeAvailability = (id: string) => setAvailability((prev) => prev.filter((a) => a.id !== id));

  const canProceed = () => {
    if (step === 0) return displayName.trim().length >= 2;
    if (step === 1) return teachSkills.size >= 1;
    if (step === 2) return learnSkills.size >= 1;
    return true;
  };

  const handleFinish = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await supabase.from('profiles').update({ display_name: displayName.trim(), bio: bio.trim(), location: location.trim(), onboarding_complete: true }).eq('id', user.id);
      const teachRows = Array.from(teachSkills.entries()).map(([skillId, proficiency]) => ({ user_id: user.id, skill_id: skillId, can_teach: true, wants_to_learn: false, proficiency, urgency: 2 }));
      const learnRows = Array.from(learnSkills.entries()).map(([skillId, urgency]) => ({ user_id: user.id, skill_id: skillId, can_teach: false, wants_to_learn: true, proficiency: 3, urgency }));
      const merged = new Map<string, typeof teachRows[number]>();
      for (const row of [...teachRows, ...learnRows]) {
        const existing = merged.get(row.skill_id);
        if (existing) merged.set(row.skill_id, { ...existing, can_teach: existing.can_teach || row.can_teach, wants_to_learn: existing.wants_to_learn || row.wants_to_learn });
        else merged.set(row.skill_id, row);
      }
      if (merged.size > 0) await supabase.from('user_skills').upsert(Array.from(merged.values()), { onConflict: 'user_id, skill_id' });
      if (availability.length > 0) await supabase.from('availability').upsert(availability.map((a) => ({ user_id: user.id, day_of_week: a.day_of_week, start_hour: a.start_hour, end_hour: a.end_hour })), { onConflict: 'user_id, day_of_week, start_hour, end_hour' });
      await refreshProfile();
    } catch (err) { console.error('Onboarding error:', err); } finally { setSubmitting(false); }
  }, [user, displayName, bio, location, teachSkills, learnSkills, availability, refreshProfile]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-app-bg"><div className="h-10 w-10 animate-spin rounded-full border-4 border-app-border border-t-transparent" /></div>;

  const stepColors = ['var(--app-accent)', 'var(--app-primary)', 'var(--app-success)', 'var(--app-info)'];
  const stepIcons = [UserIcon, BookOpen, GraduationCap, Clock];
  const stepTitles = [t('setup_profile'), t('what_teach'), t('what_learn'), t('when_available')];
  const stepSubs = [t('profile_sub'), t('teach_sub'), t('learn_sub'), t('avail_sub')];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-app-bg">
      <div className="sticky top-0 z-10 border-b-2 border-app-border bg-[#141414]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo className="[&>div]:bg-[#FFD23F] [&>div]:text-[#141414] [&>div]:border-2 [&>div]:border-[#2A2A2A]" />
          <div className="flex items-center gap-2">
            <ToggleControls compact />
            <span className="rounded-full border-2 border-white/20 bg-white/10 px-3 py-1 text-xs font-black text-white">{t('step')} {step + 1} {t('of')} {steps.length}</span>
          </div>
        </div>
        <div className="h-2.5 overflow-hidden border-t-2 border-white/15 bg-[#141414]">
          <div className="h-full bg-app-accent transition-all duration-500 ease-out" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <div className="mb-8 animate-slide-up-lg text-center">
            <div className="mb-4 inline-flex h-16 w-16 animate-pop-in place-items-center rounded-2xl border-2 border-app-border text-app-text shadow-[4px_4px_0_var(--app-shadow)]" style={{ background: stepColors[step] }}>
              {(() => { const Icon = stepIcons[step]; return <Icon className="h-8 w-8" />; })()}
            </div>
            <h1 className="text-4xl font-black leading-none tracking-[-.05em]">{stepTitles[step]}</h1>
            <p className="mt-3 font-medium text-app-muted">{stepSubs[step]}</p>
          </div>

          {step === 0 && (
            <div className="animate-slide-up space-y-5">
              <div className="card space-y-5 p-6">
                <div className="flex items-center gap-4">
                  <div className="group relative">
                    <Avatar name={displayName || '?'} avatarUrl={avatarUrl} size="xl" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="absolute inset-0 flex place-items-center justify-center rounded-full border-2 border-app-border bg-app-border/60 opacity-0 transition-opacity group-hover:opacity-100">
                      {uploadingAvatar ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleAvatarUpload(file); }} />
                  </div>
                  <div>
                    <p className="font-black">{t('profile_photo')}</p>
                    <p className="text-sm text-app-muted">{t('click_to_upload')}</p>
                    {avatarUrl && <button onClick={() => setAvatarUrl('')} className="mt-1 text-sm font-bold text-app-primary underline">{t('remove_photo')}</button>}
                  </div>
                </div>
                <div><label className="label" htmlFor="ob-name">{t('display_name')}</label><input id="ob-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex Rivera" className="input" /></div>
                <div><label className="label" htmlFor="ob-bio">{t('bio')} <span className="font-normal text-app-muted">{t('optional')}</span></label><textarea id="ob-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell others about your background and what excites you about swapping skills..." className="input min-h-[80px] resize-y" maxLength={300} /><p className="mt-1 text-xs text-app-muted">{bio.length}/300</p></div>
                <div><label className="label" htmlFor="ob-location"><MapPin className="mr-1 inline h-3.5 w-3.5" />{t('location')} <span className="font-normal text-app-muted">{t('optional')}</span></label><input id="ob-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Brooklyn, NY" className="input" /></div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="animate-slide-up space-y-5">
              <div className="space-y-3 rounded-2xl border-2 border-app-border bg-app-accent p-4 shadow-[5px_5px_0_var(--app-shadow)]">
                <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide"><Sparkles className="h-3.5 w-3.5" /> {t('add_custom_skill')}</p>
                <div className="flex flex-wrap gap-2">
                  <input type="text" value={customSkillInput} onChange={(e) => setCustomSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkillToTeach(); } }} placeholder="e.g. Pottery, Kubernetes, Calligraphy..." className="input min-w-[180px] flex-1" />
                  <select value={customCategory} onChange={(e) => setCustomCategory(e.target.value as SkillCategory)} className="input w-auto">{categories.filter((c) => c !== 'All').map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select>
                  <button onClick={addCustomSkillToTeach} disabled={customSkillInput.trim().length < 2} className="btn-primary"><Plus className="h-4 w-4" /> {t('add')}</button>
                </div>
              </div>
              <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-app-muted" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('search_skills')} className="input pl-11" /></div>
              <div className="flex flex-wrap gap-2">{categories.map((cat) => <button key={cat} onClick={() => setActiveCategory(cat)} className={`rounded-full px-3.5 py-1.5 text-xs font-black border-2 border-app-border transition-all ${activeCategory === cat ? 'bg-app-border text-app-surface scale-105' : 'bg-app-surface hover:bg-app-accent'}`}>{cat}</button>)}</div>
              {teachSkills.size > 0 && (
                <div className="card animate-scale-in space-y-3 p-4">
                  <p className="text-xs font-black uppercase tracking-wide">{t('selected')} ({teachSkills.size})</p>
                  <div className="space-y-2">{Array.from(teachSkills.entries()).map(([skillId, proficiency]) => { const skill = skillsCatalog.find((s) => s.id === skillId); if (!skill) return null; const Icon = getIcon(skill.icon); return (
                    <div key={skillId} className="flex items-center justify-between gap-3 rounded-xl border-2 border-app-border/20 bg-app-surface p-2.5">
                      <div className="flex min-w-0 items-center gap-2.5"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-app-border/20 bg-white"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-bold">{skill.name}</p><p className="text-xs text-app-muted">{skill.category}</p></div></div>
                      <div className="flex items-center gap-1.5"><div className="flex gap-1">{[1, 2, 3, 4, 5].map((level) => <button key={level} onClick={() => setProficiency(skillId, level)} className={`h-2.5 w-2.5 rounded-full border border-app-border transition-all ${level <= proficiency ? 'bg-app-primary scale-110' : 'bg-app-surface hover:scale-110'}`} title={`Level ${level}`} />)}</div><button onClick={() => toggleTeach(skillId)} className="p-1 text-app-muted hover:text-app-primary"><X className="h-4 w-4" /></button></div>
                    </div>
                  ); })}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{filteredSkills.map((skill) => { const selected = teachSkills.has(skill.id); const Icon = getIcon(skill.icon); return (
                <button key={skill.id} onClick={() => toggleTeach(skill.id)} className={`flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-all ${selected ? 'border-app-border bg-app-accent shadow-[3px_3px_0_var(--app-shadow)] scale-[1.02]' : 'border-app-border/15 bg-app-surface hover:border-app-border hover:bg-app-accent/30'}`}>
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 border-app-border/15 ${selected ? 'bg-white' : 'bg-app-bg'}`}><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{skill.name}</p><p className="text-[11px] text-app-muted">{skill.category}</p></div>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ); })}</div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-slide-up space-y-5">
              <div className="space-y-3 rounded-2xl border-2 border-app-border bg-app-success p-4 shadow-[5px_5px_0_var(--app-shadow)]">
                <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide"><Sparkles className="h-3.5 w-3.5" /> {t('add_custom_skill')}</p>
                <div className="flex flex-wrap gap-2">
                  <input type="text" value={customSkillInput} onChange={(e) => setCustomSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkillToLearn(); } }} placeholder="e.g. DJing, Blockchain, Watercolor..." className="input min-w-[180px] flex-1" />
                  <select value={customCategory} onChange={(e) => setCustomCategory(e.target.value as SkillCategory)} className="input w-auto">{categories.filter((c) => c !== 'All').map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select>
                  <button onClick={addCustomSkillToLearn} disabled={customSkillInput.trim().length < 2} className="btn-primary"><Plus className="h-4 w-4" /> {t('add')}</button>
                </div>
              </div>
              <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-app-muted" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('search_skills')} className="input pl-11" /></div>
              <div className="flex flex-wrap gap-2">{categories.map((cat) => <button key={cat} onClick={() => setActiveCategory(cat)} className={`rounded-full px-3.5 py-1.5 text-xs font-black border-2 border-app-border transition-all ${activeCategory === cat ? 'bg-app-border text-app-surface scale-105' : 'bg-app-surface hover:bg-app-success'}`}>{cat}</button>)}</div>
              {learnSkills.size > 0 && (
                <div className="card animate-scale-in space-y-3 p-4">
                  <p className="text-xs font-black uppercase tracking-wide">{t('want_to_learn')} ({learnSkills.size})</p>
                  <div className="space-y-2">{Array.from(learnSkills.entries()).map(([skillId, urgency]) => { const skill = skillsCatalog.find((s) => s.id === skillId); if (!skill) return null; const Icon = getIcon(skill.icon); const urgencyLabels = ['', t('just_curious'), t('somewhat'), t('really_want')]; return (
                    <div key={skillId} className="flex items-center justify-between gap-3 rounded-xl border-2 border-app-border/20 bg-app-surface p-2.5">
                      <div className="flex min-w-0 items-center gap-2.5"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-app-border/20 bg-white"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-bold">{skill.name}</p><p className="text-xs text-app-muted">{skill.category}</p></div></div>
                      <div className="flex items-center gap-1.5"><select value={urgency} onChange={(e) => setUrgency(skillId, Number(e.target.value))} className="rounded-lg border-2 border-app-border bg-app-surface px-2 py-1 text-xs font-bold focus:outline-none focus:border-app-primary"><option value={1}>{urgencyLabels[1]}</option><option value={2}>{urgencyLabels[2]}</option><option value={3}>{urgencyLabels[3]}</option></select><button onClick={() => toggleLearn(skillId)} className="p-1 text-app-muted hover:text-app-primary"><X className="h-4 w-4" /></button></div>
                    </div>
                  ); })}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{filteredSkills.map((skill) => { const selected = learnSkills.has(skill.id); const Icon = getIcon(skill.icon); return (
                <button key={skill.id} onClick={() => toggleLearn(skill.id)} className={`flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-all ${selected ? 'border-app-border bg-app-success shadow-[3px_3px_0_var(--app-shadow)] scale-[1.02]' : 'border-app-border/15 bg-app-surface hover:border-app-border hover:bg-app-success/30'}`}>
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 border-app-border/15 ${selected ? 'bg-white' : 'bg-app-bg'}`}><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{skill.name}</p><p className="text-[11px] text-app-muted">{skill.category}</p></div>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ); })}</div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-slide-up space-y-5">
              <div className="card space-y-4 p-6">
                {availability.length === 0 && (
                  <div className="animate-fade-in py-8 text-center">
                    <div className="mb-3 inline-grid h-14 w-14 place-items-center rounded-2xl border-2 border-app-border bg-app-bg"><Clock className="h-7 w-7" /></div>
                    <p className="font-medium text-app-muted">{t('no_availability')}</p>
                  </div>
                )}
                {availability.map((slot, i) => (
                  <div key={slot.id} className="flex flex-wrap items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <select value={slot.day_of_week} onChange={(e) => updateAvailability(slot.id, 'day_of_week', Number(e.target.value))} className="input min-w-[120px] flex-1">{DAYS.map((day, i) => <option key={i} value={i}>{day}</option>)}</select>
                    <select value={slot.start_hour} onChange={(e) => updateAvailability(slot.id, 'start_hour', Number(e.target.value))} className="input w-28">{Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{formatTime(h)}</option>)}</select>
                    <span className="text-sm font-bold text-app-muted">{t('to')}</span>
                    <select value={slot.end_hour} onChange={(e) => { const newEnd = Number(e.target.value); updateAvailability(slot.id, 'end_hour', Math.max(newEnd, slot.start_hour + 1)); }} className="input w-28">{Array.from({ length: 24 }).map((_, h) => <option key={h + 1} value={h + 1}>{formatTime(h + 1)}</option>)}</select>
                    <button onClick={() => removeAvailability(slot.id)} className="rounded-full p-2 text-app-muted hover:bg-app-primary hover:text-white"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <button onClick={addAvailability} className="btn-secondary w-full"><Plus className="h-4 w-4" /> {t('add_time_slot')}</button>
                <div className="flex items-start gap-2 rounded-xl border-2 border-app-border bg-app-accent px-4 py-3 text-sm font-bold"><Sparkles className="mt-0.5 h-4 w-4 shrink-0" /><p>{t('skip_availability')}</p></div>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-ghost"><ChevronLeft className="h-4 w-4" /> {t('back')}</button>
            {step < steps.length - 1 ? (
              <button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="btn-primary group">{t('continue')} <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
            ) : (
              <button onClick={handleFinish} disabled={submitting} className="btn-primary group">{submitting ? t('finishing') : t('complete_setup')} <Check className="h-4 w-4 transition-transform group-hover:scale-110" /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
