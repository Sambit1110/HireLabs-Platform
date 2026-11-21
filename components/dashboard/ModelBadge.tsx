import type { ModelInfo } from "@/lib/ai/model-info";

/**
 * Shows which model produced a result: green for HireLabs' own models,
 * grey for the Gemini fallback.
 */
export default function ModelBadge({ model }: { model: ModelInfo }) {
  return (
    <span
      className={`model-badge model-badge--${model.kind}`}
      title={model.id ? `Model: ${model.id}` : "The API did not report a model"}
    >
      <span className="model-badge__dot" aria-hidden="true" />
      {model.label}
      {model.id && model.kind !== "unknown" && (
        <code>{model.id}</code>
      )}
    </span>
  );
}
