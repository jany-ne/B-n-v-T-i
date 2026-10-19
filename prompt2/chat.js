(function () {
  // Chatbot hỏi đáp: gọi Edge Function "chat" trên Supabase.
  if (!window.SUPABASE_URL) return;

  const QUICK = ['Menu có gì?', 'Giờ mở cửa?', 'Địa chỉ quán?', 'Đặt bàn như thế nào?'];
  const MAX = 300;

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  const toggle = el('button', 'chat-toggle', 'Hỏi quán');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'chat-panel');

  const panel = el('section', 'chat-panel');
  panel.id = 'chat-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Trò chuyện với quán');

  const head = el('div', 'chat-head');
  head.appendChild(el('strong', null, 'Hỏi quán Bạn & Tôi'));
  const close = el('button', 'chat-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Đóng khung trò chuyện');
  head.appendChild(close);

  const log = el('div', 'chat-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');

  const quick = el('div', 'chat-quick');
  QUICK.forEach(function (q) {
    const b = el('button', 'chat-chip', q);
    b.type = 'button';
    b.addEventListener('click', function () { send(q); });
    quick.appendChild(b);
  });

  const form = el('form', 'chat-form');
  const input = el('input');
  input.type = 'text';
  input.maxLength = MAX;
  input.placeholder = 'Nhập câu hỏi...';
  input.setAttribute('aria-label', 'Câu hỏi của bạn');
  const submit = el('button', 'chat-send', 'Gửi');
  submit.type = 'submit';
  form.append(input, submit);

  panel.append(head, log, quick, form);
  document.body.append(toggle, panel);

  function add(text, who) {
    const m = el('div', 'chat-msg chat-' + who, text);
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      if (!log.children.length) add('Chào bạn! Mình có thể giúp về menu, giá, giờ mở cửa, địa chỉ và đặt bàn.', 'bot');
      input.focus();
    } else {
      toggle.focus();
    }
  }

  toggle.addEventListener('click', function () { setOpen(panel.hidden); });
  close.addEventListener('click', function () { setOpen(false); });
  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
  });

  let busy = false;

  function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    submit.disabled = true;
    add(text, 'user');
    input.value = '';
    const typing = add('Đang trả lời...', 'bot chat-typing');

    fetch(window.SUPABASE_URL + '/functions/v1/chat', {
      method: 'POST',
      headers: {
        'apikey': window.SUPABASE_KEY,
        'Authorization': 'Bearer ' + window.SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: text })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) { typing.textContent = data.reply; typing.classList.remove('chat-typing'); })
      .catch(function () {
        typing.textContent = 'Xin lỗi, mình chưa trả lời được lúc này. Bạn gọi quán theo số 0986 187 111 nhé.';
        typing.classList.remove('chat-typing');
      })
      .finally(function () {
        busy = false;
        submit.disabled = false;
        log.scrollTop = log.scrollHeight;
        input.focus();
      });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    send(input.value);
  });
})();
