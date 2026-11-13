// Type declarations for the framework-agnostic server-side LLM proxy (scripts/llm-proxy.mjs).
// vite.config.ts imports these two functions; TS under `strict` needs the .mjs side typed.
export interface LlmServerConfig {
  key: string;
  baseUrl: string;
  model: string;
}

export interface LlmProxyResponse {
  status: number;
  body: { ok: boolean; text?: string; model?: string; error?: string; usage?: unknown; cached?: boolean };
  headers: Record<string, string>;
}

export const PROXY_ROUTE: string;
export const CACHE_PROBE_ROUTE: string;
export const PROMPT_CACHE_KEY: string;
export const LLM_CACHE_POLICY: { enabled: boolean; ttlSeconds: number; jitterSeconds: number; capacity: number; seed: string };

export function hashString(input: string): number;
export function makeRng(seed: number | string): () => number;
export function expiryWithJitter(key: string, now: number, ttl: number, jitter: number, seed: string): number;
export function cacheKey(model: string, messages: unknown[]): string;
export function createLlmCache(policy?: typeof LLM_CACHE_POLICY): unknown;
export function llmCacheStats(cache: unknown): { hits: number; misses: number; coalesced: number; evictions: number; expired: number; stores: number; size: number };
export function cachePingHandler(cache: unknown): { status: number; body: unknown; headers: Record<string, string> };
export function cachePingMiddleware(cache: unknown): LlmMiddleware;

export function normaliseBase(raw: string): string;

export function handleLlmRequest(cfg: Partial<LlmServerConfig> | null, requestBody: unknown): Promise<LlmProxyResponse>;

export function serverConfig(env?: Record<string, string | undefined>): LlmServerConfig;

export type LlmMiddleware = (req: any, res: any, next?: () => void) => Promise<void>;

export function llmProxyMiddleware(configFor?: () => LlmServerConfig, cache?: unknown): LlmMiddleware;
