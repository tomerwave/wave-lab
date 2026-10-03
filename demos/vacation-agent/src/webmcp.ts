export type Interaction = 'dom' | 'webmcp';
export type ToolRequest = { name: string; input: Record<string, string> };

export function fixtureOrigin(value: string): string {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const publicFixture = url.origin === 'https://vacation-agent-rehearsal.vercel.app';
  const valid = publicFixture || (local && ['http:', 'https:'].includes(url.protocol));
  if (url.username || url.password || !valid) throw new Error('WebMCP requires the fixture HTTPS or localhost URL');
  return url.origin;
}
export function toolRequest(id: string, hotelId?: string): ToolRequest {
  const hotel = /^open_hotel_([ABC])$/.exec(id)?.[1];
  if (hotel) return { name: 'open_hotel', input: { hotelId: hotel } };
  if (id === 'back_to_results') return { name: id, input: {} };
  if (id === 'select_hotel' && hotelId && /^[ABC]$/.test(hotelId)) return { name: id, input: { hotelId } };
  throw new Error('Unsupported WebMCP action');
}

type NativeTool = { name: string; origin: string; window: Window };
type NativeContext = { getTools(): Promise<NativeTool[]>; executeTool(tool: NativeTool, input: unknown, options?: { signal: AbortSignal }): Promise<unknown> };
export type ToolInvocation = { origin: string; request: ToolRequest; stringArguments: boolean; timeoutMs?: number };

export async function invokeInPage({ origin, request, stringArguments, timeoutMs = 5000 }: ToolInvocation): Promise<void> {
  if (![window.isSecureContext, location.origin === origin].every(Boolean)) throw new Error('WebMCP fixture origin mismatch');
  const context = (() => {
    const native = (document as Document & { modelContext?: NativeContext }).modelContext;
    if (!native) throw new Error('Native document.modelContext unavailable');
    if (![typeof native.getTools, typeof native.executeTool].every(value => value === 'function')) throw new Error('Native document.modelContext discovery/execution unavailable');
  if (!['open_hotel', 'select_hotel', 'back_to_results'].includes(request.name)) throw new Error('Unsupported WebMCP tool');
    return native;
  })();
  const signal = AbortSignal.timeout(timeoutMs);
  const cancelled = new Promise<never>((_resolve, reject) => { signal.addEventListener('abort', () => reject(new Error('WebMCP execution timeout')), { once: true }); });
  const tools = await Promise.race([context.getTools(), cancelled]);
  signal.throwIfAborted();
  const tool = tools.find(item => item.name === request.name && item.origin === origin && item.window === window);
  if (!tool) throw new Error(`WebMCP tool unavailable: ${request.name}`);
  const input = stringArguments ? JSON.stringify(request.input) : request.input;
  const pending = context.executeTool(tool, input, { signal });
  const result = await Promise.race([pending, cancelled]);
  const expected: Record<string, string> = { open_hotel: `Opened hotel ${request.input.hotelId}`, select_hotel: `Selected fictional hotel ${request.input.hotelId}; no payment`, back_to_results: 'Returned to results' };
  if (result !== expected[request.name]) throw new Error('WebMCP tool returned unsuccessful result');
}
