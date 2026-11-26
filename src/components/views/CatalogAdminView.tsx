import React, { useMemo, useState } from 'react';
import {
  Edit3,
  Eye,
  EyeOff,
  Images,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Store,
  Trash2,
} from 'lucide-react';
import {
  ORDER_CATEGORIES,
  type CatalogProduct,
  type OrderCategory,
  formatRupiah,
  getCatalogProductImages,
} from '../../types';
import { CatalogProductModal } from '../CatalogProductModal';

interface CatalogAdminViewProps {
  products: CatalogProduct[];
  onCreate: (payload: Omit<CatalogProduct, 'id' | 'ownerId'>) => Promise<string>;
  onUpdate: (id: string, payload: Omit<CatalogProduct, 'id' | 'ownerId'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSeedDefaults: () => Promise<void>;
  onPreviewStorefront: () => void;
}

export function CatalogAdminView({
  products,
  onCreate,
  onUpdate,
  onDelete,
  onSeedDefaults,
  onPreviewStorefront,
}: CatalogAdminViewProps) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<'Semua' | OrderCategory>('Semua');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [seeding, setSeeding] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat = catFilter === 'Semua' || p.category === catFilter;
      const matchesQ =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.badge || '').toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [products, search, catFilter]);

  const activeCount = products.filter((p) => p.isActive).length;
  const promoCount = products.filter(
    (p) => (p.originalPrice || 0) > p.price || Boolean(p.badge)
  ).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7]">
            Katalog Produk Beranda
          </h2>
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            Edit foto produk (bisa lebih dari 1 foto per produk), nama, dan harga untuk tampil di Beranda Toko.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPreviewStorefront}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#233126] dark:text-[#F8FAF7] btn-3d-secondary cursor-pointer"
          >
            <Store className="w-3.5 h-3.5 text-accent-fg" />
            <span>Buka Beranda Toko</span>
          </button>

          {products.length === 0 && (
            <button
              type="button"
              disabled={seeding}
              onClick={async () => {
                setSeeding(true);
                try {
                  await onSeedDefaults();
                } finally {
                  setSeeding(false);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#556257] dark:text-[#D4DFD6] btn-3d-secondary cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
              <span>Isi Katalog Contoh</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold btn-3d-primary cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/88 dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">Total Produk Katalog</p>
          <p className="font-mono font-bold text-2xl text-[#233126] dark:text-[#F8FAF7] mt-1 tabular-nums">
            {products.length}
          </p>
        </div>
        <div className="bg-white/88 dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">Tayang di Beranda</p>
          <p className="font-mono font-bold text-2xl text-accent-fg mt-1 tabular-nums">
            {activeCount}
          </p>
        </div>
        <div className="bg-white/88 dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d">
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">Produk Promo / Badge</p>
          <p className="font-mono font-bold text-2xl text-[#C46F79] dark:text-[#F4B4BC] mt-1 tabular-nums">
            {promoCount}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7D877E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk katalog atau label promo..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/90 dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value as 'Semua' | OrderCategory)}
          className="px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent cursor-pointer"
        >
          <option value="Semua">Semua Kategori</option>
          {ORDER_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white/88 dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-10 text-center surface-3d space-y-3">
          <Sparkles className="w-8 h-8 text-accent-fg mx-auto" />
          <p className="font-display font-semibold text-sm text-[#233126] dark:text-[#F8FAF7]">
            Belum ada produk yang cocok
          </p>
          <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
            Tambahkan produk jualan agar pelanggan dapat memilih dan memesan langsung dari Beranda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const images = getCatalogProductImages(item);
            return (
              <div
                key={item.id}
                className="bg-white/88 dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-4 surface-3d flex flex-col justify-between gap-3"
              >
                <div className="flex gap-3.5">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] shrink-0">
                    <img src={images[0]} alt={item.title} className="w-full h-full object-cover" />
                    {item.badge && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-accent text-white text-[9px] font-bold">
                        {item.badge}
                      </span>
                    )}
                    {images.length > 1 && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-semibold inline-flex items-center gap-0.5">
                        <Images className="w-2.5 h-2.5" />
                        {images.length}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-accent-fg truncate">
                        {item.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.isActive
                            ? 'bg-accent-soft text-accent-fg'
                            : 'bg-[#F4EFE6] dark:bg-[#222C24] text-[#7D877E] dark:text-[#BCC8BF]'
                        }`}
                      >
                        {item.isActive ? 'Aktif' : 'Tersembunyi'}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-sm text-[#233126] dark:text-[#F8FAF7] line-clamp-2">
                      {item.title}
                    </h3>

                    <div className="flex items-baseline gap-2">
                      <span className="font-mono font-bold text-sm text-[#233126] dark:text-[#F8FAF7]">
                        {formatRupiah(item.price)}
                      </span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="font-mono text-[11px] text-[#8E968F] line-through">
                          {formatRupiah(item.originalPrice)}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] flex items-center gap-1">
                      <Star className="w-3 h-3 text-[#D49B35] fill-current" />
                      <span>
                        {item.rating.toFixed(1)} · {item.soldCount} terjual · {images.length} foto
                      </span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EFEAE1] dark:border-[#344639] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void onUpdate(item.id, {
                        ...item,
                        isActive: !item.isActive,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-[11px] font-medium text-[#556257] dark:text-[#D4DFD6] cursor-pointer"
                  >
                    {item.isActive ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Sembunyikan</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-accent-fg" />
                        <span>Tampilkan</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(item);
                        setModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-[11px] font-medium text-[#233126] dark:text-[#F8FAF7] hover:text-accent-fg cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(item.id)}
                      className="p-2 rounded-lg bg-[#FDF4F5] dark:bg-[#D88C94]/15 border border-[#F2CFD3] dark:border-[#D88C94]/30 text-[#B85D68] dark:text-[#F4B4BC] cursor-pointer"
                      aria-label="Hapus produk"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CatalogProductModal
        open={modalOpen}
        editingProduct={editing}
        onClose={() => setModalOpen(false)}
        onSave={async (payload) => {
          if (editing) {
            await onUpdate(editing.id, payload);
          } else {
            await onCreate(payload);
          }
        }}
      />
    </div>
  );
}
