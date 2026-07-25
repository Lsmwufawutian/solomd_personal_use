/**
 * PlantUML support (v4.10, issue #163).
 *
 * PlantUML has no viable in-browser renderer (it's a Java program; the WASM
 * ports are tens of MB), so — like every editor that supports it — we encode
 * the diagram source into a URL and let a PlantUML server render the SVG.
 * That sends note content to whatever server is configured, which is why the
 * feature is OPT-IN and defaults off (`plantumlEnabled`), and why the server
 * URL is a setting: point it at a self-hosted `plantuml/plantuml-server`
 * docker to keep everything on your own network.
 *
 * Display is a plain `<img src>` — no fetch, so no CORS involvement, and the
 * webview's HTTP cache dedupes repeat renders of the same diagram.
 *
 * Encoding: raw DEFLATE (level 9) of the UTF-8 source, then base64 with
 * PlantUML's own alphabet (`0-9A-Z a-z - _`, 3 bytes → 4 chars). Reference:
 * https://plantuml.com/text-encoding
 */

import { deflateSync, strToU8 } from 'fflate';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

function append3bytes(b1: number, b2: number, b3: number): string {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3f;
  return ALPHABET[c1 & 0x3f] + ALPHABET[c2 & 0x3f] + ALPHABET[c3 & 0x3f] + ALPHABET[c4 & 0x3f];
}

/** Deflate + PlantUML-base64 a diagram source for use in a server URL. */
export function encodePlantUml(source: string): string {
  const deflated = deflateSync(strToU8(source), { level: 9 });
  let out = '';
  for (let i = 0; i < deflated.length; i += 3) {
    out += append3bytes(deflated[i], deflated[i + 1] ?? 0, deflated[i + 2] ?? 0);
  }
  return out;
}

/** Build the SVG render URL for `source` against `server` (trailing slashes ok). */
export function plantumlSvgUrl(server: string, source: string): string {
  const base = (server || '').trim().replace(/\/+$/, '');
  return `${base}/svg/${encodePlantUml(source)}`;
}

/** Is this fence info-string a PlantUML block? (`plantuml` / `puml`) */
export function isPlantumlLang(lang: string): boolean {
  const l = (lang || '').trim().toLowerCase();
  return l === 'plantuml' || l === 'puml';
}
