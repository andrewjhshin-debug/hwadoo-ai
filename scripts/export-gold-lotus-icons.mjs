// Reuse the existing Android golden lotus; crop transparent padding and export sizes.
import fs from "node:fs/promises";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
const source = "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png";
const master = "design/brand/2026-10-31/lotus-gold-master.png";
await fs.mkdir("design/brand/2026-10-31", { recursive: true });
await sharp(source).trim().png().toFile(master);
execFileSync(process.execPath, ["scripts/export-logo04-icons.mjs", master, "public/brand/lotus-gold-dark-v1", "#0D0B09", "--opaque-install"], { stdio: "inherit" });
