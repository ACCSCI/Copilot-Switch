import { z } from 'zod';

/* ───────────── 基础枚举 ───────────── */

export const providerTypeSchema = z.enum(['openai', 'azure', 'anthropic']);
export type ProviderType = z.infer<typeof providerTypeSchema>;

export const wireApiSchema = z.enum(['completions', 'responses']);
export type WireApi = z.infer<typeof wireApiSchema>;

/* ───────────── Provider 输入 ───────────── */

export const providerInputSchema = z
  .object({
    name: z
      .string()
      .min(1, '名称不能为空')
      .max(64, '名称不能超过 64 个字符'),
    type: providerTypeSchema,
    baseUrl: z
      .string()
      .url('Base URL 必须是合法 URL')
      .max(512, 'Base URL 过长'),
    apiKey: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.string().min(1).max(2048).optional(),
    ),
    bearerToken: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.string().min(1).max(4096).optional(),
    ),
    wireApi: wireApiSchema.default('completions'),
    azureApiVersion: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.string().regex(/^\d{4}-\d{2}-\d{2}(|-preview)$/).optional(),
    ),
    model: z
      .string()
      .min(1, '模型名称不能为空')
      .max(128, '模型名称过长'),
    icon: z.string().max(4, '图标最多 4 个字符').optional(),
  })
  .refine(
    (data) => {
      // azure 必须有 apiVersion
      if (data.type === 'azure' && !data.azureApiVersion) return false;
      return true;
    },
    { message: 'Azure 类型必须填写 azureApiVersion', path: ['azureApiVersion'] },
  )
  .refine(
    (data) => {
      // openai / anthropic 至少要有 apiKey 或 bearerToken 之一（Ollama 除外，但 Ollama 也走 openai）
      if (data.type === 'anthropic' && !data.apiKey && !data.bearerToken) return false;
      return true;
    },
    { message: '请填写 API Key 或 Bearer Token', path: ['apiKey'] },
  );

export type ProviderInput = z.infer<typeof providerInputSchema>;

/* ───────────── 环境变量名 ───────────── */

export const envVarNameSchema = z
  .string()
  .regex(/^[A-Z_][A-Z0-9_]*$/, '环境变量名必须是大写字母、数字、下划线，且以字母或下划线开头');

export const envVarMapSchema = z.record(envVarNameSchema, z.string());
export type EnvVarMap = z.infer<typeof envVarMapSchema>;

/* ───────────── 切换操作输入 ───────────── */

export const activateProviderInputSchema = z.object({
  providerId: z.string().min(1),
});
export type ActivateProviderInput = z.infer<typeof activateProviderInputSchema>;

/* ───────────── ping 结果 ───────────── */

export const pingResultSchema = z.object({
  ok: z.boolean(),
  latencyMs: z.number().int().nonnegative(),
  content: z.string().optional(),
  model: z.string().optional(),
  usage: z
    .object({
      prompt: z.number().int().nonnegative(),
      completion: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
    })
    .optional(),
  error: z.string().optional(),
});
export type PingResult = z.infer<typeof pingResultSchema>;

/* ───────────── 环境变量映射表（核心知识） ───────────── */

export const ENV_VAR_MATRIX = {
  openai: {
    keyEnv: 'OPENAI_API_KEY',
    baseUrlEnv: 'OPENAI_BASE_URL',
  },
  azure: {
    keyEnv: 'AZURE_OPENAI_KEY',
    baseUrlEnv: 'AZURE_OPENAI_BASE_URL',
    extraEnv: {
      AZURE_API_VERSION: 'azureApiVersion',
    },
  },
  anthropic: {
    keyEnv: 'ANTHROPIC_API_KEY',
    baseUrlEnv: 'ANTHROPIC_BASE_URL',
  },
} as const;

/** 所有 BYOK 环境变量名（用于切换前清理） */
export const ALL_BYOK_ENV_VARS = [
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'AZURE_OPENAI_KEY',
  'AZURE_OPENAI_BASE_URL',
  'AZURE_API_VERSION',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_BASE_URL',
  'COPILOT_MODEL',
  'COPILOT_WIRE_API',
  'MY_BEARER_TOKEN',
] as const;
