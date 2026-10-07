import Link from "next/link";
import { LEGAL_PROCESSORS, type LegalInfo } from "@/lib/legal";
import { Fill, type LegalSection } from "./legal-page";

const A = "underline underline-offset-4";

/** Política de tratamiento de datos personales (Ley 1581 de 2012, Decreto 1377 de 2013). */
export function privacySections(info: LegalInfo): LegalSection[] {
  const id = info.legalIdType ? `${info.legalIdType} ${info.legalIdNumber}` : "";
  return [
    {
      id: "responsable",
      title: "Responsable del tratamiento",
      body: (
        <ul className="space-y-1">
          <li>
            Responsable: <Fill value={info.legalName} />, identificado con <Fill value={id} />, en
            nombre del establecimiento {info.shopName}.
          </li>
          <li>
            Dirección: <Fill value={info.address} />.
          </li>
          <li>
            Correo para temas de datos personales: <Fill value={info.privacyEmail} />.
          </li>
          <li>
            WhatsApp: <Fill value={info.whatsappPhone ? `+${info.whatsappPhone}` : ""} />.
          </li>
        </ul>
      ),
    },
    {
      id: "datos",
      title: "Qué datos recogemos",
      body: (
        <>
          <p>Recogemos solo lo necesario para atenderte:</p>
          <ul className="space-y-1">
            <li>Al reservar: tu nombre y tu número de celular.</li>
            <li>
              Si creas una cuenta: además, tu correo y una contraseña, que guardamos cifrada; nadie,
              ni siquiera la barbería, puede leerla.
            </li>
            <li>
              Lo que pasa en la barbería: tus citas (fecha, barbero, servicio, precio y estado), los
              pagos, tus calificaciones y comentarios, y los sellos de tu tarjeta de fidelidad.
            </li>
            <li>
              Datos técnicos mínimos para que tu sesión funcione y sea segura: la dirección IP y el
              tipo de navegador de cada inicio de sesión.
            </li>
          </ul>
          <p>
            No pedimos datos sensibles (salud, origen, creencias, biometría) ni datos financieros:
            los pagos en línea los hace Wompi en su propia página y nosotros no vemos tu tarjeta ni
            tus claves.
          </p>
        </>
      ),
    },
    {
      id: "finalidades",
      title: "Para qué los usamos",
      body: (
        <ul className="space-y-1">
          <li>Agendar, confirmar, cambiar y cancelar tus citas.</li>
          <li>Comunicarnos contigo sobre tus citas, por WhatsApp, llamada o correo.</li>
          <li>
            Mostrarte tu historial, tus visitas y tu tarjeta de fidelidad, y entregarte premios.
          </li>
          <li>Recibir y responder tus calificaciones y comentarios.</li>
          <li>Llevar la contabilidad del negocio y cumplir obligaciones legales y tributarias.</li>
          <li>Proteger tu cuenta y evitar fraudes.</li>
        </ul>
      ),
    },
    {
      id: "autorizacion",
      title: "Tu autorización",
      body: (
        <p>
          Antes de reservar o de crear tu cuenta te pedimos que autorices el tratamiento marcando
          una casilla que nunca viene marcada. Guardamos la fecha y la versión de esta política que
          aceptaste, como prueba. Puedes revocar la autorización cuando quieras, salvo que debamos
          conservar un dato por una obligación legal o contractual.
        </p>
      ),
    },
    {
      id: "derechos",
      title: "Tus derechos",
      body: (
        <>
          <p>Como titular de tus datos puedes, sin costo:</p>
          <ul className="space-y-1">
            <li>Conocer, actualizar y rectificar tus datos.</li>
            <li>Pedir prueba de la autorización que nos diste.</li>
            <li>Saber qué uso le hemos dado a tus datos.</li>
            <li>Revocar la autorización y pedir que suprimamos tus datos.</li>
            <li>
              Presentar quejas ante la Superintendencia de Industria y Comercio (SIC), después de
              haber hecho tu consulta o reclamo ante nosotros.
            </li>
          </ul>
          <p>
            Con cuenta, puedes hacer buena parte tú mismo en{" "}
            <Link href="/cuenta" className={A}>
              Cuenta
            </Link>
            : editar tus datos, descargarlos y{" "}
            <Link href="/cuenta/borrar" className={A}>
              borrar tu cuenta
            </Link>
            .
          </p>
        </>
      ),
    },
    {
      id: "procedimiento",
      title: "Cómo hacer consultas y reclamos",
      body: (
        <>
          <p>
            Escríbenos al correo <Fill value={info.privacyEmail} /> o por WhatsApp, con tu nombre,
            tu celular, lo que pides y cómo quieres recibir la respuesta.
          </p>
          <ul className="space-y-1">
            <li>
              Consultas: respondemos en máximo 10 días hábiles; si no alcanzamos, te avisamos y
              respondemos en máximo 5 días hábiles más.
            </li>
            <li>
              Reclamos (corregir, suprimir o revocar): respondemos en máximo 15 días hábiles; si no
              alcanzamos, te avisamos y respondemos en máximo 8 días hábiles más. Si al reclamo le
              falta información, te la pedimos en los 5 días siguientes; si no la recibimos en 2
              meses, entendemos que desististe.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "encargados",
      title: "Quién más trata tus datos",
      body: (
        <>
          <p>
            No vendemos ni compartimos tus datos con fines publicitarios. Para funcionar usamos
            estas empresas, que tratan los datos solo por encargo nuestro y con medidas de
            seguridad:
          </p>
          <ul className="space-y-1">
            {LEGAL_PROCESSORS.map((p) => (
              <li key={p.name}>
                {p.name}: {p.purpose} (servidores en {p.country}).
              </li>
            ))}
          </ul>
          <p>
            Algunos de esos servidores están fuera de Colombia, en países con niveles adecuados de
            protección o bajo contratos que la exigen. Al autorizar esta política aceptas esa
            transmisión internacional.
          </p>
        </>
      ),
    },
    {
      id: "seguridad",
      title: "Seguridad y conservación",
      body: (
        <>
          <p>
            La conexión va siempre cifrada (HTTPS), las contraseñas se guardan cifradas y solo el
            dueño entra al panel. Guardamos tus datos mientras tengas citas o cuenta con nosotros y
            hasta 24 meses después de tu última actividad; luego los suprimimos. Los registros
            contables (ventas y pagos) se conservan el tiempo que exige la ley, sin más datos tuyos
            de los necesarios.
          </p>
          <p>
            Si borras tu cuenta, eliminamos tu perfil, tu correo, tus calificaciones y tus sellos.
            Tus citas pasadas quedan como registro contable de la barbería, solo con tu nombre y tu
            celular, como si hubieras reservado sin cuenta.
          </p>
        </>
      ),
    },
    {
      id: "menores",
      title: "Menores de edad",
      body: (
        <p>
          La cuenta es para personas de 14 años o más. Los menores de 14 años pueden reservar con la
          autorización de su padre, madre o representante, quien debe hacer el registro y la
          autorización en su nombre. Respetamos siempre el interés superior del menor.
        </p>
      ),
    },
    {
      id: "cookies",
      title: "Cookies y almacenamiento en tu celular",
      body: (
        <p>
          Solo usamos una cookie necesaria para mantener tu sesión abierta. En tu celular guardamos
          los enlaces de las citas que reservaste para mostrarlas en "Mis citas". No usamos cookies
          de publicidad ni de rastreo.
        </p>
      ),
    },
    {
      id: "cambios",
      title: "Cambios, vigencia y registro",
      body: (
        <p>
          Si cambiamos esta política te lo avisaremos en la app y te pediremos aceptar la nueva
          versión antes de seguir usando tu cuenta. Por el tamaño del negocio, normalmente no
          estamos obligados a inscribir nuestra base de datos en el Registro Nacional de Bases de
          Datos (aplica a sociedades con activos de más de 100.000 UVT); si eso cambia, lo haremos.
          Esta política se rige por la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el
          Decreto 1074 de 2015) y las normas que los modifiquen.
        </p>
      ),
    },
  ];
}
