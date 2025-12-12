'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, X, Loader2, Tag, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DomainTag {
  id: string;
  name: string;
  color: string;
}

interface DomainTagsManagerProps {
  domainId: string;
  orgSlug: string;
  canManage?: boolean;
}

const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

export function DomainTagsManager({ domainId, orgSlug, canManage = false }: DomainTagsManagerProps) {
  const [allTags, setAllTags] = useState<DomainTag[]>([]);
  const [assignedTags, setAssignedTags] = useState<DomainTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch all org tags and assigned tags
  useEffect(() => {
    async function fetchTags() {
      try {
        const [allRes, assignedRes] = await Promise.all([
          fetch(`/api/orgs/${orgSlug}/tags`),
          fetch(`/api/orgs/${orgSlug}/domains/${domainId}/tags`),
        ]);

        if (allRes.ok) {
          setAllTags(await allRes.json());
        }
        if (assignedRes.ok) {
          setAssignedTags(await assignedRes.json());
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTags();
  }, [orgSlug, domainId]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create tag');
      }

      const newTag = await res.json();
      setAllTags([...allTags, newTag].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTagName('');
      toast.success(`Tag "${newTag.name}" created`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tag');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleTag = async (tag: DomainTag) => {
    const isAssigned = assignedTags.some(t => t.id === tag.id);

    try {
      if (isAssigned) {
        // Remove tag
        const res = await fetch(`/api/orgs/${orgSlug}/domains/${domainId}/tags?tagId=${tag.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to remove tag');
        setAssignedTags(assignedTags.filter(t => t.id !== tag.id));
      } else {
        // Add tag
        const res = await fetch(`/api/orgs/${orgSlug}/domains/${domainId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagId: tag.id }),
        });
        if (!res.ok) throw new Error('Failed to add tag');
        setAssignedTags([...assignedTags, tag].sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update tags');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/domains/${domainId}/tags?tagId=${tagId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove tag');
      setAssignedTags(assignedTags.filter(t => t.id !== tagId));
    } catch (error) {
      toast.error('Failed to remove tag');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading tags...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Assigned Tags */}
      <div className="flex flex-wrap items-center gap-2">
        {assignedTags.length === 0 ? (
          <span className="text-sm text-muted-foreground">No tags assigned</span>
        ) : (
          assignedTags.map(tag => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="pl-2 pr-1 py-1 gap-1"
              style={{ backgroundColor: `${tag.color}20`, borderColor: tag.color, color: tag.color }}
            >
              <span>{tag.name}</span>
              {canManage && (
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-black/10 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))
        )}

        {/* Add Tag Button */}
        {canManage && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 gap-1">
                <Plus className="h-3 w-3" />
                <Tag className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-3">
                <p className="text-sm font-medium">Manage Tags</p>

                {/* Existing Tags */}
                {allTags.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {allTags.map(tag => {
                      const isAssigned = assignedTags.some(t => t.id === tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => handleToggleTag(tag)}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors',
                            isAssigned && 'bg-muted'
                          )}
                        >
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="flex-1 text-left truncate">{tag.name}</span>
                          {isAssigned && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Create New Tag */}
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs text-muted-foreground">Create new tag</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {TAG_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={cn(
                          'h-5 w-5 rounded-full transition-transform',
                          newTagColor === color && 'ring-2 ring-offset-2 ring-primary scale-110'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-8"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || isCreating}
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Create & Add'
                    )}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
