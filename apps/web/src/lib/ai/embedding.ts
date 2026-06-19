/**
 * Deterministic, offline embeddings — a faithful TypeScript port of the backend
 * `app/ai/embedding.py`. The embedding is a hashed bag-of-tokens projection
 * (blake2b, 8-byte digest), so the same text yields the *same* vector as the
 * Python backend (verified byte-for-byte). No model or API key required.
 */
import { blake2b } from "@noble/hashes/blake2.js";

export const EMBEDDING_DIM = 256;

const ASCII_WORD = /[a-z0-9][a-z0-9+#.]*/gi;
const CJK = /[\u4e00-\u9fff]/g;
const encoder = new TextEncoder();

/**
 * Tokenise mixed Chinese/English text into lowercase ASCII words plus single
 * CJK characters and CJK bigrams, so Chinese phrases overlap meaningfully
 * without a segmentation dependency.
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  const lowered = text.toLowerCase();
  const tokens: string[] = [];
  for (const match of lowered.matchAll(ASCII_WORD)) tokens.push(match[0]);
  const cjkChars = text.match(CJK) ?? [];
  for (const ch of cjkChars) tokens.push(ch);
  for (let i = 0; i + 1 < cjkChars.length; i += 1) tokens.push(cjkChars[i] + cjkChars[i + 1]);
  return tokens;
}

function bucket(token: string): readonly [index: number, sign: number] {
  const digest = blake2b(encoder.encode(token), { dkLen: 8 });
  let value = 0n;
  for (const byte of digest) value = (value << 8n) | BigInt(byte);
  const index = Number(value % BigInt(EMBEDDING_DIM));
  const sign = ((value >> 8n) & 1n) === 1n ? 1 : -1;
  return [index, sign];
}

/** Return a stable, L2-normalised embedding for `text`. */
export function deterministicEmbedding(text: string, dim = EMBEDDING_DIM): number[] {
  const vec = new Array<number>(dim).fill(0);
  for (const token of tokenize(text)) {
    const [index, sign] = bucket(token);
    vec[index % dim] += sign;
  }
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

/** Cosine similarity of two equal-length vectors, clamped to [0, 1]. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  const raw = dot / (Math.sqrt(na) * Math.sqrt(nb));
  return Math.max(0, Math.min(1, raw));
}
