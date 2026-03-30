import { generateImageRaw } from "./geminiService";

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

const BANNER_BASE = (
  generationPrompt: string,
  signatureDetails: string,
  productName: string,
  brandName: string,
  textInstructions: string,
  aspectRatio: string,
  logoBase64?: string
) => `Generate a professional social media marketing banner image.

PRODUCT CONTEXT:
${generationPrompt}

PRODUCT DETAILS: ${signatureDetails}

BANNER DESIGN INSTRUCTIONS:
- Create a sleek, modern marketing banner optimized for ${aspectRatio} aspect ratio.
- The product (bedding set) must be the hero element — clearly visible, beautifully styled.
- Professional studio or lifestyle setting with warm, inviting lighting.
- Premium, magazine-quality aesthetic.

TEXT ON IMAGE (MUST BE IN TURKISH):
${textInstructions}

${brandName ? `BRAND NAME: "${brandName}" — display it elegantly on the image.` : ""}
${logoBase64 ? "A logo image is provided as a reference — place it subtly in a corner of the banner." : ""}

CRITICAL:
- ALL text on the image MUST be in TURKISH.
- Typography must be clean, modern, and premium-looking.
- Product colors, embroidery, and details must match reference images exactly.
- NO people in the image.`;

const LIFESTYLE_BASE = (
  generationPrompt: string,
  signatureDetails: string,
  sceneInstructions: string,
  aspectRatio: string
) => `Generate a professional lifestyle product photograph.

PRODUCT CONTEXT:
${generationPrompt}

PRODUCT DETAILS: ${signatureDetails}

SCENE: ${sceneInstructions}

CRITICAL:
- This is a pure lifestyle/aesthetic shot — NO text, NO labels, NO watermarks on the image.
- Must look like a genuine DSLR photograph, not CGI.
- Product colors, embroidery, and textile details must match reference images exactly.
- NO people in the image.
- Optimize composition for ${aspectRatio} aspect ratio.`;

export const SOCIAL_MEDIA_SHOTS: SocialMediaShot[] = [
  {
    id: "sm_feed_banner",
    label: "Instagram Feed Banner",
    group: "A",
    groupLabel: "Yazılı Banner",
    aspectRatio: "3:4",
    hasText: true,
    description: "Ürün ismi + slogan + logo ile feed görseli",
    promptBuilder: (gp, sig, productName, brandName, logoBase64) =>
      BANNER_BASE(gp, sig, productName, brandName,
        `- Product name: "${productName}" as the main headline in large, elegant serif typography.
- A short, aspirational Turkish marketing slogan below (e.g., "Hayalinizdeki Konfor", "Lüks Dokunuş, Her Gece").
- The slogan should feel premium and be related to comfort/luxury/quality.`,
        "4:5", logoBase64),
  },
  {
    id: "sm_story_banner",
    label: "Instagram Story Banner",
    group: "A",
    groupLabel: "Yazılı Banner",
    aspectRatio: "9:16",
    hasText: true,
    description: "Tam ekran story formatında tanıtım",
    promptBuilder: (gp, sig, productName, brandName, logoBase64) =>
      BANNER_BASE(gp, sig, productName, brandName,
        `- Full-screen vertical (9:16) story format.
- Product name "${productName}" prominently displayed.
- A bold, attention-grabbing Turkish headline (e.g., "YENİ KOLEKSİYON", "SINIRLI STOK").
- A swipe-up style call-to-action at the bottom (e.g., "Keşfet →", "İncele →").`,
        "9:16", logoBase64),
  },
  {
    id: "sm_carousel_intro",
    label: "Carousel Kart 1 — Tanıtım",
    group: "A",
    groupLabel: "Yazılı Banner",
    aspectRatio: "3:4",
    hasText: true,
    description: "Carousel açılış kartı, ürün tanıtımı",
    promptBuilder: (gp, sig, productName, brandName, logoBase64) =>
      BANNER_BASE(gp, sig, productName, brandName,
        `- Opening card of a carousel series.
- Product name "${productName}" as the hero headline.
- 2-3 key product features listed elegantly in Turkish (e.g., "✓ %100 Pamuk Saten", "✓ Nakışlı Tasarım", "✓ 7 Parça Set").
- Clean, modern layout that makes the viewer want to swipe for more.`,
        "4:5", logoBase64),
  },
  {
    id: "sm_lifestyle",
    label: "Lifestyle Shot",
    group: "B",
    groupLabel: "Estetik Görsel",
    aspectRatio: "3:4",
    hasText: false,
    description: "Yaşam alanında ürün, yazısız",
    promptBuilder: (gp, sig) =>
      LIFESTYLE_BASE(gp, sig,
        `Warm, sunlit bedroom scene. Product beautifully styled on the bed with duvet artfully turned back. Scandinavian-contemporary bedroom with soft morning light through sheer curtains. A coffee cup on the nightstand, a knit throw on a nearby chair. Inviting, aspirational mood — "I want this bedroom" feeling. Shot at f/4 with 50mm lens.`,
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
      LIFESTYLE_BASE(gp, sig,
        `Extreme close-up of the fabric texture and embroidery detail. Fill the frame with the textile surface — show thread structure, weave pattern, and embroidery stitching in beautiful detail. Shallow depth of field with tack-sharp center fading to soft bokeh. Side lighting at 45 degrees raking across the surface to reveal texture dimensionality. No bed, no room — only the fabric surface.`,
        "1:1"),
  },
  {
    id: "sm_carousel_angle",
    label: "Carousel Kart 2 — Açı",
    group: "C",
    groupLabel: "Carousel Devam",
    aspectRatio: "3:4",
    hasText: false,
    description: "Farklı açıdan ürün, yazısız",
    promptBuilder: (gp, sig) =>
      LIFESTYLE_BASE(gp, sig,
        `Different angle product shot. Low angle from the foot of the bed looking toward the headboard. Dramatic yet warm natural lighting. The duvet edge cascading over the bed foot is the closest element. Shows the product from a fresh perspective. Clean, modern bedroom setting.`,
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
    promptBuilder: (gp, sig, productName, brandName, logoBase64) =>
      BANNER_BASE(gp, sig, productName, brandName,
        `- Final card of a carousel series — the closing/CTA card.
- A compelling Turkish call-to-action as the main text (e.g., "Şimdi Keşfet", "Hemen İncele", "Sipariş Ver").
- Product name "${productName}" displayed smaller below.
- Clean, premium design that drives action.
- The product should still be visible but the text/CTA is the focus.`,
        "4:5", logoBase64),
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

      const imageUrl = await generateImageRaw(
        prompt,
        referenceImages,
        shot.aspectRatio,
        shot.hasText
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
