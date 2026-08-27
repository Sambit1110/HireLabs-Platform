import React from 'react';
import { Badge } from '../ui/Badge';

export function ComparisonTable() {
  return (
    <section className="comparison-section" id="comparison">
      <div className="container">
        <div className="section-header">
          <Badge variant="amber" className="section-tag">
            Side-by-Side Evaluation
          </Badge>
          <h2 className="section-title">
            Why Legacy ATS <span className="text-gradient-accent">Falls Short</span>
          </h2>
          <p className="section-desc">
            Keyword filtering excludes exceptional engineers who use slightly different phrasing. HireLabs understands semantic meaning.
          </p>
        </div>

        <div className="comparison-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="col-feature">Capability</th>
                <th className="col-legacy">Legacy Keyword ATS</th>
                <th className="col-hirelabs">HireLabs AI ATS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="col-feature">Matching Method</td>
                <td className="col-legacy">Exact string/regex matching (brittle)</td>
                <td className="col-hirelabs">1536-dim High-dimensional Semantic Vectors</td>
              </tr>
              <tr>
                <td className="col-feature">Synonym & Context Awareness</td>
                <td className="col-legacy">Fails if keyword isn't exact (e.g. "K8s" vs "Kubernetes")</td>
                <td className="col-hirelabs">Understands domain equivalents & architecture scope</td>
              </tr>
              <tr>
                <td className="col-feature">Match Explanation</td>
                <td className="col-legacy">Opaque 0-100 score with no rationale</td>
                <td className="col-hirelabs">Evidence citations & missing qualification flags</td>
              </tr>
              <tr>
                <td className="col-feature">Security & Tenant Isolation</td>
                <td className="col-legacy">Application-level filters (vulnerable to bugs)</td>
                <td className="col-hirelabs">Postgres Row Level Security (RLS) + auth.uid()</td>
              </tr>
              <tr>
                <td className="col-feature">Database Architecture</td>
                <td className="col-legacy">Separate search clusters (Solr/Elasticsearch sync lag)</td>
                <td className="col-hirelabs">Direct pgvector integration in primary PostgreSQL database</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
