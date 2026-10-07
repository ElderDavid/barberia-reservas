# Cuentas de clientes, fidelidad y calificaciones — diseño

Fecha: 2026-10-07 · Pedido por: AndroidProyect (dueño de BarberStore)

## 1. Qué queremos lograr

**Lo que pidió el dueño**

- Los clientes crean una cuenta y entran, en la web y en la app (Play Store primero, iPhone
  después), con pantallas como las de su imagen de referencia (bienvenida, entrar, inicio con
  saludo, perfil del barbero, reserva por pasos, mis citas, perfil).
- En su cuenta el cliente ve sus próximas citas, el historial de sus cortes y cuántas veces ha
  ido a la barbería.
- El cliente interactúa con el dueño.
- Diseño de primer nivel.

**Decisiones tomadas en el hilo**

- Los clientes entran con **correo y contraseña**. "Olvidé mi contraseña" llega por correo.
- La interacción es **calificación + fidelidad**: después de cada visita el cliente califica
  (1 a 5 estrellas) y comenta; el dueño responde desde el panel. Cada visita suma un sello a una
  tarjeta de fidelidad que termina en un premio.

**Lo que asumimos (el dueño puede corregirlo)**

- Se mantienen los colores y letras de la barbería (hueso, papel, café, tinta; Cormorant
  Garamond). De la imagen tomamos la forma de las pantallas, no el verde.
- Se puede seguir reservando **sin cuenta**. La cuenta agrega: datos ya llenos, historial,
  sellos y calificaciones.
- "Registrar sus cortes" es el **historial automático**: cada cita atendida queda con fecha,
  barbero, servicio y precio, y el cliente puede calificarla.
- Chat, notificaciones al celular, entrar con Google/Apple y fotos subidas por el cliente
  quedan **para después**.

**Cómo sabemos que quedó bien**

1. Un cliente nuevo se registra desde el celular en menos de un minuto y reserva con sus datos
   ya llenos.
2. En "Mis citas" ve sus citas próximas, pasadas y canceladas, y el número de visitas.
3. Cuando el dueño marca una cita como atendida, al cliente le aparece un sello y la opción de
   calificar.
4. El dueño ve en el panel la lista de clientes, sus visitas, sus calificaciones, responde
   comentarios y entrega el premio de fidelidad.
5. Un cliente puede borrar su cuenta desde la app (Google Play lo exige).
6. Las citas que el cliente hizo sin cuenta desde ese mismo celular pasan a su cuenta al entrar.

## 2. Lo que ve el cliente

Barra inferior en el celular: **Inicio · Reservar · Mis citas · Cuenta** (los barberos siguen
en Inicio y tienen su propia página).

| Pantalla | Ruta | Qué muestra |
|---|---|---|
| Entrar | `/entrar` | Correo y contraseña, "¿Olvidaste tu contraseña?", enlace a crear cuenta. Sirve para clientes y para el dueño: después de entrar, el dueño va a `/admin` y el cliente a `/cuenta`. |
| Crear cuenta | `/registro` | Nombre, celular, correo, contraseña (mín. 10), autorización de datos (Ley 1581). |
| Recuperar clave | `/recuperar` → `/restablecer` | Pide el correo; llega un enlace que vence en 1 hora para poner una clave nueva. |
| Inicio (con cuenta) | `/` | Saludo "Hola, Ana", tarjeta de la **próxima cita** con botón para verla, **tarjeta de fidelidad** (sellos), y el resto de la portada actual. Sin cuenta, la portada de hoy con un botón "Entrar". |
| Reservar | `/reservar` | Igual que hoy. Con cuenta, el paso final ya trae nombre y celular; la cita queda en la cuenta. |
| Mis citas | `/mis-citas` | Con cuenta: pestañas **Próximas · Pasadas · Canceladas**, cada cita con barbero, servicio, fecha, estado y, si fue atendida, sus estrellas o el botón "Calificar". Arriba, "Has venido 7 veces". Sin cuenta: la lista guardada en el celular, como hoy, más una invitación a crear cuenta. |
| Calificar | `/mis-citas/[id]/calificar` | 5 estrellas, comentario opcional (máx. 500 caracteres). Se puede editar mientras el dueño no haya respondido. Muestra la respuesta del dueño cuando llega. |
| Barbero | `/barberos/[id]` | Foto, nombre, promedio de estrellas (desde 3 calificaciones), últimos comentarios, servicios y botón "Reservar con …". |
| Cuenta | `/cuenta` | Nombre, celular, correo; editar datos; cambiar contraseña; tarjeta de fidelidad completa; salir; **borrar mi cuenta** (con confirmación). |

**Tarjeta de fidelidad.** Muestra N casillas (por defecto 10). Cada cita atendida de la cuenta
llena una. Al completar, dice "¡Ganaste un corte gratis! Muéstrale esta pantalla al barbero." El
dueño la canjea desde el panel y la tarjeta vuelve a empezar con los sellos que sobren.

**Citas hechas sin cuenta.** El celular ya guarda los enlaces privados de las citas que reservó
(`/cita/<token>`). Al entrar o crear cuenta, la app envía esos enlaces y el servidor pasa esas
citas a la cuenta. También en la página de una cita aparece "Guardar en mi cuenta". No se unen
citas solo porque coincida el número de celular: cualquiera podría escribir el número de otro.

## 3. Lo que ve el dueño

| Pantalla | Ruta | Qué muestra |
|---|---|---|
| Clientes | `/admin/clientes` | Buscador por nombre o celular. Cada cliente: visitas, última visita, si tiene cuenta, sellos, promedio que da. |
| Cliente | `/admin/clientes/[id]` | Historial de citas, calificaciones con su respuesta, botón **Canjear premio** cuando la tarjeta está llena. |
| Opiniones | `/admin/opiniones` | Calificaciones nuevas primero, con filtro "sin responder"; responder en la misma página. La agenda muestra un aviso con el número sin responder. |
| Ajustes | `/admin/ajustes` | Nuevo bloque "Fidelidad": sellos para el premio (0 = apagada) y texto del premio ("Corte gratis"). |

## 4. Cómo se construye (técnico)

**Usuarios y roles.** La tabla `user` gana `role` (`owner` | `customer`, por defecto
`customer`) y `phone`. La migración marca como `owner` al usuario que ya existe. better-auth:
`disableSignUp: false`; `role` es un campo adicional con `input: false`, así nadie puede
registrarse como dueño. `requireOwner()` exige `role = 'owner'`; nuevo `requireCustomer()`.
`ensureOwner` (PR #22) pasa a buscar `role = 'owner'` en vez de "el único usuario".

**Correo.** `src/server/mail.ts` envía por la API HTTP de Resend (`RESEND_API_KEY`,
`MAIL_FROM`). Sin la clave, "Olvidé mi contraseña" muestra "Escríbele a la barbería por WhatsApp"
y el resto funciona. El dueño crea la cuenta gratis de Resend; para enviar desde un dominio
propio hace falta el dominio (pendiente). Mientras tanto se usa el remitente de prueba de
Resend, que solo entrega al correo del dueño de la cuenta Resend: por eso el dominio es
necesario antes de abrir el registro al público.

**Citas y cuenta.** `bookings` gana `user_id` (nulo, FK a `user`, `on delete set null`).
`createBooking` recibe `userId` opcional. Reclamar con token: `claimBookings(userId, tokens[])`
compara el SHA-256 de cada token con `manage_token_hash` y solo asigna citas sin dueño.

**Calificaciones.** Tabla `reviews`: `booking_id` único, `user_id`, `rating` 1–5 (check),
`comment` ≤ 500, `owner_reply` ≤ 500, `replied_at`, fechas. Solo para citas `completed` de la
propia cuenta. Promedio por barbero calculado en la consulta (no se guarda).

**Fidelidad.** `shop_settings` gana `loyalty_goal` (0–30, por defecto 10) y `loyalty_reward`
(texto ≤ 60). Tabla `loyalty_redemptions` (`user_id`, `stamps_used`, `redeemed_at`,
`redeemed_by`). Sellos disponibles = citas `completed` de la cuenta − suma de `stamps_used`.

**Borrar cuenta.** Borra `user` (y por cascada sesiones, cuentas, reseñas, canjes); las citas
quedan con `user_id` nulo porque son registro contable de la barbería, y el cliente sigue en
`customers` como cuando reserva sin cuenta. La política de privacidad se actualiza.

**Seguridad.** Límite de intentos de better-auth en entrar, registro y recuperación; todas las
entradas pasan por zod; las acciones del cliente empiezan con `requireCustomer()` y filtran por
su `user_id`; ningún dato de un cliente es visible para otro.

**Diseño.** Se mantienen los tokens de `globals.css`. Pantallas nuevas con las piezas de
`src/components/ui/`, tarjetas tipo app como en la referencia (avatar, chips de estado,
estrellas), pestañas segmentadas en Mis citas, y la tarjeta de fidelidad con sellos que se
estampan con una animación de `transform` (apagada con reduced-motion). Se usa la guía de diseño
(frontend-design) en cada pantalla y una revisión de accesibilidad al final.

**Pruebas.** Integración: registro con rol cliente, el dueño no se puede crear desde el
registro, `ensureOwner` no toca clientes, reservar con cuenta, reclamar con token (válido,
ajeno, repetido), calificar solo citas atendidas propias, sellos y canje, borrar cuenta.
E2E (Pixel 7): registrarse → reservar → el dueño marca atendida → calificar → ver sello.

## 5. Orden de entrega (un PR por paso, cada uno se publica solo)

1. Roles, registro, entrar, recuperar clave, Cuenta y borrar cuenta (+ arreglo de `ensureOwner`).
2. Citas en la cuenta: reservar con cuenta, Mis citas con pestañas, contador de visitas,
   reclamar citas guardadas.
3. Calificaciones y respuestas del dueño, página del barbero con estrellas.
4. Fidelidad y panel de Clientes.
5. Pulido visual: Inicio con saludo y próxima cita, animaciones, revisión de accesibilidad.

## 6. Fuera de esta versión

Chat, notificaciones push, Google/Apple, fotos del cliente, varios locales, puntos o dinero en
la cuenta, pagos guardados.
