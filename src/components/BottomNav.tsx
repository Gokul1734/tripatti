import { Home, Receipt, PlusCircle, ArrowLeftRight } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { sounds } from '@/lib/sounds';

const tabs = [
  { id: 'trips' as const, label: 'Trips', icon: Home },
  { id: 'detail' as const, label: 'Dashboard', icon: Receipt },
  { id: 'add' as const, label: 'Add', icon: PlusCircle },
  { id: 'settle' as const, label: 'Settle', icon: ArrowLeftRight },
];

export default function BottomNav() {
  const { state, dispatch } = useApp();

  return (
    <nav className="glass fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-border shadow-bottom-nav safe-bottom">
      <div className="flex items-center justify-around py-1">
        {tabs.map(tab => {
          const active = state.activeTab === tab.id;
          const disabled = tab.id !== 'trips' && !state.currentTripId;
          return (
            <button
              key={tab.id}
              disabled={disabled}
              onClick={() => {
                if (!disabled) {
                  sounds.navigate();
                  dispatch({ type: 'SET_TAB', tab: tab.id });
                }
              }}
              className={`press-effect flex flex-col items-center gap-0.5 rounded-xl px-4 py-2 transition-all duration-200
                ${active ? 'text-primary' : 'text-muted-foreground'}
                ${disabled ? 'opacity-30' : 'opacity-100'}
              `}
            >
              <tab.icon
                size={active ? 26 : 22}
                strokeWidth={active ? 2.5 : 1.8}
                className="transition-all duration-200"
              />
              <span className={`text-[10px] font-medium transition-all ${active ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
              {active && (
                <div className="mt-0.5 h-1 w-1 rounded-full bg-primary animate-scale-bounce" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
