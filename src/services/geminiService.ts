import { GoogleGenAI, Type } from "@google/genai";
import type { ProductAnalysis, InfographicAnalysis, BoxContentAnalysis, ProductAnglesAnalysis } from "../types";

let apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

export const setApiKey = (key: string) => {
  apiKey = key;
};

export const getApiKey = () => apiKey;

const getAiClient = () => {
  if (!apiKey) throw new Error("API anahtarı ayarlanmadı.");
  return new GoogleGenAI({ apiKey });
};

// Analiz (text-only) için model
const ANALYSIS_MODEL = "gemini-3.1-pro-preview";
// Görsel üretim için model — Nano Banana 2
const IMAGE_GEN_MODEL = "gemini-3.1-flash-image-preview";

const getInlineData = (base64String: string) => {
  const matches = base64String.match(/^data:([^;]*);base64,(.+)$/);
  if (matches) {
    let mimeType = matches[1];
    if (!mimeType || mimeType === "application/octet-stream" || !mimeType.startsWith("image/")) {
      mimeType = "image/jpeg";
    }
    return { mimeType, data: matches[2] };
  }
  return { mimeType: "image/jpeg", data: base64String };
};

export const analyzeProductPhotos = async (
  base64Images: string[],
  userContext?: string
): Promise<ProductAnalysis> => {
  const ai = getAiClient();

  const parts: any[] = [
    {
      text: `You are an expert product photographer and textile specialist. Carefully study ALL provided reference images and extract a precise, exhaustive product profile.

STEP 1 — PIECE INVENTORY: List every piece visible across all images (e.g., duvet cover, fitted sheet, flat sheet, 2x standard pillowcase, 1x euro sham). Count them exactly — do not add or remove pieces.

STEP 2 — COLOR MAPPING: For each piece, state the exact base color AND any accent/contrast colors separately (e.g., "duvet cover: cream white base; pillowcases: same cream white; edge trim on all pieces: dusty rose").

STEP 3 — EMBROIDERY / EMBELLISHMENT: If any embroidery, jacquard pattern, or printed pattern exists:
  - Describe the EXACT motif shape (leaf cluster, geometric border, floral spray, etc.)
  - State the EXACT POSITION on each piece (e.g., "bottom-left corner of duvet cover face", "centered on pillowcase face", "along top edge of flat sheet")
  - State the thread/pattern color separately from the base fabric
  - If NO embroidery exists, explicitly state "no embroidery"

STEP 4 — EDGE TREATMENT: Describe the edge finish on EACH piece precisely:
  - Is it a simple sewn hem? A contrasting fabric border strip sewn on top? Piping cord? Bias tape binding? Ruffles/fırfır?
  - CRITICAL DISTINCTION: A flat decorative fabric strip sewn along the edge IS NOT piping. Piping has a raised cord inside. Describe what you actually see.
  - State the color of the edge treatment separately.
  - CRITICAL RULE FOR RUFFLED PILLOWCASES: If a pillowcase has ruffles (fırfır), the bottom edge (the side that touches the bed/mattress) is ALWAYS plain/flat — NEVER ruffled. Only 3 sides have ruffles. This is a manufacturing standard. When describing ruffled pillowcases, always specify "3-sided ruffle, bottom edge plain."

STEP 5 — FABRIC CHARACTER: Describe the fabric surface (glossy/satin sheen, matte/percale, textured/linen-like, ribbed/jacquard).

CRITICAL RULE — DUVET BACK SIDE: If the BACK/REVERSE side of the duvet cover is NOT visible in any reference photo, you MUST assume it is the SAME fabric and SAME color as the front side. Do NOT describe or invent a different back side color. Only describe the back side if you can clearly SEE it in the reference images.

CRITICAL RULE — BED SCENE VISIBILITY: In bedroom/bed photographs, ONLY the duvet cover and decorative pillowcases are visible on the bed surface. The flat sheet is HIDDEN underneath the duvet — it is NEVER visible, folded, or draped over the duvet. Sleeping pillowcases are behind the decorative pillowcases. In the generation prompt for bed scenes, do NOT instruct to show the flat sheet on top of or folded over the duvet. The flat sheet should ONLY appear in knolling/flat-lay/box-content shots.

STEP 6 — GENERATION PROMPT: Write a detailed generation prompt embedding ALL findings above. The prompt MUST explicitly state:
  - Exact piece count and types on the bed
  - Base color of each piece
  - Embroidery motif, color, and EXACT POSITION (or "no embroidery")
  - Edge treatment type and color
  - Fabric surface character
  - If pillowcases have ruffles: explicitly state in the prompt that ruffles appear on 3 sides only — the bottom edge (touching the bed) is always plain/flat.
  - Do NOT include any room atmosphere, wall color, furniture, or decor description — room style will be added separately.

Your output must be a JSON object.${userContext ? `\n\nIMPORTANT USER-PROVIDED INFORMATION (trust this over your own count if it specifies piece count or details):\n${userContext}` : ""}`
    }
  ];

  base64Images.forEach((b64) => {
    parts.push({ inlineData: getInlineData(b64) });
  });

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productCategory: { type: Type.STRING },
          marketingDescription: { type: Type.STRING },
          suggestedTitle: { type: Type.STRING },
          signatureDetails: { type: Type.STRING, description: "Complete product detail map: piece inventory, exact colors per piece, embroidery motif+position+color (or 'no embroidery'), edge treatment type+color, fabric surface character." },
          generationPrompt: { type: Type.STRING, description: "Full generation prompt that explicitly states all product details (pieces, colors, embroidery position, edge treatment) then describes a new high-end bedroom scene." },
        },
        required: ["productCategory", "marketingDescription", "generationPrompt", "suggestedTitle", "signatureDetails"]
      }
    }
  });

  return JSON.parse(response.text!) as ProductAnalysis;
};

// Sends a fully-formed prompt directly to the image model — no wrapper added.
// Use this when the caller already has a complete, self-contained prompt (e.g. pipeline shots).
export const generateImageRaw = async (
  fullPrompt: string,
  referenceImagesBase64: string[],
  aspectRatio: string = "1:1",
  textFirst: boolean = false
): Promise<string> => {
  const ai = getAiClient();

  const imageParts = referenceImagesBase64.map((b64) => ({
    inlineData: getInlineData(b64)
  }));
  const textPart = { text: fullPrompt };

  // textFirst: Model reads the instruction BEFORE seeing reference images.
  // This prevents the model from anchoring on "generate a full bed photo"
  // when we actually want a detail/macro/marketing shot.
  const parts: any[] = textFirst
    ? [textPart, ...imageParts]
    : [...imageParts, textPart];

  const response = await ai.models.generateContent({
    model: IMAGE_GEN_MODEL,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "2K",
      },
    }
  });

  const candidate = response.candidates?.[0];
  if (!candidate) throw new Error("Yanıt alınamadı.");
  const imagePart = candidate.content?.parts?.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData) throw new Error("Görsel oluşturulamadı.");
  return `data:image/png;base64,${imagePart.inlineData.data}`;
};

const SINGLE_PHOTO_ROOM_STYLES = [
  "BOHEMIAN: Warm earthy tones, textured plaster walls in warm sand/terracotta, rattan headboard, woven macrame wall hanging, dried pampas grass in ceramic vase, natural jute rug, layered textiles, warm golden-hour lighting through sheer linen curtains",
  "RUSTIC FARMHOUSE: Reclaimed wood accent wall behind bed, wrought iron bed frame, exposed ceiling beams, vintage wooden nightstand, mason jar with wildflowers, warm Edison bulb lighting, distressed white painted furniture, cozy cabin feel",
  "BOUTIQUE HOTEL: Upholstered velvet headboard in deep jewel tone, brass wall sconces, marble-top nightstand, statement art piece above bed, plush layered pillows, luxe satin curtains, moody sophisticated lighting, high-end hospitality aesthetic",
  "PINTEREST AESTHETIC: Soft neutral palette with warm whites and beiges, arched niche above bed, organic curved furniture, dried floral arrangement, minimalist gallery wall, soft boucle accent chair, warm ambient glow, curated Instagram-worthy styling",
  "SAGE GREEN RETREAT: Sage/olive green painted walls, natural oak furniture, linen curtains in soft cream, terracotta planters with trailing pothos, woven rattan light pendant, organic cotton textures, calming spa-like atmosphere, soft diffused natural light",
  "JAPANDI: Minimal Japanese-Scandinavian fusion, low platform bed in light ash wood, clean lines, single ikebana arrangement, paper lantern pendant, tatami-inspired rug, muted earth tones, zen calm, soft shadowless lighting",
  "COASTAL GRANDMOTHER: Soft blue-grey walls, white painted wood furniture, linen and cotton textures, seagrass basket, vintage nautical print, weathered wood frame mirror, fresh hydrangeas in a pitcher, breezy light-filled room",
  "MODERN ORGANIC: Curved plaster walls in warm cream, sculptural wood headboard, oversized ceramic table lamp, dried olive branches, boucle upholstered bench, travertine nightstand, earth-toned palette, soft museum-quality lighting",
  "SCANDINAVIAN HYGGE: Light birch wood everything, white walls with warm undertone, sheepskin throw on simple chair, minimalist pendant light, a few green plants, clean uncluttered surfaces, cozy warm blanket at foot of bed, bright Nordic daylight",
  "FRENCH COUNTRY: Soft lavender or dusty rose walls, ornate vintage iron bed frame, distressed white armoire, fresh roses in antique vase, toile fabric accent, crystal chandelier, lace-trimmed details, romantic morning light through tall windows",
  "WABI-SABI: Imperfect textured plaster walls in warm grey, handcrafted ceramic objects, raw linen and undyed cotton, weathered wood stool as nightstand, single dried branch in stoneware vessel, asymmetric arrangement, peaceful imperfection",
  "EARTHY MEDITERRANEAN: Terracotta/clay colored walls, dark wood beamed ceiling, arched window alcove, hammered copper accents, olive branch in terra cotta urn, handwoven textile on bench, warm ochre and sienna tones, golden afternoon light",
];
let singlePhotoRoomIndex = Math.floor(Math.random() * SINGLE_PHOTO_ROOM_STYLES.length);

const SINGLE_PHOTO_DECOR_SETS = [
  "a chunky knit throw on a reading chair, a tall ceramic vase with dried pampas grass, brass bedside lamp with linen shade, and a stack of hardcover books",
  "a woven rattan bench at foot of bed, a framed abstract watercolor print, glass pendant bedside light, and a small potted fiddle leaf fig",
  "a tufted velvet accent chair, an arched floor mirror leaning against the wall, a sculptural table lamp, and a woven basket with rolled towels",
  "a leather butterfly chair in the corner, a gallery wall of small botanical prints, a modern arc floor lamp, and a terracotta planter with trailing ivy",
  "a sheepskin draped over a wooden stool, a round convex wall mirror, a pair of candlestick holders on the nightstand, and eucalyptus branches in a stone vase",
  "a linen upholstered bench, a large-scale landscape photograph on the wall, a mushroom table lamp, and a wooden tray with a candle and small succulent",
  "a cane-back accent chair, hanging macrame wall art, a black iron bedside sconce, and a ceramic bowl of decorative wooden spheres",
  "a boucle ottoman, a minimalist line-art portrait on the wall, a blown glass bedside lamp, and a small stack of magazines with a coffee cup on top",
  "a mid-century nightstand with tapered legs, an oversized round wall clock, a copper desk lamp, and a small herb plant in a white pot",
  "a kilim-patterned area rug, a woven wall hanging, an amber glass carafe on the nightstand, and a vintage wooden ladder used as a blanket rack",
];
let singlePhotoDecorIndex = Math.floor(Math.random() * SINGLE_PHOTO_DECOR_SETS.length);

export const generateProfessionalImage = async (
  prompt: string,
  referenceImagesBase64: string[],
  aspectRatio: string = "1:1"
): Promise<string> => {
  const ai = getAiClient();
  const room = SINGLE_PHOTO_ROOM_STYLES[singlePhotoRoomIndex % SINGLE_PHOTO_ROOM_STYLES.length];
  singlePhotoRoomIndex++;
  const decor = SINGLE_PHOTO_DECOR_SETS[singlePhotoDecorIndex % SINGLE_PHOTO_DECOR_SETS.length];
  singlePhotoDecorIndex++;

  const parts: any[] = referenceImagesBase64.map((b64) => ({
    inlineData: getInlineData(b64)
  }));

  parts.push({
    text: `Generate a completely new, high-end professional product photograph based on the reference images provided.

    PROMPT: ${prompt}

    ROOM STYLE: ${room}

    CRITICAL INSTRUCTIONS:
    - DO NOT just return the original image. You must generate a completely new scene and composition.
    - NEW ARCHITECTURE & REALISM: You MUST design a brand new, AUTHENTIC environment using the ROOM STYLE specified above. The room must clearly reflect that style's characteristic furniture, wall treatment, colors, and atmosphere.
    - LIFESTYLE DECOR: Enrich the scene with these specific decor elements: ${decor}. Make the space feel inviting and lived-in.
    - STRICTLY NO CGI/RENDER LOOK: The image MUST look like a genuine photograph taken with a DSLR camera. Avoid fantastical backgrounds (e.g., fake forests outside windows). Use believable interior design, natural soft lighting, and realistic textures.
    - COMPOSITION: Optimize the camera angle and product placement specifically for a ${aspectRatio} aspect ratio. Ensure the composition is balanced for these dimensions.
    - PRODUCT ACCURACY: The product in the generated image must look exactly like the product in the reference images (same color, material, precise sewing details, decorative strips, etc.).
    - Focus on clarity, authentic textile texture, and sincere aesthetic appeal.
    - NO PEOPLE: Do NOT include any humans, persons, figures, or body parts in the image. The scene must be completely empty of people.
    - NO EXTRA PRODUCTS: Do NOT add any textile products that are not in the reference images. No extra runners, throws, blankets, decorative pillows, cushions, or any additional bedding items beyond what is shown in the references. The bed must only contain the exact product set from the reference images.
    - DUVET BACK SIDE: If the back/reverse side of the duvet is NOT visible in the reference photos, it is the SAME fabric and color as the front. Do NOT invent a different back side color or material.
    - FLAT SHEET VISIBILITY: The flat sheet (çarşaf) is ALWAYS hidden under the duvet in bed scenes. It is NEVER visible, folded over, or draped on top of the duvet. Only the duvet cover and decorative pillowcases are visible on the bed surface.
    - RUFFLED PILLOWCASES: If the product has ruffled (fırfırlı) pillowcases, the ruffles appear on 3 sides ONLY. The bottom edge (the side resting on the bed/mattress) is ALWAYS plain and flat — never ruffled. This is a manufacturing standard for all ruffled pillowcases.`
  });

  const response = await ai.models.generateContent({
    model: IMAGE_GEN_MODEL,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "2K",
      },
    }
  });

  const candidate = response.candidates?.[0];
  if (!candidate) throw new Error("Yanıt alınamadı.");

  const imagePart = candidate.content?.parts?.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData) throw new Error("Görsel oluşturulamadı.");

  return `data:image/png;base64,${imagePart.inlineData.data}`;
};

export const analyzeInfographic = async (
  base64Images: string[]
): Promise<InfographicAnalysis> => {
  const ai = getAiClient();
  const parts: any[] = [{
    text: `You are an expert product photographer and marketing specialist. Study ALL reference images carefully and extract:
  1. PIECE INVENTORY: Every piece in the set with exact count.
  2. COLOR MAPPING: Base color and accent colors for each piece separately.
  3. EMBROIDERY/PATTERN: Motif shape, exact position on each piece, thread color. State "no embroidery" if absent.
  4. EDGE TREATMENT: Exact type (flat decorative strip / bias tape / piping / simple hem) and color. Do NOT confuse decorative strips with piping.
  5. FABRIC CHARACTER: Satin sheen, matte percale, textured linen, etc.
  6. ROOM/BACKGROUND CONTRAST: For infographic use a clean studio background. If product is white/light → use a slightly warm off-white or very light grey background for subtle contrast. If product is dark/bold → pure white background to make colors pop.
  Then create a generation prompt for a CLEAN, PERFECTLY IRONED, MINIMALIST studio setting — product impeccably neat, no wrinkles. The prompt MUST embed all exact product details (piece count, colors, embroidery position, edge treatment) so the AI reproduces the product accurately. Return JSON.`
  }];
  base64Images.forEach((b64) => parts.push({ inlineData: getInlineData(b64) }));

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          materialType: { type: Type.STRING },
          keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
          textOverlays: { type: Type.ARRAY, items: { type: Type.STRING } },
          generationPrompt: { type: Type.STRING },
          marketingHeadline: { type: Type.STRING }
        },
        required: ["materialType", "keyFeatures", "textOverlays", "generationPrompt", "marketingHeadline"]
      }
    }
  });
  return JSON.parse(response.text!) as InfographicAnalysis;
};

export const generateInfographicImage = async (
  prompt: string,
  referenceImagesBase64: string[],
  textOverlays: string[],
  aspectRatio: string = "1:1"
): Promise<string> => {
  const ai = getAiClient();
  const parts: any[] = referenceImagesBase64.map((b64) => ({ inlineData: getInlineData(b64) }));
  parts.push({
    text: `Generate a completely new, highly realistic image. ${prompt}

    Incorporate these text badges in a stylish, modern way: ${JSON.stringify(textOverlays)}.

    CRITICAL INSTRUCTIONS:
    - DO NOT just return the original image. Generate a completely new scene.
    - INFOGRAPHIC STYLE (CRITICAL): The product MUST be perfectly ironed, flawlessly neat, and symmetrically arranged. STRICTLY NO messy or wrinkled fabric.
    - BACKGROUND: Use a clean, minimalist, and brightly lit environment (like a modern, uncluttered studio or a very tidy, bright bedroom) so the text badges will be easily readable. Avoid heavy decor that distracts from the text.
    - COMPOSITION: Optimize perfectly for a ${aspectRatio} aspect ratio.
    - PRODUCT ACCURACY: The product must exactly match the reference images (color, material, precise sewing details).`
  });

  const response = await ai.models.generateContent({
    model: IMAGE_GEN_MODEL,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "2K",
      },
    }
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData) throw new Error("Görsel oluşturulamadı.");
  return `data:image/png;base64,${imagePart.inlineData.data}`;
};

export const analyzeBoxContent = async (
  base64Images: string[],
  userContentDescription: string
): Promise<BoxContentAnalysis> => {
  const ai = getAiClient();
  const parts: any[] = [{
    text: `Create a knolling photography setup description. User list: ${userContentDescription}. Return JSON.`
  }];
  base64Images.forEach((b64) => parts.push({ inlineData: getInlineData(b64) }));

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          itemsList: { type: Type.ARRAY, items: { type: Type.STRING } },
          generationPrompt: { type: Type.STRING }
        },
        required: ["itemsList", "generationPrompt"]
      }
    }
  });
  return JSON.parse(response.text!) as BoxContentAnalysis;
};

export const generateBoxContentImage = async (
  prompt: string,
  referenceImagesBase64: string[],
  itemsList: string[],
  aspectRatio: string = "1:1"
): Promise<string> => {
  const ai = getAiClient();
  const parts: any[] = referenceImagesBase64.map((b64) => ({ inlineData: getInlineData(b64) }));
  parts.push({
    text: `Generate a new knolling layout image. ${prompt}
Items: ${itemsList.join(", ")}. DO NOT return original. Product must match references exactly. Optimize for ${aspectRatio}.`
  });

  const response = await ai.models.generateContent({
    model: IMAGE_GEN_MODEL,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "2K",
      },
    }
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData) throw new Error("Görsel oluşturulamadı.");
  return `data:image/png;base64,${imagePart.inlineData.data}`;
};

export const analyzeProductAngles = async (
  base64Images: string[]
): Promise<ProductAnglesAnalysis> => {
  const ai = getAiClient();
  const parts: any[] = [{
    text: `You are an expert product photographer and textile specialist. Study ALL reference images carefully and extract:
      1. PIECE INVENTORY: Every piece with exact count.
      2. COLOR MAPPING: Base color and accent colors per piece.
      3. EMBROIDERY/PATTERN: Motif shape, exact position on each piece, thread color. State "no embroidery" if none.
      4. EDGE TREATMENT: Exact type (flat decorative strip / bias tape / piping / simple hem) and color. CRITICAL: Do NOT confuse decorative strips with piping.
      5. FABRIC CHARACTER: Glossy satin, matte percale, textured, etc.
      Create a base prompt embedding ALL these exact product details (piece count, colors, embroidery, edges, fabric). Do NOT include any room atmosphere, wall color, furniture, or decor — room style will be added separately. The prompt must produce authentic, highly realistic DSLR shots — no CGI look.
      Output JSON.`
  }];
  base64Images.forEach((b64) => parts.push({ inlineData: getInlineData(b64) }));

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productCategory: { type: Type.STRING },
          productFeatures: { type: Type.STRING },
          basePrompt: { type: Type.STRING }
        },
        required: ["productCategory", "productFeatures", "basePrompt"]
      }
    }
  });
  return JSON.parse(response.text!) as ProductAnglesAnalysis;
};

export const generateProductAngleImage = async (
  basePrompt: string,
  referenceImagesBase64: string[],
  angleConfig: { id: string; label: string; prompt: string },
  aspectRatio: string = "1:1"
): Promise<string> => {
  const ai = getAiClient();
  const parts: any[] = referenceImagesBase64.map((b64) => ({ inlineData: getInlineData(b64) }));
  parts.push({
    text: `Generate a completely new image. ${basePrompt} \n\n
    CAMERA ANGLE: ${angleConfig.prompt}

    CRITICAL INSTRUCTIONS:
    - DO NOT just return the original image. You must generate a new image from the specified camera angle.
    - ANGLE PRIORITY: You MUST strictly follow the CAMERA ANGLE instruction above. Adapt the environment to fit this specific angle (e.g., a macro shot shouldn't show the whole room, a birds-eye view should show the floor).
    - NEW ARCHITECTURE & REALISM: Design a completely new, AUTHENTIC background and furniture. STRICTLY NO CGI/3D render look. It must look like a genuine, cozy, high-end photograph. Avoid fake/fantastical backgrounds. Use believable interior design.
    - COMPOSITION: Optimize the placement and framing perfectly for a ${aspectRatio} aspect ratio.
    - PRODUCT ACCURACY: Ensure the product itself resembles the reference images perfectly, paying attention to exact textile details, sewing, and decorative elements.
    - High quality, authentic studio photography.`
  });

  const response = await ai.models.generateContent({
    model: IMAGE_GEN_MODEL,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "2K",
      },
    }
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData) throw new Error("Görsel üretilemedi.");
  return `data:image/png;base64,${imagePart.inlineData.data}`;
};

export const reviseGeneratedImage = async (
  currentImageBase64: string,
  instruction: string,
  aspectRatio: string = "1:1",
  referenceImageBase64?: string
): Promise<string> => {
  const ai = getAiClient();
  const parts: any[] = [{ inlineData: getInlineData(currentImageBase64) }];
  if (referenceImageBase64) parts.push({ inlineData: getInlineData(referenceImageBase64) });

  parts.push({
    text: `Edit the image according to this instruction: ${instruction}.
    Maintain the overall style and quality.`
  });

  const response = await ai.models.generateContent({
    model: IMAGE_GEN_MODEL,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "2K",
      },
    }
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData) throw new Error("Revizyon başarısız.");
  return `data:image/png;base64,${imagePart.inlineData.data}`;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// ══════════════════════════════════════════════
// Region detection — find pillow/embroidery/edge areas in reference images
// ══════════════════════════════════════════════

export interface RegionBox {
  imageIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DetectedRegionsResult {
  pillow?: RegionBox;
  embroidery?: RegionBox;
  edge?: RegionBox;
}

export const detectProductRegions = async (
  base64Images: string[]
): Promise<DetectedRegionsResult> => {
  const ai = getAiClient();

  const parts: any[] = [
    {
      text: `You are analyzing product photographs of a bedding set. For each region below, find the BEST reference image that shows it most clearly and return the bounding box coordinates as percentages (0-100).

Find these regions:
1. PILLOW — The decorative pillowcase that has embroidery or pattern. Find the single best pillow visible across all images. Return the bounding box that tightly frames just that one pillow.
2. EMBROIDERY — The embroidery, pattern, or textile detail area. Find the image where the embroidery/pattern is most visible and closest. Return a tight bounding box around JUST the embroidery motif area.
3. EDGE — The edge treatment (piping, bias tape, decorative strip, border). Find the image where the edge/border detail is most visible. Return a tight bounding box around just the edge area.

For each region, return:
- imageIndex: which image (0-based index) shows this best
- x: left edge as percentage of image width (0-100)
- y: top edge as percentage of image height (0-100)
- w: width as percentage of image width (0-100)
- h: height as percentage of image height (0-100)

If a region is not clearly visible in any image, omit it from the response.
Images are numbered starting from 0 in the order provided.`
    }
  ];

  base64Images.forEach((b64) => {
    parts.push({ inlineData: getInlineData(b64) });
  });

  try {
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pillow: {
              type: Type.OBJECT,
              properties: {
                imageIndex: { type: Type.NUMBER },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                w: { type: Type.NUMBER },
                h: { type: Type.NUMBER },
              },
            },
            embroidery: {
              type: Type.OBJECT,
              properties: {
                imageIndex: { type: Type.NUMBER },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                w: { type: Type.NUMBER },
                h: { type: Type.NUMBER },
              },
            },
            edge: {
              type: Type.OBJECT,
              properties: {
                imageIndex: { type: Type.NUMBER },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                w: { type: Type.NUMBER },
                h: { type: Type.NUMBER },
              },
            },
          },
        },
      },
    });

    return JSON.parse(response.text!) as DetectedRegionsResult;
  } catch {
    // If region detection fails, return empty — pipeline will use full references
    return {};
  }
};
