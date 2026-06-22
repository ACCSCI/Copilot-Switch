/**
 * 健康检查：分两层
 * - shallow: HEAD /v1/models (或等价端点)，仅验证连通性
 * - deep: 真实 chat.completions 调用，验证模型可用
 */
import OpenAI from 'openai';
import type { PingResult } from '@shared/schemas';
import type { ProviderRow } from '../db/schema.sql';
import { decryptSecret } from './crypto';

const TIMEOUT_MS = 8_000;

export interface HealthCheckerOptions {
  /** 仅 ping 接口；不传则用真模型 */
  shallowOnly?: boolean;
  /** 注入 OpenAI 客户端（测试用） */
  clientFactory?: (p: ProviderRow) => OpenAI;
}

function defaultClientFactory(p: ProviderRow): OpenAI {
  const apiKey = p.api_key_encrypted
    ? decryptSecret(p.api_key_encrypted)
    : p.bearer_token_encrypted
      ? decryptSecret(p.bearer_token_encrypted)
      : 'no-key';
  return new OpenAI({
    apiKey,
    baseURL: p.base_url,
    timeout: TIMEOUT_MS,
    defaultHeaders:
      p.type === 'anthropic'
        ? { 'anthropic-version': '2023-06-01' }
        : undefined,
  });
}

/** 深度 ping：实际调用 chat.completions */
export async function pingProvider(
  provider: ProviderRow,
  options: HealthCheckerOptions = {},
): Promise<PingResult> {
  const factory = options.clientFactory ?? defaultClientFactory;
  const client = factory(provider);
  const start = Date.now();
  try {
    if (options.shallowOnly) {
      // 用 models 列表做轻量探测
      const res = await client.models.list();
      return {
        ok: true,
        latencyMs: Date.now() - start,
        model: res.data[0]?.id ?? provider.model,
      };
    }
    const res = await client.chat.completions.create({
      model: provider.model,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 8,
      temperature: 0,
    });
    return {
      ok: true,
      latencyMs: Date.now() - start,
      content: res.choices[0]?.message?.content ?? '',
      model: res.model,
      usage: {
        prompt: res.usage?.prompt_tokens ?? 0,
        completion: res.usage?.completion_tokens ?? 0,
        total: res.usage?.total_tokens ?? 0,
      },
    };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
