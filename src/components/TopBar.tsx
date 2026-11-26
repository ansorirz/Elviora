import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Bell,
  Camera,
  CheckCheck,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  Store,
} from 'lucide-react';
import {
  ASSETS,
  type AppNotification,
  type Customer,
  type Material,
  type NavSection,
  type Order,
  formatRupiah,
} from '../types';

interface TopBarProps {
  pageTitle: string;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenMobileMenu: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (section: NavSection) => void;
  ownerName: string;
  ownerEmail: string;
  photoURL?: string | null;
  onSignOut: () => void;
  orders: Order[];
  customers: Customer[];
  materials: Material[];
  onViewStorefront?: () => void;
}

export function TopBar({
  pageTitle,
  searchQuery,
  onSearchChange,
  onOpenMobileMenu,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
  ownerName,
  ownerEmail,
  photoURL,
  onSignOut,
  orders,
  customers,
  materials,
  onViewStorefront,
}: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgFailed(false);
  }, [photoURL]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { orders: [], customers: [], materials: [] };
    return {
      orders: orders
        .filter(
          (o) =>
            o.invoiceNumber.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.productName.toLowerCase().includes(q)
        )
        .slice(0, 4),
      customers: customers
        .filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q))
        .slice(0, 3),
      materials: materials
        .filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
        .slice(0, 3),
    };
  }, [searchQuery, orders, customers, materials]);

  const hasSearchResults =
    searchResults.orders.length > 0 ||
    searchResults.customers.length > 0 ||
    searchResults.materials.length > 0;

  const avatarSrc = !imgFailed && photoURL ? photoURL : ASSETS.adminAvatar;

  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F4]/88 dark:bg-[#111813]/95 backdrop-blur-md border-b border-[#EAE4DA] dark:border-[#344639] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 no-print transition-colors">
      {/* Left: Mobile drawer trigger + Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka navigasi"
          className="lg:hidden p-2 rounded-xl bg-white/90 dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-[#233126] dark:text-[#F8FAF7] hover:bg-[#F4EFE6] dark:hover:bg-[#1E2A22] btn-3d-secondary cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-display font-semibold text-lg sm:text-xl text-[#233126] dark:text-[#F8FAF7] truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Center/Right: Search + Notifications + Settings + Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Live Global Search */}
        <div ref={searchRef} className="relative hidden md:block w-52 xl:w-64">
          <Search className="w-4 h-4 text-[#7D877E] dark:text-[#B2C0B5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setSearchFocused(true);
            }}
            placeholder="Cari buket, hantaran, pelanggan..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/90 dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] placeholder:text-[#8E968F] dark:placeholder:text-[#93A397] surface-3d-subtle focus:outline-none focus-border-accent transition-colors"
          />

          {searchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white/95 dark:bg-[#16201A] backdrop-blur-md rounded-2xl border border-[#EAE4DA] dark:border-[#344639] surface-3d p-2.5 z-50 max-h-80 overflow-y-auto">
              {!hasSearchResults ? (
                <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF] text-center py-4">
                  Tidak ada hasil untuk &ldquo;{searchQuery}&rdquo;
                </p>
              ) : (
                <div className="space-y-2.5">
                  {searchResults.orders.length > 0 && (
                    <div>
                      <p className="px-2 pb-1 text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF]">
                        Pesanan
                      </p>
                      {searchResults.orders.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            onNavigate('pesanan');
                            setSearchFocused(false);
                          }}
                          className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] text-left cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#233126] dark:text-[#F8FAF7] truncate">
                              {o.productName}
                            </p>
                            <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] truncate">
                              {o.invoiceNumber} · {o.customerName}
                            </p>
                          </div>
                          <span className="text-xs font-mono font-medium text-accent-fg shrink-0">
                            {formatRupiah(o.totalAmount)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.customers.length > 0 && (
                    <div>
                      <p className="px-2 pb-1 text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF]">
                        Pelanggan
                      </p>
                      {searchResults.customers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onNavigate('pelanggan');
                            setSearchFocused(false);
                          }}
                          className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] text-left cursor-pointer"
                        >
                          <span className="text-xs font-medium text-[#233126] dark:text-[#F8FAF7] truncate">
                            {c.name}
                          </span>
                          <span className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] shrink-0">
                            {c.phone}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.materials.length > 0 && (
                    <div>
                      <p className="px-2 pb-1 text-[11px] font-semibold text-[#7D877E] dark:text-[#BCC8BF]">
                        Stok Bahan
                      </p>
                      {searchResults.materials.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            onNavigate('stok_bahan');
                            setSearchFocused(false);
                          }}
                          className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] text-left cursor-pointer"
                        >
                          <span className="text-xs font-medium text-[#233126] dark:text-[#F8FAF7] truncate">
                            {m.name}
                          </span>
                          <span className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] shrink-0 tabular-nums">
                            {m.stock} {m.unit}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label="Notifikasi"
            className="relative w-10 h-10 rounded-xl bg-white/90 dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] flex items-center justify-center text-[#556257] dark:text-[#D4DFD6] hover:text-[#233126] dark:hover:text-[#F3EFE6] hover:bg-[#F4EFE6]/60 dark:hover:bg-[#222C24] btn-3d-secondary cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D88C94] text-white text-[10px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 dark:bg-[#16201A] backdrop-blur-md rounded-2xl border border-[#EAE4DA] dark:border-[#344639] surface-3d p-3 z-50">
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#EFEAE1] dark:border-[#344639]">
                <span className="font-display font-semibold text-sm text-[#233126] dark:text-[#F8FAF7]">
                  Notifikasi Bisnis
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-fg hover:underline cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Tandai dibaca
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF] text-center py-6">
                    Belum ada notifikasi.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        if (!n.isRead) onMarkRead(n.id);
                        if (n.type === 'stok') onNavigate('stok_bahan');
                        else if (n.type === 'pesanan' || n.type === 'pembayaran') onNavigate('pesanan');
                        setNotifOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-colors cursor-pointer ${
                        n.isRead
                          ? 'bg-white/70 dark:bg-[#16201A]/70 hover:bg-[#FAF8F4] dark:hover:bg-[#222C24]'
                          : 'bg-[#FAF8F4] dark:bg-[#1F2B23] hover:bg-[#F4EFE6] dark:hover:bg-[#2A362D]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs ${
                            n.isRead
                              ? 'font-medium text-[#556257] dark:text-[#D4DFD6]'
                              : 'font-semibold text-[#233126] dark:text-[#F8FAF7]'
                          }`}
                        >
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="text-[10px] font-medium text-[#C46F79] dark:text-[#F4B4BC] shrink-0">
                            Baru
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] mt-0.5 leading-relaxed">
                        {n.message}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Public Storefront Preview Button */}
        {onViewStorefront && (
          <button
            type="button"
            onClick={onViewStorefront}
            title="Lihat Beranda Katalog"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 h-10 rounded-xl bg-white/90 dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#233126] dark:text-[#F8FAF7] hover:bg-[#F4EFE6]/60 dark:hover:bg-[#222C24] btn-3d-secondary cursor-pointer"
          >
            <Store className="w-3.5 h-3.5 text-accent-fg" />
            <span className="hidden xl:inline">Beranda</span>
          </button>
        )}

        {/* Settings Icon */}
        <button
          type="button"
          onClick={() => onNavigate('pengaturan')}
          aria-label="Pengaturan Toko"
          className="hidden sm:flex w-10 h-10 rounded-xl bg-white/90 dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] items-center justify-center text-[#556257] dark:text-[#D4DFD6] hover:text-[#233126] dark:hover:text-[#F3EFE6] hover:bg-[#F4EFE6]/60 dark:hover:bg-[#222C24] btn-3d-secondary cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Admin Profile */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-xl bg-white/90 dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] btn-3d-secondary cursor-pointer"
          >
            <img
              src={avatarSrc}
              alt={ownerName}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-8 h-8 rounded-lg object-cover bg-[#F4EFE6] dark:bg-[#1F2B23]"
            />
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7] max-w-[110px] truncate">
                {ownerName}
              </p>
              <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF]">Owner Studio</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#7D877E] dark:text-[#BCC8BF] hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white/95 dark:bg-[#16201A] backdrop-blur-md rounded-2xl border border-[#EAE4DA] dark:border-[#344639] surface-3d p-2 z-50">
              <div className="px-3 py-2 border-b border-[#EFEAE1] dark:border-[#344639] mb-1">
                <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7] truncate">
                  {ownerName}
                </p>
                <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] truncate">
                  {ownerEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onNavigate('pengaturan');
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] hover:text-[#233126] dark:hover:text-[#F3EFE6] cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-accent-fg" />
                Ganti Foto Profil
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('pengaturan');
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] hover:text-[#233126] dark:hover:text-[#F3EFE6] cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Pengaturan
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#C46F79] dark:text-[#F4B4BC] hover:bg-[#FDF4F5] dark:hover:bg-[#D88C94]/15 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Keluar Akun
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
