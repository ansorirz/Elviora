import React, { useState } from 'react';
import { Calculator, Edit2, Plus, Trash2 } from 'lucide-react';
import {
  type OrderCategory,
  type ProductionModal,
  ORDER_CATEGORIES,
  formatRupiah,
} from '../../types';

interface ProductionModalViewProps {
  items: ProductionModal[];
  onCreate: (payload: Omit<ProductionModal, 'id' | 'ownerId'>) => Promise<string>;
  onUpdate: (id: string, payload: Omit<ProductionModal, 'id' | 'ownerId'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ProductionModalView({
  items,
  onCreate,
  onUpdate,
  onDelete,
}: ProductionModalViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<OrderCategory>('Buket Bunga');
  const [materialCost, setMaterialCost] = useState(150000);
  const [packagingCost, setPackagingCost] = useState(35000);
  const [laborCost, setLaborCost] = useState(45000);
  const [overheadCost, setOverheadCost] = useState(15000);
  const [sellingPrice, setSellingPrice] = useState(550000);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const totalHpp =
    Math.max(0, materialCost) +
    Math.max(0, packagingCost) +
    Math.max(0, laborCost) +
    Math.max(0, overheadCost);
  const profitPerUnit = sellingPrice - totalHpp;
  const marginPct = sellingPrice > 0 ? Math.round((profitPerUnit / sellingPrice) * 100) : 0;

  const resetForm = () => {
    setEditingId(null);
    setProductName('');
    setCategory('Buket Bunga');
    setMaterialCost(150000);
    setPackagingCost(35000);
    setLaborCost(45000);
    setOverheadCost(15000);
    setSellingPrice(550000);
    setNotes('');
  };

  const handleLoadEdit = (item: ProductionModal) => {
    setEditingId(item.id);
    setProductName(item.productName);
    setCategory(item.category);
    setMaterialCost(item.materialCost);
    setPackagingCost(item.packagingCost);
    setLaborCost(item.laborCost);
    setOverheadCost(item.overheadCost);
    setSellingPrice(item.sellingPrice);
    setNotes(item.notes || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;
    setSaving(true);
    try {
      const payload: Omit<ProductionModal, 'id' | 'ownerId'> = {
        productName: productName.trim(),
        category,
        materialCost,
        packagingCost,
        laborCost,
        overheadCost,
        totalHpp,
        sellingPrice,
        notes: notes.trim(),
      };
      if (editingId) await onUpdate(editingId, payload);
      else await onCreate(payload);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent';
  const numInputCls =
    'w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] font-mono tabular-nums focus:outline-none focus-border-accent';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7]">
          Modal Produksi &amp; Kalkulator HPP
        </h2>
        <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
          Hitung komponen biaya bunga, wrapping, box, dan jasa rangkai untuk menentukan harga jual ideal.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left: Interactive HPP Calculator Form */}
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-5 bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent-fg flex items-center justify-center icon-3d">
                <Calculator className="w-4 h-4" />
              </div>
              <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
                {editingId ? 'Edit Template HPP' : 'Kalkulator HPP Baru'}
              </h3>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-[#7D877E] dark:text-[#BCC8BF] hover:text-[#233126] dark:hover:text-[#F3EFE6] cursor-pointer"
              >
                Batal Edit
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                Nama Produk Buket / Hantaran
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Mis. Buket Peony & Eucalyptus Luxury"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as OrderCategory)}
                className={inputCls}
              >
                {ORDER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  Biaya Bunga / Isi (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={materialCost}
                  onChange={(e) => setMaterialCost(Math.max(0, Number(e.target.value) || 0))}
                  className={numInputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  Wrapping, Box &amp; Pita (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(Math.max(0, Number(e.target.value) || 0))}
                  className={numInputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  Jasa Rangkai Florist (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={laborCost}
                  onChange={(e) => setLaborCost(Math.max(0, Number(e.target.value) || 0))}
                  className={numInputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  Overhead &amp; Kartu (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={overheadCost}
                  onChange={(e) => setOverheadCost(Math.max(0, Number(e.target.value) || 0))}
                  className={numInputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                Harga Jual Direkomendasikan (Rp)
              </label>
              <input
                type="number"
                min={0}
                step={5000}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-sm text-[#233126] dark:text-[#F8FAF7] font-mono font-semibold tabular-nums focus:outline-none focus-border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                Catatan Resep
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Komposisi tangkai, ukuran box, atau detail kemasan..."
                className={inputCls}
              />
            </div>
          </div>

          {/* Live HPP Result Summary */}
          <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] p-4 grid grid-cols-3 gap-2 text-center surface-3d-subtle">
            <div>
              <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Total HPP</p>
              <p className="font-mono font-bold text-sm text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-0.5">
                {formatRupiah(totalHpp)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Laba / Unit</p>
              <p
                className={`font-mono font-bold text-sm tabular-nums mt-0.5 ${
                  profitPerUnit >= 0
                    ? 'text-accent-fg'
                    : 'text-[#B85D68] dark:text-[#F4B4BC]'
                }`}
              >
                {formatRupiah(profitPerUnit)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Margin</p>
              <p className="font-display font-bold text-sm text-[#A88035] dark:text-[#F0C975] tabular-nums mt-0.5">
                {marginPct}%
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Menyimpan...' : editingId ? 'Perbarui Template HPP' : 'Simpan ke Daftar HPP'}
          </button>
        </form>

        {/* Right: Saved Production Modal Templates */}
        <div className="xl:col-span-7 space-y-3">
          {items.length === 0 ? (
            <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-10 text-center text-xs text-[#7D877E] dark:text-[#BCC8BF] surface-3d">
              Belum ada template modal produksi tersimpan.
            </div>
          ) : (
            items.map((pm) => {
              const profit = pm.sellingPrice - pm.totalHpp;
              const margin = pm.sellingPrice > 0 ? Math.round((profit / pm.sellingPrice) * 100) : 0;
              return (
                <div
                  key={pm.id}
                  className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-[#A88035] dark:text-[#F0C975]">
                        {pm.category}
                      </p>
                      <h4 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7] mt-0.5">
                        {pm.productName}
                      </h4>
                      {pm.notes && (
                        <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF] mt-1">{pm.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadEdit(pm)}
                        title="Edit"
                        className="p-1.5 rounded-lg text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(pm.id)}
                        title="Hapus"
                        className="p-1.5 rounded-lg text-[#C46F79] dark:text-[#F4B4BC] hover:bg-[#FDF4F5] dark:hover:bg-[#D88C94]/15 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] p-2.5 surface-3d-subtle">
                      <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF]">Bahan &amp; Isi</p>
                      <p className="font-mono font-medium text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-0.5">
                        {formatRupiah(pm.materialCost)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] p-2.5 surface-3d-subtle">
                      <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF]">Kemasan &amp; Pita</p>
                      <p className="font-mono font-medium text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-0.5">
                        {formatRupiah(pm.packagingCost)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] p-2.5 surface-3d-subtle">
                      <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF]">Jasa &amp; Overhead</p>
                      <p className="font-mono font-medium text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-0.5">
                        {formatRupiah(pm.laborCost + pm.overheadCost)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-accent-soft p-2.5 surface-3d-subtle">
                      <p className="text-[10px] text-accent-fg">
                        Laba ({margin}%)
                      </p>
                      <p className="font-mono font-bold text-accent-fg tabular-nums mt-0.5">
                        {formatRupiah(profit)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#EFEAE1] dark:border-[#344639] flex items-center justify-between text-xs">
                    <span className="text-[#616E63] dark:text-[#BCC8BF]">
                      Total HPP:{' '}
                      <strong className="font-mono text-[#233126] dark:text-[#F8FAF7]">
                        {formatRupiah(pm.totalHpp)}
                      </strong>
                    </span>
                    <span className="text-[#616E63] dark:text-[#BCC8BF]">
                      Harga Jual:{' '}
                      <strong className="font-mono text-accent-fg">
                        {formatRupiah(pm.sellingPrice)}
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
