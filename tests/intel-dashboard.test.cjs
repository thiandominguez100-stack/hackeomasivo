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
  assert.match(html, /BUILD 6\.5/);
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
  assert.match(html, /BUILD 6\.5/);
  assert.match(html, /reportSourcesHealth/);
  assert.match(app, /acscAustralia/);
  assert.match(app, /certUa/);
});


test("NEXUS 6.3 warns that country markers are national centroids and hides them at local zoom", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(html, /centroide nacional aproximado/);
  assert.match(html, /BUILD 6\.5/);
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
  assert.match(html, /BUILD 6\.5/);
  assert.match(html, /release=6\.5/);
  assert.match(html, /Contexto orbital/);
  assert.match(html, /cdn\.jsdelivr\.net\/npm\/cesium@1\.144\.0\/Build\/Cesium/);
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
  assert.match(html, /BUILD 6\.5/);
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
  assert.match(html, /cdn\.jsdelivr\.net\/npm\/cesium@1\.144\.0\/Build\/Cesium/);
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
  assert.match(app, /function formatWeatherTime/);
  assert.match(app, /raw \+ "Z"/);
  assert.match(app, /weatherPlaybackHandle/);
  assert.match(app, /function pauseWeatherForecast/);
  assert.match(app, /orbitalViewer\.forceResize\(\)/);
  assert.match(app, /refreshTrails/);
  assert.match(app, /function startOrbitalUpdates/);
  assert.match(app, /function pauseOrbitalUpdates/);
  assert.match(app, /orbitalViewer\.resolutionScale = 0\.88/);
  assert.match(app, /Date\.now\(\) - orbitalTrailRefreshAt >= 120000/);
  assert.match(css, /weather-forecast-player/);
  assert.match(css, /orbital-visibility-toggles/);
  assert.match(readme, /siguientes 24 horas/);
});


test("NEXUS 6.4 keeps Cesium and its worker modules from the same pinned CDN", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
  assert.match(html, /window\.CESIUM_BASE_URL = "https:\/\/cdn\.jsdelivr\.net\/npm\/cesium@1\.144\.0\/Build\/Cesium\//);
  assert.match(html, /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/cesium@1\.144\.0\/Build\/Cesium\/Cesium\.js"><\/script>/);
  assert.match(html, /app\.js\?v=24/);
  assert.match(sw, /nexus-shell-v24/);
});


test("NEXUS 6.4 adds NASA GIBS satellite imagery to the 3D globe", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  assert.match(html, /BUILD 6\.5/);
  assert.match(html, /id="satelliteModeBtn"/);
  assert.match(html, /id="satelliteControls"/);
  assert.match(html, /id="satelliteLayerSelect"/);
  assert.match(html, /id="satelliteFrameSlider"/);
  assert.match(html, /id="satelliteDateInput"/);
  assert.match(html, /id="satelliteOpacitySlider"/);
  assert.match(app, /MODIS_Terra_CorrectedReflectance_TrueColor/);
  assert.match(app, /MODIS_Aqua_CorrectedReflectance_TrueColor/);
  assert.match(app, /GOES-East_ABI_GeoColor/);
  assert.match(app, /GOES-West_ABI_GeoColor/);
  assert.match(app, /NASA_GIBS_ROOT/);
  assert.match(app, /GoogleMapsCompatible_Level9\/\{z\}\/\{y\}\/\{x\}\.jpg/);
  assert.match(app, /function renderSatelliteImagery/);
  assert.match(app, /function setSatelliteFrame/);
  assert.match(app, /raster-opacity/);
  assert.match(app, /SATELLITE_FRAME_DAYS = 14/);
  assert.match(css, /satellite-controls/);
  assert.match(readme, /NASA GIBS/);
  assert.match(readme, /últimos 14 días/);
});


test("NEXUS 6.4.1 keeps the Earth visible in Orbital mode without external tile services", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
  const readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  assert.match(html, /BUILD 6\.5/);
  assert.match(html, /id="orbitalHomeBtn"/);
  assert.match(html, /id="orbitalSurfaceStatus"/);
  assert.match(html, /release=6\.5/);
  assert.match(app, /Assets\/Textures\/NaturalEarthII/);
  assert.match(app, /new Cesium\.GeographicTilingScheme/);
  assert.match(app, /orbitalViewer\.scene\.globe\.baseColor/);
  assert.match(app, /function resetOrbitalCamera/);
  assert.match(app, /orbitalHomeBtn/);
  assert.match(app, /detailProvider\.errorEvent\.addEventListener/);
  assert.doesNotMatch(app, /orbitalViewer\.flyTo\(orbitalSatellites\.map/);
  assert.match(css, /orbital-surface-status/);
  assert.match(sw, /nexus-shell-v24/);
  assert.match(readme, /textura Natural Earth II/);
});


test("NEXUS 6.5 derives source freshness from timestamps and preserves per-source status", () => {
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(html, /BUILD 6\.5/);
  assert.match(app, /function ageMinutes/);
  assert.match(app, /function freshnessStatus/);
  assert.match(app, /freshnessStatus\(dshield, 120\)/);
  assert.match(app, /freshnessStatus\(cisa, 120\)/);
  assert.match(app, /freshnessStatus\(reportStates\[key\], 180\)/);
  assert.match(app, /último aviso/);
  assert.match(app, /atraso mayor a 120 min/);
});

test("NEXUS 6.5 compares three global weather models only for a selected point", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  assert.match(html, /id="weatherModelComparison"/);
  assert.match(html, /id="weatherModelComparisonStatus"/);
  assert.match(app, /ecmwf_ifs025/);
  assert.match(app, /ncep_gfs_seamless/);
  assert.match(app, /cmc_gem_seamless/);
  assert.match(app, /function summarizeModelForecast/);
  assert.match(app, /function loadWeatherModelComparison/);
  assert.match(app, /WEATHER_MODEL_CACHE_MS = 30 \* 60 \* 1000/);
  assert.match(app, /forecast_hours: "24"/);
  assert.match(app, /void loadWeatherModelComparison\(lat, lon, controller\.signal\)/);
  assert.match(app, /Math\.max\(\.\.\.values\) - Math\.min\(\.\.\.values\)/);
  assert.match(css, /weather-model-table/);
  assert.match(readme, /ECMWF IFS, NOAA GFS y GEM Global/);
  assert.match(readme, /no la interpreta como probabilidad/);
});

test("NEXUS 6.5 reuses NASA raster layers and reports satellite tile request errors", () => {
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(app, /existingSource\.setTiles\(\[tileUrl\]\)/);
  assert.match(app, /satelliteLoadGeneration/);
  assert.match(app, /satelliteTileErrorCount \+= 1/);
  assert.match(app, /map\.once\("idle"/);
  assert.match(app, /existingSource && typeof existingSource\.setTiles === "function"/);
  assert.match(app, /existingSource\.setTiles\(\[tileUrl\]\)/);
});

test("NEXUS 6.5 reduces orbital rendering work and pauses hidden tabs", () => {
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const updateBlock = app.slice(
    app.indexOf("function updateOrbitalPositions"),
    app.indexOf("function drawOrbitalCatalog")
  );
  assert.match(app, /orbitalTrailRefreshAt >= 120000/);
  assert.match(app, /step <= 48/);
  assert.match(app, /document\.hidden\) return/);
  assert.match(app, /document\.addEventListener\("visibilitychange"/);
  assert.doesNotMatch(updateBlock, /entity\.description/);
});
