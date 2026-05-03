// Local module shims for npm packages that don't ship their own types.
// Keeping this here (instead of adding `@types/*` devDeps) avoids bloat for
// modules we only call through a small surface.

declare module "jsonwebtoken";
declare module "razorpay";
