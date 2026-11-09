# NEXUS 6.0 — Global Earth Intelligence

NEXUS presenta inteligencia defensiva pública y estadísticas de sensores. No genera tráfico, rutas ni eventos ficticios y no contacta con sistemas observados.

## Cobertura de datos

### Telemetría agregada
- **DShield / SANS Internet Storm Center:** reportes diarios, fuentes y destinos observados por su red de sensores; historial de 30 días; nivel INFOCON.
- **Mapa por país:** agrega una muestra acotada de los principales registros que DShield comparte. Los círculos usan el país de registro de la red/ASN y un centroide aproximado. Las direcciones IP originales no se publican.

### Vulnerabilidades explotadas conocidas
- **CISA KEV:** catálogo oficial de vulnerabilidades con evidencia de explotación conocida. NEXUS muestra las incorporaciones más recientes y enlaces a NVD.

### Ocho canales públicos de investigación y avisos
1. SANS ISC — diario de investigación y observaciones de sensores: https://isc.sans.edu/rssfeed.xml
2. CISA — avisos oficiales: https://www.cisa.gov/cybersecurity-advisories/all.xml
3. UK National Cyber Security Centre — informes, noticias y guías: https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml
4. CERT-EU — avisos de seguridad para instituciones de la Unión Europea: https://cert.europa.eu/publications/security-advisories-rss
5. Canadian Centre for Cyber Security — alertas y advisories: https://www.cyber.gc.ca/api/cccs/atom/v1/get?feed=alerts_advisories&lang=en
6. Australian Cyber Security Centre — alertas: https://www.cyber.gov.au/rss/alerts
7. CERT-SE Sweden — avisos e información de incidentes: https://www.cert.se/feed/rss.xml
8. CERT-UA Ukraine — análisis e informes de amenazas: https://cert.gov.ua/api/articles/rss

NEXUS conserva títulos, fuente, fecha y enlace oficial. No copia cuerpos de artículos, indicadores de compromiso, direcciones IP, muestras de malware ni instrucciones técnicas. Algunos titulares están en su idioma original.

## Actualización y arquitectura

1. GitHub Actions ejecuta `scripts/refresh_intel.py` una vez por hora; también puede ejecutarse manualmente desde Actions.
2. El recolector consulta APIs y feeds públicos de solo lectura.
3. Se genera `data/current.json`, que GitHub Pages sirve como archivo estático.
4. La interfaz consulta ese archivo cada 60 segundos. El reloj y los indicadores de antigüedad se actualizan cada segundo.

No hace falta Firebase, servidor propio, claves API ni credenciales para estas fuentes. La recolección se ejecuta en GitHub Actions, no en el navegador del visitante.

## NEXUS 5.0: precisión geográfica y explorador de evidencia

- El mapa deja de mostrar los marcadores nacionales cuando el zoom supera 5.2. Esos puntos son centroides nacionales y podrían parecer ubicaciones locales al acercar la vista.
- El popup de cada país explica que el punto corresponde al país de registro de red/ASN, no al lugar de un incidente.
- El explorador permite buscar publicaciones por título, organismo y fuente. Solo conserva metadatos y enlaces oficiales.
- Una publicación, aviso o investigación no se convierte automáticamente en un incidente confirmado. El explorador no inventa gravedad, víctimas, ubicación ni estado operativo.
- El recolector mantiene `data/publications-history.json`: hasta 2.000 publicaciones oficiales, deduplicadas y con retención de 365 días. El explorador combina el archivo con el snapshot reciente y muestra hasta 100 resultados por consulta.
- El archivo conserva solo título, fuente, tipo, fecha y enlace HTTPS oficial. Es un historial de publicaciones, no un registro exhaustivo de incidentes confirmados.

## NEXUS 5.1: planeta a color y contexto orbital

- El globo usa el estilo Liberty de OpenFreeMap y el efecto de atmósfera de MapLibre para mostrar continentes, océanos y halo atmosférico con mayor contraste.
- La sección orbital explica las limitaciones de los catálogos públicos y enlaza a la documentación oficial de CelesTrak.
- CelesTrak recomienda espaciar las consultas GP aproximadamente cada dos horas. Los elementos orbitales son datos para calcular posiciones estimadas; no son una señal GPS ni una medición continua.
- El catálogo público no equivale a todos los objetos que existen: algunos satélites pequeños pueden tardar en identificarse y otros pueden no quedar identificados.
- NEXUS muestra contexto orbital agregado y no ofrece rastreo preciso, trayectorias ni identificación individual de satélites estratégicos.

## NEXUS 6.0: Cyber, Global Weather y Orbital

### Global Weather
- El modo meteorológico agrega un reproductor de cuadros de radar de precipitación de RainViewer. La API pública ofrece hasta dos horas de historial en intervalos de diez minutos; desde enero de 2026 no ofrece nowcast gratuito ni imágenes satelitales infrarrojas. La cobertura depende de los radares que cada proveedor local comparte y no es uniforme a escala planetaria.
- La línea de tiempo anima únicamente los cuadros pasados disponibles. No muestra una predicción ni debe describirse como una imagen meteorológica global completa.
- Al seleccionar un punto del mapa, NEXUS consulta Open-Meteo para temperatura, sensación térmica, viento, humedad, nubosidad y precipitación actuales según el modelo disponible. Son estimaciones de modelo con hora de referencia, no mediciones de estación en vivo.
- NEXUS identifica la fuente y su hora, y conserva una degradación clara si un proveedor no está disponible. Se acredita a RainViewer y Open-Meteo en la interfaz. El endpoint gratuito de RainViewer está destinado a uso personal, educativo y comunitario de pequeña escala; no ofrece SLA.

### Orbital Intelligence
- La vista orbital es de contexto agregado. Enlaza al resumen SATCAT y a la documentación de CelesTrak.
- No dibuja posiciones orbitales exactas ni trayectorias de objetos individuales. Un catálogo público no es exhaustivo, no equivale a telemetría en vivo y puede tener registros sin elementos actuales.
- CelesTrak solicita espaciar las consultas GP aproximadamente cada dos horas y las consultas SATCAT de resumen no deben tratarse como actualización segundo a segundo.

### Arquitectura de datos meteorológicos
- El mapa base usa MapLibre GL JS. RainViewer aporta los mosaicos históricos de radar; Open-Meteo aporta consultas puntuales.
- No requiere Firebase, claves privadas ni un servidor propio para estas consultas de solo lectura.
- La aplicación no interpola lluvia donde no hay radar ni inventa nubes, viento u observaciones para cubrir regiones sin datos.

## Cómo interpretar los datos

- Los reportes de DShield son observaciones enviadas por sensores participantes. No equivalen automáticamente a delitos ni a ataques confirmados; puede haber escáneres de investigación, infraestructura compartida o falsos positivos.
- El país del mapa corresponde al registro de una red/ASN y se coloca en un centroide aproximado. No identifica la ubicación física de una persona, un dispositivo, una víctima ni un atacante.
- CISA KEV es un catálogo de vulnerabilidades explotadas conocidas, no una secuencia de ataques en directo.
- Un aviso de un CERT puede ser una recomendación, investigación o alerta histórica; no prueba que un incidente continúe activo.
- Los canales públicos no cubren todos los incidentes de Internet y sus frecuencias de publicación varían. NEXUS no ofrece visibilidad global segundo a segundo.
- Si una fuente falla, se conserva su última lectura válida y se marca como anterior. No se generan datos sintéticos para completar huecos.

## Pruebas

- La interfaz debe mostrar `BUILD 6.0`, modos Cyber/Global Weather/Orbital, filtros del explorador y aviso de centroide nacional.
- `update_publication_history` debe deduplicar y validar el host HTTPS de cada publicación.
- Las capas de centroides nacionales deben declarar `maxzoom: 5.2`.

- `python scripts/refresh_intel.py`
- `python -m py_compile scripts/refresh_intel.py`
- `python -m unittest discover -s tests -p "test_*.py"`
- `node --test tests/intel-dashboard.test.cjs`
- `node --check app.js`

## Publicación

GitHub Pages: Settings → Pages → Deploy from a branch → `main` → `/(root)`.

URL: https://thiandominguez100-stack.github.io/hackeomasivo/
