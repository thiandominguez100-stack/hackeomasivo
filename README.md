# NEXUS 5.0 — Evidence & Incident Intelligence

NEXUS es un observatorio defensivo de información pública. Separa observaciones agregadas de sensores, avisos y vulnerabilidades de un registro histórico curado de incidentes documentados. No genera tráfico, rutas ni eventos ficticios y no contacta con sistemas observados.

## Cobertura de datos

### Telemetría agregada
- **DShield / SANS Internet Storm Center:** reportes diarios, fuentes y destinos observados por su red de sensores; historial de 30 días; nivel INFOCON.
- **Mapa por país:** agrega una muestra acotada de los principales registros que DShield comparte. Los círculos usan el país de registro de la red/ASN y un centroide nacional aproximado. No son ubicaciones de incidentes, víctimas, personas ni dispositivos. Se desvanecen hasta desaparecer antes del zoom local.
- El selector de ciudades sirve exclusivamente para explorar la cartografía base y edificios; no busca ni geolocaliza incidentes.

### Vulnerabilidades explotadas conocidas
- **CISA KEV:** catálogo oficial de vulnerabilidades con evidencia de explotación conocida. NEXUS muestra las incorporaciones más recientes y enlaces a NVD. Una entrada KEV no equivale por sí sola a un incidente nuevo contra una organización concreta.

### Ocho canales públicos de investigación y avisos
1. SANS ISC — diario de investigación y observaciones de sensores: https://isc.sans.edu/rssfeed.xml
2. CISA — avisos oficiales: https://www.cisa.gov/cybersecurity-advisories/all.xml
3. UK National Cyber Security Centre — informes, noticias y guías: https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml
4. CERT-EU — avisos de seguridad para instituciones de la Unión Europea: https://cert.europa.eu/publications/security-advisories-rss
5. Canadian Centre for Cyber Security — alertas y advisories: https://www.cyber.gc.ca/api/cccs/atom/v1/get?feed=alerts_advisories&lang=en
6. Australian Cyber Security Centre — alertas: https://www.cyber.gov.au/rss/alerts
7. CERT-SE Sweden — avisos e información de incidentes: https://www.cert.se/feed/rss.xml
8. CERT-UA Ukraine — análisis e informes de amenazas: https://cert.gov.ua/api/articles/rss

NEXUS conserva títulos, fuente, fecha y enlace oficial. No copia cuerpos de artículos, indicadores de compromiso, direcciones IP, muestras de malware ni instrucciones técnicas. Algunos titulares están en su idioma original. Un aviso o una vulnerabilidad no se convierte automáticamente en un registro de incidente.

### Registro histórico de incidentes
- **Archivo:** data/incidents.json. Es independiente del snapshot horario data/current.json para que el recolector no sobrescriba los registros editoriales.
- **Validación:** incidents.js verifica campos obligatorios, fechas, categorías, estados, precisión geográfica y enlaces HTTPS contra el dominio declarado. Las fichas inválidas no se muestran.
- **Búsqueda y filtros:** texto sin distinguir mayúsculas/acentos, país, categoría, estado y nivel de verificación.
- **Trazabilidad:** cada ficha separa fecha conocida del incidente, fecha de publicación y fecha del último estado comunicado por la fuente. La gravedad/impacto se marca sin evaluar cuando no hay evidencia pública suficiente.
- **Niveles de verificación:** fuente oficial o publicación de un medio que atribuye el dato a autoridades/organizaciones. No son etiquetas intercambiables.
- **Mantenimiento:** el registro se incorpora y revisa manualmente contra fuentes públicas; no es exhaustivo ni se actualiza en tiempo real. Su fecha de revisión no significa que el estado del incidente siga vigente.
- **Registros iniciales:** NEMA sobre Lincoln County/North Platte (Nebraska, 9 oct. 2026); U.S. Courts sobre la interrupción nacional de Bankruptcy Noticing Center (9–26 oct. 2026, restablecimiento comunicado el 27 oct.); y KWCH sobre el incidente de ransomware de Ellis County (Kansas, 17 sep. 2026; medio con atribución a funcionarios del condado).

## Actualización y arquitectura

1. GitHub Actions ejecuta scripts/refresh_intel.py una vez por hora; también puede ejecutarse manualmente desde Actions.
2. El recolector consulta servicios públicos de solo lectura y genera data/current.json.
3. El registro editorial data/incidents.json se sirve por separado y se valida en el navegador con incidents.js.
4. GitHub Pages sirve todos los archivos estáticos; la interfaz consulta el snapshot horario cada 60 segundos.
5. El service worker conserva los archivos de la aplicación y la última lectura válida para uso offline.

No hace falta Firebase, servidor propio, claves API ni credenciales para estas fuentes. La recolección se ejecuta en GitHub Actions, no en el navegador del visitante.

## Cómo interpretar los datos

- Los reportes de DShield son observaciones enviadas por sensores participantes. No equivalen automáticamente a delitos ni a ataques confirmados; puede haber escáneres de investigación, infraestructura compartida o falsos positivos.
- El país del mapa corresponde al registro de una red/ASN y se coloca en un centroide aproximado. No identifica la ubicación física de una persona, un dispositivo, una víctima, un atacante ni una instalación. Al acercar el mapa a escala local, las burbujas nacionales desaparecen para evitar falsas inferencias geográficas.
- Los incidentes del explorador no se dibujan como puntos. La precisión de la región se muestra en texto y no se derivan coordenadas a partir de una carretera, ciudad o condado.
- El estado de una ficha significa únicamente lo que la fuente comunicó en la fecha indicada. Puede haber cambiado después. La ausencia de una ficha no prueba que no hubiera un incidente.
- El nivel de impacto describe el impacto publicado o se conserva como no evaluado; no pretende puntuar la sofisticación técnica del atacante.
- CISA KEV es un catálogo de vulnerabilidades explotadas conocidas, no una secuencia de ataques en directo.
- Los canales públicos no cubren todos los incidentes de Internet y sus frecuencias de publicación varían. NEXUS no ofrece visibilidad mundial segundo a segundo.
- Si una fuente falla, se conserva su última lectura válida y se marca como anterior. No se generan datos sintéticos para completar huecos.

## Pruebas

- node --test tests/intel-dashboard.test.cjs
- node --test tests/incidents.test.cjs
- node --check app.js
- node --check incidents.js
- python -m py_compile scripts/refresh_intel.py
- python -m unittest discover -s tests -p "test_*.py"

## Publicación

GitHub Pages: Settings → Pages → Deploy from a branch → main → /(root).

URL: https://thiandominguez100-stack.github.io/hackeomasivo/
