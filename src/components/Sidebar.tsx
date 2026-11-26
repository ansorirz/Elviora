import React, { useState } from 'react';
import {
  BarChart3,
  Calculator,
  CalendarDays,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Package,
  Settings,
  ShoppingBag,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { ASSETS, type NavSection } from '../types';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  active: NavSection;
  onSelect: (section: NavSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  storeName: string;
  storeLogoUrl?: string | null;
  onExportPDF: () => Promise<void> | void;
  onExportImage: () => Promise<void> | void;
  onViewStorefront?: () => void;
}

const MENU_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'katalog', label: 'Katalog Produk', icon: Store },
  { id: 'pesanan', label: 'Data Pesanan', icon: ShoppingBag },
  { id: 'pelanggan', label: 'Data Pelanggan', icon: Users },
  { id: 'pemasukan', label: 'Pemasukan', icon: TrendingUp },
  { id: 'pengeluaran', label: 'Pengeluaran', icon: TrendingDown },
  { id: 'modal_produksi', label: 'Modal Produksi', icon: Calculator },
  { id: 'stok_bahan', label: 'Stok Bahan', icon: Package },
  { id: 'invoice', label: 'Invoice', icon: FileText },
  { id: 'kalender', label: 'Kalender Pesanan', icon: CalendarDays },
  { id: 'laporan', label: 'Laporan Keuangan', icon: BarChart3 },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
];

export function Sidebar({
  active,
  onSelect,
  mobileOpen,
  onCloseMobile,
  storeName,
  storeLogoUrl,
  onExportPDF,
  onExportImage,
  onViewStorefront,
}: SidebarProps) {
  const [exportingType, setExportingType] = useState<'pdf' | 'img' | null>(null);

  const handleExport = async (type: 'pdf' | 'img') => {
    setExportingType(type);
    try {
      if (type === 'pdf') await onExportPDF();
      else await onExportImage();
    } finally {
      setExportingType(null);
    }
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white/82 dark:bg-[#121A15] backdrop-blur-md border-r border-[#EAE4DA]/90 dark:border-[#344639]/90 select-none transition-colors">
      {/* Brand Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            onSelect('dashboard');
            onCloseMobile();
          }}
          className="flex items-center gap-3 text-left cursor-pointer group"
        >
          <div className="transition-transform group-hover:scale-[1.03]">
            <BrandLogo logoUrl={storeLogoUrl} alt="Logo Elviora" className="w-10 h-10 rounded-xl" iconClassName="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-base text-[#233126] dark:text-[#F8FAF7] leading-tight truncate">
              Elviora
            </p>
            <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] truncate">
              {storeName || 'Keuangan Buket & Hantaran'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Tutup menu"
          className="lg:hidden p-1.5 rounded-lg text-[#616E63] dark:text-[#BCC8BF] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1" aria-label="Menu Utama">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'text-white nav-item-3d-active'
                  : 'text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4]/80 dark:hover:bg-[#222C24]/80 hover:text-[#233126] dark:hover:text-[#F3EFE6]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-white' : 'text-[#7D877E] dark:text-[#B2C0B5]'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        {onViewStorefront && (
          <button
            type="button"
            onClick={() => {
              onViewStorefront();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 mt-2 rounded-xl text-[13px] font-medium text-accent-fg bg-accent-soft/75 hover:bg-accent-soft transition-colors cursor-pointer whitespace-nowrap"
          >
            <Store className="w-4 h-4 shrink-0" />
            <span className="truncate">Lihat Beranda Toko</span>
          </button>
        )}
      </nav>

      {/* Bottom Showcase Card */}
      <div className="p-3.5 mt-auto">
        <div className="rounded-2xl bg-[#FAF8F4]/90 dark:bg-[#1C2720] border border-[#EAE4DA] dark:border-[#344639] p-3 text-center surface-3d-subtle">
          <div className="w-full h-24 rounded-xl overflow-hidden bg-[#EFEAE1] dark:bg-[#2A362D] mb-2.5 border border-[#E5DDD0] dark:border-[#324035] shadow-inner transition-transform duration-300 hover:scale-[1.02]">
            <img
              src={ASSETS.sidebarBouquet}
              alt="Buket Signature Elviora"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="font-display font-semibold text-xs text-[#233126] dark:text-[#F8FAF7]">
            Rekap Tutup Buku
          </p>
          <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] mt-0.5 mb-2.5 leading-relaxed">
            Ekspor seluruh transaksi kas &amp; piutang sebagai PDF atau gambar.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={exportingType !== null}
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-white text-[11px] font-medium btn-3d-primary cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <FileText className="w-3.5 h-3.5" />
              {exportingType === 'pdf' ? 'Proses...' : 'PDF'}
            </button>
            <button
              type="button"
              disabled={exportingType !== null}
              onClick={() => handleExport('img')}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-[#233126] dark:text-[#F8FAF7] hover:bg-[#F4EFE6] dark:hover:bg-[#263128] text-[11px] font-medium btn-3d-secondary cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <ImageIcon className="w-3.5 h-3.5 text-accent-fg" />
              {exportingType === 'img' ? 'Proses...' : 'Gambar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 no-print">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-[#233126]/45 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 shadow-xl">{navContent}</div>
        </div>
      )}
    </>
  );
}
