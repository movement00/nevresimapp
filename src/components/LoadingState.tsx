import { motion } from "framer-motion";

interface LoadingStateProps {
  stage: "analyzing" | "generating";
}

const stages = {
  analyzing: {
    label: "ANALİZ",
    title: "Ürün analiz ediliyor",
    sub: "Detaylar hassasiyetle çıkarılıyor",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    steps: [
      "Fotoğraf kalitesi kontrol ediliyor",
      "Kumaş ve doku analiz ediliyor",
      "Nakış detayları çıkarılıyor",
      "Renk paleti belirleniyor",
      "Kenar işçilik detayları inceleniyor",
      "Üretim promptu hazırlanıyor",
    ],
  },
  generating: {
    label: "ÜRETİM",
    title: "Profesyonel görsel üretiliyor",
    sub: "Stüdyo sahnesi oluşturuluyor",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
    steps: [
      "Sahne kompozisyonu tasarlanıyor",
      "Kumaş dokusu render ediliyor",
      "Nakış detayları işleniyor",
      "Işık ve gölge ayarlanıyor",
      "Renk kalibrasyonu uygulanıyor",
      "Son kalite kontrolleri",
    ],
  },
};

export function LoadingState({ stage }: LoadingStateProps) {
  const config = stages[stage];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-10 sm:py-14 px-6 sm:px-8"
    >
      {/* Stage badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 mb-6 sm:mb-8"
      >
        <span className="text-[9px] sm:text-[10px] font-mono font-600 tracking-[0.15em] text-accent/70 uppercase">
          {config.label}
        </span>
        <span className="w-1 h-1 rounded-full bg-accent/40 animate-pulse" />
        <span className="text-[9px] sm:text-[10px] font-mono text-subtle uppercase tracking-widest">
          AI Processing
        </span>
      </motion.div>

      {/* Concentric spinner with stage icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative w-16 h-16 sm:w-20 sm:h-20 mb-6 sm:mb-8"
      >
        {/* Outer glow pulse */}
        <div className="absolute -inset-2 rounded-full bg-accent/5 animate-pulse" />
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border border-border/60" />
        <div className="absolute inset-0 rounded-full border-t-2 border-accent animate-spin-slow" />
        {/* Middle ring */}
        <div className="absolute inset-[6px] rounded-full border border-border/40" />
        <div className="absolute inset-[6px] rounded-full border-b border-accent/40 animate-spin-rev" />
        {/* Inner ring */}
        <div className="absolute inset-[12px] rounded-full border border-border/20" />
        <div className="absolute inset-[12px] rounded-full border-l border-accent/25 animate-spin-slow" style={{ animationDuration: "4s" }} />
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center text-accent/60">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {config.icon}
          </motion.div>
        </div>
      </motion.div>

      {/* Title and subtitle */}
      <motion.h3
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="font-display text-sm sm:text-base font-700 text-text mb-1 tracking-tight text-center"
      >
        {config.title}
      </motion.h3>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-[10px] sm:text-[11px] text-subtle mb-6 sm:mb-8 font-mono text-center"
      >
        {config.sub}
      </motion.p>

      {/* Skeleton shimmer progress bar */}
      <div className="w-full max-w-[280px] mb-6 sm:mb-7">
        <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent/30 via-accent/70 to-accent/30"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: "60%" }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="w-full max-w-[280px] space-y-1.5 sm:space-y-2">
        {config.steps.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.55, duration: 0.35 }}
            className="flex items-center gap-2.5 py-0.5"
          >
            {/* Animated dot that pulses when "active" */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{
                scale: 1,
                backgroundColor: ["rgba(var(--accent-rgb, 139, 92, 246), 0.3)", "rgba(var(--accent-rgb, 139, 92, 246), 0.7)", "rgba(var(--accent-rgb, 139, 92, 246), 0.3)"],
              }}
              transition={{
                scale: { delay: i * 0.55 + 0.1, type: "spring" },
                backgroundColor: { delay: i * 0.55 + 0.2, duration: 1.8, repeat: Infinity },
              }}
              className="w-1.5 h-1.5 rounded-full bg-accent/50 shrink-0"
            />
            {/* Step text with shimmer entrance */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.6] }}
              transition={{ delay: i * 0.55, duration: 2.2 }}
              className="text-[10px] sm:text-[11px] text-subtle font-mono"
            >
              {step}
            </motion.span>
            {/* Inline shimmer skeleton that fades out */}
            <motion.div
              initial={{ opacity: 0.6, width: "40%" }}
              animate={{ opacity: 0, width: 0 }}
              transition={{ delay: i * 0.55 + 0.3, duration: 0.8 }}
              className="h-2.5 rounded bg-gradient-to-r from-surface-3 via-border/40 to-surface-3 overflow-hidden"
            />
          </motion.div>
        ))}
      </div>

      {/* Stage-specific footer message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0.3, 0.5] }}
        transition={{ delay: 2, duration: 3, repeat: Infinity }}
        className="text-[9px] sm:text-[10px] text-subtle/50 font-mono mt-6 sm:mt-8 text-center"
      >
        {stage === "analyzing"
          ? "Fotoğraflarınız yapay zeka ile inceleniyor..."
          : "Stüdyo kalitesinde görsel oluşturuluyor..."}
      </motion.p>
    </motion.div>
  );
}
