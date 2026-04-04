// src/services/seoService.ts
import { getApiKey } from "./geminiService";
import { GoogleGenAI } from "@google/genai";
import type { ProductAnalysis } from "../types";

export interface SeoProductData {
  seoTitle: string;
  metaDescription: string;
  shortDescription: string;
  longDescription: string;
  keywords: string[];
  pieceList: string[];
}

const ANALYSIS_MODEL = "gemini-3-pro-preview";

function validateSeoOutput(data: SeoProductData): SeoProductData {
  // Truncate seoTitle to 120 chars max
  if (data.seoTitle.length > 120) {
    data.seoTitle = data.seoTitle.substring(0, 117) + "...";
  }

  // Truncate metaDescription to 155 chars max
  if (data.metaDescription.length > 155) {
    data.metaDescription = data.metaDescription.substring(0, 152) + "...";
  }

  // Ensure at least 5 keywords
  if (data.keywords.length < 5) {
    const defaults = [
      "nevresim takımı",
      "çift kişilik nevresim",
      "pamuklu nevresim",
      "ev tekstili",
      "yatak örtüsü",
      "lüks nevresim",
      "nakışlı nevresim",
    ];
    while (data.keywords.length < 5) {
      const next = defaults.find((d) => !data.keywords.includes(d));
      if (next) data.keywords.push(next);
      else break;
    }
  }

  // Limit emojis in longDescription to max 5
  const emojiRegex =
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;
  const emojis = data.longDescription.match(emojiRegex);
  if (emojis && emojis.length > 5) {
    let count = 0;
    data.longDescription = data.longDescription.replace(emojiRegex, (match) => {
      count++;
      return count <= 5 ? match : "";
    });
  }

  // Validate pieceList has realistic Turkish bedding dimensions
  const validDimensions = [
    "200x220",
    "220x240",
    "240x260",
    "260x270",
    "50x70",
    "60x80",
    "180x240",
    "200x240",
    "100x200",
    "160x200",
    "180x200",
    "200x200",
    "230x250",
    "250x260",
    "40x40",
    "45x45",
    "35x50",
  ];
  if (data.pieceList.length > 0) {
    const dimRegex = /\d{2,3}x\d{2,3}/;
    data.pieceList = data.pieceList.map((piece) => {
      const match = piece.match(dimRegex);
      if (match && !validDimensions.includes(match[0])) {
        // Keep the piece but flag unusual dimensions - don't remove
        return piece;
      }
      return piece;
    });
  }

  return data;
}

export async function generateSeoTexts(
  analysis: ProductAnalysis,
  pieceInfo: string,
  userNotes: string
): Promise<SeoProductData> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const prompt = `Sen bir e-ticaret SEO uzmanısın. Nevresim/ev tekstili ürünleri için Serebien.com tarzında ürün metinleri oluşturuyorsun.

ÜRÜN ANALİZİ:
- Önerilen Başlık: ${analysis.suggestedTitle}
- Kategori: ${analysis.productCategory}
- Özellikler: ${analysis.signatureDetails}
- Pazarlama Açıklaması: ${analysis.marketingDescription}
- Parça Bilgisi: ${pieceInfo}
${userNotes ? `- Kullanıcı Notları: ${userNotes}` : ""}

═══════════════════════════════════════════════════
MODEL ADI OLUŞTURMA - ÇOK ÖNEMLİ
═══════════════════════════════════════════════════

Ürün için benzersiz, şık ve akılda kalıcı bir MODEL ADI oluşturmalısın. Bu isim başlığın en başında yer alacak.

MODEL ADI KATEGORİLERİ VE ÖRNEKLER:

1. DOĞA İLHAMLI (çiçek, bitki, doğa unsurları):
   Alova, Velora, Flora, Jasmin, Liana, Rosetta, Lavinia, Magnolia,
   Azalea, Camelia, Dahlia, Freesia, Peonia, Orchidea, Gardenia

2. ZARAFET / LÜK ÇAĞRIŞIMLI:
   Royal, Elegance, Prestige, Majestic, Imperial, Duchess,
   Celestia, Aurelia, Seraphina, Belvedere, Crescendo, Aria

3. DOKU / MALZEME İLHAMLI:
   Satin Dream, Silk Touch, Cotton Bliss, Percale, Broderie,
   Velvet, Chenille, Jacquard, Damask, Organza, Taffeta

4. İTALYAN / FRANSIZ ESİNTİLİ (premium çağrışım):
   Milano, Toscana, Riviera, Provence, Verona, Sienna,
   Portofino, Amalfi, Capri, Monako, Bordeaux, Chateau,
   Firenze, Napoli, Venezia, Corsica, Sardinia

5. TÜRK ŞİİRSEL (zarif Türkçe isimler):
   Gonca, Lale, Zambak, Yasemin, Defne, Nilüfer,
   Erguvan, Sümbül, Nergis, Menekşe, Fulya, Begonvil,
   Laden, Hanımeli, Akasya, Kamelya, Orkide

6. MİTOLOJİK / TARİHİ:
   Athena, Artemis, Helena, Olympia, Aurora, Diana,
   Sultana, Hürrem, Roxana, Semiramis, Cleopatra

7. MODERN MİNİMAL:
   Nova, Luna, Zara, Mira, Neva, Elara, Lyra, Stella,
   Cora, Vega, Aura, Iris, Opal, Pearl, Onyx, Ivory

GERÇEK TÜRK MARKA ÖRNEKLERİ (ilham al):
- Serebien: Alova, Velora, Punch Point, Rosetta
- Madame Coco: Maison, Fleur, Belle Maison, Jardin
- English Home: Grace, Charlotte, Victoria, Cambridge
- Karaca Home: Delmare, Pureline, Dreamy, Silvery
- TAC: Lucca, Naomi, Pavona, Serenade
- Yataş: Sophia, Dior, Armani, Valentina

MODEL ADI KURALLARI:
- Ürünün görsel karakterine (renk, desen, nakış tarzı) UYGUN olmalı
- 1-2 kelime MAKSIMUM (tek kelime tercih edilir)
- "Premium", "Deluxe", "Special", "Özel", "Süper" gibi JENERİK kelimeler YASAK
- Şık, akılda kalıcı, marka değeri taşıyan bir isim olmalı
- Koyu/dramatik ürünler: Imperial, Onyx, Duchess, Sultana gibi güçlü isimler
- Pastel/romantik ürünler: Jasmin, Peonia, Camelia, Gonca gibi yumuşak isimler
- Modern/geometrik ürünler: Nova, Lyra, Vega, Capri gibi çağdaş isimler
- Klasik/geleneksel ürünler: Lale, Zambak, Hürrem, Provence gibi köklü isimler
- İsim, ürünü gördüğünde insanın aklına gelebilecek bir his uyandırmalı

═══════════════════════════════════════════════════

SEREBIEN.COM BAŞLIK FORMATI (bu formatı kullan):
"[Model Adı] [Parça Sayısı] Parça [Nakış/Desen Tipi] [Kumaş Bilgisi] [Kişilik] Nevresim Takımı [Renk]"

Örnek başlıklar:
- "Alova Ağaç Desen Nakışlı 7 Parça %100 Pamuk Triko Battaniyeli Çift Kişilik Nevresim Takımı"
- "Punch Point %100 Pamuk 8 Parça Süzene Nakışlı, Fırfırlı ve Yatak Örtülü Çift Kişilik Nevresim Takımı Antrasit"
- "Velora %100 Pamuk Kalp Desen Nakışlı Fırfırlı 6 Parça Çift Kişilik Nevresim Takımı"
- "Riviera %100 Pamuk Jakarlı 6 Parça Çift Kişilik Nevresim Takımı Ekru"
- "Sultanahmet Osmanlı Motifli Nakışlı 8 Parça Saten Çift Kişilik Nevresim Takımı Bordo"
- "Capri Dantel Şeritli 7 Parça %100 Pamuk Fırfırlı Çift Kişilik Nevresim Takımı Pudra"
- "Nilüfer Çiçek Nakışlı 6 Parça Ranforce Çift Kişilik Nevresim Takımı Mint"

SEREBIEN.COM AÇIKLAMA YAPISI:
1. Duygusal tanıtım paragrafı (premium, lüks, konfor vurgusu)
2. Özellikler bullet listesi (%100 pamuk, nakış detayı, nefes alan, cilt dostu vb.)
3. Kumaş & kalite bilgisi
4. Bakım talimatı

GÖREV: Aşağıdaki JSON formatında yanıt ver:

{
  "seoTitle": "Serebien formatında SEO ürün başlığı (MAKS 120 karakter, kesinlikle aşma)",
  "metaDescription": "Google aramasında görünecek açıklama (MAKS 155 karakter, anahtar kelime zengin)",
  "shortDescription": "2-3 cümlelik kısa tanıtım (e-ticaret listesi için)",
  "longDescription": "Serebien tarzında detaylı ürün açıklaması. MAKSIMUM 5 emoji kullan, daha fazla YASAK. Parça listesini ölçüleriyle birlikte yaz. Özellikleri bullet list olarak sırala. Kumaş ve bakım bilgisi ekle. HTML formatında yaz (<p>, <ul>, <li>, <strong>, <br> kullan).",
  "keywords": ["en az 5, en fazla 10 anahtar kelime"],
  "pieceList": ["1 adet Nevresim (200x220 cm)", "1 adet Çarşaf (240x260 cm)", "2 adet Yastık Kılıfı (50x70 cm)", "..."]
}

KURALLAR:
- TÜM metinler TÜRKÇE olmalı. İngilizce kelime KULLANMA (marka standardı terimler hariç: "satin", "jacquard", "ranforce" gibi kumaş terimleri kabul edilir).
- Model adı yaratıcı ve benzersiz olmalı - yukarıdaki örneklerden ilham al ama birebir kopyalama.
- SEO başlığı serebien.com formatında olmalı ve 120 karakteri AŞMAMALI.
- Meta açıklama 155 karakteri AŞMAMALI.
- Açıklama profesyonel, premium tonunda olmalı.
- Gerçekçi parça ölçüleri kullan (nevresim: 200x220 veya 220x240, çarşaf: 240x260 veya 260x270, yastık kılıfı: 50x70 veya 60x80).
- Anahtar kelimeler Türkçe SEO'ya uygun olmalı, en az 5 tane.
- longDescription'da MAKSIMUM 5 emoji kullan.
- SADECE JSON döndür, başka bir şey yazma.`;

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text || "";

  if (!text || text.trim() === "") {
    throw new Error(
      "SEO metin oluşturma başarısız: Gemini API boş yanıt döndürdü."
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `SEO metin oluşturma başarısız: JSON ayrıştırma hatası. Yanıt: ${text.substring(0, 200)}... Hata: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!parsed.seoTitle || !parsed.longDescription) {
    throw new Error(
      `SEO metin oluşturma eksik: seoTitle veya longDescription alanı boş döndü.`
    );
  }

  const result: SeoProductData = {
    seoTitle: String(parsed.seoTitle || analysis.suggestedTitle || ""),
    metaDescription: String(parsed.metaDescription || ""),
    shortDescription: String(parsed.shortDescription || ""),
    longDescription: String(parsed.longDescription || ""),
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.map(String)
      : [],
    pieceList: Array.isArray(parsed.pieceList)
      ? parsed.pieceList.map(String)
      : [],
  };

  return validateSeoOutput(result);
}
