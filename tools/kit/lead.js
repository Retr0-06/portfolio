/*
  LeadKit — sends a lead from any tool (calculator, quiz, booking form)
  to the client's Google Sheet and Telegram, via a Google Apps Script web app.

  Per client, set the endpoint before this script runs:
    <script>window.LEADKIT_ENDPOINT = "https://script.google.com/macros/s/XXXX/exec";</script>
  With no endpoint the page runs in demo mode and shows how the
  Telegram notification will look, without sending anything.
*/
(function () {
  const css = `
  .lk-preview{margin-top:16px;border-radius:14px;padding:14px;background:#C9D9E6;font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0F1419;animation:lk-in .35s ease-out}
  .lk-preview p{margin:0 0 8px;font-size:13px;color:#36516A}
  .lk-bubble{background:#fff;border-radius:12px 12px 12px 4px;padding:10px 12px;max-width:340px;box-shadow:0 1px 1px rgba(0,0,0,.08);white-space:pre-line}
  .lk-bubble b{display:block;color:#2A7AB8;margin-bottom:4px}
  .lk-bubble time{display:block;text-align:right;font-size:12px;color:#8A98A5;margin-top:4px}
  @media (prefers-color-scheme:dark){.lk-preview{background:#16222E;color:#E6EDF3}.lk-preview p{color:#8FA9C2}.lk-bubble{background:#22303E;box-shadow:none}.lk-bubble b{color:#6AB2F2}}
  @keyframes lk-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce){.lk-preview{animation:none}}`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function format(tool, fields) {
    const lines = Object.entries(fields)
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${k}: ${v}`);
    return `🔔 Нова заявка · ${tool}\n` + lines.join('\n');
  }

  function preview(container, text) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const box = document.createElement('div');
    box.className = 'lk-preview';
    box.setAttribute('role', 'status');
    const note = document.createElement('p');
    note.textContent = 'Демо: так ця заявка прийде власнику в Telegram і додасться рядком у Google Таблицю.';
    const bubble = document.createElement('div');
    bubble.className = 'lk-bubble';
    const head = document.createElement('b');
    head.textContent = 'Заявки з сайту (бот)';
    const body = document.createElement('span');
    body.textContent = text;
    const time = document.createElement('time');
    time.textContent = `${hh}:${mm}`;
    bubble.append(head, body, time);
    box.append(note, bubble);
    container.replaceChildren(box);
  }

  async function send(tool, fields, previewContainer) {
    const text = format(tool, fields);
    const endpoint = window.LEADKIT_ENDPOINT || '';
    if (!endpoint) {
      if (previewContainer) preview(previewContainer, text);
      return { demo: true };
    }
    // text/plain avoids a CORS preflight; Apps Script reads e.postData.contents
    await fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tool, fields, page: location.href, text })
    });
    return { demo: false };
  }

  window.LeadKit = { send, format, preview };
})();
