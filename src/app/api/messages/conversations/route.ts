import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/messages/conversations - List all conversations for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get all messages where user is sender or recipient
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { recipientId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group messages by conversationKey
    const conversationMap = new Map<
      string,
      {
        conversationKey: string;
        lastMessage: typeof messages[0];
        unreadCount: number;
        otherUser: { id: string; name: string };
      }
    >();

    for (const message of messages) {
      const key = message.conversationKey;

      if (!conversationMap.has(key)) {
        // Determine the other user in this conversation
        const isUserSender = message.senderId === userId;
        const other = isUserSender ? message.recipient : message.sender;

        conversationMap.set(key, {
          conversationKey: key,
          lastMessage: message,
          unreadCount: 0,
          otherUser: {
            id: other.id,
            name: `${other.firstName} ${other.lastName}`,
          },
        });
      }

      // Count unread messages where current user is the recipient
      if (message.recipientId === userId && !message.readAt) {
        const conv = conversationMap.get(key)!;
        conv.unreadCount += 1;
      }
    }

    // Convert to array, already ordered by most recent message
    // because messages were fetched ordered by createdAt desc
    const conversations = Array.from(conversationMap.values());

    return NextResponse.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
