# NEXUS 4.2 — Global Cyber Threat Observatory

NEXUS dejó de generar tráfico, rutas o eventos ficticios. Ahora presenta un snapshot de fuentes públicas de inteligencia defensiva, actualizado automáticamente mediante GitHub Actions y publicado como JSON estático en GitHub Pages.

## Qué muestra

- DShield / SANS Internet Storm Center: totales diarios de reportes, fuentes y destinos observados por sensores; nivel INFOCON; y una muestra limitada de los principales registros de origen de los últimos 30 días.
- Mapa por país: agrega únicamente los registros de origen destacados que pudieron asociarse a un país de registro de red/ASN. Los círculos se colocan en centroides nacionales aproximados. No se publican las IP originales y no se trazan conexiones hacia víctimas.
- Historial: evolución de los reportes diarios recibidos por DShield durante los últimos 30 días.
- SANS Handler Diary y CISA All Advisories: titulares y fechas de análisis de seguridad, observaciones de sensores y avisos oficiales. Los enlaces abren el artículo original; no se copian instrucciones técnicas.
- Edificios 3D: se mantiene la cartografía urbana abierta de OpenFreeMap/OpenStreetMap y el inspector de atributos que existan para cada edificio.

## Actualización y arquitectura

1. GitHub Actions ejecuta scripts/refresh_intel.py una vez por hora (y también al añadir o actualizar el colector; se puede ejecutar manualmente desde Actions).
2. El colector consulta únicamente las APIs públicas de lectura de DShield y el JSON oficial de CISA.
3. Se genera data/current.json, que GitHub Pages sirve como archivo estático.
4. La interfaz consulta ese archivo cada 60 segundos. La frecuencia real de datos depende de las fuentes y del horario de recolección: no es telemetría segundo a segundo.

No hace falta Firebase, servidor propio, clave API ni credenciales. La recolección se ejecuta en GitHub Actions, no en el navegador del visitante.

## Fuentes y límites

- SANS Internet Storm Center / DShield: https://isc.sans.edu/data/ , https://isc.sans.edu/api/ y https://isc.sans.edu/rssfeed.xml
- CISA advisories RSS: https://www.cisa.gov/cybersecurity-advisories/all.xml
- CISA Known Exploited Vulnerabilities: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- OpenFreeMap: https://openfreemap.org/
- OpenStreetMap: https://www.openstreetmap.org/copyright

Interpretación correcta de los datos:
- Los reportes de DShield son observaciones comunicadas por sensores participantes. No equivalen automáticamente a delitos ni a ataques confirmados. Puede haber escáneres de investigación, infraestructura compartida y falsos positivos.
- El país se obtiene del registro de la red/ASN y se muestra como agregado. No identifica la ubicación física exacta de una persona, computadora, víctima ni edificio.
- CISA KEV registra vulnerabilidades con explotación conocida; no es un feed de incidentes en directo.
- Ninguna fuente pública cubre todos los ataques de Internet. NEXUS muestra solo las observaciones que sus proveedores comparten.
- Si una fuente deja de responder, NEXUS conserva la última lectura válida y la marca como anterior; nunca rellena los huecos con eventos sintéticos.

SANS ISC solicita atribución y publica condiciones de uso para sus datos. NEXUS enlaza y atribuye la fuente en la interfaz y no redistribuye los datos como un producto comercial.

## Desarrollo y pruebas

- Colector: python scripts/refresh_intel.py
- Pruebas Node: node --test tests/intel-dashboard.test.cjs
- Pruebas Python: python -m unittest discover -s tests -p test_*.py
- Sintaxis del colector: python -m py_compile scripts/refresh_intel.py

GitHub Pages: Settings → Pages → Deploy from a branch → main → /(root).

URL: https://thiandominguez100-stack.github.io/hackeomasivo/
