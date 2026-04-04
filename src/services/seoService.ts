// src/services/seoService.ts
import type { ProductAnalysis } from "../types";

const OPENROUTER_KEY = "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";
const OPENROUTER_MODEL = "google/gemini-2.5-pro-preview";

export interface SeoProductData {
  seoTitle: string;
  metaDescription: string;
  shortDescription: string;
  longDescription: string;
  keywords: string[];
  pieceList: string[];
}

export async function generateSeoTexts(
  analysis: ProductAnalysis,
  pieceInfo: string,
  userNotes: string
): Promise<SeoProductData> {
  const prompt = `Sen bir e-ticaret SEO uzmanısın. Nevresim/ev tekstili ürünleri için Serebien.com tarzında ürün metinleri oluşturuyorsun.

ÜRÜN ANALİZİ:
- Önerilen Başlık: ${analysis.suggestedTitle}
- Kategori: ${analysis.productCategory}
- Özellikler: ${analysis.signatureDetails}
- Pazarlama Açıklaması: ${analysis.marketingDescription}
- Parça Bilgisi: ${pieceInfo}
${userNotes ? `- Kullanıcı Notları: ${userNotes}` : ""}

SEREBIEN.COM BAŞLIK FORMATI (bu formatı kullan):
"[Model Adı] [Parça Sayısı] Parça [Nakış/Desen Tipi] [Kumaş Bilgisi] [Kişilik] Nevresim Takımı [Renk]"

Örnek başlıklar:
- "Alova Ağaç Desen Nakışlı 7 Parça %100 Pamuk Triko Battaniyeli Çift Kişilik Nevresim Takımı"
- "Punch Point %100 Pamuk 8 Parça Süzene Nakışlı, Fırfırlı ve Yatak Örtülü Çift Kişilik Nevresim Takımı Antrasit"
- "Velora %100 Pamuk Kalp Desen Nakışlı Fırfırlı 6 Parça Çift Kişilik Nevresim Takımı"

SEREBIEN.COM AÇIKLAMA YAPISI:
1. Duygusal tanıtım paragrafı (premium, lüks, konfor vurgusu)
2. Özellikler bullet listesi (%100 pamuk, nakış detayı, nefes alan, cilt dostu vb.)
3. Kumaş & kalite bilgisi
4. Bakım talimatı

GÖREV: Aşağıdaki JSON formatında yanıt ver:

{
  "seoTitle": "Serebien formatında SEO ürün başlığı (maks 120 karakter)",
  "metaDescription": "Google aramasında görünecek açıklama (maks 155 karakter, anahtar kelime zengin)",
  "shortDescription": "2-3 cümlelik kısa tanıtım (e-ticaret listesi için)",
  "longDescription": "Serebien tarzında detaylı ürün açıklaması. Emoji kullan. Parça listesini ölçüleriyle birlikte yaz. Özellikleri bullet list olarak sırala. Kumaş ve bakım bilgisi ekle. HTML formatında yaz (<p>, <ul>, <li>, <strong>, <br> kullan).",
  "keywords": ["anahtar", "kelime", "listesi", "5-10 adet"],
  "pieceList": ["1 adet Nevresim (200x220 cm)", "1 adet Çarşaf (240x260 cm)", "..."]
}

KURALLAR:
- TÜM metinler TÜRKÇE olmalı.
- SEO başlığı serebien.com formatında olmalı.
- Açıklama profesyonel, premium tonunda olmalı.
- Gerçekçi parça ölçüleri kullan (nevresim: 200x220, çarşaf: 240x260, yastık: 50x70).
- Anahtar kelimeler Türkçe SEO'ya uygun olmalı.
- SADECE JSON döndür, başka bir şey yazma.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`OpenRouter hata: ${data.error?.message || "Bilinmeyen hata"}`);
  const text = data.choices?.[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(text);
    return {
      seoTitle: parsed.seoTitle || analysis.suggestedTitle || "",
      metaDescription: parsed.metaDescription || "",
      shortDescription: parsed.shortDescription || "",
      longDescription: parsed.longDescription || "",
      keywords: parsed.keywords || [],
      pieceList: parsed.pieceList || [],
    };
  } catch {
    return {
      seoTitle: analysis.suggestedTitle || "",
      metaDescription: analysis.marketingDescription || "",
      shortDescription: analysis.marketingDescription || "",
      longDescription: "",
      keywords: [],
      pieceList: [],
    };
  }
}
