import { GoogleGenAI } from "@google/genai";
import { getApiKey } from "./geminiService";

export interface SocialMediaShot {
  id: string;
  label: string;
  group: "A" | "B" | "C";
  groupLabel: string;
  aspectRatio: string;
  hasText: boolean;
  description: string;
  /** Which reference image index to prefer: 0=hero/best, 1=second best, 2=close-up, etc. */
  preferredImageIndex: number;
  promptBuilder: (
    generationPrompt: string,
    signatureDetails: string,
    productName: string,
    brandName: string,
    hasLogo: boolean
  ) => string;
}

export interface SocialMediaResult {
  id: string;
  label: string;
  aspectRatio: string;
  imageUrl: string | null;
  status: "pending" | "generating" | "done" | "error";
  error?: string;
}

export interface SocialMediaProgress {
  currentGroup: "A" | "B" | "C" | "done";
  currentShot: string;
  completedCount: number;
  totalCount: number;
  results: SocialMediaResult[];
}

export type SocialMediaCallback = (progress: SocialMediaProgress) => void;

// SM pipeline uses the PRO model for higher quality (same as BannerGenius)
const SM_IMAGE_MODEL = "gemini-3-pro-image-preview";

const getApiAspectRatio = (ratio: string): string => {
  if (ratio === "2:3" || ratio === "4:5") return "3:4";
  return ratio;
};

// Direct image generation using the PRO model
async function generateSmImage(
  prompt: string,
  referenceImages: string[],
  aspectRatio: string,
  textFirst: boolean
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const parts: any[] = [];

  if (textFirst) {
    parts.push({ text: prompt });
    for (const img of referenceImages.slice(0, 4)) {
      const matches = img.match(/^data:([^;]*);base64,(.+)$/);
      if (matches) {
        parts.push({ inlineData: { mimeType: matches[1] || "image/jpeg", data: matches[2] } });
      } else {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: img } });
      }
    }
  } else {
    for (const img of referenceImages.slice(0, 4)) {
      const matches = img.match(/^data:([^;]*);base64,(.+)$/);
      if (matches) {
        parts.push({ inlineData: { mimeType: matches[1] || "image/jpeg", data: matches[2] } });
      } else {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: img } });
      }
    }
    parts.push({ text: prompt });
  }

  const response = await ai.models.generateContent({
    model: SM_IMAGE_MODEL,
    contents: { parts },
    config: {
      responseModalities: ["IMAGE", "TEXT"],
      imageConfig: {
        aspectRatio: getApiAspectRatio(aspectRatio),
        imageSize: "1K",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Görsel oluşturulamadı.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMOTIONAL BANNER PROMPT SYSTEM
// Takes EXISTING product photos and creates designed advertising banners.
// Does NOT generate new product photography — uses reference images as-is.
// ═══════════════════════════════════════════════════════════════════════════════

const PROMO_BANNER_PROMPT = (
  generationPrompt: string,
  signatureDetails: string,
  _productName: string,
  brandName: string,
  layoutInstructions: string,
  aspectRatio: string,
  hasLogo: boolean,
) => `You are a GRAPHIC DESIGNER creating a promotional banner/advertisement for a premium Turkish bedding brand.

CRITICAL CONCEPT: You are NOT generating a new product photograph. The attached reference images ARE the product photos — your job is to take those existing photos and compose them into a DESIGNED ADVERTISING LAYOUT with typography, gradients, and brand elements. Think of this as editorial design, not photography.

PRODUCT CONTEXT:
${generationPrompt}

PRODUCT DETAILS: ${signatureDetails}

═══ DESIGN APPROACH ═══

YOUR TASK:
1. Use the attached product photo(s) as the PRIMARY VISUAL ELEMENT — do not re-imagine or re-generate the product. Preserve the exact colors, patterns, embroidery, and textile details from the reference images.
2. Place the product photo within a designed layout that has dedicated TEXT ZONES.
3. Add gradient overlays ONLY where text will appear, to ensure readability.
4. Render typography that looks hand-crafted by a luxury brand's design team.
5. The final output must look like a polished Instagram advertisement — NOT a product photo with text slapped on top.

CANVAS: ${aspectRatio} aspect ratio.

═══ GRADIENT & OVERLAY SYSTEM ═══

- Gradient zones serve ONE purpose: making text readable over the product image.
- Use warm, deep tones for gradients: warm charcoal (#2B1C10), deep taupe (#3D2E2A), espresso (#352520).
- NEVER use pure black (#000000) gradients — always warm-tinted.
- Gradient opacity: 25-40% where text sits, fading to fully transparent over the product.
- The transition must feel like natural shadow — smooth, cinematic, organic.
- The product image area (without text) must remain UNTOUCHED by overlays.

═══ TYPOGRAPHY SYSTEM (CRITICAL — THIS DEFINES QUALITY) ═══

FONT STYLES (exactly 2):
- PRIMARY: Thin elegant SERIF (Didot / Playfair Display / Bodoni style). Used for product name and headlines.
- SECONDARY: Clean geometric SANS-SERIF (Montserrat Light / Avenir Light / Futura Light style). Used for subtext, features, CTAs.

COLOR PALETTE FOR TEXT:
- Headlines: warm cream (#F4E1D2) or champagne (#E1D4C1). NEVER pure white.
- Subtext: muted warm tone (#C6AC8E) or dusty rose (#D5AA9F).
- CTA text: same warm cream as headlines.
- NEVER use pure black (#000000) or pure white (#FFFFFF) for ANY text.

TYPOGRAPHY RULES (MANDATORY):
- ⚠️ LANGUAGE RULE — ABSOLUTE, NO EXCEPTIONS: ALL text on the image MUST be in TURKISH. Not English, not any other language. ONLY Turkish. If you are tempted to write "Discover", write "Keşfet" instead. If you are tempted to write "New Collection", write "Yeni Koleksiyon". If you are tempted to write "Premium Quality", write "Premium Kalite". EVERY word must be Turkish.
- Font weight: Light to Regular ONLY. NEVER bold, heavy, semi-bold, or thick.
- Letter-spacing: generous and wide — this is the luxury signal.
- Text occupies MAXIMUM 25% of total image area. The rest is breathing room and product.
- Minimum 8% margin from all edges.
- Text alignment: left-aligned or centered, NEVER right-aligned.
- Maximum 3 levels of text hierarchy. Less is more.

${brandName ? `BRAND ELEMENT: "${brandName}" — render in ultra-thin, small SANS-SERIF at the bottom or a corner. Very wide letter-spacing. Uppercase. Understated and minimal — like how Zara or COS displays their brand name.` : ""}
${hasLogo ? `LOGO: A brand logo image is included as one of the reference images (the LAST image in the set). Place it small and subtle in the corner of the design — typically bottom-right or bottom-center. The logo should be small (max 5-8% of canvas area), semi-transparent if needed, and should NOT compete with the product or typography. If the logo has a background, integrate it cleanly.` : ""}

WHAT MAKES IT LOOK CHEAP (AVOID ALL):
- Thick, bold, or heavy fonts of any kind
- Drop shadows on text
- Pure black or pure white text
- Text covering more than 30% of the image
- Bright saturated accent colors
- Generic "sale banner" or template aesthetics
- Multiple competing font weights
- Text directly on busy product areas without gradient separation
- Warped, distorted, or 3D text effects
- Decorative borders or frames around the image

═══ SPECIFIC LAYOUT ═══

${layoutInstructions}

═══ FINAL OUTPUT REQUIREMENTS ═══
- The result must look like it was designed by the in-house creative team of Zara Home, Restoration Hardware, or West Elm.
- Product textile details (colors, embroidery, pattern) MUST match the reference images EXACTLY.
- The design should feel warm, inviting, and premium — not cold or clinical.
- Add very subtle grain/texture (2-3%) for premium depth.
- NO people in the image.
- The product photo should dominate the composition — typography is the supporting element, not the main event.`;


export const SOCIAL_MEDIA_SHOTS: SocialMediaShot[] = [
  // ═══ GROUP A: Banner Görselleri (text overlays on product photos) ═══
  {
    id: "sm_feed_banner",
    label: "Instagram Feed Banner",
    group: "A",
    groupLabel: "Banner Görselleri",
    aspectRatio: "3:4",
    hasText: true,
    description: "Ürün ismi + slogan + logo ile feed görseli",
    preferredImageIndex: 0,
    promptBuilder: (gp, sig, productName, brandName, hasLogo) =>
      PROMO_BANNER_PROMPT(gp, sig, productName, brandName,
        `LAYOUT TYPE: "Editorial Bottom Bar"

COMPOSITION:
- The product photo fills the ENTIRE canvas — edge to edge, no borders.
- Pick the BEST reference image (the one with the clearest view of the product on a styled bed).
- A warm gradient overlay rises from the bottom edge, covering the bottom 30-35% of the image.
- Gradient: transparent at 35% height → warm charcoal (#2B1C10) at 30% opacity at the bottom edge.
- All text lives WITHIN this gradient zone.

TEXT CONTENT (Turkish):
- LINE 1 (Primary Serif, warm cream #F4E1D2, large, wide letter-spacing):
  "${productName}"
- LINE 2 (Secondary Sans-Serif Light, dusty rose #D5AA9F, smaller, ultra-wide tracking, uppercase):
  Choose ONE that fits the product: "EŞSİZ KONFOR" / "PREMIUM DOKUNUŞ" / "ZARIF TASARIM" / "DOĞAL ZARAFET"
  Pick based on product details — if cotton, use "DOĞAL ZARAFET"; if embroidered, use "ZARIF TASARIM"; if luxury feel, use "PREMIUM DOKUNUŞ".
${brandName ? `- BRAND (tiny sans-serif, #C6AC8E, bottom-right corner, ultra-wide tracking): "${brandName}"` : ""}

TEXT ALIGNMENT: Left-aligned, anchored to bottom-left with 10% margin from left and bottom edges.
The text block should feel like an elegant caption — minimal, restrained, breathing.`,
        "4:5", hasLogo),
  },
  {
    id: "sm_story_banner",
    label: "Instagram Story",
    group: "A",
    groupLabel: "Banner Görselleri",
    aspectRatio: "9:16",
    hasText: true,
    description: "Tam ekran story formatında tanıtım",
    preferredImageIndex: 1,
    promptBuilder: (gp, sig, productName, brandName, hasLogo) =>
      PROMO_BANNER_PROMPT(gp, sig, productName, brandName,
        `LAYOUT TYPE: "Full-Screen Vertical Story"

COMPOSITION:
- The product photo fills the ENTIRE 9:16 vertical canvas — edge to edge.
- Scale and crop the best reference image to fill the tall vertical format. The product should be the hero.
- TWO gradient zones:
  1. TOP: A subtle warm gradient from top edge downward, covering top 20%. For the product name.
     Gradient: warm charcoal (#2B1C10) at 25% opacity at top → transparent at 20% height.
  2. BOTTOM: A warm gradient from bottom edge upward, covering bottom 15%. For the CTA.
     Gradient: transparent at 15% height → warm charcoal (#2B1C10) at 30% opacity at bottom.
- The CENTER of the image (60-70%) is COMPLETELY clean — pure product, no overlay.

TEXT CONTENT (Turkish):
- TOP ZONE — LINE 1 (Primary Serif, champagne #E1D4C1, centered horizontally, positioned at ~8% from top):
  "${productName}"
  Large, thin, wide letter-spacing. This is the hero text.
- TOP ZONE — LINE 2 (Secondary Sans-Serif Light, muted #C6AC8E, centered, below product name):
  "YENİ KOLEKSİYON" — ultra-wide tracking, uppercase, small.
- BOTTOM ZONE — CTA (Secondary Sans-Serif Light, warm cream #F4E1D2, centered, ~5% from bottom):
  "Keşfet →" — slightly larger than the subheadline, with an arrow character.
${brandName ? `- BRAND (tiny sans-serif, #C6AC8E, centered, just above CTA): "${brandName}"` : ""}

The overall feel: a luxury story ad where the product commands attention and the text is minimal and elegant.`,
        "9:16", hasLogo),
  },
  {
    id: "sm_carousel_intro",
    label: "Carousel Açılış",
    group: "A",
    groupLabel: "Banner Görselleri",
    aspectRatio: "3:4",
    hasText: true,
    description: "Carousel açılış kartı, split layout",
    preferredImageIndex: 0,
    promptBuilder: (gp, sig, productName, brandName, hasLogo) =>
      PROMO_BANNER_PROMPT(gp, sig, productName, brandName,
        `LAYOUT TYPE: "Split Frame — Color Panel + Product"

COMPOSITION:
- SPLIT the canvas vertically into two zones:
  LEFT PANEL (35% width): A solid warm color block.
    Color: deep warm charcoal (#2B1C10) at 92% opacity, or deep taupe (#3D2E2A).
    This panel holds ALL the text. Clean, uncluttered.
  RIGHT PANEL (65% width): The product photo, edge-to-edge within this zone.
    Use the best reference image. Crop to fill the right panel naturally.
    A very subtle gradient (5-10% opacity) bleeds from the left panel into the right panel for seamless transition.

- The split should feel architectural and intentional — like a magazine spread.

TEXT CONTENT on LEFT PANEL (Turkish):
- LINE 1 (Primary Serif, warm cream #F4E1D2, left-aligned within the panel with 15% inner margin):
  "${productName}"
  Positioned at ~40% height of the panel. Large, thin, elegant.
- LINE 2 (Secondary Sans-Serif Light, #C6AC8E, left-aligned, below product name, small):
  Two key features from the product details, like:
  "✓ %100 Pamuk"
  "✓ Nakışlı Tasarım"
  Pick the 2 most important features from: ${sig}
  Use thin checkmark bullets. One feature per line. Ultra-clean.
${brandName ? `- BRAND (tiny sans-serif, #C6AC8E, bottom of left panel, ultra-wide tracking): "${brandName}"` : ""}

The left panel is the "title card" and the right panel is the "product reveal." Together they create a premium carousel opening.`,
        "4:5", hasLogo),
  },

  // ═══ GROUP B: Carousel Devam ═══
  {
    id: "sm_carousel_features",
    label: "Carousel Özellikler",
    group: "B",
    groupLabel: "Carousel Devam",
    aspectRatio: "3:4",
    hasText: true,
    description: "Ürün özellik kartı, infographic tarzı",
    preferredImageIndex: 2,
    promptBuilder: (gp, sig, productName, brandName, hasLogo) =>
      PROMO_BANNER_PROMPT(gp, sig, productName, brandName,
        `LAYOUT TYPE: "Feature Badges Over Product"

COMPOSITION:
- The product photo fills the ENTIRE canvas as background.
- A LIGHT warm gradient overlay covers the full image at 15-20% opacity — just enough to slightly mute the photo so text badges pop, but the product is still clearly visible.
- Feature badges are positioned as FLOATING TEXT ELEMENTS scattered tastefully across the image, avoiding the center product focus area.

FEATURE BADGES — each badge is a text element with these specs:
- Background: warm charcoal (#2B1C10) at 70% opacity, with generous padding (like a pill-shaped label).
- Text: Secondary Sans-Serif Light, warm cream (#F4E1D2), uppercase, wide letter-spacing.
- Size: small to medium — readable but not dominant.
- Shape: rounded rectangle / pill shape, very subtle.
- Corners: softly rounded (think modern UI chip/tag).

BADGE CONTENT (Turkish — pick 3-4 from product details, these are examples):
Based on the product details "${sig}", select the most relevant:
- "%100 PAMUK" (if cotton)
- "NAKIŞLI TASARIM" (if embroidered)
- "6 PARÇA SET" or "7 PARÇA SET" or "8 PARÇA SET" (piece count from details)
- "PREMIUM KALİTE"
- "SATEN DOKUMA" (if satin)
- "ÇIFT KİŞİLİK" (if double size)

BADGE PLACEMENT:
- Distribute 3-4 badges around the periphery of the image (top-left area, right side, bottom-left, etc.)
- Leave the CENTER of the image clean — the product should breathe.
- Badges should feel like they're floating with purpose, not randomly scattered.
- Connect badges to product areas with very subtle thin lines (1px, #C6AC8E at 30% opacity) — optional, only if it looks clean.

${brandName ? `BRAND: "${brandName}" — tiny, bottom-center, same style as other banners.` : ""}

The overall feel: a clean product infographic — informative but still luxurious. Like a premium e-commerce feature card.`,
        "4:5", hasLogo),
  },
  {
    id: "sm_carousel_cta",
    label: "Carousel Kapanış",
    group: "B",
    groupLabel: "Carousel Devam",
    aspectRatio: "3:4",
    hasText: true,
    description: "Kapanış kartı, CTA odaklı",
    preferredImageIndex: 3,
    promptBuilder: (gp, sig, productName, brandName, hasLogo) =>
      PROMO_BANNER_PROMPT(gp, sig, productName, brandName,
        `LAYOUT TYPE: "Centered Minimal CTA"

COMPOSITION:
- The product photo fills the ENTIRE canvas as background.
- A HEAVY warm gradient overlay covers the full image at 40-50% opacity.
  Color: warm charcoal (#2B1C10) to deep espresso (#352520).
  The product should be visible but significantly muted — the text is the star of this card.
- The overlay creates a moody, warm, cinematic atmosphere.

TEXT CONTENT (Turkish):
- HERO TEXT (Primary Serif, warm cream #F4E1D2, CENTERED both horizontally and vertically):
  "Keşfet"
  This is the LARGEST text element — bold presence but still thin/elegant font weight.
  Wide letter-spacing. Positioned at exact vertical center of the canvas.
  This single word should command the entire composition.

- PRODUCT NAME (Secondary Sans-Serif Light, #C6AC8E, centered, BELOW the hero text with generous spacing):
  "${productName}"
  Smaller than "Keşfet". Ultra-wide tracking. Uppercase.

${brandName ? `- BRAND (tiny sans-serif, warm cream #F4E1D2, centered, bottom 8% of canvas, ultra-wide tracking):
  "${brandName}"
  The final element — understated, elegant closure.` : ""}

NEGATIVE SPACE: This card is ALL about negative space. The three text elements (Keşfet, product name, brand) are the ONLY elements. No badges, no features, no decorative elements. The heavy overlay + minimal text = maximum impact.

The overall feel: a closing card that says "this is premium, come explore." Like the last slide of a Zara Home carousel — moody, warm, and inviting.`,
        "4:5", hasLogo),
  },
];

export async function runSocialMediaPipeline(
  referenceImages: string[],
  generationPrompt: string,
  signatureDetails: string,
  productName: string,
  brandName: string,
  enabledShotIds: string[],
  logoBase64: string | undefined,
  onProgress: SocialMediaCallback
): Promise<SocialMediaResult[]> {
  const shots = SOCIAL_MEDIA_SHOTS.filter(s => enabledShotIds.includes(s.id));
  const results: SocialMediaResult[] = shots.map(s => ({
    id: s.id,
    label: s.label,
    aspectRatio: s.aspectRatio,
    imageUrl: null,
    status: "pending" as const,
  }));

  const report = (currentShot: string, group: "A" | "B" | "C" | "done") => {
    onProgress({
      currentGroup: group,
      currentShot,
      completedCount: results.filter(r => r.status === "done" || r.status === "error").length,
      totalCount: results.length,
      results: [...results],
    });
  };

  const hasLogo = !!logoBase64;

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    results[i].status = "generating";
    report(shot.label, shot.group);

    try {
      const prompt = shot.promptBuilder(
        generationPrompt,
        signatureDetails,
        productName,
        brandName,
        hasLogo
      );

      // Pick different reference images for each shot to create variety
      // Each shot has a preferredImageIndex — we rotate the reference array so that image comes first
      const shotRefs = [...referenceImages];
      if (shotRefs.length > 1) {
        const idx = shot.preferredImageIndex % shotRefs.length;
        // Move preferred image to front, keep others as additional context
        const preferred = shotRefs.splice(idx, 1);
        shotRefs.unshift(...preferred);
      }

      // Append logo as the last reference image if available
      if (logoBase64) {
        const logoDataUrl = logoBase64.startsWith("data:") ? logoBase64 : `data:image/png;base64,${logoBase64}`;
        shotRefs.push(logoDataUrl);
      }

      // Use the SM-specific high-quality image generator
      const imageUrl = await generateSmImage(
        prompt,
        shotRefs,
        shot.aspectRatio,
        shot.hasText // textFirst for banner shots
      );

      results[i].imageUrl = imageUrl;
      results[i].status = "done";
    } catch (err: any) {
      results[i].status = "error";
      results[i].error = err.message || "Görsel oluşturulamadı";
    }

    report(shot.label, i < shots.length - 1 ? shots[i + 1].group : "done");
  }

  return results;
}
