'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, AlertCircle } from 'lucide-react';
import { WorldMap } from './world-map';

interface CountryData {
  country: string;
  totalMessages: number;
  passedMessages: number;
  failedMessages: number;
  sourceCount: number;
}

interface CountryStats {
  countries: CountryData[];
  totals: {
    sourceCount: number;
    totalMessages: number;
    passedMessages: number;
    failedMessages: number;
  };
  unknownStats: {
    sourceCount: number;
    totalMessages: number;
    passedMessages: number;
    failedMessages: number;
  } | null;
  period: string;
}

interface SourcesWorldMapProps {
  orgSlug: string;
  domainId: string;
}

export function SourcesWorldMap({ orgSlug, domainId }: SourcesWorldMapProps) {
  const [data, setData] = useState<CountryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState('30');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/orgs/${orgSlug}/domains/${domainId}/sources/countries?days=${days}`
        );

        if (!res.ok) {
          throw new Error('Failed to fetch country data');
        }

        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgSlug, domainId, days]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Sources by Country</CardTitle>
              <CardDescription>
                Geographic distribution of email sources
              </CardDescription>
            </div>
          </div>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : data && data.countries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <Globe className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="font-medium">No geographic data</p>
            <p className="text-sm text-muted-foreground mt-1">
              No sources have country information yet.
              <br />
              Run IP enrichment to populate location data.
            </p>
          </div>
        ) : data ? (
          <div className="space-y-4">
            <WorldMap data={data.countries} height={400} />

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Countries</p>
                <p className="text-2xl font-bold">{data.countries.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sources</p>
                <p className="text-2xl font-bold">
                  {data.totals.sourceCount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">
                  {data.totals.totalMessages.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-2xl font-bold">
                  {data.totals.totalMessages > 0
                    ? Math.round(
                        (data.totals.passedMessages / data.totals.totalMessages) * 100
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>

            {/* Unknown locations notice */}
            {data.unknownStats && data.unknownStats.sourceCount > 0 && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                <strong>{data.unknownStats.sourceCount}</strong> sources (
                {data.unknownStats.totalMessages.toLocaleString()} messages) have no
                location data. Run IP enrichment to improve coverage.
              </div>
            )}

            {/* Top countries list */}
            {data.countries.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Top Countries</p>
                <div className="space-y-2">
                  {data.countries.slice(0, 5).map((country, i) => {
                    const passRate =
                      country.totalMessages > 0
                        ? Math.round((country.passedMessages / country.totalMessages) * 100)
                        : 0;

                    return (
                      <div
                        key={country.country}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-4">{i + 1}.</span>
                          <span className="font-medium">{country.country}</span>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <span className="text-muted-foreground">
                            {country.sourceCount} sources
                          </span>
                          <span>{country.totalMessages.toLocaleString()} msgs</span>
                          <span
                            className={
                              passRate >= 90
                                ? 'text-success'
                                : passRate >= 70
                                ? 'text-warning'
                                : 'text-destructive'
                            }
                          >
                            {passRate}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
