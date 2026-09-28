// Lets `tsc --noEmit` type-check side-effect stylesheet imports without Next's generated
// next-env.d.ts being present.
declare module "*.css";
