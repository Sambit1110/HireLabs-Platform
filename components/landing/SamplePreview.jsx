'use client';

import { useId, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';

import { FocusText } from '@/components/landing/FocusText';
import { onTiltLeave, onTiltMove } from '@/components/landing/tilt';
import { SAMPLE_ROLES, rankFor } from '@/lib/landing/sample';

const MotionLi = motion.li;

function ScoreRing({ score }) {
  return (
    <span className="lp-sample__score" style={{ '--p': score / 100 }}>
      <svg viewBox="0 0 52 52" aria-hidden="true">
        <circle className="lp-sample__ring-track" cx="26" cy="26" r="22" />
        <circle className="lp-sample__ring-fill" cx="26" cy="26" r="22" />
      </svg>
      <span className="lp-sample__score-num">{score}</span>
      <span className="lp-sr-only"> out of 100</span>
    </span>
  );
}

/**
 * Product preview with fictional candidates. Picking a role re-ranks the
 * cards (they slide into place), shows each score, highlights the skills
 * that match and gives a one-line reason. Screen readers hear the new
 * ranking; reduced motion swaps the order without sliding.
 */
export function SamplePreview() {
  const [roleId, setRoleId] = useState(SAMPLE_ROLES[0].id);
  const groupName = useId();
  const role = SAMPLE_ROLES.find((entry) => entry.id === roleId) ?? SAMPLE_ROLES[0];
  const entries = rankFor(role.id);
  const summary = `Ranked for ${role.label}: ${entries.map((entry) => `${entry.name} ${entry.score}`).join(', ')}.`;

  return (
    <section id="demo" data-lp-theme="mid" className="lp-section lp-sample">
      <div className="lp-container">
        <p className="lp-eyebrow lp-section__eyebrow">Product preview · Sample data</p>
        <FocusText as="h2" className="lp-heading" text="What a parsed profile looks like." />
        <p className="lp-sample__intro">
          These profiles are fictional. Pick a role to see how HireLabs would rank them, then sign in
          to rank your own resumes against a real job.
        </p>

        <fieldset className="lp-sample__roles">
          <legend className="lp-sample__roles-label">Rank them for</legend>
          <div className="lp-sample__role-list">
            {SAMPLE_ROLES.map((entry) => (
              <label key={entry.id} className="lp-sample__role">
                <input
                  type="radio"
                  className="lp-sample__role-input"
                  name={groupName}
                  value={entry.id}
                  checked={entry.id === role.id}
                  onChange={() => setRoleId(entry.id)}
                />
                <span>{entry.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <p className="lp-sr-only" aria-live="polite">
          {summary}
        </p>

        <MotionConfig reducedMotion="user">
          <ul className="lp-sample__grid">
            {entries.map((entry) => (
              <MotionLi
                key={entry.name}
                layout
                transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                className="lp-sample__item"
              >
                <div
                  className={`lp-card lp-sample__card${entry.rank === 1 ? ' is-top' : ''}`}
                  onPointerMove={onTiltMove}
                  onPointerLeave={onTiltLeave}
                >
                  <div className="lp-sample__head">
                    <span className="lp-sample__tag">{`#${entry.rank} · Sample candidate`}</span>
                    <ScoreRing score={entry.score} />
                  </div>
                  <h3 className="lp-sample__name">{entry.name}</h3>
                  <p className="lp-sample__title">{entry.title}</p>
                  <ul className="lp-sample__skills" aria-label={`Skills for ${entry.name}`}>
                    {entry.skills.map((skill) => {
                      const isMatch = entry.matched.includes(skill);
                      return (
                        <li key={skill} className={`lp-sample__skill${isMatch ? ' is-match' : ''}`}>
                          {isMatch ? <span className="lp-sr-only">Matched: </span> : null}
                          {skill}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="lp-sample__reason">{entry.reason}</p>
                </div>
              </MotionLi>
            ))}
          </ul>
        </MotionConfig>
      </div>
    </section>
  );
}
