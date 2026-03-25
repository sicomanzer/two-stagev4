'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Brain, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'ai', content: 'สวัสดีครับ! ผม VI Buddy 🤖\nมีอะไรให้ผมช่วยอธิบายเกี่ยวกับการประเมินมูลค่าหุ้น หรือคำศัพท์ลงทุนไหมครับ?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [
      ...messages, 
      { id: Date.now().toString(), role: 'user', content: userMessage }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Try to find the ticker from the URL or query params if any
      const searchParams = new URLSearchParams(window.location.search);
      const contextTicker = searchParams.get('ticker') || '';

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, contextTicker })
      });

      const data = await res.json();
      
      if (data.reply) {
        setMessages([...newMessages, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: data.reply
        }]);
      } else {
        throw new Error(data.error || 'Failed to get reply');
      }
    } catch (err: any) {
      setMessages([...newMessages, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: 'ขออภัยครับ ระบบสื่อสารขัดข้อง กรุณาลองถามใหม่อีกครั้ง 🔌'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(79,70,229,0.3)] transition-all z-50 group animate-in slide-in-from-bottom-5 zoom-in-95 duration-500"
        >
          <MessageCircle size={28} className="group-hover:scale-110 transition-transform" />
          {/* Notification Dot */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-[0_10px_50px_rgba(0,0,0,0.2)] border border-slate-200 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 zoom-in-95 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-4 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                <Brain size={22} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide">VI Buddy</h3>
                <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-semibold">Qwen 3 Powered</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto min-h-[300px] max-h-[500px] bg-slate-50 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-200' 
                      : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-500 border border-slate-200 rounded-2xl rounded-tl-sm p-3 shadow-sm flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="text-xs font-medium">กำลังคิดคำตอบ...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about investing..."
                disabled={isLoading}
                className="w-full bg-slate-100 border-none rounded-full py-3 pl-4 pr-12 text-sm text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`absolute right-1.5 p-2 rounded-full transition-all ${
                  !input.trim() || isLoading 
                    ? 'text-slate-400 bg-transparent' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                }`}
              >
                <Send size={16} className={input.trim() && !isLoading ? 'ml-0.5' : ''} />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
}
