document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-label]');
  if (!target) return;
  navigator.sendBeacon('/api/beacon', new Blob([JSON.stringify({ label: target.dataset.label })], { type: 'application/json' }));
}, true);
