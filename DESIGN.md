# NAKHLA RESIDENCE — design system (V12)

Studied: apple.com (home, iPhone) and Refero Styles ("Apple iPhone Duo" white gallery, "Apple iPhone 18 Pro" midnight gallery), read-only, 2026-11-16. Applied as tokens; nothing copied.

## Identity kept from the original
- Wordmark: NAKHLA RESIDENCE in Cormorant Garamond, used only for the brand mark.
- Accent: bronze `#8a6c4b` (deep `#6f553a`, light `#b58b5a` on dark). It takes the place of Apple's blue: links, selection, focus, primary pills on dark.

## Type
- Headlines: SF Pro Display stack (`-apple-system, SF Pro Display, Segoe UI Variable Display, …`), weight 600, tracking -0.022 to -0.025em, line-height 1.05 to 1.12.
- Body: SF Pro Text stack, 17 px, line-height 1.47, tracking -0.022em.
- Arabic and Sorani: SF Arabic, then Noto Sans Arabic.
- Chinese: PingFang SC.
- No uppercase eyebrows above headings. Context goes in a quiet subtitle underneath.

## Colour
| Role | Light (3D shell, plans) | Dark (photo site) |
|---|---|---|
| Canvas | `#f5f5f7` | `#000` |
| Surface / card | `#ffffff` | `#161617` |
| Ink | `#1d1d1f` | `#f5f5f7` |
| Secondary | `#6e6e73` | `#86868b` |
| Hairline | `#d6d6d6` / rgba(31,33,31,.12) | rgba(245,245,247,.12) |

## Material and shape
- **Bars:** translucent, rgba(29,29,31,.72) with saturate(180%) blur(20px), the Apple global-nav recipe.
- **Panels and sheets:** frosted rgba(245,245,247,.8–.9). The blur is used only on the high/ultra tiers over WebGL and is always used on the photo and plans pages.
- **Cards:** white and shadowless, 18 px radius (UI) or 28 px (media). Each surface has one elevation, never a border plus a shadow.
- **Photo captions:** dark glass, rgba(14,16,15,.46) with blur(26px), so text reads on any image.
- **Buttons:** 980 px pills, weight 500. Segmented controls follow iOS (a white thumb on a 6% ink track).

## Motion
- Experience switch: a View Transition cross-dissolve with a 1.5% depth shift and a 6 px blur, 520 ms, cubic-bezier(0.2, 0.9, 0.25, 1).
- Panels and sheets arrive as a material: translate, scale and blur together. Children stagger by 30 ms.
- Press: scale(0.97) in 90 ms. Hover lift: 1–2 px.
- Everything rests under reduced motion; blur is dropped under reduced transparency.

## Tooltips
Every icon-only control explains itself after a 420 ms hover or a long press (`src/ui/Tooltips.tsx`).
