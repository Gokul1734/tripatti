import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useTrips } from '@/hooks/useTrips';
import MobileShell from '@/components/MobileShell';
import BottomNav from '@/components/BottomNav';
import TripsPage from '@/components/TripsPage';
import TripDetailPage from '@/components/TripDetailPage';
import AddExpensePage from '@/components/AddExpensePage';
import SettlePage from '@/components/SettlePage';
import AuthPage from '@/components/AuthPage';
import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Bell, Loader2 } from 'lucide-react';
import { subscribeToPush, isPushSupported } from '@/lib/push-notifications';

type Tab = 'trips' | 'detail' | 'add' | 'settle';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { trips, loading: tripsLoading, currentTrip, currentTripId, setCurrentTripId, refetch } = useTrips();
  const [activeTab, setActiveTab] = useState<Tab>('trips');
  const [online, setOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);
  const [pushAsked, setPushAsked] = useState(false);

  useEffect(() => {
    const on = () => { setOnline(true); setShowStatus(true); setTimeout(() => setShowStatus(false), 2000); };
    const off = () => { setOnline(false); setShowStatus(true); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Don't register in iframes or preview hosts
      const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
      const isPreviewHost = window.location.hostname.includes('id-preview--') || window.location.hostname.includes('lovableproject.com');
      
      if (!isInIframe && !isPreviewHost) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    }
  }, []);

  // Ask for push notification permission after login
  useEffect(() => {
    if (user && !pushAsked && isPushSupported()) {
      setPushAsked(true);
      // Small delay to not overwhelm user
      setTimeout(() => {
        subscribeToPush(user.id);
      }, 3000);
    }
  }, [user, pushAsked]);

  if (authLoading) {
    return (
      <MobileShell>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </MobileShell>
    );
  }

  if (!user) {
    return (
      <MobileShell>
        <AuthPage />
      </MobileShell>
    );
  }

  if (tripsLoading) {
    return (
      <MobileShell>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading your trips...</p>
          </div>
        </div>
      </MobileShell>
    );
  }

  const handleSelectTrip = (tripId: string) => {
    setCurrentTripId(tripId);
    setActiveTab('detail');
  };

  const handleTabChange = (tab: Tab) => {
    if (tab === 'trips') {
      setCurrentTripId(null);
    }
    setActiveTab(tab);
  };

  return (
    <MobileShell>
      {showStatus && (
        <div className="fixed top-0 left-1/2 z-50 -translate-x-1/2 w-full max-w-[430px] px-4 pt-2 animate-slide-down">
          <div className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-medium ${online ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            {online ? 'Back online' : 'You\'re offline — changes saved locally'}
          </div>
        </div>
      )}

      {activeTab === 'trips' && <TripsPage trips={trips} onSelectTrip={handleSelectTrip} onRefetch={refetch} />}
      {activeTab === 'detail' && currentTrip && (
        <TripDetailPage
          trip={currentTrip}
          onBack={() => handleTabChange('trips')}
          onAddExpense={() => setActiveTab('add')}
          onSettle={() => setActiveTab('settle')}
          onRefetch={refetch}
        />
      )}
      {activeTab === 'add' && currentTrip && (
        <AddExpensePage trip={currentTrip} onBack={() => setActiveTab('detail')} onRefetch={refetch} />
      )}
      {activeTab === 'settle' && currentTrip && (
        <SettlePage trip={currentTrip} onBack={() => setActiveTab('detail')} onRefetch={refetch} />
      )}

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} hasTripSelected={!!currentTripId} />
    </MobileShell>
  );
}

export default function Index() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
