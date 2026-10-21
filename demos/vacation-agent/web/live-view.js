export class StageLiveView {
  constructor(dcv, deps) { this.dcv = dcv; this.deps = deps; this.epoch = 0; }
  valid(epoch) { return epoch === this.epoch && this.deps.runId() === this.runId; }
  disconnect() { this.epoch++; this.connection?.disconnect(); this.connection = undefined; clearTimeout(this.timer); this.deps.clear(); }
  fail(epoch) {
    if (!this.valid(epoch)) return;
    this.deps.failed(this.runId); this.disconnect();
  }
  async connect(runId) {
    this.disconnect(); this.runId = runId; const epoch = this.epoch;
    try {
      const { signedUrl } = await this.deps.url();
      if (!this.valid(epoch)) return;
      this.timer = setTimeout(() => this.fail(epoch), 25000);
      this.authenticate(epoch, signedUrl);
    } catch { this.fail(epoch); }
  }
  authenticate(epoch, signedUrl) {
    this.dcv.authenticate(signedUrl, {
      httpExtraSearchParams: () => new URL(signedUrl).searchParams,
      promptCredentials: () => this.fail(epoch), error: () => this.fail(epoch),
      success: (_auth, sessions) => { void this.open(epoch, signedUrl, sessions); },
    });
  }
  async open(epoch, signedUrl, sessions) {
    if (!this.valid(epoch)) return;
    try {
      const connection = await this.dcv.connect({ url: signedUrl, sessionId: sessions[0].sessionId, authToken: sessions[0].authToken, divId: 'display', baseUrl: '/dcv', enabledChannels: ['display'], observers: this.observers(epoch, signedUrl) });
      if (!this.valid(epoch)) { connection.disconnect(); return; }
      this.connection = connection; this.deps.resize();
    } catch { this.fail(epoch); }
  }
  observers(epoch, signedUrl) {
    return {
      httpExtraSearchParams: () => new URL(signedUrl).searchParams,
      disconnect: () => this.fail(epoch),
      firstFrame: () => {
        if (!this.valid(epoch)) return;
        clearTimeout(this.timer); this.deps.ready(this.runId);
      },
    };
  }
}
