type Input = Record<string, unknown>;
type PageTool = { name: string; description: string; inputSchema: object; execute(input: Input): string };
type Registration = { registerTool(tool: PageTool): Promise<void> | void };

export function installPageActions(register: typeof registerPageTools): void {
  const visible = () => document.querySelector<HTMLElement>('section[data-view]:not([hidden])');
  const show = (target: string) => {
    for (const view of document.querySelectorAll<HTMLElement>('section[data-view]')) view.hidden = view.dataset.view !== target;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const hotelInput = (input: Input): string => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid hotel input');
    if (Object.keys(input).length !== 1 || typeof input.hotelId !== 'string' || !/^[ABC]$/.test(input.hotelId)) throw new Error('Invalid hotel input');
    return input.hotelId;
  };
  const perform = (name: string, input: Input): string => {
    const page = visible();
    if (!page) throw new Error('Missing current view');
    if (name === 'open_hotel') return openHotel(page, hotelInput(input));
    if (name === 'select_hotel') return selectHotel(page, hotelInput(input));
    return returnToResults(page, name, input);
  };
  const returnToResults = (page: HTMLElement, name: string, input: Input): string => {
    const objectInput = input && typeof input === 'object' && !Array.isArray(input);
    if (!objectInput) throw new Error('Invalid return input');
    if (name !== 'back_to_results' || Object.keys(input).length || !['hotel_details', 'checkout'].includes(page.dataset.page ?? '')) throw new Error('Action unavailable on this view');
    show('results');
    return 'Returned to results';
  };
  const openHotel = (page: HTMLElement, id: string): string => {
    if (page.dataset.page !== 'results' || !page.querySelector(`[data-testid="open-hotel-${id}"]`)) throw new Error('Hotel unavailable on this view');
    show(`details-${id}`);
    return `Opened hotel ${id}`;
  };
  const selectHotel = (page: HTMLElement, id: string): string => {
    const facts = page.querySelector<HTMLElement>('[data-testid="hotel-details"]');
    const button = page.querySelector<HTMLButtonElement>('[data-testid="select-hotel"]');
    if (page.dataset.page !== 'hotel_details' || facts?.dataset.hotel !== id) throw new Error('Wrong hotel or view');
    if (facts.dataset.available !== 'true' || !button || button.disabled) throw new Error('Hotel unavailable on this view');
    show(`checkout-${id}`);
    return `Selected fictional hotel ${id}; no payment`;
  };
  document.addEventListener('click', event => {
    const button = (event.target as Element)?.closest<HTMLButtonElement>('button[data-show]');
    if (!button || button.disabled) return;
    const target = button.dataset.show ?? '';
    const names: Record<string, string> = { results: 'back_to_results', details: 'open_hotel', checkout: 'select_hotel' };
    const name = names[target.split('-')[0]];
    try { perform(name, target === 'results' ? {} : { hotelId: target.split('-')[1] }); } catch { return; }
  });
  register(perform);
}

export function registerPageTools(perform: (name: string, input: Input) => string): void {
  const context = (document as Document & { modelContext?: Registration }).modelContext;
  if (!context?.registerTool) return;
  const hotelSchema = { type: 'object', properties: { hotelId: { type: 'string', enum: ['A', 'B', 'C'] } }, required: ['hotelId'], additionalProperties: false };
  const tools = [
    { name: 'open_hotel', description: 'Open a fictional hotel from results', inputSchema: hotelSchema },
    { name: 'select_hotel', description: 'Select the currently visible available fictional hotel; stops before payment', inputSchema: hotelSchema },
    { name: 'back_to_results', description: 'Return from details or checkout to results', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  ];
  const recordFailure = () => { document.documentElement.dataset.webmcp = 'registration_failed'; };
  for (const tool of tools) Promise.resolve(context.registerTool({ ...tool, execute: perform.bind(undefined, tool.name) })).catch(recordFailure);
}
