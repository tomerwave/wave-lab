import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkKey } from './config.js';

test('a short presenter key is refused on a public URL', () => {
  assert.throws(() => checkKey('demo', 'https://x.trycloudflare.com'), /16 characters/);
  assert.doesNotThrow(() => checkKey('demo', 'http://localhost:4545'));
  assert.doesNotThrow(() => checkKey('a'.repeat(16), 'https://x.trycloudflare.com'));
});
