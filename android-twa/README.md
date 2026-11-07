# App Android de prueba (TWA)

Empaqueta la web de producción como app Android (Trusted Web Activity) con el Package ID
`co.barberstore.app`. El workflow `.github/workflows/apk-prueba.yml` compila un APK de depuración
(firmado con la llave de depuración de Android) para instalarlo en un celular y probar.

Mientras `ANDROID_PACKAGE_NAME` y `ANDROID_CERT_SHA256` no estén puestas en Vercel con la huella de
esta llave, la app abre la web con una barra de dirección arriba. Es normal en la versión de prueba.
