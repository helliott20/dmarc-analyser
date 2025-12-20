'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Shield, Mail, BarChart3, Bell, AlertTriangle, ArrowRight } from 'lucide-react';
import { Suspense } from 'react';
import Link from 'next/link';

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

  const features = [
    {
      icon: Mail,
      title: 'DMARC Reports',
      description: 'Aggregate and forensic reports parsed automatically',
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Monitor authentication rates and sender sources',
    },
    {
      icon: Bell,
      title: 'Smart Alerts',
      description: 'Get notified when authentication issues arise',
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Gradient orbs for depth */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div>
            <Link href="https://dmarcanalyser.io" className="flex items-center gap-3 group">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-colors">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <span className="text-xl font-semibold text-white tracking-tight">DMARC Analyser</span>
            </Link>
          </div>

          {/* Main content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
                Monitor your email
                <br />
                authentication
              </h1>
              <p className="text-lg text-blue-100/80 max-w-md leading-relaxed">
                Get real-time visibility into who&apos;s sending email on behalf of your domains.
              </p>
            </div>

            {/* Feature cards */}
            <div className="space-y-3 pt-4">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="p-2 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                    <feature.icon className="h-5 w-5 text-blue-200" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{feature.title}</h3>
                    <p className="text-sm text-blue-200/70">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-6 text-sm text-blue-200/60">
            <Link href="https://dmarcanalyser.io" className="hover:text-white transition-colors">
              Website
            </Link>
            <Link href="https://dmarcanalyser.io/pricing.html" className="hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="https://github.com/helliott20/dmarc-analyser" className="hover:text-white transition-colors">
              GitHub
            </Link>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col min-h-screen bg-white dark:bg-slate-950">
        {/* Mobile header */}
        <div className="lg:hidden p-6 border-b border-gray-100 dark:border-slate-800">
          <Link href="https://dmarcanalyser.io" className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">DMARC Analyser</span>
          </Link>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-sm space-y-8">
            {/* Header */}
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Welcome back
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Sign in to access your dashboard
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-3 p-4 text-sm bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/50 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-300">Sign in failed</p>
                  <p className="text-red-600 dark:text-red-400 mt-0.5">{errorMessages[error] || errorMessages.default}</p>
                </div>
              </div>
            )}

            {/* Sign in button */}
            <div className="space-y-4">
              <Button
                className="w-full h-12 text-base font-medium bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all duration-200 group"
                onClick={() => signIn('google', { callbackUrl })}
              >
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
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
                <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-950 px-3 text-gray-400 dark:text-gray-500">
                    Secure authentication
                  </span>
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 mb-2">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">OAuth 2.0</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 mb-2">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Encrypted</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 mb-2">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">GDPR Ready</p>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 pt-4">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline underline-offset-2">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline underline-offset-2">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>

        {/* Mobile footer with features */}
        <div className="lg:hidden border-t border-gray-100 dark:border-slate-800 p-6 bg-gray-50 dark:bg-slate-900">
          <div className="flex justify-around text-center">
            {features.map((feature) => (
              <div key={feature.title} className="space-y-1">
                <feature.icon className="h-5 w-5 mx-auto text-blue-600 dark:text-blue-400" />
                <p className="text-xs text-gray-500 dark:text-gray-400">{feature.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl animate-pulse">
            <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
