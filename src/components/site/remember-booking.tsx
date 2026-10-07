"use client";

import { useEffect } from "react";
import { rememberBooking } from "@/lib/saved-bookings";

/** Saves this booking's private link on the phone, so "Mis citas" can list it later. */
export function RememberBooking(props: { path: string; title: string; when: string }) {
  const { path, title, when } = props;
  useEffect(() => {
    rememberBooking({ path, title, when });
  }, [path, title, when]);
  return null;
}
