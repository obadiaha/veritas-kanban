import { useState, useRef, useEffect } from 'react';
import { useTags, useTagsManager, getTagColor } from '@/hooks/useTags';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, X, Check, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagPickerProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

const TAG_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-green-500/20 text-green-400',
  'bg-purple-500/20 text-purple-400',
  'bg-amber-500/20 text-amber-400',
  'bg-red-500/20 text-red-400',
  'bg-cyan-500/20 text-cyan-400',
  'bg-pink-500/20 text-pink-400',
  'bg-orange-500/20 text-orange-400',
  'bg-indigo-500/20 text-indigo-400',
  'bg-emerald-500/20 text-emerald-400',
];

export function TagPicker({ selectedTags, onChange, placeholder = 'Add tags...' }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { items: tags, isLoading } = useTags();
  const tagsManager = useTagsManager();

  const toggleTag = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    onChange(newTags);
  };

  const removeTag = (tagId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(selectedTags.filter(id => id !== tagId));
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || isCreating) return;

    // Check if tag already exists
    const existingTag = tags.find(t => 
      t.label.toLowerCase() === newTagName.trim().toLowerCase()
    );
    
    if (existingTag) {
      // Just select it
      if (!selectedTags.includes(existingTag.id)) {
        onChange([...selectedTags, existingTag.id]);
      }
      setNewTagName('');
      return;
    }

    try {
      setIsCreating(true);
      // Assign color from rotating palette
      const colorIndex = tags.length % TAG_COLORS.length;
      const color = TAG_COLORS[colorIndex];
      
      const newTag = await tagsManager.create({
        label: newTagName.trim(),
        color,
      });
      
      // Auto-select the newly created tag
      onChange([...selectedTags, newTag.id]);
      setNewTagName('');
      
      // Focus back on input
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (error) {
      console.error('Failed to create tag:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTag(e as any);
    }
  };

  // Get selected tag objects
  const selectedTagObjects = selectedTags
    .map(id => tags.find(t => t.id === id))
    .filter(Boolean) as typeof tags;

  return (
    <div className="space-y-2">
      {/* Selected Tags Display */}
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTagObjects.map(tag => (
            <Badge
              key={tag.id}
              variant="secondary"
              className={cn(
                'text-xs px-2 py-0.5 flex items-center gap-1',
                tag.color
              )}
            >
              {tag.label}
              <button
                type="button"
                onClick={(e) => removeTag(tag.id, e)}
                className="ml-0.5 hover:bg-background/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Tag Picker Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-muted-foreground font-normal"
          >
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {placeholder}
            </div>
            <Plus className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="max-h-64 overflow-y-auto">
            {/* Available tags list */}
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Loading tags...
              </div>
            ) : tags.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No tags yet. Create one below!
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {tags.map(tag => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors"
                    >
                      <div
                        className={cn(
                          'h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/50'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn('text-xs px-2 py-0.5', tag.color)}
                      >
                        {tag.label}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick-add form */}
          <form onSubmit={handleCreateTag} className="border-t p-2">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Create new tag..."
                className="h-8 text-sm flex-1"
                disabled={isCreating}
              />
              <Button
                type="submit"
                size="sm"
                className="h-8 px-3"
                disabled={!newTagName.trim() || isCreating}
              >
                {isCreating ? (
                  'Creating...'
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
