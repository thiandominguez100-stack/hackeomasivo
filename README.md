# NEXUS Cyber Lab — HackeoMasivo

Centro de operaciones visual para una simulación local y ficticia de **3.000.000 de eventos** sobre un globo mundial rotatorio. Es una web estática preparada para GitHub Pages y como PWA instalable.

## Seguridad y privacidad

- Todos los eventos, recuentos y rutas son sintéticos; no representan ataques reales.
- No hay escaneos, explotación, contraseñas, paquetes, objetivos ni direcciones IP.
- El contador acumula el volumen simulado; el navegador anima muestras representativas para evitar crear millones de objetos.
- No hay backend, Firebase, claves, analítica ni integraciones de correo.
- Los únicos recursos cargados por la aplicación son los archivos del mismo repositorio. El service worker solo almacena recursos del mismo origen.

## Publicar

1. En GitHub abrí **Settings → Pages**.
2. En **Build and deployment**, elegí **Deploy from a branch**.
3. Seleccioná la rama `main` y la carpeta `/(root)`; guardá.
4. Cuando Pages finalice el despliegue, la web estará en:

   https://thiandominguez100-stack.github.io/hackeomasivo/

El sitio usa rutas relativas, por lo que funciona en el subdirectorio del proyecto.

## Instalar

- **Chrome o Edge en PC:** abrí la web y elegí el icono de instalación de la barra de direcciones o el botón **Instalar** cuando aparezca.
- **Android:** menú del navegador → **Instalar aplicación** o **Añadir a pantalla de inicio**.
- **iPhone/iPad:** Safari → **Compartir** → **Añadir a pantalla de inicio**.

Después de la primera carga, el service worker guarda los recursos locales para permitir el uso sin conexión.

## Implementación

La aplicación no necesita compilación ni servicios externos. Los recursos de ejecución están comprimidos en `assets/runtime/` y el cargador los descomprime en el navegador mediante `DecompressionStream`. Se requiere un navegador moderno con soporte para esa API y HTTPS (GitHub Pages lo proporciona).

El código editable y las pruebas automatizadas se entregan en el paquete fuente adjunto a la conversación.
