import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { seedKnownSenders } from '@/db/seeds/known-senders';

/**
 * POST /api/admin/seed-known-senders
 *
 * Seeds the database with known email senders
 *
 * Authentication: Required (any authenticated user can run this)
 * Note: In production, you may want to restrict this to admin users only
 */
export async function POST() {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    // Optional: Add admin check here if needed
    // For now, any authenticated user can seed the database
    // In production, you might want to check if user has admin role:
    //
    // const isAdmin = await checkIfUserIsAdmin(session.user.id);
    // if (!isAdmin) {
    //   return NextResponse.json(
    //     { error: 'Forbidden - admin access required' },
    //     { status: 403 }
    //   );
    // }

    console.log(`[Seed API] Seeding initiated by user: ${session.user.email}`);

    // Run the seed function
    const result = await seedKnownSenders();

    return NextResponse.json({
      success: true,
      message: 'Known senders seeded successfully',
      data: {
        seeded: result.seeded,
        skipped: result.skipped,
        total: result.total,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Seed API] Error seeding known senders:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed known senders',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/seed-known-senders
 *
 * Returns information about the seed endpoint
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized - authentication required' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    endpoint: '/api/admin/seed-known-senders',
    method: 'POST',
    description: 'Seeds the database with known email senders',
    authentication: 'Required',
    providers: [
      'Google Workspace',
      'Microsoft 365',
      'Amazon SES',
      'SendGrid',
      'Mailchimp',
      'Mailgun',
      'Postmark',
      'SparkPost',
      'Sendinblue/Brevo',
      'Constant Contact',
      'HubSpot',
      'Salesforce Marketing Cloud',
      'Zendesk',
      'Freshdesk',
      'Intercom',
      'Campaign Monitor',
      'Yahoo Mail',
      'Zoho Mail',
    ],
    totalProviders: 18,
    note: 'This endpoint will skip providers that already exist in the database',
  });
}
