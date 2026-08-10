import { useEffect, useRef, useState } from 'react';
import { Bot, MessageSquare, Plus, Send, Sparkles, Trash2 } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Avatar, Button, Card, EmptyState, Input, Spinner } from '../components/ui';
import { timeAgo } from '../lib/format';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

function renderReply(text: string) {
  const parts = text.split(/\n(?=\*{1,3})|\n{2,}/);
  return (
    <div className="prose-ai text-sm leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (line.trim() === '') return <div key={i} className="h-2" />;
        if (line.startsWith('**') && line.endsWith('**')) {
          return <h3 key={i}>{line.replace(/\*\*/g, '')}</h3>;
        }
        if (line.startsWith('•')) return <p key={i} className="flex gap-2"><span className="text-brand-500">•</span><span>{line.slice(1)}</span></p>;
        if (/^\d+\./.test(line)) return <p key={i}>{line}</p>;
        if (line.startsWith('**')) {
          // inline bold start
          const bolded = line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
            seg.startsWith('**') && seg.endsWith('**') ? <strong key={j}>{seg.slice(2, -2)}</strong> : <span key={j}>{seg}</span>
          );
          return <p key={i}>{bolded}</p>;
        }
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

const suggestions = [
  'How to prepare for SSC CGL?',
  'Give me a daily study routine',
  'My mock scores are low, help me',
  'How to improve current affairs?',
  'UPSC prelims strategy',
  'Maths speed calculation tricks',
];

export default function AIAssistant() {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/ai/chats').then(({ data }) => setChats(data.data.chats)).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const loadChat = async (id: number) => {
    setChatId(id);
    setLoading(true);
    try {
      const { data } = await api.get(`/ai/chats/${id}`);
      setMessages(data.data.chat.messages);
    } catch (err) {
      setMessages([{ role: 'assistant', content: handleError(err) }]);
    } finally {
      setLoading(false);
    }
  };

  const newChat = () => {
    setChatId(null);
    setMessages([]);
  };

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setSending(true);
    const userMsg: ChatMessage = { role: 'user', content: message };
    setMessages((m) => [...m, userMsg]);
    try {
      const { data } = await api.post('/ai/chat', { message, chatId: chatId ?? undefined });
      setChatId(data.data.chatId);
      setMessages((m) => [...m, { role: 'assistant', content: data.data.reply }]);
      api.get('/ai/chats').then(({ data: d }) => setChats(d.data.chats)).catch(() => {});
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${handleError(err)}` }]);
    } finally {
      setSending(false);
    }
  };

  const deleteChat = async (id: number) => {
    try {
      await api.delete(`/ai/chats/${id}`);
      setChats((c) => c.filter((x) => x.id !== id));
      if (chatId === id) newChat();
    } catch { /* ignore */ }
  };

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6 h-[calc(100vh-8.5rem)]">
      {/* Chat list */}
      <Card className="hidden lg:flex flex-col overflow-hidden">
        <div className="p-4 border-b border-ink-100">
          <Button className="w-full" onClick={newChat}><Plus size={16} /> New chat</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.length === 0 && (
            <p className="text-xs text-ink-400 text-center py-8 px-4">Your past conversations with Garuda AI will appear here.</p>
          )}
          {chats.map((c) => (
            <div key={c.id} className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition ${chatId === c.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-ink-50'}`} onClick={() => loadChat(c.id)}>
              <MessageSquare size={15} className="shrink-0 text-ink-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{c.title}</p>
                <p className="text-[11px] text-ink-400">{timeAgo(c.updated_at)}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }} className="opacity-0 group-hover:opacity-100 text-ink-300 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Chat window */}
      <Card className="flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 p-2.5 text-white"><Bot size={20} /></div>
          <div className="flex-1">
            <p className="font-bold text-ink-900">Garuda AI Mentor</p>
            <p className="text-xs text-emerald-600 font-semibold">● Online — ready to help</p>
          </div>
          <span className="chip bg-brand-50 text-brand-700 border border-brand-200 hidden sm:inline-flex"><Sparkles size={11} /> Free AI mentor</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-ink-50/50 to-white">
          {messages.length === 0 && !sending ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center text-white text-3xl shadow-lg shadow-brand-600/30">🦅</div>
              <h2 className="text-xl font-extrabold text-ink-900 mt-4">Hi {user?.name.split(' ')[0]}, I'm Garuda! 👋</h2>
              <p className="text-ink-500 text-sm mt-1 max-w-sm">Your personal exam-prep mentor. Ask me about strategy, syllabus, routines or anything else.</p>
              <div className="grid sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="card !rounded-xl px-4 py-3 text-left text-sm font-semibold text-ink-700 hover:border-brand-300 hover:bg-brand-50/50 transition">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center text-white shrink-0"><Bot size={16} /></div>
                  )}
                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-br-md'
                      : 'bg-white border border-ink-200 rounded-bl-md shadow-sm'
                  }`}>
                    {m.role === 'user' ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p> : renderReply(m.content)}
                  </div>
                  {m.role === 'user' && <Avatar name={user?.name || 'You'} size={32} />}
                </div>
              ))}
              {sending && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center text-white shrink-0"><Bot size={16} /></div>
                  <div className="bg-white border border-ink-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-brand-400 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-brand-400 animate-bounce [animation-delay:0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-brand-400 animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <div className="p-4 border-t border-ink-100 bg-white">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex gap-2"
          >
            <Input
              placeholder="Ask about strategy, syllabus, routines…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="!rounded-xl"
            />
            <Button type="submit" loading={sending} className="!px-5"><Send size={16} /></Button>
          </form>
          <p className="text-[11px] text-ink-400 mt-2">Garuda AI provides guidance only. Always verify official notifications.</p>
        </div>
      </Card>
    </div>
  );
}
