import React, { useMemo, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Printer } from 'lucide-react';
import {
  type Customer,
  type Order,
  type StoreSettings,
  formatDateId,
  formatRupiah,
} from '../../types';
import { exportElementToPDF, exportElementToPNG } from '../../utils/exportUtils';
import { BrandLogo } from '../BrandLogo';

interface InvoiceViewProps {
  orders: Order[];
  customers: Customer[];
  settings: StoreSettings | null;
  theme: 'light' | 'dark';
  selectedOrderId: string;
  onSelectOrder: (orderId: string) => void;
}

export function InvoiceView({
  orders,
  customers,
  settings,
  theme,
  selectedOrderId,
  onSelectOrder,
}: InvoiceViewProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [exportingType, setExportingType] = useState<'pdf' | 'png' | null>(null);

  const activeOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || orders[0] || null;
  }, [orders, selectedOrderId]);

  const customer = useMemo(() => {
    if (!activeOrder) return null;
    return customers.find((c) => c.id === activeOrder.customerId) || null;
  }, [activeOrder, customers]);

  const taxRate = settings?.taxRate || 0;
  const grossSubtotal = activeOrder ? activeOrder.quantity * activeOrder.unitPrice : 0;
  const discountAmount = activeOrder?.discountAmount || 0;
  const subtotal = activeOrder?.totalAmount || 0;
  const taxAmount = Math.round((subtotal * taxRate) / 100);
  const grandTotal = subtotal + taxAmount;
  const paid = activeOrder?.paidAmount || 0;
  const balanceDue = Math.max(0, grandTotal - paid);

  const handleExport = async (type: 'pdf' | 'png') => {
    if (!invoiceRef.current || !activeOrder) return;
    setExportingType(type);
    try {
      const bg = theme === 'dark' ? '#1A221C' : '#FFFFFF';
      const fileBase = `Invoice-${activeOrder.invoiceNumber}-${activeOrder.customerName}`;
      if (type === 'pdf') {
        await exportElementToPDF(invoiceRef.current, fileBase, bg, 'portrait');
      } else {
        await exportElementToPNG(invoiceRef.current, fileBase, bg);
      }
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Selector & Export/Print Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7]">
            Invoice Pelanggan
          </h2>
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            Pilih pesanan untuk mengunduh nota resmi sebagai PDF, gambar PNG, atau cetak langsung.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeOrder?.id || ''}
            onChange={(e) => onSelectOrder(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-white/88 dark:bg-[#16201A]/88 border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#233126] dark:text-[#F8FAF7] surface-3d-subtle focus:outline-none focus-border-accent"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.invoiceNumber} — {o.customerName} ({formatRupiah(o.totalAmount)})
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!activeOrder}
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/88 dark:bg-[#16201A]/88 border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] disabled:opacity-50 text-xs font-medium text-[#233126] dark:text-[#F8FAF7] btn-3d-secondary cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4 text-accent-fg" />
            Cetak
          </button>

          <button
            type="button"
            disabled={!activeOrder || exportingType !== null}
            onClick={() => handleExport('png')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/88 dark:bg-[#16201A]/88 border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] disabled:opacity-50 text-xs font-medium text-[#233126] dark:text-[#F8FAF7] btn-3d-secondary cursor-pointer whitespace-nowrap"
          >
            <ImageIcon className="w-4 h-4 text-[#C69C4D] dark:text-[#F0C975]" />
            {exportingType === 'png' ? 'Proses...' : 'Unduh Gambar'}
          </button>

          <button
            type="button"
            disabled={!activeOrder || exportingType !== null}
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl disabled:opacity-50 text-white text-xs font-medium btn-3d-primary cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            {exportingType === 'pdf' ? 'Proses...' : 'Unduh PDF'}
          </button>
        </div>
      </div>

      {!activeOrder ? (
        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-12 text-center text-xs text-[#7D877E] dark:text-[#BCC8BF] surface-3d">
          Belum ada pesanan untuk dibuatkan invoice.
        </div>
      ) : (
        <div
          ref={invoiceRef}
          className="bg-white/94 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-6 sm:p-10 surface-3d max-w-4xl mx-auto print-area"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-[#EAE4DA] dark:border-[#344639]">
            <div className="flex items-start gap-3.5">
              <BrandLogo
                logoUrl={settings?.storeLogoUrl}
                alt={settings?.storeName || 'Logo Elviora'}
                className="w-12 h-12 rounded-xl mt-0.5"
                iconClassName="w-6 h-6"
              />
              <div>
                <p className="font-display font-bold text-2xl text-[#233126] dark:text-[#F8FAF7]">
                  {settings?.storeName || 'Elviora & Hantaran'}
                </p>
                <p className="text-xs text-[#616E63] dark:text-[#BCC8BF] mt-1">
                  {settings?.address || 'Jl. Kemang Timur No. 42, Jakarta Selatan'}
                </p>
                <p className="text-xs text-[#616E63] dark:text-[#BCC8BF] font-mono mt-0.5">
                  WhatsApp: {settings?.phone || '0812-8840-2310'}
                </p>
              </div>
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-semibold tracking-wider text-[#A88035] dark:text-[#F0C975]">
                INVOICE RESMI
              </p>
              <p className="font-mono font-bold text-lg text-[#233126] dark:text-[#F8FAF7] mt-0.5">
                {activeOrder.invoiceNumber}
              </p>
              <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF] mt-1">
                Tanggal Order:{' '}
                <span className="font-mono text-[#233126] dark:text-[#F8FAF7]">
                  {formatDateId(activeOrder.orderDate)}
                </span>
              </p>
              <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                Jadwal Kirim:{' '}
                <span className="font-mono text-[#233126] dark:text-[#F8FAF7]">
                  {formatDateId(activeOrder.dueDate)}
                </span>
              </p>
            </div>
          </div>

          {/* Recipient & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-[#EFEAE1] dark:border-[#344639]">
            <div>
              <p className="text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF] mb-1">
                DITAGIHKAN KEPADA
              </p>
              <p className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
                {activeOrder.customerName}
              </p>
              {customer?.phone && (
                <p className="text-xs text-[#616E63] dark:text-[#D4DFD6] font-mono mt-0.5">
                  {customer.phone}
                </p>
              )}
              {customer?.address && (
                <p className="text-xs text-[#616E63] dark:text-[#D4DFD6] mt-0.5">
                  {customer.address}
                </p>
              )}
            </div>

            <div className="sm:text-right">
              <p className="text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF] mb-1">
                STATUS PEMBAYARAN
              </p>
              <p
                className={`font-display font-bold text-lg ${
                  balanceDue === 0
                    ? 'text-accent-fg'
                    : paid > 0
                      ? 'text-[#A88035] dark:text-[#F0C975]'
                      : 'text-[#B85D68] dark:text-[#F4B4BC]'
                }`}
              >
                {activeOrder.paymentStatus}
              </p>
              <p className="text-xs text-[#616E63] dark:text-[#BCC8BF] mt-0.5">
                Status Produksi: {activeOrder.orderStatus}
              </p>
            </div>
          </div>

          {/* Line Items */}
          <div className="py-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF]">
                  <th className="py-2.5 pr-4">Deskripsi Pesanan</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                  <th className="py-2.5 pl-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="text-xs text-[#233126] dark:text-[#F8FAF7]">
                <tr className="border-b border-[#F4EFE6] dark:border-[#242F27]">
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-[#233126] dark:text-[#F8FAF7]">
                      {activeOrder.productName}
                    </p>
                    <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] mt-0.5">
                      Kategori: {activeOrder.category}
                    </p>
                    {activeOrder.notes && (
                      <p className="text-[11px] text-[#616E63] dark:text-[#D4DFD6] mt-1">
                        Catatan: {activeOrder.notes}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-3 text-center font-mono tabular-nums">
                    {activeOrder.quantity}
                  </td>
                  <td className="py-4 px-3 text-right font-mono tabular-nums">
                    {formatRupiah(activeOrder.unitPrice)}
                  </td>
                  <td className="py-4 pl-3 text-right font-mono font-semibold text-[#233126] dark:text-[#F8FAF7] tabular-nums">
                    {formatRupiah(grossSubtotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals & Bank Transfer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#EAE4DA] dark:border-[#344639]">
            <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] p-4 text-xs space-y-1 surface-3d-subtle">
              <p className="font-semibold text-[#233126] dark:text-[#F8FAF7] mb-1">
                Instruksi Pembayaran
              </p>
              <p className="text-[#616E63] dark:text-[#BCC8BF]">
                Bank:{' '}
                <strong className="text-[#233126] dark:text-[#F8FAF7]">
                  {settings?.bankName || 'BCA'}
                </strong>
              </p>
              <p className="text-[#616E63] dark:text-[#BCC8BF]">
                No. Rekening:{' '}
                <strong className="font-mono text-[#233126] dark:text-[#F8FAF7]">
                  {settings?.bankAccount || '5420-8812-90'}
                </strong>
              </p>
              <p className="text-[#616E63] dark:text-[#BCC8BF]">
                Atas Nama:{' '}
                <strong className="text-[#233126] dark:text-[#F8FAF7]">
                  {settings?.bankHolder || settings?.ownerName || 'Nadia Kusuma'}
                </strong>
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#616E63] dark:text-[#BCC8BF]">Subtotal</span>
                <span className="font-mono tabular-nums text-[#233126] dark:text-[#F8FAF7]">
                  {formatRupiah(grossSubtotal)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#A88035] dark:text-[#F0C975]">
                  <span>
                    Diskon
                    {activeOrder.discountType === 'percent' && activeOrder.discountValue
                      ? ` (${activeOrder.discountValue}%)`
                      : ''}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    - {formatRupiah(discountAmount)}
                  </span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#616E63] dark:text-[#BCC8BF]">Pajak ({taxRate}%)</span>
                  <span className="font-mono tabular-nums text-[#233126] dark:text-[#F8FAF7]">
                    {formatRupiah(taxAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#616E63] dark:text-[#BCC8BF]">Total Tagihan</span>
                <span className="font-mono font-bold tabular-nums text-[#233126] dark:text-[#F8FAF7]">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
              <div className="flex justify-between text-accent-fg">
                <span>Sudah Dibayar / DP</span>
                <span className="font-mono font-semibold tabular-nums">
                  - {formatRupiah(paid)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#EAE4DA] dark:border-[#344639] text-sm font-bold">
                <span className="text-[#233126] dark:text-[#F8FAF7]">Sisa Tagihan</span>
                <span
                  className={`font-mono tabular-nums ${
                    balanceDue > 0
                      ? 'text-[#B85D68] dark:text-[#F4B4BC]'
                      : 'text-accent-fg'
                  }`}
                >
                  {formatRupiah(balanceDue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
