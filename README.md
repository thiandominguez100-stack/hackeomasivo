# NEXUS 6.2 — Global Earth Intelligence

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

## Precisión geográfica y explorador de evidencia

- El mapa deja de mostrar los marcadores nacionales cuando el zoom supera 5.2. Esos puntos son centroides nacionales y podrían parecer ubicaciones locales al acercar la vista.
- El popup de cada país explica que el punto corresponde al país de registro de red/ASN, no al lugar de un incidente.
- El explorador permite buscar publicaciones por título, organismo y fuente. Solo conserva metadatos y enlaces oficiales.
- Una publicación, aviso o investigación no se convierte automáticamente en un incidente confirmado. El explorador no inventa gravedad, víctimas, ubicación ni estado operativo.
- El recolector mantiene `data/publications-history.json`: hasta 2.000 publicaciones oficiales, deduplicadas y con retención de 365 días. El explorador combina el archivo con el snapshot reciente y muestra hasta 100 resultados por consulta.
- El archivo conserva solo título, fuente, tipo, fecha y enlace HTTPS oficial. Es un historial de publicaciones, no un registro exhaustivo de incidentes confirmados.

## NEXUS 6.2: Cyber, Global Weather y Orbital

### Globo base
- El modo Cyber conserva el globo MapLibre con proyección 3D, atmósfera, agregados de país y edificios opcionales.
- Los cambios de modo redimensionan el motor visible y aíslan las capas para que una vista no tape a la otra.

### Global Weather
- El globo contiene una malla de hasta **288 celdas** de 15° de latitud/longitud, con muestras distribuidas por todo el planeta.
- La interfaz permite colorear la superficie por temperatura, precipitación, viento, humedad, nubosidad o presión.
- Cada celda conserva hasta 15 variables actuales admitidas por Open-Meteo: temperatura, sensación térmica, humedad relativa, nubosidad, precipitación, lluvia, chubascos, nieve, presión a nivel del mar, presión de superficie, velocidad/dirección del viento, ráfagas, código meteorológico y día/noche.
- El navegador consulta Open-Meteo en una petición de múltiples ubicaciones; conserva la última respuesta en el almacenamiento local y vuelve a consultar como máximo cada 60 minutos. El botón de actualización respeta ese intervalo para no exceder los límites de la fuente.
- Las celdas son estimaciones de modelo en una resolución visual de referencia de 15°, no observaciones de estaciones ni una simulación de alta resolución. Si una celda no tiene un dato válido, NEXUS no inventa su valor.
- RainViewer se conserva como capa opcional de radar de precipitación histórica, solo en las regiones con cobertura de radar disponible y con hasta dos horas de historial. No es una capa de pronóstico ni una imagen meteorológica uniforme del planeta.
- Al seleccionar un punto se muestran las variables meteorológicas devueltas por el modelo y su hora de referencia.

### Orbital Intelligence 3D
- El modo Orbital usa un visor CesiumJS independiente para renderizar una esfera terrestre 3D con marcadores y arcos orbitales a distintas alturas.
- Los elementos orbitales OMM se consultan desde el grupo Weather de CelesTrak. La aplicación filtra una lista explícita de misiones civiles meteorológicas y de observación de la Tierra; no procesa ni representa satélites militares o estratégicos.
- Satellite.js propaga los elementos OMM con SGP4. Las posiciones calculadas se actualizan en la escena cada cinco segundos; el catálogo orbital se guarda localmente y se vuelve a consultar como máximo cada dos horas; los accesos intermedios reutilizan esa última respuesta.
- La lista permite enfocar el globo en una misión y seleccionar su marcador para ver nombre, altitud estimada, inclinación, período y época OMM. El almacenamiento local conserva solo los registros que pasan la lista de misiones civiles permitidas.
- Esta selección no equivale a todos los satélites que existen. El catálogo público puede contener huecos, objetos retirados, elementos antiguos o clasificaciones incompletas. Los resultados son posiciones matemáticamente calculadas, no telemetría GPS ni una fuente de navegación operacional.
- CelesTrak documenta OMM como formato compatible con números de catálogo ampliados; Satellite.js admite JSON OMM y propagación SGP4. NEXUS no usa TLE antiguo de cinco dígitos para estos objetos.

### Fuentes, límites y atribución
- Meteorología: https://open-meteo.com/en/docs y https://www.rainviewer.com/api.html
- Catálogo orbital: https://celestrak.org/NORAD/elements/gp.php?GROUP=WEATHER&FORMAT=JSON
- Formato orbital OMM: https://celestrak.org/NORAD/documentation/gp-data-formats.php
- Motor orbital: https://github.com/shashwatak/satellite-js
- Globo 3D orbital: CesiumJS con teselas cartográficas de OpenStreetMap; se muestran los créditos del proveedor en el visor.

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
