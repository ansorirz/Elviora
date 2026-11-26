import React, { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Sparkles, Star, Trash2, X } from 'lucide-react';
import {
  ASSETS,
  LIMITS,
  ORDER_CATEGORIES,
  type CatalogProduct,
  type OrderCategory,
  getCatalogProductImages,
} from '../types';

interface CatalogProductModalProps {
  open: boolean;
  editingProduct: CatalogProduct | null;
  onClose: () => void;
  onSave: (payload: Omit<CatalogProduct, 'id' | 'ownerId'>) => Promise<void>;
}

const IMAGE_PRESETS: { key: string; label: string; src: string }[] = [
  { key: 'buketMawar', label: 'Buket Mawar', src: ASSETS.buketMawar },
  { key: 'hantaranLamaran', label: 'Hantaran Lamaran', src: ASSETS.hantaranLamaran },
  { key: 'buketUang', label: 'Buket Uang', src: ASSETS.buketUang },
  { key: 'hampersLebaran', label: 'Hampers Rotan', src: ASSETS.hampersLebaran },
  { key: 'sidebarBouquet', label: 'Signature Sage', src: ASSETS.sidebarBouquet },
];

async function compressCatalogImage(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Gagal membaca gambar produk.'));
      el.src = objectUrl;
    });

    const maxSide = 520;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const width = Math.max(120, Math.round(img.width * scale));
    const height = Math.max(120, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas tidak tersedia.');
    ctx.drawImage(img, 0, 0, width, height);

    let dataUrl = canvas.toDataURL('image/webp', 0.78);
    if (dataUrl.length > 55000) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.68);
    }
    if (dataUrl.length > 72000) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.5);
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function CatalogProductModal({
  open,
  editingProduct,
  onClose,
  onSave,
}: CatalogProductModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<OrderCategory>('Buket Bunga');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(350000);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [badge, setBadge] = useState('Promo');
  const [rating, setRating] = useState(4.9);
  const [soldCount, setSoldCount] = useState(10);
  const [imageKey, setImageKey] = useState('buketMawar');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingUpload, setProcessingUpload] = useState(false);
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFormError('');
    if (editingProduct) {
      setTitle(editingProduct.title);
      setCategory(editingProduct.category);
      setDescription(editingProduct.description || '');
      setPrice(editingProduct.price);
      setOriginalPrice(editingProduct.originalPrice || 0);
      setBadge(editingProduct.badge || '');
      setRating(editingProduct.rating);
      setSoldCount(editingProduct.soldCount);
      setImageKey(editingProduct.imageKey || 'buketMawar');
      setGalleryImages(getCatalogProductImages(editingProduct));
      setIsActive(editingProduct.isActive);
      setIsFeatured(editingProduct.isFeatured);
    } else {
      setTitle('');
      setCategory('Buket Bunga');
      setDescription('');
      setPrice(350000);
      setOriginalPrice(420000);
      setBadge('Diskon 15%');
      setRating(4.9);
      setSoldCount(10);
      setImageKey('buketMawar');
      setGalleryImages([ASSETS.buketMawar]);
      setIsActive(true);
      setIsFeatured(true);
    }
  }, [open, editingProduct]);

  if (!open) return null;

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setFormError('');

    const remainingSlots = LIMITS.catalogMaxGalleryImages - galleryImages.length;
    if (remainingSlots <= 0) {
      setFormError(`Maksimal ${LIMITS.catalogMaxGalleryImages} foto per produk.`);
      return;
    }

    const files = Array.from(fileList).slice(0, remainingSlots);
    setProcessingUpload(true);
    try {
      const nextUrls: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setFormError('Pilih file gambar JPG, PNG, atau WebP.');
          continue;
        }
        const compressed = await compressCatalogImage(file);
        nextUrls.push(compressed);
      }
      if (nextUrls.length > 0) {
        setGalleryImages((prev) => {
          const combined = [...prev];
          for (const url of nextUrls) {
            if (!combined.includes(url) && combined.length < LIMITS.catalogMaxGalleryImages) {
              combined.push(url);
            }
          }
          return combined;
        });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal memproses gambar.');
    } finally {
      setProcessingUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddPreset = (presetSrc: string, presetKey: string) => {
    setFormError('');
    if (galleryImages.includes(presetSrc)) {
      // Move existing preset to primary or keep
      return;
    }
    if (galleryImages.length >= LIMITS.catalogMaxGalleryImages) {
      setFormError(`Maksimal ${LIMITS.catalogMaxGalleryImages} foto per produk.`);
      return;
    }
    setImageKey(presetKey);
    setGalleryImages((prev) => [...prev, presetSrc]);
  };

  const handleSetPrimary = (index: number) => {
    setGalleryImages((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const copy = [...prev];
      const [chosen] = copy.splice(index, 1);
      return [chosen, ...copy];
    });
  };

  const handleRemoveImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const cleanedGallery = galleryImages.slice(0, LIMITS.catalogMaxGalleryImages);
      await onSave({
        title,
        category,
        description,
        price,
        originalPrice,
        badge,
        rating,
        soldCount,
        imageKey,
        imageUrl: cleanedGallery[0] || '',
        galleryImages: cleanedGallery,
        isActive,
        isFeatured,
      });
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan produk katalog.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18221B]/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-[#16201A] rounded-3xl border border-[#EAE4DA] dark:border-[#344639] surface-3d overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#EFEAE1] dark:border-[#344639] flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-[#233126] dark:text-[#F8FAF7]">
              {editingProduct ? 'Edit Produk Beranda Toko' : 'Tambah Produk Beranda Toko'}
            </h3>
            <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
              Atur nama produk, harga jual, serta hingga 5 foto/gambar produk untuk dilihat pelanggan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal produk"
            className="p-1.5 rounded-xl text-[#616E63] dark:text-[#BCC8BF] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Nama Produk
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Buket Mawar Blush & Eucalyptus"
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
                {ORDER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Label Promo / Badge
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Contoh: Diskon 15% / Terlaris"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Harga Produk (Rp)
              </label>
              <input
                type="number"
                min={0}
                required
                value={price}
                onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
                className={`${inputCls} font-mono`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Harga Coret / Sebelum Diskon (Opsional)
              </label>
              <input
                type="number"
                min={0}
                value={originalPrice}
                onChange={(e) => setOriginalPrice(Math.max(0, Number(e.target.value) || 0))}
                className={`${inputCls} font-mono`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Rating (0 - 5)
              </label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={rating}
                onChange={(e) =>
                  setRating(Math.min(5, Math.max(0, Number(e.target.value) || 5)))
                }
                className={`${inputCls} font-mono`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Jumlah Terjual
              </label>
              <input
                type="number"
                min={0}
                value={soldCount}
                onChange={(e) => setSoldCount(Math.max(0, Number(e.target.value) || 0))}
                className={`${inputCls} font-mono`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                Deskripsi Singkat
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan isi rangkaian, jumlah tangkai, atau ukuran box..."
                className={inputCls}
              />
            </div>

            {/* Multi-Image Gallery Manager */}
            <div className="sm:col-span-2 space-y-3 rounded-2xl bg-[#FAF8F4] dark:bg-[#1C2720] border border-[#EAE4DA] dark:border-[#344639] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#233126] dark:text-[#F8FAF7]">
                    Galeri Foto / Gambar Produk ({galleryImages.length}/{LIMITS.catalogMaxGalleryImages})
                  </label>
                  <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
                    Tambahkan lebih dari 1 foto agar pelanggan bisa melihat detail produk dari berbagai sisi.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    processingUpload || galleryImages.length >= LIMITS.catalogMaxGalleryImages
                  }
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-semibold btn-3d-primary cursor-pointer disabled:opacity-50"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>{processingUpload ? 'Memproses...' : 'Unggah Foto (Bisa Banyak)'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void handleUploadFiles(e.target.files)}
                  className="hidden"
                />
              </div>

              {galleryImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {galleryImages.map((src, idx) => (
                    <div
                      key={`${idx}-${src.slice(0, 24)}`}
                      className={`relative rounded-xl overflow-hidden border-2 bg-white dark:bg-[#16201A] ${
                        idx === 0
                          ? 'border-accent'
                          : 'border-[#EAE4DA] dark:border-[#344639]'
                      }`}
                    >
                      <div className="aspect-square">
                        <img
                          src={src}
                          alt={`Foto produk ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {idx === 0 ? (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-accent text-white text-[9px] font-bold inline-flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Utama
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(idx)}
                          title="Jadikan foto utama"
                          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/65 text-white text-[9px] font-medium hover:bg-black/85 cursor-pointer"
                        >
                          Utama
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        aria-label={`Hapus foto ${idx + 1}`}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-[#B85D68] text-white flex items-center justify-center hover:brightness-95 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                  Belum ada foto terpilih. Unggah foto atau pilih dari preset di bawah.
                </div>
              )}

              <div className="pt-2 border-t border-[#EAE4DA]/80 dark:border-[#344639]">
                <p className="text-[11px] font-medium text-[#556257] dark:text-[#D4DFD6] mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-accent-fg" />
                  <span>Tambah Cepat dari Foto Studio Elviora:</span>
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {IMAGE_PRESETS.map((preset) => {
                    const added = galleryImages.includes(preset.src);
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handleAddPreset(preset.src, preset.key)}
                        className={`p-1.5 rounded-xl border text-center cursor-pointer transition-all ${
                          added
                            ? 'border-accent bg-accent-soft opacity-80'
                            : 'border-[#EAE4DA] dark:border-[#344639] bg-white dark:bg-[#16201A] hover:border-accent'
                        }`}
                      >
                        <img
                          src={preset.src}
                          alt={preset.label}
                          className="w-full aspect-square rounded-lg object-cover mb-1"
                        />
                        <p className="text-[10px] truncate text-[#556257] dark:text-[#D4DFD6]">
                          {added ? '✓ ' : '+ '}
                          {preset.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-[#233126] dark:text-[#F8FAF7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-[#EAE4DA]"
                />
                <span>Tampilkan di Beranda Toko</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs text-[#233126] dark:text-[#F8FAF7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded border-[#EAE4DA]"
                />
                <span>Prioritaskan di Bagian Atas</span>
              </label>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-[#B85D68] dark:text-[#F4B4BC] bg-[#FDF4F5] dark:bg-[#D88C94]/15 rounded-xl px-3.5 py-2.5">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EFEAE1] dark:border-[#344639]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#556257] dark:text-[#D4DFD6] btn-3d-secondary cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || processingUpload}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs font-semibold btn-3d-primary cursor-pointer disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Produk'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
