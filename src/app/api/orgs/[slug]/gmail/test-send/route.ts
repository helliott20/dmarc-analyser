import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, gmailAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendEmailViaGmail } from '@/lib/gmail';
import { generateTestEmail } from '@/lib/email-templates';

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

    // Get organization with branding
    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        primaryColor: organizations.primaryColor,
        accentColor: organizations.accentColor,
      })
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
      // Use the first send-enabled Gmail account
      const [account] = await db
        .select({ id: gmailAccounts.id })
        .from(gmailAccounts)
        .where(
          and(
            eq(gmailAccounts.organizationId, org.id),
            eq(gmailAccounts.sendEnabled, true)
          )
        )
        .limit(1);

      if (!account) {
        return NextResponse.json(
          { error: 'No Gmail account authorized for sending. Please authorize a Gmail account first.' },
          { status: 400 }
        );
      }
      accountId = account.id;
    } else {
      // Verify the specified account is authorized for sending
      const [account] = await db
        .select({ sendEnabled: gmailAccounts.sendEnabled })
        .from(gmailAccounts)
        .where(
          and(
            eq(gmailAccounts.id, accountId),
            eq(gmailAccounts.organizationId, org.id)
          )
        )
        .limit(1);

      if (!account) {
        return NextResponse.json(
          { error: 'Gmail account not found' },
          { status: 404 }
        );
      }

      if (!account.sendEnabled) {
        return NextResponse.json(
          { error: 'This Gmail account is not authorized for sending. Please authorize it first.' },
          { status: 403 }
        );
      }
    }

    // Generate branded test email
    const { html, text, subject } = generateTestEmail({ org });

    // Send test email
    const result = await sendEmailViaGmail(accountId, {
      to,
      subject,
      html,
      text,
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
