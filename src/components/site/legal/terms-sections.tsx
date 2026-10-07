import Link from "next/link";
import type { LegalInfo } from "@/lib/legal";
import { Fill, type LegalSection } from "./legal-page";

const A = "underline underline-offset-4";

/** Términos y condiciones de uso (Ley 1480 de 2011, Ley 527 de 1999). */
export function termsSections(info: LegalInfo): LegalSection[] {
  const id = info.legalIdType ? `${info.legalIdType} ${info.legalIdNumber}` : "";
  const hours = info.cancelCutoffHours;
  return [
    {
      id: "quienes",
      title: "Quién presta el servicio",
      body: (
        <p>
          Esta página y la app de {info.shopName} las ofrece <Fill value={info.legalName} />,
          identificado con <Fill value={id} />, con domicilio en <Fill value={info.address} />.
          Contacto: <Fill value={info.privacyEmail} />
          {info.whatsappPhone ? ` o WhatsApp +${info.whatsappPhone}` : ""}. Al usar la página o la
          app aceptas estos términos.
        </p>
      ),
    },
    {
      id: "cuenta",
      title: "Tu cuenta",
      body: (
        <ul className="space-y-1">
          <li>Puedes reservar sin cuenta. La cuenta es gratuita y opcional.</li>
          <li>
            Debes dar datos reales y tener 14 años o más (los menores de 14, con su representante).
          </li>
          <li>
            Tu contraseña es personal. Si crees que alguien la conoce, cámbiala en Cuenta o
            escríbenos.
          </li>
          <li>
            Puedes borrar tu cuenta cuando quieras desde{" "}
            <Link href="/cuenta/borrar" className={A}>
              Cuenta › Borrar mi cuenta
            </Link>
            . Podemos cerrar una cuenta que se use para suplantar a otra persona, para reservas
            falsas repetidas o para publicar contenido ofensivo.
          </li>
        </ul>
      ),
    },
    {
      id: "reservas",
      title: "Reservas, precios y pagos",
      body: (
        <ul className="space-y-1">
          <li>
            Los precios están en pesos colombianos e incluyen los impuestos que apliquen. El precio
            que ves al reservar es el que pagas.
          </li>
          <li>
            Puedes pagar en efectivo en la barbería o en línea con Wompi (Nequi, PSE o tarjeta). Si
            pagas en línea, tu reserva queda apartada unos minutos mientras se confirma el pago.
          </li>
          <li>
            Los pagos en línea los procesa Wompi en su propia plataforma, bajo sus términos;
            nosotros no recibimos ni guardamos datos de tu tarjeta o tus claves.
          </li>
          <li>
            Te enviamos el comprobante de la reserva en pantalla y lo puedes ver en "Mis citas".
          </li>
        </ul>
      ),
    },
    {
      id: "cancelaciones",
      title: "Cambios, cancelaciones y reembolsos",
      body: (
        <>
          <ul className="space-y-1">
            <li>
              Puedes cambiar o cancelar tu cita tú mismo hasta {hours} horas antes. Después de ese
              plazo, escríbenos y lo vemos contigo.
            </li>
            <li>
              Si cancelas a tiempo y ya habías pagado un anticipo, te lo devolvemos completo por el
              mismo medio de pago, en máximo 30 días calendario.
            </li>
            <li>
              Si la barbería cancela tu cita, te avisamos y te devolvemos lo pagado, o te ofrecemos
              otra hora si la prefieres.
            </li>
            <li>
              Si no llegas a tu cita sin avisar, el anticipo puede no ser reembolsable; te lo
              explicamos antes de pagar.
            </li>
          </ul>
          <p>
            Estas reglas no limitan tus derechos como consumidor bajo la Ley 1480 de 2011 (Estatuto
            del Consumidor), incluida la garantía de que el servicio se preste con la calidad
            ofrecida y, cuando aplique, el derecho de retracto en compras a distancia (5 días
            hábiles, siempre que el servicio no se haya empezado a prestar).
          </p>
        </>
      ),
    },
    {
      id: "calificaciones",
      title: "Calificaciones y comentarios",
      body: (
        <ul className="space-y-1">
          <li>
            Después de cada visita puedes calificar el servicio y dejar un comentario, que la
            barbería puede responder. Tu nombre de pila y tu calificación pueden mostrarse en la
            página del barbero.
          </li>
          <li>
            No publiques insultos, amenazas, datos personales de otras personas ni publicidad.
            Podemos ocultar los comentarios que incumplan estas reglas.
          </li>
        </ul>
      ),
    },
    {
      id: "fidelidad",
      title: "Tarjeta de fidelidad",
      body: (
        <ul className="space-y-1">
          <li>
            Cada cita atendida de tu cuenta suma un sello. El premio y los sellos que necesitas se
            ven en la tarjeta.
          </li>
          <li>
            Los sellos y premios son gratuitos, personales, no se cambian por dinero y no se pueden
            transferir.
          </li>
          <li>
            Podemos cambiar o terminar el programa avisando en la app con al menos 30 días; los
            premios que ya hayas completado se respetan.
          </li>
          <li>Si borras tu cuenta, pierdes los sellos acumulados.</li>
        </ul>
      ),
    },
    {
      id: "uso",
      title: "Uso de la página y la app",
      body: (
        <p>
          Los textos, el diseño, las marcas y las imágenes pertenecen a {info.shopName} o a sus
          autores y se usan con licencia. No está permitido copiarlos, intentar acceder a cuentas
          ajenas, automatizar reservas ni afectar el funcionamiento del servicio. Hacemos lo posible
          porque el servicio esté siempre disponible, pero puede haber interrupciones por
          mantenimiento o fallas de terceros.
        </p>
      ),
    },
    {
      id: "datos",
      title: "Tus datos personales",
      body: (
        <p>
          Tratamos tus datos según la{" "}
          <Link href="/privacidad" className={A}>
            Política de tratamiento de datos
          </Link>
          , que forma parte de estos términos.
        </p>
      ),
    },
    {
      id: "pqr",
      title: "Peticiones, quejas y reclamos",
      body: (
        <p>
          Escríbenos al correo <Fill value={info.privacyEmail} />
          {info.whatsappPhone ? " o por WhatsApp" : ""}. Respondemos en máximo 15 días hábiles. Si
          no quedas conforme, puedes acudir a la Superintendencia de Industria y Comercio.
        </p>
      ),
    },
    {
      id: "ley",
      title: "Ley aplicable y cambios",
      body: (
        <p>
          Estos términos se rigen por las leyes de Colombia, en especial la Ley 1480 de 2011 y la
          Ley 527 de 1999 sobre comercio electrónico. Si los cambiamos, te avisaremos en la app y te
          pediremos aceptar la nueva versión.
        </p>
      ),
    },
  ];
}
