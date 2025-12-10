'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Organization {
  id: string;
  slug: string;
  primaryColor?: string | null;
  accentColor?: string | null;
  faviconUrl?: string | null;
}

interface OrgThemeProviderProps {
  organizations?: Organization[];
  primaryColor?: string | null;
  accentColor?: string | null;
  faviconUrl?: string | null;
  children: React.ReactNode;
}

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16) / 255,
    g: parseInt(hex.substring(2, 4), 16) / 255,
    b: parseInt(hex.substring(4, 6), 16) / 255,
  };
}

// Convert RGB to linear RGB
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// Convert linear RGB to OKLab
function linearRgbToOklab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

// Convert OKLab to OKLCH
function oklabToOklch(L: number, a: number, b: number): { L: number; C: number; H: number } {
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return { L, C, H };
}

// Convert hex to OKLCH string
function hexToOklch(hex: string): string {
  const rgb = hexToRgb(hex);
  const linearR = srgbToLinear(rgb.r);
  const linearG = srgbToLinear(rgb.g);
  const linearB = srgbToLinear(rgb.b);
  const oklab = linearRgbToOklab(linearR, linearG, linearB);
  const oklch = oklabToOklch(oklab.L, oklab.a, oklab.b);

  // Format: oklch(L C H) where L is 0-1, C is typically 0-0.4, H is 0-360
  return `oklch(${oklch.L.toFixed(3)} ${oklch.C.toFixed(3)} ${oklch.H.toFixed(1)})`;
}

// Calculate contrasting foreground color (light or dark)
function getContrastingForeground(hex: string): string {
  const rgb = hexToRgb(hex);
  // Use relative luminance formula
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  // Return light or dark foreground based on background luminance
  return luminance > 0.5 ? 'oklch(0.205 0 0)' : 'oklch(0.985 0 0)';
}

export function OrgThemeProvider({
  organizations = [],
  primaryColor: defaultPrimaryColor,
  accentColor: defaultAccentColor,
  faviconUrl: defaultFaviconUrl,
  children,
}: OrgThemeProviderProps) {
  const params = useParams();
  const slug = params?.slug as string | undefined;

  // Find the current organization based on URL slug
  const currentOrg = slug
    ? organizations.find(org => org.slug === slug)
    : null;

  // Use org-specific colors or fall back to defaults
  const primaryColor = currentOrg?.primaryColor ?? defaultPrimaryColor;
  const accentColor = currentOrg?.accentColor ?? defaultAccentColor;
  const faviconUrl = currentOrg?.faviconUrl ?? defaultFaviconUrl;

  // Apply colors
  useEffect(() => {
    const root = document.documentElement;

    if (primaryColor && /^#[0-9A-F]{6}$/i.test(primaryColor)) {
      const oklch = hexToOklch(primaryColor);
      const foreground = getContrastingForeground(primaryColor);
      root.style.setProperty('--primary', oklch);
      root.style.setProperty('--primary-foreground', foreground);
      // Also set ring for focus states to match primary
      root.style.setProperty('--ring', oklch);
      // Set sidebar-primary for sidebar active states
      root.style.setProperty('--sidebar-primary', oklch);
      root.style.setProperty('--sidebar-primary-foreground', foreground);
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-primary-foreground');
    }

    if (accentColor && /^#[0-9A-F]{6}$/i.test(accentColor)) {
      const oklch = hexToOklch(accentColor);
      const foreground = getContrastingForeground(accentColor);
      root.style.setProperty('--accent', oklch);
      root.style.setProperty('--accent-foreground', foreground);
      // Also set sidebar accent variables to ensure sidebar hover states work
      root.style.setProperty('--sidebar-accent', oklch);
      root.style.setProperty('--sidebar-accent-foreground', foreground);
    } else {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-foreground');
      root.style.removeProperty('--sidebar-accent');
      root.style.removeProperty('--sidebar-accent-foreground');
    }

    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-primary-foreground');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-foreground');
      root.style.removeProperty('--sidebar-accent');
      root.style.removeProperty('--sidebar-accent-foreground');
    };
  }, [primaryColor, accentColor]);

  // Apply favicon
  useEffect(() => {
    if (!faviconUrl) return;

    // Determine MIME type from data URL or default to x-icon
    const getMimeType = (url: string) => {
      if (url.startsWith('data:image/png')) return 'image/png';
      if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) return 'image/jpeg';
      if (url.startsWith('data:image/svg+xml')) return 'image/svg+xml';
      if (url.startsWith('data:image/x-icon') || url.startsWith('data:image/vnd.microsoft.icon')) return 'image/x-icon';
      if (url.startsWith('data:image/gif')) return 'image/gif';
      if (url.startsWith('data:image/webp')) return 'image/webp';
      return 'image/x-icon';
    };

    const mimeType = getMimeType(faviconUrl);

    // Remove all existing favicon links first
    const existingLinks = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']");
    const originalHrefs: string[] = [];
    existingLinks.forEach(link => {
      originalHrefs.push((link as HTMLLinkElement).href);
      link.remove();
    });

    // Create multiple favicon links for browser compatibility
    // Chrome prefers 'shortcut icon'
    const shortcutLink = document.createElement('link');
    shortcutLink.rel = 'shortcut icon';
    shortcutLink.type = mimeType;
    shortcutLink.href = faviconUrl;
    document.head.appendChild(shortcutLink);

    // Standard favicon link
    const iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    iconLink.type = mimeType;
    iconLink.href = faviconUrl;
    document.head.appendChild(iconLink);

    // Apple touch icon
    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = faviconUrl;
    document.head.appendChild(appleLink);

    return () => {
      shortcutLink.remove();
      iconLink.remove();
      appleLink.remove();
    };
  }, [faviconUrl]);

  return <>{children}</>;
}
