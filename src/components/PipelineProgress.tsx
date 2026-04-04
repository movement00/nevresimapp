import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PipelineProgress as PipelineProgressType } from "../services/pipelineService";

interface PipelineProgressProps {
  progress: PipelineProgressType;
}

const GROUP_LABELS: Record<string, string> = {
  A: "Oda Sahneleri",
  B: "Detay Çekimleri",
  C: "Düzenleme & Pazarlama",
  done: "Tamamlandı",
};

const downloadImage = (url: string, label: string) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = `${label.replace(/\s+/g, "_")}.png`;
  a.click();
};

export function PipelineProgressView({ progress }: PipelineProgressProps) {
  const pct = Math.round((progress.completedCount / progress.totalCount) * 100);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; label: string } | null>(null);

  return (
    <>
      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-0 sm:p-4 cursor-zoom-out touch-none"
            onClick={() => setZoomedImage(null)}
            onTouchEnd={() => setZoomedImage(null)}
          >
            <motion.img
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              src={zoomedImage.url}
              alt={zoomedImage.label}
              loading="lazy"
              className="max-w-full max-h-[100dvh] sm:max-h-[90vh] object-contain sm:rounded-lg"
            />
            {/* Label */}
            <div className="absolute top-3 sm:top-5 left-3 sm:left-5 text-white/70 text-xs font-medium bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
              {zoomedImage.label}
            </div>
            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
              className="absolute top-3 sm:top-5 right-3 sm:right-5 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 sm:p-2 rounded-full backdrop-blur-sm transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            {/* Download button in modal */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadImage(zoomedImage.url, zoomedImage.label);
              }}
              className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              İndir
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-surface rounded-xl border border-border p-5 space-y-5"
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display text-base font-700 text-text">Pipeline Çalışıyor</h3>
              <p className="text-[11px] text-subtle font-mono mt-0.5">
                {GROUP_LABELS[progress.currentGroup]}
              </p>
            </div>
            <span className="text-sm font-mono text-accent font-semibold tabular-nums">
              {progress.completedCount}/{progress.totalCount}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full bg-accent rounded-full animate-progress-pulse"
            />
          </div>
          <p className="text-[10px] font-mono text-subtle mt-1.5 text-right">{pct}%</p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {progress.results.map((result, i) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className={`group relative aspect-square rounded-lg overflow-hidden border transition-all ${
                result.status === "done" ? "border-success/40"
                : result.status === "generating" ? "border-accent/50"
                : result.status === "error" ? "border-error/40"
                : "border-border"
              } ${result.status === "done" && result.imageUrl ? "cursor-zoom-in" : ""}`}
              onClick={() => {
                if (result.status === "done" && result.imageUrl) {
                  setZoomedImage({ url: result.imageUrl, label: result.label });
                }
              }}
            >
              {result.imageUrl ? (
                <img src={result.imageUrl} alt={result.label} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${
                  result.status === "generating" ? "shimmer"
                  : result.status === "error" ? "bg-error-dim"
                  : "bg-surface-2"
                }`}>
                  {result.status === "generating" && (
                    <div className="w-5 h-5 rounded-full border border-border border-t-accent animate-spin-slow" />
                  )}
                  {result.status === "error" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-error">
                      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                  )}
                  {result.status === "pending" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-border" />
                  )}
                </div>
              )}

              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3">
                <span className="text-[8px] text-white/80 font-medium leading-tight block truncate">{result.label}</span>
              </div>

              {result.status === "done" && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}

              {/* Download button overlay on completed images */}
              {result.status === "done" && result.imageUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadImage(result.imageUrl!, result.label);
                  }}
                  className="absolute top-1 left-1 w-5 h-5 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  title="İndir"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </>
  );
}
