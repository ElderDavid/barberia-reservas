# Publicar la app en Google Play

La app de Play Store es la misma web, empaquetada como **Trusted Web Activity (TWA)**: Android la
abre a pantalla completa, sin barra del navegador, con su ícono y su pantalla de inicio. Cada cambio
que se publica en la web aparece en la app sin subir una versión nueva a Play.

## Lo que ya está listo en el código

- `src/app/manifest.ts`: nombre (sale del nombre de la barbería en Admin › Ajustes), ícono normal y *maskable*, color, orientación vertical y accesos
  directos ("Reservar cita", "Mis citas").
- `public/sw.js`: service worker que muestra `/sin-conexion` si se abre la app sin internet.
- `/.well-known/assetlinks.json`: prueba a Android que la app y la web son del mismo dueño. Sale
  de las variables `ANDROID_PACKAGE_NAME` y `ANDROID_CERT_SHA256`; sin ellas lista `[]`.
- Barra de pestañas inferior en el celular (Inicio, Reservar, Mis citas, Cuenta).

## Pasos (en orden)

1. **Publicar la web** con HTTPS (Vercel + Supabase, ver README). La app no funciona sin la web
   en línea. Sirve la dirección `*.vercel.app`; un dominio propio se ve mejor, pero si se cambia
   después hay que subir una versión nueva de la app. Antes de empaquetar, revisar en
   Admin › Ajustes el nombre de la barbería: es el nombre con el que se instala la app.
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
   seguridad de los datos (ver abajo), la política de privacidad `https://<dominio>/privacidad` y
   la URL para borrar la cuenta `https://<dominio>/cuenta/borrar`.
6. **Prueba cerrada**: las cuentas personales nuevas deben probar la app con al menos 12 personas
   durante 14 días antes de poder pedir la publicación en producción.
7. **Pedir producción**. Google revisa la app (normalmente unos días).

Si la app abre con la barra del navegador arriba, la huella o el paquete del paso 4 no coinciden.

## Formulario "Seguridad de los datos" (Play Console)

| Pregunta | Respuesta |
|---|---|
| ¿La app recoge o comparte datos del usuario? | Sí, los recoge; no los comparte con terceros (los encargados que procesan por cuenta nuestra no cuentan como "compartir"). |
| ¿Datos cifrados en tránsito? | Sí (HTTPS). |
| ¿El usuario puede pedir que se borren? | Sí: en la app (Cuenta › Borrar mi cuenta) y en `/cuenta/borrar`. |
| Información personal | Nombre, correo, número de teléfono. Recogidos, obligatorios para la cuenta. Finalidad: funcionalidad de la app y administración de la cuenta. |
| Información financiera | Historial de compras (citas y pagos). Finalidad: funcionalidad de la app. Los datos de tarjeta los maneja Wompi, no la app. |
| Actividad en la app | Otro contenido generado por el usuario (calificaciones y comentarios). Finalidad: funcionalidad de la app. |
| Identificadores, ubicación, fotos, contactos, salud | No se recogen. |
| Publicidad o analítica de terceros | No. |

En la App Store (iPhone) las respuestas equivalentes van en "App Privacy": *Contact Info* (nombre,
correo, teléfono) y *Purchases* y *User Content*, vinculados a la identidad, sin rastreo.
