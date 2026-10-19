import { useEffect, useRef, useState } from 'react';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

const QUICK = ['Menu có gì?', 'Giờ mở cửa?', 'Địa chỉ quán?', 'Đặt bàn như thế nào?'];
const GREETING = 'Chào bạn! Mình có thể giúp về menu, giá, giờ mở cửa, địa chỉ và đặt bàn.';
const FAIL = 'Xin lỗi, mình chưa trả lời được lúc này. Bạn gọi quán theo số 0986 187 111 nhé.';

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  // Mỗi tin nhắn: { id, who: 'bot' | 'user', text, pending }
  const [messages, setMessages] = useState([{ id: 0, who: 'bot', text: GREETING }]);

  const nextId = useRef(1);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const toggleRef = useRef(null);

  // Khi mở khung chat thì đưa con trỏ vào ô nhập.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Mỗi khi có tin nhắn mới thì cuộn xuống cuối.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  function close() {
    setOpen(false);
    toggleRef.current?.focus();
  }

  async function send(raw) {
    const text = raw.trim();
    if (!text || busy) return;

    const botId = nextId.current + 1;
    nextId.current += 2;
    setMessages((m) => [...m, { id: botId - 1, who: 'user', text }, { id: botId, who: 'bot', text: 'Đang trả lời...', pending: true }]);
    setInput('');
    setBusy(true);

    let reply = FAIL;
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) reply = (await res.json()).reply || FAIL;
    } catch {
      // giữ câu xin lỗi mặc định
    }

    // Thay tin "Đang trả lời..." bằng câu trả lời thật.
    setMessages((m) => m.map((x) => (x.id === botId ? { ...x, text: reply, pending: false } : x)));
    setBusy(false);
    inputRef.current?.focus();
  }

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="chat-panel"
        onClick={() => (open ? close() : setOpen(true))}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-accent px-5 py-3 font-bold text-on-accent shadow-lg"
      >
        Hỏi quán
      </button>

      {open && (
        <section
          id="chat-panel"
          aria-label="Trò chuyện với quán"
          onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
          className="fixed bottom-[72px] right-4 z-50 flex h-[min(480px,calc(100vh-100px))] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl bg-surface text-text shadow-2xl"
        >
          <div className="flex items-center justify-between bg-header px-4 py-3 text-on-header">
            <strong>Hỏi quán Bạn &amp; Tôi</strong>
            <button type="button" aria-label="Đóng khung trò chuyện" onClick={close} className="px-1 text-lg">✕</button>
          </div>

          <div ref={logRef} role="log" aria-live="polite" className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 ${
                  m.who === 'user' ? 'self-end bg-accent text-on-accent' : 'self-start bg-bg-alt'
                } ${m.pending ? 'opacity-60' : ''}`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 px-3 pb-2">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-full border border-primary px-2.5 py-1 text-sm text-primary"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex gap-2 border-t border-bg-alt p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={300}
              placeholder="Nhập câu hỏi..."
              aria-label="Câu hỏi của bạn"
              className="min-w-0 flex-1 rounded-md border border-muted bg-bg px-2.5 py-2 text-text"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-primary px-4 py-2 font-bold text-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              Gửi
            </button>
          </form>
        </section>
      )}
    </>
  );
}
