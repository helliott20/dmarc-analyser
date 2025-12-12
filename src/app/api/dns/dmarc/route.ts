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

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Validate domain format - supports multi-level TLDs like .co.uk, .sch.uk
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    try {
      const records = await dns.resolveTxt(`_dmarc.${domain}`);
      const dmarcRecord = records.flat().find((r) => r.startsWith('v=DMARC1'));

      if (!dmarcRecord) {
        return NextResponse.json({ record: null });
      }

      return NextResponse.json({ record: dmarcRecord });
    } catch (dnsError) {
      if ((dnsError as NodeJS.ErrnoException).code === 'ENOTFOUND' ||
          (dnsError as NodeJS.ErrnoException).code === 'ENODATA') {
        return NextResponse.json({ record: null });
      }
      throw dnsError;
    }
  } catch (error) {
    console.error('DNS lookup failed:', error);
    return NextResponse.json(
      { error: 'DNS lookup failed' },
      { status: 500 }
    );
  }
}
