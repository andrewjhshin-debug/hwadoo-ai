# Rounded-square lotus keycaps v5

Approved preview: approved-preview.png. Generated cup sheet: cups-source.png.

Built-in image_gen edit prompt: remove the three characters from the approved preview while retaining the exact three empty, tall rounded-square lotus keycap cups; complete hollow cavities, pink left and satin gold middle/right; identical camera, width, height and baseline; transparent background without floor or cast shadows. No redesign.

The exporter isolates each generated alpha island and normalizes it to a 960 × 660 cup box on a 1000 × 1400 canvas. All bases end at y=1380. Character artwork is retained from the existing skin. Matching front/back artwork forms a fixed cup; only the body moves 112 canvas pixels (8%) when pressed. Previous asymmetric CSS scaling is removed.

Rebuild: node scripts/prepare-keycaps-v5.mjs
Check: node scripts/keycap-v5-test.mjs

Rest/pressed exports were visually inspected in the actual layered CSS. Mobile production verification follows deployment.
