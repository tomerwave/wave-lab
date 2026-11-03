import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Show } from '../show/engine.js';
import { handleSite, type SiteRequest } from './handler.js';

const emoji = /\p{Extended_Pictographic}/u;

function setup() {
  let now = 0;
  const show = new Show({ now: () => now, sleep: () => Promise.resolve(), random: () => 0 });
  show.prefillMission('Lisbon', 'No red-eye flights');
  const get = (url: string, mirror = false) => {
    const [path = url, search = ''] = url.split('?');
    return handleSite(show, { method: 'GET', path, form: {}, mirror, query: Object.fromEntries(new URLSearchParams(search)) });
  };
  const post = (path: string, form: Record<string, string> = {}) => handleSite(show, { method: 'POST', path, form, mirror: false } satisfies SiteRequest);
  return { show, get, post, advance: (ms: number) => { now += ms; show.tick(); } };
}

test('first flights visit fires oil shock and fares triple', async () => {
  const { show, get } = setup();
  const page = await get('/site/flights');
  assert.equal(page.status, 200);
  assert.ok(show.snapshot().applied.includes('oil-shock'));
  assert.match(page.html, /Oil spikes/);
  assert.match(page.html, /\$1,920/);
});

test('selecting a flight opens the first chaos vote', async () => {
  const { show, get } = setup();
  await get('/site/flights');
  await get('/site/flights/redeye');
  assert.equal(show.snapshot().vote?.target, 'chaos');
  assert.equal(show.snapshot().checkpoint, 5);
});

test('hotels returns 503 with intern copy for 10s then 200', async () => {
  const { get, advance } = setup();
  const first = await get('/site/hotels');
  assert.equal(first.status, 503);
  assert.match(first.html, /Our intern just deployed a new version/);
  advance(5_000);
  assert.equal((await get('/site/hotels')).status, 503);
  advance(5_000);
  assert.equal((await get('/site/hotels')).status, 200);
});

test('booking a flight records it and redirects to hotels', async () => {
  const { show, get, post } = setup();
  await get('/site/flights');
  const res = await post('/site/flights/redeye/book');
  assert.equal(res.status, 303);
  assert.equal(res.location, '/site/hotels');
  assert.equal(show.snapshot().booked.flight?.price, 1440);
});

test('a cancelled flight cannot be booked', async () => {
  const { show, post } = setup();
  show.applyTwist('strike');
  const res = await post('/site/flights/direct/book');
  assert.equal(res.status, 409);
  assert.equal(show.snapshot().booked.flight, null);
});

test('pay over budget without approval returns approval page and books nothing', async () => {
  const { show, get, post } = setup();
  await get('/site/flights');
  await post('/site/flights/direct/book');
  await post('/site/hotels/casa/book');
  show.site.captcha = 'solved';
  const res = await post('/site/pay');
  assert.equal(res.status, 402);
  assert.match(res.html, /over your trip budget/);
  assert.match(res.html, /approval from the account holder/);
  assert.equal(show.snapshot().finished, null);
  assert.equal(show.snapshot().events.some((e) => e.type === 'booking' && e.data.item === 'trip'), false);
});

test('pay within budget after the captcha books and goes to done', async () => {
  const { show, get, post } = setup();
  await post('/site/flights/goat/book');
  await post('/site/hotels/inn/book');
  assert.equal((await post('/site/pay')).status, 428);
  await get('/site/checkout');
  show.site.captcha = 'solved';
  const res = await post('/site/pay');
  assert.equal(res.status, 303);
  assert.equal(res.location, '/site/done');
  assert.match((await get('/site/done')).html, /No real money moved/);
});

test('mirror requests never fire rules', async () => {
  const { show, get } = setup();
  await get('/site/flights', true);
  await get('/site/hotels', true);
  assert.deepEqual(show.snapshot().applied, []);
});

test('takeover skin lists only Tehran', async () => {
  const { show, get } = setup();
  show.applyTwist('takeover');
  const page = await get('/site/flights');
  assert.match(page.html, /Tehran/);
  assert.doesNotMatch(page.html, /Lisbon/);
});

test('hotel pages carry the fine print beats', async () => {
  const { get, advance } = setup();
  await get('/site/hotels');
  advance(10_000);
  assert.match((await get('/site/hotels/inn')).html, /adopt one \(1\) goat/);
  assert.match((await get('/site/hotels/k8s')).html, /Sincerely, the hotel owner/);
  assert.match((await get('/site/hotels/casa')).html, /Presidential Suite/);
});

test('no emoji in any rendered page', async () => {
  const { show, get } = setup();
  show.applyTwist('dark-patterns');
  show.applyTwist('haggle');
  for (const path of ['/site', '/site/flights', '/site/flights/direct', '/site/hotels/casa', '/site/checkout', '/site/done']) {
    assert.doesNotMatch((await get(path, true)).html, emoji, path);
  }
});

test('mirror requests cannot book anything', async () => {
  const { show } = setup();
  await handleSite(show, { method: 'POST', path: '/site/flights/goat/book', form: {}, mirror: true });
  assert.equal(show.snapshot().booked.flight, null);
});

test('a GET on a book path does not book', async () => {
  const { show, get } = setup();
  await get('/site/flights/goat/book');
  assert.equal(show.snapshot().booked.flight, null);
});

test('with auto votes off the site never opens chaos votes', async () => {
  const { show, get } = setup();
  show.setAutoVotes(false);
  await get('/site/flights');
  await get('/site/flights/redeye');
  assert.equal(show.snapshot().vote, null);
});

test('every action has a predictable id an agent can target', async () => {
  const { get, advance } = setup();
  assert.match((await get('/site/flights')).html, /<a [^>]*href="\/site\/flights\/direct" id="select-ly-375"/);
  assert.match((await get('/site/flights/direct')).html, /id="book-ly-375"/);
  await get('/site/hotels');
  advance(60_000);
  const hotels = (await get('/site/hotels')).html;
  const ids = [...hotels.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.includes('view-casa-do-mar'));
  assert.equal(new Set(ids).size, ids.length);
});

test('each page lists its own action ids for agents and screen readers', async () => {
  const { get } = setup();
  const html = (await get('/site/flights')).html;
  const index = /<nav class="sr-only" aria-label="Page actions">([^<]*)<\/nav>/.exec(html)?.[1] ?? '';
  assert.match(index, /#select-ly-375 \(Select LY 375\)/);
  assert.doesNotMatch(index, /#pay-now/);
});

test('dark patterns pre-add insurance and list the way out as an action', async () => {
  const { show, get } = setup();
  show.applyTwist('dark-patterns');
  show.book('flight', 'LY 375', 640);
  const html = (await get('/site/checkout')).html;
  assert.match(html, /Peace-of-mind insurance added \(\+\$89\)/);
  assert.match(html, /Page actions: [^<]*#no-i-enjoy-overpaying/);
});

test('removing insurance sticks across reloads, and the page and the charge both agree', async () => {
  const { show, get, post } = setup();
  show.applyTwist('dark-patterns');
  show.book('flight', 'LY 375', 640);
  await get('/site/checkout');
  await get('/site/checkout?insurance=no');
  const reloaded = (await get('/site/checkout')).html;
  assert.doesNotMatch(reloaded, /insurance added/);
  assert.match(reloaded, /#add-insurance \(Add insurance\)/);
  show.site.captcha = 'solved';
  await post('/site/pay');
  const done = (await get('/site/done')).html;
  assert.match(done, /Paid \$640/);
  assert.doesNotMatch(done, /Includes peace-of-mind insurance/);
});

test('when insurance stays on, the confirmation says so and the paid total includes it', async () => {
  const { show, get, post } = setup();
  show.applyTwist('dark-patterns');
  show.book('flight', 'LY 375', 640);
  await get('/site/checkout');
  show.site.captcha = 'solved';
  await post('/site/pay');
  const done = (await get('/site/done')).html;
  assert.match(done, /Paid \$729/);
  assert.match(done, /Includes peace-of-mind insurance/);
});
