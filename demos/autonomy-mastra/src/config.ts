export function loadLiveConfig(): { model: `${string}/${string}` } {
  const model = process.env.MODEL;
  if (!model || !/^[^/]+\/.+$/.test(model)) {
    throw new Error('Set MODEL=provider/model and the provider API key. Use investigate for offline replay.');
  }
  return { model: model as `${string}/${string}` };
}
