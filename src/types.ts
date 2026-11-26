export type NavSection =
  | 'dashboard'
  | 'katalog'
  | 'pesanan'
  | 'pelanggan'
  | 'pemasukan'
  | 'pengeluaran'
  | 'modal_produksi'
  | 'stok_bahan'
  | 'invoice'
  | 'kalender'
  | 'laporan'
  | 'pengaturan';

export type OrderCategory =
  | 'Buket Bunga'
  | 'Hantaran Lamaran'
  | 'Buket Uang & Snack'
  | 'Hampers Musiman'
  | 'Dekorasi & Custom';

export type PaymentStatus = 'Lunas' | 'DP' | 'Belum Bayar';
export type OrderStatus = 'Selesai' | 'Diproses' | 'Menunggu' | 'Dibatalkan';
export type CustomerSegment = 'Reguler' | 'VIP' | 'Korporat' | 'Reseller';
export type TransactionType = 'pemasukan' | 'pengeluaran';
export type PaymentMethod = 'Transfer Bank' | 'QRIS' | 'Tunai' | 'E-Wallet';
export type MaterialCategory =
  | 'Bunga Segar'
  | 'Bunga Kering'
  | 'Kertas Wrapping'
  | 'Pita & Aksesori'
  | 'Box & Keranjang'
  | 'Lainnya';

export const ORDER_CATEGORIES: OrderCategory[] = [
  'Buket Bunga',
  'Hantaran Lamaran',
  'Buket Uang & Snack',
  'Hampers Musiman',
  'Dekorasi & Custom',
];

export const PAYMENT_STATUSES: PaymentStatus[] = ['Lunas', 'DP', 'Belum Bayar'];
export const ORDER_STATUSES: OrderStatus[] = ['Selesai', 'Diproses', 'Menunggu', 'Dibatalkan'];
export const CUSTOMER_SEGMENTS: CustomerSegment[] = ['Reguler', 'VIP', 'Korporat', 'Reseller'];
export const PAYMENT_METHODS: PaymentMethod[] = ['Transfer Bank', 'QRIS', 'Tunai', 'E-Wallet'];
export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  'Bunga Segar',
  'Bunga Kering',
  'Kertas Wrapping',
  'Pita & Aksesori',
  'Box & Keranjang',
  'Lainnya',
];

export type ColorPalette = 'sage' | 'rose' | 'gold' | 'lavender' | 'ocean' | 'custom';

export interface CustomPaletteColors {
  primaryHex: string;
  secondaryHex: string;
  backdropHex: string;
}

export const DEFAULT_CUSTOM_COLORS: CustomPaletteColors = {
  primaryHex: '#6C8469',
  secondaryHex: '#C69C4D',
  backdropHex: '#D88C94',
};

export interface PaletteOption {
  id: Exclude<ColorPalette, 'custom'>;
  name: string;
  description: string;
  primaryHex: string;
  hoverHex: string;
  secondaryHex: string;
  swatches: [string, string, string];
}

export const COLOR_PALETTES: PaletteOption[] = [
  {
    id: 'sage',
    name: 'Sage Botanical',
    description: 'Hijau sage alami, krem lembut & aksen emas hangat.',
    primaryHex: '#5F7D63',
    hoverHex: '#4C6750',
    secondaryHex: '#C69C4D',
    swatches: ['#5F7D63', '#C69C4D', '#D88C94'],
  },
  {
    id: 'rose',
    name: 'Rose Peony',
    description: 'Merah muda peony elegan dengan sentuhan champagne.',
    primaryHex: '#B86B77',
    hoverHex: '#9E5561',
    secondaryHex: '#C69C4D',
    swatches: ['#B86B77', '#E6B2BA', '#C69C4D'],
  },
  {
    id: 'gold',
    name: 'Champagne Gold',
    description: 'Emas champagne mewah berpadu nuansa botani hangat.',
    primaryHex: '#A87E32',
    hoverHex: '#8C6725',
    secondaryHex: '#5F7D63',
    swatches: ['#A87E32', '#DDB568', '#5F7D63'],
  },
  {
    id: 'lavender',
    name: 'Lavender Mist',
    description: 'Ungu lavender tenang dengan sentuhan rose gold lembut.',
    primaryHex: '#746894',
    hoverHex: '#5E537C',
    secondaryHex: '#C48B9F',
    swatches: ['#746894', '#B7AED4', '#C48B9F'],
  },
  {
    id: 'ocean',
    name: 'Eucalyptus Teal',
    description: 'Biru kehijauan eucalyptus segar dan pasir krem.',
    primaryHex: '#48797D',
    hoverHex: '#386266',
    secondaryHex: '#C69C4D',
    swatches: ['#48797D', '#8CC0C4', '#C69C4D'],
  },
];

export interface StoreSettings {
  id: string;
  ownerId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  address: string;
  taxRate: number;
  invoicePrefix: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  monthlyTarget: number;
  profilePhotoUrl?: string;
  storeLogoUrl?: string;
}

export interface Customer {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  segment: CustomerSegment;
  notes: string;
}

export type DiscountType = 'none' | 'percent' | 'fixed';

export interface Order {
  id: string;
  ownerId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  productName: string;
  category: OrderCategory;
  quantity: number;
  unitPrice: number;
  productionCost: number;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  orderDate: string;
  dueDate: string;
  notes: string;
  imageKey: string;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
}

export interface Transaction {
  id: string;
  ownerId: string;
  type: TransactionType;
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  orderId: string;
  notes: string;
}

export interface Material {
  id: string;
  ownerId: string;
  name: string;
  category: MaterialCategory;
  unit: string;
  stock: number;
  minStock: number;
  unitCost: number;
  supplier: string;
}

export interface ProductionModal {
  id: string;
  ownerId: string;
  productName: string;
  category: OrderCategory;
  materialCost: number;
  packagingCost: number;
  laborCost: number;
  overheadCost: number;
  totalHpp: number;
  sellingPrice: number;
  notes: string;
}

export interface AppNotification {
  id: string;
  ownerId: string;
  title: string;
  message: string;
  type: 'pesanan' | 'pembayaran' | 'stok' | 'sistem';
  isRead: boolean;
  date: string;
}

export const ASSETS = {
  adminAvatar: '/src/assets/images/admin_owner_avatar_1795619529121.jpg',
  sidebarBouquet: '/src/assets/images/sidebar_bouquet_accent_1795619529971.jpg',
  buketMawar: '/src/assets/images/product_buket_mawar_1795619530659.jpg',
  hantaranLamaran: '/src/assets/images/product_hantaran_lamaran_1795619530753.jpg',
  buketUang: '/src/assets/images/product_buket_uang_1795619531371.jpg',
  hampersLebaran: '/src/assets/images/product_hampers_lebaran_1795619531904.jpg',
};

export function getProductImage(imageKey?: string, category?: OrderCategory): string {
  if (imageKey === 'buketMawar') return ASSETS.buketMawar;
  if (imageKey === 'hantaranLamaran') return ASSETS.hantaranLamaran;
  if (imageKey === 'buketUang') return ASSETS.buketUang;
  if (imageKey === 'hampersLebaran') return ASSETS.hampersLebaran;
  if (category === 'Hantaran Lamaran') return ASSETS.hantaranLamaran;
  if (category === 'Buket Uang & Snack') return ASSETS.buketUang;
  if (category === 'Hampers Musiman') return ASSETS.hampersLebaran;
  if (category === 'Dekorasi & Custom') return ASSETS.sidebarBouquet;
  return ASSETS.buketMawar;
}

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatCompactRupiah(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace('.0', '')}M`;
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace('.0', '')}Jt`;
  if (abs >= 1_000) return `${sign}Rp ${Math.round(abs / 1_000)}Rb`;
  return formatRupiah(amount);
}

export function formatDateId(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(baseISO: string, offsetDays: number): string {
  const [y, m, d] = baseISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + offsetDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export interface CatalogProduct {
  id: string;
  ownerId: string;
  title: string;
  category: OrderCategory;
  description: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  rating: number;
  soldCount: number;
  imageKey: string;
  imageUrl?: string;
  galleryImages?: string[];
  isActive: boolean;
  isFeatured: boolean;
}

export function getCatalogProductImages(product: Pick<CatalogProduct, 'imageUrl' | 'imageKey' | 'category' | 'galleryImages'>): string[] {
  const list: string[] = [];
  if (product.imageUrl?.trim()) {
    list.push(product.imageUrl.trim());
  }
  if (Array.isArray(product.galleryImages)) {
    for (const img of product.galleryImages) {
      const cleaned = (img || '').trim();
      if (cleaned && !list.includes(cleaned)) {
        list.push(cleaned);
      }
    }
  }
  if (list.length === 0) {
    list.push(getProductImage(product.imageKey, product.category));
  }
  return list.slice(0, 5);
}

export interface PublicStoreInfo {
  id: string;
  ownerId: string;
  storeName: string;
  tagline?: string;
  storeLogoUrl?: string;
  whatsappPhone?: string;
  address?: string;
}

export interface CartItem {
  product: CatalogProduct;
  quantity: number;
  selectedImageIndex?: number;
  selectedImageUrl?: string;
}

export const DEFAULT_CATALOG_PRODUCTS: Omit<CatalogProduct, 'ownerId'>[] = [
  {
    id: 'cat-1',
    title: 'Buket Mawar Blush & Eucalyptus',
    category: 'Buket Bunga',
    description: '12 tangkai mawar semi-Holland segar dengan eucalyptus dan wrapping Korea matte premium.',
    price: 550000,
    originalPrice: 650000,
    badge: 'Diskon 15%',
    rating: 4.9,
    soldCount: 148,
    imageKey: 'buketMawar',
    galleryImages: [ASSETS.buketMawar, ASSETS.sidebarBouquet],
    isActive: true,
    isFeatured: true,
  },
  {
    id: 'cat-2',
    title: 'Paket Hantaran Akrilik Gold (6 Box)',
    category: 'Hantaran Lamaran',
    description: 'Set lengkap 6 box akrilik frame emas dengan tata kain silk cream & bunga artificial premium.',
    price: 4250000,
    originalPrice: 4850000,
    badge: 'Terlaris',
    rating: 5.0,
    soldCount: 64,
    imageKey: 'hantaranLamaran',
    galleryImages: [ASSETS.hantaranLamaran, ASSETS.hampersLebaran, ASSETS.sidebarBouquet],
    isActive: true,
    isFeatured: true,
  },
  {
    id: 'cat-3',
    title: 'Buket Uang Kipas Pastel & Baby Breath',
    category: 'Buket Uang & Snack',
    description: 'Jasa rangkai uang kipas elegan lengkap dengan baby breath kering & pita satin gold.',
    price: 440000,
    originalPrice: 520000,
    badge: 'Diskon 15%',
    rating: 4.9,
    soldCount: 215,
    imageKey: 'buketUang',
    galleryImages: [ASSETS.buketUang, ASSETS.buketMawar],
    isActive: true,
    isFeatured: true,
  },
  {
    id: 'cat-4',
    title: 'Hampers Rotan Eksekutif & Madu',
    category: 'Hampers Musiman',
    description: 'Keranjang rotan oval berisi madu artisan, teh pilihan, kue kering premium, dan kartu segel emas.',
    price: 675000,
    originalPrice: 750000,
    badge: 'Hemat 10%',
    rating: 4.8,
    soldCount: 132,
    imageKey: 'hampersLebaran',
    galleryImages: [ASSETS.hampersLebaran, ASSETS.hantaranLamaran],
    isActive: true,
    isFeatured: true,
  },
  {
    id: 'cat-5',
    title: 'Standing Flower Sage Grand Opening',
    category: 'Dekorasi & Custom',
    description: 'Rangkaian bunga papan & standing flower tema sage cream untuk pembukaan toko atau acara resmi.',
    price: 1150000,
    originalPrice: 1350000,
    badge: 'Promo Baru',
    rating: 4.9,
    soldCount: 53,
    imageKey: 'sidebarBouquet',
    galleryImages: [ASSETS.sidebarBouquet, ASSETS.buketMawar],
    isActive: true,
    isFeatured: true,
  },
  {
    id: 'cat-6',
    title: 'Seserahan Box Velvet Sage Exclusive',
    category: 'Hantaran Lamaran',
    description: 'Box seserahan beludru warna sage dengan dekorasi floral lembut dan label nama pasangan.',
    price: 2950000,
    originalPrice: 3400000,
    badge: 'Hemat 13%',
    rating: 5.0,
    soldCount: 79,
    imageKey: 'hantaranLamaran',
    galleryImages: [ASSETS.hantaranLamaran, ASSETS.sidebarBouquet],
    isActive: true,
    isFeatured: false,
  },
  {
    id: 'cat-7',
    title: 'Buket Wisuda Pastel & Boneka',
    category: 'Buket Bunga',
    description: 'Kombinasi mawar pastel, bunga kering, dan wrapping lembut cocok untuk perayaan wisuda.',
    price: 325000,
    originalPrice: 380000,
    badge: 'Favorit',
    rating: 4.8,
    soldCount: 194,
    imageKey: 'buketMawar',
    galleryImages: [ASSETS.buketMawar, ASSETS.buketUang],
    isActive: true,
    isFeatured: false,
  },
  {
    id: 'cat-8',
    title: 'Buket Snack & Cokelat Premium',
    category: 'Buket Uang & Snack',
    description: 'Buket camilan cokelat pilihan dengan wrapping kokoh dan kartu ucapan gratis.',
    price: 245000,
    originalPrice: 290000,
    badge: 'Diskon 15%',
    rating: 4.8,
    soldCount: 162,
    imageKey: 'buketUang',
    galleryImages: [ASSETS.buketUang, ASSETS.hampersLebaran],
    isActive: true,
    isFeatured: false,
  },
];

// Validation limits synced verbatim with firebase-blueprint.json
export const LIMITS = {
  storeName: 120,
  ownerName: 120,
  phone: 40,
  address: 250,
  invoicePrefix: 20,
  bankName: 60,
  bankAccount: 60,
  bankHolder: 120,
  name: 120,
  email: 120,
  notes: 500,
  invoiceNumber: 50,
  productName: 160,
  title: 160,
  category: 80,
  materialName: 140,
  unit: 30,
  supplier: 120,
  profilePhotoUrl: 80000,
  storeLogoUrl: 80000,
  catalogDescription: 500,
  catalogBadge: 40,
  catalogImageUrl: 80000,
  catalogMaxGalleryImages: 5,
  tagline: 160,
};

