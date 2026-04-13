import { useState } from 'react';
import { lovable } from '@/integrations/lovable/index';
import { sounds } from '@/lib/sounds';
import { Loader2 } from 'lucide-react';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    sounds.tap();

    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });

    if (result.error) {
      setError('Sign in failed. Please try again.');
      setLoading(false);
      return;
    }

    if (result.redirected) {
      return; // browser will redirect
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-[360px] animate-fade-in">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-4xl shadow-card">
            🌴
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Tripzee</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Split expenses, not friendships
          </p>
        </div>

        {/* Features */}
        <div className="mb-8 space-y-3">
          {[
            { emoji: '👥', text: 'Collaborate with your travel group in real-time' },
            { emoji: '💸', text: 'Split expenses fairly with smart calculations' },
            { emoji: '🔔', text: 'Get notified when someone adds an expense' },
          ].map((f, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card animate-fade-in stagger-${i + 1}`}>
              <span className="text-xl">{f.emoji}</span>
              <p className="text-xs text-foreground">{f.text}</p>
            </div>
          ))}
        </div>

        {/* Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="press-effect flex w-full items-center justify-center gap-3 rounded-2xl bg-card py-4 font-semibold text-foreground shadow-card transition-all hover:shadow-card-hover disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {error && (
          <p className="mt-4 text-center text-xs text-destructive animate-fade-in">{error}</p>
        )}

        <p className="mt-8 text-center text-[10px] text-muted-foreground">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
