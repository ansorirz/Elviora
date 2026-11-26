export interface AvatarCropOptions {
  outputSize: 128 | 200 | 280;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Renders a user-framed & sized avatar image onto a square canvas and compresses
 * it to stay safely under Firestore document limits.
 */
export async function renderCroppedAvatar(
  imageSrc: string,
  options: AvatarCropOptions,
  maxDataLength = 72000
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Gagal memproses gambar profil.'));
    el.src = imageSrc;
  });

  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  const baseSide = Math.min(natW, natH);
  const safeZoom = Math.max(1, Math.min(3, options.zoom || 1));
  const cropSide = baseSide / safeZoom;

  const maxShiftX = Math.max(0, (natW - cropSide) / 2);
  const maxShiftY = Math.max(0, (natH - cropSide) / 2);
  const centerX = natW / 2 - options.offsetX * maxShiftX;
  const centerY = natH / 2 - options.offsetY * maxShiftY;

  const sx = Math.max(0, Math.min(natW - cropSide, centerX - cropSide / 2));
  const sy = Math.max(0, Math.min(natH - cropSide, centerY - cropSide / 2));

  const targetSizes = [options.outputSize, 180, 140, 112];
  const qualities = [0.88, 0.78, 0.68, 0.58];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser tidak mendukung pemrosesan gambar.');
  }

  for (const size of targetSizes) {
    if (size > options.outputSize) continue;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, cropSide, cropSide, 0, 0, size, size);

    for (const quality of qualities) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= maxDataLength) {
        return dataUrl;
      }
    }
  }

  throw new Error('Ukuran gambar terlalu besar, silakan pilih foto lain yang lebih ringan.');
}

/**
 * Compresses and center-crops an uploaded avatar image file into a compact
 * JPEG data URL guaranteed to stay well within Firestore document field limits.
 */
export async function compressAvatarFile(file: File, maxDataLength = 72000): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Pilih file gambar (JPG, PNG, atau WebP).');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await renderCroppedAvatar(
      objectUrl,
      { outputSize: 200, zoom: 1, offsetX: 0, offsetY: 0 },
      maxDataLength
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Compresses an uploaded brand logo image preserving aspect ratio (contain fit)
 * and transparency when PNG/WebP fits within Firestore field size limits.
 */
export async function compressLogoFile(file: File, maxDataLength = 72000): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Pilih file gambar logo (PNG, JPG, WebP, atau SVG).');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Gagal membaca file logo.'));
      el.src = objectUrl;
    });

    const natW = img.naturalWidth || img.width || 200;
    const natH = img.naturalHeight || img.height || 200;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser tidak mendukung pemrosesan gambar.');
    }

    const sizes = [220, 180, 140];
    for (const box of sizes) {
      const scale = Math.min(box / natW, box / natH);
      const drawW = Math.max(1, Math.round(natW * scale));
      const drawH = Math.max(1, Math.round(natH * scale));
      const dx = Math.round((box - drawW) / 2);
      const dy = Math.round((box - drawH) / 2);

      canvas.width = box;
      canvas.height = box;
      ctx.clearRect(0, 0, box, box);
      ctx.drawImage(img, dx, dy, drawW, drawH);

      const webpUrl = canvas.toDataURL('image/webp', 0.88);
      if (webpUrl.startsWith('data:image/webp') && webpUrl.length <= maxDataLength) {
        return webpUrl;
      }

      const pngUrl = canvas.toDataURL('image/png');
      if (pngUrl.length <= maxDataLength) {
        return pngUrl;
      }
    }

    // Fallback compact JPEG on white background
    canvas.width = 180;
    canvas.height = 180;
    const scale = Math.min(180 / natW, 180 / natH);
    const drawW = Math.max(1, Math.round(natW * scale));
    const drawH = Math.max(1, Math.round(natH * scale));
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 180, 180);
    ctx.drawImage(
      img,
      Math.round((180 - drawW) / 2),
      Math.round((180 - drawH) / 2),
      drawW,
      drawH
    );
    const jpgUrl = canvas.toDataURL('image/jpeg', 0.8);
    if (jpgUrl.length <= maxDataLength) {
      return jpgUrl;
    }

    throw new Error('Ukuran logo terlalu besar, silakan pilih file gambar yang lebih ringan.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface LogoCropOptions {
  outputSize: 128 | 200 | 280;
  fitMode: 'cover' | 'contain';
  bgMode: 'transparent' | 'white';
  zoom: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Renders a user-framed & sized Elviora brand logo onto a square canvas so that
 * when displayed inside BrandLogo containers it fits edge-to-edge cleanly.
 */
export async function renderCroppedLogo(
  imageSrc: string,
  options: LogoCropOptions,
  maxDataLength = 72000
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Gagal memproses gambar logo.'));
    el.src = imageSrc;
  });

  const natW = img.naturalWidth || img.width || 200;
  const natH = img.naturalHeight || img.height || 200;
  const safeZoom = Math.max(0.6, Math.min(2.6, options.zoom || 1));

  const targetSizes = [options.outputSize, 180, 140, 112];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser tidak mendukung pemrosesan gambar.');
  }

  for (const size of targetSizes) {
    if (size > options.outputSize) continue;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    if (options.bgMode === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
    }

    const baseScale =
      options.fitMode === 'cover'
        ? Math.max(size / natW, size / natH)
        : Math.min(size / natW, size / natH);
    const drawScale = baseScale * safeZoom;
    const drawW = natW * drawScale;
    const drawH = natH * drawScale;
    const dx = (size - drawW) / 2 + options.offsetX * (size * 0.45);
    const dy = (size - drawH) / 2 + options.offsetY * (size * 0.45);

    ctx.drawImage(img, dx, dy, drawW, drawH);

    if (options.bgMode === 'transparent') {
      const webpUrl = canvas.toDataURL('image/webp', 0.9);
      if (webpUrl.startsWith('data:image/webp') && webpUrl.length <= maxDataLength) {
        return webpUrl;
      }
      const pngUrl = canvas.toDataURL('image/png');
      if (pngUrl.length <= maxDataLength) {
        return pngUrl;
      }
    }

    // White background or fallback JPEG compression
    if (options.bgMode === 'transparent') {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'source-over';
    }

    for (const quality of [0.88, 0.78, 0.68, 0.56]) {
      const jpgUrl = canvas.toDataURL('image/jpeg', quality);
      if (jpgUrl.length <= maxDataLength) {
        return jpgUrl;
      }
    }
  }

  throw new Error('Ukuran logo terlalu besar, silakan pilih gambar yang lebih ringan.');
}

