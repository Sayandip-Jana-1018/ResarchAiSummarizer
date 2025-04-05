import type { AppProps } from 'next/app';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import '../styles/globals.css';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/layout/Layout';
import { useRouter } from 'next/router';

// Pages that don't need the main layout (auth pages, etc.)
const noLayoutPages = ['/auth/signin', '/auth/signup'];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const showLayout = !noLayoutPages.includes(router.pathname);

  return (
    <ThemeProvider>
      <AuthProvider>
        {showLayout ? (
          <Layout>
            <Component {...pageProps} />
          </Layout>
        ) : (
          <Component {...pageProps} />
        )}
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
