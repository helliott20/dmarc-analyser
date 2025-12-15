'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface BillingGuardProps {
  orgSlug: string;
  children: React.ReactNode;
}

/**
 * Client-side component that checks billing access on navigation.
 * This complements the server-side check in the layout to catch
 * client-side navigation that bypasses server rendering.
 */
export function BillingGuard({ orgSlug, children }: BillingGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const lastCheckedPath = useRef<string>('');

  useEffect(() => {
    // Skip if already on billing page
    if (pathname.includes('/settings/billing')) {
      return;
    }

    // Skip if we already checked this path (prevents double-checks)
    if (lastCheckedPath.current === pathname) {
      return;
    }

    lastCheckedPath.current = pathname;

    // Check billing access
    fetch(`/api/orgs/${orgSlug}/billing/access`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.allowed && data.reason) {
          router.replace(`/orgs/${orgSlug}/settings/billing?reason=${data.reason}`);
        }
      })
      .catch((err) => {
        // Fail silently - don't block the user on network errors
        console.error('Billing check failed:', err);
      });
  }, [pathname, orgSlug, router]);

  return <>{children}</>;
}
