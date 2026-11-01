# Singing bowl: fit controls into one mobile viewport

The added progress/header space exposed an existing layout problem: the bowl used a width-driven square with an enforced minimum size, while tone/style controls and large inherited margins took additional height inside a scrolling practice area. At 360×640 with the install banner, the old practice area had 315px client height and 511px scroll height; style buttons extended beyond its bottom.

The bowl lane now uses the actual remaining flex height. Its grid reserves the count, tone controls and a 40px style-control row, then assigns the remaining height to the bowl. The bowl image uses object-contain to preserve its proportions in that cell. A dedicated bowl class avoids the old `hip-obj-sq` important width/height rule. Explicit single full-width grid columns prevent the inherited flex-start alignment from shrinking the grid to its text width. Scoped margins remove redundant gaps and bottom padding only for the bowl lane. Other practice lanes, top progress/header and bottom navigation are unchanged.

Actual in-app browser verification on localhost, with viewport overrides:

| Viewport | Practice overflow | Style buttons bottom | Practice bottom | Bottom navigation top |
|---|---:|---:|---:|---:|
| 320×568 | 0px | 456px | 472px | 498px |
| 360×640 | 0px | 528px | 544px | 570px |
| 390×844 | 0px | 732px | 748px | 774px |
| 430×932 | 0px | 820px | 836px | 860px |

Also checked 360×640 with the install banner present: practice overflow 0px and style buttons inside the practice area. All five bowl skins were selected through the real UI and remained fitted without style controls overlapping the image. This is browser viewport verification, not a claim of physical-phone testing.

Layout principle: reserve essential controls first and let artwork adapt to available space, rather than requiring a user to scroll to discover controls.
