// Type declarations for the framework-agnostic server-side LLM proxy (scripts/llm-proxy.mjs).
// vite.config.ts imports these two functions; TS under `strict` needs the .mjs side typed.
export interface LlmServerConfig {
  key: string;
  baseUrl: string;
  model: string;
}

export interface LlmProxyResponse {
  status: number;
  body: { ok: boolean; text?: string; model?: string; error?: string };
  headers: Record<string, string>;
}

export const PROXY_ROUTE: string;

export function normaliseBase(raw: string): string;

export function handleLlmRequest(cfg: Partial<LlmServerConfig> | null, requestBody: unknown): Promise<LlmProxyResponse>;

export function serverConfig(env?: Record<string, string | undefined>): LlmServerConfig;

export type LlmMiddleware = (req: any, res: any, next?: () => void) => Promise<void>;

export function llmProxyMiddleware(configFor?: () => LlmServerConfig): LlmMiddleware;
