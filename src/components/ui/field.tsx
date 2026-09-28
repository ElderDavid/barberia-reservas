import { type InputHTMLAttributes, useId } from "react";

export type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "name"> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

export function Field({ label, name, error, hint, className, ...props }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const classes = [
    "min-h-11 w-full rounded-control border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={classes}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-fg-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
