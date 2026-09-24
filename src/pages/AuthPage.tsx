import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { Logo } from '@/components/Logo';
import { ToggleControls } from '@/components/ToggleControls';
import { ArrowLeft, ArrowRight, Check, Heart, Lightbulb, Repeat, Users } from 'lucide-react';

interface AuthPageProps { onBack?: () => void; }

export function AuthPage({ onBack }: AuthPageProps) {
  const { signIn, signUp } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    if (mode === 'signup' && displayName.trim().length < 2) { setError(t('name_min')); setSubmitting(false); return; }
    if (password.length < 6) { setError(t('password_min')); setSubmitting(false); return; }
    const result = mode === 'signin' ? await signIn(email.trim(), password) : await signUp(email.trim(), password, displayName.trim());
    if (result.error) setError(result.error);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-app-bg p-3 sm:p-6 lg:p-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden border-2 border-app-border bg-app-surface shadow-[10px_10px_0_var(--app-shadow)] lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-[#141414] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border-2 border-white/20 bg-[#FFD23F]/90" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full border-2 border-white/20 bg-[#FF4757]/80" />
          <div className="relative z-10"><Logo className="[&_span]:text-white [&>div]:bg-[#FFD23F] [&>div]:text-[#141414] [&>div]:border-2 [&>div]:border-[#2A2A2A]" /></div>
          <div className="relative z-10">
            <p className="mb-5 text-sm font-black uppercase tracking-[.2em] text-app-accent">{t('fair_exchange')}</p>
            <h1 className="max-w-lg text-6xl font-black leading-[.9] tracking-[-.06em] text-white">{t('come_for_skill')}<br /><span className="text-app-accent">{t('stay_for_people')}</span></h1>
            <div className="mt-10 space-y-4">{[{ icon: Lightbulb, text: t('teach_best') }, { icon: Repeat, text: t('equal_exchange') }, { icon: Heart, text: t('grow_with_people') }].map((item) => <div key={item.text} className="flex items-center gap-3 font-black text-white"><div className="grid h-10 w-10 place-items-center rounded-full border-2 border-white/30 bg-white/10"><item.icon className="h-5 w-5" /></div>{item.text}</div>)}</div>
          </div>
          <p className="relative z-10 text-sm font-bold text-app-accent">{t('join_community')}</p>
        </section>

        <section className="relative flex items-center justify-center p-6 sm:p-12">
          <div className="absolute right-4 top-4 flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 rounded-full border-2 border-app-border bg-app-surface px-3 py-1.5 text-xs font-black text-app-text shadow-[3px_3px_0_var(--app-shadow)] transition-all hover:-translate-y-0.5 hover:bg-app-accent hover:text-ink-900 sm:text-sm"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t('back_to_home')}
              </button>
            )}
            <ToggleControls />
          </div>
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center justify-between lg:hidden"><Logo className="[&>div]:bg-app-primary [&>div]:border-2 [&>div]:border-app-border" /></div>
            <div className="mb-8"><div className="mb-5 inline-flex rotate-[-2deg] items-center gap-2 border-2 border-app-border bg-app-accent px-3 py-1.5 text-xs font-black uppercase text-app-border shadow-[3px_3px_0_var(--app-shadow)]"><Users className="h-3.5 w-3.5" /> {t('welcome_curious')}</div><h2 className="text-4xl font-black leading-none tracking-[-.05em] text-app-text">{mode === 'signin' ? t('welcome_back') : t('make_first_swap')}</h2><p className="mt-3 font-medium text-app-muted">{mode === 'signin' ? t('next_exchange_waiting') : t('create_account')}</p></div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && <div><label className="label" htmlFor="displayName">{t('your_name')}</label><input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex Rivera" className="input" autoComplete="name" /></div>}
              <div><label className="label" htmlFor="email">{t('email')}</label><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input" autoComplete="email" required /></div>
              <div><label className="label" htmlFor="password">{t('password')}</label><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="input" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required /></div>
              {error && <div className="border-2 border-app-border bg-app-accent px-4 py-3 text-sm font-bold">{error}</div>}
              <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full py-4 text-base">{submitting ? t('please_wait') : mode === 'signin' ? t('sign_in') : t('create_account_btn')}<ArrowRight className="h-5 w-5" /></button>
            </form>
            <p className="mt-7 text-center text-sm font-medium text-app-muted">{mode === 'signin' ? t('no_account') + ' ' : t('have_account') + ' '}<button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }} className="font-black text-app-primary underline underline-offset-2">{mode === 'signin' ? t('sign_up') : t('sign_in')}</button></p>
            <div className="mt-10 flex items-center justify-center gap-2 text-xs font-bold text-app-muted"><Check className="h-4 w-4 text-app-primary" /> {t('no_fees')}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
