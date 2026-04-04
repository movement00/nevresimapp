// Video generation from images using Canvas + MediaRecorder

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Ken Burns Reveal Video — slow zoom-in/pan from hero image
 * Creates a 5-second video with smooth zoom toward center
 */
export async function generateKenBurnsVideo(
  imageBase64: string,
  durationSec: number = 5,
  onProgress?: (pct: number) => void
): Promise<string> {
  const img = await loadImage(imageBase64);
  const fps = 30;
  const totalFrames = durationSec * fps;

  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp9",
    videoBitsPerSecond: 8_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      resolve(url);
    };
    recorder.onerror = reject;
    recorder.start();

    let frame = 0;
    const drawFrame = () => {
      if (frame >= totalFrames) {
        recorder.stop();
        return;
      }

      const progress = frame / totalFrames;
      onProgress?.(Math.round(progress * 100));

      // Ken Burns: start at 100% zoom, end at 130% zoom, slight pan right+down
      const zoom = 1.0 + progress * 0.3;
      const panX = progress * 0.08;
      const panY = progress * 0.04;

      // Source rectangle (what part of the image to show)
      const sw = img.naturalWidth / zoom;
      const sh = img.naturalHeight / zoom;
      const sx = (img.naturalWidth - sw) * (0.3 + panX);
      const sy = (img.naturalHeight - sh) * (0.2 + panY);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      frame++;
      requestAnimationFrame(drawFrame);
    };

    drawFrame();
  });
}

/**
 * Carousel/Slider Video — shows all pipeline images with smooth transitions
 * Each image shown for ~2 seconds with 0.5s crossfade
 */
export async function generateCarouselVideo(
  imageBase64List: string[],
  perImageSec: number = 2.5,
  transitionSec: number = 0.5,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (imageBase64List.length === 0) throw new Error("En az 1 görsel gerekli");

  const images = await Promise.all(imageBase64List.map(loadImage));
  const fps = 30;
  const totalDuration = imageBase64List.length * perImageSec;
  const totalFrames = Math.round(totalDuration * fps);

  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp9",
    videoBitsPerSecond: 8_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      resolve(url);
    };
    recorder.onerror = reject;
    recorder.start();

    let frame = 0;
    const drawFrame = () => {
      if (frame >= totalFrames) {
        recorder.stop();
        return;
      }

      const time = frame / fps;
      const progress = frame / totalFrames;
      onProgress?.(Math.round(progress * 100));

      const imgIndex = Math.min(Math.floor(time / perImageSec), images.length - 1);
      const timeInSlide = time - imgIndex * perImageSec;

      // Draw current image (fill canvas maintaining aspect ratio)
      const drawImageFill = (img: HTMLImageElement, alpha: number) => {
        ctx.globalAlpha = alpha;
        const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
      };

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Crossfade transition
      if (timeInSlide > perImageSec - transitionSec && imgIndex < images.length - 1) {
        const fadeProgress = (timeInSlide - (perImageSec - transitionSec)) / transitionSec;
        drawImageFill(images[imgIndex], 1 - fadeProgress);
        drawImageFill(images[imgIndex + 1], fadeProgress);
      } else {
        drawImageFill(images[imgIndex], 1);
      }

      // Subtle zoom during each slide
      ctx.globalAlpha = 1;

      frame++;
      requestAnimationFrame(drawFrame);
    };

    drawFrame();
  });
}
