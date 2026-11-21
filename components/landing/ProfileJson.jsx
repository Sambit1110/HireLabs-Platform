import React from 'react';

/** Renders the structured profile HireLabs actually stores, with JSON syntax colouring. */

function profileFor(candidate) {
  const ready = candidate.source === 'sample' || candidate.processingStatus === 'completed';

  const profile = {
    candidate_profile: {
      full_name: candidate.name,
      title: candidate.title,
      years_experience: ready ? candidate.yearsExperience ?? null : 'pending',
    },
  };

  if (candidate.source === 'uploaded') {
    profile.source_file = candidate.fileName;
    profile.processing_status = candidate.processingStatus;
    if (candidate.parserError) profile.parser_error = candidate.parserError;
    if (ready) profile.profile_completeness = candidate.profileCompleteness;
  }

  profile.extracted_skills = ready ? candidate.skills : [];
  return profile;
}

function Value({ value, indent }) {
  const pad = '  '.repeat(indent);

  if (value === null) return <span className="hl-code-number">null</span>;
  if (typeof value === 'number') return <span className="hl-code-number">{value}</span>;
  if (typeof value === 'string') return <span className="hl-code-string">{JSON.stringify(value)}</span>;

  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return (
      <>
        {'[\n'}
        {value.map((item, index) => (
          <React.Fragment key={index}>
            {`${pad}  `}
            <Value value={item} indent={indent + 1} />
            {index < value.length - 1 ? ',\n' : '\n'}
          </React.Fragment>
        ))}
        {`${pad}]`}
      </>
    );
  }

  const entries = Object.entries(value);
  return (
    <>
      {'{\n'}
      {entries.map(([key, item], index) => (
        <React.Fragment key={key}>
          {`${pad}  `}
          <span className="hl-code-key">{JSON.stringify(key)}</span>
          {': '}
          <Value value={item} indent={indent + 1} />
          {index < entries.length - 1 ? ',\n' : '\n'}
        </React.Fragment>
      ))}
      {`${pad}}`}
    </>
  );
}

export function ProfileJson({ candidate }) {
  return (
    <pre>
      <Value value={profileFor(candidate)} indent={0} />
    </pre>
  );
}
