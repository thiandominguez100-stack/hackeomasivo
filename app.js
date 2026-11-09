(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const fmt = (value) => Number(value || 0).toLocaleString("es-AR");
  const emptyCollection = () => ({ type: "FeatureCollection", features: [] });
  const DATA_URL = "./data/current.json";
  const DATA_HISTORY_URL = "./data/publications-history.json";
  const CITY_HUBS = {
    "Buenos Aires": [-58.3816, -34.6037], "São Paulo": [-46.6333, -23.5505],
    "New York": [-74.006, 40.7128], "San Francisco": [-122.4194, 37.7749],
    "London": [-0.1276, 51.5072], "Paris": [2.3522, 48.8566],
    "Berlin": [13.405, 52.52], "Cairo": [31.2357, 30.0444],
    "Lagos": [3.3792, 6.5244], "Dubai": [55.2708, 25.2048],
    "Mumbai": [72.8777, 19.076], "Singapore": [103.8198, 1.3521],
    "Tokyo": [139.6503, 35.6762], "Seoul": [126.978, 37.5665],
    "Sydney": [151.2093, -33.8688], "Johannesburg": [28.0473, -26.2041]
  };

  const REPORT_SOURCE_META = {
    sansDiary: { name: "SANS ISC", tag: "SANS ISC · DIARIO", css: "sans", kind: "Investigación de sensores", host: "isc.sans.edu", mark: "S" },
    cisaAdvisories: { name: "CISA", tag: "CISA · AVISO", css: "cisa", kind: "Aviso oficial", host: "cisa.gov", mark: "C" },
    ukNcsc: { name: "UK National Cyber Security Centre", tag: "REINO UNIDO · NCSC", css: "ncsc", kind: "Aviso y guía oficial", host: "ncsc.gov.uk", mark: "N" },
    certEu: { name: "CERT-EU", tag: "UNIÓN EUROPEA · CERT-EU", css: "eu", kind: "Aviso de seguridad", host: "cert.europa.eu", mark: "E" },
    canadaCyber: { name: "Canadian Cyber Centre", tag: "CANADÁ · CYBER CENTRE", css: "canada", kind: "Alerta y advisory", host: "cyber.gc.ca", mark: "C" },
    acscAustralia: { name: "Australian Cyber Security Centre", tag: "AUSTRALIA · ACSC", css: "australia", kind: "Alerta de seguridad", host: "cyber.gov.au", mark: "A" },
    certSe: { name: "CERT-SE Sweden", tag: "SUECIA · CERT-SE", css: "sweden", kind: "Aviso de seguridad", host: "cert.se", mark: "S" },
    certUa: { name: "CERT-UA Ukraine", tag: "UCRANIA · CERT-UA", css: "ukraine", kind: "Análisis de amenazas", host: "cert.gov.ua", mark: "U" }
  };

  let map = null;
  let mapReady = false;
  let latest = null;
  let historyItems = [];
  let installPrompt = null;
  let refreshInProgress = false;
  let activeMapMode = "cyber";
  let radarFrames = [];
  let radarHost = "";
  let radarFetchedAt = 0;
  let radarLoading = false;
  let radarPlayback = null;
  let weatherRequestController = null;
  let weatherGridFetchedAt = 0;
  let weatherGridLoading = false;
  let weatherGridRecords = [];
  let weatherForecastTimes = [];
  let weatherTimeIndex = 0;
  let weatherPlaybackHandle = null;
  let orbitalTrailRefreshAt = 0;

  const RADAR_METADATA_URL = "https://api.rainviewer.com/public/weather-maps.json";
  const RADAR_REFRESH_MIN_MS = 5 * 60 * 1000;
  const WEATHER_CURRENT_FIELDS = [
    "temperature_2m", "apparent_temperature", "relative_humidity_2m",
    "cloud_cover", "precipitation", "rain", "showers", "snowfall",
    "pressure_msl", "surface_pressure", "wind_speed_10m", "wind_direction_10m",
    "wind_gusts_10m", "weather_code", "is_day"
  ].join(",");
  const WEATHER_GRID_COORDS = [];
  for (let latitude = -82.5; latitude <= 82.5; latitude += 15) {
    for (let longitude = -172.5; longitude <= 172.5; longitude += 15) {
      WEATHER_GRID_COORDS.push({ latitude, longitude });
    }
  }
  const WEATHER_HOURLY_FIELDS = [
    "temperature_2m", "apparent_temperature", "dew_point_2m", "relative_humidity_2m",
    "precipitation", "rain", "showers", "snowfall", "weather_code", "cloud_cover",
    "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high", "pressure_msl",
    "surface_pressure", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
    "uv_index", "shortwave_radiation", "visibility", "cape", "soil_moisture_0_to_7cm",
    "is_day"
  ].join(",");
  const WEATHER_GRID_REFRESH_MS = 60 * 60 * 1000;
  const WEATHER_CACHE_KEY = "nexus-weather-grid-v3";
  const ORBITAL_CACHE_KEY = "nexus-civil-weather-omm-v2";
  const WEATHER_VISUALS = {
    temperature: { label: "TEMPERATURA", property: "temperature", stops: [-35, "#3859a8", -10, "#398bc5", 5, "#54b9a9", 20, "#d6c85e", 35, "#e87950", 48, "#a93d65"] },
    precipitation: { label: "PRECIPITACIÓN", property: "precipitation", stops: [0, "#233c65", 0.2, "#397dbc", 1, "#39b9bd", 3, "#62c978", 8, "#e4ca53", 20, "#e97d42", 50, "#bd3c62"] },
    wind: { label: "VIENTO", property: "windSpeed", stops: [0, "#275b96", 10, "#36a3bd", 25, "#54c982", 45, "#e1c34e", 70, "#e98046", 100, "#b64464"] },
    humidity: { label: "HUMEDAD", property: "humidity", stops: [0, "#c17b4b", 20, "#d1b95d", 40, "#7dbd83", 60, "#3eafad", 80, "#367fbe", 100, "#4d58a5"] },
    clouds: { label: "NUBOSIDAD TOTAL", property: "cloudCover", stops: [0, "#14283b", 20, "#3c637e", 40, "#6d94a8", 60, "#a7bac5", 80, "#d0d6d8", 100, "#ffffff"] },
    cloudLow: { label: "NUBES BAJAS", property: "cloudLow", stops: [0, "#172d42", 20, "#426c89", 40, "#6a9bb0", 60, "#91b8c5", 80, "#c6dce0", 100, "#ffffff"] },
    cloudMid: { label: "NUBES MEDIAS", property: "cloudMid", stops: [0, "#182841", 20, "#4e5d8e", 40, "#6a80b2", 60, "#8ea4cc", 80, "#c0cce0", 100, "#ffffff"] },
    cloudHigh: { label: "NUBES ALTAS", property: "cloudHigh", stops: [0, "#1b2940", 20, "#596889", 40, "#8292b1", 60, "#abb9cd", 80, "#d2dce7", 100, "#ffffff"] },
    pressure: { label: "PRESIÓN", property: "pressure", stops: [940, "#7450a1", 970, "#447ac2", 990, "#3cb5b2", 1010, "#72bd77", 1030, "#d8bd4f", 1055, "#d66e48"] },
    uv: { label: "ÍNDICE UV", property: "uvIndex", stops: [0, "#358c69", 2, "#75b85e", 5, "#e3d45b", 7, "#e99b4f", 10, "#ce5262", 14, "#8c4baf"] },
    radiation: { label: "RADIACIÓN SOLAR", property: "radiation", stops: [0, "#223b63", 100, "#397eb7", 300, "#4bbd9c", 500, "#e5cb57", 800, "#e88d48", 1100, "#bd4b53"] },
    visibility: { label: "VISIBILIDAD", property: "visibility", stops: [0, "#b34c63", 1000, "#d98058", 5000, "#e2bd61", 10000, "#74bd9b", 20000, "#3686ba", 40000, "#495da8"] },
    cape: { label: "ENERGÍA CONVECTIVA · CAPE", property: "cape", stops: [0, "#25416a", 250, "#397eb7", 750, "#44b99b", 1500, "#e5ca55", 2500, "#e77a4b", 4000, "#a9426c"] },
    soilMoisture: { label: "HUMEDAD DEL SUELO", property: "soilMoisture", stops: [0, "#c17b4b", 0.05, "#d2b65b", 0.12, "#89bd78", 0.22, "#3cae9c", 0.35, "#386eb1", 0.5, "#3a4c83"] }
  };
  const ORBITAL_GROUP_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=WEATHER&FORMAT=JSON";
  const ORBITAL_REFRESH_MS = 2 * 60 * 60 * 1000;
  const CIVIL_WEATHER_MISSION = /^(NOAA(?:\s|$)|SUOMI NPP|METOP(?:-|\s|$)|METEOSAT|GOES(?:\s|$)|HIMAWARI|METEOR-M|ARKTIKA-M|INSAT-3D|GEO-KOMPSAT|ELEKTRO-L|SENTINEL-3|MTG-)/i;
  let activeWeatherVariable = "temperature";
  let orbitalViewer = null;
  let orbitalSatellites = [];
  let orbitalFetchedAt = 0;
  let orbitalLoading = false;
  let orbitalTickHandle = null;
  let satelliteModulePromise = null;

  function safeText(node, value) {
    node.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
  }

  function addText(parent, tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value == null ? "" : String(value);
    parent.appendChild(node);
    return node;
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function ageLabel(value) {
    const date = parseDate(value);
    if (!date) return "sin fecha";
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return "hace menos de un minuto";
    if (minutes < 60) return "hace " + minutes + " min";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return "hace " + hours + " h";
    return "hace " + Math.floor(hours / 24) + " días";
  }

  function dateLabel(value) {
    const date = parseDate(value);
    if (!date) return "fecha no disponible";
    return date.toLocaleString("es-AR", {
      timeZone: "UTC", day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false
    }) + " UTC";
  }

  function setPill(status, text) {
    const pill = $("overallStatus");
    const allowed = ["online", "degraded", "offline", "pending"];
    pill.className = "status-pill " + (allowed.includes(status) ? status : "pending");
    safeText(pill.querySelector("span"), text);
  }

  function setFeedState(id, infoId, status, info, lastSuccess) {
    const state = $(id);
    const labels = { ok: "ACTIVA", stale: "ANTERIOR", error: "SIN DATOS", pending: "PENDIENTE" };
    const className = status === "ok" ? "ok" : status === "stale" ? "stale" : status === "error" ? "error" : "pending";
    state.className = "feed-state " + className;
    safeText(state, labels[status] || "PENDIENTE");
    safeText($(infoId), info || (lastSuccess ? "Última lectura " + ageLabel(lastSuccess) : "Esperando lectura válida…"));
  }

  function renderMetrics(dshield, cisa) {
    const day = dshield && dshield.latestDay ? dshield.latestDay : null;
    safeText($("dailyReports"), day ? fmt(day.reports) : "—");
    safeText($("dailySources"), day ? fmt(day.sources) : "—");
    safeText($("dailyTargets"), day ? fmt(day.targets) : "—");
    safeText($("dailyDate"), day && day.date ? "DShield · " + day.date + " UTC" : "DShield · día no disponible");
    safeText($("kevTotal"), cisa && cisa.totalVulnerabilities !== null && cisa.totalVulnerabilities !== undefined && Number.isFinite(Number(cisa.totalVulnerabilities)) ? fmt(cisa.totalVulnerabilities) : "—");

    const infocon = dshield && dshield.infocon ? String(dshield.infocon).toUpperCase() : "—";
    const infoconNode = $("infoconValue");
    safeText(infoconNode, infocon);
    infoconNode.className = "infocon-value " + (["GREEN", "YELLOW", "ORANGE", "RED"].includes(infocon) ? "level-" + infocon.toLowerCase() : "");
    safeText($("infoconCaption"), "Nivel global comunicado por SANS ISC");
  }

  function renderHistory(dshield) {
    const container = $("historyBars");
    container.replaceChildren();
    const rows = Array.isArray(dshield && dshield.dailyHistory) ? dshield.dailyHistory.slice(-30) : [];
    if (!rows.length) {
      addText(container, "p", "empty-state", "Todavía no hay historial de sensores disponible.");
      return;
    }
    const max = Math.max(1, ...rows.map((row) => Number(row.reports) || 0));
    rows.forEach((row) => {
      const item = document.createElement("div");
      item.className = "history-column";
      const bar = document.createElement("div");
      bar.className = "history-bar";
      const value = Math.max(2, (Number(row.reports || 0) / max) * 100);
      bar.style.height = value + "%";
      bar.title = row.date + " · " + fmt(row.reports) + " reportes";
      const label = document.createElement("small");
      label.textContent = String(row.date || "").slice(8, 10);
      item.append(bar, label);
      container.appendChild(item);
    });
  }

  function renderCountries(dshield) {
    const list = $("countryList");
    list.replaceChildren();
    const rows = Array.isArray(dshield && dshield.countryAggregates) ? dshield.countryAggregates.slice(0, 10) : [];
    if (!rows.length) {
      addText(list, "p", "empty-state", "La fuente no entregó suficientes datos de país para dibujar marcadores.");
      return;
    }
    const max = Math.max(1, ...rows.map((row) => Number(row.reports) || 0));
    rows.forEach((row) => {
      const line = document.createElement("div");
      line.className = "country-row";
      const name = document.createElement("span");
      name.className = "country-name";
      name.textContent = row.countryName || row.countryCode || "País";
      const track = document.createElement("div");
      track.className = "country-track";
      const fill = document.createElement("i");
      fill.style.width = Math.max(3, (Number(row.reports || 0) / max) * 100) + "%";
      track.appendChild(fill);
      const count = document.createElement("b");
      count.textContent = fmt(row.reports);
      line.append(name, track, count);
      list.appendChild(line);
    });
  }

  function renderSources(dshield) {
    const feed = $("sourceFeed");
    feed.replaceChildren();
    const rows = Array.isArray(dshield && dshield.topObservedSources) ? dshield.topObservedSources.slice(0, 12) : [];
    if (!rows.length) {
      addText(feed, "p", "empty-state", "No hay registros destacados disponibles.");
      return;
    }
    rows.forEach((row, index) => {
      const card = document.createElement("div");
      card.className = "observed-row";
      const rank = addText(card, "span", "observed-rank", String(index + 1).padStart(2, "0"));
      const content = document.createElement("div");
      content.className = "observed-content";
      addText(content, "b", "", row.countryName || "País no disponible");
      addText(content, "small", "", fmt(row.reports) + " reportes · " + fmt(row.uniqueTargets) + " destinos únicos asociados al registro");
      const meta = addText(content, "small", "observed-date", "Última observación: " + (row.lastSeen || "sin fecha"));
      card.append(rank, content);
      feed.appendChild(card);
    });
  }

  function renderReports(reports) {
    const container = $("reportsList");
    container.replaceChildren();
    const currentItems = Array.isArray(reports && reports.items) ? reports.items : [];
    const merged = new Map();
    [...historyItems, ...currentItems].forEach((item) => {
      if (item && typeof item.url === "string" && item.url.startsWith("https://")) merged.set(item.url, item);
    });
    const allItems = [...merged.values()].sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || ""))).slice(0, 2000);
    const query = (($("reportSearch") && $("reportSearch").value) || "").trim().toLocaleLowerCase("es");
    const sourceFilter = ($("reportSourceFilter") && $("reportSourceFilter").value) || "all";
    const filteredItems = allItems.filter((item) => {
      if (sourceFilter !== "all" && item.sourceKey !== sourceFilter) return false;
      const haystack = [item.title, item.sourceName, item.kind].filter(Boolean).join(" ").toLocaleLowerCase("es");
      return !query || haystack.includes(query);
    });
    const items = filteredItems.slice(0, 100);
    safeText($("reportCount"), filteredItems.length + " resultados · " + items.length + " mostrados");
    let rendered = 0;
    if (!items.length) {
      addText(container, "p", "empty-state", allItems.length
        ? "No hay publicaciones que coincidan con esos filtros."
        : "Todavía no hay investigaciones o avisos disponibles.");
      return;
    }

    items.forEach((item) => {
      const source = REPORT_SOURCE_META[item.sourceKey];
      if (!source || !item.title || !item.url) return;
      let parsedUrl;
      try { parsedUrl = new URL(item.url); }
      catch { return; }
      const host = parsedUrl.hostname.toLowerCase();
      const officialHost = parsedUrl.protocol === "https:" &&
        (host === source.host || host.endsWith("." + source.host));
      if (!officialHost) return;

      const card = document.createElement("article");
      card.className = "report-card";
      const meta = document.createElement("div");
      meta.className = "report-meta";
      addText(meta, "span", "report-source " + source.css, source.tag);
      addText(meta, "time", "", item.publishedAt ? dateLabel(item.publishedAt) : "Fecha no disponible");

      const link = document.createElement("a");
      link.href = parsedUrl.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.title;

      addText(card, "p", "report-kind", (item.kind || source.kind) + " · publicación oficial; no confirma por sí sola un incidente activo");
      card.append(meta, link);
      container.appendChild(card);
      rendered += 1;
    });

    if (!rendered) addText(container, "p", "empty-state", query || sourceFilter !== "all"
      ? "No hay publicaciones que coincidan con esos filtros."
      : "No hay publicaciones válidas de las fuentes autorizadas.");
  }

  function renderReportSourceHealth(reports) {
    const container = $("reportSourcesHealth");
    if (!container) return;
    container.replaceChildren();
    const states = reports && reports.sourceStates ? reports.sourceStates : {};

    Object.entries(REPORT_SOURCE_META).forEach(([key, source]) => {
      const state = states[key] || {};
      const status = state.status || "pending";
      const row = document.createElement("div");
      row.className = "source-row report-health-row";
      addText(row, "span", "source-mark reports-mark " + source.css, source.mark);

      const content = document.createElement("div");
      addText(content, "b", "", source.name);
      const count = Number(state.itemCount || 0);
      let detail = count + " publicaciones";
      if (state.lastSuccessfulAt) detail += " · " + ageLabel(state.lastSuccessfulAt);
      else if (status === "ok") detail = count ? detail : "Fuente disponible · sin publicaciones recientes";
      else if (status === "error") detail = "No hay una lectura válida";
      else detail += " · esperando lectura";
      addText(content, "small", "", detail);

      const labels = { ok: "ACTIVA", stale: "ANTERIOR", error: "SIN DATOS", pending: "PENDIENTE" };
      const cssStatus = status === "ok" ? "ok" : status === "stale" ? "stale" :
        status === "error" ? "error" : "pending";
      row.appendChild(content);
      addText(row, "span", "feed-state " + cssStatus, labels[status] || "PENDIENTE");
      container.appendChild(row);
    });
  }


  function renderKev(cisa) {
    const grid = $("kevList");
    grid.replaceChildren();
    const rows = Array.isArray(cisa && cisa.recent) ? cisa.recent.slice(0, 12) : [];
    if (!rows.length) {
      addText(grid, "p", "empty-state", "El catálogo CISA todavía no está disponible.");
      return;
    }
    rows.forEach((row) => {
      const card = document.createElement("article");
      card.className = "kev-card";
      const top = document.createElement("div");
      top.className = "kev-top";
      const cve = document.createElement("a");
      cve.href = row.nvdUrl || ("https://nvd.nist.gov/vuln/detail/" + encodeURIComponent(row.cveId || ""));
      cve.target = "_blank";
      cve.rel = "noopener noreferrer";
      cve.textContent = row.cveId || "CVE no disponible";
      const badge = addText(top, "span", row.ransomwareUse === "Known" ? "ransomware-known" : "ransomware-unknown",
        row.ransomwareUse === "Known" ? "RANSOMWARE: CONOCIDO" : "USO EN RANSOMWARE: " + (row.ransomwareUse || "DESCONOCIDO").toUpperCase());
      top.appendChild(cve);
      const title = addText(card, "h3", "", row.name || "Vulnerabilidad sin título");
      addText(card, "p", "kev-product", (row.vendor || "Proveedor no indicado") + " · " + (row.product || "Producto no indicado"));
      addText(card, "p", "kev-description", row.description || "Sin descripción disponible en el registro.");
      addText(card, "small", "kev-date", "Añadida al catálogo: " + (row.dateAdded || "fecha no disponible"));
      card.prepend(top);
      grid.appendChild(card);
    });
  }

  function renderSourceHealth(data) {
    const feeds = data && data.feeds ? data.feeds : {};
    const dshield = feeds.dshield || {};
    const cisa = feeds.cisaKev || {};
    setFeedState("dshieldState", "dshieldInfo", dshield.status,
      dshield.status === "ok" ? "Última lectura " + ageLabel(dshield.lastSuccessfulAt) :
      dshield.status === "stale" ? "Sin conexión actual · última lectura " + ageLabel(dshield.lastSuccessfulAt) :
      "No hay una lectura válida todavía", dshield.lastSuccessfulAt);
    setFeedState("cisaState", "cisaInfo", cisa.status,
      cisa.status === "ok" ? "Catálogo " + (cisa.catalogVersion || "actual") + " · " + ageLabel(cisa.lastSuccessfulAt) :
      cisa.status === "stale" ? "Sin conexión actual · última lectura " + ageLabel(cisa.lastSuccessfulAt) :
      "No hay una lectura válida todavía", cisa.lastSuccessfulAt);

    const reports = feeds.reports || {};
    renderReportSourceHealth(reports);

    const successful = [dshield, cisa, reports].filter((feed) => feed.status === "ok");
    const stale = [dshield, cisa, reports].filter((feed) => feed.status === "stale");
    if (successful.length === 3) setPill("online", "Fuentes actualizadas");
    else if (successful.length || stale.length) setPill("degraded", "Datos parciales / anteriores");
    else setPill("pending", "Esperando fuentes públicas");

    safeText($("snapshotState"), data && data.generatedAt ? "Snapshot recibido" : "Esperando primer snapshot");
    safeText($("snapshotAge"), data && data.generatedAt ? ageLabel(data.generatedAt) : "—");
    safeText($("lastUpdated"), data && data.generatedAt ? "Snapshot: " + dateLabel(data.generatedAt) : "Esperando primer conjunto de datos…");
  }

  function updateMap(dshield) {
    if (!mapReady || !map || !map.getSource("nexus-country-observations")) return;
    const rows = Array.isArray(dshield && dshield.countryAggregates) ? dshield.countryAggregates : [];
    const features = rows
      .filter((row) => Number.isFinite(Number(row.longitude)) && Number.isFinite(Number(row.latitude)))
      .map((row) => ({
        type: "Feature",
        properties: {
          countryCode: String(row.countryCode || ""),
          countryName: String(row.countryName || "País no disponible"),
          sourceRecords: Math.max(0, Number(row.sourceRecords) || 0),
          reports: Math.max(0, Number(row.reports) || 0),
          latestSeen: String(row.latestSeen || "")
        },
        geometry: { type: "Point", coordinates: [Number(row.longitude), Number(row.latitude)] }
      }));
    map.getSource("nexus-country-observations").setData({ type: "FeatureCollection", features });
    safeText($("mapStatus"), features.length
      ? features.length + " países con registros en la muestra de origen"
      : "Sin geodatos suficientes; no se dibujan ubicaciones estimadas");
  }

  function popupNode(title, lines, disclaimer) {
    const root = document.createElement("div");
    root.className = "intel-popup";
    addText(root, "strong", "", title);
    lines.forEach(([label, value]) => {
      const row = document.createElement("div");
      const key = addText(row, "span", "", label);
      const val = addText(row, "b", "", value);
      root.append(row);
    });
    addText(root, "small", "", disclaimer);
    return root;
  }

  function windArrow(degrees) {
    if (!Number.isFinite(Number(degrees))) return "·";
    const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
    return arrows[Math.round((((Number(degrees) % 360) + 360) % 360) / 45) % 8];
  }

  function weatherCellGeometry(latitude, longitude) {
    const half = 7.5;
    const west = longitude - half;
    const east = longitude + half;
    const south = Math.max(-90, latitude - half);
    const north = Math.min(90, latitude + half);
    return {
      type: "Polygon",
      coordinates: [[
        [west, south], [east, south], [east, north], [west, north], [west, south]
      ]]
    };
  }

  const WEATHER_HOURLY_PROPERTY_MAP = {
    temperature: "temperature_2m", feelsLike: "apparent_temperature", dewPoint: "dew_point_2m",
    humidity: "relative_humidity_2m", cloudCover: "cloud_cover", cloudLow: "cloud_cover_low",
    cloudMid: "cloud_cover_mid", cloudHigh: "cloud_cover_high", precipitation: "precipitation",
    rain: "rain", showers: "showers", snowfall: "snowfall", pressure: "pressure_msl",
    surfacePressure: "surface_pressure", windSpeed: "wind_speed_10m", windDirection: "wind_direction_10m",
    windGusts: "wind_gusts_10m", uvIndex: "uv_index", radiation: "shortwave_radiation",
    visibility: "visibility", cape: "cape", soilMoisture: "soil_moisture_0_to_7cm",
    weatherCode: "weather_code", isDay: "is_day"
  };

  function formatWeatherTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || "Hora no disponible");
    return date.toLocaleString("es-AR", {
      timeZone: "UTC", weekday: "short", day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", hour12: false
    }) + " UTC";
  }

  function applyWeatherVariable(key) {
    const visual = WEATHER_VISUALS[key] || WEATHER_VISUALS.temperature;
    activeWeatherVariable = WEATHER_VISUALS[key] ? key : "temperature";
    const expression = ["interpolate", ["linear"], ["coalesce", ["get", visual.property], 0]];
    for (let i = 0; i < visual.stops.length; i += 2) {
      expression.push(visual.stops[i], visual.stops[i + 1]);
    }
    if (mapReady && map && map.getLayer("nexus-weather-cells-fill")) {
      map.setPaintProperty("nexus-weather-cells-fill", "fill-color", expression);
      map.setFilter("nexus-weather-cells-fill", ["has", visual.property]);
      map.setLayoutProperty("nexus-weather-grid-wind", "visibility", activeWeatherVariable === "wind" ? "visible" : "none");
      map.setLayoutProperty("nexus-weather-grid-points", "visibility", "visible");
      map.triggerRepaint();
    }
    safeText($("weatherLegendLabel"), visual.label);
    const select = $("weatherVariableSelect");
    if (select && select.value !== activeWeatherVariable) select.value = activeWeatherVariable;
    if (weatherForecastTimes.length) {
      const slider = $("weatherTimeSlider");
      if (slider) slider.max = String(weatherForecastTimes.length - 1);
      applyWeatherForecastFrame(weatherTimeIndex);
    }
  }

  function pauseWeatherForecast() {
    if (weatherPlaybackHandle) {
      window.clearInterval(weatherPlaybackHandle);
      weatherPlaybackHandle = null;
    }
    const button = $("weatherPlayBtn");
    if (button) safeText(button, "▶ ANIMAR PRONÓSTICO");
  }

  function applyWeatherForecastFrame(index) {
    if (!weatherGridRecords.length || !weatherForecastTimes.length || !mapReady || !map) return;
    const last = weatherForecastTimes.length - 1;
    weatherTimeIndex = Math.max(0, Math.min(last, Number(index) || 0));
    const time = weatherForecastTimes[weatherTimeIndex];
    const pointFeatures = [];
    const cellFeatures = [];
    weatherGridRecords.forEach((record, recordIndex) => {
      const properties = {};
      Object.entries(WEATHER_HOURLY_PROPERTY_MAP).forEach(([property, field]) => {
        const values = record.hourly && record.hourly[field];
        const raw = Array.isArray(values) ? values[weatherTimeIndex] : null;
        const value = raw === null || raw === undefined || raw === "" ? null : Number(raw);
        if (Number.isFinite(value)) properties[property] = value;
      });
      if (!Number.isFinite(properties.temperature)) return;
      properties.windArrow = windArrow(properties.windDirection);
      properties.time = String(time);
      const coordinates = [record.longitude, record.latitude];
      pointFeatures.push({
        type: "Feature", properties,
        geometry: { type: "Point", coordinates }
      });
      const gridPoint = WEATHER_GRID_COORDS[record.gridIndex] || record;
      cellFeatures.push({
        type: "Feature", properties,
        geometry: weatherCellGeometry(gridPoint.latitude, gridPoint.longitude)
      });
    });
    const pointSource = map.getSource("nexus-weather-grid");
    const cellSource = map.getSource("nexus-weather-cells");
    if (!pointSource || !cellSource) return;
    pointSource.setData({ type: "FeatureCollection", features: pointFeatures });
    cellSource.setData({ type: "FeatureCollection", features: cellFeatures });
    const slider = $("weatherTimeSlider");
    if (slider) {
      slider.max = String(last);
      slider.value = String(weatherTimeIndex);
      slider.disabled = false;
    }
    safeText($("weatherTimeLabel"), formatWeatherTime(time) + " · " + (weatherTimeIndex + 1) + "/" + weatherForecastTimes.length);
    safeText($("weatherCoverageCount"), cellFeatures.length + " CELDAS ACTIVAS");
    const visual = WEATHER_VISUALS[activeWeatherVariable] || WEATHER_VISUALS.temperature;
    safeText($("weatherGridStatus"), cellFeatures.length + " celdas globales · " + visual.label.toLowerCase() + " · pronóstico horario de Open-Meteo");
    map.triggerRepaint();
  }

  async function loadWeatherGrid() {
    if (!mapReady || weatherGridLoading) return;
    const pointSource = map.getSource("nexus-weather-grid");
    const cellSource = map.getSource("nexus-weather-cells");
    if (!pointSource || !cellSource) return;

    let cached = null;
    if (!weatherGridRecords.length) {
      try { cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || "null"); }
      catch (error) { console.warn("NEXUS weather cache read:", error); }
      if (cached && Array.isArray(cached.records) && cached.records.length >= 200 &&
          Array.isArray(cached.forecastTimes) && cached.forecastTimes.length >= 12 &&
          Number.isFinite(Number(cached.fetchedAt)) &&
          cached.records.every((record) => record && record.hourly && Number.isFinite(Number(record.gridIndex)))) {
        weatherGridRecords = cached.records;
        weatherForecastTimes = cached.forecastTimes;
        weatherGridFetchedAt = Number(cached.fetchedAt);
        applyWeatherForecastFrame(0);
        safeText($("weatherGridStatus"), weatherGridRecords.length + " ubicaciones restauradas · " +
          weatherForecastTimes.length + " horas de pronóstico · comprobando actualización");
      }
    }

    if (weatherGridRecords.length && Date.now() - weatherGridFetchedAt < WEATHER_GRID_REFRESH_MS) {
      applyWeatherVariable(activeWeatherVariable);
      applyWeatherForecastFrame(weatherTimeIndex);
      safeText($("mapStatus"), "Pronóstico global en caché · " + weatherGridRecords.length + " ubicaciones · datos guardados localmente");
      return;
    }

    weatherGridLoading = true;
    const button = $("loadWeatherGridBtn");
    if (button) { button.disabled = true; safeText(button, "CONSULTANDO MODELO…"); }
    safeText($("weatherGridStatus"), weatherGridRecords.length
      ? "Actualizando el pronóstico; la última malla válida permanece visible…"
      : "Descargando el modelo mundial · 288 ubicaciones · pronóstico de 24 horas…");

    try {
      const query = new URLSearchParams({
        latitude: WEATHER_GRID_COORDS.map((point) => point.latitude).join(","),
        longitude: WEATHER_GRID_COORDS.map((point) => point.longitude).join(","),
        current: WEATHER_CURRENT_FIELDS,
        hourly: WEATHER_HOURLY_FIELDS,
        forecast_hours: "24",
        wind_speed_unit: "kmh",
        precipitation_unit: "mm",
        timezone: "GMT"
      });
      const response = await fetch("https://api.open-meteo.com/v1/forecast?" + query.toString(), {
        method: "GET", cache: "no-store", headers: { "Accept": "application/json" }
      });
      if (!response.ok) throw new Error("Open-Meteo respondió " + response.status);
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : [payload];
      if (rows.length !== WEATHER_GRID_COORDS.length) {
        throw new Error("El proveedor devolvió " + rows.length + " ubicaciones; se esperaban " + WEATHER_GRID_COORDS.length + ".");
      }
      const forecastTimes = rows.find((row) => row && row.hourly && Array.isArray(row.hourly.time))?.hourly.time || [];
      if (forecastTimes.length < 12) throw new Error("El proveedor devolvió menos de 12 horas de pronóstico.");
      const numberOrNull = (value) => value === null || value === undefined || value === "" || !Number.isFinite(Number(value))
        ? null : Number(value);
      const records = [];
      rows.forEach((row, index) => {
        const current = row && row.current;
        const hourly = row && row.hourly;
        const gridPoint = WEATHER_GRID_COORDS[index];
        if (!current || !hourly || !gridPoint) return;
        const hourlyValues = {};
        WEATHER_HOURLY_FIELDS.split(",").forEach((field) => {
          hourlyValues[field] = Array.isArray(hourly[field]) ? hourly[field] : [];
        });
        if (!hourlyValues.temperature_2m.some((value) => numberOrNull(value) !== null)) return;
        records.push({
          gridIndex: index,
          latitude: Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : gridPoint.latitude,
          longitude: Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : gridPoint.longitude,
          current: {
            temperature: numberOrNull(current.temperature_2m),
            feelsLike: numberOrNull(current.apparent_temperature),
            humidity: numberOrNull(current.relative_humidity_2m),
            cloudCover: numberOrNull(current.cloud_cover),
            precipitation: numberOrNull(current.precipitation),
            pressure: numberOrNull(current.pressure_msl),
            windSpeed: numberOrNull(current.wind_speed_10m),
            windDirection: numberOrNull(current.wind_direction_10m),
            windGusts: numberOrNull(current.wind_gusts_10m),
            weatherCode: numberOrNull(current.weather_code),
            isDay: numberOrNull(current.is_day),
            time: String(current.time || "")
          },
          hourly: hourlyValues
        });
      });

      if (records.length < 200) {
        throw new Error("El pronóstico global entregó solo " + records.length + " ubicaciones válidas; se conserva la última malla buena.");
      }
      weatherGridRecords = records;
      weatherForecastTimes = forecastTimes.map(String);
      weatherGridFetchedAt = Date.now();
      weatherTimeIndex = 0;
      try {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
          fetchedAt: weatherGridFetchedAt, forecastTimes: weatherForecastTimes, records
        }));
      } catch (error) { console.warn("NEXUS weather cache write:", error); }

      applyWeatherVariable(activeWeatherVariable);
      applyWeatherForecastFrame(0);
      safeText($("mapStatus"), "Pronóstico global cargado · " + records.length + " ubicaciones · " + weatherForecastTimes.length + " horas");
    } catch (error) {
      console.warn("NEXUS global weather grid:", error);
      safeText($("weatherGridStatus"), "No se pudo actualizar el pronóstico: " + (error.message || "error de red") +
        (weatherGridRecords.length ? ". Se conserva la última malla guardada." : ". Probá más tarde."));
      safeText($("mapStatus"), weatherGridRecords.length
        ? "Pronóstico meteorológico guardado · actualización pendiente"
        : "Fuente meteorológica temporalmente no disponible");
    } finally {
      weatherGridLoading = false;
      if (button) { button.disabled = false; safeText(button, "ACTUALIZAR MODELO"); }
    }
  }

  function showWeatherPointPopup(event) {
    const feature = event.features && event.features[0];
    if (!feature) return;
    const p = feature.properties || {};
    const lines = [
      ["Temperatura", displayNumber(p.temperature, 1, " °C")],
      ["Sensación térmica", displayNumber(p.feelsLike, 1, " °C")],
      ["Punto de rocío", displayNumber(p.dewPoint, 1, " °C")],
      ["Humedad relativa", displayNumber(p.humidity, 0, " %")],
      ["Nubosidad total", displayNumber(p.cloudCover, 0, " %")],
      ["Nubes bajas / medias / altas", [displayNumber(p.cloudLow, 0, "%"), displayNumber(p.cloudMid, 0, "%"), displayNumber(p.cloudHigh, 0, "%")].join(" / ")],
      ["Precipitación", displayNumber(p.precipitation, 1, " mm")],
      ["Lluvia / chubascos / nieve", [displayNumber(p.rain, 1, " mm"), displayNumber(p.showers, 1, " mm"), displayNumber(p.snowfall, 1, " cm")].join(" / ")],
      ["Presión a nivel del mar", displayNumber(p.pressure, 0, " hPa")],
      ["Viento", displayNumber(p.windSpeed, 1, " km/h") + " · " + windDirectionLabel(p.windDirection)],
      ["Ráfagas", displayNumber(p.windGusts, 1, " km/h")],
      ["Índice UV", displayNumber(p.uvIndex, 1)],
      ["Radiación solar", displayNumber(p.radiation, 0, " W/m²")],
      ["Visibilidad", displayNumber(p.visibility, 0, " m")],
      ["CAPE", displayNumber(p.cape, 0, " J/kg")],
      ["Humedad del suelo", displayNumber(p.soilMoisture, 3, " m³/m³")],
      ["Código WMO", displayNumber(p.weatherCode, 0)],
      ["Día/noche", Number(p.isDay) === 1 ? "Día" : Number(p.isDay) === 0 ? "Noche" : "—"],
      ["Hora pronosticada", p.time || "No disponible"]
    ];
    const node = popupNode("Celda de pronóstico meteorológico", lines,
      "Open-Meteo · estimación horaria de modelo interpolada a una malla mundial de referencia de 15 grados; no es una medición de estación.");
    new maplibregl.Popup({ closeButton: true, maxWidth: "330px" })
      .setLngLat(event.lngLat).setDOMContent(node).addTo(map);
  }

  function windDirectionLabel(degrees) {
    if (!Number.isFinite(Number(degrees))) return "—";
    const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return labels[Math.round(((Number(degrees) % 360) + 360) % 360 / 45) % 8];
  }

  function displayNumber(value, digits = 0, suffix = "") {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(digits) + suffix : "—";
  }

  function pauseRadarPlayback() {
    if (radarPlayback) {
      window.clearInterval(radarPlayback);
      radarPlayback = null;
    }
    const button = $("radarPlayBtn");
    if (button) safeText(button, "▶ REPRODUCIR");
  }

  function radarTileUrl(frame) {
    return radarHost + frame.path + "/256/{z}/{x}/{y}/2/0_0.png";
  }

  function showRadarFrame(index) {
    if (!radarFrames.length || !mapReady) return;
    const nextIndex = Math.max(0, Math.min(radarFrames.length - 1, Number(index) || 0));
    const frame = radarFrames[nextIndex];
    radarFrames.currentIndex = nextIndex;
    const source = map.getSource("nexus-radar");
    if (source && typeof source.setTiles === "function") source.setTiles([radarTileUrl(frame)]);
    const slider = $("radarTimeSlider");
    if (slider) {
      slider.max = String(radarFrames.length - 1);
      slider.value = String(nextIndex);
      slider.disabled = false;
    }
    safeText($("radarFrameTime"), new Date(frame.time * 1000).toLocaleString("es-AR", {
      timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false
    }) + " UTC · cuadro " + (nextIndex + 1) + "/" + radarFrames.length);
  }

  async function loadRadarFrames(force = false) {
    if (!mapReady || radarLoading) return;
    if (radarFrames.length && Date.now() - radarFetchedAt < RADAR_REFRESH_MIN_MS) {
      showRadarFrame(radarFrames.length - 1);
      safeText($("mapStatus"), "Modelo global · campos meteorológicos sobre todo el globo");
      return;
    }

    radarLoading = true;
    const loadButton = $("loadRadarBtn");
    if (loadButton) {
      loadButton.disabled = true;
      safeText(loadButton, "CONSULTANDO…");
    }
    safeText($("radarFrameTime"), "Consultando metadatos de radar…");

    try {
      const response = await fetch(RADAR_METADATA_URL, {
        method: "GET",
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) throw new Error("Radar no disponible (" + response.status + ")");
      const data = await response.json();
      const hostUrl = new URL(String(data.host || ""));
      if (hostUrl.protocol !== "https:" || hostUrl.hostname !== "tilecache.rainviewer.com") {
        throw new Error("El proveedor devolvió un servidor de mosaicos no reconocido.");
      }
      const frames = data && data.radar && Array.isArray(data.radar.past) ? data.radar.past : [];
      const validFrames = frames.filter((frame) =>
        Number.isFinite(Number(frame.time)) &&
        typeof frame.path === "string" &&
        /^\/v2\/radar\/[A-Za-z0-9]+$/.test(frame.path)
      ).sort((a, b) => Number(a.time) - Number(b.time)).slice(-13);
      if (!validFrames.length) throw new Error("El proveedor no publicó cuadros de radar recientes.");

      radarHost = hostUrl.origin;
      radarFrames = validFrames.map((frame) => ({ time: Number(frame.time), path: frame.path }));
      radarFetchedAt = Date.now();

      if (!map.getSource("nexus-radar")) {
        map.addSource("nexus-radar", {
          type: "raster",
          tiles: [radarTileUrl(radarFrames[radarFrames.length - 1])],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 7,
          attribution: "Radar meteorológico © RainViewer"
        });
        map.addLayer({
          id: "nexus-radar-layer",
          type: "raster",
          source: "nexus-radar",
          minzoom: 0,
          maxzoom: 7,
          paint: { "raster-opacity": 0.78, "raster-fade-duration": 120 }
        });
      } else {
        showRadarFrame(radarFrames.length - 1);
      }

      const playButton = $("radarPlayBtn");
      if (playButton) playButton.disabled = radarFrames.length < 2;
      showRadarFrame(radarFrames.length - 1);
      safeText($("mapStatus"), "Radar de lluvia · últimos cuadros disponibles · cobertura variable");
    } catch (error) {
      console.warn("NEXUS radar:", error);
      safeText($("radarFrameTime"), "Radar temporalmente no disponible");
      safeText($("mapStatus"), "No se pudo cargar el radar; el resto del mapa sigue disponible");
    } finally {
      radarLoading = false;
      if (loadButton) {
        loadButton.disabled = false;
        safeText(loadButton, "ACTUALIZAR RADAR");
      }
    }
  }

  async function lookupWeatherAt(coordinates) {
    if (!coordinates || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) return;
    if (weatherRequestController) weatherRequestController.abort();
    weatherRequestController = new AbortController();
    const controller = weatherRequestController;
    const lat = Number(coordinates.lat);
    const lon = Number(coordinates.lng);

    safeText($("weatherPointTitle"), lat.toFixed(2) + "°, " + lon.toFixed(2) + "°");
    safeText($("weatherPointUpdated"), "Consultando Open‑Meteo…");
    ["wxTemp", "wxFeels", "wxWind", "wxHumidity", "wxCloud", "wxRain"].forEach((id) => safeText($(id), "…"));

    const selection = map && map.getSource("nexus-weather-selection");
    if (selection) {
      selection.setData({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [lon, lat] }
        }]
      });
    }

    try {
      const query = new URLSearchParams({
        latitude: lat.toFixed(4),
        longitude: lon.toFixed(4),
        current: WEATHER_CURRENT_FIELDS,
        wind_speed_unit: "kmh",
        precipitation_unit: "mm",
        timezone: "GMT",
        forecast_days: "1"
      });
      const response = await fetch("https://api.open-meteo.com/v1/forecast?" + query.toString(), {
        method: "GET",
        cache: "no-store",
        headers: { "Accept": "application/json" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error("Open‑Meteo respondió " + response.status);
      const data = await response.json();
      if (controller.signal.aborted) return;
      const current = data && data.current;
      if (!current) throw new Error("El proveedor no devolvió condiciones actuales.");
      const roundedLat = Number.isFinite(Number(data.latitude)) ? Number(data.latitude).toFixed(2) : lat.toFixed(2);
      const roundedLon = Number.isFinite(Number(data.longitude)) ? Number(data.longitude).toFixed(2) : lon.toFixed(2);
      safeText($("weatherPointTitle"), roundedLat + "°, " + roundedLon + "°");
      safeText($("wxTemp"), displayNumber(current.temperature_2m, 1, " °C"));
      safeText($("wxFeels"), displayNumber(current.apparent_temperature, 1, " °C"));
      safeText($("wxWind"), displayNumber(current.wind_speed_10m, 1, " km/h") + " · " + windDirectionLabel(current.wind_direction_10m));
      safeText($("wxHumidity"), displayNumber(current.relative_humidity_2m, 0, " %"));
      safeText($("wxCloud"), displayNumber(current.cloud_cover, 0, " %"));
      safeText($("wxRain"), displayNumber(current.precipitation, 1, " mm"));
      safeText($("weatherPointUpdated"), "Open‑Meteo · modelo meteorológico · " +
        (current.time ? dateLabel(current.time + "Z") : "hora no disponible") +
        " · altitud de modelo " + displayNumber(data.elevation, 0, " m"));
    } catch (error) {
      if (error && error.name === "AbortError") return;
      console.warn("NEXUS point weather:", error);
      safeText($("weatherPointUpdated"), "No se pudieron obtener datos para este punto. Probá otra ubicación.");
      ["wxTemp", "wxFeels", "wxWind", "wxHumidity", "wxCloud", "wxRain"].forEach((id) => safeText($(id), "—"));
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    }[char]));
  }

  async function getSatelliteLibrary() {
    if (!satelliteModulePromise) {
      satelliteModulePromise = import("https://cdn.jsdelivr.net/npm/satellite.js@7.1.0/+esm");
    }
    return satelliteModulePromise;
  }

  function initOrbitalViewer() {
    if (orbitalViewer) {
      window.setTimeout(() => orbitalViewer && orbitalViewer.resize(), 80);
      return true;
    }
    if (!window.Cesium || !$("orbitalScene")) {
      safeText($("orbitalStatus"), "No se pudo cargar CesiumJS. El globo orbital 3D no está disponible en este navegador.");
      return false;
    }
    try {
      const Cesium = window.Cesium;
      orbitalViewer = new Cesium.Viewer("orbitalScene", {
        baseLayer: false,
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        animation: false,
        timeline: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: true,
        selectionIndicator: true,
        scene3DOnly: true,
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        shouldAnimate: false
      });
      orbitalViewer.imageryLayers.removeAll(true);
      orbitalViewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        maximumLevel: 18,
        credit: "© OpenStreetMap contributors"
      }));
      orbitalViewer.scene.globe.enableLighting = true;
      orbitalViewer.scene.globe.showGroundAtmosphere = true;
      orbitalViewer.scene.screenSpaceCameraController.minimumZoomDistance = 720000;
      orbitalViewer.scene.screenSpaceCameraController.maximumZoomDistance = 65000000;
      orbitalViewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(-35, 18, 33000000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 }
      });
      window.setTimeout(() => {
        if (orbitalViewer) { orbitalViewer.forceResize(); orbitalViewer.scene.requestRender(); }
      }, 180);
      return true;
    } catch (error) {
      console.error("NEXUS Cesium viewer:", error);
      safeText($("orbitalStatus"), "Error al iniciar el globo orbital 3D: " + (error.message || "error gráfico"));
      orbitalViewer = null;
      return false;
    }
  }

  function satelliteGeodetic(satellite, satrec, date) {
    const propagated = satellite.propagate(satrec, date);
    if (!propagated || !propagated.position) return null;
    const geodetic = satellite.eciToGeodetic(propagated.position, satellite.gstime(date));
    if (!geodetic || !Number.isFinite(geodetic.latitude) ||
        !Number.isFinite(geodetic.longitude) || !Number.isFinite(geodetic.height)) return null;
    return geodetic;
  }

  function updateOrbitalPositions() {
    if (!orbitalViewer || !window.Cesium || !orbitalSatellites.length) return;
    const Cesium = window.Cesium;
    const satellite = orbitalSatellites[0].library;
    const now = new Date();
    orbitalSatellites.forEach((item) => {
      const geo = satelliteGeodetic(satellite, item.satrec, now);
      if (!geo) return;
      const altitudeKm = geo.height;
      item.entity.position = Cesium.Cartesian3.fromRadians(geo.longitude, geo.latitude, altitudeKm * 1000);
      item.entity.description =
        "<div class='cesium-infoBox-defaultDescription'>" +
        "<b>" + escapeHtml(item.name) + "</b><br>" +
        "Altitud orbital estimada: " + altitudeKm.toFixed(1) + " km<br>" +
        "Inclinación: " + Number(item.omm.INCLINATION).toFixed(2) + "°<br>" +
        "Período: " + (item.periodMinutes).toFixed(1) + " min<br>" +
        "Elementos OMM: " + escapeHtml(item.omm.EPOCH) + "<br>" +
        "Fuente: CelesTrak · propagación matemática SGP4" +
        "</div>";
    });
    orbitalViewer.scene.requestRender();
  }

  function drawOrbitalCatalog(rows, satellite) {
    if (!orbitalViewer || !window.Cesium) return;
    const Cesium = window.Cesium;
    orbitalViewer.entities.removeAll();
    orbitalSatellites = [];
    const now = new Date();

    rows.forEach((omm) => {
      const name = String(omm.OBJECT_NAME || "").trim();
      const epoch = new Date(String(omm.EPOCH || ""));
      const classification = String(omm.CLASSIFICATION_TYPE || "U").toUpperCase();
      if (!CIVIL_WEATHER_MISSION.test(name) || classification !== "U" ||
          !Number.isFinite(epoch.getTime()) ||
          Math.abs(now.getTime() - epoch.getTime()) > 14 * 24 * 60 * 60 * 1000) return;

      try {
        const satrec = satellite.json2satrec(omm);
        const initial = satelliteGeodetic(satellite, satrec, now);
        if (!initial || initial.height < 100 || initial.height > 50000) return;
        const meanMotion = Number(omm.MEAN_MOTION);
        const periodMinutes = Number.isFinite(meanMotion) && meanMotion > 0 ? 1440 / meanMotion : 100;
        const orbitPositions = [];
        const periodMs = periodMinutes * 60 * 1000;
        for (let step = 0; step <= 72; step += 1) {
          const future = new Date(now.getTime() + periodMs * step / 72);
          const geo = satelliteGeodetic(satellite, satrec, future);
          if (!geo) continue;
          orbitPositions.push(Cesium.Cartesian3.fromRadians(geo.longitude, geo.latitude, geo.height * 1000));
        }
        if (orbitPositions.length < 20) return;

        const color = /^(GOES|METEOSAT|HIMAWARI|INSAT|GEO-KOMPSAT|ELEKTRO-L|MTG)/i.test(name)
          ? Cesium.Color.fromCssColorString("#ffcb70")
          : Cesium.Color.fromCssColorString("#69dff0");
        const entity = orbitalViewer.entities.add({
          id: "nexus-civil-weather-" + String(omm.NORAD_CAT_ID || name),
          name,
          position: Cesium.Cartesian3.fromRadians(initial.longitude, initial.latitude, initial.height * 1000),
          point: {
            pixelSize: 10,
            color,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1.5,
            scaleByDistance: new Cesium.NearFarScalar(700000, 1.45, 36000000, 0.72),
            disableDepthTestDistance: 0
          },
          label: {
            text: name,
            font: "10px sans-serif",
            fillColor: color,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -15),
            scaleByDistance: new Cesium.NearFarScalar(900000, 1, 32000000, 0.55),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 42000000)
          },
          polyline: {
            positions: orbitPositions,
            width: 1.3,
            material: color.withAlpha(0.46),
            arcType: Cesium.ArcType.NONE
          }
        });
        orbitalSatellites.push({
          name,
          omm,
          satrec,
          entity,
          periodMinutes,
          library: satellite
        });
      } catch (error) {
        console.warn("NEXUS skipped OMM object:", name, error);
      }
    });

    safeText($("orbitalCount"), orbitalSatellites.length);
    const list = $("orbitalObjectList");
    list.replaceChildren();
    if (!orbitalSatellites.length) {
      addText(list, "span", "empty-state", "CelesTrak respondió, pero no hubo satélites civiles elegibles con elementos recientes.");
    } else {
      orbitalSatellites
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((item) => {
          const button = addText(list, "button", "orbital-object-item", item.name);
          button.type = "button";
          addText(button, "small", "", "NORAD " + String(item.omm.NORAD_CAT_ID || "—") + " · " +
            (Number(item.omm.MEAN_MOTION) > 1 ? "órbita baja" : "órbita alta"));
          button.addEventListener("click", () => {
            if (orbitalViewer) orbitalViewer.flyTo(item.entity, {
              duration: 1.4,
              offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-32), 1800000)
            });
          });
        });
    }
    updateOrbitalPositions();
    if (orbitalTickHandle) window.clearInterval(orbitalTickHandle);
    orbitalTickHandle = window.setInterval(updateOrbitalPositions, 5000);
    if (orbitalSatellites.length) {
      orbitalViewer.flyTo(orbitalSatellites.map((item) => item.entity), { duration: 1.6 }).catch(() => {});
    }
  }

  async function loadOrbitalCatalog() {
    if (orbitalLoading) return;
    if (!initOrbitalViewer()) return;

    orbitalLoading = true;
    const button = $("loadOrbitalBtn");
    if (button) {
      button.disabled = true;
      safeText(button, "COMPROBANDO CATÁLOGO…");
    }

    try {
      const satellite = await getSatelliteLibrary();
      let cached = null;
      try {
        cached = JSON.parse(localStorage.getItem(ORBITAL_CACHE_KEY) || "null");
      } catch (error) {
        console.warn("NEXUS orbital cache read:", error);
      }

      if (!orbitalSatellites.length && cached && Array.isArray(cached.rows) &&
          Number.isFinite(Number(cached.fetchedAt))) {
        drawOrbitalCatalog(cached.rows, satellite);
        orbitalFetchedAt = Number(cached.fetchedAt);
        safeText($("orbitalUpdated"), dateLabel(new Date(orbitalFetchedAt).toISOString()));
      }

      if (orbitalSatellites.length &&
          Date.now() - orbitalFetchedAt < ORBITAL_REFRESH_MS) {
        updateOrbitalPositions();
        safeText($("orbitalStatus"), orbitalSatellites.length +
          " satélites civiles meteorológicos · posiciones SGP4 recalculadas cada 5 s · catálogo reutilizado durante 2 h.");
        return;
      }

      safeText($("orbitalStatus"), orbitalSatellites.length
        ? "Actualizando elementos OMM; se mantiene visible la última escena orbital válida…"
        : "Consultando CelesTrak · catálogo meteorológico OMM…");

      const response = await fetch(ORBITAL_GROUP_URL, {
        method: "GET",
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) throw new Error("CelesTrak respondió " + response.status);
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : [payload];
      if (!rows.length) throw new Error("El catálogo no devolvió registros OMM.");
      const now = Date.now();
      const safeRows = rows.filter((omm) => {
        const name = String(omm && omm.OBJECT_NAME || "").trim();
        const epoch = new Date(String(omm && omm.EPOCH || ""));
        return CIVIL_WEATHER_MISSION.test(name) &&
          String(omm && omm.CLASSIFICATION_TYPE || "U").toUpperCase() === "U" &&
          Number.isFinite(epoch.getTime()) &&
          Math.abs(now - epoch.getTime()) <= 14 * 24 * 60 * 60 * 1000;
      });
      if (!safeRows.length) throw new Error("El catálogo no devolvió misiones civiles elegibles con elementos recientes.");

      drawOrbitalCatalog(safeRows, satellite);
      orbitalFetchedAt = Date.now();
      safeText($("orbitalUpdated"), dateLabel(new Date(orbitalFetchedAt).toISOString()));
      try {
        localStorage.setItem(ORBITAL_CACHE_KEY, JSON.stringify({
          fetchedAt: orbitalFetchedAt,
          rows: safeRows
        }));
      } catch (error) {
        console.warn("NEXUS orbital cache write:", error);
      }

      safeText($("orbitalStatus"), orbitalSatellites.length +
        " satélites civiles elegibles · posiciones SGP4 actualizadas cada 5 s · elementos OMM guardados durante 2 h.");
      if (!orbitalSatellites.length) {
        safeText($("orbitalStatus"), "El feed respondió, pero no contiene objetos civiles elegibles con elementos recientes. No se dibujaron otros tipos.");
      }
    } catch (error) {
      console.error("NEXUS orbital data:", error);
      if (orbitalSatellites.length) {
        safeText($("orbitalStatus"), "No se pudo actualizar CelesTrak: " + (error.message || "error de red") +
          ". Se conserva la última escena válida, con elementos de " +
          ageLabel(new Date(orbitalFetchedAt).toISOString()) + ".");
      } else {
        safeText($("orbitalStatus"), "No se pudieron cargar los satélites: " + (error.message || "error de red") +
          ". Verificá conexión o reintentá más tarde.");
        safeText($("orbitalPropagation"), "Sin datos");
      }
    } finally {
      orbitalLoading = false;
      if (button) {
        button.disabled = false;
        safeText(button, "COMPROBAR CATÁLOGO");
      }
    }
  }

  function setMapMode(mode) {
    if (!["cyber", "weather", "orbital"].includes(mode)) return;
    activeMapMode = mode;
    const modes = [
      ["cyberModeBtn", "cyber"],
      ["weatherModeBtn", "weather"],
      ["orbitalModeBtn", "orbital"]
    ];
    modes.forEach(([id, value]) => {
      const button = $(id);
      if (!button) return;
      const active = value === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    const weatherActive = mode === "weather";
    const cyberActive = mode === "cyber";
    const orbitalActive = mode === "orbital";
    $("weatherControls").hidden = !weatherActive;
    $("orbitalControls").hidden = !orbitalActive;
    $("map").hidden = orbitalActive;
    $("orbitalScene").hidden = !orbitalActive;
    $("buildingToggle").parentElement.hidden = !cyberActive;
    $("cityJumpControl").hidden = !cyberActive;
    $("orbitalPanel").classList.toggle("mode-focus", orbitalActive);

    if (map && mapReady && !orbitalActive) {
      window.requestAnimationFrame(() => {
        if (!map || $("map").hidden) return;
        map.resize();
        ["nexus-country-glow", "nexus-country-points"].forEach((id) => {
          if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", cyberActive ? "visible" : "none");
        });
        ["nexus-3d-buildings", "nexus-building-footprints"].forEach((id) => {
          if (map.getLayer(id)) {
            const show = cyberActive && $("buildingToggle").checked;
            map.setLayoutProperty(id, "visibility", show ? "visible" : "none");
          }
        });
        if (map.getLayer("nexus-radar-layer")) {
          map.setLayoutProperty("nexus-radar-layer", "visibility", weatherActive ? "visible" : "none");
        }
        if (map.getLayer("nexus-weather-cells-fill")) {
          map.setLayoutProperty("nexus-weather-cells-fill", "visibility", weatherActive ? "visible" : "none");
        }
        if (map.getLayer("nexus-weather-grid-points")) {
          map.setLayoutProperty("nexus-weather-grid-points", "visibility", weatherActive ? "visible" : "none");
        }
        if (map.getLayer("nexus-weather-grid-wind")) {
          map.setLayoutProperty("nexus-weather-grid-wind", "visibility",
            weatherActive && activeWeatherVariable === "wind" ? "visible" : "none");
        }
        if (map.getLayer("nexus-weather-selection-layer")) {
          map.setLayoutProperty("nexus-weather-selection-layer", "visibility", weatherActive ? "visible" : "none");
        }
        map.triggerRepaint();
      });
    }

    if (!weatherActive) { pauseRadarPlayback(); pauseWeatherForecast(); }
    const heading = $("mapHeading");
    const annotation = $("mapAnnotation");
    const footLeft = $("mapFootLeft");
    const footRight = $("mapFootRight");

    if (mode === "cyber") {
      safeText(heading, "Planeta Tierra · actividad observada");
      safeText(annotation, "País de registro de red · centroide aproximado · no localiza incidentes ni víctimas");
      safeText(footLeft, "DATOS AGREGADOS · SIN RUTAS NI CONEXIONES INVENTADAS");
      safeText(footRight, "GLOBO 3D · ZOOM · ROTACIÓN · EDIFICIOS");
      if (mapReady) {
        const zoom = map.getZoom();
        safeText($("mapStatus"), zoom > 5.2
          ? "Zoom local · marcadores nacionales ocultos"
          : "Vista global · datos de sensores agregados por país");
      }
    } else if (mode === "weather") {
      safeText(heading, "GLOBAL WEATHER · campos atmosféricos mundiales");
      safeText(annotation, "Modelo meteorológico global por celdas · el radar histórico se muestra solo donde hay cobertura");
      safeText(footLeft, "OPEN-METEO · MALLA GLOBAL DE 15° · 288 CELDAS");
      safeText(footRight, "CAMBIÁ TEMPERATURA · LLUVIA · VIENTO · HUMEDAD · NUBES · PRESIÓN");
      if (mapReady) {
        loadWeatherGrid();
        loadRadarFrames();
        safeText($("mapStatus"), "Cargando la malla atmosférica mundial…");
      }
    } else {
      safeText(heading, "ORBITAL INTELLIGENCE · satélites civiles");
      safeText(annotation, "Escena orbital 3D · posiciones calculadas con SGP4 sobre elementos OMM publicados");
      safeText(footLeft, "CELESTRAK WEATHER · MISIONES CIVILES METEOROLÓGICAS");
      safeText(footRight, "ÓRBITAS ESTIMADAS · NO TELEMETRÍA GPS EN VIVO");
      initOrbitalViewer();
      loadOrbitalCatalog();
      window.setTimeout(() => orbitalViewer && orbitalViewer.resize(), 120);
    }
  }

  function addBuildingInspector(e) {
    const feature = e.features && e.features[0];
    if (!feature) return;
    const p = feature.properties || {};
    const title = p.name || ((p["addr:housenumber"] || p.housenumber)
      ? "Inmueble " + (p["addr:housenumber"] || p.housenumber) : "Edificio sin nombre");
    const lines = [];
    const type = p.building || p.class || p.subclass;
    const height = p.height || p.render_height;
    const floors = p["building:levels"] || p.levels;
    const street = p["addr:street"] || p.street;
    const number = p["addr:housenumber"] || p.housenumber;
    const roof = p["roof:shape"] || p.roof_shape;
    if (type) lines.push(["Tipo", String(type)]);
    if (height) {
      const parsed = parseFloat(height);
      lines.push([p.height ? "Altura declarada" : "Altura estimada", Number.isFinite(parsed) ? parsed + " m" : String(height)]);
    }
    if (floors) lines.push(["Pisos", String(floors)]);
    if (street || number) lines.push(["Dirección cartográfica", [street, number].filter(Boolean).join(" ")]);
    if (roof) lines.push(["Techo", String(roof)]);
    if (!lines.length) lines.push(["Atributos", "La huella no contiene más detalles"]);
    const node = popupNode(title, lines, "Datos abiertos de OpenStreetMap/OpenFreeMap; pueden ser incompletos o estimados.");
    new maplibregl.Popup({ closeButton: true, maxWidth: "300px" }).setLngLat(e.lngLat).setDOMContent(node).addTo(map);
  }

  function initMap() {
    if (!window.maplibregl) {
      safeText($("mapStatus"), "No se pudo cargar el motor cartográfico");
      safeText($("rendererStatus"), "No disponible");
      return;
    }
    map = new maplibregl.Map({
      container: "map",
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [0, 20],
      zoom: 1.45,
      minZoom: 1,
      maxZoom: 20,
      pitch: 22,
      canvasContextAttributes: { antialias: true },
      renderWorldCopies: false
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => {
      map.setProjection({ type: "globe" });
      try {
        if (typeof map.setSky === "function") {
          map.setSky({
            "atmosphere-blend": [
              "interpolate", ["linear"], ["zoom"],
              0, 1,
              5, 1,
              7, 0
            ]
          });
        }
      } catch (error) {
        console.warn("NEXUS atmosphere effect unavailable:", error);
      }
      map.addSource("nexus-country-observations", { type: "geojson", data: emptyCollection() });
      map.addSource("nexus-weather-grid", { type: "geojson", data: emptyCollection() });
      map.addSource("nexus-weather-cells", { type: "geojson", data: emptyCollection() });
      map.addLayer({
        id: "nexus-weather-cells-fill",
        type: "fill",
        source: "nexus-weather-cells",
        layout: { visibility: "none" },
        paint: {
          "fill-color": [
            "interpolate", ["linear"], ["coalesce", ["get", "temperature"], 0],
            -35, "#3859a8", -10, "#398bc5", 5, "#54b9a9",
            20, "#d6c85e", 35, "#e87950", 48, "#a93d65"
          ],
          "fill-opacity": 0.68,
          "fill-outline-color": "rgba(155,225,240,0.18)"
        }
      });
      map.addLayer({
        id: "nexus-weather-grid-points",
        type: "circle",
        source: "nexus-weather-grid",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 2.2, 3, 3.4, 6, 5],
          "circle-color": [
            "interpolate", ["linear"], ["get", "temperature"],
            -20, "#5687d9", 0, "#55b9dc", 15, "#57c78d", 25, "#efc45d", 35, "#e87552"
          ],
          "circle-opacity": 0.24,
          "circle-stroke-color": "#f5fcff",
          "circle-stroke-width": 1.2
        }
      });
      map.addLayer({
        id: "nexus-weather-grid-wind",
        type: "symbol",
        source: "nexus-weather-grid",
        layout: {
          visibility: "none",
          "text-field": ["get", "windArrow"],
          "text-size": 13,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
          "text-ignore-placement": true
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#153344",
          "text-halo-width": 1.2
        }
      });
      map.addSource("nexus-weather-selection", { type: "geojson", data: emptyCollection() });
      map.addLayer({
        id: "nexus-weather-selection-layer",
        type: "circle",
        source: "nexus-weather-selection",
        paint: {
          "circle-radius": 7,
          "circle-color": "#63e1ed",
          "circle-opacity": 0.95,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2
        }
      });
      map.addLayer({
        id: "nexus-country-glow", type: "circle", source: "nexus-country-observations", maxzoom: 5.2,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "reports"], 0, 8, 10000, 14, 100000, 22, 1000000, 31],
          "circle-color": "#f6a84f", "circle-opacity": 0.16, "circle-blur": 0.8
        }
      });
      map.addLayer({
        id: "nexus-country-points", type: "circle", source: "nexus-country-observations", maxzoom: 5.2,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "reports"], 0, 3.5, 10000, 5, 100000, 7.5, 1000000, 10],
          "circle-color": ["interpolate", ["linear"], ["get", "reports"], 0, "#f5ca76", 100000, "#f59b53", 1000000, "#ff684e"],
          "circle-opacity": 0.88, "circle-stroke-color": "#fff0d3", "circle-stroke-width": 1.1
        }
      });
      map.on("click", "nexus-weather-grid-points", showWeatherPointPopup);
      map.on("mouseenter", "nexus-weather-grid-points", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "nexus-weather-grid-points", () => { map.getCanvas().style.cursor = ""; });

      map.on("click", "nexus-country-points", (event) => {
        const feature = event.features && event.features[0];
        if (!feature) return;
        const p = feature.properties || {};
        const node = popupNode(p.countryName || p.countryCode || "País", [
          ["Registros de origen en la muestra", fmt(p.sourceRecords)],
          ["Reportes asociados", fmt(p.reports)],
          ["Última observación", p.latestSeen || "No disponible"]
        ], "Centroide nacional basado en el registro de red/ASN. No indica dónde ocurrió un incidente ni la ubicación de una víctima. El marcador se oculta al acercar el zoom.");
        new maplibregl.Popup({ closeButton: true, maxWidth: "310px" })
          .setLngLat(event.lngLat).setDOMContent(node).addTo(map);
      });
      map.on("mouseenter", "nexus-country-points", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "nexus-country-points", () => { map.getCanvas().style.cursor = ""; });

      // Public building vector tiles: keep this optional so missing building coverage
      // never prevents the country-level threat map from loading.
      let hasBuildings = false;
      try {
        map.addSource("nexus-building-data", { type: "vector", url: "https://tiles.openfreemap.org/planet" });
        const labelLayer = (map.getStyle().layers.find((layer) => layer.type === "symbol") || {}).id;
        const beforeLayer = labelLayer || undefined;
        map.addLayer({
          id: "nexus-building-footprints", source: "nexus-building-data", "source-layer": "building",
          type: "fill", minzoom: 14.5,
          filter: ["!=", ["get", "hide_3d"], true],
          paint: { "fill-color": "#6ca6b8", "fill-opacity": 0.20, "fill-outline-color": "#9bd5df" }
        }, beforeLayer);
        map.addLayer({
          id: "nexus-3d-buildings", source: "nexus-building-data", "source-layer": "building",
          type: "fill-extrusion", minzoom: 14.5,
          filter: ["!=", ["get", "hide_3d"], true],
          paint: {
            "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], ["get", "height"], 8],
              0, "#24475b", 35, "#397b91", 100, "#79b6c2", 250, "#b6cbd0"],
            "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14.5, 0, 15.8,
              ["coalesce", ["get", "render_height"], ["get", "height"], 8]],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
            "fill-extrusion-opacity": 0.96
          }
        }, beforeLayer);
        ["nexus-3d-buildings", "nexus-building-footprints"].forEach((layerId) => {
          map.on("click", layerId, addBuildingInspector);
          map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
        });
        hasBuildings = !!map.getLayer("nexus-3d-buildings");
      } catch (error) {
        console.warn("NEXUS building layer unavailable:", error);
      }
      $("buildingToggle").disabled = !hasBuildings;
      $("buildingToggle").checked = hasBuildings;
      const updateMapScaleNotice = () => {
        if (activeMapMode === "weather") {
          safeText($("mapStatus"), "Radar de lluvia · historial reciente · cobertura variable");
          return;
        }
        if (activeMapMode === "orbital") {
          safeText($("orbitalStatus"), "Escena orbital 3D · satélites civiles meteorológicos");
          return;
        }
        const zoom = map.getZoom();
        if (zoom > 5.2) {
          safeText($("mapStatus"), "Zoom local · marcadores nacionales ocultos para evitar falsas ubicaciones");
        } else {
          safeText($("mapStatus"), hasBuildings
            ? "Vista global · marcadores por país (centroides) · edificios desde zoom 15+"
            : "Vista global · marcadores por país (centroides) · edificios no disponibles");
        }
      };
      map.on("zoomend", updateMapScaleNotice);
      updateMapScaleNotice();
      safeText($("rendererStatus"), "MapLibre GL · WebGL");
      mapReady = true;
      updateMap(latest && latest.feeds ? latest.feeds.dshield : null);
      if (activeMapMode !== "cyber") setMapMode(activeMapMode);
    });

    map.on("click", (event) => {
      if (activeMapMode !== "weather") return;
      const gridHit = map.queryRenderedFeatures(event.point, { layers: ["nexus-weather-grid-points"] });
      if (gridHit && gridHit.length) return;
      lookupWeatherAt(event.lngLat);
    });

    map.on("error", (event) => {
      if (event && event.error) {
        safeText($("mapStatus"), "Mapa parcialmente disponible · revisá la conexión");
      }
    });

    $("cyberModeBtn").addEventListener("click", () => setMapMode("cyber"));
    $("weatherModeBtn").addEventListener("click", () => setMapMode("weather"));
    $("orbitalModeBtn").addEventListener("click", () => setMapMode("orbital"));
    $("weatherVariableSelect").addEventListener("change", () => applyWeatherVariable($("weatherVariableSelect").value));
    $("loadOrbitalBtn").addEventListener("click", () => loadOrbitalCatalog());

    $("loadWeatherGridBtn").addEventListener("click", () => loadWeatherGrid());

    $("loadRadarBtn").addEventListener("click", () => {
      if (Date.now() - radarFetchedAt < RADAR_REFRESH_MIN_MS && radarFrames.length) {
        safeText($("radarFrameTime"), "Radar consultado recientemente · se respeta el intervalo de actualización del proveedor");
        showRadarFrame(radarFrames.length - 1);
        return;
      }
      loadRadarFrames(true);
    });
    $("radarTimeSlider").addEventListener("input", () => {
      pauseRadarPlayback();
      showRadarFrame(Number($("radarTimeSlider").value));
    });
    $("radarPlayBtn").addEventListener("click", () => {
      if (radarPlayback) {
        pauseRadarPlayback();
        return;
      }
      if (radarFrames.length < 2) return;
      if (radarFrames.currentIndex >= radarFrames.length - 1) showRadarFrame(0);
      safeText($("radarPlayBtn"), "Ⅱ PAUSAR");
      radarPlayback = window.setInterval(() => {
        const next = (radarFrames.currentIndex || 0) + 1;
        if (next >= radarFrames.length) {
          pauseRadarPlayback();
          return;
        }
        showRadarFrame(next);
      }, 900);
    });

    $("buildingToggle").addEventListener("change", () => {
      if (!mapReady) return;
      const visibility = $("buildingToggle").checked ? "visible" : "none";
      ["nexus-building-footprints", "nexus-3d-buildings"].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
      });
    });
    $("resetView").addEventListener("click", () => {
      if (map) map.flyTo({ center: [0, 20], zoom: 1.45, pitch: 22, bearing: 0, duration: 1100 });
    });
    $("cityJump").addEventListener("change", () => {
      const position = CITY_HUBS[$("cityJump").value];
      if (position && map) map.flyTo({ center: position, zoom: 15.2, pitch: 62, bearing: -18, duration: 1700 });
    });
  }

  function render(data) {
    if (!data || data.schemaVersion !== 1 || !data.feeds) {
      throw new Error("El archivo de datos no tiene el formato esperado.");
    }
    latest = data;
    const dshield = data.feeds.dshield || {};
    const cisa = data.feeds.cisaKev || {};
    renderMetrics(dshield, cisa);
    renderSourceHealth(data);
    renderReports(data.feeds.reports || {});
    renderHistory(dshield);
    renderCountries(dshield);
    renderSources(dshield);
    renderKev(cisa);
    updateMap(dshield);
  }

  async function refreshHistory() {
    try {
      const response = await fetch(DATA_HISTORY_URL + "?v=" + Date.now(), {
        method: "GET", cache: "no-store", headers: { "Accept": "application/json" }
      });
      if (!response.ok) throw new Error("Historial no disponible (" + response.status + ")");
      const archive = await response.json();
      if (!archive || archive.schemaVersion !== 1 || !Array.isArray(archive.items)) {
        throw new Error("Formato de historial no válido");
      }
      historyItems = archive.items;
      safeText($("reportArchiveStatus"), "ARCHIVO HISTÓRICO · " + fmt(historyItems.length) + " publicaciones · retención de 365 días");
      renderReports(latest && latest.feeds ? latest.feeds.reports : {});
    } catch (error) {
      safeText($("reportArchiveStatus"), "ARCHIVO HISTÓRICO · esperando primera recolección");
    }
  }

  async function refresh() {
    if (refreshInProgress) return;
    refreshInProgress = true;
    try {
      const response = await fetch(DATA_URL + "?v=" + Date.now(), {
        method: "GET",
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) throw new Error("No se pudo leer el snapshot público (" + response.status + ").");
      const data = await response.json();
      render(data);
    } catch (error) {
      console.warn("NEXUS data refresh:", error);
      if (!latest) {
        setPill("offline", "Sin snapshot de datos");
        safeText($("lastUpdated"), "No se pudo descargar el conjunto de datos público.");
        safeText($("snapshotState"), "Sin datos");
      } else {
        setPill("degraded", "Conservando última lectura válida");
      }
    } finally {
      refreshInProgress = false;
    }
  }

  function updateClock() {
    safeText($("clock"), new Date().toLocaleTimeString("en-GB", { timeZone: "UTC", hour12: false }) + " UTC");
  }

  const reportSearch = $("reportSearch");
  const reportSourceFilter = $("reportSourceFilter");
  if (reportSearch) reportSearch.addEventListener("input", () => renderReports(latest && latest.feeds ? latest.feeds.reports : {}));
  if (reportSourceFilter) reportSourceFilter.addEventListener("change", () => renderReports(latest && latest.feeds ? latest.feeds.reports : {}));

  refreshHistory();
  initMap();
  updateClock();
  setInterval(updateClock, 1000);
  refresh();
  setInterval(refresh, 60000);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    $("installBtn").hidden = false;
  });
  $("installBtn").addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $("installBtn").hidden = true;
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("NEXUS service worker:", error);
      });
    });
  }
})();