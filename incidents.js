(function attachNexusIncidentData(root) {
  "use strict";

  const ALLOWED_CATEGORIES = new Set(["cyber-incident", "ransomware", "service-disruption"]);
  const ALLOWED_STATUSES = new Set(["investigating", "resolved", "unknown"]);
  const ALLOWED_IMPACT_LEVELS = new Set(["critical", "high", "moderate", "low", "unassessed"]);
  const ALLOWED_VERIFICATION = new Set(["official", "media-attributed"]);
  const ALLOWED_PRECISION = new Set(["national", "state", "county", "city", "unknown"]);
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

  function isDate(value, optional = false) {
    if (optional && value === null) return true;
    if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
    const parsed = new Date(value + "T00:00:00Z");
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  function hostMatches(host, expectedHost) {
    const candidate = String(host || "").toLowerCase().replace(/\.$/, "");
    const expected = String(expectedHost || "").toLowerCase().replace(/\.$/, "");
    return Boolean(candidate && expected && DOMAIN_PATTERN.test(candidate) && DOMAIN_PATTERN.test(expected) &&
      (candidate === expected || candidate.endsWith("." + expected)));
  }

  function validateIncident(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const requiredStrings = ["id", "title", "organization", "countryName", "region", "impactNote", "summary", "sourceName", "sourceHost", "sourceUrl"];
    if (requiredStrings.some((key) => typeof item[key] !== "string" || !item[key].trim())) return false;
    if (!/^[A-Z0-9][A-Z0-9-]{2,63}$/.test(item.id)) return false;
    if (!/^[A-Z]{2}$/.test(item.countryCode || "")) return false;
    if (!ALLOWED_PRECISION.has(item.geographyPrecision) || !ALLOWED_CATEGORIES.has(item.category) ||
        !ALLOWED_STATUSES.has(item.status) || !ALLOWED_IMPACT_LEVELS.has(item.impactLevel) ||
        !ALLOWED_VERIFICATION.has(item.verificationLevel)) return false;
    if (!isDate(item.eventStart, true) || !isDate(item.eventEnd, true) ||
        !isDate(item.disclosedAt) || !isDate(item.statusAsOf)) return false;
    if (item.eventStart && item.eventEnd && item.eventEnd < item.eventStart) return false;
    if (["latitude", "longitude", "ip", "ioc", "indicator", "malwareSample"].some((key) => key in item)) return false;

    try {
      const url = new URL(item.sourceUrl);
      if (url.protocol !== "https:" || url.username || url.password || !hostMatches(url.hostname, item.sourceHost)) return false;
    } catch {
      return false;
    }
    return true;
  }

  function normalizeIncidents(payload) {
    if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.items)) return [];
    const seen = new Set();
    return payload.items
      .filter((item) => validateIncident(item) && !seen.has(item.id) && seen.add(item.id))
      .slice()
      .sort((a, b) => {
        const dateA = a.eventStart || a.disclosedAt;
        const dateB = b.eventStart || b.disclosedAt;
        return dateB.localeCompare(dateA) || b.disclosedAt.localeCompare(a.disclosedAt) || a.id.localeCompare(b.id);
      });
  }

  function normalizeText(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
  }

  function filterIncidents(items, filters = {}) {
    const query = normalizeText(filters.query);
    const countryCode = String(filters.countryCode || "").toUpperCase();
    const category = String(filters.category || "");
    const status = String(filters.status || "");
    const verificationLevel = String(filters.verificationLevel || "");
    return (Array.isArray(items) ? items : []).filter((item) => {
      if (countryCode && item.countryCode !== countryCode) return false;
      if (category && item.category !== category) return false;
      if (status && item.status !== status) return false;
      if (verificationLevel && item.verificationLevel !== verificationLevel) return false;
      if (!query) return true;
      const haystack = normalizeText([
        item.title, item.organization, item.countryName, item.region,
        item.category, item.summary, item.sourceName
      ].join(" "));
      return haystack.includes(query);
    });
  }

  function summarizeIncidents(items) {
    const rows = Array.isArray(items) ? items : [];
    return rows.reduce((summary, item) => {
      summary.total += 1;
      if (item.status === "investigating") summary.investigating += 1;
      if (item.status === "resolved") summary.resolved += 1;
      if (item.status === "unknown") summary.unknown += 1;
      if (item.verificationLevel === "official") summary.official += 1;
      if (item.verificationLevel === "media-attributed") summary.mediaAttributed += 1;
      return summary;
    }, { total: 0, investigating: 0, resolved: 0, unknown: 0, official: 0, mediaAttributed: 0 });
  }

  const api = { validateIncident, normalizeIncidents, filterIncidents, summarizeIncidents };
  root.NexusIncidentData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
