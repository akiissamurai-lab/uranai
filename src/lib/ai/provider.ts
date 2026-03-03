import { createAnthropic } from "@ai-sdk/anthropic";

/**
 * AIプロバイダ。モデルIDは必ず環境変数から読む（ハードコード禁止）。
 */

function getLLMModel(): string {
  const model = process.env.LLM_MODEL;
  if (!model) {
    throw new Error(
      "LLM_MODEL environment variable is required. " +
        "Set a valid Anthropic model ID (see https://docs.anthropic.com/en/docs/about-claude/models).",
    );
  }
  return model;
}

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export function getModel() {
  return anthropic(getLLMModel() as Parameters<typeof anthropic>[0]);
}

export function getModelId(): string {
  return getLLMModel();
}
