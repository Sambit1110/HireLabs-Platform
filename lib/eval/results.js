/**
 * Validate and format the model-comparison results file
 * (public/model-results.json, written by scripts/eval/run_all.py).
 * The format is documented in docs/results/RESULTS_FORMAT.md.
 */

const SYSTEM_KINDS = new Set(['baseline', 'gemini', 'ours']);
const UNITS = new Set(['ratio', 'percent', 'points', 'seconds']);

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function count(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeMetric(metric) {
  if (!isRecord(metric) || !text(metric.key)) return null;

  return {
    key: text(metric.key),
    label: text(metric.label, text(metric.key)),
    description: text(metric.description),
    higherIsBetter: metric.higher_is_better !== false,
    unit: UNITS.has(metric.unit) ? metric.unit : 'ratio',
  };
}

function normalizeSystem(system, metricKeys) {
  if (!isRecord(system) || !text(system.name)) return null;

  const values = isRecord(system.values) ? system.values : {};

  return {
    name: text(system.name),
    kind: SYSTEM_KINDS.has(system.kind) ? system.kind : 'baseline',
    values: Object.fromEntries(metricKeys.map((key) => [key, number(values[key])])),
  };
}

function normalizeTask(task) {
  if (!isRecord(task) || !text(task.title)) return null;

  const metrics = (Array.isArray(task.metrics) ? task.metrics : [])
    .map(normalizeMetric)
    .filter(Boolean);
  const metricKeys = metrics.map((metric) => metric.key);
  const systems = (Array.isArray(task.systems) ? task.systems : [])
    .map((system) => normalizeSystem(system, metricKeys))
    .filter(Boolean);

  if (metrics.length === 0 || systems.length === 0) return null;

  return {
    id: text(task.id, text(task.title)),
    title: text(task.title),
    description: text(task.description),
    metrics,
    systems,
  };
}

function normalizeBias(bias) {
  if (!isRecord(bias) || !Array.isArray(bias.systems)) return null;

  const systems = bias.systems
    .filter((system) => isRecord(system) && text(system.name))
    .map((system) => ({
      name: text(system.name),
      kind: SYSTEM_KINDS.has(system.kind) ? system.kind : 'baseline',
      meanAbsDelta: number(system.mean_abs_delta),
      maxAbsDelta: number(system.max_abs_delta),
      verdictFlips: count(system.verdict_flips),
    }));

  if (systems.length === 0) return null;

  return {
    description: text(bias.description),
    variants: count(bias.variants),
    systems,
  };
}

/**
 * @param {unknown} json
 * @returns {{ ok: true, results: any } | { ok: false, error: string }}
 */
export function normalizeResults(json) {
  if (!isRecord(json)) {
    return { ok: false, error: 'The results file is not a JSON object.' };
  }

  const tasks = (Array.isArray(json.tasks) ? json.tasks : [])
    .map(normalizeTask)
    .filter(Boolean);

  if (tasks.length === 0) {
    return { ok: false, error: 'The results file has no tasks with metrics and systems.' };
  }

  const testSet = isRecord(json.test_set) ? json.test_set : {};

  return {
    ok: true,
    results: {
      sample: json.sample === true,
      generatedAt: text(json.generated_at),
      testSet: {
        description: text(testSet.description),
        resumes: count(testSet.resumes),
        pairs: count(testSet.pairs),
      },
      tasks,
      bias: normalizeBias(json.bias_check),
    },
  };
}

/**
 * Names of the systems with the best value for a metric (ties included).
 * Returns an empty set when no system has a value.
 */
export function bestSystems(task, metric) {
  const scored = task.systems.filter((system) => system.values[metric.key] !== null);
  if (scored.length === 0) return new Set();

  const values = scored.map((system) => system.values[metric.key]);
  const best = metric.higherIsBetter ? Math.max(...values) : Math.min(...values);

  return new Set(
    scored.filter((system) => system.values[metric.key] === best).map((system) => system.name)
  );
}

/**
 * Format a metric value for display.
 */
export function formatMetric(value, unit) {
  if (value === null || value === undefined) return '—';

  switch (unit) {
    case 'percent':
      return `${Math.round(value * 10) / 10}%`;
    case 'seconds':
      return `${value.toFixed(1)} s`;
    case 'points':
      return value.toFixed(1);
    default:
      return value.toFixed(2);
  }
}

/**
 * Bar width (0–100) for charts. Ratios and percents use their natural
 * scale; other units are scaled against the largest value shown.
 */
export function barWidth(value, unit, maxValue) {
  if (value === null || value === undefined) return 0;

  const scale = unit === 'ratio' ? 1 : unit === 'percent' ? 100 : maxValue || 1;
  return Math.max(0, Math.min(100, (value / scale) * 100));
}
