import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agentEnvironment, checkKey, loadConfig } from './config.js';

test('a short presenter key is refused on a public URL', () => {
  assert.throws(() => checkKey('demo', 'https://x.trycloudflare.com'), /16 characters/);
  assert.doesNotThrow(() => checkKey('demo', 'http://localhost:4545'));
  assert.doesNotThrow(() => checkKey('a'.repeat(16), 'https://x.trycloudflare.com'));
});

test('the Jev key stays on the server and is never passed to the agent', () => {
  const env = { TYPESAFE_API_KEY: 'test-only-placeholder', PATH: '/bin' };
  const config = loadConfig(env);
  assert.equal(config.jevKey, 'test-only-placeholder');
  const agent = agentEnvironment(config, 'http://localhost', env);
  assert.equal(agent.TYPESAFE_API_KEY, undefined);
  assert.equal(agent.PATH, '/bin');
});
