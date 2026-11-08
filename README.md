# NEXUS Cyber Operations Lab v2

Simulador visual local de telemetría cibernética ficticia, preparado para GitHub Pages y PWA.

- Globo interactivo MapLibre GL con navegación, zoom, inclinación y edificios 3D al acercarse a zonas urbanas.
- Volumen configurable de 1 a 1.000.000.000.000 eventos sintéticos.
- El motor calcula el contador por tiempo; no crea un objeto por evento.
- Máximo de 65 marcadores animados para preservar memoria y rendimiento.
- Métricas, feed, regiones y controles de intensidad.
- PWA instalable con shell básico offline.

Seguridad: todos los eventos y nodos son ficticios. No se generan solicitudes a objetivos, escaneos, paquetes ni ataques. La cartografía representa geografía pública de OpenFreeMap/OpenStreetMap, no objetivos. Sin Firebase, backend, claves, analítica ni correo.

Publicación: GitHub Settings > Pages > Deploy from a branch > main > /(root).
URL: https://thiandominguez100-stack.github.io/hackeomasivo/

El mapa 3D requiere internet para cargar MapLibre y teselas vectoriales; motor y controles son locales.