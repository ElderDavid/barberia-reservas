/**
 * next/image loader (see `images.loaderFile` in next.config.ts). Photos come from Unsplash's
 * imgix CDN, which resizes and compresses on its own, so the Next image optimizer is not needed.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src.startsWith("https://images.unsplash.com/")) return src;
  return `${src}?auto=format&fit=max&w=${width}&q=${quality ?? 70}`;
}
