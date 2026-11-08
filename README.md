# NEXUS Cyber Lab — HackeoMasivo

Simulación visual, local y ficticia de tres millones de eventos cibernéticos sobre un globo mundial rotatorio. Proyecto estático preparado para GitHub Pages e instalación como PWA.

## Importante: demostración, no ataques reales

- El contador representa eventos ficticios generados localmente en el navegador.
- El mapa dibuja rutas ilustrativas entre ciudades públicas de referencia.
- No se ejecutan escaneos, ataques, pruebas de contraseñas, explotación ni tráfico de red.
- No se usan direcciones IP, objetivos, dominios, puertos o vulnerabilidades reales.
- El volumen de tres millones se agrega en un contador; el navegador anima muestras representativas en el globo y el feed, en lugar de crear tres millones de objetos.
- No hay Firebase, backend, claves ni llamadas a APIs externas. Gmail no forma parte del proyecto.

## Publicar en GitHub Pages

En el repositorio abrí **Settings → Pages**, elegí **Deploy from a branch**, seleccioná `main` y la carpeta `/(root)`, y guardá. La dirección prevista es `https://thiandominguez100-stack.github.io/hackeomasivo/`.

La web usa rutas relativas y funciona bajo el subdirectorio `/hackeomasivo/`.

## Instalar

En Chrome/Edge usá el botón **Instalar** cuando aparezca o el icono de instalación de la barra de direcciones. En Android elegí **Instalar aplicación** o **Añadir a pantalla de inicio**. En iPhone/iPad: Safari → Compartir → Añadir a pantalla de inicio.

El service worker almacena la interfaz local para permitir abrirla offline después de la primera carga.

## Pruebas

No hay dependencias externas. Con Node.js ejecutá `npm test` y `npm run check`.
