// src/components/SocialMediaResults.tsx
import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SOCIAL_MEDIA_SHOTS, type SocialMediaResult } from "../services/socialMediaService";

interface SocialMediaResultsProps {
  results: SocialMediaResult[];
  onReset: () => void;
  onRetryShot: (shotId: string) => void;
  onReviseShot: (shotId: string, instruction: string) => void;
}

export const SocialMediaResults = memo(function SocialMediaResults({ results, onReset, onRetryShot, onReviseShot }: SocialMediaResultsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);
  const [zoomedLabel, setZoomedLabel] = useState<string>("");
  const [reviseId, setReviseId] = useState<string | null>(null);
  const [reviseText, setReviseText] = useState("");
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  const successCount = results.filter(r => r.status === "done" && r.imageUrl).length;
  const errorCount = results.filter(r => r.status === "error").length;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const showDownloadFeedback = useCallback((id: string) => {
    setDownloadedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      setDownloadedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2000);
  }, []);

  const downloadImage = useCallback((url: string, name: string, id: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `proshop-sm-${name}.png`;
    a.click();
    showDownloadFeedback(id);
  }, [showDownloadFeedback]);

  const downloadAll = useCallback(() => {
    const targets = selectedIds.size > 0
      ? results.filter(r => selectedIds.has(r.id) && r.imageUrl)
      : results.filter(r => r.imageUrl);
    targets.forEach(r => downloadImage(r.imageUrl!, r.id, r.id));
  }, [selectedIds, results, downloadImage]);

  const handleRevise = useCallback((id: string) => {
    if (!reviseText.trim()) return;
    onReviseShot(id, reviseText);
    setReviseId(null);
    setReviseText("");
  }, [reviseText, onReviseShot]);

  const openZoom = useCallback((url: string, label: string) => {
    setZoomedUrl(url);
    setZoomedLabel(label);
  }, []);

  const closeZoom = useCallback(() => {
    setZoomedUrl(null);
    setZoomedLabel("");
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-display text-lg font-700 text-text">Sosyal Medya Paketi</h3>
          <p className="text-xs text-subtle mt-0.5">
            {successCount} gorsel hazir{errorCount > 0 ? ` · ${errorCount} hata` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadAll} className="px-3 py-1.5 bg-accent text-black rounded-lg text-xs font-semibold hover:bg-accent-hover transition-colors">
            {selectedIds.size > 0 ? `Secilenleri Indir (${selectedIds.size})` : "Tumunu Indir"}
          </button>
          <button onClick={onReset} className="px-3 py-1.5 bg-surface-2 border border-border text-muted rounded-lg text-xs font-medium hover:text-text transition-colors">
            Yeni Set
          </button>
        </div>
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {results.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative rounded-xl border border-border overflow-hidden bg-surface"
          >
            {/* Image */}
            <div
              className="relative cursor-pointer"
              style={{ aspectRatio: r.aspectRatio === "9:16" ? "9/16" : r.aspectRatio === "1:1" ? "1/1" : "3/4" }}
              onClick={() => r.imageUrl && openZoom(r.imageUrl, r.label)}
            >
              {r.imageUrl ? (
                <img
                  src={r.imageUrl}
                  alt={r.label}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : r.status === "generating" ? (
                <div className="w-full h-full shimmer flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : r.status === "error" ? (
                <div className="w-full h-full bg-error-dim flex items-center justify-center">
                  <span className="text-xs text-error">Hata</span>
                </div>
              ) : (
                <div className="w-full h-full bg-surface-2 flex items-center justify-center">
                  <span className="text-xs text-subtle">Bekliyor</span>
                </div>
              )}

              {/* Hover overlay */}
              {r.imageUrl && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-start justify-end p-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(r.id); }}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedIds.has(r.id) ? "bg-accent border-accent" : "border-white/70 bg-black/30"
                    }`}
                  >
                    {selectedIds.has(r.id) && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Label */}
            <div className="p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-text truncate">{r.label}</span>
                {SOCIAL_MEDIA_SHOTS.find(s => s.id === r.id)?.hasText && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-accent/10 text-accent font-mono">TXT</span>
                )}
              </div>

              {/* Action buttons */}
              {r.status === "done" && r.imageUrl && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => downloadImage(r.imageUrl!, r.id, r.id)}
                    className={`flex-1 py-1 text-[10px] rounded transition-colors ${
                      downloadedIds.has(r.id)
                        ? "bg-green-500/20 border border-green-500/40 text-green-400 font-semibold"
                        : "bg-surface-2 border border-border text-muted hover:text-text"
                    }`}
                  >
                    {downloadedIds.has(r.id) ? "Indirildi \u2713" : "Indir"}
                  </button>
                  <button
                    onClick={() => onRetryShot(r.id)}
                    className="flex-1 py-1 text-[10px] bg-surface-2 border border-border rounded text-muted hover:text-text transition-colors"
                  >
                    Yenile
                  </button>
                  <button
                    onClick={() => setReviseId(reviseId === r.id ? null : r.id)}
                    className="flex-1 py-1 text-[10px] bg-surface-2 border border-border rounded text-muted hover:text-text transition-colors"
                  >
                    Revize
                  </button>
                </div>
              )}
              {r.status === "error" && (
                <button
                  onClick={() => onRetryShot(r.id)}
                  className="w-full py-1 text-[10px] bg-error-dim border border-error/30 rounded text-error hover:bg-error/20 transition-colors"
                >
                  Tekrar Dene
                </button>
              )}

              {/* Revise panel */}
              <AnimatePresence>
                {reviseId === r.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="flex gap-1.5 mt-1">
                      <input
                        type="text"
                        value={reviseText}
                        onChange={(e) => setReviseText(e.target.value)}
                        placeholder="Degisiklik talimati..."
                        className="flex-1 px-2 py-1.5 bg-bg border border-border rounded text-xs text-text placeholder:text-subtle outline-none focus:border-accent/60"
                        onKeyDown={(e) => e.key === "Enter" && handleRevise(r.id)}
                      />
                      <button
                        onClick={() => handleRevise(r.id)}
                        className="px-2 py-1.5 bg-accent text-black rounded text-xs font-semibold"
                      >
                        Gonder
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Zoom Modal - Full screen on mobile, tap to close */}
      <AnimatePresence>
        {zoomedUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeZoom}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-0 sm:p-4 cursor-zoom-out"
          >
            {/* Close button for mobile */}
            <button
              onClick={closeZoom}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors sm:hidden"
              aria-label="Kapat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={zoomedUrl}
              alt={zoomedLabel || "Buyutulmus gorsel"}
              loading="lazy"
              className="w-full h-full object-contain sm:max-w-full sm:max-h-full sm:w-auto sm:h-auto sm:rounded-lg"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
