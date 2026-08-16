/**
 * Resize and compress an image data URL for local storage / API payload size.
 * Returns a JPEG data URL by default.
 */
export async function compressImageDataUrl(
  dataUrl: string,
  options: { maxEdge?: number; quality?: number } = {},
): Promise<string> {
  const maxEdge = options.maxEdge ?? 1280;
  const quality = options.quality ?? 0.82;

  const img = await loadImage(dataUrl);
  const { width, height } = fitWithin(img.width, img.height, maxEdge);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function fitWithin(w: number, h: number, maxEdge: number): { width: number; height: number } {
  if (w <= maxEdge && h <= maxEdge) return { width: w, height: h };
  const scale = maxEdge / Math.max(w, h);
  return {
    width: Math.round(w * scale),
    height: Math.round(h * scale),
  };
}
