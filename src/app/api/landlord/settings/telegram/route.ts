import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

const TELEGRAM_API = 'https://api.telegram.org/bot';

function getToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

// GET - Get current Telegram connection status + bot info
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        telegramChatId: true,
        telegramUsername: true,
        telegramNotifications: true,
      },
    });

    // Get bot username via direct API call
    let botUsername: string | null = null;
    const token = getToken();
    const tokenConfigured = !!token;

    if (token) {
      try {
        const res = await fetch(`${TELEGRAM_API}${token}/getMe`);
        const data = await res.json();
        if (data.ok && data.result?.username) {
          botUsername = data.result.username;
        }
      } catch {
        // Network error or invalid token
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: !!user?.telegramChatId,
        telegramUsername: user?.telegramUsername || null,
        telegramNotifications: user?.telegramNotifications || false,
        botUsername,
        tokenConfigured,
      },
    });
  } catch (error) {
    console.error('Error fetching Telegram settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to load settings' }, { status: 500 });
  }
}

// POST - Verify and connect Telegram using verification code
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { verificationCode } = await request.json();
    if (!verificationCode) {
      return NextResponse.json({ success: false, error: 'Verification code required' }, { status: 400 });
    }

    const token = getToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'Telegram bot not configured' }, { status: 503 });
    }

    // Fetch recent updates via direct API call
    const updatesRes = await fetch(
      `${TELEGRAM_API}${token}/getUpdates?offset=0&limit=100&allowed_updates=["message"]`
    );
    const updatesData = await updatesRes.json();

    if (!updatesData.ok) {
      return NextResponse.json({ success: false, error: 'Failed to check Telegram updates' }, { status: 502 });
    }

    let matchedChatId: string | null = null;
    let matchedUsername: string | null = null;

    for (const update of updatesData.result || []) {
      if (
        update.message?.text &&
        update.message.text.trim() === verificationCode.trim()
      ) {
        matchedChatId = String(update.message.chat.id);
        matchedUsername = update.message.from?.username || null;
        break;
      }
    }

    if (!matchedChatId) {
      return NextResponse.json({
        success: false,
        error: 'Verification code not found. Please send the code to the bot and try again.',
      }, { status: 404 });
    }

    // Check if this chat ID is already used by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        telegramChatId: matchedChatId,
        NOT: { id: session.user.id },
      },
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'This Telegram account is already connected to another user.',
      }, { status: 409 });
    }

    // Save and enable notifications
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramChatId: matchedChatId,
        telegramUsername: matchedUsername,
        telegramNotifications: true,
      },
    });

    // Send confirmation message
    try {
      await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: matchedChatId,
          text: 'Strukture Connected!\n\nYou will now receive notifications for your properties.',
        }),
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        telegramUsername: matchedUsername,
        telegramNotifications: true,
      },
    });
  } catch (error) {
    console.error('Error connecting Telegram:', error);
    return NextResponse.json({ success: false, error: 'Failed to verify connection' }, { status: 500 });
  }
}

// PUT - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { telegramNotifications } = await request.json();

    await prisma.user.update({
      where: { id: session.user.id },
      data: { telegramNotifications: !!telegramNotifications },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating Telegram settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}

// DELETE - Disconnect Telegram
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramChatId: null,
        telegramUsername: null,
        telegramNotifications: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Telegram:', error);
    return NextResponse.json({ success: false, error: 'Failed to disconnect' }, { status: 500 });
  }
}
