import { redirect } from 'next/navigation';
import Link from 'next/link';
import { showLandingPage, PRODUCT } from '@/lib/config';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Shield, Menu } from 'lucide-react';

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Debug logging - remove after fixing
  const landingPageEnabled = showLandingPage();
  console.log('[MARKETING LAYOUT]', {
    showLandingPage: landingPageEnabled,
    ENABLE_LANDING_PAGE: process.env.ENABLE_LANDING_PAGE,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? '[SET]' : '[UNSET]'
  });

  // Redirect to dashboard if landing page is disabled (self-hosted mode)
  if (!landingPageEnabled) {
    console.log('[MARKETING LAYOUT] Redirecting to /orgs - landing page disabled');
    redirect('/orgs');
  }

  // If user is already logged in, redirect to dashboard
  const session = await auth();
  console.log('[MARKETING LAYOUT] Session check:', { hasUser: !!session?.user });
  if (session?.user) {
    console.log('[MARKETING LAYOUT] Redirecting to /orgs - user logged in');
    redirect('/orgs');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">{PRODUCT.name}</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="https://github.com/helliott20/dmarc-analyser"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/login">Start Free Trial</Link>
            </Button>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <nav className="flex flex-col space-y-4 mt-8">
                  <Link
                    href="/#features"
                    className="text-lg font-medium hover:text-primary transition-colors"
                  >
                    Features
                  </Link>
                  <Link
                    href="/pricing"
                    className="text-lg font-medium hover:text-primary transition-colors"
                  >
                    Pricing
                  </Link>
                  <a
                    href="https://github.com/helliott20/dmarc-analyser"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-medium hover:text-primary transition-colors"
                  >
                    GitHub
                  </a>
                  <div className="pt-4 border-t space-y-2">
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/login">Sign In</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href="/login">Start Free Trial</Link>
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <Link href="/" className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-bold">{PRODUCT.name}</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                {PRODUCT.description}
              </p>
              <p className="text-xs text-muted-foreground">
                A{' '}
                <a
                  href={PRODUCT.companyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {PRODUCT.company}
                </a>{' '}
                Product
              </p>
            </div>

            {/* Product */}
            <div className="space-y-4">
              <h3 className="font-semibold">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/#features" className="hover:text-foreground transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-foreground transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/helliott20/dmarc-analyser"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    Self-Host
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div className="space-y-4">
              <h3 className="font-semibold">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="https://github.com/helliott20/dmarc-analyser"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/helliott20/dmarc-analyser"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h3 className="font-semibold">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>
              © {new Date().getFullYear()} {PRODUCT.company}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
