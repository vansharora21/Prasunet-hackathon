'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import AppShell from '@/components/AppShell';

/**
 * Wraps the app in the sidebar shell for every route except /login.
 * If the user is not authenticated, redirects to /login.
 */
export default function ShellOrLogin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === '/login') return;
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [pathname, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!isAuthenticated()) {
    // Prevent flash of the shell while the redirect effect runs.
    return null;
  }

  return <AppShell>{children}</AppShell>;
}