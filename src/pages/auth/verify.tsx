import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import GlassmorphicCard from '@/components/auth/GlassmorphicCard';
import { useTheme } from '@/context/ThemeContext';
import ThreeBackground from '@/components/auth/ThreeBackground';
import CustomFonts from '@/components/auth/CustomFonts';

export default function VerifyPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { themeColor } = useTheme();

  useEffect(() => {
    // Get email from localStorage
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    }

    // Check if this is a redirect back from Supabase auth
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // User has been verified and signed in
        setVerified(true);
        setVerifying(false);
        
        // Clear the stored email
        localStorage.removeItem('pendingVerificationEmail');
        
        // Redirect to home after a delay
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else if (event === 'USER_UPDATED') {
        // User has been updated (email verified)
        setVerified(true);
        setVerifying(false);
      }
    });

    // If we have a token in the URL, the user clicked the email link
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      setVerifying(true);
      // The auth state change listener above will handle the verification
    } else {
      // Not a redirect from email verification
      setVerifying(false);
    }

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleResendVerification = async () => {
    if (!email) {
      setError('No email found. Please go back to sign up.');
      return;
    }

    try {
      setVerifying(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`
        }
      });

      if (error) throw error;

      alert('Verification email has been resent. Please check your inbox.');
    } catch (error: any) {
      setError(error.message || 'Failed to resend verification email');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      <CustomFonts />
      
      {/* Background with Three.js animation */}
      <ThreeBackground />
      
      {/* Background gradient */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: `radial-gradient(circle at top right, ${themeColor}33, rgba(0, 0, 0, 0.9))`
        }}
      />
      
      {/* Decorative elements */}
      <div className="fixed top-20 right-20 w-40 h-40 rounded-full bg-white/5 backdrop-blur-sm z-0" />
      <div className="fixed bottom-20 left-20 w-60 h-60 rounded-full bg-white/5 backdrop-blur-sm z-0" />
      <div 
        className="fixed top-1/3 left-1/4 w-80 h-80 rounded-full opacity-20 blur-3xl z-0"
        style={{ background: `radial-gradient(circle, ${themeColor}44 0%, transparent 70%)` }}
      />
      
      
      {/* Verification card */}
      <div className="relative z-10 w-full max-w-md">
        <GlassmorphicCard className="w-full">
          {verified ? (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-500/20 p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white">Email Verified!</h2>
              <p className="text-white/70">
                Your email has been successfully verified. You will be redirected to the dashboard shortly.
              </p>
              <div className="flex justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-white/20 rounded-full border-t-white"></div>
              </div>
            </div>
          ) : verifying ? (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="animate-spin h-12 w-12 border-4 border-white/20 rounded-full border-t-white"></div>
              </div>
              <h2 className="text-2xl font-bold text-white">Verifying Email</h2>
              <p className="text-white/70">
                Please wait while we verify your email address...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white text-center">Verify Your Email</h2>
              <p className="text-white/70 text-center">
                We've sent a verification link to {email || 'your email'}. Please check your inbox and click the link to verify your account.
              </p>
              
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-white rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <p className="text-white/70 text-center text-sm">
                  Didn't receive the email? Check your spam folder or click below to resend.
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={handleResendVerification}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                  >
                    Resend Verification Email
                  </button>
                </div>
                <div className="text-center">
                  <button
                    onClick={() => router.push('/auth/signin')}
                    className="text-white/70 hover:text-white text-sm"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            </div>
          )}
        </GlassmorphicCard>
      </div>
    </div>
  );
}
