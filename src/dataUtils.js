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

// Map ESRS topic -> its sub_topics
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

// Map Datamaran topic -> sub (no subtopics in this mode, so we'll just use topic_name flat)
// But we need to group by something. We'll use esrs_topic as the "parent" group for Datamaran mode.
export function getDatamaranTopics(rows) {
  // group topic_name by esrs_topic
  const map = {};
  for (const row of rows) {
    const parent = row.esrs_topic;
    const child = row.topic_name;
    if (!parent || !child) continue;
    if (!map[parent]) map[parent] = new Set();
    map[parent].add(child);
  }
  const result = {};
  for (const [p, c] of Object.entries(map)) {
    result[p] = Array.from(c).sort();
  }
  return result;
}

export function getIndustries(rows) {
  return [...new Set(rows.map(r => r.industry_name).filter(Boolean))].sort();
}

/**
 * For a given filter, compute: % of companies reporting at least one IRO of each type
 * for each topic/subtopic combination.
 *
 * @param rows - all data rows
 * @param industry - selected industry
 * @param year - '2025' or '2026'
 * @param topicMode - 'esrs' | 'datamaran'
 * @returns { [topic]: { [iro_type]: pct, companies: Set } }
 */
export function computeHeatmap(rows, industry, year, topicMode) {
  const filtered = rows.filter(r => r.industry_name === industry && r.year === year);

  // unique companies in this industry/year
  const allCompanies = new Set(filtered.map(r => r.company_name));
  const totalCompanies = allCompanies.size;

  const result = {}; // key: topic or subtopic -> { [iro_type]: Set<company> }

  for (const row of filtered) {
    const company = row.company_name;
    const iroType = row.iro_type;

    let topics = [];
    if (topicMode === 'esrs') {
      // parent topic
      topics.push({ level: 'parent', key: row.esrs_topic });
      // subtopics
      const subs = row.sub_topics ? row.sub_topics.split(',').map(s => s.trim()).filter(Boolean) : [];
      for (const sub of subs) {
        topics.push({ level: 'sub', key: sub, parent: row.esrs_topic });
      }
    } else {
      // parent: esrs_topic, child: topic_name
      topics.push({ level: 'parent', key: row.esrs_topic });
      if (row.topic_name) {
        topics.push({ level: 'sub', key: row.topic_name, parent: row.esrs_topic });
      }
    }

    for (const { key } of topics) {
      if (!key) continue;
      if (!result[key]) {
        result[key] = {};
        for (const t of IRO_TYPES) result[key][t] = new Set();
      }
      if (iroType && result[key][iroType]) {
        result[key][iroType].add(company);
      }
    }
  }

  // Convert sets to percentages
  const pct = {};
  for (const [key, types] of Object.entries(result)) {
    pct[key] = {};
    for (const t of IRO_TYPES) {
      pct[key][t] = totalCompanies > 0 ? (types[t].size / totalCompanies) * 100 : 0;
    }
    pct[key]._total = totalCompanies;
  }

  return pct;
}

/**
 * Get detail rows for a specific topic + iro_type + industry + year
 */
export function getDetailRows(rows, { industry, year, topicMode, topicKey, iroType, isSubtopic, parentTopic }) {
  return rows.filter(r => {
    if (r.industry_name !== industry) return false;
    if (r.year !== year) return false;
    if (r.iro_type !== iroType) return false;

    if (!isSubtopic) {
      // parent topic
      return r.esrs_topic === topicKey;
    } else {
      // subtopic
      if (topicMode === 'esrs') {
        const subs = r.sub_topics ? r.sub_topics.split(',').map(s => s.trim()) : [];
        return subs.includes(topicKey) && r.esrs_topic === parentTopic;
      } else {
        return r.topic_name === topicKey && r.esrs_topic === parentTopic;
      }
    }
  });
}
