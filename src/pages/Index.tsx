import { AppProvider, useApp } from '@/store/AppContext';
import MobileShell from '@/components/MobileShell';
import BottomNav from '@/components/BottomNav';
import TripsPage from '@/components/TripsPage';
import TripDetailPage from '@/components/TripDetailPage';
import AddExpensePage from '@/components/AddExpensePage';
import SettlePage from '@/components/SettlePage';
import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

function AppContent() {
  const { state } = useApp();
  const [online, setOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const on = () => { setOnline(true); setShowStatus(true); setTimeout(() => setShowStatus(false), 2000); };
    const off = () => { setOnline(false); setShowStatus(true); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return (
    <MobileShell>
      {/* Online/Offline indicator */}
      {showStatus && (
        <div className={`fixed top-0 left-1/2 z-50 -translate-x-1/2 w-full max-w-[430px] px-4 pt-2 animate-slide-down`}>
          <div className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-medium ${online ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            {online ? 'Back online' : 'You\'re offline — changes saved locally'}
          </div>
        </div>
      )}

      {state.activeTab === 'trips' && <TripsPage />}
      {state.activeTab === 'detail' && <TripDetailPage />}
      {state.activeTab === 'add' && <AddExpensePage />}
      {state.activeTab === 'settle' && <SettlePage />}

      <BottomNav />
    </MobileShell>
  );
}

export default function Index() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
