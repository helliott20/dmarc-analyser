'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { KnownSenderDialog } from './known-sender-dialog';

interface AddKnownSenderButtonProps {
  orgSlug: string;
}

export function AddKnownSenderButton({ orgSlug }: AddKnownSenderButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Known Sender
      </Button>
      <KnownSenderDialog orgSlug={orgSlug} open={open} onOpenChange={setOpen} />
    </>
  );
}
