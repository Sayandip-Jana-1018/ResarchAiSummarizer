import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

export default function AuthPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // If user is already authenticated, redirect to home
    if (user) {
      router.push('/');
    } else {
      // Otherwise redirect to signin
      router.push('/auth/signin');
    }
  }, [user, router]);

  // Return null as this is just a redirect page
  return null;
}
