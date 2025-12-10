import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, gmailAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendEmailViaGmail } from '@/lib/gmail';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { to, gmailAccountId } = body;

    if (!to) {
      return NextResponse.json({ error: 'Recipient email required' }, { status: 400 });
    }

    // Get organization
    const [org] = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.slug, slug));

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check membership
    const [membership] = await db
      .select()
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.organizationId, org.id),
          eq(orgMembers.userId, session.user.id)
        )
      );

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    // Get the Gmail account to send from
    let accountId = gmailAccountId;

    if (!accountId) {
      // Use the first connected Gmail account
      const [account] = await db
        .select({ id: gmailAccounts.id })
        .from(gmailAccounts)
        .where(eq(gmailAccounts.organizationId, org.id))
        .limit(1);

      if (!account) {
        return NextResponse.json(
          { error: 'No Gmail account connected. Please connect a Gmail account first.' },
          { status: 400 }
        );
      }
      accountId = account.id;
    }

    // Send test email
    const result = await sendEmailViaGmail(accountId, {
      to,
      subject: `Test Email from DMARC Analyser - ${org.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .success { color: #059669; font-weight: bold; }
            .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">DMARC Analyser</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">${org.name}</p>
            </div>
            <div class="content">
              <p class="success">Email sending is working correctly!</p>
              <p>This is a test email from your DMARC Analyser instance. If you're receiving this, it means:</p>
              <ul>
                <li>Gmail OAuth is properly configured</li>
                <li>The gmail.send permission is granted</li>
                <li>Alert and scheduled report emails will work</li>
              </ul>
              <p>You can now configure alert rules and scheduled reports with confidence.</p>
              <div class="footer">
                <p>Sent from DMARC Analyser at ${new Date().toISOString()}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: `Test email sent successfully to ${to}`,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send test email' },
      { status: 500 }
    );
  }
}
