# NEXUS Cyber Operations Lab v3

Simulador de telemetría cibernética **completamente ficticia**, preparado para GitHub Pages y PWA.

## Funciones
- Globo interactivo MapLibre GL con zoom, inclinación y edificios 3D cuando la cartografía urbana los proporciona.
- Rutas geodésicas curvas entre ciudades de referencia, con líneas luminosas y flechas animadas que muestran el sentido de cada flujo sintético.
- Selector de 12, 24 o 36 rutas, interruptor de visibilidad y salto directo a ciudades.
- Contador de eventos de 1 a 1.000.000.000.000, velocidad configurable, pausa, reinicio, progreso y telemetría.
- Panel regional, feed de eventos, métricas y marcadores visuales limitados para cuidar el rendimiento.
- PWA instalable con shell local básico.

## Seguridad y límites
Todos los flujos, eventos y referencias son generados localmente. No representan ataques reales, víctimas, direcciones IP ni objetivos. No se generan paquetes, escaneos, solicitudes de intrusión ni tráfico de red. El mapa solo aporta geografía pública; las rutas no se basan en actividad real. No usa Firebase, backend, credenciales, analítica ni correo.

## Desarrollo
Pruebas: `node --test tests/simulation.test.cjs`
GitHub Pages: Settings → Pages → Deploy from a branch → main → /(root).
URL: https://thiandominguez100-stack.github.io/hackeomasivo/

El mapa requiere conexión para cargar MapLibre y las teselas de OpenFreeMap/OpenStreetMap. La interfaz y el motor de simulación funcionan localmente.