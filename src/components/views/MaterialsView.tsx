import React, { useMemo, useState } from 'react';
import { AlertTriangle, Edit2, Minus, Package, Plus, Search, Trash2, X } from 'lucide-react';
import {
  type Material,
  type MaterialCategory,
  MATERIAL_CATEGORIES,
  formatRupiah,
} from '../../types';

interface MaterialsViewProps {
  materials: Material[];
  globalSearch: string;
  onCreate: (payload: Omit<Material, 'id' | 'ownerId'>) => Promise<string>;
  onUpdate: (id: string, payload: Omit<Material, 'id' | 'ownerId'>) => Promise<void>;
  onAdjustStock: (id: string, newStock: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function MaterialsView({
  materials,
  globalSearch,
  onCreate,
  onUpdate,
  onAdjustStock,
  onDelete,
}: MaterialsViewProps) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<'Semua' | MaterialCategory>('Semua');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<MaterialCategory>('Bunga Segar');
  const [unit, setUnit] = useState('tangkai');
  const [stock, setStock] = useState(50);
  const [minStock, setMinStock] = useState(15);
  const [unitCost, setUnitCost] = useState(10000);
  const [supplier, setSupplier] = useState('');
  const [saving, setSaving] = useState(false);

  const queryText = (search || globalSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      if (catFilter !== 'Semua' && m.category !== catFilter) return false;
      if (!queryText) return true;
      return (
        m.name.toLowerCase().includes(queryText) ||
        m.category.toLowerCase().includes(queryText) ||
        m.supplier.toLowerCase().includes(queryText)
      );
    });
  }, [materials, catFilter, queryText]);

  const summary = useMemo(() => {
    const totalSku = materials.length;
    const lowStock = materials.filter((m) => m.stock <= m.minStock).length;
    const totalValuation = materials.reduce((s, m) => s + m.stock * m.unitCost, 0);
    return { totalSku, lowStock, totalValuation };
  }, [materials]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setCategory('Bunga Segar');
    setUnit('tangkai');
    setStock(40);
    setMinStock(15);
    setUnitCost(10000);
    setSupplier('');
    setModalOpen(true);
  };

  const openEdit = (m: Material) => {
    setEditing(m);
    setName(m.name);
    setCategory(m.category);
    setUnit(m.unit);
    setStock(m.stock);
    setMinStock(m.minStock);
    setUnitCost(m.unitCost);
    setSupplier(m.supplier || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload: Omit<Material, 'id' | 'ownerId'> = {
        name: name.trim(),
        category,
        unit: unit.trim() || 'pcs',
        stock: Math.max(0, Number(stock) || 0),
        minStock: Math.max(0, Number(minStock) || 0),
        unitCost: Math.max(0, Number(unitCost) || 0),
        supplier: supplier.trim(),
      };
      if (editing) await onUpdate(editing.id, payload);
      else await onCreate(payload);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7]">
            Stok Bahan Baku
          </h2>
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            Pantau ketersediaan bunga segar, wrapping paper, pita satin, dan box hantaran.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Tambah Bahan
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <div className="flex items-center gap-2 text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            <Package className="w-4 h-4 text-accent-fg" />
            <span>Total Jenis Bahan</span>
          </div>
          <p className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-2">
            {summary.totalSku} Item
          </p>
        </div>

        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <div className="flex items-center gap-2 text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            <AlertTriangle className="w-4 h-4 text-[#C46F79] dark:text-[#F4B4BC]" />
            <span>Perlu Restock</span>
          </div>
          <p
            className={`font-display font-bold text-xl tabular-nums mt-2 ${
              summary.lowStock > 0
                ? 'text-[#B85D68] dark:text-[#F4B4BC]'
                : 'text-accent-fg'
            }`}
          >
            {summary.lowStock} Bahan
          </p>
        </div>

        <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">Total Nilai Inventaris</p>
          <p className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-2">
            {formatRupiah(summary.totalValuation)}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d-subtle flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7D877E] dark:text-[#B2C0B5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama bahan atau supplier..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] placeholder:text-[#8E968F] dark:placeholder:text-[#93A397] focus:outline-none focus-border-accent"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value as 'Semua' | MaterialCategory)}
          className="px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none"
        >
          <option value="Semua">Semua Kategori</option>
          {MATERIAL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] overflow-hidden surface-3d">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F4] dark:bg-[#1F2B23] border-b border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF]">
                <th className="py-3 px-4">Nama Bahan</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Harga Satuan</th>
                <th className="py-3 px-4 text-center">Stok Saat Ini</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4EFE6] dark:divide-[#2E3E32] text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#7D877E] dark:text-[#BCC8BF]">
                    Belum ada data stok bahan.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isLow = m.stock <= m.minStock;
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-[#FAF8F4]/70 dark:hover:bg-[#222C24]/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-[#233126] dark:text-[#F8FAF7]">
                        {m.name}
                      </td>
                      <td className="py-3 px-4 text-[#556257] dark:text-[#D4DFD6] whitespace-nowrap">
                        {m.category}
                      </td>
                      <td className="py-3 px-4 text-[#616E63] dark:text-[#BCC8BF] whitespace-nowrap">
                        {m.supplier || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#233126] dark:text-[#F8FAF7] tabular-nums whitespace-nowrap">
                        {formatRupiah(m.unitCost)}/{m.unit}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAdjustStock(m.id, Math.max(0, m.stock - 1))}
                            aria-label="Kurangi stok"
                            className="w-6 h-6 rounded-lg bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] flex items-center justify-center text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] btn-3d-secondary cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-semibold text-[#233126] dark:text-[#F8FAF7] tabular-nums min-w-[68px] text-center">
                            {m.stock} {m.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAdjustStock(m.id, m.stock + 1)}
                            aria-label="Tambah stok"
                            className="w-6 h-6 rounded-lg bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] flex items-center justify-center text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] btn-3d-secondary cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            isLow
                              ? 'text-[#B85D68] dark:text-[#F4B4BC]'
                              : 'text-accent-fg'
                          }`}
                        >
                          {isLow ? `Menipis (min ${m.minStock})` : 'Aman'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(m)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(m.id)}
                            title="Hapus"
                            className="p-1.5 rounded-lg text-[#C46F79] dark:text-[#F4B4BC] hover:bg-[#FDF4F5] dark:hover:bg-[#D88C94]/15 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add/Edit Material Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#233126]/40 dark:bg-black/60 backdrop-blur-[2px]">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] surface-3d w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#EFEAE1] dark:border-[#344639]">
              <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
                {editing ? 'Edit Stok Bahan' : 'Tambah Bahan Baku'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-[#7D877E] dark:text-[#BCC8BF] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  Nama Bahan
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MaterialCategory)}
                    className={inputCls}
                  >
                    {MATERIAL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="tangkai / lembar / roll"
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                    Stok
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={stock}
                    onChange={(e) => setStock(Math.max(0, Number(e.target.value) || 0))}
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                    Batas Min
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minStock}
                    onChange={(e) => setMinStock(Math.max(0, Number(e.target.value) || 0))}
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={unitCost}
                    onChange={(e) => setUnitCost(Math.max(0, Number(e.target.value) || 0))}
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] btn-3d-secondary cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
