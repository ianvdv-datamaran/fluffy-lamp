import { useMemo } from 'react';
import { getDetailRows, IRO_LABELS, IRO_COLORS } from '../dataUtils';

export default function DetailPage({ rows, detail, industry, year, topicMode, onBack }) {
  const { topicKey, iroType, isSubtopic } = detail;

  const detailRows = useMemo(
    () => getDetailRows(rows, { industry, year, topicMode, topicKey, iroType, isSubtopic }),
    [rows, detail, industry, year, topicMode]
  );

  // Group by company
  const byCompany = useMemo(() => {
    const map = {};
    for (const row of detailRows) {
      if (!map[row.company_name]) map[row.company_name] = [];
      map[row.company_name].push(row);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [detailRows]);

  const iroColor = IRO_COLORS[iroType];

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to heatmap
        </button>
        <div className="detail-title">
          <h2>
            <span className="detail-topic">{topicKey}</span>
            {isSubtopic && parentTopic && (
              <span className="detail-parent"> · {parentTopic}</span>
            )}
          </h2>
          <span
            className="detail-iro-badge"
            style={{ background: iroColor, color: '#fff' }}
          >
            {IRO_LABELS[iroType]}
          </span>
        </div>
        <div className="detail-meta">
          {industry} · {year} · {byCompany.length} companies · {detailRows.length} IROs
        </div>
      </div>

      <div className="detail-body">
        {byCompany.length === 0 && (
          <p className="no-data">No data for this selection.</p>
        )}
        {byCompany.map(([company, companyRows]) => (
          <div key={company} className="company-card">
            <div className="company-header">
              <span className="company-name">{company}</span>
              <span className="company-country">{companyRows[0]?.country_name}</span>
              <span className="company-count">{companyRows.length} IRO{companyRows.length !== 1 ? 's' : ''}</span>
            </div>
            <ul className="iro-list">
              {companyRows.map((row, i) => (
                <li key={i} className="iro-item">
                  <div className="iro-description">{row.description}</div>
                  <div className="iro-meta-row">
                    {row.topic_name && (
                      <span className="iro-tag topic-tag">{row.topic_name}</span>
                    )}
                    {row.sub_topics && row.sub_topics.split(',').map(s => s.trim()).filter(Boolean).map((s, j) => (
                      <span key={j} className="iro-tag subtopic-tag">{s}</span>
                    ))}
                    {row.value_chains && (
                      <span className="iro-tag chain-tag">{row.value_chains.split(',').map(s => s.trim()).join(' · ')}</span>
                    )}
                    {row.page && (
                      <span className="iro-tag page-tag">p.{row.page}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
