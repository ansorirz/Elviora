import {
  type CartItem,
  type PublicStoreInfo,
  formatDateId,
  formatRupiah,
  getCatalogProductImages,
} from '../types';

export interface StorefrontOrderMeta {
  storeInfo: PublicStoreInfo | null;
  customerName?: string;
  customerPhone?: string;
  deliveryDate?: string;
  orderNotes?: string;
}

export function resolvePublicImageUrl(src?: string): string | null {
  if (!src) return null;
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/') && typeof window !== 'undefined') {
    return `${window.location.origin}${trimmed}`;
  }
  return null;
}

export function buildProductDeepLink(productId: string, photoIndex = 0): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  const params = new URLSearchParams();
  params.set('produk', productId);
  params.set('foto', String(Math.max(1, photoIndex + 1)));
  return origin ? `${origin}/?${params.toString()}` : `?${params.toString()}`;
}

export function getCartEntryImageInfo(entry: CartItem): {
  images: string[];
  photoIndex: number;
  photoUrl: string;
} {
  const images = getCatalogProductImages(entry.product);
  const rawIdx = entry.selectedImageIndex ?? 0;
  const photoIndex = images.length > 0 ? ((rawIdx % images.length) + images.length) % images.length : 0;
  const photoUrl = entry.selectedImageUrl?.trim() || images[photoIndex] || '';
  return { images, photoIndex, photoUrl };
}

export function buildStorefrontOrderMessage(
  items: CartItem[],
  meta: StorefrontOrderMeta
): string {
  const storeName = meta.storeInfo?.storeName?.trim() || 'Elviora Jasa Buket & Hantaran';
  const totalQty = items.reduce((sum, entry) => sum + entry.quantity, 0);
  const grandTotal = items.reduce(
    (sum, entry) => sum + entry.product.price * entry.quantity,
    0
  );
  const totalSavings = items.reduce((sum, entry) => {
    const orig = entry.product.originalPrice;
    if (typeof orig === 'number' && orig > entry.product.price) {
      return sum + (orig - entry.product.price) * entry.quantity;
    }
    return sum;
  }, 0);

  const lines: string[] = [
    `Halo Admin *${storeName}*,`,
    'Saya ingin konfirmasi pemesanan katalog/buket dari website:',
    '',
  ];

  if (meta.customerName?.trim()) {
    lines.push(`*Nama Pemesan:* ${meta.customerName.trim()}`);
  }
  if (meta.customerPhone?.trim()) {
    lines.push(`*No. WA Pemesan:* ${meta.customerPhone.trim()}`);
  }
  if (meta.deliveryDate) {
    lines.push(`*Jadwal Kirim/Ambil:* ${formatDateId(meta.deliveryDate)}`);
  }

  lines.push('');
  lines.push(`*DETAIL KATALOG & HARGA (${totalQty} item):*`);

  items.forEach((entry, idx) => {
    const { images, photoIndex, photoUrl } = getCartEntryImageInfo(entry);
    const subtotal = entry.product.price * entry.quantity;
    const hasPromo =
      typeof entry.product.originalPrice === 'number' &&
      entry.product.originalPrice > entry.product.price;
    const deepLink = buildProductDeepLink(entry.product.id, photoIndex);
    const publicImgUrl = resolvePublicImageUrl(photoUrl);

    lines.push('');
    lines.push(`*${idx + 1}. ${entry.product.title}*`);
    lines.push(`• Kategori: ${entry.product.category}`);
    lines.push(`• Foto Pilihan: Foto ke-${photoIndex + 1} dari ${images.length}`);

    if (hasPromo) {
      const unitSave = entry.product.originalPrice! - entry.product.price;
      lines.push(
        `• Harga Satuan: *${formatRupiah(entry.product.price)}* _(Normal ${formatRupiah(entry.product.originalPrice!)}, Hemat ${formatRupiah(unitSave)})_`
      );
    } else {
      lines.push(`• Harga Satuan: *${formatRupiah(entry.product.price)}*`);
    }

    lines.push(`• Jumlah: ${entry.quantity} pcs`);
    lines.push(`• Subtotal: *${formatRupiah(subtotal)}*`);

    if (entry.product.description?.trim()) {
      const desc = entry.product.description.trim();
      lines.push(`• Deskripsi: ${desc.length > 140 ? `${desc.slice(0, 137)}...` : desc}`);
    }

    lines.push(`• Lihat Katalog & Foto Pilihan: ${deepLink}`);
    if (publicImgUrl) {
      lines.push(`• Link Gambar Produk: ${publicImgUrl}`);
    }
  });

  lines.push('');
  lines.push('────────────────────');
  if (totalSavings > 0) {
    lines.push(`*Total Hemat Promo:* ${formatRupiah(totalSavings)}`);
  }
  lines.push(`*TOTAL HARGA:* *${formatRupiah(grandTotal)}*`);

  if (meta.orderNotes?.trim()) {
    lines.push(`*Catatan / Kartu Ucapan:* ${meta.orderNotes.trim()}`);
  }

  lines.push('');
  lines.push(
    'Mohon konfirmasi ketersediaan, ongkir/jadwal pengiriman, dan detail pembayarannya ya Kak. Terima kasih!'
  );

  return lines.join('\n');
}

export function buildStorefrontWhatsAppUrl(waDigits: string, message: string): string {
  const encoded = encodeURIComponent(message);
  return waDigits ? `https://wa.me/${waDigits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length > 3 ? `${last.slice(0, -3)}...` : last;
  }
  return lines;
}

export async function generateOrderCardPngBlob(
  items: CartItem[],
  meta: StorefrontOrderMeta
): Promise<Blob | null> {
  if (typeof document === 'undefined' || items.length === 0) return null;

  const storeName = meta.storeInfo?.storeName?.trim() || 'Elviora Jasa Buket & Hantaran';
  const phoneDisplay = meta.storeInfo?.whatsappPhone?.trim() || '0812-8840-2310';
  const visibleItems = items.slice(0, 6);
  const extraCount = Math.max(0, items.length - visibleItems.length);

  const loadedImages = await Promise.all(
    visibleItems.map(async (entry) => {
      const { photoUrl } = getCartEntryImageInfo(entry);
      return loadImageElement(photoUrl);
    })
  );

  const width = 920;
  const padding = 36;
  const headerH = 128;
  const metaRowH = meta.customerName?.trim() || meta.deliveryDate || meta.customerPhone?.trim() ? 66 : 0;
  const cardH = 152;
  const cardGap = 16;
  const extraBannerH = extraCount > 0 ? 44 : 0;
  const notesH = meta.orderNotes?.trim() ? 78 : 0;
  const summaryH = 126;
  const height =
    padding +
    headerH +
    (metaRowH ? metaRowH + 16 : 20) +
    visibleItems.length * cardH +
    Math.max(0, visibleItems.length - 1) * cardGap +
    (extraBannerH ? extraBannerH + 14 : 0) +
    (notesH ? notesH + 16 : 0) +
    20 +
    summaryH +
    padding;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Warm cream background
  ctx.fillStyle = '#FAF8F4';
  ctx.fillRect(0, 0, width, height);

  // Header Banner
  drawRoundedRectPath(ctx, padding, padding, width - padding * 2, headerH, 22);
  ctx.fillStyle = '#3A503D';
  ctx.fill();

  ctx.fillStyle = '#DDB568';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('KONFIRMASI PESANAN KATALOG & FOTO PILIHAN', padding + 28, padding + 38);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(storeName, padding + 28, padding + 76);

  ctx.fillStyle = '#CFE0D2';
  ctx.font = '500 14px "DM Sans", sans-serif';
  ctx.fillText(`WhatsApp Studio: ${phoneDisplay}`, padding + 28, padding + 104);

  const totalQty = items.reduce((s, e) => s + e.quantity, 0);
  const grandTotal = items.reduce((s, e) => s + e.product.price * e.quantity, 0);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#DDB568';
  ctx.font = '600 13px "DM Sans", sans-serif';
  ctx.fillText(`${totalQty} item dipilih`, width - padding - 28, padding + 50);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 26px "JetBrains Mono", monospace';
  ctx.fillText(formatRupiah(grandTotal), width - padding - 28, padding + 88);
  ctx.textAlign = 'left';

  let cursorY = padding + headerH + 18;

  // Customer meta strip
  if (metaRowH > 0) {
    drawRoundedRectPath(ctx, padding, cursorY, width - padding * 2, metaRowH, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#E5DDD0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const parts: string[] = [];
    if (meta.customerName?.trim()) parts.push(`Pemesan: ${meta.customerName.trim()}`);
    if (meta.customerPhone?.trim()) parts.push(`WA: ${meta.customerPhone.trim()}`);
    if (meta.deliveryDate) parts.push(`Kirim/Ambil: ${formatDateId(meta.deliveryDate)}`);

    ctx.fillStyle = '#233126';
    ctx.font = '600 15px "DM Sans", sans-serif';
    ctx.fillText(parts.join('   ·   '), padding + 22, cursorY + 39);
    cursorY += metaRowH + 16;
  }

  // Product Cards with chosen thumbnail images
  visibleItems.forEach((entry, idx) => {
    const imgEl = loadedImages[idx];
    const { images, photoIndex } = getCartEntryImageInfo(entry);
    const subtotal = entry.product.price * entry.quantity;
    const hasPromo =
      typeof entry.product.originalPrice === 'number' &&
      entry.product.originalPrice > entry.product.price;

    drawRoundedRectPath(ctx, padding, cursorY, width - padding * 2, cardH, 18);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#EAE2D5';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const thumbSize = 124;
    const thumbX = padding + 14;
    const thumbY = cursorY + 14;

    ctx.save();
    drawRoundedRectPath(ctx, thumbX, thumbY, thumbSize, thumbSize, 14);
    ctx.clip();
    if (imgEl) {
      const scale = Math.max(thumbSize / imgEl.width, thumbSize / imgEl.height);
      const dw = imgEl.width * scale;
      const dh = imgEl.height * scale;
      const dx = thumbX + (thumbSize - dw) / 2;
      const dy = thumbY + (thumbSize - dh) / 2;
      ctx.drawImage(imgEl, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = '#E1EAE2';
      ctx.fillRect(thumbX, thumbY, thumbSize, thumbSize);
      ctx.fillStyle = '#4C6750';
      ctx.font = '600 13px "DM Sans", sans-serif';
      ctx.fillText('Foto Katalog', thumbX + 24, thumbY + 66);
    }
    ctx.restore();

    // Text column
    const textX = thumbX + thumbSize + 20;
    const rightX = width - padding - 22;
    const titleMaxW = rightX - textX - 180;

    ctx.fillStyle = '#5F7D63';
    ctx.font = '600 13px "DM Sans", sans-serif';
    ctx.fillText(
      `${entry.product.category}  ·  Foto ke-${photoIndex + 1} dari ${images.length}`,
      textX,
      cursorY + 34
    );

    ctx.fillStyle = '#233126';
    ctx.font = '700 19px "Plus Jakarta Sans", sans-serif';
    const titleLines = wrapTextLines(ctx, entry.product.title, titleMaxW, 2);
    titleLines.forEach((line, lIdx) => {
      ctx.fillText(line, textX, cursorY + 62 + lIdx * 24);
    });

    const priceY = cursorY + 122;
    ctx.fillStyle = '#4C6750';
    ctx.font = '700 16px "JetBrains Mono", monospace';
    const unitText = `${formatRupiah(entry.product.price)} × ${entry.quantity}`;
    ctx.fillText(unitText, textX, priceY);

    if (hasPromo) {
      const unitW = ctx.measureText(unitText).width;
      ctx.fillStyle = '#8E968F';
      ctx.font = '500 13px "JetBrains Mono", monospace';
      ctx.fillText(
        `Normal ${formatRupiah(entry.product.originalPrice!)}`,
        textX + unitW + 14,
        priceY
      );
    }

    // Subtotal right-aligned
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7D877E';
    ctx.font = '500 12px "DM Sans", sans-serif';
    ctx.fillText('Subtotal', rightX, cursorY + 72);
    ctx.fillStyle = '#233126';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText(formatRupiah(subtotal), rightX, cursorY + 102);
    ctx.textAlign = 'left';

    cursorY += cardH + cardGap;
  });

  if (extraBannerH > 0) {
    drawRoundedRectPath(ctx, padding, cursorY, width - padding * 2, extraBannerH, 12);
    ctx.fillStyle = '#F1F5F1';
    ctx.fill();
    ctx.fillStyle = '#3A503D';
    ctx.font = '600 14px "DM Sans", sans-serif';
    ctx.fillText(
      `+ ${extraCount} item katalog lainnya tercantum lengkap pada pesan WhatsApp.`,
      padding + 20,
      cursorY + 27
    );
    cursorY += extraBannerH + 14;
  }

  if (notesH > 0 && meta.orderNotes?.trim()) {
    drawRoundedRectPath(ctx, padding, cursorY, width - padding * 2, notesH, 16);
    ctx.fillStyle = '#FBF7EC';
    ctx.fill();
    ctx.strokeStyle = '#EFE0BC';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#8C6725';
    ctx.font = '700 13px "DM Sans", sans-serif';
    ctx.fillText('CATATAN / KARTU UCAPAN:', padding + 20, cursorY + 28);

    ctx.fillStyle = '#233126';
    ctx.font = '500 14px "DM Sans", sans-serif';
    const noteLines = wrapTextLines(ctx, meta.orderNotes.trim(), width - padding * 2 - 40, 1);
    ctx.fillText(noteLines[0] || '', padding + 20, cursorY + 54);
    cursorY += notesH + 16;
  }

  // Footer Summary Box
  drawRoundedRectPath(ctx, padding, cursorY + 4, width - padding * 2, summaryH, 18);
  ctx.fillStyle = '#18241C';
  ctx.fill();

  ctx.fillStyle = '#C5D1C7';
  ctx.font = '500 14px "DM Sans", sans-serif';
  ctx.fillText('Estimasi Total Pembayaran Pesanan', padding + 28, cursorY + 44);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 32px "JetBrains Mono", monospace';
  ctx.fillText(formatRupiah(grandTotal), padding + 28, cursorY + 90);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#DDB568';
  ctx.font = '600 14px "DM Sans", sans-serif';
  ctx.fillText('Buket & Hantaran Studio', width - padding - 28, cursorY + 54);
  ctx.fillStyle = '#A8B8AC';
  ctx.font = '400 13px "DM Sans", sans-serif';
  ctx.fillText('Mohon konfirmasi jadwal kirim & pembayaran', width - padding - 28, cursorY + 80);
  ctx.textAlign = 'left';

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
}

export async function copyImageBlobToClipboard(blob: Blob | null): Promise<boolean> {
  if (
    !blob ||
    typeof navigator === 'undefined' ||
    !navigator.clipboard?.write ||
    typeof ClipboardItem === 'undefined'
  ) {
    return false;
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

export function canShareFilesWithNavigator(file: File): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  if (typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function shareOrderWithImageFile(
  blob: Blob,
  message: string,
  filename = 'Pesanan-Elviora.png'
): Promise<'shared' | 'aborted' | 'unsupported'> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (!canShareFilesWithNavigator(file)) {
    return 'unsupported';
  }
  try {
    await navigator.share({
      title: 'Konfirmasi Pesanan Elviora',
      text: message,
      files: [file],
    });
    return 'shared';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'aborted';
    }
    return 'unsupported';
  }
}

export function downloadOrderCardPng(blob: Blob, filename = 'Pesanan-Elviora.png'): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
