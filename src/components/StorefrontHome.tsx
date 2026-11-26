import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit3,
  Flower2,
  Gift,
  Heart,
  Images,
  LayoutGrid,
  Lock,
  MapPin,
  MessageCircle,
  Minus,
  Moon,
  Percent,
  Phone,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Sun,
  Tag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  ASSETS,
  ORDER_CATEGORIES,
  type CartItem,
  type CatalogProduct,
  type OrderCategory,
  type PublicStoreInfo,
  formatRupiah,
  getCatalogProductImages,
} from '../types';
import { normalizeWhatsAppPhone } from '../utils/whatsappUtils';
import {
  buildStorefrontOrderMessage,
  buildStorefrontWhatsAppUrl,
  canShareFilesWithNavigator,
  copyImageBlobToClipboard,
  downloadOrderCardPng,
  generateOrderCardPngBlob,
  getCartEntryImageInfo,
  shareOrderWithImageFile,
} from '../utils/whatsappOrderShare';
import { BrandLogo } from './BrandLogo';
import { AmbientBackdrop } from './AmbientBackdrop';
import { CatalogProductModal } from './CatalogProductModal';

export type StorefrontTab = 'beranda' | 'katalog' | 'promo' | 'kategori' | 'tentang' | 'detail';
type SortOption = 'popular' | 'price_asc' | 'price_desc' | 'rating';

interface StorefrontHomeProps {
  products: CatalogProduct[];
  storeInfo: PublicStoreInfo | null;
  theme: 'light' | 'dark';
  onToggleTheme: (next: 'light' | 'dark') => void;
  onOpenAdminGate: () => void;
  isAdminUnlocked?: boolean;
  onReturnToAdminDashboard?: () => void;
  onAdminCreateProduct?: (payload: Omit<CatalogProduct, 'id' | 'ownerId'>) => Promise<string>;
  onAdminUpdateProduct?: (id: string, payload: Omit<CatalogProduct, 'id' | 'ownerId'>) => Promise<void>;
  onAdminDeleteProduct?: (id: string) => Promise<void>;
}

const HERO_SLIDES = [
  {
    eyebrow: 'Koleksi Signature Elviora',
    titlePrefix: 'Buket & Hantaran untuk',
    titleAccent: 'Momen Terbaik',
    subtitle:
      'Rangkaian bunga segar semi-Holland, seserahan akrilik elegan, buket uang, dan hampers pilihan dengan pengerjaan detail & pengiriman tepat waktu.',
    promoTop: 'HEMAT HINGGA',
    promoBig: '20%',
    promoSub: 'PROMO',
    image: ASSETS.buketMawar,
    category: 'Buket Bunga' as OrderCategory,
  },
  {
    eyebrow: 'Spesial Lamaran & Pernikahan',
    titlePrefix: 'Hantaran Seserahan',
    titleAccent: 'Akrilik & Velvet',
    subtitle:
      'Penataan hantaran eksklusif bertema sage cream & champagne gold, lengkap dengan kartu ucapan dan bunga artificial premium.',
    promoTop: 'PAKET',
    promoBig: '6 BOX',
    promoSub: 'EKSKLUSIF',
    image: ASSETS.hantaranLamaran,
    category: 'Hantaran Lamaran' as OrderCategory,
  },
  {
    eyebrow: 'Bingkisan Korporat & Hari Raya',
    titlePrefix: 'Hampers Rotan &',
    titleAccent: 'Hadiah Berkesan',
    subtitle:
      'Kado artisan untuk rekan bisnis, keluarga, wisuda, hingga ulang tahun dengan kemasan aman dan sentuhan pita satin.',
    promoTop: 'DISKON',
    promoBig: '15%',
    promoSub: 'MUSIMAN',
    image: ASSETS.hampersLebaran,
    category: 'Hampers Musiman' as OrderCategory,
  },
];

const CATEGORY_CARDS: {
  id: OrderCategory;
  label: string;
  description: string;
  image: string;
}[] = [
  {
    id: 'Buket Bunga',
    label: 'Buket Bunga',
    description: 'Mawar semi-Holland segar, bunga kering, dan wrapping Korea premium.',
    image: ASSETS.buketMawar,
  },
  {
    id: 'Hantaran Lamaran',
    label: 'Hantaran Lamaran',
    description: 'Box seserahan akrilik gold & velvet untuk acara lamaran dan pernikahan.',
    image: ASSETS.hantaranLamaran,
  },
  {
    id: 'Buket Uang & Snack',
    label: 'Buket Uang & Snack',
    description: 'Rangkaian uang kipas rapi tanpa merusak lembar uang & buket camilan.',
    image: ASSETS.buketUang,
  },
  {
    id: 'Hampers Musiman',
    label: 'Hampers Musiman',
    description: 'Keranjang rotan eksklusif berisi madu, kue kering, dan kartu segel.',
    image: ASSETS.hampersLebaran,
  },
  {
    id: 'Dekorasi & Custom',
    label: 'Dekorasi & Custom',
    description: 'Standing flower grand opening & pesanan custom warna sesuai tema acara.',
    image: ASSETS.sidebarBouquet,
  },
];

const PROMO_CARDS: {
  title: string;
  subtitle: string;
  accentBg: string;
  category: OrderCategory;
  image: string;
}[] = [
  {
    title: 'Diskon Paket Lamaran',
    subtitle: 'Seserahan akrilik & velvet rapi',
    accentBg: 'from-[#F9E5E7] to-[#FDF4F5] dark:from-[#3A2528] dark:to-[#221A1C]',
    category: 'Hantaran Lamaran',
    image: ASSETS.hantaranLamaran,
  },
  {
    title: 'Buket Bunga Segar',
    subtitle: 'Untuk wisuda, ultah & kejutan',
    accentBg: 'from-[#E1EAE2] to-[#F1F5F1] dark:from-[#213325] dark:to-[#18231B]',
    category: 'Buket Bunga',
    image: ASSETS.buketMawar,
  },
  {
    title: 'Buket Uang & Snack',
    subtitle: 'Rangkai rapi tanpa merusak uang',
    accentBg: 'from-[#E6F1F2] to-[#F3F9FA] dark:from-[#1E2F31] dark:to-[#162223]',
    category: 'Buket Uang & Snack',
    image: ASSETS.buketUang,
  },
  {
    title: 'Paket Hampers Spesial',
    subtitle: 'Bingkisan rotan & kartu segel',
    accentBg: 'from-[#F5EBD0] to-[#FBF7EC] dark:from-[#352C1B] dark:to-[#221D14]',
    category: 'Hampers Musiman',
    image: ASSETS.hampersLebaran,
  },
];

const OCCASIONS: { label: string; sub: string; category: OrderCategory }[] = [
  { label: 'Lamaran & Nikah', sub: 'Seserahan Eksklusif', category: 'Hantaran Lamaran' },
  { label: 'Wisuda', sub: 'Buket Mawar & Snack', category: 'Buket Bunga' },
  { label: 'Ulang Tahun', sub: 'Hadiah & Ucapan', category: 'Buket Uang & Snack' },
  { label: 'Anniversary', sub: 'Rangkaian Romantis', category: 'Buket Bunga' },
  { label: 'Hari Raya', sub: 'Hampers Premium', category: 'Hampers Musiman' },
  { label: 'Grand Opening', sub: 'Standing Flower', category: 'Dekorasi & Custom' },
];

export function StorefrontHome({
  products,
  storeInfo,
  theme,
  onToggleTheme,
  onOpenAdminGate,
  isAdminUnlocked = false,
  onReturnToAdminDashboard,
  onAdminCreateProduct,
  onAdminUpdateProduct,
  onAdminDeleteProduct,
}: StorefrontHomeProps) {
  const [activeTab, setActiveTab] = useState<StorefrontTab>('beranda');
  const [previousTab, setPreviousTab] = useState<StorefrontTab>('katalog');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<OrderCategory | 'Semua'>('Semua');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    if (!categoryMenuOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(event.target as Node)
      ) {
        setCategoryMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [categoryMenuOpen]);

  // Per-card multi-image slide index
  const [cardImageIdxMap, setCardImageIdxMap] = useState<Record<string, number>>({});

  // Dedicated Product Detail View state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [detailImageIdx, setDetailImageIdx] = useState(0);
  const [detailQty, setDetailQty] = useState(1);

  // Admin inline storefront edit mode
  const [adminEditMode, setAdminEditMode] = useState(true);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);

  // Cart & WhatsApp states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [customConsultText, setCustomConsultText] = useState('');

  // Pre-rendered visual Order + Photo PNG card & status feedback
  const [cartCardBlob, setCartCardBlob] = useState<Blob | null>(null);
  const [cartCardPreviewUrl, setCartCardPreviewUrl] = useState<string | null>(null);
  const [detailCardBlob, setDetailCardBlob] = useState<Blob | null>(null);
  const [cartWaFeedback, setCartWaFeedback] = useState('');
  const [detailWaFeedback, setDetailWaFeedback] = useState('');
  const handledUrlDeepLinkRef = useRef(false);

  const storeName = storeInfo?.storeName || 'Elviora Jasa Buket & Hantaran';
  const shortBrand = storeName.toLowerCase().includes('elviora') ? 'Elviora' : storeName;
  const tagline = storeInfo?.tagline || 'Buket Bunga Segar, Hantaran Lamaran & Hampers Eksklusif';
  const waDigits = normalizeWhatsAppPhone(storeInfo?.whatsappPhone || '0812-8840-2310');
  const studioAddress = storeInfo?.address || 'Jl. Kemang Timur No. 42, Jakarta Selatan';
  const phoneDisplay = storeInfo?.whatsappPhone || '0812-8840-2310';

  const currentSlide = HERO_SLIDES[heroIdx % HERO_SLIDES.length];
  const canInlineEdit = Boolean(isAdminUnlocked && adminEditMode && onAdminUpdateProduct);

  const activeProducts = useMemo(() => {
    const base = isAdminUnlocked && adminEditMode ? products : products.filter((p) => p.isActive);
    return base;
  }, [products, isAdminUnlocked, adminEditMode]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = activeProducts.filter((item) => {
      if (activeTab === 'promo') {
        const isPromo =
          (typeof item.originalPrice === 'number' && item.originalPrice > item.price) ||
          Boolean(item.badge?.trim());
        if (!isPromo) return false;
      }
      const matchesCat = selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });

    const sorted = [...list];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating || b.soldCount - a.soldCount);
    } else {
      sorted.sort(
        (a, b) =>
          Number(b.isFeatured) - Number(a.isFeatured) ||
          b.soldCount - a.soldCount ||
          a.title.localeCompare(b.title, 'id')
      );
    }
    return sorted;
  }, [activeProducts, activeTab, searchQuery, selectedCategory, sortBy]);

  const promoProducts = useMemo(
    () =>
      activeProducts.filter(
        (item) =>
          (typeof item.originalPrice === 'number' && item.originalPrice > item.price) ||
          Boolean(item.badge?.trim())
      ),
    [activeProducts]
  );

  const selectedDetailProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  const relatedProducts = useMemo(() => {
    if (!selectedDetailProduct) return [];
    return activeProducts
      .filter(
        (p) =>
          p.id !== selectedDetailProduct.id &&
          (p.category === selectedDetailProduct.category || p.isFeatured)
      )
      .slice(0, 4);
  }, [activeProducts, selectedDetailProduct]);

  const cartCount = useMemo(
    () => cart.reduce((sum, entry) => sum + entry.quantity, 0),
    [cart]
  );
  const cartTotal = useMemo(
    () => cart.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0),
    [cart]
  );

  // Open deep-linked product & selected photo when ?produk=<id>&foto=<idx> is visited
  useEffect(() => {
    if (handledUrlDeepLinkRef.current || products.length === 0) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const productParam = params.get('produk');
    if (!productParam) return;
    const matched = products.find((p) => p.id === productParam);
    if (!matched) return;
    handledUrlDeepLinkRef.current = true;
    const fotoRaw = Number(params.get('foto') || '1');
    const imgs = getCatalogProductImages(matched);
    const safeIdx = Number.isFinite(fotoRaw) && fotoRaw >= 1
      ? Math.min(imgs.length - 1, Math.floor(fotoRaw) - 1)
      : 0;
    setSelectedProductId(matched.id);
    setDetailImageIdx(Math.max(0, safeIdx));
    setDetailQty(1);
    setActiveTab('detail');
  }, [products]);

  // Pre-generate Order + Selected Photo PNG card for Cart Drawer
  useEffect(() => {
    if (!cartOpen || cart.length === 0) {
      setCartCardBlob(null);
      setCartCardPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const blob = await generateOrderCardPngBlob(cart, {
        storeInfo,
        customerName,
        customerPhone,
        deliveryDate,
        orderNotes,
      });
      if (cancelled) return;
      setCartCardBlob(blob);
      setCartCardPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return blob ? URL.createObjectURL(blob) : null;
      });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cartOpen, cart, storeInfo, customerName, customerPhone, deliveryDate, orderNotes]);

  // Pre-generate Order + Selected Photo PNG card for Single Product Detail View
  useEffect(() => {
    if (activeTab !== 'detail' || !selectedDetailProduct) {
      setDetailCardBlob(null);
      return;
    }
    const imgs = getCatalogProductImages(selectedDetailProduct);
    const safeIdx = imgs.length > 0 ? detailImageIdx % imgs.length : 0;
    const singleItem: CartItem = {
      product: selectedDetailProduct,
      quantity: detailQty,
      selectedImageIndex: safeIdx,
      selectedImageUrl: imgs[safeIdx],
    };

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const blob = await generateOrderCardPngBlob([singleItem], { storeInfo });
      if (!cancelled) {
        setDetailCardBlob(blob);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, selectedDetailProduct, detailImageIdx, detailQty, storeInfo]);

  const switchTab = (nextTab: StorefrontTab, category?: OrderCategory | 'Semua') => {
    if (category !== undefined) {
      setSelectedCategory(category);
    }
    setCategoryMenuOpen(false);
    setActiveTab(nextTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openProductDetail = (product: CatalogProduct) => {
    if (activeTab !== 'detail') {
      setPreviousTab(activeTab);
    }
    const initialIdx = cardImageIdxMap[product.id] || 0;
    setSelectedProductId(product.id);
    setDetailImageIdx(initialIdx);
    setDetailQty(1);
    setDetailWaFeedback('');
    setActiveTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEditProductModal = (product: CatalogProduct) => {
    setEditingProduct(product);
    setEditorModalOpen(true);
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setEditorModalOpen(true);
  };

  const addToCart = (
    product: CatalogProduct,
    qty = 1,
    selectedImageIndex?: number,
    selectedImageUrl?: string
  ) => {
    const imgs = getCatalogProductImages(product);
    const fallbackIdx = (cardImageIdxMap[product.id] || 0) % imgs.length;
    const finalIdx =
      typeof selectedImageIndex === 'number' ? selectedImageIndex % imgs.length : fallbackIdx;
    const finalUrl = selectedImageUrl || imgs[finalIdx];

    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? {
                ...i,
                quantity: i.quantity + qty,
                selectedImageIndex: finalIdx,
                selectedImageUrl: finalUrl,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: qty,
          selectedImageIndex: finalIdx,
          selectedImageUrl: finalUrl,
        },
      ];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const cycleCartItemImage = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((entry) => {
        if (entry.product.id !== productId) return entry;
        const imgs = getCatalogProductImages(entry.product);
        if (imgs.length <= 1) return entry;
        const curr = entry.selectedImageIndex ?? 0;
        const nextIdx = (curr + delta + imgs.length) % imgs.length;
        return {
          ...entry,
          selectedImageIndex: nextIdx,
          selectedImageUrl: imgs[nextIdx],
        };
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const getQtyInCart = (productId: string) =>
    cart.find((i) => i.product.id === productId)?.quantity || 0;

  const cycleCardImage = (productId: string, total: number, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (total <= 1) return;
    setCardImageIdxMap((prev) => {
      const curr = prev[productId] || 0;
      return { ...prev, [productId]: (curr + delta + total) % total };
    });
  };

  const checkoutMessage = useMemo(
    () =>
      buildStorefrontOrderMessage(cart, {
        storeInfo,
        customerName,
        customerPhone,
        deliveryDate,
        orderNotes,
      }),
    [cart, storeInfo, customerName, customerPhone, deliveryDate, orderNotes]
  );

  const checkoutWhatsAppUrl = useMemo(
    () => buildStorefrontWhatsAppUrl(waDigits, checkoutMessage),
    [waDigits, checkoutMessage]
  );

  const canShareCartImage = useMemo(() => {
    if (!cartCardBlob) return false;
    return canShareFilesWithNavigator(
      new File([cartCardBlob], 'Pesanan-Elviora.png', { type: 'image/png' })
    );
  }, [cartCardBlob]);

  const canShareDetailImage = useMemo(() => {
    if (!detailCardBlob) return false;
    return canShareFilesWithNavigator(
      new File([detailCardBlob], 'Pesanan-Elviora.png', { type: 'image/png' })
    );
  }, [detailCardBlob]);

  const consultWhatsAppUrl = useMemo(() => {
    const msg = customConsultText.trim()
      ? `Halo Admin *${storeName}*, saya ingin konsultasi desain custom:\n"${customConsultText.trim()}"`
      : `Halo Admin *${storeName}*, saya ingin konsultasi pemesanan buket/hantaran custom.`;
    return buildStorefrontWhatsAppUrl(waDigits, msg);
  }, [customConsultText, storeName, waDigits]);

  const buildSingleProductWaPayload = (
    product: CatalogProduct,
    qty: number,
    selectedIdx: number
  ) => {
    const imgs = getCatalogProductImages(product);
    const safeIdx = imgs.length > 0 ? selectedIdx % imgs.length : 0;
    const singleItem: CartItem = {
      product,
      quantity: qty,
      selectedImageIndex: safeIdx,
      selectedImageUrl: imgs[safeIdx],
    };
    const message = buildStorefrontOrderMessage([singleItem], { storeInfo });
    return {
      singleItem,
      message,
      url: buildStorefrontWhatsAppUrl(waDigits, message),
    };
  };

  const handleCopyAndShowCartFeedback = async () => {
    const blob =
      cartCardBlob ||
      (await generateOrderCardPngBlob(cart, {
        storeInfo,
        customerName,
        customerPhone,
        deliveryDate,
        orderNotes,
      }));
    const copied = await copyImageBlobToClipboard(blob);
    setCartWaFeedback(
      copied
        ? 'Rincian harga, link katalog & gambar pesanan disalin! Jika perlu, tempel (Ctrl+V) di chat WA Admin.'
        : 'Pesan WA dibuka dengan detail lengkap harga & link foto katalog pilihan Anda.'
    );
  };

  const handleCopyAndShowDetailFeedback = async (
    product: CatalogProduct,
    qty: number,
    selectedIdx: number
  ) => {
    const imgs = getCatalogProductImages(product);
    const safeIdx = imgs.length > 0 ? selectedIdx % imgs.length : 0;
    const blob =
      detailCardBlob ||
      (await generateOrderCardPngBlob(
        [
          {
            product,
            quantity: qty,
            selectedImageIndex: safeIdx,
            selectedImageUrl: imgs[safeIdx],
          },
        ],
        { storeInfo }
      ));
    const copied = await copyImageBlobToClipboard(blob);
    setDetailWaFeedback(
      copied
        ? 'Gambar produk & rincian harga sudah disalin! Tempel (Ctrl+V) di chat WA bila ingin langsung mengirim gambar.'
        : 'Detail produk, harga & link foto pilihan otomatis terisi di pesan WhatsApp.'
    );
  };

  const renderProductCard = (product: CatalogProduct) => {
    const images = getCatalogProductImages(product);
    const activeImgIdx = (cardImageIdxMap[product.id] || 0) % images.length;
    const activeImg = images[activeImgIdx];
    const qtyInCart = getQtyInCart(product.id);
    const hasDiscount =
      typeof product.originalPrice === 'number' && product.originalPrice > product.price;

    return (
      <article
        key={product.id}
        className={`group bg-white/92 dark:bg-[#16201A] rounded-2xl border p-3.5 surface-3d flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${
          !product.isActive
            ? 'border-dashed border-[#C46F79] opacity-75'
            : 'border-[#EAE4DA] dark:border-[#344639]'
        }`}
      >
        <div>
          {/* Multi-image container */}
          <div
            onClick={() => openProductDetail(product)}
            className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EFEAE1] dark:border-[#344639] mb-3 cursor-pointer"
          >
            <img
              src={activeImg}
              alt={`${product.title} - foto ${activeImgIdx + 1}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {product.badge && (
              <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-accent text-white text-[10px] font-bold shadow-xs">
                {product.badge}
              </span>
            )}

            {!product.isActive && (
              <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-[#B85D68] text-white text-[9px] font-bold">
                Disembunyikan
              </span>
            )}

            {/* Multi-image switcher controls & counter */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Foto sebelumnya"
                  onClick={(e) => cycleCardImage(product.id, images.length, -1, e)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/88 dark:bg-[#16201A]/90 text-[#233126] dark:text-white flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Foto berikutnya"
                  onClick={(e) => cycleCardImage(product.id, images.length, 1, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/88 dark:bg-[#16201A]/90 text-[#233126] dark:text-white flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="absolute bottom-2 inset-x-2 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-1 bg-black/55 backdrop-blur-xs px-2 py-1 rounded-full pointer-events-auto">
                    {images.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        type="button"
                        aria-label={`Lihat foto ${dotIdx + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardImageIdxMap((prev) => ({ ...prev, [product.id]: dotIdx }));
                        }}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          dotIdx === activeImgIdx ? 'w-3.5 bg-white' : 'w-1.5 bg-white/55'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-semibold inline-flex items-center gap-1">
                    <Images className="w-3 h-3" />
                    {activeImgIdx + 1}/{images.length}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Category & Title */}
          <p className="text-[11px] font-medium text-accent-fg mb-0.5">{product.category}</p>
          <button
            type="button"
            onClick={() => openProductDetail(product)}
            className="text-left font-display font-bold text-sm text-[#233126] dark:text-[#F8FAF7] hover:text-accent-fg line-clamp-2 leading-snug cursor-pointer"
          >
            {product.title}
          </button>

          {/* Rating & Sold */}
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
            <Star className="w-3.5 h-3.5 text-[#D49B35] fill-current" />
            <span className="font-semibold text-[#233126] dark:text-[#F8FAF7] tabular-nums">
              {product.rating.toFixed(1)}
            </span>
            <span className="tabular-nums">({product.soldCount} terjual)</span>
          </div>
        </div>

        {/* Price + Actions */}
        <div className="mt-3 pt-3 border-t border-[#EFEAE1] dark:border-[#344639] space-y-2.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono font-bold text-base text-[#233126] dark:text-[#F8FAF7] tabular-nums">
              {formatRupiah(product.price)}
            </span>
            {hasDiscount && (
              <span className="font-mono text-xs text-[#8E968F] dark:text-[#8E9E91] line-through tabular-nums">
                {formatRupiah(product.originalPrice!)}
              </span>
            )}
          </div>

          {canInlineEdit && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openEditProductModal(product)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FBF7EC] dark:bg-[#C69C4D]/20 border border-[#E6D4A6] dark:border-[#C69C4D]/40 text-[#8C6725] dark:text-[#F2CF88] text-[11px] font-semibold hover:brightness-95 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Foto / Nama / Harga</span>
              </button>
              {onAdminDeleteProduct && (
                <button
                  type="button"
                  onClick={() => void onAdminDeleteProduct(product.id)}
                  aria-label="Hapus produk"
                  className="p-1.5 rounded-xl bg-[#FDF4F5] dark:bg-[#D88C94]/15 border border-[#F2CFD3] dark:border-[#D88C94]/30 text-[#B85D68] dark:text-[#F4B4BC] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            {qtyInCart > 0 ? (
              <div className="flex-1 flex items-center justify-between gap-2 bg-accent-soft border border-accent-soft rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => updateCartQty(product.id, -1)}
                  aria-label="Kurangi jumlah"
                  className="w-7 h-7 rounded-lg bg-white dark:bg-[#1F2B23] text-[#233126] dark:text-[#F8FAF7] flex items-center justify-center cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-accent-fg tabular-nums">
                  {qtyInCart}
                </span>
                <button
                  type="button"
                  onClick={() => updateCartQty(product.id, 1)}
                  aria-label="Tambah jumlah"
                  className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => addToCart(product, 1, activeImgIdx, activeImg)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent-soft hover:bg-accent text-accent-fg hover:text-white border border-accent-soft text-xs font-semibold transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>+ Keranjang</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => openProductDetail(product)}
              className="px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-[#556257] dark:text-[#D4DFD6] hover:border-accent cursor-pointer"
            >
              Detail
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="relative min-h-screen text-[#233126] dark:text-[#F8FAF7] transition-colors flex flex-col">
      <AmbientBackdrop theme={theme} />

      {/* Admin Active Storefront Toolbar (visible only when Admin has unlocked portal) */}
      {isAdminUnlocked && (
        <div className="bg-[#18241C] text-white px-4 sm:px-6 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2.5 z-40 border-b border-[#2D4234]">
          <div className="flex items-center gap-2 min-w-0">
            <Store className="w-4 h-4 text-[#DDB568] shrink-0" />
            <span className="truncate font-medium">
              Mode Admin di Beranda Toko: Edit langsung Foto, Nama &amp; Harga produk.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAdminEditMode((p) => !p)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold cursor-pointer transition-colors ${
                adminEditMode
                  ? 'bg-[#DDB568] text-[#18241C]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{adminEditMode ? 'Mode Edit: Aktif' : 'Mode Edit: Nonaktif'}</span>
            </button>

            {onAdminCreateProduct && (
              <button
                type="button"
                onClick={openNewProductModal}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-accent text-white font-semibold cursor-pointer hover:brightness-110"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Produk</span>
              </button>
            )}

            {onReturnToAdminDashboard && (
              <button
                type="button"
                onClick={onReturnToAdminDashboard}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard Admin</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Header Bar */}
      <header className="sticky top-0 z-30 bg-white/92 dark:bg-[#121A15]/95 backdrop-blur-md border-b border-[#EAE4DA] dark:border-[#344639] transition-colors">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
          {/* Brand */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('Semua');
              setSearchQuery('');
              switchTab('beranda');
            }}
            className="flex items-center gap-2.5 text-left cursor-pointer shrink-0 group"
          >
            <BrandLogo
              logoUrl={storeInfo?.storeLogoUrl}
              alt={shortBrand}
              className="w-10 h-10 rounded-xl transition-transform group-hover:scale-105"
              iconClassName="w-5 h-5"
            />
            <div>
              <p className="font-display font-bold text-lg text-[#233126] dark:text-[#F8FAF7] leading-none">
                {shortBrand}
              </p>
              <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] mt-0.5">
                Buket &amp; Hantaran
              </p>
            </div>
          </button>

          {/* Search + Category Selector */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              switchTab('katalog');
            }}
            className="order-3 lg:order-2 w-full lg:flex-1 lg:max-w-xl flex items-center bg-[#FAF8F4] dark:bg-[#1C2720] border border-[#EAE4DA] dark:border-[#344639] rounded-xl overflow-hidden surface-3d-subtle"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari buket bunga, hantaran lamaran, hampers..."
              className="flex-1 min-w-0 px-3.5 py-2.5 bg-transparent text-xs text-[#233126] dark:text-[#F8FAF7] placeholder:text-[#8E968F] dark:placeholder:text-[#93A397] focus:outline-none"
            />
            <div className="hidden sm:flex items-center border-l border-[#EAE4DA] dark:border-[#344639]">
              <select
                aria-label="Filter kategori produk"
                value={selectedCategory}
                onChange={(e) => {
                  const next = e.target.value as OrderCategory | 'Semua';
                  setSelectedCategory(next);
                  switchTab('katalog', next);
                }}
                className="px-3 py-2.5 bg-transparent text-xs text-[#556257] dark:text-[#D4DFD6] focus:outline-none cursor-pointer"
              >
                <option value="Semua">Semua Kategori</option>
                {ORDER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              aria-label="Cari produk"
              className="px-4 py-2.5 bg-accent text-white hover:brightness-95 transition cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Right Controls */}
          <div className="order-2 lg:order-3 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleTheme(theme === 'light' ? 'dark' : 'light')}
              title={theme === 'light' ? 'Aktifkan Mode Gelap' : 'Aktifkan Mode Terang'}
              aria-label="Ganti tema terang atau gelap"
              className="w-9 h-9 rounded-xl bg-[#FAF8F4] dark:bg-[#1C2720] border border-[#EAE4DA] dark:border-[#344639] flex items-center justify-center text-[#556257] dark:text-[#D4DFD6] hover:text-[#233126] dark:hover:text-white btn-3d-secondary cursor-pointer"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1C2720] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#233126] dark:text-[#F8FAF7] btn-3d-secondary cursor-pointer"
            >
              <div className="relative">
                <ShoppingCart className="w-4 h-4 text-accent-fg" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#C46F79] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {cartCount}
                  </span>
                )}
              </div>
              <div className="hidden sm:block text-left leading-none">
                <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF]">Keranjang</p>
                <p className="text-[11px] font-mono font-semibold mt-0.5 tabular-nums">
                  {formatRupiah(cartTotal)}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={onOpenAdminGate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-semibold btn-3d-primary cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isAdminUnlocked ? 'Menu Admin' : 'Admin'}</span>
            </button>
          </div>
        </div>

        {/* 2. Accent Navigation Bar with Active Tab Indicators */}
        <div className="bg-accent text-white">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              {/* Category Mega-Popover (kept outside overflow-x-auto so it never triggers scrollbars or clipping) */}
              <div ref={categoryMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  aria-expanded={categoryMenuOpen}
                  aria-haspopup="true"
                  onClick={() => setCategoryMenuOpen((p) => !p)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    categoryMenuOpen || activeTab === 'kategori'
                      ? 'bg-white text-[#233126] shadow-xs'
                      : 'bg-black/15 hover:bg-black/25 text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                  <span>Pilih Kategori</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
                      categoryMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {categoryMenuOpen && (
                  <div className="absolute left-0 top-full mt-2.5 w-[min(92vw,360px)] bg-white dark:bg-[#16201A] text-[#233126] dark:text-[#F8FAF7] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] shadow-2xl p-2.5 z-50">
                    <div className="flex items-center justify-between px-2.5 py-1.5 mb-1">
                      <span className="text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF]">
                        Jelajahi Koleksi Studio
                      </span>
                      <button
                        type="button"
                        onClick={() => switchTab('kategori')}
                        className="text-[11px] font-semibold text-accent-fg hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Semua ({ORDER_CATEGORIES.length})</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      {CATEGORY_CARDS.map((cat) => {
                        const count = activeProducts.filter((p) => p.category === cat.id).length;
                        const isSelected = selectedCategory === cat.id && activeTab === 'katalog';
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => switchTab('katalog', cat.id)}
                            className={`w-full text-left px-2.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-3 ${
                              isSelected
                                ? 'bg-accent-soft text-accent-fg'
                                : 'hover:bg-[#FAF8F4] dark:hover:bg-[#222C24]'
                            }`}
                          >
                            <img
                              src={cat.image}
                              alt={cat.label}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-[#EAE4DA] dark:border-[#344639]"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7] truncate">
                                {cat.label}
                              </p>
                              <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] truncate">
                                {count} produk tersedia
                              </p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-accent-fg shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <nav className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto no-scrollbar min-w-0">
                {(
                  [
                    { id: 'beranda', label: 'Beranda' },
                    { id: 'katalog', label: 'Katalog Produk' },
                    { id: 'promo', label: 'Promo Spesial' },
                    { id: 'kategori', label: 'Kategori' },
                    { id: 'tentang', label: 'Konsultasi & Studio' },
                  ] as { id: StorefrontTab; label: string }[]
                ).map((tab) => {
                  const isActive =
                    activeTab === tab.id ||
                    (tab.id === 'katalog' && activeTab === 'detail');
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (tab.id === 'katalog') {
                          switchTab('katalog', 'Semua');
                        } else {
                          switchTab(tab.id);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-white/22 text-white font-semibold'
                          : 'text-white/85 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <a
              href={consultWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium bg-white/15 hover:bg-white/25 px-3 py-1 rounded-lg transition-colors shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WA Studio: {phoneDisplay}</span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ================= TAB 1: BERANDA ================= */}
        {activeTab === 'beranda' && (
          <>
            {/* Split Hero Banner */}
            <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-4">
              <div className="relative rounded-3xl bg-gradient-to-br from-[#F7F4ED] via-[#FFFFFF] to-[#EEF3EE] dark:from-[#16201A] dark:via-[#19251E] dark:to-[#121A15] border border-[#EAE4DA] dark:border-[#344639] surface-3d overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-6 px-6 sm:px-10 lg:px-14 pt-8 pb-6">
                  <div className="lg:col-span-6 space-y-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#222C24] border border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-accent-fg shadow-xs">
                      <Sparkles className="w-3 h-3" />
                      <span>{currentSlide.eyebrow}</span>
                    </span>

                    <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-[42px] text-[#233126] dark:text-[#F8FAF7] leading-[1.15]">
                      {currentSlide.titlePrefix}{' '}
                      <span className="text-accent-fg">{currentSlide.titleAccent}</span>
                    </h1>

                    <p className="text-xs sm:text-sm text-[#556257] dark:text-[#C5D1C7] max-w-lg leading-relaxed">
                      {currentSlide.subtitle}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => switchTab('katalog', currentSlide.category)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-xs sm:text-sm font-semibold btn-3d-primary cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Belanja Sekarang</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => switchTab('kategori')}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs sm:text-sm font-semibold text-[#233126] dark:text-[#F8FAF7] btn-3d-secondary cursor-pointer"
                      >
                        <span>Jelajahi Kategori</span>
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6 relative flex items-center justify-center">
                    <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white dark:border-[#344639] surface-3d">
                      <img
                        src={currentSlide.image}
                        alt={currentSlide.titleAccent}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </div>

                    <div className="absolute -top-2 sm:top-3 left-2 sm:left-8 w-24 h-24 rounded-full bg-accent text-white flex flex-col items-center justify-center text-center shadow-xl border-4 border-white dark:border-[#16201A] rotate-[-6deg]">
                      <span className="text-[9px] font-bold tracking-wider opacity-90">
                        {currentSlide.promoTop}
                      </span>
                      <span className="font-display font-extrabold text-xl leading-none my-0.5">
                        {currentSlide.promoBig}
                      </span>
                      <span className="text-[9px] font-bold tracking-wider opacity-90">
                        {currentSlide.promoSub}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Carousel Controls */}
                <button
                  type="button"
                  aria-label="Slide sebelumnya"
                  onClick={() =>
                    setHeroIdx((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
                  }
                  className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] items-center justify-center text-[#556257] dark:text-[#D4DFD6] hover:text-[#233126] shadow-sm cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Slide berikutnya"
                  onClick={() => setHeroIdx((prev) => (prev + 1) % HERO_SLIDES.length)}
                  className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] items-center justify-center text-[#556257] dark:text-[#D4DFD6] hover:text-[#233126] shadow-sm cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* 4 Trust Badges Strip */}
                <div className="border-t border-[#EAE4DA]/80 dark:border-[#344639] bg-white/70 dark:bg-[#141D17]/80 px-6 sm:px-10 py-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent-fg flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7]">
                        Pengiriman Aman
                      </p>
                      <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
                        Kurir khusus buket &amp; hantaran
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent-fg flex items-center justify-center shrink-0">
                      <Flower2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7]">
                        Bunga Segar Pilihan
                      </p>
                      <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
                        Dirangkai saat pesanan masuk
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent-fg flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7]">
                        Pembayaran Mudah
                      </p>
                      <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
                        Transfer bank, QRIS &amp; DP
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent-fg flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7]">
                        Layanan Cepat
                      </p>
                      <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
                        Konsultasi custom setiap hari
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Circular Categories Row */}
            <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="font-display font-bold text-lg sm:text-xl text-[#233126] dark:text-[#F8FAF7]">
                  Pilih Berdasarkan Kategori
                </h2>
                <button
                  type="button"
                  onClick={() => switchTab('kategori')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent-fg hover:underline cursor-pointer"
                >
                  <span>Lihat semua kategori</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {CATEGORY_CARDS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => switchTab('katalog', cat.id)}
                    className="group flex flex-col items-center text-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1.5 transition-all duration-200 border-2 border-[#EAE4DA] dark:border-[#344639] bg-white/90 dark:bg-[#16201A] group-hover:border-accent group-hover:scale-105 surface-3d-subtle flex items-center justify-center overflow-hidden">
                      <img
                        src={cat.image}
                        alt={cat.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    <span className="text-xs font-semibold leading-tight text-[#233126] dark:text-[#F8FAF7] group-hover:text-accent-fg">
                      {cat.label}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => switchTab('kategori')}
                  className="group flex flex-col items-center text-center gap-2.5 cursor-pointer"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1.5 transition-all duration-200 border-2 border-[#EAE4DA] dark:border-[#344639] bg-white/90 dark:bg-[#16201A] group-hover:border-accent group-hover:scale-105 surface-3d-subtle flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-accent-soft flex items-center justify-center text-accent-fg">
                      <LayoutGrid className="w-7 h-7" />
                    </div>
                  </div>
                  <span className="text-xs font-semibold leading-tight text-[#233126] dark:text-[#F8FAF7] group-hover:text-accent-fg">
                    Semua Kategori
                  </span>
                </button>
              </div>
            </section>

            {/* Penawaran Terbaik / Featured Products Grid */}
            <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-display font-bold text-lg sm:text-xl text-[#233126] dark:text-[#F8FAF7]">
                    Katalog &amp; Penawaran Terbaik
                  </h2>
                  <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF] mt-0.5">
                    Klik foto atau nama produk untuk melihat galeri lengkap &amp; detail rangkaian.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => switchTab('katalog', 'Semua')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent-fg hover:underline cursor-pointer"
                >
                  <span>Lihat semua produk ({activeProducts.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeProducts.slice(0, 8).map(renderProductCard)}
              </div>
            </section>

            {/* 5-Feature Benefit Strip */}
            <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="rounded-2xl bg-accent-soft border border-accent-soft px-5 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { icon: LayoutGrid, title: 'Pilihan Lengkap', sub: 'Buket, hantaran & hampers' },
                  { icon: Award, title: 'Kualitas Premium', sub: 'Material & bunga terbaik' },
                  { icon: Gift, title: 'Gratis Kartu Ucapan', sub: 'Tulis pesan sesuai permintaan' },
                  { icon: Truck, title: 'Kirim Tepat Waktu', sub: 'Jadwal fleksibel & aman' },
                  { icon: Heart, title: 'Pelanggan Puas', sub: 'Dipercaya ribuan momen' },
                ].map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <div key={feat.title} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] flex items-center justify-center text-accent-fg shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#233126] dark:text-[#F8FAF7] truncate">
                          {feat.title}
                        </p>
                        <p className="text-[11px] text-[#616E63] dark:text-[#BCC8BF] truncate">
                          {feat.sub}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 4-Column Promo Cards */}
            <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PROMO_CARDS.map((card) => (
                  <div
                    key={card.title}
                    className={`rounded-2xl bg-gradient-to-br ${card.accentBg} border border-[#EAE4DA] dark:border-[#344639] p-4 flex items-center justify-between gap-3 surface-3d-subtle`}
                  >
                    <div className="space-y-2 min-w-0">
                      <h3 className="font-display font-bold text-sm text-[#233126] dark:text-[#F8FAF7] leading-snug">
                        {card.title}
                      </h3>
                      <p className="text-[11px] text-[#556257] dark:text-[#BCC8BF]">
                        {card.subtitle}
                      </p>
                      <button
                        type="button"
                        onClick={() => switchTab('katalog', card.category)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-[#233126] dark:text-[#F8FAF7] hover:border-accent cursor-pointer"
                      >
                        <span>Lihat Produk</span>
                        <ArrowRight className="w-3 h-3 text-accent-fg" />
                      </button>
                    </div>
                    <img
                      src={card.image}
                      alt={card.title}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-xl object-cover shrink-0 border border-white/70 dark:border-[#344639] shadow-xs"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Occasions Strip */}
            <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <h2 className="font-display font-bold text-lg text-[#233126] dark:text-[#F8FAF7] mb-4">
                Cocok Untuk Berbagai Momen Spesial
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {OCCASIONS.map((occ) => (
                  <button
                    key={occ.label}
                    type="button"
                    onClick={() => switchTab('katalog', occ.category)}
                    className="p-4 rounded-2xl bg-white/88 dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] hover:border-accent text-center surface-3d-subtle transition-all cursor-pointer group"
                  >
                    <p className="font-display font-bold text-xs text-[#233126] dark:text-[#F8FAF7] group-hover:text-accent-fg">
                      {occ.label}
                    </p>
                    <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] mt-0.5">
                      {occ.sub}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {/* Consultation Banner */}
            <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
              <div className="rounded-3xl bg-[#1A2A20] dark:bg-[#111A14] text-white border border-[#2D4234] p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 surface-3d">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-6 h-6 text-[#DDB568]" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg sm:text-xl">
                      Pesan Desain Custom atau Konsultasi?
                    </h2>
                    <p className="text-xs text-[#C5D1C7] mt-1">
                      Tuliskan tema warna, nominal buket, atau tanggal acara Anda — langsung
                      terhubung ke WhatsApp studio.
                    </p>
                  </div>
                </div>

                <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    type="text"
                    value={customConsultText}
                    onChange={(e) => setCustomConsultText(e.target.value)}
                    placeholder="Contoh: Buket mawar pink untuk lamaran tgl 12..."
                    className="sm:w-80 px-4 py-3 rounded-xl bg-white text-[#233126] text-xs placeholder:text-[#7D877E] focus:outline-none"
                  />
                  <a
                    href={consultWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent text-white text-xs font-semibold hover:brightness-110 transition shrink-0"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Tanya via WhatsApp</span>
                  </a>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ================= TAB 2 & 3: KATALOG PRODUK / PROMO SPESIAL ================= */}
        {(activeTab === 'katalog' || activeTab === 'promo') && (
          <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Breadcrumb + Header Banner */}
            <div className="rounded-3xl bg-white/90 dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] p-6 surface-3d flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                  <button
                    type="button"
                    onClick={() => switchTab('beranda')}
                    className="hover:text-accent-fg cursor-pointer"
                  >
                    Beranda
                  </button>
                  <span>/</span>
                  <span className="font-semibold text-accent-fg">
                    {activeTab === 'promo' ? 'Promo Spesial' : 'Katalog Produk'}
                  </span>
                  {selectedCategory !== 'Semua' && (
                    <>
                      <span>/</span>
                      <span>{selectedCategory}</span>
                    </>
                  )}
                </div>

                <h1 className="font-display font-bold text-2xl text-[#233126] dark:text-[#F8FAF7] flex items-center gap-2">
                  {activeTab === 'promo' && <Percent className="w-5 h-5 text-accent-fg" />}
                  <span>
                    {activeTab === 'promo'
                      ? 'Penawaran Promo & Diskon Spesial'
                      : selectedCategory === 'Semua'
                        ? 'Semua Katalog Produk Elviora'
                        : `Kategori: ${selectedCategory}`}
                  </span>
                </h1>
                <p className="text-xs text-[#616E63] dark:text-[#BCC8BF]">
                  Menampilkan {filteredProducts.length} produk siap pesan. Klik produk untuk melihat
                  galeri foto lengkap.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  aria-label="Urutkan produk"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#233126] dark:text-[#F8FAF7] cursor-pointer"
                >
                  <option value="popular">Urutkan: Terpopuler</option>
                  <option value="price_asc">Harga: Termurah</option>
                  <option value="price_desc">Harga: Termahal</option>
                  <option value="rating">Rating Tertinggi</option>
                </select>

                {canInlineEdit && onAdminCreateProduct && (
                  <button
                    type="button"
                    onClick={openNewProductModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-semibold btn-3d-primary cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Produk</span>
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {(['Semua', ...ORDER_CATEGORIES] as const).map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'text-white btn-3d-primary'
                        : 'bg-white/90 dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-[#556257] dark:text-[#D4DFD6] hover:border-accent'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white/88 dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-12 text-center surface-3d space-y-3">
                <Flower2 className="w-8 h-8 text-accent-fg mx-auto" />
                <p className="font-display font-semibold text-sm text-[#233126] dark:text-[#F8FAF7]">
                  Belum ada produk pada filter ini
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Semua');
                    setSearchQuery('');
                    setActiveTab('katalog');
                  }}
                  className="px-4 py-2 rounded-xl text-white text-xs font-semibold btn-3d-primary cursor-pointer"
                >
                  Tampilkan Semua Produk
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map(renderProductCard)}
              </div>
            )}
          </section>
        )}

        {/* ================= TAB 4: SEMUA KATEGORI ================= */}
        {activeTab === 'kategori' && (
          <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#7D877E] dark:text-[#BCC8BF] mb-1">
                  <button
                    type="button"
                    onClick={() => switchTab('beranda')}
                    className="hover:text-accent-fg cursor-pointer"
                  >
                    Beranda
                  </button>
                  <span>/</span>
                  <span className="font-semibold text-accent-fg">Semua Kategori</span>
                </div>
                <h1 className="font-display font-bold text-2xl text-[#233126] dark:text-[#F8FAF7]">
                  Jelajahi Koleksi Berdasarkan Kategori
                </h1>
              </div>

              <button
                type="button"
                onClick={() => switchTab('promo')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-soft text-accent-fg text-xs font-semibold cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Lihat Promo ({promoProducts.length})</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {CATEGORY_CARDS.map((cat) => {
                const count = activeProducts.filter((p) => p.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => switchTab('katalog', cat.id)}
                    className="group text-left bg-white/92 dark:bg-[#16201A] rounded-3xl border border-[#EAE4DA] dark:border-[#344639] overflow-hidden surface-3d hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-[#FAF8F4] dark:bg-[#1F2B23]">
                      <img
                        src={cat.image}
                        alt={cat.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-display font-bold text-base text-[#233126] dark:text-[#F8FAF7] group-hover:text-accent-fg">
                            {cat.label}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-fg text-[11px] font-bold">
                            {count} produk
                          </span>
                        </div>
                        <p className="text-xs text-[#616E63] dark:text-[#BCC8BF] mt-1.5 leading-relaxed">
                          {cat.description}
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-fg">
                        <span>Buka Katalog {cat.label}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ================= TAB 5: KONSULTASI & TENTANG STUDIO ================= */}
        {activeTab === 'tentang' && (
          <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white/92 dark:bg-[#16201A] rounded-3xl border border-[#EAE4DA] dark:border-[#344639] p-6 sm:p-8 surface-3d space-y-5">
                <div className="flex items-center gap-2 text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                  <button
                    type="button"
                    onClick={() => switchTab('beranda')}
                    className="hover:text-accent-fg cursor-pointer"
                  >
                    Beranda
                  </button>
                  <span>/</span>
                  <span className="font-semibold text-accent-fg">Konsultasi &amp; Studio</span>
                </div>

                <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#233126] dark:text-[#F8FAF7]">
                  {storeName}
                </h1>
                <p className="text-sm text-[#556257] dark:text-[#D4DFD6] leading-relaxed">
                  {tagline}. Kami merangkai setiap buket bunga, hantaran lamaran, buket uang, dan
                  hampers secara personal sesuai warna favorit serta anggaran acara Anda.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-[#FAF8F4] dark:bg-[#1C2720] border border-[#EAE4DA] dark:border-[#344639] space-y-1">
                    <p className="text-xs font-bold text-accent-fg flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>Alamat Workshop</span>
                    </p>
                    <p className="text-xs text-[#233126] dark:text-[#F8FAF7] leading-relaxed">
                      {studioAddress}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF8F4] dark:bg-[#1C2720] border border-[#EAE4DA] dark:border-[#344639] space-y-1">
                    <p className="text-xs font-bold text-accent-fg flex items-center gap-1.5">
                      <Phone className="w-4 h-4" />
                      <span>WhatsApp &amp; Jam Layanan</span>
                    </p>
                    <p className="text-xs text-[#233126] dark:text-[#F8FAF7] font-mono">
                      {phoneDisplay}
                    </p>
                    <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
                      Setiap hari · 08.00 – 20.00 WIB
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <p className="font-display font-bold text-sm text-[#233126] dark:text-[#F8FAF7]">
                    Cara Pemesanan Mudah:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {[
                      '1. Pilih produk di Katalog atau isi konsultasi custom.',
                      '2. Tambahkan ke Keranjang & klik Pesan via WhatsApp.',
                      '3. Konfirmasi jadwal kirim & pembayaran (DP/Lunas).',
                    ].map((step) => (
                      <div
                        key={step}
                        className="p-3 rounded-xl bg-accent-soft border border-accent-soft text-[#233126] dark:text-[#F8FAF7] font-medium"
                      >
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#1A2A20] dark:bg-[#111A14] text-white rounded-3xl border border-[#2D4234] p-6 sm:p-8 surface-3d flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#DDB568] text-[11px] font-semibold">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Konsultasi Gratis</span>
                  </span>
                  <h2 className="font-display font-bold text-xl">
                    Kirim Request Desain Custom Langsung ke Admin
                  </h2>
                  <p className="text-xs text-[#C5D1C7] leading-relaxed">
                    Ingin menyesuaikan warna pita, jenis bunga, jumlah box seserahan, atau kartu
                    ucapan khusus? Tulis detailnya di bawah ini.
                  </p>
                </div>

                <div className="space-y-3">
                  <textarea
                    rows={4}
                    value={customConsultText}
                    onChange={(e) => setCustomConsultText(e.target.value)}
                    placeholder="Contoh: Halo Kak, saya mau pesan paket seserahan 5 box warna sage & gold untuk tanggal 20..."
                    className="w-full px-4 py-3 rounded-xl bg-white text-[#233126] text-xs placeholder:text-[#7D877E] focus:outline-none"
                  />
                  <a
                    href={consultWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent text-white text-xs font-semibold hover:brightness-110 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Hubungi via WhatsApp Sekarang</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= TAB 6: DETAIL PRODUK (MULTI-IMAGE GALLERY VIEW) ================= */}
        {activeTab === 'detail' && selectedDetailProduct && (
          <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                <button
                  type="button"
                  onClick={() => switchTab('beranda')}
                  className="hover:text-accent-fg cursor-pointer"
                >
                  Beranda
                </button>
                <span>/</span>
                <button
                  type="button"
                  onClick={() => switchTab('katalog', selectedDetailProduct.category)}
                  className="hover:text-accent-fg cursor-pointer"
                >
                  {selectedDetailProduct.category}
                </button>
                <span>/</span>
                <span className="font-semibold text-[#233126] dark:text-[#F8FAF7] truncate max-w-[200px] sm:max-w-xs">
                  {selectedDetailProduct.title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {canInlineEdit && (
                  <button
                    type="button"
                    onClick={() => openEditProductModal(selectedDetailProduct)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FBF7EC] dark:bg-[#C69C4D]/20 border border-[#E6D4A6] dark:border-[#C69C4D]/40 text-xs font-semibold text-[#8C6725] dark:text-[#F2CF88] cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Produk Ini</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    switchTab(previousTab === 'detail' ? 'katalog' : previousTab)
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-xs font-semibold text-[#233126] dark:text-[#F8FAF7] btn-3d-secondary cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
              </div>
            </div>

            {(() => {
              const images = getCatalogProductImages(selectedDetailProduct);
              const safeIdx = detailImageIdx % images.length;
              const hasDiscount =
                typeof selectedDetailProduct.originalPrice === 'number' &&
                selectedDetailProduct.originalPrice > selectedDetailProduct.price;
              const savings = hasDiscount
                ? selectedDetailProduct.originalPrice! - selectedDetailProduct.price
                : 0;

              return (
                <div className="bg-white/92 dark:bg-[#16201A] rounded-3xl border border-[#EAE4DA] dark:border-[#344639] p-5 sm:p-8 surface-3d grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left: Multi-Image Gallery Viewer */}
                  <div className="lg:col-span-6 space-y-3">
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639]">
                      <img
                        src={images[safeIdx]}
                        alt={`${selectedDetailProduct.title} - foto ${safeIdx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />

                      {selectedDetailProduct.badge && (
                        <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-xl bg-accent text-white text-xs font-bold shadow-sm">
                          {selectedDetailProduct.badge}
                        </span>
                      )}

                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            aria-label="Foto sebelumnya"
                            onClick={() =>
                              setDetailImageIdx((prev) => (prev - 1 + images.length) % images.length)
                            }
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-[#16201A]/90 text-[#233126] dark:text-white flex items-center justify-center shadow-md cursor-pointer"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Foto berikutnya"
                            onClick={() =>
                              setDetailImageIdx((prev) => (prev + 1) % images.length)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-[#16201A]/90 text-[#233126] dark:text-white flex items-center justify-center shadow-md cursor-pointer"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/65 text-white text-[11px] font-semibold">
                            Foto {safeIdx + 1} / {images.length}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Thumbnail Strip */}
                    {images.length > 1 && (
                      <div className="grid grid-cols-5 gap-2.5">
                        {images.map((src, idx) => (
                          <button
                            key={`${idx}-${src.slice(0, 20)}`}
                            type="button"
                            onClick={() => setDetailImageIdx(idx)}
                            className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                              idx === safeIdx
                                ? 'border-accent scale-[1.03] shadow-sm'
                                : 'border-[#EAE4DA] dark:border-[#344639] opacity-75 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={src}
                              alt={`Thumbnail ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Product Info & Actions */}
                  <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div>
                        <span className="inline-block px-3 py-1 rounded-lg bg-accent-soft text-accent-fg text-xs font-semibold">
                          {selectedDetailProduct.category}
                        </span>
                        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#233126] dark:text-[#F8FAF7] mt-2 leading-tight">
                          {selectedDetailProduct.title}
                        </h1>
                        <div className="flex items-center gap-2 mt-2 text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                          <Star className="w-4 h-4 text-[#D49B35] fill-current" />
                          <span className="font-bold text-[#233126] dark:text-[#F8FAF7]">
                            {selectedDetailProduct.rating.toFixed(1)}
                          </span>
                          <span>· {selectedDetailProduct.soldCount} pesanan selesai</span>
                          <span>· {images.length} foto tersedia</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#FAF8F4] dark:bg-[#1C2720] border border-[#EAE4DA] dark:border-[#344639] space-y-1">
                        <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Harga Jual</p>
                        <div className="flex items-baseline gap-3 flex-wrap">
                          <span className="font-mono font-extrabold text-2xl sm:text-3xl text-[#233126] dark:text-[#F8FAF7] tabular-nums">
                            {formatRupiah(selectedDetailProduct.price)}
                          </span>
                          {hasDiscount && (
                            <>
                              <span className="font-mono text-sm text-[#8E968F] line-through tabular-nums">
                                {formatRupiah(selectedDetailProduct.originalPrice!)}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-[#FDF4F5] dark:bg-[#D88C94]/20 text-[#B85D68] dark:text-[#F4B4BC] text-[11px] font-bold">
                                Hemat {formatRupiah(savings)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <h2 className="font-display font-bold text-xs uppercase tracking-wider text-[#7D877E] dark:text-[#BCC8BF] mb-1.5">
                          Deskripsi Rangkaian
                        </h2>
                        <p className="text-xs sm:text-sm text-[#556257] dark:text-[#D4DFD6] leading-relaxed">
                          {selectedDetailProduct.description ||
                            'Dirangkai rapi oleh florist profesional Elviora lengkap dengan kartu ucapan elegan dan kemasan aman.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-[#EFEAE1] dark:border-[#344639]">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-semibold text-[#556257] dark:text-[#D4DFD6]">
                          Jumlah:
                        </span>
                        <div className="inline-flex items-center gap-2 bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-[#16201A] flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold tabular-nums">
                            {detailQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDetailQty((q) => q + 1)}
                            className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-accent-soft border border-accent-soft flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={images[safeIdx]}
                            alt={`Foto pilihan ${safeIdx + 1}`}
                            className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/80 dark:border-[#344639]"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-accent-fg truncate">
                              Foto ke-{safeIdx + 1} Terpilih
                            </p>
                            <p className="text-[11px] text-[#556257] dark:text-[#C5D1C7] truncate">
                              Gambar &amp; rincian harga ({formatRupiah(selectedDetailProduct.price * detailQty)}) ikut terkirim saat konfirmasi WA
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(selectedDetailProduct, detailQty, safeIdx, images[safeIdx]);
                            setCartOpen(true);
                          }}
                          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white text-xs font-semibold btn-3d-primary cursor-pointer"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>Tambah ke Keranjang</span>
                        </button>

                        {(() => {
                          const singleWa = buildSingleProductWaPayload(
                            selectedDetailProduct,
                            detailQty,
                            safeIdx
                          );
                          return (
                            <a
                              href={singleWa.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                void handleCopyAndShowDetailFeedback(
                                  selectedDetailProduct,
                                  detailQty,
                                  safeIdx
                                );
                              }}
                              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-[#233126] dark:text-[#F8FAF7] text-xs font-semibold btn-3d-secondary"
                            >
                              <MessageCircle className="w-4 h-4 text-accent-fg" />
                              <span>Kirim Gambar &amp; Detail ke WA</span>
                            </a>
                          );
                        })()}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {canShareDetailImage && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!detailCardBlob) return;
                              const singleWa = buildSingleProductWaPayload(
                                selectedDetailProduct,
                                detailQty,
                                safeIdx
                              );
                              await shareOrderWithImageFile(
                                detailCardBlob,
                                singleWa.message,
                                `Elviora-${selectedDetailProduct.title.slice(0, 24)}.png`
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-[#233126] dark:text-[#F8FAF7] hover:border-accent cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5 text-accent-fg" />
                            <span>Bagikan File Gambar + Teks</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            const blob =
                              detailCardBlob ||
                              (await generateOrderCardPngBlob(
                                [
                                  {
                                    product: selectedDetailProduct,
                                    quantity: detailQty,
                                    selectedImageIndex: safeIdx,
                                    selectedImageUrl: images[safeIdx],
                                  },
                                ],
                                { storeInfo }
                              ));
                            if (blob) {
                              downloadOrderCardPng(
                                blob,
                                `Pesanan-${selectedDetailProduct.title.replace(/[^a-zA-Z0-9]+/g, '-')}.png`
                              );
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-[#556257] dark:text-[#D4DFD6] hover:border-accent cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-accent-fg" />
                          <span>Unduh Kartu Gambar &amp; Harga</span>
                        </button>
                      </div>

                      {detailWaFeedback && (
                        <p className="text-[11px] text-accent-fg bg-accent-soft border border-accent-soft rounded-xl px-3 py-2">
                          {detailWaFeedback}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {relatedProducts.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display font-bold text-lg text-[#233126] dark:text-[#F8FAF7]">
                  Produk Pilihan Lainnya
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {relatedProducts.map(renderProductCard)}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'detail' && !selectedDetailProduct && (
          <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-white/90 dark:bg-[#16201A] rounded-3xl border border-[#EAE4DA] dark:border-[#344639] p-10 text-center surface-3d space-y-4 max-w-lg mx-auto">
              <Flower2 className="w-8 h-8 text-accent-fg mx-auto" />
              <p className="font-display font-bold text-base text-[#233126] dark:text-[#F8FAF7]">
                Produk tidak ditemukan atau telah dihapus
              </p>
              <button
                type="button"
                onClick={() => switchTab('katalog', 'Semua')}
                className="px-5 py-2.5 rounded-xl text-white text-xs font-semibold btn-3d-primary cursor-pointer"
              >
                Kembali ke Katalog Produk
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Dark Botanical Footer */}
      <footer className="bg-[#111A14] text-[#D4DFD6] border-t border-[#26362B] mt-8">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <BrandLogo
                logoUrl={storeInfo?.storeLogoUrl}
                alt={shortBrand}
                className="w-9 h-9 rounded-xl"
                iconClassName="w-4 h-4"
              />
              <div>
                <p className="font-display font-bold text-base text-white">{shortBrand}</p>
                <p className="text-[11px] text-[#9BB0A0]">Buket &amp; Hantaran Studio</p>
              </div>
            </div>
            <p className="text-xs text-[#9BB0A0] leading-relaxed">{tagline}</p>
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-display font-bold text-white mb-2.5">Kategori Produk</p>
            {ORDER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => switchTab('katalog', cat)}
                className="block text-[#B2C0B5] hover:text-white cursor-pointer"
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-display font-bold text-white mb-2.5">Navigasi &amp; Layanan</p>
            <button
              type="button"
              onClick={() => switchTab('promo')}
              className="block text-[#B2C0B5] hover:text-white cursor-pointer"
            >
              Promo Spesial
            </button>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="block text-[#B2C0B5] hover:text-white cursor-pointer"
            >
              Keranjang Belanja ({cartCount})
            </button>
            <button
              type="button"
              onClick={() => switchTab('tentang')}
              className="block text-[#B2C0B5] hover:text-white cursor-pointer"
            >
              Konsultasi Custom Desain
            </button>
            <button
              type="button"
              onClick={onOpenAdminGate}
              className="inline-flex items-center gap-1.5 text-[#DDB568] hover:underline pt-1 cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              <span>Portal Admin (Sandi Diperlukan)</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <p className="font-display font-bold text-white mb-2.5">Hubungi Studio</p>
            <p className="flex items-center gap-2 text-[#B2C0B5]">
              <Phone className="w-3.5 h-3.5 text-[#DDB568] shrink-0" />
              <span>{phoneDisplay}</span>
            </p>
            <p className="flex items-start gap-2 text-[#B2C0B5]">
              <MapPin className="w-3.5 h-3.5 text-[#DDB568] shrink-0 mt-0.5" />
              <span>{studioAddress}</span>
            </p>
          </div>
        </div>
        <div className="border-t border-[#26362B] py-4 px-4 text-center text-[11px] text-[#8E9E91]">
          &copy; {new Date().getFullYear()} {storeName}. Seluruh hak cipta dilindungi.
        </div>
      </footer>

      {/* Slide-Over Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#18221B]/55 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#16201A] h-full flex flex-col border-l border-[#EAE4DA] dark:border-[#344639] shadow-2xl">
            <div className="px-5 py-4 border-b border-[#EFEAE1] dark:border-[#344639] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-accent-fg" />
                <h2 className="font-display font-bold text-base text-[#233126] dark:text-[#F8FAF7]">
                  Keranjang Pesanan ({cartCount})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Tutup keranjang"
                className="p-2 rounded-xl text-[#616E63] dark:text-[#BCC8BF] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent-fg mx-auto flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <p className="font-display font-semibold text-sm text-[#233126] dark:text-[#F8FAF7]">
                    Keranjang Anda masih kosong
                  </p>
                  <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                    Pilih buket atau hantaran favorit Anda dari katalog untuk mulai memesan.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false);
                      switchTab('katalog', 'Semua');
                    }}
                    className="px-4 py-2 rounded-xl text-white text-xs font-semibold btn-3d-primary cursor-pointer"
                  >
                    Lihat Katalog Produk
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.map((entry) => {
                      const { images, photoIndex, photoUrl } = getCartEntryImageInfo(entry);
                      const itemSubtotal = entry.product.price * entry.quantity;
                      return (
                        <div
                          key={entry.product.id}
                          className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF8F4] dark:bg-[#1C2720] border border-[#EAE4DA] dark:border-[#344639]"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={photoUrl}
                              alt={`${entry.product.title} - foto ${photoIndex + 1}`}
                              className="w-16 h-16 rounded-xl object-cover border border-[#EAE4DA] dark:border-[#344639]"
                            />
                            {images.length > 1 && (
                              <button
                                type="button"
                                onClick={() => cycleCartItemImage(entry.product.id, 1)}
                                title="Ganti foto yang dikirim ke WhatsApp"
                                className="mt-1 w-full px-1 py-0.5 rounded-md bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-[10px] font-semibold text-accent-fg cursor-pointer text-center"
                              >
                                Foto {photoIndex + 1}/{images.length}
                              </button>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7] truncate">
                              {entry.product.title}
                            </p>
                            <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] mt-0.5">
                              {entry.product.category} · {formatRupiah(entry.product.price)}/pcs
                            </p>
                            <p className="text-xs font-mono font-bold text-accent-fg mt-0.5 tabular-nums">
                              Subtotal: {formatRupiah(itemSubtotal)}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => updateCartQty(entry.product.id, -1)}
                                className="w-6 h-6 rounded-lg bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] flex items-center justify-center cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold tabular-nums">
                                {entry.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(entry.product.id, 1)}
                                className="w-6 h-6 rounded-lg bg-accent text-white flex items-center justify-center cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(entry.product.id)}
                            aria-label="Hapus item"
                            className="p-1.5 text-[#8E968F] hover:text-[#B85D68] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-[#EFEAE1] dark:border-[#344639] space-y-2.5">
                    <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7]">
                      Detail Pemesan
                    </p>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nama Anda..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent"
                    />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Nomor WhatsApp Anda (opsional)..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent"
                    />
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      aria-label="Tanggal kirim atau ambil"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent"
                    />
                    <textarea
                      rows={2}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Tulisan kartu ucapan atau request warna pita..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent"
                    />
                  </div>

                  {cartCardPreviewUrl && (
                    <div className="pt-3 border-t border-[#EFEAE1] dark:border-[#344639] space-y-2">
                      <p className="text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF]">
                        Pratinjau Kartu Gambar &amp; Rincian Harga untuk WA Admin:
                      </p>
                      <div className="rounded-xl overflow-hidden border border-[#EAE4DA] dark:border-[#344639] bg-[#FAF8F4] dark:bg-[#1C2720]">
                        <img
                          src={cartCardPreviewUrl}
                          alt="Pratinjau kartu pesanan dan foto produk"
                          className="w-full h-auto object-contain max-h-48"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-[#EFEAE1] dark:border-[#344639] bg-[#FAF8F4] dark:bg-[#121A15] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#616E63] dark:text-[#BCC8BF]">
                    Total ({cartCount} item)
                  </span>
                  <span className="font-mono font-bold text-base text-[#233126] dark:text-[#F8FAF7] tabular-nums">
                    {formatRupiah(cartTotal)}
                  </span>
                </div>

                {cartWaFeedback && (
                  <p className="text-[11px] text-accent-fg bg-accent-soft border border-accent-soft rounded-xl px-3 py-2">
                    {cartWaFeedback}
                  </p>
                )}

                <a
                  href={checkoutWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    void handleCopyAndShowCartFeedback();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white text-xs font-semibold btn-3d-primary"
                >
                  <Check className="w-4 h-4" />
                  <span>Konfirmasi &amp; Kirim ke WA Admin</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  {canShareCartImage ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!cartCardBlob) return;
                        await shareOrderWithImageFile(
                          cartCardBlob,
                          checkoutMessage,
                          'Konfirmasi-Pesanan-Elviora.png'
                        );
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-[#233126] dark:text-[#F8FAF7] cursor-pointer hover:border-accent"
                    >
                      <Share2 className="w-3.5 h-3.5 text-accent-fg" />
                      <span>Kirim File Gambar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        void handleCopyAndShowCartFeedback();
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-[#233126] dark:text-[#F8FAF7] cursor-pointer hover:border-accent"
                    >
                      <Copy className="w-3.5 h-3.5 text-accent-fg" />
                      <span>Salin Gambar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      const blob =
                        cartCardBlob ||
                        (await generateOrderCardPngBlob(cart, {
                          storeInfo,
                          customerName,
                          customerPhone,
                          deliveryDate,
                          orderNotes,
                        }));
                      if (blob) {
                        downloadOrderCardPng(blob, 'Konfirmasi-Pesanan-Elviora.png');
                      }
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-[11px] font-semibold text-[#556257] dark:text-[#D4DFD6] cursor-pointer hover:border-accent"
                  >
                    <Download className="w-3.5 h-3.5 text-accent-fg" />
                    <span>Unduh Gambar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Inline Product Editor Modal */}
      {isAdminUnlocked && (
        <CatalogProductModal
          open={editorModalOpen}
          editingProduct={editingProduct}
          onClose={() => setEditorModalOpen(false)}
          onSave={async (payload) => {
            if (editingProduct && onAdminUpdateProduct) {
              await onAdminUpdateProduct(editingProduct.id, payload);
            } else if (!editingProduct && onAdminCreateProduct) {
              await onAdminCreateProduct(payload);
            }
          }}
        />
      )}
    </div>
  );
}
