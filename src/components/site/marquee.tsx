type MarqueeProps = { items: string[] };

const COPIES = [0, 1, 2, 3];

/**
 * A slow band of words. The track holds four copies and slides by half its width, so the loop is
 * seamless; only the first copy is exposed to assistive technology.
 */
export function Marquee({ items }: MarqueeProps) {
  if (items.length === 0) return null;
  return (
    <div className="overflow-hidden bg-cocoa py-5 text-on-cocoa">
      <div className="marquee-track flex w-max">
        {COPIES.map((copy) => (
          <ul key={copy} aria-hidden={copy > 0 || undefined} className="flex shrink-0 items-center">
            {items.map((item) => (
              <li key={item} className="flex items-center whitespace-nowrap">
                <span className="px-6 font-display text-2xl">{item}</span>
                <span aria-hidden="true">✦</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
