import { Fragment } from "react";
import { Icon } from "@/components/ui/icon";

const VALUES = [5, 4, 3, 2, 1];

/**
 * Five radio buttons drawn as stars, without JavaScript. They sit in reverse order inside a
 * `flex-row-reverse` row, so a checked radio fills its own star and every lower one through the
 * `~` sibling selector behind Tailwind's `peer-checked`.
 */
export function StarRatingInput({ defaultValue }: { defaultValue?: number }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">Tu calificación</legend>
      <div className="inline-flex flex-row-reverse justify-end rounded-control has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary">
        {VALUES.map((value) => (
          <Fragment key={value}>
            <input
              id={`estrellas-${value}`}
              type="radio"
              name="rating"
              value={value}
              required
              defaultChecked={value === defaultValue}
              className="peer sr-only"
            />
            <label
              htmlFor={`estrellas-${value}`}
              className="flex size-12 cursor-pointer items-center justify-center text-border hover:text-fg peer-checked:text-fg motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:active:scale-90"
            >
              <Icon name="star" className="size-9 fill-current" />
              <span className="sr-only">{value === 1 ? "1 estrella" : `${value} estrellas`}</span>
            </label>
          </Fragment>
        ))}
      </div>
    </fieldset>
  );
}
