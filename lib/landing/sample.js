/**
 * Fictional sample candidates and illustrative match results for the
 * landing page's product preview. Clearly labelled as sample data there.
 */
export const SAMPLE_CANDIDATES = [
  {
    name: 'Alex Mercer',
    title: 'Lead Full-Stack Engineer',
    skills: ['React', 'TypeScript', 'PostgreSQL', 'Node.js', 'GraphQL'],
  },
  {
    name: 'Sarah Lin',
    title: 'Staff ML Engineer',
    skills: ['Python', 'Machine Learning', 'Vector Search', 'PyTorch', 'SQL'],
  },
  {
    name: 'Elena Rostova',
    title: 'Cloud Architect',
    skills: ['AWS', 'Kubernetes', 'Security', 'Terraform', 'Go'],
  },
];

export const SAMPLE_ROLES = [
  {
    id: 'fullstack',
    label: 'Full-stack lead',
    results: {
      'Alex Mercer': {
        score: 92,
        matched: ['React', 'TypeScript', 'PostgreSQL', 'Node.js'],
        reason: 'Led a React and TypeScript rewrite of a product used by 2M people.',
      },
      'Elena Rostova': {
        score: 58,
        matched: ['AWS'],
        reason: 'Strong platform work, but little front-end evidence.',
      },
      'Sarah Lin': {
        score: 41,
        matched: ['SQL'],
        reason: 'Deep ML experience, but no product front-end work shown.',
      },
    },
  },
  {
    id: 'ml',
    label: 'ML engineer',
    results: {
      'Sarah Lin': {
        score: 91,
        matched: ['Python', 'Machine Learning', 'Vector Search', 'PyTorch'],
        reason: 'Built a vector search service used by 40 teams.',
      },
      'Alex Mercer': {
        score: 52,
        matched: ['PostgreSQL'],
        reason: 'Solid data plumbing, but no model training shown.',
      },
      'Elena Rostova': {
        score: 47,
        matched: ['AWS'],
        reason: 'Runs ML infrastructure on AWS, but not the models.',
      },
    },
  },
  {
    id: 'cloud',
    label: 'Cloud architect',
    results: {
      'Elena Rostova': {
        score: 94,
        matched: ['AWS', 'Kubernetes', 'Security', 'Terraform'],
        reason: 'Moved 120 services to Kubernetes with no downtime.',
      },
      'Alex Mercer': {
        score: 55,
        matched: [],
        reason: 'Has deployed services, but has not designed a platform.',
      },
      'Sarah Lin': {
        score: 38,
        matched: [],
        reason: 'Uses cloud tools daily; architecture work is not shown.',
      },
    },
  },
];

/**
 * The sample candidates ranked for one role, best match first.
 * An unknown role returns the profiles in their original order, unscored.
 *
 * @param {string} roleId
 * @returns {Array<{ name: string, title: string, skills: string[], rank: number | null,
 *   score: number | null, matched: string[], reason: string }>}
 */
export function rankFor(roleId) {
  const role = SAMPLE_ROLES.find((entry) => entry.id === roleId);
  if (!role) {
    return SAMPLE_CANDIDATES.map((candidate) => ({ ...candidate, rank: null, score: null, matched: [], reason: '' }));
  }
  return SAMPLE_CANDIDATES.map((candidate) => ({ ...candidate, ...role.results[candidate.name] }))
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
