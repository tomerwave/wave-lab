import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toolRequest, fixtureOrigin } from './webmcp.js';

test('WebMCP maps only registered constrained action IDs', () => {
  assert.deepEqual(toolRequest('open_hotel_A'), { name: 'open_hotel', input: { hotelId: 'A' } });
  assert.deepEqual(toolRequest('select_hotel', 'C'), { name: 'select_hotel', input: { hotelId: 'C' } });
  assert.deepEqual(toolRequest('back_to_results'), { name: 'back_to_results', input: {} });
  for (const id of ['pay', 'budget', 'open_hotel_Z', 'open_hotel_A;pay']) assert.throws(() => toolRequest(id));
  assert.throws(() => toolRequest('select_hotel'));
});
test('WebMCP accepts only the fixture or secure loopback origin', () => {
  assert.equal(fixtureOrigin('http://localhost:4173'), 'http://localhost:4173');
  assert.equal(fixtureOrigin('https://vacation-agent-rehearsal.vercel.app'), 'https://vacation-agent-rehearsal.vercel.app');
  for (const url of ['data:text/html,x', 'https://example.com', 'http://vacation-agent-rehearsal.vercel.app', 'http://user:pass@localhost:4173']) assert.throws(() => fixtureOrigin(url));
});
