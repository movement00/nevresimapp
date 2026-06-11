export type ImageProvider = "gemini" | "kie" | "fal";

const PROVIDER_KEY = "image_provider";
const KIE_KEY_KEY = "kie_api_key";
const FAL_KEY_KEY = "fal_api_key";

let currentProvider: ImageProvider = (localStorage.getItem(PROVIDER_KEY) as ImageProvider) || "gemini";

export const getProvider = (): ImageProvider => currentProvider;
export const setProvider = (p: ImageProvider) => {
  currentProvider = p;
  localStorage.setItem(PROVIDER_KEY, p);
};

export const getKieApiKey = (): string => localStorage.getItem(KIE_KEY_KEY) || "";
export const setKieApiKey = (key: string) => localStorage.setItem(KIE_KEY_KEY, key);

export const getFalApiKey = (): string => localStorage.getItem(FAL_KEY_KEY) || "";
export const setFalApiKey = (key: string) => localStorage.setItem(FAL_KEY_KEY, key);

// ── KIE API (gpt-image-2 via kie.ai proxy) ──

const KIE_BASE = "https://api.kie.ai";
const KIE_UPLOAD = "https://kieai.redpandaai.co";

async function kieUpload(base64Data: string, apiKey: string): Promise<string> {
  const r = await fetch(`${KIE_UPLOAD}/api/file-base64-upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      base64Data: base64Data.startsWith("data:") ? base64Data : `data:image/png;base64,${base64Data}`,
      uploadPath: "nevresim/refs",
      fileName: `ref_${Date.now()}.png`,
    }),
  });
  const d = await r.json();
  if (!d.data?.downloadUrl) throw new Error(`KIE upload failed: ${d.msg || "unknown"}`);
  return d.data.downloadUrl;
}

async function kieGenerate(
  prompt: string,
  referenceImagesBase64: string[],
  aspectRatio: string,
  apiKey: string
): Promise<string> {
  const refUrls: string[] = [];
  for (const b64 of referenceImagesBase64) {
    refUrls.push(await kieUpload(b64, apiKey));
  }

  const body: any = {
    prompt: prompt.slice(0, 32000),
    aspect_ratio: aspectRatio,
    nVariants: 1,
  };
  if (refUrls.length) body.filesUrl = refUrls;

  const r = await fetch(`${KIE_BASE}/api/v1/gpt4o-image/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (d.code !== 200 || !d.data?.taskId) throw new Error(`KIE task error: ${d.msg || "unknown"}`);

  const taskId = d.data.taskId;
  const start = Date.now();
  while (Date.now() - start < 300000) {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const pr = await fetch(`${KIE_BASE}/api/v1/gpt4o-image/record-info?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const pd = await pr.json();
    if (pd.data?.successFlag === 1) {
      const url = pd.data.response?.resultUrls?.[0] || pd.data.response?.result_urls?.[0];
      if (!url) throw new Error("KIE: no result URL");
      const imgR = await fetch(url);
      if (!imgR.ok) throw new Error(`KIE download failed: ${imgR.status}`);
      const buf = await imgR.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      return `data:image/png;base64,${b64}`;
    }
    if (pd.data?.successFlag === 2 || pd.data?.successFlag === 3) {
      throw new Error(`KIE failed: ${pd.data.errorMessage || pd.data.failMsg || "unknown"}`);
    }
  }
  throw new Error("KIE: polling timeout (5 min)");
}

// ── FAL API (Flux Pro via fal.ai) ──

async function falGenerate(
  prompt: string,
  referenceImagesBase64: string[],
  aspectRatio: string,
  apiKey: string
): Promise<string> {
  const imageUrl = referenceImagesBase64.length > 0
    ? `data:image/png;base64,${referenceImagesBase64[0].replace(/^data:image\/\w+;base64,/, "")}`
    : undefined;

  const body: any = {
    prompt,
    image_size: aspectRatioToFalSize(aspectRatio),
    num_images: 1,
    enable_safety_checker: false,
  };
  if (imageUrl) {
    body.image_url = imageUrl;
    body.strength = 0.75;
  }

  const model = "fal-ai/nano-banana-2";

  const submitR = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!submitR.ok) {
    const errText = await submitR.text();
    throw new Error(`FAL submit failed (${submitR.status}): ${errText.slice(0, 200)}`);
  }
  const submitD = await submitR.json();

  if (submitD.images?.[0]?.url) {
    return await fetchImageAsDataUrl(submitD.images[0].url);
  }

  const requestId = submitD.request_id;
  if (!requestId) throw new Error("FAL: no request_id returned");

  const start = Date.now();
  while (Date.now() - start < 300000) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const statusR = await fetch(`https://queue.fal.run/${model}/requests/${requestId}/status`, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    const statusD = await statusR.json();

    if (statusD.status === "COMPLETED") {
      const resultR = await fetch(`https://queue.fal.run/${model}/requests/${requestId}`, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      const resultD = await resultR.json();
      const imgUrl = resultD.images?.[0]?.url;
      if (!imgUrl) throw new Error("FAL: no image in result");
      return await fetchImageAsDataUrl(imgUrl);
    }
    if (statusD.status === "FAILED") {
      throw new Error(`FAL failed: ${statusD.error || "unknown"}`);
    }
  }
  throw new Error("FAL: polling timeout (5 min)");
}

function aspectRatioToFalSize(ar: string): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "3:4": { width: 768, height: 1024 },
    "4:3": { width: 1024, height: 768 },
    "9:16": { width: 576, height: 1024 },
    "16:9": { width: 1024, height: 576 },
    "2:3": { width: 683, height: 1024 },
    "3:2": { width: 1024, height: 683 },
  };
  return map[ar] || { width: 1024, height: 1024 };
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Image download failed: ${r.status}`);
  const buf = await r.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const ct = r.headers.get("content-type") || "image/png";
  return `data:${ct};base64,${b64}`;
}

// ── Public API ──

export async function generateImage(
  prompt: string,
  referenceImagesBase64: string[],
  aspectRatio: string = "1:1",
  _textFirst: boolean = false
): Promise<string> {
  const provider = getProvider();

  switch (provider) {
    case "kie": {
      const key = getKieApiKey();
      if (!key) throw new Error("KIE API anahtarı ayarlanmadı. Ayarlardan girin.");
      return kieGenerate(prompt, referenceImagesBase64, aspectRatio, key);
    }
    case "fal": {
      const key = getFalApiKey();
      if (!key) throw new Error("FAL API anahtarı ayarlanmadı. Ayarlardan girin.");
      return falGenerate(prompt, referenceImagesBase64, aspectRatio, key);
    }
    case "gemini":
    default: {
      const { generateImageRaw } = await import("./geminiService");
      return generateImageRaw(prompt, referenceImagesBase64, aspectRatio, _textFirst);
    }
  }
}

export async function generateProfessionalImageProvider(
  prompt: string,
  referenceImagesBase64: string[],
  aspectRatio: string = "1:1"
): Promise<string> {
  const provider = getProvider();

  switch (provider) {
    case "kie": {
      const key = getKieApiKey();
      if (!key) throw new Error("KIE API anahtarı ayarlanmadı. Ayarlardan girin.");
      return kieGenerate(prompt, referenceImagesBase64, aspectRatio, key);
    }
    case "fal": {
      const key = getFalApiKey();
      if (!key) throw new Error("FAL API anahtarı ayarlanmadı. Ayarlardan girin.");
      return falGenerate(prompt, referenceImagesBase64, aspectRatio, key);
    }
    case "gemini":
    default: {
      const { generateProfessionalImage } = await import("./geminiService");
      return generateProfessionalImage(prompt, referenceImagesBase64, aspectRatio);
    }
  }
}
