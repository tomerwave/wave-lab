const NOISE = /<(head|style|script|svg|noscript|footer)\b[\s\S]*?<\/\1>/gi;
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
export const MAX_DIGEST = 6000;

export function pageDigest(html: string): string {
  return html
    .replace(NOISE, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DIGEST);
}
