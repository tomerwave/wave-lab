import type { HotelFacts } from './policy.js';

export type Page = 'results' | 'hotel_details' | 'checkout' | 'unknown';

export type PageState = {
  page: Page;
  listed: HotelFacts[];
  hotel?: HotelFacts & { available: boolean };
  enabledButtons: string[];
};

type Element = { tag: string; attrs: Record<string, string> };

const SECTION = /<section\b([^>]*)>([\s\S]*?)<\/section>/g;
const TAG = /<([a-z][a-z0-9]*)\b([^>]*)>/g;
const ATTR = /([a-z][a-z0-9-]*)(?:="([^"]*)")?/g;

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const [, name, value] of source.matchAll(ATTR)) attrs[name] = value ?? '';
  return attrs;
}

function visibleSection(html: string): { attrs: Record<string, string>; body: string } | undefined {
  for (const [, attrs, body] of html.matchAll(SECTION)) {
    const parsed = parseAttrs(attrs);
    if (!('hidden' in parsed)) return { attrs: parsed, body };
  }
  return undefined;
}

function elements(body: string): Element[] {
  return [...body.matchAll(TAG)].map(([, tag, attrs]) => ({ tag, attrs: parseAttrs(attrs) }));
}

function price(value: string | undefined): number {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : Number.NaN;
}

function facts(attrs: Record<string, string>): HotelFacts {
  return { id: attrs['data-hotel'], totalEur: price(attrs['data-total-eur']), accessible: attrs['data-accessible'] === 'true' };
}

function toPage(value: string | undefined): Page {
  return value === 'results' || value === 'hotel_details' || value === 'checkout' ? value : 'unknown';
}

export function parsePageState(html: string): PageState {
  const section = visibleSection(html);
  if (!section) return { page: 'unknown', listed: [], enabledButtons: [] };
  const all = elements(section.body);
  const withTestId = (id: string) => all.find(element => element.attrs['data-testid'] === id);
  const details = withTestId('hotel-details') ?? withTestId('checkout');
  return {
    page: toPage(section.attrs['data-page']),
    listed: all.filter(element => element.attrs['data-testid'] === 'hotel-card').map(element => facts(element.attrs)),
    hotel: details ? { ...facts(details.attrs), available: details.attrs['data-available'] === 'true' } : undefined,
    enabledButtons: all.filter(element => element.tag === 'button' && !('disabled' in element.attrs)).map(element => element.attrs['data-testid']),
  };
}
