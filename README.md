# NEXUS Cyber Operations Lab v3.5

Simulador de telemetría cibernética **completamente ficticia**, preparado para GitHub Pages y PWA.

## Funciones
- Globo interactivo MapLibre GL con zoom hasta nivel de calle, huellas de edificios y extrusión 3D basada en alturas cartográficas cuando están disponibles.
- Rutas geodésicas curvas entre ciudades de referencia, con color de línea por categoría ficticia (phishing, malware, denegación de servicio, acceso no autorizado y reconocimiento) y color de flecha por velocidad visual.
- Inspector de edificios: al seleccionar una huella o volumen 3D, muestra nombre, tipo, altura declarada o estimada, pisos y dirección cuando esos atributos existen.
- Selector de 12, 24 o 36 rutas, interruptor de visibilidad y salto directo a ciudades.
- Contador de eventos de 1 a 1.000.000.000.000, velocidad configurable, pausa, reinicio, progreso y telemetría.
- Panel regional, feed de eventos, métricas y marcadores visuales limitados para cuidar el rendimiento.
- PWA instalable con shell local básico.

## Cartografía y nivel de detalle
- Los edificios se dibujan desde teselas vectoriales globales de OpenFreeMap, basadas en datos de OpenStreetMap. A zoom urbano se muestran huellas y volúmenes 3D; la altura, forma y presencia de cada edificio dependen de los datos disponibles en cada localidad.
- No se puede garantizar que aparezca cada casa ni que existan fachadas, interiores, tejados detallados o alturas medidas para todas las construcciones. En áreas con menor cobertura, algunos edificios pueden faltar o usar una altura estimada.
- El mapa no incorpora Google Maps ni imágenes privadas. Se mantiene una fuente abierta de cartografía, sin claves ni backend.

## Seguridad y límites
Todos los flujos, eventos y referencias son generados localmente. No representan ataques reales, víctimas, direcciones IP ni objetivos. No se generan paquetes, escaneos, solicitudes de intrusión ni tráfico de red. Las categorías son etiquetas visuales de escenarios ficticios, no ataques ejecutados ni datos observados. El mapa solo aporta geografía pública; las rutas no se basan en actividad real. No usa Firebase, backend, credenciales, analítica ni correo.

## Desarrollo
Pruebas: `node --test tests/simulation.test.cjs`
GitHub Pages: Settings → Pages → Deploy from a branch → main → /(root).
URL: https://thiandominguez100-stack.github.io/hackeomasivo/

El mapa requiere conexión para cargar MapLibre y las teselas de OpenFreeMap/OpenStreetMap. La interfaz y el motor de simulación funcionan localmente.