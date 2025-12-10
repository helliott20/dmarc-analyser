'use client';

import { useEffect, useState } from 'react';
import { SidebarMenuBadge } from '@/components/ui/sidebar';

interface UnreadAlertsBadgeProps {
  orgSlug: string;
}

export function UnreadAlertsBadge({ orgSlug }: UnreadAlertsBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(
          `/api/orgs/${orgSlug}/alerts?read=false&dismissed=false&limit=1`
        );
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [orgSlug]);

  if (unreadCount === 0) {
    return null;
  }

  return (
    <SidebarMenuBadge className="bg-destructive text-destructive-foreground">
      {unreadCount > 99 ? '99+' : unreadCount}
    </SidebarMenuBadge>
  );
}
