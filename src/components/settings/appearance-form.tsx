'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const appearanceFormSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
});

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

interface AppearanceFormProps {
  preferences: {
    theme: string;
  };
}

export function AppearanceForm({ preferences }: AppearanceFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { theme: currentTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: (preferences.theme as 'light' | 'dark' | 'system') || 'system',
    },
  });

  async function onSubmit(data: AppearanceFormValues) {
    setIsLoading(true);

    try {
      // Update theme immediately for better UX
      setTheme(data.theme);

      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme: data.theme }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preferences');
      }

      toast.success('Appearance preferences updated');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  }

  if (!mounted) {
    return null;
  }

  const themeOptions = [
    {
      value: 'light',
      label: 'Light',
      description: 'Light mode theme',
      icon: Sun,
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Dark mode theme',
      icon: Moon,
    },
    {
      value: 'system',
      label: 'System',
      description: 'Use system theme',
      icon: Monitor,
    },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>
              Select the theme for the application interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid gap-4 pt-2"
                    >
                      {themeOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = field.value === option.value;

                        return (
                          <FormItem key={option.value}>
                            <FormLabel className="cursor-pointer">
                              <FormControl>
                                <RadioGroupItem value={option.value} className="sr-only" />
                              </FormControl>
                              <div
                                className={cn(
                                  'flex items-center gap-4 rounded-lg border-2 p-4 transition-colors',
                                  isSelected
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                )}
                              >
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {option.description}
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                                    <Check className="h-4 w-4 text-primary-foreground" />
                                  </div>
                                )}
                              </div>
                            </FormLabel>
                          </FormItem>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Theme Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              See how the theme looks with different UI elements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">Sample Card</h4>
              <p className="text-sm text-muted-foreground mb-4">
                This is how a card looks with the current theme. The colors will adjust based on
                your selection.
              </p>
              <div className="flex gap-2">
                <Button size="sm">Primary Button</Button>
                <Button size="sm" variant="secondary">
                  Secondary
                </Button>
                <Button size="sm" variant="outline">
                  Outline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </div>
      </form>
    </Form>
  );
}
