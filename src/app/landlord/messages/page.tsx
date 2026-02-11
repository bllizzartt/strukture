'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MessageSquare, Send, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Conversation {
  conversationKey: string;
  otherParty: {
    id: string;
    name: string;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
  isOwn: boolean;
}

function parseLeaseInfo(conversationKey: string): string | null {
  if (!conversationKey.startsWith('lease:')) return null;
  // Expected format: lease:{leaseId} or lease:{property}:{unit}
  // Extract a human-readable label from the key
  const parts = conversationKey.replace('lease:', '').split(':');
  if (parts.length >= 2) {
    return `${parts[0]} - Unit ${parts[1]}`;
  }
  return `Lease ${parts[0]}`;
}

export default function LandlordMessagesPage() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      const result = await response.json();
      if (result.success) {
        setConversations(result.data);
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load conversations',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchMessages = useCallback(
    async (conversationKey: string) => {
      try {
        const response = await fetch(
          `/api/messages?conversationKey=${encodeURIComponent(conversationKey)}`
        );
        const result = await response.json();
        if (result.success) {
          setMessages(result.data);
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load messages',
        });
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    if (!selectedConversation) return;

    fetchMessages(selectedConversation);
    const interval = setInterval(() => {
      fetchMessages(selectedConversation);
      fetchConversations();
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedConversation, fetchMessages, fetchConversations]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSelectConversation = (conversationKey: string) => {
    setSelectedConversation(conversationKey);
    setShowChat(true);
  };

  const handleBackToList = () => {
    setShowChat(false);
    setSelectedConversation(null);
    setMessages([]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const conversation = conversations.find(
      (c) => c.conversationKey === selectedConversation
    );
    if (!conversation) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationKey: selectedConversation,
          recipientId: conversation.otherParty.id,
          content: newMessage.trim(),
        }),
      });
      const result = await response.json();
      if (result.success) {
        setNewMessage('');
        await fetchMessages(selectedConversation);
        await fetchConversations();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to send message',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message',
      });
    } finally {
      setIsSending(false);
    }
  };

  const selectedConversationData = conversations.find(
    (c) => c.conversationKey === selectedConversation
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Chat with your tenants</p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex h-[calc(100vh-16rem)] min-h-[500px]">
          {/* Left Panel - Conversation List */}
          <div
            className={`w-full border-r md:w-80 md:flex-shrink-0 flex flex-col ${
              showChat ? 'hidden md:flex' : 'flex'
            }`}
          >
            <CardHeader className="border-b px-4 py-3 flex-shrink-0">
              <CardTitle className="text-base">Conversations</CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground font-medium">No messages yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Conversations with tenants will appear here
                  </p>
                </div>
              ) : (
                conversations.map((conversation) => {
                  const leaseInfo = parseLeaseInfo(conversation.conversationKey);
                  return (
                    <button
                      key={conversation.conversationKey}
                      onClick={() =>
                        handleSelectConversation(conversation.conversationKey)
                      }
                      className={`w-full text-left p-4 border-b hover:bg-muted/50 transition-colors ${
                        selectedConversation === conversation.conversationKey
                          ? 'bg-muted'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              {conversation.otherParty.name}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          {leaseInfo && (
                            <p className="text-xs text-primary/80 mt-0.5 truncate">
                              {leaseInfo}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {conversation.lastMessage}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {format(new Date(conversation.lastMessageAt), 'MMM d')}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel - Chat View */}
          <div
            className={`flex-1 flex flex-col ${
              showChat ? 'flex' : 'hidden md:flex'
            }`}
          >
            {selectedConversation && selectedConversationData ? (
              <>
                {/* Chat Header */}
                <div className="border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={handleBackToList}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <p className="font-medium">
                      {selectedConversationData.otherParty.name}
                    </p>
                    {parseLeaseInfo(selectedConversation) && (
                      <p className="text-xs text-muted-foreground">
                        {parseLeaseInfo(selectedConversation)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No messages yet. Start the conversation!
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.isOwn ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 ${
                            message.isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              message.isOwn
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t p-4 flex-shrink-0">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      disabled={isSending}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={isSending || !newMessage.trim()}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex flex-col items-center justify-center text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium">
                  Select a conversation to start messaging
                </p>
              </CardContent>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
