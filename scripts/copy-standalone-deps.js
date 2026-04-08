// Copies dynamically-required packages into the standalone output so that
// Hostinger's deployment (which uses Next.js standalone mode) has access to
// them at runtime. These packages are loaded by Sequelize via require(dialect)
// and cannot be detected by Next.js's static file tracer.
import fs from "fs";
import path from "path";

const standaloneModules = path.resolve(".next/standalone/node_modules");

// Skip if not a standalone build
if (!fs.existsSync(standaloneModules)) {
  console.log("No standalone output found, skipping dep copy.");
  process.exit(0);
}

const PACKAGES = [
  "mysql2",
  "sequelize",
  "express",
  "multer",
  "nodemailer",
  "razorpay",
  "sharp",
  "bcryptjs",
  "jsonwebtoken",
  "cookie-parser",
  "cors",
  "helmet",
  "morgan",
  "express-rate-limit",
  "express-validator",
];

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (fs.existsSync(dest)) return; // already there
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

for (const pkg of PACKAGES) {
  const src = path.resolve("node_modules", pkg);
  const dest = path.join(standaloneModules, pkg);
  copyDir(src, dest);
  console.log(`Copied: ${pkg}`);
}

console.log("Standalone deps copy complete.");
