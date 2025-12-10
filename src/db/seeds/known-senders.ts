import { db } from '../index';
import { knownSenders } from '../schema';
import { eq } from 'drizzle-orm';

const knownSendersData = [
  {
    name: 'Google Workspace',
    description: 'Google Workspace (formerly G Suite) and Gmail email services',
    category: 'corporate',
    website: 'https://workspace.google.com',
    logoUrl: 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png',
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
    dkimDomains: ['google.com', 'gmail.com', 'googlemail.com'],
    isGlobal: true,
  },
  {
    name: 'Microsoft 365',
    description: 'Microsoft 365 (formerly Office 365), Outlook, and Hotmail email services',
    category: 'corporate',
    website: 'https://www.microsoft.com/microsoft-365',
    logoUrl: 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b',
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
    name: 'Amazon SES',
    description: 'Amazon Simple Email Service - cloud-based email sending service',
    category: 'transactional',
    website: 'https://aws.amazon.com/ses/',
    logoUrl: 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png',
    ipRanges: [
      '54.240.0.0/18',
      '69.169.224.0/20',
      '174.129.0.0/16',
    ],
    dkimDomains: ['amazonses.com', 'amazonaws.com'],
    isGlobal: true,
  },
  {
    name: 'SendGrid',
    description: 'Twilio SendGrid email delivery platform for transactional and marketing emails',
    category: 'transactional',
    website: 'https://sendgrid.com',
    logoUrl: 'https://sendgrid.com/wp-content/themes/sgdotcom/pages/resource/brand/2016/SendGrid-Logomark.png',
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
    name: 'Mailchimp',
    description: 'Mailchimp email marketing and automation platform',
    category: 'marketing',
    website: 'https://mailchimp.com',
    logoUrl: 'https://eep.io/images/yzco4xsimv0y/5bIU9fLlTKaMyMcoiaooEC/c6dff2b7906a3e2e7f890fc8f1c8e71a/freddie_icon.svg',
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
    name: 'Mailgun',
    description: 'Mailgun email API service by Sinch for developers',
    category: 'transactional',
    website: 'https://www.mailgun.com',
    logoUrl: 'https://www.mailgun.com/wp-content/uploads/2020/10/Mailgun_Icon_Red.svg',
    ipRanges: [
      '69.72.32.0/19',
      '161.38.192.0/20',
      '198.61.254.0/24',
    ],
    dkimDomains: ['mailgun.org', 'mailgun.com', 'mailgun.info'],
    isGlobal: true,
  },
  {
    name: 'Postmark',
    description: 'Postmark transactional email service with high deliverability',
    category: 'transactional',
    website: 'https://postmarkapp.com',
    logoUrl: 'https://postmarkapp.com/images/logo.svg',
    ipRanges: [
      '50.31.152.0/24',
      '146.20.0.0/16',
    ],
    dkimDomains: ['pm-bounces.com', 'postmarkapp.com'],
    isGlobal: true,
  },
  {
    name: 'SparkPost',
    description: 'SparkPost email delivery service for high-volume senders',
    category: 'transactional',
    website: 'https://www.sparkpost.com',
    logoUrl: 'https://www.sparkpost.com/sites/default/files/attachments/SparkPost_Logo_2-Color_Gray-Orange_RGB.svg',
    ipRanges: [
      '167.89.0.0/17',
    ],
    dkimDomains: ['sparkpostmail.com', 'sparkpost.com'],
    isGlobal: true,
  },
  {
    name: 'Sendinblue/Brevo',
    description: 'Brevo (formerly Sendinblue) marketing automation and email platform',
    category: 'marketing',
    website: 'https://www.brevo.com',
    logoUrl: 'https://www.brevo.com/wp-content/themes/brevo/dist/images/logo-brevo.svg',
    ipRanges: [
      '145.239.0.0/16',
      '185.107.232.0/24',
    ],
    dkimDomains: ['sendinblue.com', 'brevo.com'],
    isGlobal: true,
  },
  {
    name: 'Constant Contact',
    description: 'Constant Contact email marketing and online survey platform',
    category: 'marketing',
    website: 'https://www.constantcontact.com',
    logoUrl: 'https://www.constantcontact.com/blog/wp-content/uploads/2021/01/CC-Logo-Horizontal-RGB.png',
    ipRanges: [
      '65.124.128.0/19',
      '208.75.120.0/21',
    ],
    dkimDomains: ['constantcontact.com', 'ctctcdn.com'],
    isGlobal: true,
  },
  {
    name: 'HubSpot',
    description: 'HubSpot marketing, sales, and CRM platform',
    category: 'marketing',
    website: 'https://www.hubspot.com',
    logoUrl: 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
    ipRanges: [
      '23.21.109.0/24',
      '23.21.109.197/32',
    ],
    dkimDomains: ['hubspot.com', 'hs-email.net'],
    isGlobal: true,
  },
  {
    name: 'Salesforce Marketing Cloud',
    description: 'Salesforce Marketing Cloud (formerly ExactTarget) for enterprise marketing',
    category: 'marketing',
    website: 'https://www.salesforce.com/products/marketing-cloud/',
    logoUrl: 'https://www.salesforce.com/content/dam/sfdc-docs/www/logos/logo-salesforce.svg',
    ipRanges: [
      '136.147.0.0/16',
    ],
    dkimDomains: ['exacttarget.com', 'salesforce.com'],
    isGlobal: true,
  },
  {
    name: 'Zendesk',
    description: 'Zendesk customer service and support platform emails',
    category: 'transactional',
    website: 'https://www.zendesk.com',
    logoUrl: 'https://d1eipm3vz40hy0.cloudfront.net/images/AMER/zendesk-logo.png',
    ipRanges: [
      '192.161.144.0/20',
    ],
    dkimDomains: ['zendesk.com'],
    isGlobal: true,
  },
  {
    name: 'Freshdesk',
    description: 'Freshdesk customer support and helpdesk platform',
    category: 'transactional',
    website: 'https://www.freshdesk.com',
    logoUrl: 'https://www.freshworks.com/static-assets/images/common/company/logos/logo-freshdesk.svg',
    ipRanges: [
      '136.143.0.0/16',
    ],
    dkimDomains: ['freshdesk.com'],
    isGlobal: true,
  },
  {
    name: 'Intercom',
    description: 'Intercom customer messaging and engagement platform',
    category: 'transactional',
    website: 'https://www.intercom.com',
    logoUrl: 'https://www.intercom.com/assets/images/brand/intercom-logo.svg',
    ipRanges: [
      '52.0.0.0/8',
    ],
    dkimDomains: ['intercom.io', 'intercom-mail.com'],
    isGlobal: true,
  },
  {
    name: 'Campaign Monitor',
    description: 'Campaign Monitor email marketing and automation platform',
    category: 'marketing',
    website: 'https://www.campaignmonitor.com',
    logoUrl: 'https://www.campaignmonitor.com/assets/brand/campaign-monitor-logo.svg',
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
    logoUrl: 'https://s.yimg.com/cv/apiv2/default/20190301/yahoo_logo.png',
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
    description: 'Zoho Mail email hosting service for businesses',
    category: 'corporate',
    website: 'https://www.zoho.com/mail/',
    logoUrl: 'https://www.zoho.com/mail/images/zoho-mail-logo.png',
    ipRanges: [
      '136.143.190.0/23',
      '136.143.186.0/23',
    ],
    dkimDomains: ['zoho.com', 'zohomail.com'],
    isGlobal: true,
  },
];

async function seedKnownSenders() {
  console.log('🌱 Seeding known senders...\n');

  try {
    // Check if already seeded
    const existingCount = await db
      .select()
      .from(knownSenders)
      .where(eq(knownSenders.isGlobal, true));

    if (existingCount.length > 0) {
      console.log(`ℹ️  Found ${existingCount.length} existing global senders`);
      console.log('   Skipping duplicates...\n');
    }

    let seededCount = 0;
    let skippedCount = 0;

    for (const sender of knownSendersData) {
      try {
        const [result] = await db
          .insert(knownSenders)
          .values(sender)
          .onConflictDoNothing()
          .returning();

        if (result) {
          console.log(`✓ Seeded: ${sender.name}`);
          seededCount++;
        } else {
          console.log(`⊘ Skipped: ${sender.name} (already exists)`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`✗ Failed to seed ${sender.name}:`, error);
      }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   Added: ${seededCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${knownSendersData.length}`);

    return { seeded: seededCount, skipped: skippedCount, total: knownSendersData.length };
  } catch (error) {
    console.error('❌ Error seeding known senders:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedKnownSenders()
    .then(() => {
      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed:', error);
      process.exit(1);
    });
}

export { seedKnownSenders, knownSendersData };
