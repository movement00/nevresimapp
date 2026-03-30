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
  promptBuilder: (
    generationPrompt: string,
    signatureDetails: string,
    productName: string,
    brandName: string,
    logoBase64?: string
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

// ===== BANNER PROMPT — BannerGenius style with gradient rules =====
const BANNER_PROMPT = (
  generationPrompt: string,
  signatureDetails: string,
  _productName: string,
  brandName: string,
  textInstructions: string,
  aspectRatio: string,
) => `You are a World-Class Art Director & Social Media Designer creating a premium marketing banner.

PRODUCT CONTEXT:
${generationPrompt}

PRODUCT DETAILS: ${signatureDetails}

═══ DESIGN SYSTEM (MANDATORY) ═══

LAYOUT RULES:
- The product (bedding set) is the HERO element — occupying 60-70% of the frame.
- Product must be beautifully styled on a bed in a premium bedroom setting.
- Warm, cinematic lighting with soft shadows.
- Composition optimized for ${aspectRatio} aspect ratio.

GRADIENT OVERLAY (MANDATORY):
- Apply a smooth gradient overlay on the image to create a text-safe zone.
- The gradient should flow from transparent (where the product is) to a rich, dark color (where the text is).
- Use warm tones: deep charcoal (#1a1a2e), warm black (#0d0d0d), or dark navy (#0a1628).
- The gradient must be SMOOTH, CINEMATIC, and PROFESSIONAL — not harsh or flat.
- Gradient opacity: 40-70% in the text zone, 0-10% on the product zone.

TYPOGRAPHY RULES (CRITICAL):
- ALL text MUST be in TURKISH.
- Use CLEAN, MODERN, PREMIUM typography — think luxury brand advertising.
- Headline: Large, bold, sans-serif or elegant serif font. WHITE or CREAM color.
- Subtext/slogan: Lighter weight, smaller size. Warm white or gold (#d4a574) color.
- Text must have HIGH CONTRAST against the gradient background — fully readable.
- Letter spacing: slightly expanded for elegance.
- DO NOT use cheap, tacky, or amateur-looking fonts.
- Text placement must be in the gradient zone, NOT overlapping the product.

${brandName ? `BRAND: Display "${brandName}" in small, elegant text — corner or bottom.` : ""}

TEXT CONTENT (IN TURKISH):
${textInstructions}

═══ CRITICAL RULES ═══
- Product colors, embroidery, and textile details MUST match reference images EXACTLY.
- NO people in the image.
- The final result must look like a high-budget social media advertisement — NOT a cheap template.
- Think: luxury bedding brand Instagram page, Restoration Hardware, Zara Home level quality.`;

// ===== LIFESTYLE PROMPT — cinematic quality =====
const LIFESTYLE_PROMPT = (
  generationPrompt: string,
  signatureDetails: string,
  sceneInstructions: string,
  aspectRatio: string
) => `You are a World-Class Product Photographer creating an editorial lifestyle photograph.

PRODUCT CONTEXT:
${generationPrompt}

PRODUCT DETAILS: ${signatureDetails}

═══ PHOTOGRAPHY BRIEF ═══

SCENE: ${sceneInstructions}

CAMERA & LIGHTING:
- Shot with a high-end DSLR (Canon 5D Mark IV or Sony A7R V).
- Natural window light, warm color temperature (~4200K).
- Shallow to medium depth of field for cinematic bokeh.
- Professional color grading: warm, inviting, slightly desaturated for editorial feel.

COMPOSITION:
- Optimized for ${aspectRatio} aspect ratio.
- Rule of thirds, leading lines, visual flow.
- Magazine/catalog quality — Restoration Hardware or Zara Home level.

═══ CRITICAL RULES ═══
- NO text, NO labels, NO watermarks on the image.
- Must look like a GENUINE DSLR photograph — NOT CGI or AI-generated looking.
- Product colors, embroidery, and textile details MUST match reference images EXACTLY.
- NO people in the image.
- NO extra textile products not shown in references.`;

export const SOCIAL_MEDIA_SHOTS: SocialMediaShot[] = [
  // ═══ GROUP A: Text Banner Visuals ═══
  {
    id: "sm_feed_banner",
    label: "Instagram Feed Banner",
    group: "A",
    groupLabel: "Yazılı Banner",
    aspectRatio: "3:4",
    hasText: true,
    description: "Ürün ismi + slogan + logo ile feed görseli",
    promptBuilder: (gp, sig, productName, brandName) =>
      BANNER_PROMPT(gp, sig, productName, brandName,
        `HEADLINE: "${productName}" — large, bold, premium serif or sans-serif typography.
SLOGAN: Generate a short, aspirational Turkish marketing slogan (e.g., "Hayalinizdeki Konfor", "Lüks Dokunuş, Her Gece", "Evinize Premium Dokunuş").
PLACEMENT: Headline at top or bottom third of image. Slogan just below headline.`,
        "4:5"),
  },
  {
    id: "sm_story_banner",
    label: "Instagram Story Banner",
    group: "A",
    groupLabel: "Yazılı Banner",
    aspectRatio: "9:16",
    hasText: true,
    description: "Tam ekran story formatında tanıtım",
    promptBuilder: (gp, sig, productName, brandName) =>
      BANNER_PROMPT(gp, sig, productName, brandName,
        `Full-screen vertical story format (9:16).
HEADLINE: "${productName}" — bold, centered, large typography at top third.
SUBTEXT: A bold Turkish attention line like "YENİ KOLEKSİYON" or "PREMIUM KALİTE".
CTA: At the very bottom, a swipe-up style call-to-action: "Keşfet →" or "İncele →" in smaller text.
GRADIENT: Bottom-to-top gradient — darker at bottom for CTA readability, transparent at center for product visibility.`,
        "9:16"),
  },
  {
    id: "sm_carousel_intro",
    label: "Carousel Kart 1 — Tanıtım",
    group: "A",
    groupLabel: "Yazılı Banner",
    aspectRatio: "3:4",
    hasText: true,
    description: "Carousel açılış kartı, ürün tanıtımı",
    promptBuilder: (gp, sig, productName, brandName) =>
      BANNER_PROMPT(gp, sig, productName, brandName,
        `Opening card of a carousel series.
HEADLINE: "${productName}" — hero headline, large and bold.
FEATURES: 2-3 key product features in Turkish, displayed as a clean list:
  "✓ %100 Pamuk Saten"
  "✓ Nakışlı Tasarım"
  "✓ Premium Kalite"
PLACEMENT: Text block at bottom third with gradient overlay. Product dominant in upper 2/3.
STYLE: Clean, modern, makes the viewer want to SWIPE for more.`,
        "4:5"),
  },

  // ═══ GROUP B: Aesthetic/Lifestyle (No Text) ═══
  {
    id: "sm_lifestyle",
    label: "Lifestyle Shot",
    group: "B",
    groupLabel: "Estetik Görsel",
    aspectRatio: "3:4",
    hasText: false,
    description: "Yaşam alanında ürün, yazısız",
    promptBuilder: (gp, sig) =>
      LIFESTYLE_PROMPT(gp, sig,
        `Warm, sun-filled Scandinavian-contemporary bedroom. The bed is the centerpiece with the product beautifully styled — duvet artfully turned back showing layers. Soft morning light through sheer curtains creating long, warm shadows. A coffee cup on the nightstand, a knit throw casually draped on a nearby chair. Light oak flooring, warm plaster walls. Inviting, aspirational "I want this bedroom" mood. Shot at f/4 with 50mm lens at a slight 3/4 angle from the foot of the bed.`,
        "4:5"),
  },
  {
    id: "sm_detail",
    label: "Detay Close-up",
    group: "B",
    groupLabel: "Estetik Görsel",
    aspectRatio: "1:1",
    hasText: false,
    description: "Doku ve kalite detay çekimi, yazısız",
    promptBuilder: (gp, sig) =>
      LIFESTYLE_PROMPT(gp, sig,
        `Extreme close-up macro photograph of the fabric texture and embroidery. Fill the ENTIRE frame with the textile surface — show individual thread structure, weave pattern, satin stitch sheen, and embroidery stitching in photorealistic detail. Shallow depth of field: tack-sharp center fading to creamy bokeh at edges. Side lighting at 30-45 degrees raking across the surface to reveal stitch depth and thread dimensionality. Background is out-of-focus bedding surface. Shot at f/4 with 100mm macro lens.`,
        "1:1"),
  },

  // ═══ GROUP C: Carousel Continuation ═══
  {
    id: "sm_carousel_angle",
    label: "Carousel Kart 2 — Açı",
    group: "C",
    groupLabel: "Carousel Devam",
    aspectRatio: "3:4",
    hasText: false,
    description: "Farklı açıdan ürün, yazısız",
    promptBuilder: (gp, sig) =>
      LIFESTYLE_PROMPT(gp, sig,
        `Low angle shot from the foot of the bed, near mattress height, looking UP toward the headboard. The duvet edge cascading over the foot of the bed is the closest element — showing fabric drape and weight beautifully. Dramatic yet warm natural lighting from a side window. Curved upholstered headboard partially visible. One nightstand with minimal decor. Shot at f/4 with 35mm lens for slight wide-angle drama. Fresh, different perspective that adds visual variety to the carousel set.`,
        "4:5"),
  },
  {
    id: "sm_carousel_cta",
    label: "Carousel Kart 3 — Kapanış",
    group: "C",
    groupLabel: "Carousel Devam",
    aspectRatio: "3:4",
    hasText: true,
    description: "Kapanış kartı, slogan + CTA",
    promptBuilder: (gp, sig, productName, brandName) =>
      BANNER_PROMPT(gp, sig, productName, brandName,
        `Final closing card of the carousel series — CTA focused.
HEADLINE: A compelling Turkish call-to-action: "Şimdi Keşfet" or "Hemen İncele" — LARGE, BOLD, centered.
SUBTEXT: "${productName}" displayed smaller below the CTA.
GRADIENT: Full gradient overlay — product visible but muted, text is the DOMINANT element.
STYLE: Premium, luxurious, drives action. Think luxury brand final slide.`,
        "4:5"),
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
        logoBase64
      );

      // Use the SM-specific high-quality image generator
      const imageUrl = await generateSmImage(
        prompt,
        referenceImages,
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
