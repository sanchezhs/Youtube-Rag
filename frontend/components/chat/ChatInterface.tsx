'use client';

import { useState, useRef, useEffect } from 'react';
import { chatApi, channelsApi, videosApi } from '@/lib/api';
import type { ChatMessageResponse, ChannelResponse, VideoResponse } from '@/types';
import { ChatMessage } from './ChatMessage';
import { ChatSessionList } from './ChatSessionList';
import { ChatContextSelector, ChatContext } from './ChatContextSelector';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Send, Plus, PanelLeftClose, PanelLeft, AlertCircle } from 'lucide-react';

export function ChatInterface() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatContext, setChatContext] = useState<ChatContext>({
    channel: null,
    scope: 'channel',
    selectedVideos: [],
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const canSendMessage = () => {
    if (!chatContext.channel) return false;
    if (chatContext.scope === 'videos' && chatContext.selectedVideos.length === 0) return false;
    if (!input.trim()) return false;
    return true;
  };

  const handleSend = async () => {
    if (!canSendMessage() || loading) return;

    const question = input.trim();
    setInput('');
    setLoading(true);

    const userMessage: ChatMessageResponse = {
      id: Date.now(),
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await chatApi.ask({
        question,
        channel_id: chatContext.channel!.id,
        video_ids: chatContext.scope === 'videos' 
          ? chatContext.selectedVideos.map(v => v.video_id)
          : [],
        session_id: sessionId || undefined,
      });

      if (!sessionId) {
        setSessionId(response.session_id);
      }

      const assistantMessage: ChatMessageResponse = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        created_at: new Date().toISOString(),
        sources: JSON.stringify(response.sources),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessageResponse = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([]);
    // Keep the current channel context but reset to "all videos"
    setChatContext(prev => ({
      ...prev,
      scope: 'channel',
      selectedVideos: [],
    }));
    inputRef.current?.focus();
  };

  const handleSelectSession = async (id: string) => {
    try {
      const session = await chatApi.getSession(id);
      setSessionId(id);
      setMessages(session.messages);

      // Restore chat context from session
      const channels = await channelsApi.list();
      const channel = channels.find(c => c.id === session.channel_id);
      
      if (channel) {
        // If session has specific videos, set scope to 'videos'
        const hasSpecificVideos = session.videos && session.videos.length > 0;
        
        setChatContext({
          channel,
          scope: hasSpecificVideos ? 'videos' : 'channel',
          selectedVideos: session.videos || [],
        });
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await chatApi.deleteSession(id);
      if (sessionId === id) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const getContextWarning = () => {
    if (!chatContext.channel) {
      return 'Please select a channel to start chatting';
    }
    if (chatContext.scope === 'videos' && chatContext.selectedVideos.length === 0) {
      return 'Please select at least one video';
    }
    return null;
  };

  const contextWarning = getContextWarning();

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0`}
      >
        <div className="p-3 h-full flex flex-col w-72">
          <Button onClick={handleNewChat} className="w-full mb-3" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
          <div className="flex-1 overflow-y-auto">
            <ChatSessionList
              currentSessionId={sessionId}
              onSelectSession={handleSelectSession}
              onDeleteSession={handleDeleteSession}
            />
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-w-0">
        {/* Header with Context Selector */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <PanelLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              {sessionId ? 'Chat' : 'New Chat'}
            </h2>
          </div>

          {/* Context Selector */}
          <ChatContextSelector
            context={chatContext}
            onChange={setChatContext}
            disabled={loading}
          />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Ask questions about your videos
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {chatContext.channel 
                    ? `Searching ${chatContext.scope === 'channel' ? 'all videos' : `${chatContext.selectedVideos.length} selected videos`} from "${chatContext.channel.name}"`
                    : 'Select a channel above to start'
                  }
                </p>
                {chatContext.channel && !contextWarning && (
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      'What are the main topics covered?',
                      'Summarize the key points',
                      'What are the main takeaways?',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="text-left p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Spinner size="sm" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Context Warning */}
        {contextWarning && (
          <div className="flex-shrink-0 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{contextWarning}</span>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-3">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                chatContext.channel
                  ? 'Ask a question about your videos...'
                  : 'Select a channel to start...'
              }
              disabled={!chatContext.channel || !!contextWarning}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Button 
              onClick={handleSend} 
              disabled={!canSendMessage() || loading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
