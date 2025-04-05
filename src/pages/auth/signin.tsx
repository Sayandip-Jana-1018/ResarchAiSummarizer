import { useState } from 'react';
import { useRouter } from 'next/router';
import SignInForm from '@/components/auth/SignInForm';
import SignUpForm from '@/components/auth/SignUpForm';
import { useTheme } from '@/context/ThemeContext';
import ThreeBackground from '@/components/auth/ThreeBackground';
import CustomFonts from '@/components/auth/CustomFonts';

export default function AuthPage() {
  const [isSignIn, setIsSignIn] = useState(true);
  const { themeColor } = useTheme();
  const router = useRouter();

  const toggleForm = () => {
    setIsSignIn(!isSignIn);
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
    
      
      {/* Auth form */}
      <div className="relative z-10 w-full max-w-md">
        {isSignIn ? (
          <SignInForm onToggleForm={toggleForm} />
        ) : (
          <SignUpForm onToggleForm={toggleForm} />
        )}
      </div>
    </div>
  );
}
