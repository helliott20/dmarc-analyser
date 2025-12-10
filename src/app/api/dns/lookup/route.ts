import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dns from 'dns/promises';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const type = searchParams.get('type'); // dmarc, spf, dkim
    const selector = searchParams.get('selector'); // for DKIM

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    let lookupDomain = domain;
    let recordType: 'TXT' | 'A' | 'MX' = 'TXT';

    switch (type) {
      case 'dmarc':
        lookupDomain = `_dmarc.${domain}`;
        break;
      case 'spf':
        // SPF is in the root domain TXT record
        lookupDomain = domain;
        break;
      case 'dkim':
        if (!selector) {
          return NextResponse.json(
            { error: 'Selector is required for DKIM lookups' },
            { status: 400 }
          );
        }
        lookupDomain = `${selector}._domainkey.${domain}`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid type. Must be dmarc, spf, or dkim' },
          { status: 400 }
        );
    }

    try {
      const records = await dns.resolveTxt(lookupDomain);
      const flatRecords = records.flat();

      let targetRecord: string | null = null;
      let allRecords = flatRecords;

      // Filter for the specific record type
      switch (type) {
        case 'dmarc':
          targetRecord = flatRecords.find((r) => r.startsWith('v=DMARC1')) || null;
          break;
        case 'spf':
          targetRecord = flatRecords.find((r) => r.startsWith('v=spf1')) || null;
          break;
        case 'dkim':
          targetRecord = flatRecords.find((r) => r.startsWith('v=DKIM1') || r.includes('k=rsa') || r.includes('p=')) || null;
          break;
      }

      return NextResponse.json({
        domain: lookupDomain,
        record: targetRecord,
        allRecords: allRecords,
        found: !!targetRecord,
      });
    } catch (dnsError) {
      const error = dnsError as NodeJS.ErrnoException;
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        return NextResponse.json({
          domain: lookupDomain,
          record: null,
          allRecords: [],
          found: false,
          error: `No ${type.toUpperCase()} record found for ${lookupDomain}`,
        });
      }
      throw dnsError;
    }
  } catch (error) {
    console.error('DNS lookup failed:', error);
    return NextResponse.json(
      { error: 'DNS lookup failed. Please try again.' },
      { status: 500 }
    );
  }
}
