import Papa from 'papaparse';

export async function loadData() {
  const response = await fetch('/iro_data.csv');
  const text = await response.text();
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  return result.data;
}

export const IRO_TYPES = ['risk', 'opportunity', 'positive_impact', 'negative_impact'];

export const IRO_LABELS = {
  risk: 'Risk',
  opportunity: 'Opportunity',
  positive_impact: 'Positive Impact',
  negative_impact: 'Negative Impact',
};

export const IRO_COLORS = {
  risk: '#ef4444',
  opportunity: '#3b82f6',
  positive_impact: '#22c55e',
  negative_impact: '#f97316',
};

export const ESRS_TOPICS = [
  'Climate change',
  'Pollution',
  'Water and marine resources',
  'Biodiversity and ecosystems',
  'Resource use and circular economy',
  'Own workforce',
  'Workers in the value chain',
  'Affected communities',
  'Consumers and end users',
  'Business conduct',
];

// ESRS mode: map esrs_topic -> sorted unique sub_topics
export function getEsrsSubtopics(rows) {
  const map = {};
  for (const row of rows) {
    const topic = row.esrs_topic;
    if (!topic) continue;
    if (!map[topic]) map[topic] = new Set();
    const subs = row.sub_topics ? row.sub_topics.split(',').map(s => s.trim()).filter(Boolean) : [];
    for (const s of subs) map[topic].add(s);
  }
  const result = {};
  for (const [t, s] of Object.entries(map)) {
    result[t] = Array.from(s).sort();
  }
  return result;
}

// Datamaran mode: sorted unique topic_name values (flat list, no ESRS grouping)
export function getDatamaranTopicList(rows) {
  return [...new Set(rows.map(r => r.topic_name).filter(Boolean))].sort();
}

export function getIndustries(rows) {
  return [...new Set(rows.map(r => r.industry_name).filter(Boolean))].sort();
}

export function computeHeatmap(rows, industry, year, topicMode) {
  const filtered = rows.filter(r => r.industry_name === industry && r.year === year);
  const totalCompanies = new Set(filtered.map(r => r.company_name)).size;

  const result = {};

  for (const row of filtered) {
    const company = row.company_name;
    const iroType = row.iro_type;

    let keys = [];
    if (topicMode === 'esrs') {
      if (row.esrs_topic) keys.push(row.esrs_topic);
      const subs = row.sub_topics ? row.sub_topics.split(',').map(s => s.trim()).filter(Boolean) : [];
      keys.push(...subs);
    } else {
      if (row.topic_name) keys.push(row.topic_name);
    }

    for (const key of keys) {
      if (!result[key]) {
        result[key] = {};
        for (const t of IRO_TYPES) result[key][t] = new Set();
      }
      if (iroType && result[key][iroType]) {
        result[key][iroType].add(company);
      }
    }
  }

  const pct = {};
  for (const [key, types] of Object.entries(result)) {
    pct[key] = { _total: totalCompanies };
    for (const t of IRO_TYPES) {
      pct[key][t] = totalCompanies > 0 ? (types[t].size / totalCompanies) * 100 : 0;
    }
  }
  return pct;
}

export function getDetailRows(rows, { industry, year, topicMode, topicKey, iroType, isSubtopic }) {
  return rows.filter(r => {
    if (r.industry_name !== industry) return false;
    if (r.year !== year) return false;
    if (r.iro_type !== iroType) return false;

    if (topicMode === 'esrs') {
      if (!isSubtopic) return r.esrs_topic === topicKey;
      const subs = r.sub_topics ? r.sub_topics.split(',').map(s => s.trim()) : [];
      return subs.includes(topicKey);
    } else {
      return r.topic_name === topicKey;
    }
  });
}
