import { FocusText } from '@/components/landing/FocusText';

const ROWS = [
  ['Matches exact words', 'Understands meaning'],
  ['Misses transferable skills', 'Finds evidence across the resume'],
  ['A score with no reasons', 'Matched and missing skills, with quotes'],
  ['Easy to game with keyword stuffing', 'Reads for demonstrated experience'],
];

export function KeywordsVsEvidence() {
  return (
    <section data-lp-theme="slate" className="lp-section lp-compare">
      <div className="lp-container">
        <p className="lp-eyebrow lp-section__eyebrow">Keyword filters vs HireLabs</p>
        <FocusText as="h2" className="lp-heading" text="Reading, not matching strings." />

        <table className="lp-compare__table">
          <thead>
            <tr>
              <th scope="col">Keyword filters</th>
              <th scope="col">HireLabs</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([filters, hirelabs]) => (
              <tr key={filters}>
                <td>{filters}</td>
                <td>{hirelabs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
