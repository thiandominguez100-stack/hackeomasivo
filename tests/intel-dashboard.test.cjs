const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/current.json"), "utf8"));

test("public snapshot has a supported schema and feed containers", () => {
  assert.equal(snapshot.schemaVersion, 1);
  assert.ok(snapshot.feeds && typeof snapshot.feeds === "object");
  assert.ok("dshield" in snapshot.feeds);
  assert.ok("cisaKev" in snapshot.feeds);
});

test("country aggregates contain finite country-level coordinates", () => {
  const rows = snapshot.feeds.dshield?.countryAggregates || [];
  assert.ok(Array.isArray(rows));
  for (const row of rows) {
    assert.equal(typeof row.countryCode, "string");
    assert.equal(row.countryCode.length, 2);
    assert.ok(Number.isFinite(row.longitude));
    assert.ok(Number.isFinite(row.latitude));
    assert.ok(row.longitude >= -180 && row.longitude <= 180);
    assert.ok(row.latitude >= -90 && row.latitude <= 90);
    assert.ok(!("ip" in row), "raw source IPs must not be published");
  }
});

test("CISA records use CVE identifiers and public NVD references", () => {
  const rows = snapshot.feeds.cisaKev?.recent || [];
  assert.ok(Array.isArray(rows));
  for (const row of rows) {
    assert.match(row.cveId, /^CVE-\d{4}-\d+$/);
    assert.match(row.nvdUrl, /^https:\/\/nvd\.nist\.gov\/vuln\/detail\/CVE-/);
  }
});

test("no generated simulation events or fake route fields are present", () => {
  assert.ok(!("simulation" in snapshot));
  assert.ok(!("routes" in (snapshot.feeds.dshield || {})));
  assert.ok(!("fakeEvents" in snapshot));
});

test("published page is an observatory and does not load the old simulator", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(html, /BUILD 6.3/);
  assert.match(html, /DShield/);
  assert.match(html, /CISA/);
  assert.doesNotMatch(html, /simulation\.js/);
  assert.doesNotMatch(html, /SIMULATION ENGINE|GLOBAL ROUTE ENGINE|RUTAS SINTÉTICAS/);
});

test("research and advisory items are source-linked and contain no raw IP fields", () => {
  const rows = snapshot.feeds.reports?.items || [];
  assert.ok(Array.isArray(rows));
  for (const row of rows) {
    assert.ok(["sansDiary", "cisaAdvisories", "ukNcsc", "certEu", "canadaCyber", "acscAustralia", "certSe", "certUa"].includes(row.sourceKey));
    assert.ok(typeof row.title === "string" && row.title.length > 0);
    const allowedHosts = {
      sansDiary: "isc.sans.edu",
      cisaAdvisories: "cisa.gov",
      ukNcsc: "ncsc.gov.uk",
      certEu: "cert.europa.eu",
      canadaCyber: "cyber.gc.ca",
      acscAustralia: "cyber.gov.au",
      certSe: "cert.se",
      certUa: "cert.gov.ua"
    };
    const url = new URL(row.url);
    assert.equal(url.protocol, "https:");
    const allowedHost = allowedHosts[row.sourceKey];
    assert.ok(url.hostname === allowedHost || url.hostname.endsWith("." + allowedHost));
    assert.ok(!("ip" in row));
    assert.ok(!("description" in row));
  }
});

test("reports feed tracks the expanded eight-source allowlist", () => {
  const states = snapshot.feeds.reports?.sourceStates || {};
  const known = ["sansDiary", "cisaAdvisories", "ukNcsc", "certEu", "canadaCyber", "acscAustralia", "certSe", "certUa"];
  for (const key of Object.keys(states)) assert.ok(known.includes(key));
  assert.ok(known.includes("ukNcsc"));
  assert.ok(known.includes("certEu"));
  assert.ok(known.includes("canadaCyber"));
});

test("interface includes the eight-source health list", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(html, /BUILD 6.3/);
  assert.match(html, /reportSourcesHealth/);
  assert.match(app, /acscAustralia/);
  assert.match(app, /certUa/);
});


test("NEXUS 6.3 warns that country markers are national centroids and hides them at local zoom", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(html, /centroide nacional aproximado/);
  assert.match(html, /BUILD 6.3/);
  assert.match(app, /maxzoom: 5\.2/);
  assert.match(app, /marcadores nacionales ocultos/);
  assert.match(app, /No indica dónde ocurrió un incidente/);
});

test("evidence explorer filters official publications without claiming incidents are confirmed", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(html, /id="reportSearch"/);
  assert.match(html, /id="reportSourceFilter"/);
  assert.match(html, /id="reportCount"/);
  assert.match(app, /publicación oficial; no confirma por sí sola un incidente activo/);
  assert.match(app, /sourceFilter !== "all"/);
});


test("publication history archive is loaded by the interface and documented as metadata-only", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  assert.match(html, /reportArchiveStatus/);
  assert.match(app, /publications-history\.json/);
  assert.match(app, /historyItems/);
  assert.match(app, /slice\(0, 100\)/);
  assert.match(readme, /retención de 365 días/);
});


test("NEXUS 6.3 retains the 3D MapLibre globe and documents safe orbital scope", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  assert.match(html, /BUILD 6.3/);
  assert.match(html, /release=6.3/);
  assert.match(html, /Contexto orbital/);
  assert.match(html, /cesiumjs\/releases\/1\.144/);
  assert.match(app, /styles\/liberty/);
  assert.match(app, /setSky/);
  assert.match(app, /atmosphere-blend/);
  assert.match(css, /radial-gradient/);
  assert.match(css, /orbital-scene/);
  assert.match(readme, /no procesa ni representa satélites militares/);
});

test("NEXUS 6.3 exposes all modes and global weather source controls", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  assert.match(html, /BUILD 6.3/);
  assert.match(html, /id="cyberModeBtn"/);
  assert.match(html, /id="weatherModeBtn"/);
  assert.match(html, /id="orbitalModeBtn"/);
  assert.match(html, /id="weatherControls"/);
  assert.match(html, /id="weatherVariableSelect"/);
  assert.match(html, /id="orbitalControls"/);
  assert.match(html, /rainviewer\.com/);
  assert.match(html, /open-meteo\.com/);
  assert.match(app, /api\.rainviewer\.com\/public\/weather-maps\.json/);
  assert.match(app, /api\.open-meteo\.com\/v1\/forecast/);
  assert.match(app, /function setMapMode/);
  assert.match(css, /map-mode-tabs/);
  assert.match(css, /weather-controls/);
  assert.match(readme, /dos horas de historial/);
});

test("NEXUS weather mode covers the globe with a 288-cell field and selectable variables", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  assert.match(html, /id="weatherVariableSelect"/);
  assert.match(html, /id="weatherCoverageCount"/);
  assert.match(app, /latitude = -82\.5/);
  assert.match(app, /longitude = -172\.5/);
  assert.match(app, /id: "nexus-weather-cells-fill"/);
  assert.match(app, /nexus-weather-cells/);
  assert.match(app, /temperature_2m.*relative_humidity_2m/s);
  assert.match(app, /wind_gusts_10m/);
  assert.match(app, /surface_pressure/);
  assert.match(app, /showers/);
  assert.match(app, /is_day/);
  assert.match(app, /dew_point_2m/);
  assert.match(app, /pressure_msl/);
  assert.match(app, /function applyWeatherVariable/);
  assert.match(app, /60 \* 60 \* 1000/);
  assert.match(css, /weather-variable-select/);
  assert.match(readme, /288 celdas/);
});

test("NEXUS orbital mode uses Cesium 3D and SGP4 for the public civil-weather whitelist", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  assert.match(html, /id="orbitalScene"/);
  assert.match(html, /id="orbitalObjectList"/);
  assert.match(html, /cesiumjs\/releases\/1\.144/);
  assert.match(html, /CESIUM_BASE_URL/);
  assert.match(app, /new Cesium\.Viewer/);
  assert.match(app, /GROUP=WEATHER&FORMAT=JSON/);
  assert.match(app, /satellite\.js@7\.1\.0/);
  assert.match(app, /json2satrec/);
  assert.match(app, /satelliteGeodetic/);
  assert.match(app, /setInterval\(updateOrbitalPositions, 5000\)/);
  assert.match(app, /ORBITAL_REFRESH_MS = 2 \* 60 \* 60 \* 1000/);
  assert.match(app, /WEATHER_CACHE_KEY/);
  assert.match(app, /ORBITAL_CACHE_KEY/);
  assert.match(app, /localStorage\.setItem/);
  assert.match(app, /CIVIL_WEATHER_MISSION/);
  assert.match(app, /classification !== "U"/);
  assert.match(app, /rows: safeRows/);
  assert.doesNotMatch(app.match(/CIVIL_WEATHER_MISSION = (.*);/)?.[1] || "", /DMSP|EWS-G|FENGYUN/);
  assert.match(css, /orbital-scene/);
  assert.match(readme, /no procesa ni representa satélites militares/);
});

test("NEXUS 6.3 adds a 24-hour global weather forecast timeline", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  assert.match(html, /id="weatherTimeSlider"/);
  assert.match(html, /id="weatherPlayBtn"/);
  assert.match(html, /id="weatherTimeLabel"/);
  assert.match(html, /id="orbitalTrailsToggle"/);
  assert.match(html, /id="orbitalLabelsToggle"/);
  assert.match(app, /WEATHER_HOURLY_FIELDS/);
  assert.match(app, /forecast_hours: "24"/);
  assert.match(app, /uv_index/);
  assert.match(app, /shortwave_radiation/);
  assert.match(app, /cloud_cover_low/);
  assert.match(app, /soil_moisture_0_to_7cm/);
  assert.match(app, /function applyWeatherForecastFrame/);
  assert.match(app, /weatherPlaybackHandle/);
  assert.match(app, /function pauseWeatherForecast/);
  assert.match(app, /orbitalViewer\.forceResize\(\)/);
  assert.match(app, /refreshTrails/);
  assert.match(app, /function startOrbitalUpdates/);
  assert.match(app, /function pauseOrbitalUpdates/);
  assert.match(app, /orbitalViewer\.resolutionScale = 0\.88/);
  assert.match(app, /Date\.now\(\) - orbitalTrailRefreshAt >= 60000/);
  assert.match(css, /weather-forecast-player/);
  assert.match(css, /orbital-visibility-toggles/);
  assert.match(readme, /siguientes 24 horas/);
});
