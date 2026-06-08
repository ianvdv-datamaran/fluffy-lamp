import { useState, useEffect } from 'react';
import { loadData, getIndustries } from './dataUtils';
import Heatmap from './components/Heatmap';
import DetailPage from './components/DetailPage';
import './App.css';

export default function App() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [industries, setIndustries] = useState([]);
  const [industry, setIndustry] = useState('');
  const [year, setYear] = useState('2026');
  const [topicMode, setTopicMode] = useState('esrs');
  const [showDiff, setShowDiff] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    loadData().then(data => {
      setRows(data);
      const inds = getIndustries(data);
      setIndustries(inds);
      setIndustry(inds[0] || '');
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>Loading IRO data…</span>
      </div>
    );
  }

  if (detail) {
    return (
      <DetailPage
        rows={rows}
        detail={detail}
        industry={industry}
        year={year}
        topicMode={topicMode}
        onBack={() => setDetail(null)}
      />
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">
          <h1>IRO Heatmap</h1>
          <span className="subtitle">CSRD Impact, Risk &amp; Opportunity Analysis</span>
        </div>
        <div className="header-controls">
          <div className="control-group">
            <label>Industry</label>
            <select value={industry} onChange={e => setIndustry(e.target.value)}>
              {industries.map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Topic framework</label>
            <div className="toggle-group">
              <button
                className={topicMode === 'esrs' ? 'toggle-btn active' : 'toggle-btn'}
                onClick={() => setTopicMode('esrs')}
              >
                ESRS
              </button>
              <button
                className={topicMode === 'datamaran' ? 'toggle-btn active' : 'toggle-btn'}
                onClick={() => setTopicMode('datamaran')}
              >
                Datamaran
              </button>
            </div>
          </div>

          <div className="control-group">
            <label>Year</label>
            <div className="toggle-group">
              <button
                className={year === '2026' && !showDiff ? 'toggle-btn active' : 'toggle-btn'}
                onClick={() => { setYear('2026'); setShowDiff(false); }}
              >
                2026
              </button>
              <button
                className={year === '2025' && !showDiff ? 'toggle-btn active' : 'toggle-btn'}
                onClick={() => { setYear('2025'); setShowDiff(false); }}
              >
                2025
              </button>
              <button
                className={showDiff ? 'toggle-btn active diff-btn' : 'toggle-btn diff-btn'}
                onClick={() => { setShowDiff(d => !d); if (!showDiff) setYear('2026'); }}
                title="Show % change 2025 → 2026"
              >
                Δ 25→26
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Heatmap
          rows={rows}
          industry={industry}
          year={year}
          topicMode={topicMode}
          showDiff={showDiff}
          onCellClick={(params) => setDetail(params)}
        />
      </main>
    </div>
  );
}
