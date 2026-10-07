import { Icon } from "@/components/ui/icon";

/**
 * Classes that fill star N when any rating from N up is checked. They are written out in full
 * because Tailwind only generates class names it finds literally in the source.
 */
const FILLED: Record<number, string> = {
  1: "group-has-[#estrellas-1:checked]:text-fg group-has-[#estrellas-2:checked]:text-fg group-has-[#estrellas-3:checked]:text-fg group-has-[#estrellas-4:checked]:text-fg group-has-[#estrellas-5:checked]:text-fg",
  2: "group-has-[#estrellas-2:checked]:text-fg group-has-[#estrellas-3:checked]:text-fg group-has-[#estrellas-4:checked]:text-fg group-has-[#estrellas-5:checked]:text-fg",
  3: "group-has-[#estrellas-3:checked]:text-fg group-has-[#estrellas-4:checked]:text-fg group-has-[#estrellas-5:checked]:text-fg",
  4: "group-has-[#estrellas-4:checked]:text-fg group-has-[#estrellas-5:checked]:text-fg",
  5: "group-has-[#estrellas-5:checked]:text-fg",
};

/**
 * Five radio buttons drawn as stars, without JavaScript. They are in ascending order, so arrow
 * keys move the way the stars are drawn; each star is filled when its rating or a higher one is
 * checked, and the star whose radio has keyboard focus gets the focus ring.
 */
export function StarRatingInput({
  defaultValue,
  describedBy,
}: {
  defaultValue?: number;
  describedBy?: string;
}) {
  return (
    <fieldset className="group space-y-2" aria-describedby={describedBy}>
      <legend className="font-medium">Tu calificación</legend>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((value) => (
          <label
            key={value}
            className={`flex size-12 cursor-pointer items-center justify-center rounded-control text-border has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:active:scale-90 ${FILLED[value]}`}
          >
            <input
              id={`estrellas-${value}`}
              type="radio"
              name="rating"
              value={value}
              required
              defaultChecked={value === defaultValue}
              className="sr-only"
            />
            <Icon name="star" className="size-9 fill-current" />
            <span className="sr-only">{value === 1 ? "1 estrella" : `${value} estrellas`}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
