import { db } from '../src/db';
import { knownSenders } from '../src/db/schema';

const knownSendersData = [
  {
    name: 'Google Workspace',
    description: 'Google Workspace (formerly G Suite) email services',
    category: 'corporate',
    website: 'https://workspace.google.com',
    ipRanges: [
      '35.190.247.0/24',
      '64.233.160.0/19',
      '66.102.0.0/20',
      '66.249.80.0/20',
      '72.14.192.0/18',
      '74.125.0.0/16',
      '108.177.8.0/21',
      '172.217.0.0/19',
      '172.217.32.0/20',
      '172.217.128.0/19',
      '172.217.160.0/20',
      '172.217.192.0/19',
      '173.194.0.0/16',
      '209.85.128.0/17',
      '216.58.192.0/19',
      '216.239.32.0/19',
    ],
    dkimDomains: ['google.com', 'gmail.com'],
    isGlobal: true,
  },
  {
    name: 'Microsoft 365',
    description: 'Microsoft 365 (formerly Office 365) email services',
    category: 'corporate',
    website: 'https://www.microsoft.com/microsoft-365',
    ipRanges: [
      '13.107.6.152/31',
      '13.107.9.152/31',
      '13.107.18.10/31',
      '13.107.19.10/31',
      '40.92.0.0/15',
      '40.107.0.0/16',
      '52.100.0.0/14',
      '104.47.0.0/17',
      '157.55.234.0/24',
      '207.46.100.0/24',
      '207.46.163.0/24',
    ],
    dkimDomains: [
      'protection.outlook.com',
      'outlook.com',
      'hotmail.com',
      'microsoft.com',
    ],
    isGlobal: true,
  },
  {
    name: 'SendGrid',
    description: 'Twilio SendGrid email delivery platform',
    category: 'transactional',
    website: 'https://sendgrid.com',
    ipRanges: [
      '167.89.0.0/17',
      '168.245.0.0/16',
      '208.117.48.0/20',
      '192.254.112.0/20',
      '198.37.144.0/20',
      '198.21.0.0/21',
    ],
    dkimDomains: ['sendgrid.net', 'sendgrid.me'],
    isGlobal: true,
  },
  {
    name: 'Mailgun',
    description: 'Mailgun email service by Sinch',
    category: 'transactional',
    website: 'https://www.mailgun.com',
    ipRanges: [
      '69.72.32.0/19',
      '161.38.192.0/20',
      '198.61.254.0/24',
    ],
    dkimDomains: ['mailgun.org', 'mailgun.com', 'mailgun.info'],
    isGlobal: true,
  },
  {
    name: 'Mailchimp',
    description: 'Mailchimp email marketing platform',
    category: 'marketing',
    website: 'https://mailchimp.com',
    ipRanges: [
      '198.2.128.0/18',
      '198.2.180.0/24',
      '198.2.186.0/23',
      '205.201.128.0/20',
    ],
    dkimDomains: [
      'mcsv.net',
      'mailchimp.com',
      'mandrillapp.com',
      'rsgsv.net',
    ],
    isGlobal: true,
  },
  {
    name: 'Amazon SES',
    description: 'Amazon Simple Email Service',
    category: 'transactional',
    website: 'https://aws.amazon.com/ses/',
    ipRanges: [
      '54.240.0.0/18',
      '69.169.224.0/20',
      '174.129.0.0/16',
    ],
    dkimDomains: ['amazonses.com', 'amazonaws.com'],
    isGlobal: true,
  },
  {
    name: 'Postmark',
    description: 'Postmark transactional email service',
    category: 'transactional',
    website: 'https://postmarkapp.com',
    ipRanges: [
      '50.31.152.0/24',
      '146.20.0.0/16',
    ],
    dkimDomains: ['pm-bounces.com', 'postmarkapp.com'],
    isGlobal: true,
  },
  {
    name: 'SparkPost',
    description: 'SparkPost email delivery service',
    category: 'transactional',
    website: 'https://www.sparkpost.com',
    ipRanges: [
      '167.89.0.0/17',
    ],
    dkimDomains: ['sparkpostmail.com', 'sparkpost.com'],
    isGlobal: true,
  },
  {
    name: 'Constant Contact',
    description: 'Constant Contact email marketing platform',
    category: 'marketing',
    website: 'https://www.constantcontact.com',
    ipRanges: [
      '65.124.128.0/19',
      '208.75.120.0/21',
    ],
    dkimDomains: ['constantcontact.com', 'ctctcdn.com'],
    isGlobal: true,
  },
  {
    name: 'Campaign Monitor',
    description: 'Campaign Monitor email marketing platform',
    category: 'marketing',
    website: 'https://www.campaignmonitor.com',
    ipRanges: [
      '103.28.250.0/24',
      '103.99.72.0/22',
    ],
    dkimDomains: ['createsend.com', 'campaignmonitor.com'],
    isGlobal: true,
  },
  {
    name: 'Yahoo Mail',
    description: 'Yahoo Mail email service',
    category: 'corporate',
    website: 'https://mail.yahoo.com',
    ipRanges: [
      '66.94.224.0/19',
      '67.195.0.0/16',
      '74.6.0.0/16',
      '98.136.0.0/14',
      '202.160.176.0/20',
    ],
    dkimDomains: ['yahoo.com', 'yahoodns.net'],
    isGlobal: true,
  },
  {
    name: 'Zoho Mail',
    description: 'Zoho Mail email hosting service',
    category: 'corporate',
    website: 'https://www.zoho.com/mail/',
    ipRanges: [
      '136.143.190.0/23',
      '136.143.186.0/23',
    ],
    dkimDomains: ['zoho.com', 'zohomail.com'],
    isGlobal: true,
  },
  {
    name: 'HubSpot',
    description: 'HubSpot marketing and CRM platform',
    category: 'marketing',
    website: 'https://www.hubspot.com',
    ipRanges: [
      '23.21.109.0/24',
      '23.21.109.197/32',
    ],
    dkimDomains: ['hubspot.com', 'hs-email.net'],
    isGlobal: true,
  },
  {
    name: 'Salesforce Marketing Cloud',
    description: 'Salesforce Marketing Cloud (formerly ExactTarget)',
    category: 'marketing',
    website: 'https://www.salesforce.com/products/marketing-cloud/',
    ipRanges: [
      '136.147.0.0/16',
    ],
    dkimDomains: ['exacttarget.com', 'salesforce.com'],
    isGlobal: true,
  },
  {
    name: 'Zendesk',
    description: 'Zendesk customer support platform emails',
    category: 'transactional',
    website: 'https://www.zendesk.com',
    ipRanges: [
      '192.161.144.0/20',
    ],
    dkimDomains: ['zendesk.com'],
    isGlobal: true,
  },
];

async function seedKnownSenders() {
  console.log('Seeding known senders...');

  try {
    for (const sender of knownSendersData) {
      await db.insert(knownSenders).values(sender).onConflictDoNothing();
      console.log(`✓ Seeded: ${sender.name}`);
    }

    console.log(`\n✓ Successfully seeded ${knownSendersData.length} known senders`);
  } catch (error) {
    console.error('Error seeding known senders:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedKnownSenders()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

export { seedKnownSenders };
