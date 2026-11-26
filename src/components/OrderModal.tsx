import React, { useEffect, useState } from 'react';
import { Percent, Tag, X } from 'lucide-react';
import {
  type Customer,
  type DiscountType,
  type Order,
  type OrderCategory,
  type OrderStatus,
  type ProductionModal,
  ORDER_CATEGORIES,
  ORDER_STATUSES,
  formatRupiah,
  getTodayISO,
  addDaysISO,
} from '../types';

interface OrderModalProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  productionModals: ProductionModal[];
  invoicePrefix: string;
  existingOrdersCount: number;
  editingOrder?: Order | null;
  defaultDueDate?: string;
  onSaveOrder: (
    payload: Omit<Order, 'id' | 'ownerId'>,
    options: { recordIncomeTx: boolean; newCustomerName?: string; newCustomerPhone?: string }
  ) => Promise<void>;
}

export function OrderModal({
  open,
  onClose,
  customers,
  productionModals,
  invoicePrefix,
  existingOrdersCount,
  editingOrder,
  defaultDueDate,
  onSaveOrder,
}: OrderModalProps) {
  const today = getTodayISO();
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [customerId, setCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<OrderCategory>('Buket Bunga');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(500000);
  const [productionCost, setProductionCost] = useState(220000);
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [paidAmount, setPaidAmount] = useState(500000);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('Diproses');
  const [orderDate, setOrderDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDaysISO(today, 2));
  const [notes, setNotes] = useState('');
  const [recordIncomeTx, setRecordIncomeTx] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    setErrorMsg('');
    if (editingOrder) {
      setCustomerMode('existing');
      setCustomerId(editingOrder.customerId);
      setProductName(editingOrder.productName);
      setCategory(editingOrder.category);
      setQuantity(editingOrder.quantity);
      setUnitPrice(editingOrder.unitPrice);
      setProductionCost(editingOrder.productionCost);
      setDiscountType(editingOrder.discountType || 'none');
      setDiscountValue(editingOrder.discountValue || 0);
      setPaidAmount(editingOrder.paidAmount);
      setOrderStatus(editingOrder.orderStatus);
      setOrderDate(editingOrder.orderDate);
      setDueDate(editingOrder.dueDate);
      setNotes(editingOrder.notes || '');
      setRecordIncomeTx(false);
    } else {
      setCustomerMode(customers.length > 0 ? 'existing' : 'new');
      setCustomerId(customers[0]?.id || '');
      setNewCustomerName('');
      setNewCustomerPhone('');
      setProductName('');
      setCategory('Buket Bunga');
      setQuantity(1);
      setUnitPrice(550000);
      setProductionCost(240000);
      setDiscountType('none');
      setDiscountValue(0);
      setPaidAmount(550000);
      setOrderStatus('Diproses');
      setOrderDate(today);
      setDueDate(defaultDueDate || addDaysISO(today, 2));
      setNotes('');
      setRecordIncomeTx(true);
    }
  }, [open, editingOrder, customers, defaultDueDate, today]);

  if (!open) return null;

  const grossSubtotal = Math.max(0, quantity * unitPrice);
  const safeDiscountVal =
    discountType === 'percent'
      ? Math.min(100, Math.max(0, Number(discountValue) || 0))
      : discountType === 'fixed'
        ? Math.min(grossSubtotal, Math.max(0, Number(discountValue) || 0))
        : 0;

  const discountAmount =
    discountType === 'percent'
      ? Math.round((grossSubtotal * safeDiscountVal) / 100)
      : discountType === 'fixed'
        ? Math.round(safeDiscountVal)
        : 0;

  const totalAmount = Math.max(0, grossSubtotal - discountAmount);
  const safePaid = Math.min(totalAmount, Math.max(0, paidAmount));
  const remaining = Math.max(0, totalAmount - safePaid);
  const derivedPaymentStatus =
    safePaid >= totalAmount && totalAmount > 0 ? 'Lunas' : safePaid > 0 ? 'DP' : 'Belum Bayar';

  const handleApplyTemplate = (modalId: string) => {
    const found = productionModals.find((m) => m.id === modalId);
    if (!found) return;
    setProductName(found.productName);
    setCategory(found.category);
    setUnitPrice(found.sellingPrice);
    setProductionCost(found.totalHpp);
    const nextSubtotal = found.sellingPrice * quantity;
    const nextDiscount =
      discountType === 'percent'
        ? Math.round((nextSubtotal * safeDiscountVal) / 100)
        : discountType === 'fixed'
          ? Math.min(nextSubtotal, safeDiscountVal)
          : 0;
    setPaidAmount(Math.max(0, nextSubtotal - nextDiscount));
  };

  const handleDiscountTypeChange = (nextType: DiscountType) => {
    setDiscountType(nextType);
    if (nextType === 'none') {
      setDiscountValue(0);
    } else if (nextType === 'percent') {
      setDiscountValue((prev) => (prev > 100 || prev <= 0 ? 10 : prev));
    } else {
      setDiscountValue((prev) => (prev <= 0 ? 25000 : prev));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!productName.trim()) {
      setErrorMsg('Nama produk buket atau hantaran wajib diisi.');
      return;
    }
    if (customerMode === 'existing' && !customerId) {
      setErrorMsg('Pilih pelanggan terlebih dahulu.');
      return;
    }
    if (customerMode === 'new' && (!newCustomerName.trim() || !newCustomerPhone.trim())) {
      setErrorMsg('Nama dan nomor WhatsApp pelanggan baru wajib diisi.');
      return;
    }

    const selectedCustomer = customers.find((c) => c.id === customerId);
    const invNum =
      editingOrder?.invoiceNumber ||
      `${invoicePrefix || 'FLR'}-${new Date().getFullYear()}-${String(101 + existingOrdersCount).padStart(3, '0')}`;

    const imageKey =
      category === 'Hantaran Lamaran'
        ? 'hantaranLamaran'
        : category === 'Buket Uang & Snack'
          ? 'buketUang'
          : category === 'Hampers Musiman'
            ? 'hampersLebaran'
            : 'buketMawar';

    setSaving(true);
    try {
      await onSaveOrder(
        {
          invoiceNumber: invNum,
          customerId: customerMode === 'existing' ? customerId : 'PENDING',
          customerName:
            customerMode === 'existing'
              ? selectedCustomer?.name || 'Pelanggan'
              : newCustomerName.trim(),
          productName: productName.trim(),
          category,
          quantity: Math.max(1, Number(quantity) || 1),
          unitPrice: Math.max(0, Number(unitPrice) || 0),
          productionCost: Math.max(0, Number(productionCost) || 0),
          totalAmount,
          paidAmount: safePaid,
          paymentStatus: derivedPaymentStatus,
          orderStatus,
          orderDate,
          dueDate,
          notes: notes.trim(),
          imageKey,
          discountType,
          discountValue: safeDiscountVal,
          discountAmount,
        },
        {
          recordIncomeTx: !editingOrder && recordIncomeTx,
          newCustomerName: customerMode === 'new' ? newCustomerName.trim() : undefined,
          newCustomerPhone: customerMode === 'new' ? newCustomerPhone.trim() : undefined,
        }
      );
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan pesanan.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#111713] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#233126]/50 dark:bg-black/65 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] surface-3d w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-[#16201A] border-b border-[#EFEAE1] dark:border-[#344639] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-display font-semibold text-lg text-[#233126] dark:text-[#F8FAF7]">
              {editingOrder ? `Edit Pesanan ${editingOrder.invoiceNumber}` : 'Tambah Pesanan Baru'}
            </h2>
            <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
              Lengkapi detail pesanan buket atau hantaran, diskon harga, dan status pembayarannya.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-2 rounded-xl text-[#7D877E] dark:text-[#BCC8BF] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] hover:text-[#233126] dark:hover:text-[#F3EFE6] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-xl bg-[#FDF4F5] dark:bg-[#D88C94]/15 border border-[#F2CFD3] dark:border-[#D88C94]/30 px-4 py-3 text-xs text-[#B85D68] dark:text-[#F4B4BC]">
              {errorMsg}
            </div>
          )}

          {!editingOrder && productionModals.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Ambil dari Template Modal Produksi (Opsional)
              </label>
              <select
                defaultValue=""
                onChange={(e) => handleApplyTemplate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent"
              >
                <option value="">-- Pilih template produk &amp; HPP --</option>
                {productionModals.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.productName} — Jual {formatRupiah(pm.sellingPrice)} (HPP {formatRupiah(pm.totalHpp)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] p-4 space-y-3 surface-3d-subtle">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7]">
                Data Pelanggan
              </span>
              {!editingOrder && (
                <div className="inline-flex rounded-lg bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('existing')}
                    className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                      customerMode === 'existing'
                        ? 'bg-accent text-white'
                        : 'text-[#616E63] dark:text-[#BCC8BF]'
                    }`}
                  >
                    Pelanggan Terdaftar
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('new')}
                    className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                      customerMode === 'new'
                        ? 'bg-accent text-white'
                        : 'text-[#616E63] dark:text-[#BCC8BF]'
                    }`}
                  >
                    + Pelanggan Baru
                  </button>
                </div>
              )}
            </div>

            {customerMode === 'existing' ? (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputCls}
              >
                <option value="">-- Pilih pelanggan --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) · {c.segment}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Nama lengkap pelanggan"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="No. WhatsApp (mis. 0812...)"
                  className={inputCls}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Nama Produk Buket / Hantaran
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Contoh: Buket Mawar Blush & Eucalyptus Premium"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as OrderCategory)}
                className={inputCls}
              >
                {ORDER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Status Produksi
              </label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                className={inputCls}
              >
                {ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Jumlah (Qty)
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className={`${inputCls} font-mono tabular-nums`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Harga Satuan (Rp)
              </label>
              <input
                type="number"
                min={0}
                step={5000}
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value) || 0))}
                className={`${inputCls} font-mono tabular-nums`}
              />
            </div>

            {/* Discount Management Card */}
            <div className="sm:col-span-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] p-4 space-y-3 surface-3d-subtle">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-accent-fg" />
                  <span className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7]">
                    Manajemen Diskon / Potongan Harga
                  </span>
                </div>

                <div className="inline-flex rounded-lg bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleDiscountTypeChange('none')}
                    className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                      discountType === 'none'
                        ? 'bg-accent text-white'
                        : 'text-[#616E63] dark:text-[#BCC8BF]'
                    }`}
                  >
                    Tanpa Diskon
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscountTypeChange('percent')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                      discountType === 'percent'
                        ? 'bg-accent text-white'
                        : 'text-[#616E63] dark:text-[#BCC8BF]'
                    }`}
                  >
                    <Percent className="w-3 h-3" />
                    Persen (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscountTypeChange('fixed')}
                    className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                      discountType === 'fixed'
                        ? 'bg-accent text-white'
                        : 'text-[#616E63] dark:text-[#BCC8BF]'
                    }`}
                  >
                    Nominal (Rp)
                  </button>
                </div>
              </div>

              {discountType === 'percent' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] text-[#616E63] dark:text-[#BCC8BF] mb-1">
                      Persentase Potongan (0 – 100%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={safeDiscountVal}
                        onChange={(e) =>
                          setDiscountValue(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                        }
                        className={`${inputCls} pr-8 font-mono tabular-nums`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#7D877E]">
                        %
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="block text-[11px] text-[#616E63] dark:text-[#BCC8BF]">
                      Pilih cepat:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[5, 10, 15, 20, 25].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscountValue(pct)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium cursor-pointer ${
                            safeDiscountVal === pct
                              ? 'border-accent bg-accent-soft text-accent-fg'
                              : 'border-[#EAE4DA] dark:border-[#344639] bg-white dark:bg-[#16201A] text-[#556257] dark:text-[#D4DFD6]'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {discountType === 'fixed' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] text-[#616E63] dark:text-[#BCC8BF] mb-1">
                      Nominal Potongan Tetap (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={grossSubtotal}
                      step={5000}
                      value={safeDiscountVal}
                      onChange={(e) =>
                        setDiscountValue(
                          Math.min(grossSubtotal, Math.max(0, Number(e.target.value) || 0))
                        )
                      }
                      className={`${inputCls} font-mono tabular-nums`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="block text-[11px] text-[#616E63] dark:text-[#BCC8BF]">
                      Potongan cepat:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[25000, 50000, 100000, 150000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDiscountValue(Math.min(grossSubtotal, amt))}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium cursor-pointer ${
                            safeDiscountVal === amt
                              ? 'border-accent bg-accent-soft text-accent-fg'
                              : 'border-[#EAE4DA] dark:border-[#344639] bg-white dark:bg-[#16201A] text-[#556257] dark:text-[#D4DFD6]'
                          }`}
                        >
                          -{amt / 1000}rb
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#EAE4DA]/80 dark:border-[#344639]">
                  <span className="text-[#616E63] dark:text-[#BCC8BF]">
                    Subtotal {formatRupiah(grossSubtotal)} → Potongan diterapkan:
                  </span>
                  <span className="font-mono font-semibold text-[#B85D68] dark:text-[#F4B4BC]">
                    - {formatRupiah(discountAmount)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Modal Produksi / Unit (HPP Rp)
              </label>
              <input
                type="number"
                min={0}
                step={5000}
                value={productionCost}
                onChange={(e) => setProductionCost(Math.max(0, Number(e.target.value) || 0))}
                className={`${inputCls} font-mono tabular-nums`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6]">
                  Nominal Dibayar / DP (Rp)
                </label>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPaidAmount(Math.round(totalAmount * 0.5))}
                    className="text-[#A88035] dark:text-[#F0C975] hover:underline cursor-pointer"
                  >
                    DP 50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(totalAmount)}
                    className="text-accent-fg font-medium hover:underline cursor-pointer"
                  >
                    Lunas
                  </button>
                </div>
              </div>
              <input
                type="number"
                min={0}
                max={totalAmount}
                step={5000}
                value={safePaid}
                onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value) || 0))}
                className={`${inputCls} font-mono tabular-nums`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Tanggal Order
              </label>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Tanggal Kirim / Ambil (Deadline)
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Catatan Pesanan
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Warna pita, isi kartu ucapan, jam pengiriman..."
                className={inputCls}
              />
            </div>
          </div>

          <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] p-4 flex flex-wrap items-center justify-between gap-4 surface-3d-subtle">
            <div>
              <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
                {discountAmount > 0 ? 'Total Setelah Diskon' : 'Total Tagihan'}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="font-display font-bold text-base text-[#233126] dark:text-[#F8FAF7] tabular-nums">
                  {formatRupiah(totalAmount)}
                </p>
                {discountAmount > 0 && (
                  <span className="text-[11px] line-through text-[#7D877E] dark:text-[#BCC8BF] tabular-nums">
                    {formatRupiah(grossSubtotal)}
                  </span>
                )}
              </div>
            </div>
            {discountAmount > 0 && (
              <div>
                <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Potongan Diskon</p>
                <p className="font-mono font-semibold text-sm text-[#A88035] dark:text-[#F0C975] tabular-nums">
                  -{formatRupiah(discountAmount)}
                  {discountType === 'percent' ? ` (${safeDiscountVal}%)` : ''}
                </p>
              </div>
            )}
            <div>
              <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Sisa Piutang</p>
              <p className="font-display font-semibold text-sm text-[#B85D68] dark:text-[#F4B4BC] tabular-nums">
                {formatRupiah(remaining)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Status Pembayaran</p>
              <p className="text-xs font-semibold text-accent-fg">
                {derivedPaymentStatus}
              </p>
            </div>
          </div>

          {!editingOrder && safePaid > 0 && (
            <label className="flex items-center gap-2.5 text-xs text-[#556257] dark:text-[#D4DFD6] cursor-pointer">
              <input
                type="checkbox"
                checked={recordIncomeTx}
                onChange={(e) => setRecordIncomeTx(e.target.checked)}
                className="rounded border-[#EAE4DA] dark:border-[#344639]"
                style={{ accentColor: 'var(--accent)' }}
              />
              Catat nominal dibayar ({formatRupiah(safePaid)}) otomatis ke buku Pemasukan
            </label>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#EFEAE1] dark:border-[#344639]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] btn-3d-secondary cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl disabled:opacity-60 text-white text-xs font-medium btn-3d-primary cursor-pointer"
            >
              {saving ? 'Menyimpan...' : editingOrder ? 'Simpan Perubahan' : 'Simpan Pesanan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
