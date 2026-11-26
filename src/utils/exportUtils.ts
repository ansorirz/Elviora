import { jsPDF } from 'jspdf';
import { domToCanvas, domToPng } from 'modern-screenshot';
import {
  type Order,
  type StoreSettings,
  type Transaction,
  formatDateId,
  formatRupiah,
  getTodayISO,
} from '../types';

function triggerDownload(url: string, filename: string, revokeAfter = false): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (revokeAfter) {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function sanitizeFilePart(text: string): string {
  return (text || 'Elviora').trim().replace(/[^a-zA-Z0-9-_]+/g, '-');
}

function shouldSkipExportNode(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return false;
  return node.classList.contains('no-print') || node.classList.contains('no-export');
}

export async function exportElementToPNG(
  element: HTMLElement,
  filenameBase: string,
  backgroundColor: string
): Promise<void> {
  const dataUrl = await domToPng(element, {
    scale: 2,
    backgroundColor,
    filter: (node) => !shouldSkipExportNode(node),
  });
  triggerDownload(dataUrl, `${sanitizeFilePart(filenameBase)}.png`);
}

export async function exportElementToPDF(
  element: HTMLElement,
  filenameBase: string,
  backgroundColor: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<void> {
  const canvas = await domToCanvas(element, {
    scale: 2,
    backgroundColor,
    filter: (node) => !shouldSkipExportNode(node),
  });

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;

  const imgW = usableW;
  const pxPerMm = canvas.width / imgW;
  const totalImgH = canvas.height / pxPerMm;

  if (totalImgH <= usableH) {
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', margin, margin, imgW, totalImgH, undefined, 'FAST');
  } else {
    // Slice cleanly across A4 pages
    const sliceHeightPx = Math.floor(usableH * pxPerMm);
    let offsetY = 0;
    let pageIndex = 0;

    while (offsetY < canvas.height) {
      const currentSlicePx = Math.min(sliceHeightPx, canvas.height - offsetY);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = currentSlicePx;
      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          offsetY,
          canvas.width,
          currentSlicePx,
          0,
          0,
          canvas.width,
          currentSlicePx
        );
      }

      if (pageIndex > 0) pdf.addPage();
      const sliceH = currentSlicePx / pxPerMm;
      pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, sliceH, undefined, 'FAST');

      offsetY += currentSlicePx;
      pageIndex += 1;
    }
  }

  pdf.save(`${sanitizeFilePart(filenameBase)}.pdf`);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [95, 125, 99];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function exportFinancialSummaryPDF(
  orders: Order[],
  transactions: Transaction[],
  settings: StoreSettings | null,
  accentHex = '#5F7D63'
): void {
  const storeName = settings?.storeName || 'Elviora & Hantaran';
  const ownerName = settings?.ownerName || 'Owner Studio';
  const today = getTodayISO();

  const totalIncome = transactions
    .filter((t) => t.type === 'pemasukan')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'pengeluaran')
    .reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const activeReceivables = orders
    .filter((o) => o.orderStatus !== 'Dibatalkan' && o.totalAmount - o.paidAmount > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const totalReceivables = activeReceivables.reduce(
    (s, o) => s + Math.max(0, o.totalAmount - o.paidAmount),
    0
  );

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const [ar, ag, ab] = hexToRgb(accentHex);

  let y = 16;

  // Header Banner
  pdf.setFillColor(ar, ag, ab);
  pdf.roundedRect(margin, y, contentW, 24, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(storeName, margin + 5, y + 9);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Rekap Tutup Buku Keuangan · ${ownerName}`, margin + 5, y + 15.5);
  pdf.text(`Tanggal Ekspor: ${formatDateId(today)}`, pageW - margin - 5, y + 9, { align: 'right' });
  pdf.text(`Total Pesanan: ${orders.length} order`, pageW - margin - 5, y + 15.5, {
    align: 'right',
  });

  y += 31;

  // 4 Summary KPI Boxes
  const kpis = [
    { label: 'Total Pemasukan', value: formatRupiah(totalIncome), color: [ar, ag, ab] as const },
    { label: 'Total Pengeluaran', value: formatRupiah(totalExpense), color: [184, 93, 104] as const },
    { label: 'Laba Bersih Kas', value: formatRupiah(netProfit), color: [35, 49, 38] as const },
    { label: 'Piutang Pelanggan', value: formatRupiah(totalReceivables), color: [168, 128, 53] as const },
  ];
  const boxW = (contentW - 9) / 4;
  kpis.forEach((k, idx) => {
    const bx = margin + idx * (boxW + 3);
    pdf.setFillColor(250, 248, 244);
    pdf.setDrawColor(234, 228, 218);
    pdf.roundedRect(bx, y, boxW, 18, 2.5, 2.5, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(125, 135, 126);
    pdf.text(k.label, bx + 3, y + 6);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(k.color[0], k.color[1], k.color[2]);
    pdf.text(k.value, bx + 3, y + 13.5);
  });

  y += 25;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 16) {
      pdf.addPage();
      y = 16;
    }
  };

  // Active Receivables Section
  ensureSpace(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(35, 49, 38);
  pdf.text(`Daftar Piutang Pelanggan Aktif (${activeReceivables.length})`, margin, y);
  y += 4;

  if (activeReceivables.length === 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(95, 125, 99);
    pdf.text('Seluruh pesanan aktif sudah lunas.', margin, y + 4);
    y += 10;
  } else {
    pdf.setFillColor(244, 239, 230);
    pdf.rect(margin, y, contentW, 7, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(85, 98, 87);
    pdf.text('Invoice', margin + 2, y + 4.8);
    pdf.text('Pelanggan', margin + 32, y + 4.8);
    pdf.text('Kirim', margin + 84, y + 4.8);
    pdf.text('Total', margin + 126, y + 4.8, { align: 'right' });
    pdf.text('DP Masuk', margin + 154, y + 4.8, { align: 'right' });
    pdf.text('Sisa Piutang', pageW - margin - 2, y + 4.8, { align: 'right' });
    y += 8;

    activeReceivables.forEach((o) => {
      ensureSpace(7);
      const sisa = Math.max(0, o.totalAmount - o.paidAmount);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(35, 49, 38);
      pdf.text(o.invoiceNumber, margin + 2, y + 4);
      pdf.text(o.customerName.slice(0, 26), margin + 32, y + 4);
      pdf.text(formatDateId(o.dueDate), margin + 84, y + 4);
      pdf.text(formatRupiah(o.totalAmount), margin + 126, y + 4, { align: 'right' });
      pdf.text(formatRupiah(o.paidAmount), margin + 154, y + 4, { align: 'right' });
      pdf.setTextColor(184, 93, 104);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatRupiah(sisa), pageW - margin - 2, y + 4, { align: 'right' });
      pdf.setDrawColor(240, 235, 226);
      pdf.line(margin, y + 6, pageW - margin, y + 6);
      y += 6.5;
    });
    y += 6;
  }

  // Cash Transactions Ledger
  ensureSpace(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(35, 49, 38);
  pdf.text(`Riwayat Transaksi Kas (${transactions.length})`, margin, y);
  y += 4;

  const drawTxHeader = () => {
    pdf.setFillColor(244, 239, 230);
    pdf.rect(margin, y, contentW, 7, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(85, 98, 87);
    pdf.text('Tanggal', margin + 2, y + 4.8);
    pdf.text('Tipe', margin + 26, y + 4.8);
    pdf.text('Keterangan', margin + 48, y + 4.8);
    pdf.text('Kategori', margin + 114, y + 4.8);
    pdf.text('Metode', margin + 145, y + 4.8);
    pdf.text('Nominal', pageW - margin - 2, y + 4.8, { align: 'right' });
    y += 8;
  };

  drawTxHeader();

  transactions.forEach((t) => {
    if (y + 7 > pageH - 15) {
      pdf.addPage();
      y = 16;
      drawTxHeader();
    }
    const isInc = t.type === 'pemasukan';
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(97, 110, 99);
    pdf.text(formatDateId(t.date), margin + 2, y + 4);
    pdf.setTextColor(isInc ? ar : 184, isInc ? ag : 93, isInc ? ab : 104);
    pdf.setFont('helvetica', 'bold');
    pdf.text(isInc ? 'Masuk' : 'Keluar', margin + 26, y + 4);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(35, 49, 38);
    pdf.text((t.title || '-').slice(0, 34), margin + 48, y + 4);
    pdf.text((t.category || '-').slice(0, 18), margin + 114, y + 4);
    pdf.text((t.paymentMethod || '-').slice(0, 14), margin + 145, y + 4);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(isInc ? ar : 184, isInc ? ag : 93, isInc ? ab : 104);
    pdf.text(`${isInc ? '+' : '-'} ${formatRupiah(t.amount)}`, pageW - margin - 2, y + 4, {
      align: 'right',
    });
    pdf.setDrawColor(240, 235, 226);
    pdf.line(margin, y + 6, pageW - margin, y + 6);
    y += 6.5;
  });

  // Page footer numbering
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(140, 148, 141);
    pdf.text(`Elviora · ${storeName}`, margin, pageH - 7);
    pdf.text(`Halaman ${p} / ${totalPages}`, pageW - margin, pageH - 7, { align: 'right' });
  }

  pdf.save(`Rekap-Keuangan-${sanitizeFilePart(storeName)}-${today}.pdf`);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles: Partial<CSSStyleDeclaration>,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node.style, styles);
  if (text !== undefined) node.textContent = text;
  return node;
}

export async function exportFinancialSummaryImage(
  orders: Order[],
  transactions: Transaction[],
  settings: StoreSettings | null,
  theme: 'light' | 'dark',
  accentHex = '#5F7D63'
): Promise<void> {
  const isDark = theme === 'dark';
  const storeName = settings?.storeName || 'Elviora & Hantaran';
  const ownerName = settings?.ownerName || 'Owner Studio';
  const today = getTodayISO();

  const totalIncome = transactions
    .filter((t) => t.type === 'pemasukan')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'pengeluaran')
    .reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const receivablesList = orders.filter(
    (o) => o.orderStatus !== 'Dibatalkan' && o.totalAmount - o.paidAmount > 0
  );
  const totalReceivables = receivablesList.reduce(
    (s, o) => s + Math.max(0, o.totalAmount - o.paidAmount),
    0
  );

  const bg = isDark ? '#111713' : '#FAF8F4';
  const cardBg = isDark ? '#1A221C' : '#FFFFFF';
  const borderCol = isDark ? '#2A362D' : '#EAE4DA';
  const textPrimary = isDark ? '#F3EFE6' : '#233126';
  const textMuted = isDark ? '#9FA9A0' : '#616E63';

  const container = el('div', {
    position: 'fixed',
    left: '-99999px',
    top: '0',
    width: '960px',
    padding: '32px',
    backgroundColor: bg,
    color: textPrimary,
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    boxSizing: 'border-box',
  });

  // Header
  const header = el('div', {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderRadius: '18px',
    backgroundColor: accentHex,
    color: '#FFFFFF',
    marginBottom: '20px',
  });
  const hLeft = el('div', {});
  hLeft.appendChild(
    el('div', { fontSize: '20px', fontWeight: '700', marginBottom: '4px' }, storeName)
  );
  hLeft.appendChild(
    el(
      'div',
      { fontSize: '12px', opacity: '0.9' },
      `Rekap Tutup Buku Keuangan · ${ownerName}`
    )
  );
  const hRight = el('div', { textAlign: 'right' });
  hRight.appendChild(
    el('div', { fontSize: '12px', fontWeight: '600' }, formatDateId(today))
  );
  hRight.appendChild(
    el(
      'div',
      { fontSize: '11px', opacity: '0.88', marginTop: '2px' },
      `${orders.length} Pesanan · ${transactions.length} Transaksi`
    )
  );
  header.appendChild(hLeft);
  header.appendChild(hRight);
  container.appendChild(header);

  // KPI Grid
  const kpiGrid = el('div', {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '14px',
    marginBottom: '20px',
  });
  const kpis = [
    { label: 'Total Pemasukan', value: formatRupiah(totalIncome), color: accentHex },
    { label: 'Total Pengeluaran', value: formatRupiah(totalExpense), color: '#C46F79' },
    { label: 'Laba Bersih Kas', value: formatRupiah(netProfit), color: textPrimary },
    { label: 'Piutang Aktif', value: formatRupiah(totalReceivables), color: '#C69C4D' },
  ];
  kpis.forEach((k) => {
    const card = el('div', {
      backgroundColor: cardBg,
      border: `1px solid ${borderCol}`,
      borderRadius: '14px',
      padding: '16px',
    });
    card.appendChild(
      el('div', { fontSize: '11px', color: textMuted, marginBottom: '6px' }, k.label)
    );
    card.appendChild(
      el(
        'div',
        { fontSize: '17px', fontWeight: '700', color: k.color },
        k.value
      )
    );
    kpiGrid.appendChild(card);
  });
  container.appendChild(kpiGrid);

  // Recent Transactions Table Card
  const txCard = el('div', {
    backgroundColor: cardBg,
    border: `1px solid ${borderCol}`,
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '16px',
  });
  txCard.appendChild(
    el(
      'div',
      { fontSize: '14px', fontWeight: '700', marginBottom: '12px' },
      `Transaksi Kas Terbaru (menampilkan ${Math.min(10, transactions.length)} dari ${transactions.length})`
    )
  );

  transactions.slice(0, 10).forEach((t, idx) => {
    const isInc = t.type === 'pemasukan';
    const row = el('div', {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '9px 0',
      borderTop: idx === 0 ? `1px solid ${borderCol}` : 'none',
      borderBottom: `1px solid ${borderCol}`,
      fontSize: '12px',
    });
    const left = el('div', {});
    left.appendChild(el('span', { fontWeight: '600' }, t.title));
    left.appendChild(
      el(
        'span',
        { color: textMuted, marginLeft: '8px', fontSize: '11px' },
        `${formatDateId(t.date)} · ${t.category} · ${t.paymentMethod}`
      )
    );
    const right = el(
      'div',
      {
        fontWeight: '700',
        color: isInc ? accentHex : '#C46F79',
      },
      `${isInc ? '+' : '-'} ${formatRupiah(t.amount)}`
    );
    row.appendChild(left);
    row.appendChild(right);
    txCard.appendChild(row);
  });
  container.appendChild(txCard);

  // Footer
  container.appendChild(
    el(
      'div',
      {
        fontSize: '11px',
        color: textMuted,
        display: 'flex',
        justifyContent: 'space-between',
      },
      `Diekspor dari Elviora · ${storeName} · ${formatDateId(today)}`
    )
  );

  document.body.appendChild(container);
  try {
    const pngUrl = await domToPng(container, {
      scale: 2,
      backgroundColor: bg,
    });
    triggerDownload(pngUrl, `Rekap-Keuangan-${sanitizeFilePart(storeName)}-${today}.png`);
  } finally {
    document.body.removeChild(container);
  }
}
