import OpenAI from 'openai';

export const STEPFUN_BASE_URL = process.env.STEPFUN_BASE_URL ?? 'https://api.stepfun.com/step_plan/v1';
export const STEPFUN_MODEL = process.env.STEPFUN_MODEL ?? 'step-3.7-flash';
export const STEPFUN_API_KEY = process.env.STEPFUN_API_KEY ?? '';

export const isStepFunConfigured = STEPFUN_API_KEY.length > 0;

let _client: OpenAI | null = null;
export function getStepFunClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: STEPFUN_API_KEY,
      baseURL: STEPFUN_BASE_URL,
    });
  }
  return _client;
}

export interface PingResult {
  ok: boolean;
  latencyMs: number;
  content?: string;
  model?: string;
  usage?: { prompt: number; completion: number; total: number };
  error?: string;
}

/** 轻量 ping，请求小、便宜，用于 E2E 频繁调用 */
export async function stepfunPing(): Promise<PingResult> {
  const start = Date.now();
  try {
    const res = await getStepFunClient().chat.completions.create(
      {
        model: STEPFUN_MODEL,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 8,
        temperature: 0,
      },
      { timeout: 10_000 },
    );
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
    return { ok: false, latencyMs: Date.now() - start, error: String(e) };
  }
}

export const stepfunFixture = {
  name: 'StepFun (E2E)',
  type: 'openai' as const,
  baseUrl: STEPFUN_BASE_URL,
  apiKey: STEPFUN_API_KEY,
  wireApi: 'completions' as const,
  model: STEPFUN_MODEL,
  icon: '🌟',
};
