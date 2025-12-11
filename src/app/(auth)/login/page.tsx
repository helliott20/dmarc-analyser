'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Suspense } from 'react';

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/orgs';

  const errorMessages: Record<string, string> = {
    OAuthAccountNotLinked: 'This email is already associated with another account.',
    OAuthCallback: 'There was a problem with the authentication provider.',
    OAuthCreateAccount: 'Could not create your account. Please try again.',
    EmailCreateAccount: 'Could not create your account. Please try again.',
    Callback: 'There was a problem signing you in.',
    OAuthSignin: 'Error occurred during sign in. Please try again.',
    default: 'An error occurred. Please try again.',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and branding */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Shield className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">DMARC Analyser</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and analyse your email authentication
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-lg">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessages[error] || errorMessages.default}</span>
          </div>
        )}

        {/* Sign in card */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-4 text-center">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>
              Use your Google account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full h-11 font-medium"
              variant="outline"
              onClick={() => signIn('google', { callbackUrl })}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm text-muted-foreground">
          <div className="space-y-1">
            <Mail className="h-5 w-5 mx-auto opacity-70" />
            <p>DMARC Reports</p>
          </div>
          <div className="space-y-1">
            <Shield className="h-5 w-5 mx-auto opacity-70" />
            <p>SPF & DKIM</p>
          </div>
          <div className="space-y-1">
            <CheckCircle2 className="h-5 w-5 mx-auto opacity-70" />
            <p>Compliance</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
