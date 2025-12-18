'use client';

import { useState, useRef, useEffect } from 'react';
import { chatApi } from '@/lib/api';
import type { ChatMessageResponse } from '@/types';
import { ChatMessage } from './ChatMessage';
import { ChatSessionList } from './ChatSessionList';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Send, Plus, PanelLeftClose, PanelLeft } from 'lucide-react';

export function ChatInterface() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

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
    inputRef.current?.focus();
  };

  const handleSelectSession = async (id: string) => {
    try {
      const session = await chatApi.getSession(id);
      setSessionId(id);
      setMessages(session.messages);
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

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900`}
      >
        <div className="p-4 h-full flex flex-col">
          <Button onClick={handleNewChat} className="w-full mb-4">
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
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <PanelLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            {sessionId ? 'Chat Session' : 'New Chat'}
          </h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="max-w-md">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Ask questions about your YouTube videos
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  I can help you find information from transcribed video content.
                  Start by asking a question!
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'What topics are covered in the videos?',
                    'Summarize the main points discussed',
                    'Find videos that mention specific topics',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
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
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your videos..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-500 dark:focus:border-primary-400"
            />
            <Button onClick={handleSend} disabled={!input.trim() || loading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
