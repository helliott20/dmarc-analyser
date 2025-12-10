'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface DataDeletionSectionProps {
  orgSlug: string;
  organizationName: string;
  isOwner: boolean;
}

export function DataDeletionSection({
  orgSlug,
  organizationName,
  isOwner,
}: DataDeletionSectionProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteData = async () => {
    if (confirmationText !== organizationName) {
      toast.error('Organization name does not match');
      return;
    }

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/orgs/${orgSlug}/data`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationName: confirmationText }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete data');
      }

      toast.success('All organization data has been successfully deleted');

      setShowDeleteDialog(false);
      setConfirmationText('');

      // Refresh the page after a short delay
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error: any) {
      console.error('Failed to delete data:', error);
      toast.error(error.message || 'Failed to delete data');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone - Delete All Data
        </CardTitle>
        <CardDescription>
          Permanently delete all data associated with this organization. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isOwner ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-900">
              Only organization owners can delete all data. Contact your organization owner if you
              need to perform this action.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-destructive">
                  Warning: This action is irreversible
                </p>
                <p className="text-sm text-destructive/90">
                  Deleting all data will permanently remove:
                </p>
                <ul className="list-disc list-inside text-sm text-destructive/90 space-y-1 ml-2">
                  <li>All DMARC reports and records</li>
                  <li>All email sources and classifications</li>
                  <li>All forensic reports</li>
                  <li>All timeline and historical data</li>
                  <li>All alerts and notifications</li>
                  <li>All data exports</li>
                </ul>
                <p className="text-sm text-destructive/90 mt-2">
                  Your organization settings, domains, team members, and integrations will remain
                  intact, but all DMARC data will be deleted.
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Recommendation: Export before deleting
                </p>
                <p className="text-sm text-blue-800">
                  We strongly recommend exporting your data before deletion. Use the Data Export
                  section above to download your data in CSV format for your records.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete All Organization Data
              </Button>
            </div>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>
                      This action cannot be undone. This will permanently delete all DMARC data
                      associated with <strong>{organizationName}</strong>.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-name">
                        Type <strong>{organizationName}</strong> to confirm:
                      </Label>
                      <Input
                        id="confirm-name"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        placeholder="Organization name"
                        className="font-mono"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmationText('')}>
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteData}
                    disabled={confirmationText !== organizationName || isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete All Data
                      </>
                    )}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
