import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { I18nProvider, useI18n } from '@/context/I18nContext';
import { AuthPage } from '@/pages/AuthPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { AppShell, type Route } from '@/components/AppShell';
import { DiscoverPage } from '@/pages/DiscoverPage';
import { SwapsPage } from '@/pages/SwapsPage';
import { SwapDetailPage } from '@/pages/SwapDetailPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { PublicProfilePage } from '@/pages/PublicProfilePage';
import { LandingPage } from '@/pages/LandingPage';

type GuestView = 'landing' | 'auth';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const { t } = useI18n();
  const [route, setRoute] = useState<Route>('discover');
  const [openSwapId, setOpenSwapId] = useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [guestView, setGuestView] = useState<GuestView>('landing');
  const wasSignedIn = useRef(false);

  // If a signed-in user signs out, send them to the sign-in page instead
  // of the marketing homepage — landing is only for first-time visitors.
  useEffect(() => {
    if (user) {
      wasSignedIn.current = true;
    } else if (wasSignedIn.current) {
      wasSignedIn.current = false;
      setGuestView('auth');
    }
  }, [user]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('swap/')) {
      setOpenSwapId(hash.slice(5));
    } else if (hash.startsWith('user/')) {
      setViewingUserId(hash.slice(5));
    } else if (['discover', 'swaps', 'dashboard', 'profile'].includes(hash)) {
      setRoute(hash as Route);
      setOpenSwapId(null);
    }
  }, []);

  const navigate = (r: Route) => {
    setRoute(r);
    setOpenSwapId(null);
    setViewingUserId(null);
    window.location.hash = r;
  };

  const openSwap = (id: string) => {
    setViewingUserId(null);
    setOpenSwapId(id);
    window.location.hash = `swap/${id}`;
  };

  const viewProfile = (id: string) => {
    // Viewing your own profile card anywhere should just open the editable
    // profile page rather than the read-only public view.
    if (user && id === user.id) {
      navigate('profile');
      return;
    }
    setOpenSwapId(null);
    setViewingUserId(id);
    window.location.hash = `user/${id}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex items-center justify-center bg-app-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-charcoal-200 border-t-app-primary rounded-full animate-spin" />
          <p className="text-sm text-app-muted">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (guestView === 'auth') {
      return <AuthPage onBack={() => setGuestView('landing')} />;
    }
    return (
      <LandingPage
        onGetStarted={() => setGuestView('auth')}
        onSignIn={() => setGuestView('auth')}
      />
    );
  }

  if (profile && !profile.onboarding_complete) {
    return <OnboardingPage />;
  }

  if (openSwapId) {
    return (
      <AppShell currentRoute="swaps" onNavigate={navigate} onOpenSwap={openSwap}>
        <SwapDetailPage swapId={openSwapId} onBack={() => navigate('swaps')} onViewProfile={viewProfile} />
      </AppShell>
    );
  }

  const closeProfileView = () => {
    setViewingUserId(null);
    window.location.hash = route;
  };

  if (viewingUserId) {
    return (
      <AppShell currentRoute={route} onNavigate={navigate} onOpenSwap={openSwap}>
        <PublicProfilePage userId={viewingUserId} onBack={closeProfileView} />
      </AppShell>
    );
  }

  return (
    <AppShell currentRoute={route} onNavigate={navigate} onOpenSwap={openSwap}>
      {route === 'discover' && <DiscoverPage onOpenSwap={openSwap} onViewProfile={viewProfile} />}
      {route === 'swaps' && <SwapsPage onOpenSwap={openSwap} />}
      {route === 'dashboard' && <DashboardPage onViewProfile={viewProfile} />}
      {route === 'profile' && <ProfilePage />}
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
