"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { readSaved } from "@/lib/saved-bookings";

type Props = { claim: (formData: FormData) => Promise<number> };

/**
 * Sends the private links remembered on this phone to the server once, so bookings made before
 * signing in join the account. Renders nothing; the list refreshes when something moved.
 */
export function ClaimSavedBookings({ claim }: Props) {
  const router = useRouter();
  useEffect(() => {
    const tokens = readSaved().map((item) => item.path.slice("/cita/".length));
    if (tokens.length === 0) return;
    const form = new FormData();
    for (const token of tokens) form.append("token", token);
    void claim(form).then((claimed) => {
      if (claimed > 0) router.refresh();
    });
  }, [claim, router]);
  return null;
}
