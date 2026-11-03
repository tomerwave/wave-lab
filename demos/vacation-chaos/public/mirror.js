document.addEventListener('click', (e) => {
  e.preventDefault();
  if (!e.target.closest('.captcha')) return;
  const key = sessionStorage.getItem('vc_key') ?? '';
  void fetch('/api/presenter/captcha', { method: 'POST', headers: { 'x-presenter-key': key } });
}, true);
