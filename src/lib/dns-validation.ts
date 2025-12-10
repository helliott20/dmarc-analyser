export interface DMARCRecord {
  version: string;
  policy: 'none' | 'quarantine' | 'reject';
  subdomainPolicy?: 'none' | 'quarantine' | 'reject';
  percentage?: number;
  ruaEmails?: string[];
  rufEmails?: string[];
  dkimAlignment?: 'r' | 's';
  spfAlignment?: 'r' | 's';
  reportFormat?: string;
  reportInterval?: number;
  rawRecord: string;
}

export interface SPFRecord {
  version: string;
  mechanisms: string[];
  qualifier: string;
  hasAll: boolean;
  includes: string[];
  ipv4: string[];
  ipv6: string[];
  rawRecord: string;
}

export interface DKIMRecord {
  version?: string;
  keyType?: string;
  publicKey?: string;
  hashAlgorithms?: string[];
  serviceTypes?: string[];
  flags?: string;
  notes?: string;
  rawRecord: string;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export function parseDMARCRecord(record: string): DMARCRecord | null {
  if (!record || !record.startsWith('v=DMARC1')) {
    return null;
  }

  const parts = record.split(';').map((p) => p.trim()).filter(Boolean);
  const parsed: Partial<DMARCRecord> = {
    rawRecord: record,
  };

  for (const part of parts) {
    const [key, value] = part.split('=').map((s) => s.trim());

    switch (key) {
      case 'v':
        parsed.version = value;
        break;
      case 'p':
        parsed.policy = value as 'none' | 'quarantine' | 'reject';
        break;
      case 'sp':
        parsed.subdomainPolicy = value as 'none' | 'quarantine' | 'reject';
        break;
      case 'pct':
        parsed.percentage = parseInt(value, 10);
        break;
      case 'rua':
        parsed.ruaEmails = value.split(',').map((e) => e.replace('mailto:', '').trim());
        break;
      case 'ruf':
        parsed.rufEmails = value.split(',').map((e) => e.replace('mailto:', '').trim());
        break;
      case 'adkim':
        parsed.dkimAlignment = value as 'r' | 's';
        break;
      case 'aspf':
        parsed.spfAlignment = value as 'r' | 's';
        break;
      case 'fo':
        parsed.reportFormat = value;
        break;
      case 'ri':
        parsed.reportInterval = parseInt(value, 10);
        break;
    }
  }

  return parsed as DMARCRecord;
}

export function validateDMARCRecord(record: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = parseDMARCRecord(record);

  if (!parsed) {
    issues.push({
      severity: 'error',
      message: 'Invalid DMARC record. Must start with v=DMARC1',
    });
    return issues;
  }

  // Check policy
  if (!parsed.policy) {
    issues.push({
      severity: 'error',
      message: 'Missing required policy (p=) tag',
      field: 'p',
    });
  } else if (parsed.policy === 'none') {
    issues.push({
      severity: 'warning',
      message: 'Policy is set to "none" - emails are not being quarantined or rejected',
      field: 'p',
    });
  }

  // Check for reporting addresses
  if (!parsed.ruaEmails || parsed.ruaEmails.length === 0) {
    issues.push({
      severity: 'warning',
      message: 'No aggregate report email (rua) specified - you will not receive DMARC reports',
      field: 'rua',
    });
  }

  // Check percentage
  if (parsed.percentage && parsed.percentage < 100) {
    issues.push({
      severity: 'info',
      message: `Policy applies to only ${parsed.percentage}% of emails. Consider 100% for full protection.`,
      field: 'pct',
    });
  }

  // Check alignment modes
  if (parsed.dkimAlignment === 's') {
    issues.push({
      severity: 'info',
      message: 'DKIM alignment is set to strict mode',
      field: 'adkim',
    });
  }

  if (parsed.spfAlignment === 's') {
    issues.push({
      severity: 'info',
      message: 'SPF alignment is set to strict mode',
      field: 'aspf',
    });
  }

  return issues;
}

export function parseSPFRecord(record: string): SPFRecord | null {
  if (!record || !record.startsWith('v=spf1')) {
    return null;
  }

  const parts = record.split(/\s+/).filter(Boolean);
  const parsed: SPFRecord = {
    version: 'spf1',
    mechanisms: [],
    qualifier: '',
    hasAll: false,
    includes: [],
    ipv4: [],
    ipv6: [],
    rawRecord: record,
  };

  for (const part of parts.slice(1)) {
    if (part.startsWith('include:')) {
      parsed.includes.push(part.substring(8));
      parsed.mechanisms.push(part);
    } else if (part.startsWith('ip4:')) {
      parsed.ipv4.push(part.substring(4));
      parsed.mechanisms.push(part);
    } else if (part.startsWith('ip6:')) {
      parsed.ipv6.push(part.substring(4));
      parsed.mechanisms.push(part);
    } else if (part.startsWith('a') || part.startsWith('mx') || part.startsWith('ptr') || part.startsWith('exists')) {
      parsed.mechanisms.push(part);
    } else if (part === 'all' || part === '-all' || part === '~all' || part === '+all' || part === '?all') {
      parsed.hasAll = true;
      parsed.qualifier = part.startsWith('-') ? 'fail' : part.startsWith('~') ? 'softfail' : part.startsWith('+') ? 'pass' : 'neutral';
      parsed.mechanisms.push(part);
    }
  }

  return parsed;
}

export function validateSPFRecord(record: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = parseSPFRecord(record);

  if (!parsed) {
    issues.push({
      severity: 'error',
      message: 'Invalid SPF record. Must start with v=spf1',
    });
    return issues;
  }

  // Check for all mechanism
  if (!parsed.hasAll) {
    issues.push({
      severity: 'warning',
      message: 'SPF record does not end with an "all" mechanism. This may allow unauthorized senders.',
    });
  } else if (parsed.qualifier === 'pass' || parsed.qualifier === 'neutral') {
    issues.push({
      severity: 'warning',
      message: `SPF record ends with "+all" or "?all" which allows all senders. Consider using "-all" (hard fail) or "~all" (soft fail).`,
    });
  }

  // Check DNS lookups count (SPF has a limit of 10)
  const lookupCount = parsed.includes.length + parsed.mechanisms.filter(m => m.startsWith('a') || m.startsWith('mx') || m.startsWith('exists') || m.startsWith('ptr')).length;

  if (lookupCount > 10) {
    issues.push({
      severity: 'error',
      message: `SPF record exceeds 10 DNS lookup limit (currently ${lookupCount}). This will cause SPF validation to fail.`,
    });
  } else if (lookupCount > 7) {
    issues.push({
      severity: 'warning',
      message: `SPF record has ${lookupCount} DNS lookups (limit is 10). Consider reducing to avoid hitting the limit.`,
    });
  }

  // Check for too many includes
  if (parsed.includes.length > 5) {
    issues.push({
      severity: 'info',
      message: `SPF record has ${parsed.includes.length} include mechanisms. Consider consolidating to reduce DNS lookups.`,
    });
  }

  return issues;
}

export function parseDKIMRecord(record: string): DKIMRecord | null {
  if (!record) {
    return null;
  }

  const parts = record.split(';').map((p) => p.trim()).filter(Boolean);
  const parsed: DKIMRecord = {
    rawRecord: record,
  };

  for (const part of parts) {
    const [key, value] = part.split('=').map((s) => s.trim());

    switch (key) {
      case 'v':
        parsed.version = value;
        break;
      case 'k':
        parsed.keyType = value;
        break;
      case 'p':
        parsed.publicKey = value;
        break;
      case 'h':
        parsed.hashAlgorithms = value.split(':');
        break;
      case 's':
        parsed.serviceTypes = value.split(':');
        break;
      case 't':
        parsed.flags = value;
        break;
      case 'n':
        parsed.notes = value;
        break;
    }
  }

  return parsed;
}

export function validateDKIMRecord(record: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = parseDKIMRecord(record);

  if (!parsed) {
    issues.push({
      severity: 'error',
      message: 'Invalid DKIM record',
    });
    return issues;
  }

  // Check for public key
  if (!parsed.publicKey) {
    issues.push({
      severity: 'error',
      message: 'Missing public key (p=) in DKIM record',
      field: 'p',
    });
  } else if (parsed.publicKey.length < 200) {
    issues.push({
      severity: 'warning',
      message: 'Public key seems short. Ensure it is a valid RSA or Ed25519 key.',
      field: 'p',
    });
  }

  // Check key type
  if (parsed.keyType && parsed.keyType !== 'rsa' && parsed.keyType !== 'ed25519') {
    issues.push({
      severity: 'warning',
      message: `Unknown key type: ${parsed.keyType}. Common types are "rsa" or "ed25519".`,
      field: 'k',
    });
  }

  // Check if testing mode
  if (parsed.flags?.includes('y')) {
    issues.push({
      severity: 'warning',
      message: 'DKIM record is in testing mode (t=y). Remove this flag when ready for production.',
      field: 't',
    });
  }

  // Info about version
  if (!parsed.version) {
    issues.push({
      severity: 'info',
      message: 'DKIM version tag (v=) is optional but recommended',
      field: 'v',
    });
  }

  return issues;
}

export function getRecommendations(type: 'dmarc' | 'spf' | 'dkim', record: string | null): string[] {
  const recommendations: string[] = [];

  if (!record) {
    switch (type) {
      case 'dmarc':
        recommendations.push('No DMARC record found. Consider adding one to protect your domain from email spoofing.');
        recommendations.push('Start with a monitoring policy: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com');
        break;
      case 'spf':
        recommendations.push('No SPF record found. Add an SPF record to specify which servers can send email for your domain.');
        recommendations.push('Example: v=spf1 include:_spf.google.com ~all');
        break;
      case 'dkim':
        recommendations.push('No DKIM record found for this selector. Ensure you are using the correct selector.');
        recommendations.push('DKIM records are added by your email service provider.');
        break;
    }
    return recommendations;
  }

  switch (type) {
    case 'dmarc': {
      const parsed = parseDMARCRecord(record);
      if (parsed?.policy === 'none') {
        recommendations.push('Your DMARC policy is in monitoring mode. Once you have verified SPF and DKIM are working correctly, consider moving to p=quarantine or p=reject.');
        recommendations.push('Monitor your aggregate reports (rua) for at least 2-4 weeks before tightening the policy.');
      }
      if (!parsed?.rufEmails || parsed.rufEmails.length === 0) {
        recommendations.push('Consider adding forensic reporting (ruf=) to receive samples of failed messages.');
      }
      break;
    }
    case 'spf': {
      const parsed = parseSPFRecord(record);
      if (parsed?.qualifier !== 'fail') {
        recommendations.push('Consider using "-all" instead of "~all" for stronger protection once you have verified all legitimate senders are included.');
      }
      break;
    }
    case 'dkim': {
      const parsed = parseDKIMRecord(record);
      if (parsed?.flags?.includes('y')) {
        recommendations.push('Your DKIM key is in testing mode. Remove "t=y" when ready for production.');
      }
      break;
    }
  }

  return recommendations;
}
