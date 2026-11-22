/**
 * The back of each "How it works" card: a tiny, sample-data picture of
 * what that step produces. The people are the fictional sample candidates
 * from the product preview section.
 *
 * Each row carries `--d` (its order), which the CSS uses to stagger the
 * entrance animation when the card is turned over.
 */
const order = (index) => ({ '--d': index });

function ParseDemo() {
  const fields = [
    ['Name', 'Sarah Lin'],
    ['Role', 'Staff ML Engineer'],
    ['Skills', 'Python · ML · Vector search'],
    ['Experience', '7 years'],
  ];
  return (
    <div className="lp-demo">
      <p className="lp-demo__chip">sarah_lin.pdf → parsed</p>
      <dl className="lp-demo__fields">
        {fields.map(([label, value], index) => (
          <div key={label} className="lp-demo__row" style={order(index)}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function MatchDemo() {
  const ranked = [
    ['Sarah Lin', 91],
    ['Alex Mercer', 64],
    ['Elena Rostova', 48],
  ];
  return (
    <div className="lp-demo">
      <p className="lp-demo__chip">Job: ML Engineer</p>
      <ol className="lp-demo__bars">
        {ranked.map(([name, score], index) => (
          <li key={name} className="lp-demo__row" style={order(index)}>
            <span className="lp-demo__bar-label">
              <span>{name}</span>
              <span className="lp-demo__score">{score}</span>
            </span>
            <span className="lp-demo__bar" aria-hidden="true">
              <span className="lp-demo__bar-fill" style={{ '--w': `${score}%`, ...order(index) }} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ExplainDemo() {
  return (
    <div className="lp-demo">
      <p className="lp-demo__chip">Sarah Lin · 91</p>
      <ul className="lp-demo__chips">
        <li className="lp-demo__row lp-demo__skill is-match" style={order(0)}>
          <span className="lp-sr-only">Matched: </span>
          Python
        </li>
        <li className="lp-demo__row lp-demo__skill is-match" style={order(1)}>
          <span className="lp-sr-only">Matched: </span>
          Vector search
        </li>
        <li className="lp-demo__row lp-demo__skill is-missing" style={order(2)}>
          <span className="lp-sr-only">Missing: </span>
          Spark
        </li>
      </ul>
      <blockquote className="lp-demo__row lp-demo__quote" style={order(3)}>
        “Built a vector search service used by 40 teams.”
      </blockquote>
    </div>
  );
}

function FairDemo() {
  const versions = [
    ['Original resume', 91],
    ['Name changed to “Sam Lee”', 91],
    ['Gendered words removed', 91],
  ];
  return (
    <div className="lp-demo">
      <p className="lp-demo__chip">One resume, 3 versions</p>
      <ul className="lp-demo__versions">
        {versions.map(([label, score], index) => (
          <li key={label} className="lp-demo__row" style={order(index)}>
            <span>{label}</span>
            <span className="lp-demo__score">{score}</span>
          </li>
        ))}
      </ul>
      <p className="lp-demo__row lp-demo__verdict" style={order(3)}>
        <span aria-hidden="true">✓ </span>Score unchanged
      </p>
    </div>
  );
}

const DEMOS = { parse: ParseDemo, match: MatchDemo, explain: ExplainDemo, fair: FairDemo };

export function HowDemo({ kind }) {
  const Demo = DEMOS[kind] ?? ParseDemo;
  return <Demo />;
}
