import { useState } from 'react';
import { aiAPI } from '@/lib/api';
import { ChatMessage } from '@/types';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();

  const sendMessage = async (content: string, context?: any) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await aiAPI.chat({ message: content, conversation_id: conversationId, context });
      setConversationId(res.data.conversation_id);
      
      const aiMsg: ChatMessage = {
        id: Date.now().toString() + 1,
        role: 'ai',
        content: res.data.response,
        sources: res.data.sources,
        context_used: !!context,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, setMessages, sendMessage, isLoading, conversationId };
}
