import type { BookingManageProps } from "@/components/site/booking/booking-manage";
import { authEnv } from "@/lib/env";
import { formatCop } from "@/lib/money";
import { addDays, formatDateTime, formatTime, localDay } from "@/lib/time";
import { getAvailability } from "@/server/booking/availability";
import { type BookingView, withinSelfServiceWindow } from "@/server/booking/manage";
import { checkoutUrl } from "@/server/payments/wompi";
import { cancelar, reprogramar } from "./[token]/actions";

export const BOOKING_TITLES: Record<string, string> = {
  confirmed: "Cita confirmada",
  cancelled: "Cita cancelada",
  completed: "Cita atendida",
  no_show: "No asististe a esta cita",
  held: "Pendiente de pago",
};

const ERRORS: Record<string, string> = {
  cutoff_passed: "Ya no puedes cambiarla desde aquí. Llama o escribe a la barbería.",
  slot_taken: "Ese horario ya no está disponible. Elige otro.",
  invalid_state: "Esta cita ya no se puede cambiar.",
};

const METHODS: Record<string, string> = {
  cash: "Efectivo en la barbería",
  transfer: "Transferencia",
};

function dayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/**
 * Everything the booking screen shows, for either way of opening it: the private link
 * (`/cita/<token>`) or the customer's account (`/mis-citas/<id>`).
 */
export async function manageProps(
  view: BookingView,
  options: {
    baseHref: string;
    idField: { name: "token" | "cita"; value: string };
    dia?: string;
    error?: string;
    now: Date;
    viaLink: boolean;
  },
): Promise<BookingManageProps> {
  const { booking, service, barber, shop } = view;
  const { now } = options;
  const canManage = booking.status === "confirmed" && withinSelfServiceWindow(view, now);
  const holdExpiresAt = booking.holdExpiresAt;
  const holdActive =
    booking.status === "held" && holdExpiresAt !== null && holdExpiresAt.getTime() > now.getTime();
  const today = localDay(now, shop.timezone);
  const slots =
    canManage && options.dia
      ? await getAvailability({ day: options.dia, serviceId: service.id, barberId: barber.id, now })
      : [];
  return {
    details: {
      service: service.name,
      barber: barber.name,
      when: formatDateTime(booking.startsAt, shop.timezone),
      price: formatCop(booking.priceCop),
      payment: METHODS[booking.paymentMethod],
    },
    rescheduled: booking.status === "cancelled" && booking.cancelReason === "reprogramada",
    message: options.error ? ERRORS[options.error] : undefined,
    pay:
      holdActive && holdExpiresAt
        ? {
            amount: formatCop(booking.depositCop),
            until: formatTime(holdExpiresAt, shop.timezone),
            url: checkoutUrl({
              reference: `BK-${booking.id}`,
              amountCop: booking.depositCop,
              expiresAt: holdExpiresAt,
              redirectUrl: `${authEnv().APP_URL}${options.baseHref}`,
            }),
            refreshHref: options.baseHref,
          }
        : undefined,
    holdExpired: booking.status === "held" && !holdActive,
    linkHint: options.viaLink ? { cutoffHours: shop.selfServiceCutoffHours } : undefined,
    whatsappHref: `https://wa.me/${shop.whatsappPhone}`,
    locked: booking.status === "confirmed" && !canManage,
    manage: canManage
      ? {
          baseHref: options.baseHref,
          idField: options.idField,
          days: Array.from({ length: 14 }, (_, i) => {
            const day = addDays(today, i);
            return { day, label: dayLabel(day) };
          }),
          dia: options.dia,
          slots: slots.map((slot) => ({
            iso: slot.startsAt.toISOString(),
            label: formatTime(slot.startsAt, shop.timezone),
          })),
          cancelar,
          reprogramar,
        }
      : undefined,
  };
}
