import { ArrowRight, ArrowUpRight, Heart, Lightbulb, Repeat, Sparkles, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { ToggleControls } from '@/components/ToggleControls';
import { Reveal } from '@/components/Reveal';
import { useI18n } from '@/context/I18nContext';

interface LandingPageProps { onGetStarted: () => void; onSignIn: () => void; }

// Homepage palette: each major section gets one of the three brand colors.
const MEADOW = '#BAD27D';
const ORCHID = '#DBA5DF';
const PUMPKIN = '#EB7432';
const LAVENDER = '#A59FF9';
const INK = '#1A1610'; // neutral near-black for text on light section colors

export function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  const { t, lang } = useI18n();
  const [scrollPct, setScrollPct] = useState(0);

  // Scroll progress bar + a light parallax drift on the hero's blurred blobs.
  // Throttled to one update per animation frame so it doesn't force a React
  // re-render on every scroll pixel (that was competing with GSAP's own
  // rAF-driven tweens elsewhere on the page and causing visible jank).
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const h = document.documentElement;
        const pct = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
        setScrollPct(Math.min(1, Math.max(0, pct)));
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parallax = reducedMotion ? 0 : scrollPct * 120;

  const steps = [
    { number: '01', title: t('share_a_skill'), copy: t('share_a_skill_desc'), icon: Lightbulb, color: `bg-[${LAVENDER}] text-[${INK}]` },
    { number: '02', title: t('find_your_person'), copy: t('find_your_person_desc'), icon: Users, color: `bg-[${MEADOW}] text-[${INK}]` },
    { number: '03', title: t('make_the_swap'), copy: t('make_the_swap_desc'), icon: Heart, color: `bg-[${PUMPKIN}] text-white` },
  ];

  return (
    <div className="min-h-screen bg-[#1A1610] text-white">
      {/* Scroll progress bar */}
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-black/20">
        <div
          className="h-full bg-gradient-to-r from-[#EB7432] via-[#A59FF9] to-[#BAD27D] transition-[width] duration-150 ease-out"
          style={{ width: `${scrollPct * 100}%` }}
        />
      </div>

      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">
            <Logo className="[&>div]:border-2 [&>div]:border-white/30 [&>div]:bg-[#A59FF9] [&>div]:text-[#1A1610] [&>div]:shadow-[3px_3px_0_#A59FF9] [&>span]:text-white" />
          </button>
          <nav className="hidden items-center gap-7 rounded-full border-2 border-white/20 bg-black/30 px-5 py-2.5 text-sm font-black text-white backdrop-blur-sm md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-[#DBA5DF]">{t('how_it_works')}</a>
            <a href="#community" className="transition-colors hover:text-[#DBA5DF]">{t('the_community')}</a>
            <a href="#why-swap" className="transition-colors hover:text-[#DBA5DF]">{t('why_swap')}</a>
          </nav>
          <div className="flex items-center gap-2">
            <ToggleControls />
            <button onClick={onSignIn} className="hidden rounded-full px-4 py-2 text-sm font-black text-white transition-colors hover:bg-white/10 sm:inline-flex">{t('log_in')}</button>
            <button onClick={onGetStarted} className="rounded-full border-2 border-white/30 bg-[#EB7432] px-4 py-2.5 text-sm font-black text-white shadow-[3px_3px_0_#A59FF9] transition-transform hover:-translate-y-0.5">{t('join_swap')} <ArrowUpRight className="inline h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-[1440px] overflow-hidden border-b-2 border-white/10 bg-[#1A1610]">
          <div className="relative min-h-[720px] pt-20 sm:min-h-[820px] sm:pt-24">
            <img src="/real-swap-hero.png" alt={lang === 'ar' ? 'مجتمع ملون من الناس يشاركون المهارات' : 'A colorful community of people sharing skills'} className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

            {/* Blobs drift slowly as you scroll, for a subtle parallax feel */}
            <div
              className="pointer-events-none absolute -left-20 top-[15%] h-72 w-72 rounded-full bg-[#EB7432] opacity-20 blur-[100px] transition-transform duration-300 ease-out"
              style={{ transform: `translateY(${parallax * 0.4}px)` }}
            />
            <div
              className="pointer-events-none absolute right-0 top-[40%] h-80 w-80 rounded-full bg-[#BAD27D] opacity-15 blur-[120px] transition-transform duration-300 ease-out"
              style={{ transform: `translateY(${parallax * 0.7}px)` }}
            />
            <div
              className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#DBA5DF] opacity-15 blur-[100px] transition-transform duration-300 ease-out"
              style={{ transform: `translateY(${-parallax * 0.5}px)` }}
            />

            <div className="pointer-events-none absolute left-[7%] top-[27%] hidden -rotate-6 rounded-full border-2 border-white/30 bg-[#A59FF9] px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-[#1A1610] shadow-[4px_4px_0_#A59FF9] animate-float-slow lg:block">{t('learn_together')}</div>
            <div className="pointer-events-none absolute right-[7%] top-[34%] hidden rotate-6 rounded-full border-2 border-white/30 bg-[#EB7432] px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-white shadow-[4px_4px_0_#A59FF9] animate-float lg:block">{t('no_money_needed_badge')}</div>

            <div className="absolute inset-x-0 bottom-0 flex justify-center px-5 pb-6 sm:pb-10">
              <div className="flex w-full max-w-5xl flex-col items-center justify-between gap-5 border-2 border-white/20 bg-black/25 px-6 py-4 text-center shadow-[7px_7px_0_#A59FF9] backdrop-blur-[2px] sm:px-8 sm:py-5 lg:flex-row lg:text-left animate-slide-up">
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-xs font-black uppercase tracking-[.2em] text-[#BAD27D]">{t('skill_sharing_curious')}</p>
                  <h1 className="text-2xl font-black leading-[.95] tracking-[-.05em] text-white sm:text-4xl lg:text-[2.75rem]">{t('learn_something')} <span className="text-[#EB7432]">{t('teach_something')}</span> <span className="text-[#A59FF9]">{t('swap_skills')}</span></h1>
                  <p className="mt-2 max-w-2xl font-bold leading-relaxed text-white/80 lg:mx-0">{t('hero_sub')}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-center gap-3 lg:justify-end">
                  <button onClick={onGetStarted} className="rounded-full border-2 border-white/30 bg-[#EB7432] px-6 py-3.5 font-black text-white shadow-[4px_4px_0_#A59FF9] transition-transform hover:-translate-y-1">{t('find_your_swap')} <ArrowRight className="inline h-5 w-5" /></button>
                  <a href="#how-it-works" className="rounded-full border-2 border-white/30 bg-[#A59FF9] px-5 py-3 font-black text-[#1A1610] shadow-[3px_3px_0_#A59FF9]">{t('see_how_it_works_btn')}</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Swap - Meadow Grass section */}
        <section id="why-swap" className="mx-auto grid max-w-[1440px] gap-5 bg-[#BAD27D] px-5 py-20 text-[#1A1610] sm:px-10 sm:py-28 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
          <Reveal>
            <p className="mb-3 text-sm font-black uppercase tracking-[.2em] text-[#1A1610]/70">{t('better_network')}</p>
            <h2 className="max-w-xl text-5xl font-black leading-[.9] tracking-[-.06em] text-[#1A1610] sm:text-7xl">{t('people_best_tool')}<br /><span className="text-[#EB7432]">{t('best_tool')}</span></h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            <Reveal delay={100}>
              <div className="border-2 border-[#1A1610]/15 bg-white p-6 text-[#1A1610] shadow-[5px_5px_0_#EB7432] transition-transform duration-300 hover:-translate-y-1.5"><Repeat className="mb-8 h-8 w-8" /><h3 className="text-2xl font-black">{t('equal_exchange_title')}</h3><p className="mt-2 font-medium leading-relaxed">{t('equal_exchange_desc')}</p></div>
            </Reveal>
            <Reveal delay={220}>
              <div className="border-2 border-[#1A1610]/15 bg-[#DBA5DF] p-6 text-[#1A1610] shadow-[5px_5px_0_#A59FF9] transition-transform duration-300 hover:-translate-y-1.5"><Sparkles className="mb-8 h-8 w-8" /><h3 className="text-2xl font-black">{t('endless_curiosity')}</h3><p className="mt-2 font-medium leading-relaxed">{t('endless_curiosity_desc')}</p></div>
            </Reveal>
          </div>
        </section>

        {/* How it works - Orchid Bloom section */}
        <section id="how-it-works" className="mx-auto max-w-[1440px] border-y-2 border-[#1A1610]/10 bg-[#DBA5DF] px-5 py-20 text-[#1A1610] sm:px-10 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <p className="mb-3 text-sm font-black uppercase tracking-[.2em] text-[#1A1610]/70">{t('how_it_works_title')}</p>
                  <h2 className="text-5xl font-black leading-[.9] tracking-[-.06em] text-[#1A1610] sm:text-7xl">{t('three_moves')}<br /><span className="text-[#EB7432]">{t('big_ripple_title')}</span></h2>
                </div>
                <p className="max-w-xs font-bold text-[#1A1610]/70">{t('next_favorite_skill')}</p>
              </div>
            </Reveal>
            <div className="grid gap-5 md:grid-cols-3">
              {steps.map((step, i) => (
                <Reveal key={step.number} delay={i * 120} variant="scale">
                  <article className={`border-2 border-[#1A1610]/15 p-7 shadow-[6px_6px_0_#1A1610]/20 transition-transform duration-300 hover:-translate-y-2 ${step.color}`}>
                    <div className="mb-12 flex items-start justify-between">
                      <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-current/30 bg-black/10">
                        <step.icon className="h-7 w-7" />
                      </div>
                      <span className="text-5xl font-black opacity-80">{step.number}</span>
                    </div>
                    <h3 className="text-2xl font-black">{step.title}</h3>
                    <p className="mt-3 font-medium leading-relaxed opacity-90">{step.copy}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Community - Pumpkin Orange section */}
        <section id="community" className="mx-auto max-w-[1440px] bg-[#EB7432] px-5 py-20 text-center text-white sm:px-10 sm:py-28">
          <Reveal>
            <p className="mb-3 text-sm font-black uppercase tracking-[.2em] text-white/80">{t('the_community')}</p>
            <h2 className="mx-auto max-w-3xl text-5xl font-black leading-[.9] tracking-[-.06em] text-white sm:text-7xl">{t('bring_your_weird')}<br />{t('wonderful_thing')} <span className="text-[#1A1610]">{t('thing')}</span></h2>
            <p className="mx-auto mt-6 max-w-xl font-bold leading-relaxed text-white/85">{t('community_blurb')}</p>
            <button onClick={onGetStarted} className="mt-8 rounded-full border-2 border-white/40 bg-[#1A1610] px-7 py-4 font-black text-white shadow-[4px_4px_0_#A59FF9] transition-transform hover:-translate-y-1">{t('make_first_swap_btn')} <ArrowRight className="inline h-5 w-5" /></button>
          </Reveal>
          <div className="mx-auto mt-14 flex max-w-3xl flex-wrap justify-center gap-2">
            {(lang === 'ar'
              ? ['فخار', 'بايثون', 'بيانو', 'تصوير', 'لغات', 'تصميم', 'طبخ']
              : ['POTTERY', 'PYTHON', 'PIANO', 'PHOTO', 'LANGUAGES', 'DESIGN', 'COOKING']
            ).map((skill, index) => (
              <Reveal key={skill} delay={index * 60} variant="scale" className="inline-block">
                <span
                  className={`rounded-full border-2 border-white/30 px-4 py-2 text-xs font-black shadow-[2px_2px_0_rgba(0,0,0,0.25)] ${
                    index % 4 === 0 ? 'bg-[#1A1610] text-white' : index % 4 === 1 ? 'bg-[#A59FF9] text-[#1A1610]' : index % 4 === 2 ? 'bg-[#BAD27D] text-[#1A1610]' : 'bg-[#DBA5DF] text-[#1A1610]'
                  }`}
                >
                  {skill}
                </span>
              </Reveal>
            ))}
          </div>
        </section>
        {/* Grow together — closing section.
            dir="ltr" is intentional here and independent of the site language:
            the illustration (hands) in grow-together-bg.png is baked into the
            image on the physical right side and never mirrors. Flexbox's
            `items-center`/default justify follow the page's dir, so under
            dir="rtl" the text block would slide onto the illustration.
            Pinning this section to ltr keeps the text on the physical left in
            both languages; dir on the inner Reveal restores correct
            right-to-left reading order for the Arabic text itself. */}
        <section
          dir="ltr"
          className="relative mx-auto flex min-h-[420px] max-w-[1440px] items-center overflow-hidden border-t-2 border-white/10 bg-[#FFF6DC] bg-cover bg-center px-6 py-16 sm:min-h-[520px] sm:px-12 sm:py-20 lg:min-h-[600px] lg:py-24"
          style={{ backgroundImage: "url('/grow-together-bg.png')" }}
        >
          <Reveal dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`max-w-lg ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
            <p className="mb-3 text-sm font-black uppercase tracking-[.2em] text-[#1A1610]/60">{t('the_community')}</p>
            <h2 className="text-5xl font-black leading-[.9] tracking-[-.05em] text-[#1A1610] sm:text-6xl lg:text-7xl">
              {t('grow_together_line1')}<br />
              <span className="text-[#EB7432]">{t('grow_together_line2')}</span>
            </h2>
            <p className="mt-6 max-w-sm font-bold leading-relaxed text-[#1A1610]/70">{t('grow_together_sub')}</p>
          </Reveal>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 border-t-2 border-white/10 bg-[#1A1610] px-8 py-8 text-white sm:flex-row">
        <Logo className="[&_span]:text-white [&>div]:border-2 [&>div]:border-white/30 [&>div]:bg-[#A59FF9] [&>div]:text-[#1A1610]" />
        <p className="text-sm font-bold text-[#DBA5DF]">{t('footer_tagline')}</p>
        <button onClick={onSignIn} className="text-sm font-black underline underline-offset-4 hover:text-[#A59FF9]">{t('log_in')}</button>
      </footer>
    </div>
  );
}
