'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, X, Send, Sparkles, Trash2, MessageSquare,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

/* ─── Types ──────────────────────────────────────────────────────── */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/* ─── Quick Suggestions ──────────────────────────────────────────── */
const QUICK_SUGGESTIONS = [
  'What is the rehabilitation progress?',
  'Tell me about VR Puram',
  'How many families are verified?',
  'Show plot allotment status',
];

/* ─── Typing indicator dots ──────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-amber-500"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AI CHAT ASSISTANT COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function AIChatAssistant() {
  const chatOpen = useAppStore((s) => s.chatOpen);
  const setChatOpen = useAppStore((s) => s.setChatOpen);
  const view = useAppStore((s) => s.view);
  const mapHeavyView = ['mandal', 'village', 'map', 'relocation'].includes(view);
  const floatingButtonPosition = mapHeavyView ? 'left-4 right-auto lg:left-[76px]' : 'right-6';
  const floatingButtonVisibility = mapHeavyView ? 'hidden lg:flex' : 'flex';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [chatOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && chatOpen) {
        setChatOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [chatOpen, setChatOpen]);

  // Send message
  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, sessionId }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Don't render on globe or login views
  if (view === 'globe' || view === 'login') return null;

  return (
    <>
      {/* ─── Floating Chat Button ─── */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            onClick={() => setChatOpen(true)}
            className={`fixed bottom-20 ${floatingButtonPosition} z-40 w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25 ${floatingButtonVisibility} items-center justify-center hover:shadow-xl hover:shadow-amber-500/30 transition-shadow group`}
            aria-label="Open AI Chat Assistant"
            title="AI Chat Assistant"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-5 h-5 text-white group-hover:text-white/90 transition-colors" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full border-2 border-amber-300/40 animate-ping" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── Chat Panel ─── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className={`fixed bottom-6 z-50 max-h-[520px] flex flex-col rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-[#1E293B] overflow-hidden ${mapHeavyView ? 'left-4 right-4 sm:left-6 sm:right-auto sm:w-[400px] lg:left-[76px]' : 'left-4 right-4 sm:left-auto sm:right-6 sm:w-[400px]'}`}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-wide">AI Assistant</h2>
                  <p className="text-[10px] text-white/50" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    Polavaram R&amp;R Expert
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={clearConversation}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white/60" />
                </button>
                <button
                  onClick={() => setChatOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  aria-label="Close chat"
                  title="Close (Esc)"
                >
                  <X className="w-3.5 h-3.5 text-white/60" />
                </button>
              </div>
            </div>

            {/* ─── Messages Area ─── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3 min-h-0" style={{ maxHeight: '340px' }}>
              {/* Welcome message */}
              {messages.length === 0 && (
                <motion.div
                  className="flex flex-col items-center justify-center text-center py-6 gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-1">
                    <MessageSquare className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Polavaram AI Assistant
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-[260px]">
                      Ask me about rehabilitation progress, family data, village details, or plot allotments.
                    </p>
                  </div>
                  {/* Quick suggestions */}
                  <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
                    {QUICK_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => sendMessage(suggestion)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-medium border border-amber-200 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Message bubbles */}
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, delay: idx === messages.length - 1 ? 0.05 : 0 }}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-[#0F2B46] to-[#1E3A5F] text-white rounded-br-md'
                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Bot className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">AI</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-[9px] mt-1.5 ${
                        msg.role === 'user' ? 'text-white/40' : 'text-slate-400 dark:text-slate-500'
                      }`}
                      style={{ fontFamily: 'var(--font-jetbrains)' }}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="bg-slate-100 dark:bg-slate-800/60 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-1.5 px-2 pt-2 pb-1">
                      <Bot className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">AI</span>
                    </div>
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ─── Quick suggestions in conversation ─── */}
            {messages.length > 0 && messages.length < 3 && !isLoading && (
              <div className="px-4 pb-2 shrink-0">
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.slice(0, 2).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-700/40 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Input Area ─── */}
            <div className="px-3 pb-3 pt-1.5 shrink-0 border-t border-slate-100 dark:border-slate-700/40">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-200/60 dark:border-slate-700/40 focus-within:border-amber-300 dark:focus-within:border-amber-600/50 focus-within:ring-2 focus-within:ring-amber-200/50 dark:focus-within:ring-amber-800/30 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about the project..."
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                  disabled={isLoading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                    input.trim() && !isLoading
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm hover:shadow-md active:scale-95'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p
                className="text-[9px] text-slate-400 dark:text-slate-500 text-center mt-1.5"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                AI assistant • Press Enter to send • Esc to close
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
