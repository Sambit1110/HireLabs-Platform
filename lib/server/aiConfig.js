// Server-only AI settings. Every model is the team's own; there is no external AI provider.

const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function getAiConfig() {
  return {
    // USE_LOCAL_MODELS=true connects the app to the model server and Ollama.
    localModels: process.env.USE_LOCAL_MODELS === 'true',
    evaluatorModel: process.env.OLLAMA_MODEL || 'hirelabs-evaluator',
    // Emergency kill switch: AI_FEATURES_ENABLED=false turns every AI call off.
    enabled: (process.env.AI_FEATURES_ENABLED ?? 'true').toLowerCase() !== 'false',
    userDailyLimit: positiveInt(process.env.AI_USER_DAILY_LIMIT, 50),
    globalDailyLimit: positiveInt(process.env.AI_GLOBAL_DAILY_LIMIT, 1000),
  };
}
