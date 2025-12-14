'use client';

import { useState, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Public TopoJSON world map
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Map ISO 3166-1 alpha-2 to ISO 3166-1 numeric for the map
const alpha2ToNumeric: Record<string, string> = {
  AF: '004', AL: '008', DZ: '012', AS: '016', AD: '020', AO: '024', AI: '660',
  AQ: '010', AG: '028', AR: '032', AM: '051', AW: '533', AU: '036', AT: '040',
  AZ: '031', BS: '044', BH: '048', BD: '050', BB: '052', BY: '112', BE: '056',
  BZ: '084', BJ: '204', BM: '060', BT: '064', BO: '068', BA: '070', BW: '072',
  BR: '076', BN: '096', BG: '100', BF: '854', BI: '108', KH: '116', CM: '120',
  CA: '124', CV: '132', KY: '136', CF: '140', TD: '148', CL: '152', CN: '156',
  CO: '170', KM: '174', CG: '178', CD: '180', CR: '188', CI: '384', HR: '191',
  CU: '192', CY: '196', CZ: '203', DK: '208', DJ: '262', DM: '212', DO: '214',
  EC: '218', EG: '818', SV: '222', GQ: '226', ER: '232', EE: '233', ET: '231',
  FJ: '242', FI: '246', FR: '250', GF: '254', PF: '258', GA: '266', GM: '270',
  GE: '268', DE: '276', GH: '288', GI: '292', GR: '300', GL: '304', GD: '308',
  GP: '312', GU: '316', GT: '320', GN: '324', GW: '624', GY: '328', HT: '332',
  HN: '340', HK: '344', HU: '348', IS: '352', IN: '356', ID: '360', IR: '364',
  IQ: '368', IE: '372', IL: '376', IT: '380', JM: '388', JP: '392', JO: '400',
  KZ: '398', KE: '404', KI: '296', KP: '408', KR: '410', KW: '414', KG: '417',
  LA: '418', LV: '428', LB: '422', LS: '426', LR: '430', LY: '434', LI: '438',
  LT: '440', LU: '442', MO: '446', MK: '807', MG: '450', MW: '454', MY: '458',
  MV: '462', ML: '466', MT: '470', MH: '584', MQ: '474', MR: '478', MU: '480',
  MX: '484', FM: '583', MD: '498', MC: '492', MN: '496', ME: '499', MS: '500',
  MA: '504', MZ: '508', MM: '104', NA: '516', NR: '520', NP: '524', NL: '528',
  NC: '540', NZ: '554', NI: '558', NE: '562', NG: '566', NO: '578', OM: '512',
  PK: '586', PW: '585', PA: '591', PG: '598', PY: '600', PE: '604', PH: '608',
  PL: '616', PT: '620', PR: '630', QA: '634', RE: '638', RO: '642', RU: '643',
  RW: '646', SH: '654', KN: '659', LC: '662', PM: '666', VC: '670', WS: '882',
  SM: '674', ST: '678', SA: '682', SN: '686', RS: '688', SC: '690', SL: '694',
  SG: '702', SK: '703', SI: '705', SB: '090', SO: '706', ZA: '710', ES: '724',
  LK: '144', SD: '729', SR: '740', SZ: '748', SE: '752', CH: '756', SY: '760',
  TW: '158', TJ: '762', TZ: '834', TH: '764', TL: '626', TG: '768', TO: '776',
  TT: '780', TN: '788', TR: '792', TM: '795', TC: '796', TV: '798', UG: '800',
  UA: '804', AE: '784', GB: '826', US: '840', UY: '858', UZ: '860', VU: '548',
  VE: '862', VN: '704', VG: '092', VI: '850', YE: '887', ZM: '894', ZW: '716',
  SS: '728', XK: '383', PS: '275',
};

// Country names for tooltips
const countryNames: Record<string, string> = {
  US: 'United States', CN: 'China', RU: 'Russia', IN: 'India', BR: 'Brazil',
  DE: 'Germany', FR: 'France', GB: 'United Kingdom', JP: 'Japan', KR: 'South Korea',
  AU: 'Australia', CA: 'Canada', NL: 'Netherlands', IT: 'Italy', ES: 'Spain',
  MX: 'Mexico', ID: 'Indonesia', VN: 'Vietnam', PL: 'Poland', UA: 'Ukraine',
  TR: 'Turkey', TW: 'Taiwan', SG: 'Singapore', HK: 'Hong Kong', PH: 'Philippines',
  TH: 'Thailand', MY: 'Malaysia', AR: 'Argentina', CL: 'Chile', CO: 'Colombia',
  ZA: 'South Africa', NG: 'Nigeria', EG: 'Egypt', SA: 'Saudi Arabia',
  AE: 'United Arab Emirates', PK: 'Pakistan', BD: 'Bangladesh', IR: 'Iran',
  KZ: 'Kazakhstan', RO: 'Romania', CZ: 'Czech Republic', SE: 'Sweden',
  NO: 'Norway', FI: 'Finland', DK: 'Denmark', AT: 'Austria', CH: 'Switzerland',
  BE: 'Belgium', PT: 'Portugal', GR: 'Greece', HU: 'Hungary', IE: 'Ireland',
  NZ: 'New Zealand', IL: 'Israel',
};

interface CountryData {
  country: string;
  totalMessages: number;
  passedMessages: number;
  failedMessages: number;
  sourceCount: number;
}

interface WorldMapProps {
  data: CountryData[];
  className?: string;
  height?: number;
  showLegend?: boolean;
}

export function WorldMap({ data, className, height = 400, showLegend = true }: WorldMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<CountryData | null>(null);
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });

  // Create a map of country code to data for quick lookup
  const dataByCountry = useMemo(() => {
    const map = new Map<string, CountryData>();
    for (const item of data) {
      map.set(item.country.toUpperCase(), item);
    }
    return map;
  }, [data]);

  // Calculate max for color scaling
  const maxMessages = useMemo(() => {
    return Math.max(...data.map((d) => d.totalMessages), 1);
  }, [data]);

  // Get color based on message count
  const getCountryColor = (countryCode: string | undefined): string => {
    if (!countryCode) return '#e5e7eb'; // gray-200

    // Convert numeric ID to alpha-2
    const alpha2 = Object.entries(alpha2ToNumeric).find(([, num]) => num === countryCode)?.[0];
    if (!alpha2) return '#e5e7eb';

    const countryData = dataByCountry.get(alpha2);
    if (!countryData) return '#e5e7eb';

    // Calculate intensity (0-1) based on log scale for better distribution
    const intensity = Math.log10(countryData.totalMessages + 1) / Math.log10(maxMessages + 1);

    // Calculate pass rate for color hue
    const passRate = countryData.totalMessages > 0
      ? countryData.passedMessages / countryData.totalMessages
      : 1;

    // Blend between red (failed) and green (passed) based on pass rate
    // Low pass rate = more red, high pass rate = more green
    if (passRate >= 0.9) {
      // Green tones
      const green = Math.round(150 + intensity * 80);
      const other = Math.round(230 - intensity * 100);
      return `rgb(${other}, ${green}, ${other})`;
    } else if (passRate >= 0.7) {
      // Yellow tones
      const base = Math.round(200 + intensity * 55);
      const green = Math.round(150 + intensity * 80);
      return `rgb(${base}, ${green}, ${Math.round(100 - intensity * 50)})`;
    } else {
      // Red/orange tones
      const red = Math.round(200 + intensity * 55);
      const other = Math.round(150 - intensity * 80);
      return `rgb(${red}, ${other}, ${other})`;
    }
  };

  const getCountryData = (geoId: string): CountryData | null => {
    const alpha2 = Object.entries(alpha2ToNumeric).find(([, num]) => num === geoId)?.[0];
    if (!alpha2) return null;
    return dataByCountry.get(alpha2) || null;
  };

  const getCountryName = (code: string): string => {
    return countryNames[code?.toUpperCase()] || code || 'Unknown';
  };

  return (
    <TooltipProvider>
      <div className={cn('relative', className)}>
        <ComposableMap
          projectionConfig={{
            rotate: [-10, 0, 0],
            scale: 147,
          }}
          style={{ width: '100%', height }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={(p) => setPosition(p)}
            minZoom={1}
            maxZoom={8}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const countryData = getCountryData(geo.id);

                  return (
                    <Tooltip key={geo.rsmKey}>
                      <TooltipTrigger asChild>
                        <Geography
                          geography={geo}
                          fill={getCountryColor(geo.id)}
                          stroke="#d1d5db"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: 'none' },
                            hover: {
                              fill: countryData ? '#3b82f6' : '#d1d5db',
                              outline: 'none',
                              cursor: countryData ? 'pointer' : 'default',
                            },
                            pressed: { outline: 'none' },
                          }}
                          onMouseEnter={() => {
                            if (countryData) {
                              setHoveredCountry(countryData);
                            }
                          }}
                          onMouseLeave={() => setHoveredCountry(null)}
                        />
                      </TooltipTrigger>
                      {countryData && (
                        <TooltipContent side="top" className="z-50">
                          <div className="space-y-1">
                            <p className="font-medium">{getCountryName(countryData.country)}</p>
                            <div className="text-xs space-y-0.5">
                              <p>
                                <span className="text-muted-foreground">Sources:</span>{' '}
                                {countryData.sourceCount.toLocaleString()}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Messages:</span>{' '}
                                {countryData.totalMessages.toLocaleString()}
                              </p>
                              <p>
                                <span className="text-success">Passed:</span>{' '}
                                {countryData.passedMessages.toLocaleString()} (
                                {countryData.totalMessages > 0
                                  ? Math.round((countryData.passedMessages / countryData.totalMessages) * 100)
                                  : 0}
                                %)
                              </p>
                              <p>
                                <span className="text-destructive">Failed:</span>{' '}
                                {countryData.failedMessages.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Legend */}
        {showLegend && (
          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-md p-2 text-xs border">
            <p className="font-medium mb-1">Pass Rate</p>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgb(230, 200, 200)' }} />
              <span>&lt;70%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgb(230, 200, 100)' }} />
              <span>70-90%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgb(200, 230, 200)' }} />
              <span>&gt;90%</span>
            </div>
            <div className="flex items-center gap-1 mt-1 pt-1 border-t">
              <div className="w-3 h-3 rounded-sm bg-gray-200" />
              <span>No data</span>
            </div>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <button
            onClick={() => setPosition((p) => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }))}
            className="w-7 h-7 bg-background/90 backdrop-blur-sm rounded border flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => setPosition((p) => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }))}
            className="w-7 h-7 bg-background/90 backdrop-blur-sm rounded border flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            onClick={() => setPosition({ coordinates: [0, 20], zoom: 1 })}
            className="w-7 h-7 bg-background/90 backdrop-blur-sm rounded border flex items-center justify-center hover:bg-muted transition-colors text-xs"
            aria-label="Reset view"
          >
            ↺
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
}
