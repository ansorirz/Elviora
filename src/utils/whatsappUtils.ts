import {
  type Customer,
  type Order,
  type StoreSettings,
  formatDateId,
  formatRupiah,
} from '../types';

/**
 * Normalizes Indonesian / international phone numbers for WhatsApp wa.me links.
 * Converts leading `0` -> `62`, `8...` -> `628...`, and strips non-digits.
 */
export function normalizeWhatsAppPhone(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith('8')) {
    return `62${digits}`;
  }
  return digits;
}

export interface OrderWhatsAppPayload {
  url: string;
  hasPhone: boolean;
  phoneDisplay: string;
  message: string;
}

/**
 * Builds a pre-filled WhatsApp confirmation message and wa.me URL containing
 * the order details, discount (if any), total price, payment status, and due date.
 */
export function buildOrderWhatsAppLink(
  order: Order,
  customer?: Customer | null,
  settings?: StoreSettings | null
): OrderWhatsAppPayload {
  const storeName = settings?.storeName?.trim() || 'Elviora';
  const rawPhone = customer?.phone?.trim() || '';
  const normalizedPhone = normalizeWhatsAppPhone(rawPhone);

  const grossSubtotal = order.quantity * order.unitPrice;
  const discountAmount = Math.max(0, order.discountAmount || 0);
  const unpaid = Math.max(0, order.totalAmount - order.paidAmount);

  const lines: string[] = [
    `Halo Kak *${order.customerName}*,`,
    `Berikut konfirmasi pesanan Anda di *${storeName}*:`,
    '',
    `*No. Invoice:* ${order.invoiceNumber}`,
    `*Produk:* ${order.productName} (${order.category})`,
    `*Jumlah:* ${order.quantity} x ${formatRupiah(order.unitPrice)}`,
  ];

  if (discountAmount > 0) {
    lines.push(`*Subtotal:* ${formatRupiah(grossSubtotal)}`);
    const discLabel =
      order.discountType === 'percent' && order.discountValue
        ? ` (${order.discountValue}%)`
        : '';
    lines.push(`*Diskon${discLabel}:* -${formatRupiah(discountAmount)}`);
  }

  lines.push(`*Total Harga:* *${formatRupiah(order.totalAmount)}*`);
  lines.push(`*Sudah Dibayar:* ${formatRupiah(order.paidAmount)}`);

  if (unpaid > 0 && order.orderStatus !== 'Dibatalkan') {
    lines.push(`*Sisa Tagihan:* ${formatRupiah(unpaid)}`);
  }

  lines.push(`*Status Pembayaran:* ${order.paymentStatus}`);
  lines.push(`*Status Pesanan:* ${order.orderStatus}`);
  lines.push(`*Jadwal Kirim/Ambil:* ${formatDateId(order.dueDate)}`);

  if (order.notes?.trim()) {
    lines.push(`*Catatan:* ${order.notes.trim()}`);
  }

  if (unpaid > 0 && order.orderStatus !== 'Dibatalkan' && settings?.bankAccount?.trim()) {
    lines.push('');
    lines.push(
      `Pembayaran dapat ditransfer ke *${settings.bankName || 'Bank'} ${settings.bankAccount}* a.n. ${settings.bankHolder || storeName}.`
    );
  }

  lines.push('');
  lines.push('Mohon konfirmasinya ya Kak. Terima kasih!');

  const message = lines.join('\n');
  const encodedText = encodeURIComponent(message);
  const url = normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  return {
    url,
    hasPhone: Boolean(normalizedPhone),
    phoneDisplay: rawPhone,
    message,
  };
}
