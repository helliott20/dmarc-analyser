import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);

interface SpfResult {
  ipRanges: string[];
  includes: string[];
  errors: string[];
}

const MAX_DNS_LOOKUPS = 10; // SPF spec allows max 10 DNS lookups
const MAX_RECURSION_DEPTH = 5;

/**
 * Parse an SPF record and extract IP ranges and includes
 */
function parseSpfRecord(txt: string): { ip4: string[]; ip6: string[]; includes: string[] } {
  const ip4: string[] = [];
  const ip6: string[] = [];
  const includes: string[] = [];

  // Check if this is an SPF record
  if (!txt.toLowerCase().startsWith('v=spf1')) {
    return { ip4, ip6, includes };
  }

  // Parse mechanisms
  const mechanisms = txt.split(/\s+/);

  for (const mechanism of mechanisms) {
    // Skip qualifiers (+, -, ~, ?)
    const cleanMechanism = mechanism.replace(/^[+\-~?]/, '');

    if (cleanMechanism.startsWith('ip4:')) {
      const ip = cleanMechanism.substring(4);
      // Add /32 if no CIDR notation
      ip4.push(ip.includes('/') ? ip : `${ip}/32`);
    } else if (cleanMechanism.startsWith('ip6:')) {
      const ip = cleanMechanism.substring(4);
      // Add /128 if no CIDR notation
      ip6.push(ip.includes('/') ? ip : `${ip}/128`);
    } else if (cleanMechanism.startsWith('include:')) {
      includes.push(cleanMechanism.substring(8));
    }
  }

  return { ip4, ip6, includes };
}

/**
 * Resolve an SPF include domain and return all IP ranges
 */
async function resolveSpfDomain(
  domain: string,
  depth: number = 0,
  lookupCount: { count: number } = { count: 0 },
  visited: Set<string> = new Set()
): Promise<SpfResult> {
  const result: SpfResult = {
    ipRanges: [],
    includes: [],
    errors: [],
  };

  // Prevent infinite loops
  if (visited.has(domain.toLowerCase())) {
    return result;
  }
  visited.add(domain.toLowerCase());

  // Check recursion depth
  if (depth > MAX_RECURSION_DEPTH) {
    result.errors.push(`Max recursion depth reached at ${domain}`);
    return result;
  }

  // Check lookup count
  if (lookupCount.count >= MAX_DNS_LOOKUPS) {
    result.errors.push(`Max DNS lookups (${MAX_DNS_LOOKUPS}) exceeded`);
    return result;
  }

  try {
    lookupCount.count++;
    const txtRecords = await resolveTxt(domain);

    // Find SPF record (join TXT record chunks)
    const spfRecord = txtRecords
      .map(chunks => chunks.join(''))
      .find(txt => txt.toLowerCase().startsWith('v=spf1'));

    if (!spfRecord) {
      result.errors.push(`No SPF record found for ${domain}`);
      return result;
    }

    const parsed = parseSpfRecord(spfRecord);

    // Add direct IP ranges
    result.ipRanges.push(...parsed.ip4);
    result.ipRanges.push(...parsed.ip6);
    result.includes = [...parsed.includes];

    // Recursively resolve includes
    for (const include of parsed.includes) {
      const includeResult = await resolveSpfDomain(include, depth + 1, lookupCount, visited);
      result.ipRanges.push(...includeResult.ipRanges);
      result.errors.push(...includeResult.errors);
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Failed to resolve ${domain}: ${errorMsg}`);
  }

  return result;
}

/**
 * Resolve an SPF include and return all IP ranges
 *
 * @param spfInclude - The SPF include domain (e.g., "_spf.google.com" or "include:_spf.google.com")
 * @returns Object with ipRanges array and any errors
 */
export async function resolveSpfInclude(spfInclude: string): Promise<SpfResult> {
  // Clean up input - remove "include:" prefix if present
  let domain = spfInclude.trim();
  if (domain.toLowerCase().startsWith('include:')) {
    domain = domain.substring(8);
  }

  if (!domain) {
    return {
      ipRanges: [],
      includes: [],
      errors: ['No domain provided'],
    };
  }

  const result = await resolveSpfDomain(domain);

  // Remove duplicates
  result.ipRanges = [...new Set(result.ipRanges)];

  return result;
}

/**
 * Validate an SPF include domain by attempting to resolve it
 */
export async function validateSpfInclude(spfInclude: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const result = await resolveSpfInclude(spfInclude);

    if (result.errors.length > 0 && result.ipRanges.length === 0) {
      return { valid: false, error: result.errors[0] };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate SPF include'
    };
  }
}
