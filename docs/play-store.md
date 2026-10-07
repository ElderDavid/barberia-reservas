# Publicar la app en Google Play

La app de Play Store es la misma web, empaquetada como **Trusted Web Activity (TWA)**: Android la
abre a pantalla completa, sin barra del navegador, con su ícono y su pantalla de inicio. Cada cambio
que se publica en la web aparece en la app sin subir una versión nueva a Play.

## Lo que ya está listo en el código

- `src/app/manifest.ts`: nombre, ícono normal y *maskable*, color, orientación vertical y accesos
  directos ("Reservar cita", "Mis citas").
- `public/sw.js`: service worker que muestra `/sin-conexion` si se abre la app sin internet.
- `/.well-known/assetlinks.json`: prueba a Android que la app y la web son del mismo dueño. Sale
  de las variables `ANDROID_PACKAGE_NAME` y `ANDROID_CERT_SHA256`; sin ellas lista `[]`.
- Barra de pestañas inferior en el celular (Inicio, Reservar, Mis citas, Barberos).

## Pasos (en orden)

1. **Publicar la web** con dominio propio y HTTPS (Vercel + Supabase, ver README). La app
   no funciona sin la web en línea.
2. **Crear la cuenta de desarrollador de Google Play** en <https://play.google.com/console>
   (pago único de 25 USD y verificación de identidad).
3. **Generar el paquete Android** en <https://www.pwabuilder.com>:
   - Pegar la dirección de la web → *Package for stores* → *Android*.
   - Package ID sugerido: `co.<dominio>.app` (por ejemplo `co.barberiaelcorte.app`). No se puede
     cambiar después.
   - Descargar el .zip. Trae el archivo `.aab` (lo que se sube a Play), la llave de firma
     (`signing.keystore` + contraseñas: **guardarlas en un lugar seguro**, sin ellas no se puede
     actualizar la app) y un `assetlinks.json` de ejemplo.
4. **Configurar las variables en Vercel** (Settings → Environment Variables) y volver a publicar:
   - `ANDROID_PACKAGE_NAME` = el Package ID del paso 3.
   - `ANDROID_CERT_SHA256` = la huella SHA-256 que aparece en ese `assetlinks.json`. Cuando Play
     firme la app (paso 5), agregar también la huella de *App signing key certificate*
     (Play Console → Configuración → Integridad de la app), separadas por coma.
   - Comprobar: `https://<dominio>/.well-known/assetlinks.json` debe mostrar el paquete y las huellas.
5. **Crear la app en Play Console**, subir el `.aab`, llenar la ficha (descripción, capturas,
   ícono 512×512, categoría *Estilo de vida*), la clasificación de contenido, la sección de
   seguridad de los datos (se recoge nombre y celular para gestionar citas; no se comparten) y la
   política de privacidad: `https://<dominio>/privacidad`.
6. **Prueba cerrada**: las cuentas personales nuevas deben probar la app con al menos 12 personas
   durante 14 días antes de poder pedir la publicación en producción.
7. **Pedir producción**. Google revisa la app (normalmente unos días).

Si la app abre con la barra del navegador arriba, la huella o el paquete del paso 4 no coinciden.
