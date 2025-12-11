'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThreatCountry {
  country: string;
  messages: number;
}

interface ThreatsByCountryProps {
  orgSlug: string;
}

// Map of country codes to full names
const countryNames: Record<string, string> = {
  US: 'United States',
  CN: 'China',
  RU: 'Russia',
  IN: 'India',
  BR: 'Brazil',
  DE: 'Germany',
  FR: 'France',
  GB: 'United Kingdom',
  JP: 'Japan',
  KR: 'South Korea',
  AU: 'Australia',
  CA: 'Canada',
  NL: 'Netherlands',
  IT: 'Italy',
  ES: 'Spain',
  MX: 'Mexico',
  ID: 'Indonesia',
  VN: 'Vietnam',
  PL: 'Poland',
  UA: 'Ukraine',
  TR: 'Turkey',
  TW: 'Taiwan',
  SG: 'Singapore',
  HK: 'Hong Kong',
  PH: 'Philippines',
  TH: 'Thailand',
  MY: 'Malaysia',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  ZA: 'South Africa',
  NG: 'Nigeria',
  EG: 'Egypt',
  SA: 'Saudi Arabia',
  AE: 'United Arab Emirates',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  IR: 'Iran',
  KZ: 'Kazakhstan',
  RO: 'Romania',
  CZ: 'Czech Republic',
  SE: 'Sweden',
  NO: 'Norway',
  FI: 'Finland',
  DK: 'Denmark',
  AT: 'Austria',
  CH: 'Switzerland',
  BE: 'Belgium',
  PT: 'Portugal',
  GR: 'Greece',
  HU: 'Hungary',
  IE: 'Ireland',
  NZ: 'New Zealand',
  IL: 'Israel',
};

function getCountryName(code: string): string {
  return countryNames[code?.toUpperCase()] || code || 'Unknown';
}

function ThreatBar({
  percent,
  className
}: {
  percent: number;
  className?: string;
}) {
  return (
    <div className={cn('h-2 rounded-full bg-muted overflow-hidden', className)}>
      <div
        className="h-full bg-destructive/80 transition-all duration-300"
        style={{ width: `${Math.max(percent, 2)}%` }}
      />
    </div>
  );
}

export function ThreatsByCountry({ orgSlug }: ThreatsByCountryProps) {
  const [threats, setThreats] = useState<ThreatCountry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/domains/stats`);
        if (res.ok) {
          const json = await res.json();
          setThreats(json.threatsByCountry || []);
        }
      } catch (error) {
        console.error('Failed to fetch threats by country:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgSlug]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Threats by Country</CardTitle>
          <CardDescription>Suspicious/unknown sources by location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (threats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Threats by Country</CardTitle>
          <CardDescription>Suspicious/unknown sources by location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="p-3 rounded-full bg-success/10 mb-3">
              <AlertTriangle className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-medium text-success">No Threats Detected</p>
            <p className="text-xs text-muted-foreground mt-1">
              No suspicious or unknown sources found in the last 7 days
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxMessages = Math.max(...threats.map((t) => t.messages), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Threats by Country
        </CardTitle>
        <CardDescription>Suspicious/unknown sources by location (7 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {threats.map((threat, index) => {
            const percent = (threat.messages / maxMessages) * 100;

            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[150px]" title={getCountryName(threat.country)}>
                      {getCountryName(threat.country)}
                    </span>
                  </div>
                  <span className="font-medium tabular-nums text-destructive">
                    {threat.messages.toLocaleString()}
                  </span>
                </div>
                <ThreatBar percent={percent} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
