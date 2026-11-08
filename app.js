(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const fmt = (value) => Number(value || 0).toLocaleString("es-AR");
  const emptyCollection = () => ({ type: "FeatureCollection", features: [] });
  const DATA_URL = "./data/current.json";
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
  let installPrompt = null;
  let refreshInProgress = false;

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
    const items = Array.isArray(reports && reports.items) ? reports.items.slice(0, 32) : [];
    let rendered = 0;
    if (!items.length) {
      addText(container, "p", "empty-state", "Todavía no hay investigaciones o avisos disponibles.");
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

      addText(card, "p", "report-kind", source.kind + " · título en idioma original");
      card.append(meta, link);
      container.appendChild(card);
      rendered += 1;
    });

    if (!rendered) addText(container, "p", "empty-state", "No hay publicaciones válidas de las fuentes autorizadas.");
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
      addText(row, "span", "feed-state " + cssStatus, labels[status] || "PENDIENTE");
      row.appendChild(content);
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
      style: "https://tiles.openfreemap.org/styles/dark",
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
      map.addSource("nexus-country-observations", { type: "geojson", data: emptyCollection() });
      map.addLayer({
        id: "nexus-country-glow", type: "circle", source: "nexus-country-observations",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "reports"], 0, 8, 10000, 14, 100000, 22, 1000000, 31],
          "circle-color": "#f6a84f", "circle-opacity": 0.16, "circle-blur": 0.8
        }
      });
      map.addLayer({
        id: "nexus-country-points", type: "circle", source: "nexus-country-observations",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "reports"], 0, 3.5, 10000, 5, 100000, 7.5, 1000000, 10],
          "circle-color": ["interpolate", ["linear"], ["get", "reports"], 0, "#f5ca76", 100000, "#f59b53", 1000000, "#ff684e"],
          "circle-opacity": 0.88, "circle-stroke-color": "#fff0d3", "circle-stroke-width": 1.1
        }
      });
      map.on("click", "nexus-country-points", (event) => {
        const feature = event.features && event.features[0];
        if (!feature) return;
        const p = feature.properties || {};
        const node = popupNode(p.countryName || p.countryCode || "País", [
          ["Registros de origen en la muestra", fmt(p.sourceRecords)],
          ["Reportes asociados", fmt(p.reports)],
          ["Última observación", p.latestSeen || "No disponible"]
        ], "País basado en el registro de red/ASN y centroide aproximado. No representa ubicación de víctimas ni de personas.");
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
      safeText($("mapStatus"), hasBuildings
        ? "Globo activo · acercá a zoom 15+ y seleccioná una huella"
        : "Globo activo · edificios no disponibles en esta capa");
      safeText($("rendererStatus"), "MapLibre GL · WebGL");
      mapReady = true;
      updateMap(latest && latest.feeds ? latest.feeds.dshield : null);
    });

    map.on("error", (event) => {
      if (event && event.error) {
        safeText($("mapStatus"), "Mapa parcialmente disponible · revisá la conexión");
      }
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