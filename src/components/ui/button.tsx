import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-fg",
  secondary: "border border-border bg-surface text-fg",
  danger: "border border-destructive text-destructive",
};

const BASE =
  "inline-flex min-h-11 items-center justify-center rounded-control px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export function Button({ variant = "primary", type = "button", className, ...props }: ButtonProps) {
  const classes = [BASE, VARIANTS[variant], className].filter(Boolean).join(" ");
  return <button type={type} className={classes} {...props} />;
}
