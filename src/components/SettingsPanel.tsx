import { useState } from "react";
import { motion } from "framer-motion";
import type { AppMode, AngleOption } from "../types";
import { ASPECT_RATIOS, ANGLE_OPTIONS, INFOGRAPHIC_OPTIONS, PIECE_PRESETS } from "../constants";
import { setApiKey, getApiKey } from "../services/geminiService";

interface SettingsPanelProps {
  mode: AppMode;
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  selectedAngle: AngleOption;
  onAngleChange: (angle: AngleOption) => void;
  selectedBadges: Set<string>;
  onBadgeToggle: (badge: string) => void;
  boxContentText: string;
  onBoxContentTextChange: (text: string) => void;
  pieceCount: number;
  onPieceCountChange: (count: number) => void;
  imageQuality: string;
  onImageQualityChange: (quality: string) => void;
  userNotes: string;
  onUserNotesChange: (notes: string) => void;
}

export function SettingsPanel({
  mode, aspectRatio, onAspectRatioChange,
  selectedAngle, onAngleChange,
  selectedBadges, onBadgeToggle,
  boxContentText, onBoxContentTextChange,
  pieceCount, onPieceCountChange,
  imageQuality, onImageQualityChange,
  userNotes, onUserNotesChange,
}: SettingsPanelProps) {
  const selectedPreset = PIECE_PRESETS.find(p => p.count === pieceCount);

  return (
    <div className="space-y-3">
      {/* Piece count — photography and box-content modes */}
      {(mode === "photography" || mode === "box-content") && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-[10px] font-mono text-subtle uppercase tracking-widest mb-2.5">Parça Sayısı</p>
          <div className="flex gap-1.5">
            {PIECE_PRESETS.map((preset) => (
              <button
                key={preset.count}
                onClick={() => onPieceCountChange(preset.count)}
                className={`flex-1 py-2 min-h-[44px] md:min-h-0 rounded-lg text-xs font-semibold font-mono transition-all ${
                  pieceCount === preset.count
                    ? "bg-accent text-black"
                    : "bg-surface-2 text-muted hover:text-text border border-border"
                }`}
              >
                {preset.count}
              </button>
            ))}
          </div>
          {selectedPreset && (
            <p className="text-[10px] text-subtle mt-2 leading-relaxed">
              {selectedPreset.pieces}
            </p>
          )}
        </div>
      )}

      {/* Aspect Ratio */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <p className="text-[10px] font-mono text-subtle uppercase tracking-widest mb-2.5">En-Boy Oranı</p>
        <div className="flex flex-wrap gap-1.5">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.value}
              onClick={() => onAspectRatioChange(r.value)}
              className={`px-3 py-1.5 min-h-[44px] md:min-h-0 rounded-md text-xs font-medium font-mono transition-all ${
                aspectRatio === r.value
                  ? "bg-accent text-black"
                  : "bg-surface-2 text-muted hover:text-text border border-border"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Image Quality */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <p className="text-[10px] font-mono text-subtle uppercase tracking-widest mb-2.5">Görsel Kalitesi</p>
        <div className="flex gap-1.5">
          {["2K", "4K"].map((q) => (
            <button
              key={q}
              onClick={() => onImageQualityChange(q)}
              className={`flex-1 py-2 min-h-[44px] md:min-h-0 rounded-lg text-xs font-semibold font-mono transition-all ${
                imageQuality === q
                  ? "bg-accent text-black"
                  : "bg-surface-2 text-muted hover:text-text border border-border"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
        {imageQuality === "4K" && (
          <p className="text-[10px] text-amber-400 mt-2">⚠ 4K üretim daha yavaş ve daha pahalıdır</p>
        )}
      </div>

      {/* Angles */}
      {mode === "angles" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl border border-border p-4"
        >
          <p className="text-[10px] font-mono text-subtle uppercase tracking-widest mb-2.5">Kamera Açısı</p>
          <div className="grid grid-cols-2 gap-1.5">
            {ANGLE_OPTIONS.map((angle) => (
              <button
                key={angle.id}
                onClick={() => onAngleChange(angle)}
                className={`p-2.5 min-h-[44px] md:min-h-0 rounded-lg text-left text-xs font-medium transition-all border ${
                  selectedAngle.id === angle.id
                    ? "bg-accent/10 text-accent border-accent/30"
                    : "bg-surface-2 text-muted hover:text-text border-border"
                }`}
              >
                {angle.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Infographic badges */}
      {mode === "infographic" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl border border-border p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-subtle uppercase tracking-widest">Özellik Etiketleri</p>
            <span className="text-[10px] font-mono text-subtle">{selectedBadges.size}/4</span>
          </div>
          {Object.entries(INFOGRAPHIC_OPTIONS).map(([key, category]) => (
            <div key={key}>
              <p className="text-[10px] text-subtle mb-1.5">{category.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {category.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => onBadgeToggle(opt)}
                    disabled={!selectedBadges.has(opt) && selectedBadges.size >= 4}
                    className={`px-2.5 py-1 min-h-[44px] md:min-h-0 rounded-md text-[11px] font-medium transition-all border ${
                      selectedBadges.has(opt)
                        ? "bg-accent text-black border-accent"
                        : "bg-surface-2 text-muted border-border hover:text-text disabled:opacity-30"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Box content */}
      {mode === "box-content" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl border border-border p-4"
        >
          <p className="text-[10px] font-mono text-subtle uppercase tracking-widest mb-2.5">Kutu İçeriği</p>
          <textarea
            value={boxContentText}
            onChange={(e) => onBoxContentTextChange(e.target.value)}
            placeholder="Örn: 1 nevresim, 2 yastık kılıfı, 1 çarşaf..."
            rows={3}
            className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-xs text-text placeholder:text-subtle resize-none focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all"
          />
        </motion.div>
      )}

      {/* User notes — photography and box-content */}
      {(mode === "photography" || mode === "box-content") && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-[10px] font-mono text-subtle uppercase tracking-widest mb-0.5">Ek Bilgiler</p>
          <p className="text-[10px] text-subtle/70 mb-2.5">Opsiyonel: kumaş türü, özel detaylar</p>
          <textarea
            value={userNotes}
            onChange={(e) => onUserNotesChange(e.target.value)}
            placeholder="Örn: %100 pamuk saten, çift kişilik, el işi nakış..."
            rows={2}
            className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-xs text-text placeholder:text-subtle resize-none focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all"
          />
        </div>
      )}

      {/* API Key Management */}
      <ApiKeySection />
    </div>
  );
}

function ApiKeySection() {
  const currentKey = getApiKey();
  const maskedKey = currentKey
    ? `${"•".repeat(Math.max(0, currentKey.length - 4))}${currentKey.slice(-4)}`
    : "Ayarlanmamış";

  const [editing, setEditing] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const trimmed = newKey.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    localStorage.setItem("gemini_api_key", trimmed);
    setEditing(false);
    setNewKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] font-mono text-subtle uppercase tracking-widest">API Anahtarı</p>
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener"
          className="text-[10px] font-mono text-accent/70 hover:text-accent transition-colors"
        >
          Yeni anahtar al →
        </a>
      </div>

      {!editing ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-muted truncate">
            {maskedKey}
          </span>
          <div className="flex gap-1.5">
            {saved && (
              <span className="text-[10px] text-green-500 font-mono self-center">✓ Kaydedildi</span>
            )}
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 min-h-[44px] md:min-h-0 rounded-lg text-xs font-medium bg-surface-2 text-muted hover:text-text border border-border transition-all"
            >
              Değiştir
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditing(false); setNewKey(""); } }}
              placeholder="AIzaSy..."
              autoComplete="off"
              autoFocus
              className="w-full pr-10 px-3 py-2.5 bg-bg border border-border rounded-lg text-xs text-text placeholder:text-subtle font-mono focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-muted transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {showKey
                  ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                  : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                }
              </svg>
            </button>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleSave}
              disabled={!newKey.trim()}
              className="flex-1 py-2 min-h-[44px] md:min-h-0 rounded-lg text-xs font-semibold bg-accent text-black disabled:bg-accent/30 disabled:cursor-not-allowed transition-all"
            >
              Kaydet
            </button>
            <button
              onClick={() => { setEditing(false); setNewKey(""); }}
              className="px-4 py-2 min-h-[44px] md:min-h-0 rounded-lg text-xs font-medium bg-surface-2 text-muted border border-border transition-all"
            >
              İptal
            </button>
          </div>
        </div>
      )}
      <p className="text-[10px] text-subtle mt-2 font-mono">
        Anahtar yalnızca tarayıcınızda saklanır · Sunucuya gönderilmez
      </p>
    </div>
  );
}
