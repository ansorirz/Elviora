import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit2,
  FileText,
  MessageCircle,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  type Customer,
  type Order,
  type OrderCategory,
  type OrderStatus,
  type PaymentStatus,
  type StoreSettings,
  ORDER_CATEGORIES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  formatDateId,
  formatRupiah,
  getProductImage,
} from '../../types';
import { buildOrderWhatsAppLink } from '../../utils/whatsappUtils';

interface OrdersViewProps {
  orders: Order[];
  customers: Customer[];
  settings: StoreSettings | null;
  globalSearch: string;
  onNewOrder: () => void;
  onEditOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => Promise<void>;
  onSettlePayment: (order: Order, amount: number) => Promise<void>;
  onQuickStatus: (id: string, status: OrderStatus) => Promise<void>;
  onOpenInvoice: (orderId: string) => void;
}

export function OrdersView({
  orders,
  customers,
  settings,
  globalSearch,
  onNewOrder,
  onEditOrder,
  onDeleteOrder,
  onSettlePayment,
  onQuickStatus,
  onOpenInvoice,
}: OrdersViewProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | OrderStatus>('Semua');
  const [paymentFilter, setPaymentFilter] = useState<'Semua' | PaymentStatus>('Semua');
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | OrderCategory>('Semua');
  const [settlingOrder, setSettlingOrder] = useState<Order | null>(null);
  const [settleInput, setSettleInput] = useState(0);

  const queryText = (localSearch || globalSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'Semua' && o.orderStatus !== statusFilter) return false;
      if (paymentFilter !== 'Semua' && o.paymentStatus !== paymentFilter) return false;
      if (categoryFilter !== 'Semua' && o.category !== categoryFilter) return false;
      if (!queryText) return true;
      return (
        o.invoiceNumber.toLowerCase().includes(queryText) ||
        o.customerName.toLowerCase().includes(queryText) ||
        o.productName.toLowerCase().includes(queryText) ||
        o.category.toLowerCase().includes(queryText)
      );
    });
  }, [orders, statusFilter, paymentFilter, categoryFilter, queryText]);

  const summary = useMemo(() => {
    const active = filtered.filter((o) => o.orderStatus !== 'Dibatalkan');
    const omzet = active.reduce((s, o) => s + o.totalAmount, 0);
    const terbayar = active.reduce((s, o) => s + o.paidAmount, 0);
    const piutang = Math.max(0, omzet - terbayar);
    return { count: filtered.length, omzet, terbayar, piutang };
  }, [filtered]);

  const customerLookup = useMemo(() => {
    const byId = new Map<string, Customer>();
    const byName = new Map<string, Customer>();
    customers.forEach((c) => {
      byId.set(c.id, c);
      if (c.name) byName.set(c.name.trim().toLowerCase(), c);
    });
    return { byId, byName };
  }, [customers]);

  const openSettleModal = (order: Order) => {
    setSettlingOrder(order);
    setSettleInput(Math.max(0, order.totalAmount - order.paidAmount));
  };

  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingOrder || settleInput <= 0) return;
    await onSettlePayment(settlingOrder, settleInput);
    setSettlingOrder(null);
  };

  return (
    <div className="space-y-5">
      {/* Header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7]">
            Data Pesanan
          </h2>
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            Kelola seluruh pesanan buket, hantaran lamaran, dan status pelunasannya.
          </p>
        </div>
        <button
          type="button"
          onClick={onNewOrder}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Tambah Pesanan
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Pesanan Ditampilkan</p>
          <p className="font-display font-bold text-lg text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-1">
            {summary.count} Pesanan
          </p>
        </div>
        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Nilai Pesanan Aktif</p>
          <p className="font-display font-bold text-lg text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-1">
            {formatRupiah(summary.omzet)}
          </p>
        </div>
        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Sudah Diterima</p>
          <p className="font-display font-bold text-lg text-accent-fg tabular-nums mt-1">
            {formatRupiah(summary.terbayar)}
          </p>
        </div>
        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Sisa Piutang</p>
          <p className="font-display font-bold text-lg text-[#B85D68] dark:text-[#F4B4BC] tabular-nums mt-1">
            {formatRupiah(summary.piutang)}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d-subtle flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#7D877E] dark:text-[#B2C0B5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Filter invoice, pelanggan, atau nama buket..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] placeholder:text-[#8E968F] dark:placeholder:text-[#93A397] focus:outline-none focus-border-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'Semua' | OrderCategory)}
            className="px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none"
          >
            <option value="Semua">Semua Kategori</option>
            {ORDER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as 'Semua' | PaymentStatus)}
            className="px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none"
          >
            <option value="Semua">Semua Pembayaran</option>
            {PAYMENT_STATUSES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'Semua' | OrderStatus)}
            className="px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none"
          >
            <option value="Semua">Semua Status</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] overflow-hidden surface-3d">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F4] dark:bg-[#1F2B23] border-b border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF]">
                <th className="py-3 px-4">Produk &amp; Invoice</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Tanggal Kirim</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Terbayar</th>
                <th className="py-3 px-4">Pembayaran</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EFE6] dark:divide-[#2E3E32] text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#7D877E] dark:text-[#BCC8BF]">
                    Tidak ada pesanan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const unpaid = Math.max(0, o.totalAmount - o.paidAmount);
                  const isLocked =
                    o.orderStatus === 'Dibatalkan' ||
                    (o.orderStatus === 'Selesai' && o.paymentStatus === 'Lunas');
                  const matchedCustomer =
                    customerLookup.byId.get(o.customerId) ||
                    customerLookup.byName.get(o.customerName.trim().toLowerCase()) ||
                    null;
                  const waPayload = buildOrderWhatsAppLink(o, matchedCustomer, settings);
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-[#FAF8F4]/70 dark:hover:bg-[#222C24]/60 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[210px]">
                          <img
                            src={getProductImage(o.imageKey, o.category)}
                            alt={o.productName}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-lg object-cover border border-[#EAE4DA] dark:border-[#344639] icon-3d shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-[#233126] dark:text-[#F8FAF7] truncate max-w-[200px]">
                              {o.productName}
                            </p>
                            <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] font-mono">
                              {o.invoiceNumber} · {o.quantity}x · {o.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-medium text-[#233126] dark:text-[#F8FAF7]">
                          {o.customerName}
                        </p>
                        {waPayload.phoneDisplay && (
                          <p className="text-[10px] font-mono text-[#7D877E] dark:text-[#BCC8BF]">
                            {waPayload.phoneDisplay}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#616E63] dark:text-[#BCC8BF] tabular-nums whitespace-nowrap">
                        {formatDateId(o.dueDate)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#233126] dark:text-[#F8FAF7] tabular-nums whitespace-nowrap">
                        <span>{formatRupiah(o.totalAmount)}</span>
                        {Boolean(o.discountAmount && o.discountAmount > 0) && (
                          <p className="text-[10px] font-normal text-[#A88035] dark:text-[#F0C975]">
                            Diskon -{formatRupiah(o.discountAmount || 0)}
                            {o.discountType === 'percent' && o.discountValue ? ` (${o.discountValue}%)` : ''}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <span className="text-accent-fg">
                          {formatRupiah(o.paidAmount)}
                        </span>
                        {unpaid > 0 && o.orderStatus !== 'Dibatalkan' && (
                          <p className="text-[10px] text-[#B85D68] dark:text-[#F4B4BC]">
                            Sisa {formatRupiah(unpaid)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              o.paymentStatus === 'Lunas'
                                ? 'text-accent-fg'
                                : o.paymentStatus === 'DP'
                                  ? 'text-[#A88035] dark:text-[#F0C975]'
                                  : 'text-[#B85D68] dark:text-[#F4B4BC]'
                            }`}
                          >
                            {o.paymentStatus}
                          </span>
                          {unpaid > 0 && o.orderStatus !== 'Dibatalkan' && (
                            <button
                              type="button"
                              onClick={() => openSettleModal(o)}
                              className="text-[11px] font-medium text-accent-fg underline cursor-pointer"
                            >
                              Bayar
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isLocked ? (
                          <span className="text-xs font-medium text-[#616E63] dark:text-[#BCC8BF]">
                            {o.orderStatus}
                          </span>
                        ) : (
                          <select
                            value={o.orderStatus}
                            onChange={(e) => onQuickStatus(o.id, e.target.value as OrderStatus)}
                            className="px-2 py-1 rounded-lg bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-[11px] font-medium text-[#233126] dark:text-[#F8FAF7] focus:outline-none cursor-pointer"
                          >
                            {ORDER_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={waPayload.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={
                              waPayload.hasPhone
                                ? `Kirim konfirmasi ke ${waPayload.phoneDisplay}`
                                : 'Nomor pelanggan belum tercatat — pilih kontak di WhatsApp'
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#25D366]/12 hover:bg-[#25D366]/22 dark:bg-[#25D366]/15 dark:hover:bg-[#25D366]/25 border border-[#25D366]/35 text-[#15803D] dark:text-[#4ADE80] text-[11px] font-medium transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Kirim via WhatsApp</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => onOpenInvoice(o.id)}
                            title="Lihat Invoice"
                            className="p-1.5 rounded-lg text-accent-fg hover:bg-accent-soft cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={() => onEditOrder(o)}
                              title="Edit Pesanan"
                              className="p-1.5 rounded-lg text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteOrder(o.id)}
                            title="Hapus Pesanan"
                            className="p-1.5 rounded-lg text-[#C46F79] dark:text-[#F4B4BC] hover:bg-[#FDF4F5] dark:hover:bg-[#D88C94]/15 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Payment Settlement Modal */}
      {settlingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#233126]/40 dark:bg-black/60 backdrop-blur-[2px]">
          <form
            onSubmit={handleConfirmSettle}
            className="bg-white dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] surface-3d w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent-fg flex items-center justify-center icon-3d">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
                  Catat Pembayaran / Pelunasan
                </h3>
                <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                  {settlingOrder.invoiceNumber} · {settlingOrder.customerName}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] p-3.5 text-xs space-y-1 surface-3d-subtle">
              <div className="flex justify-between">
                <span className="text-[#7D877E] dark:text-[#BCC8BF]">Total Tagihan</span>
                <span className="font-mono font-semibold text-[#233126] dark:text-[#F8FAF7]">
                  {formatRupiah(settlingOrder.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7D877E] dark:text-[#BCC8BF]">Sudah Dibayar</span>
                <span className="font-mono text-[#4C6750] dark:text-[#96B99A]">
                  {formatRupiah(settlingOrder.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#EAE4DA] dark:border-[#344639]">
                <span className="font-medium text-[#B85D68] dark:text-[#F4B4BC]">Sisa Tagihan</span>
                <span className="font-mono font-bold text-[#B85D68] dark:text-[#F4B4BC]">
                  {formatRupiah(Math.max(0, settlingOrder.totalAmount - settlingOrder.paidAmount))}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Nominal Pembayaran Masuk (Rp)
              </label>
              <input
                type="number"
                min={1}
                max={Math.max(0, settlingOrder.totalAmount - settlingOrder.paidAmount)}
                value={settleInput}
                onChange={(e) => setSettleInput(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-sm font-mono tabular-nums text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSettlingOrder(null)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] btn-3d-secondary cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer"
              >
                Simpan Pembayaran
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
