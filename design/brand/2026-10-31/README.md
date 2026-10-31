# Golden lotus app icon

Reuse the existing Android launcher artwork at `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png`. No new mark was designed. `scripts/export-gold-lotus-icons.mjs` mechanically crops transparent padding into `lotus-gold-master.png` and exports the PWA, favicon and Apple icon sizes through the existing exporter.

Installed-web icons use the Android ink-dark background `#0D0B09`; PNG favicons retain transparency. A separate maskable icon keeps the lotus inside the safe zone. Active manifest and metadata paths use `public/brand/lotus-gold-dark-v1/`; compatibility root icon files are updated too. Previous pink/mint designs remain in their versioned folders.

Native launcher resources already use this golden lotus and are unchanged. This update does not build or distribute a new APK. Installed PWA icon refresh timing is controlled by the browser and launcher; a web deployment cannot guarantee an immediate change on an existing home-screen icon.
