'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, Edit, Trash2, Globe, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { KnownSenderDialog } from './known-sender-dialog';

interface KnownSender {
  id: string;
  name: string;
  description: string | null;
  category: string;
  logoUrl: string | null;
  website: string | null;
  ipRanges: string[] | null;
  dkimDomains: string[] | null;
  isGlobal: boolean;
  organizationId: string | null;
}

interface KnownSenderCardProps {
  sender: KnownSender;
  orgSlug: string;
  canManage: boolean;
}

const categoryColors: Record<string, string> = {
  marketing: 'bg-purple-100 text-purple-700',
  transactional: 'bg-blue-100 text-blue-700',
  corporate: 'bg-green-100 text-green-700',
  security: 'bg-red-100 text-red-700',
  other: 'bg-gray-100 text-gray-700',
};

export function KnownSenderCard({ sender, orgSlug, canManage }: KnownSenderCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/known-senders/${sender.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete known sender');
      }

      toast.success('Known sender deleted');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {sender.logoUrl && (
                  <img
                    src={sender.logoUrl}
                    alt={sender.name}
                    className="h-6 w-6 rounded object-contain"
                  />
                )}
                <CardTitle className="text-lg">{sender.name}</CardTitle>
                {sender.isGlobal && (
                  <Badge variant="secondary" className="ml-2">
                    <Shield className="h-3 w-3 mr-1" />
                    Global
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={categoryColors[sender.category] || categoryColors.other}
                >
                  {sender.category}
                </Badge>
                {sender.website && (
                  <a
                    href={sender.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    <Globe className="h-3 w-3" />
                    Website
                  </a>
                )}
              </div>
            </div>
            {canManage && !sender.isGlobal && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {sender.description && (
            <CardDescription>{sender.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            {sender.ipRanges && sender.ipRanges.length > 0 && (
              <div>
                <p className="font-medium mb-1">IP Ranges ({sender.ipRanges.length})</p>
                <div className="text-muted-foreground space-y-1">
                  {sender.ipRanges.slice(0, 3).map((range, i) => (
                    <code key={i} className="block text-xs bg-muted px-2 py-1 rounded">
                      {range}
                    </code>
                  ))}
                  {sender.ipRanges.length > 3 && (
                    <p className="text-xs">
                      +{sender.ipRanges.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )}
            {sender.dkimDomains && sender.dkimDomains.length > 0 && (
              <div>
                <p className="font-medium mb-1">
                  DKIM Domains ({sender.dkimDomains.length})
                </p>
                <div className="text-muted-foreground space-y-1">
                  {sender.dkimDomains.slice(0, 3).map((domain, i) => (
                    <code key={i} className="block text-xs bg-muted px-2 py-1 rounded">
                      {domain}
                    </code>
                  ))}
                  {sender.dkimDomains.length > 3 && (
                    <p className="text-xs">
                      +{sender.dkimDomains.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!sender.isGlobal && (
        <>
          <KnownSenderDialog
            orgSlug={orgSlug}
            sender={sender}
            open={editOpen}
            onOpenChange={setEditOpen}
          />

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Known Sender</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{sender.name}"? This action cannot
                  be undone. Sources linked to this sender will be unlinked.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}
