const KEY = 'vc_key';

function keyFromLink(): void {
  const key = new URLSearchParams(location.hash.slice(1)).get('key');
  if (!key) return;
  sessionStorage.setItem(KEY, key);
  history.replaceState(null, '', location.pathname);
}

keyFromLink();

export const isPresenter = Boolean(sessionStorage.getItem(KEY));

export async function act(action: string, body: Record<string, unknown> = {}): Promise<void> {
  const res = await fetch(`/api/presenter/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-presenter-key': sessionStorage.getItem(KEY) ?? '' },
    body: JSON.stringify(body),
  });
  if (res.status === 401) sessionStorage.removeItem(KEY);
}

export async function start(runtime: string): Promise<void> {
  await act('pace', { pace: 'story' });
  await act('start-live', { runtime });
}

export async function humanCheckDone(): Promise<void> {
  await act('captcha');
  await act('answer', { text: 'Done, I solved the human check.', approve: false });
}
