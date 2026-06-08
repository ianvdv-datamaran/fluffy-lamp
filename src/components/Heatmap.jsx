import { useState, useMemo } from 'react';
import {
  IRO_TYPES, IRO_LABELS, IRO_COLORS,
  ESRS_TOPICS,
  computeHeatmap,
  getEsrsSubtopics,
  getDatamaranTopics,
} from '../dataUtils';

function colorForPct(pct) {
  if (pct === 0) return 'transparent';
  // Scale opacity 0.1 → 0.9 for pct 0–100
  const alpha = 0.1 + (pct / 100) * 0.8;
  return `rgba(59, 130, 246, ${alpha.toFixed(2)})`;
}

function colorForDiff(diff) {
  if (diff === 0) return 'transparent';
  if (diff > 0) {
    const alpha = Math.min(0.9, 0.1 + (diff / 50) * 0.8);
    return `rgba(34, 197, 94, ${alpha.toFixed(2)})`;
  } else {
    const alpha = Math.min(0.9, 0.1 + (Math.abs(diff) / 50) * 0.8);
    return `rgba(239, 68, 68, ${alpha.toFixed(2)})`;
  }
}

function Cell({ pct, diff, showDiff, onClick, iroType }) {
  const displayVal = showDiff ? diff : pct;
  const bg = showDiff ? colorForDiff(diff) : colorForPct(pct);
  const isEmpty = pct === 0 && !showDiff;

  return (
    <td
      className={`heatmap-cell ${isEmpty ? 'empty' : ''}`}
      style={{ backgroundColor: bg }}
      onClick={isEmpty ? undefined : onClick}
      title={showDiff
        ? `2025→2026 change: ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp`
        : `${pct.toFixed(1)}% of companies`}
    >
      {displayVal !== 0 && (
        <span className="cell-value">
          {showDiff && diff > 0 ? '+' : ''}
          {showDiff ? diff.toFixed(1) : pct.toFixed(0)}
          {showDiff ? 'pp' : '%'}
        </span>
      )}
    </td>
  );
}

function TopicRow({ topic, isSubtopic, parentTopic, heatmap2026, heatmap2025, showDiff, year, onCellClick, topicMode, expanded, onToggle }) {
  const data = showDiff ? heatmap2026 : (year === '2026' ? heatmap2026 : heatmap2025);
  const topicData = data?.[topic] || {};

  return (
    <tr className={isSubtopic ? 'sub-row' : 'parent-row'}>
      <td className="topic-label-cell">
        <div className={isSubtopic ? 'topic-indent' : 'topic-main'}>
          {!isSubtopic && (
            <button className="expand-btn" onClick={onToggle} aria-label={expanded ? 'Collapse' : 'Expand'}>
              {expanded ? '▾' : '▸'}
            </button>
          )}
          {isSubtopic && <span className="sub-bullet">└</span>}
          <span className="topic-text">{topic}</span>
        </div>
      </td>
      {IRO_TYPES.map(iroType => {
        const pct = topicData[iroType] ?? 0;
        const pct25 = heatmap2025?.[topic]?.[iroType] ?? 0;
        const diff = pct - pct25;
        return (
          <Cell
            key={iroType}
            pct={pct}
            diff={diff}
            showDiff={showDiff}
            iroType={iroType}
            onClick={() => onCellClick({
              topicKey: topic,
              iroType,
              isSubtopic,
              parentTopic,
              topicMode,
            })}
          />
        );
      })}
    </tr>
  );
}

export default function Heatmap({ rows, industry, year, topicMode, showDiff, onCellClick }) {
  const [expanded, setExpanded] = useState({});

  const heatmap2026 = useMemo(
    () => computeHeatmap(rows, industry, '2026', topicMode),
    [rows, industry, topicMode]
  );
  const heatmap2025 = useMemo(
    () => computeHeatmap(rows, industry, '2025', topicMode),
    [rows, industry, topicMode]
  );

  const subtopicsMap = useMemo(() => {
    if (topicMode === 'esrs') return getEsrsSubtopics(rows);
    return getDatamaranTopics(rows);
  }, [rows, topicMode]);

  const currentHeatmap = showDiff ? heatmap2026 : (year === '2026' ? heatmap2026 : heatmap2025);
  const totalCompanies = currentHeatmap[Object.keys(currentHeatmap)[0]]?._total ?? 0;

  const toggleExpand = (topic) => {
    setExpanded(prev => ({ ...prev, [topic]: !prev[topic] }));
  };

  const filteredRows = rows.filter(r => r.industry_name === industry && r.year === (showDiff ? '2026' : year));
  const companies2026 = new Set(rows.filter(r => r.industry_name === industry && r.year === '2026').map(r => r.company_name)).size;
  const companies2025 = new Set(rows.filter(r => r.industry_name === industry && r.year === '2025').map(r => r.company_name)).size;

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-meta">
        <span>
          {showDiff
            ? `Showing % point change 2025 → 2026 · 2025: ${companies2025} companies · 2026: ${companies2026} companies`
            : `${year} · ${new Set(filteredRows.map(r => r.company_name)).size} companies reporting`}
        </span>
        <span className="legend">
          {showDiff ? (
            <>
              <span className="legend-chip" style={{ background: 'rgba(34,197,94,0.6)' }}>Increase</span>
              <span className="legend-chip" style={{ background: 'rgba(239,68,68,0.6)' }}>Decrease</span>
            </>
          ) : (
            <>
              <span className="legend-label">Low</span>
              <span className="legend-gradient" />
              <span className="legend-label">High %</span>
            </>
          )}
        </span>
      </div>

      <div className="heatmap-scroll">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th className="topic-col-header">Topic</th>
              {IRO_TYPES.map(t => (
                <th
                  key={t}
                  className="iro-col-header"
                  style={{ borderBottom: `3px solid ${IRO_COLORS[t]}` }}
                >
                  {IRO_LABELS[t]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ESRS_TOPICS.map(esrsTopic => {
              const subs = subtopicsMap[esrsTopic] || [];
              const isOpen = expanded[esrsTopic];
              return [
                <TopicRow
                  key={esrsTopic}
                  topic={esrsTopic}
                  isSubtopic={false}
                  parentTopic={null}
                  heatmap2026={heatmap2026}
                  heatmap2025={heatmap2025}
                  showDiff={showDiff}
                  year={year}
                  onCellClick={onCellClick}
                  topicMode={topicMode}
                  expanded={isOpen}
                  onToggle={() => toggleExpand(esrsTopic)}
                />,
                ...(isOpen ? subs.map(sub => (
                  <TopicRow
                    key={`${esrsTopic}__${sub}`}
                    topic={sub}
                    isSubtopic={true}
                    parentTopic={esrsTopic}
                    heatmap2026={heatmap2026}
                    heatmap2025={heatmap2025}
                    showDiff={showDiff}
                    year={year}
                    onCellClick={onCellClick}
                    topicMode={topicMode}
                    expanded={false}
                    onToggle={() => {}}
                  />
                )) : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
