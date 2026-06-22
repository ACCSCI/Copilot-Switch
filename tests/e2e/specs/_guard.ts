import { test as base } from '@playwright/test';
import { isStepFunConfigured, stepfunPing } from '../fixtures/stepfun';

/**
 * 真实 API 用例守卫：
 * 1. 没有 STEPFUN_API_KEY 时自动 skip
 * 2. skip 前快速 ping 一次确认 key 有效（避免 silent skip）
 */
export const test = base.extend({});

export const expect = base.expect;

/** 标记需要真实 API 的测试 */
export const realApiTag = '@real-api';

export async function ensureStepFunAvailable(testInfo: { skip: (cond: boolean, reason: string) => void }) {
  if (!isStepFunConfigured) {
    testInfo.skip(true, 'STEPFUN_API_KEY 未配置，跳过真实 API 用例');
    return;
  }
  // 启动时 ping 一次（失败则整体 skip，避免浪费后续）
  const ping = await stepfunPing();
  if (!ping.ok) {
    testInfo.skip(true, `StepFun 不可用：${ping.error}`);
  }
}
