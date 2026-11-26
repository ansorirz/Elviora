import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ImagePlus,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Sun,
  UserCircle2,
} from 'lucide-react';
import {
  ASSETS,
  COLOR_PALETTES,
  DEFAULT_CUSTOM_COLORS,
  type ColorPalette,
  type CustomPaletteColors,
  type StoreSettings,
} from '../../types';
import { BrandLogo } from '../BrandLogo';
import { AvatarCropModal } from '../AvatarCropModal';
import { LogoCropModal } from '../LogoCropModal';
import { normalizeHex } from '../../utils/colorUtils';

interface SettingsViewProps {
  settings: StoreSettings | null;
  onSave: (payload: Omit<StoreSettings, 'id' | 'ownerId'>) => Promise<void>;
  onUpdateProfilePhoto: (photoUrl: string) => Promise<void>;
  onUpdateStoreLogo: (logoUrl: string) => Promise<void>;
  onResetDemoData: () => Promise<void>;
  ownerEmail: string;
  googlePhotoURL?: string | null;
  theme: 'light' | 'dark';
  onToggleTheme: (next: 'light' | 'dark') => void;
  colorPalette: ColorPalette;
  onChangePalette: (next: ColorPalette) => void;
  customColors: CustomPaletteColors;
  onChangeCustomColors: (next: CustomPaletteColors) => void;
}

const PRESET_AVATARS = [
  { label: 'Owner', src: ASSETS.adminAvatar },
  { label: 'Mawar', src: ASSETS.buketMawar },
  { label: 'Hantaran', src: ASSETS.hantaranLamaran },
  { label: 'Pastel', src: ASSETS.buketUang },
  { label: 'Hampers', src: ASSETS.hampersLebaran },
];

export function SettingsView({
  settings,
  onSave,
  onUpdateProfilePhoto,
  onUpdateStoreLogo,
  onResetDemoData,
  ownerEmail,
  googlePhotoURL,
  theme,
  onToggleTheme,
  colorPalette,
  onChangePalette,
  customColors,
  onChangeCustomColors,
}: SettingsViewProps) {
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [invoicePrefix, setInvoicePrefix] = useState('FLR');
  const [bankName, setBankName] = useState('BCA');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [monthlyTarget, setMonthlyTarget] = useState(35000000);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Profile photo states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoSavedNotice, setPhotoSavedNotice] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [pendingCropUrl, setPendingCropUrl] = useState<string | null>(null);

  // Store logo states
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoSavedNotice, setLogoSavedNotice] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [pendingLogoUrl, setPendingLogoUrl] = useState<{ url: string; revoke: boolean } | null>(null);

  useEffect(() => {
    if (!settings) return;
    setStoreName(settings.storeName);
    setOwnerName(settings.ownerName);
    setPhone(settings.phone || '');
    setAddress(settings.address || '');
    setTaxRate(settings.taxRate);
    setInvoicePrefix(settings.invoicePrefix);
    setBankName(settings.bankName || '');
    setBankAccount(settings.bankAccount || '');
    setBankHolder(settings.bankHolder || '');
    setMonthlyTarget(settings.monthlyTarget);
  }, [settings]);

  const activePhotoSrc =
    !previewFailed && (settings?.profilePhotoUrl || googlePhotoURL)
      ? settings?.profilePhotoUrl || googlePhotoURL || ASSETS.adminAvatar
      : ASSETS.adminAvatar;

  useEffect(() => {
    setPreviewFailed(false);
  }, [settings?.profilePhotoUrl, googlePhotoURL]);

  const applyPhoto = async (nextUrl: string) => {
    setPhotoError('');
    setPhotoSaving(true);
    setPhotoSavedNotice(false);
    try {
      await onUpdateProfilePhoto(nextUrl);
      setPhotoSavedNotice(true);
      setTimeout(() => setPhotoSavedNotice(false), 3000);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Gagal memperbarui foto profil.');
    } finally {
      setPhotoSaving(false);
    }
  };

  const handlePhotoPicked = (file?: File | null) => {
    if (!file) return;
    setPhotoError('');
    if (!file.type.startsWith('image/')) {
      setPhotoError('Pilih file gambar (JPG, PNG, atau WebP).');
      return;
    }
    if (pendingCropUrl) {
      URL.revokeObjectURL(pendingCropUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setPendingCropUrl(objectUrl);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCloseCropModal = () => {
    if (pendingCropUrl) {
      URL.revokeObjectURL(pendingCropUrl);
    }
    setPendingCropUrl(null);
  };

  const handleConfirmCroppedPhoto = async (croppedDataUrl: string) => {
    setPhotoSaving(true);
    setPhotoSavedNotice(false);
    try {
      await onUpdateProfilePhoto(croppedDataUrl);
      handleCloseCropModal();
      setPhotoSavedNotice(true);
      setTimeout(() => setPhotoSavedNotice(false), 3000);
    } finally {
      setPhotoSaving(false);
    }
  };

  const applyLogo = async (nextUrl: string) => {
    setLogoError('');
    setLogoSaving(true);
    setLogoSavedNotice(false);
    try {
      await onUpdateStoreLogo(nextUrl);
      setLogoSavedNotice(true);
      setTimeout(() => setLogoSavedNotice(false), 3000);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Gagal memperbarui logo.');
    } finally {
      setLogoSaving(false);
    }
  };

  const handleLogoPicked = (file?: File | null) => {
    if (!file) return;
    setLogoError('');
    if (!file.type.startsWith('image/')) {
      setLogoError('Pilih file gambar logo (PNG, JPG, WebP, atau SVG).');
      return;
    }
    if (pendingLogoUrl?.revoke) {
      URL.revokeObjectURL(pendingLogoUrl.url);
    }
    const objectUrl = URL.createObjectURL(file);
    setPendingLogoUrl({ url: objectUrl, revoke: true });
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleCloseLogoModal = () => {
    if (pendingLogoUrl?.revoke) {
      URL.revokeObjectURL(pendingLogoUrl.url);
    }
    setPendingLogoUrl(null);
  };

  const handleConfirmCroppedLogo = async (croppedDataUrl: string) => {
    setLogoSaving(true);
    setLogoSavedNotice(false);
    try {
      await onUpdateStoreLogo(croppedDataUrl);
      handleCloseLogoModal();
      setLogoSavedNotice(true);
      setTimeout(() => setLogoSavedNotice(false), 3000);
    } finally {
      setLogoSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    try {
      await onSave({
        storeName,
        ownerName,
        phone,
        address,
        taxRate,
        invoicePrefix,
        bankName,
        bankAccount,
        bankHolder,
        monthlyTarget,
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await onResetDemoData();
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } finally {
      setResetting(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs text-[#233126] dark:text-[#F8FAF7] focus:outline-none focus-border-accent';

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="font-display font-bold text-xl text-[#233126] dark:text-[#F8FAF7]">
          Pengaturan
        </h2>
        <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
          Kelola foto profil admin, logo Elviora, tema &amp; warna tampilan kustom, identitas usaha, serta target bulanan.
        </p>
      </div>

      {/* Profile Photo & Brand Logo Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Admin Profile Photo Card */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingPhoto(true);
          }}
          onDragLeave={() => setIsDraggingPhoto(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingPhoto(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) handlePhotoPicked(dropped);
          }}
          className={`lg:col-span-7 bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border p-5 sm:p-6 surface-3d transition-colors flex flex-col justify-between ${
            isDraggingPhoto
              ? 'border-accent bg-accent-soft'
              : 'border-[#EAE4DA] dark:border-[#344639]'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative shrink-0 self-start">
              <button
                type="button"
                disabled={photoSaving}
                onClick={() => fileInputRef.current?.click()}
                title="Klik untuk ganti foto profil"
                className="group relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-white dark:border-[#344639] bg-[#F4EFE6] dark:bg-[#1F2B23] surface-3d cursor-pointer block focus:outline-none"
              >
                <img
                  src={activePhotoSrc}
                  alt={ownerName || 'Foto Profil Admin'}
                  referrerPolicy="no-referrer"
                  onError={() => setPreviewFailed(true)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div
                  className={`absolute inset-0 bg-[#1B241D]/55 flex flex-col items-center justify-center text-white transition-opacity ${
                    photoSaving ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {photoSaving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span className="text-[10px] font-medium">Ubah</span>
                    </>
                  )}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoPicked(e.target.files?.[0])}
                className="hidden"
              />
            </div>

            <div className="flex-1 min-w-0 space-y-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7] truncate">
                    Foto Profil Admin
                  </h3>
                  {photoSavedNotice && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-soft text-accent-fg text-[10px] font-medium">
                      <Check className="w-3 h-3" />
                      Tersimpan
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] truncate">
                  {ownerName || 'Admin Studio'} · {ownerEmail || 'Owner Studio'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={photoSaving}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-medium btn-3d-primary cursor-pointer disabled:opacity-60"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  {photoSaving ? 'Menyimpan...' : 'Pilih Foto'}
                </button>

                {googlePhotoURL && settings?.profilePhotoUrl && (
                  <button
                    type="button"
                    disabled={photoSaving}
                    onClick={() => void applyPhoto('')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#FAF8F4] dark:hover:bg-[#2A362D] text-[11px] font-medium text-[#556257] dark:text-[#D4DFD6] btn-3d-secondary cursor-pointer disabled:opacity-60"
                  >
                    <UserCircle2 className="w-3.5 h-3.5 text-accent-fg" />
                    Foto Google
                  </button>
                )}

                {settings?.profilePhotoUrl !== ASSETS.adminAvatar && (
                  <button
                    type="button"
                    disabled={photoSaving}
                    onClick={() => void applyPhoto(ASSETS.adminAvatar)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#FAF8F4] dark:hover:bg-[#2A362D] text-[11px] font-medium text-[#556257] dark:text-[#D4DFD6] btn-3d-secondary cursor-pointer disabled:opacity-60"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Default
                  </button>
                )}
              </div>

              {photoError && (
                <p className="text-[11px] font-medium text-[#B85D68] dark:text-[#F4B4BC]">
                  {photoError}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-[#EFEAE1] dark:border-[#344639] flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] mr-1">Cepat:</span>
            {PRESET_AVATARS.map((preset) => {
              const isActive = activePhotoSrc === preset.src;
              return (
                <button
                  key={preset.src}
                  type="button"
                  disabled={photoSaving}
                  onClick={() => void applyPhoto(preset.src)}
                  title={preset.label}
                  className={`inline-flex items-center gap-1.5 pr-2 pl-1 py-0.5 rounded-lg border text-[10px] font-medium transition-all cursor-pointer disabled:opacity-60 ${
                    isActive
                      ? 'border-accent bg-accent-soft text-accent-fg'
                      : 'border-[#EAE4DA] dark:border-[#344639] bg-[#FAF8F4]/80 dark:bg-[#1F2B23]/80 text-[#556257] dark:text-[#D4DFD6] hover:border-[#C5D3C7]'
                  }`}
                >
                  <img
                    src={preset.src}
                    alt={preset.label}
                    className="w-5 h-5 rounded-md object-cover"
                  />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Store / Brand Logo Card */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingLogo(true);
          }}
          onDragLeave={() => setIsDraggingLogo(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingLogo(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) handleLogoPicked(dropped);
          }}
          className={`lg:col-span-5 bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border p-5 sm:p-6 surface-3d transition-colors flex flex-col justify-between ${
            isDraggingLogo
              ? 'border-accent bg-accent-soft'
              : 'border-[#EAE4DA] dark:border-[#344639]'
          }`}
        >
          <div className="flex items-start gap-4">
            <button
              type="button"
              disabled={logoSaving}
              onClick={() => logoInputRef.current?.click()}
              title="Klik untuk ganti logo Elviora"
              className="group relative shrink-0 cursor-pointer rounded-2xl focus:outline-none"
            >
              <BrandLogo
                logoUrl={settings?.storeLogoUrl}
                alt="Logo Elviora"
                className="w-20 h-20 rounded-2xl"
                iconClassName="w-9 h-9"
              />
              <div
                className={`absolute inset-0 rounded-2xl bg-[#1B241D]/55 flex flex-col items-center justify-center text-white transition-opacity ${
                  logoSaving ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                {logoSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] font-medium">Ubah</span>
                  </>
                )}
              </div>
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoPicked(e.target.files?.[0])}
              className="hidden"
            />

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7] truncate">
                  Logo Elviora
                </h3>
                {logoSavedNotice && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-soft text-accent-fg text-[10px] font-medium">
                    <Check className="w-3 h-3" />
                    Tersimpan
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] leading-snug">
                Tampil di bilah menu kiri dan kop Invoice resmi.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  disabled={logoSaving}
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-medium btn-3d-primary cursor-pointer disabled:opacity-60"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {logoSaving ? 'Menyimpan...' : 'Unggah Logo'}
                </button>

                {settings?.storeLogoUrl && (
                  <>
                    <button
                      type="button"
                      disabled={logoSaving}
                      onClick={() =>
                        setPendingLogoUrl({ url: settings.storeLogoUrl || '', revoke: false })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#FAF8F4] dark:hover:bg-[#2A362D] text-[11px] font-medium text-accent-fg btn-3d-secondary cursor-pointer disabled:opacity-60"
                    >
                      Atur Ukuran
                    </button>
                    <button
                      type="button"
                      disabled={logoSaving}
                      onClick={() => void applyLogo('')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#FAF8F4] dark:hover:bg-[#2A362D] text-[11px] font-medium text-[#556257] dark:text-[#D4DFD6] btn-3d-secondary cursor-pointer disabled:opacity-60"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Default
                    </button>
                  </>
                )}
              </div>

              {logoError && (
                <p className="text-[11px] font-medium text-[#B85D68] dark:text-[#F4B4BC]">
                  {logoError}
                </p>
              )}
            </div>
          </div>

          <p className="mt-4 pt-3.5 border-t border-[#EFEAE1] dark:border-[#344639] text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
            Mendukung PNG transparan, JPG, atau WebP. Klik/seret file ke ikon logo.
          </p>
        </div>
      </div>

      {/* Theme & Custom Color Appearance Card */}
      <div className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-6 surface-3d space-y-6">
        <div>
          <div className="mb-4">
            <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
              Tema Tampilan Aplikasi
            </h3>
            <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF] mt-0.5">
              Pilih mode visual Terang atau Gelap dengan latar gradasi lembut sesuai kenyamanan Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <button
              type="button"
              onClick={() => onToggleTheme('light')}
              className={`p-4 rounded-xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                theme === 'light'
                  ? 'border-accent bg-accent-soft surface-3d-subtle'
                  : 'border-[#EAE4DA] dark:border-[#344639] bg-[#FAF8F4]/75 dark:bg-[#1F2B23]/75 hover:border-[#C5D3C7]'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-[#EAE4DA] text-[#A88035] flex items-center justify-center icon-3d shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-sm text-[#233126] dark:text-[#F8FAF7]">
                  Mode Terang
                </p>
                <p className="text-[11px] text-[#616E63] dark:text-[#BCC8BF]">
                  Latar krem hangat dengan gradasi pastel lembut.
                </p>
              </div>
              {theme === 'light' && <Check className="w-4 h-4 text-accent-fg shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => onToggleTheme('dark')}
              className={`p-4 rounded-xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'border-accent bg-accent-soft surface-3d-subtle'
                  : 'border-[#EAE4DA] dark:border-[#344639] bg-[#FAF8F4]/75 dark:bg-[#1F2B23]/75 hover:border-[#3A4A3E]'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-[#111713] border border-[#2A362D] text-[#DDB568] flex items-center justify-center icon-3d shrink-0">
                <Moon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-sm text-[#233126] dark:text-[#F8FAF7]">
                  Mode Gelap
                </p>
                <p className="text-[11px] text-[#616E63] dark:text-[#BCC8BF]">
                  Nuansa malam elegan dengan aura gradasi halus.
                </p>
              </div>
              {theme === 'dark' && <Check className="w-4 h-4 text-accent-fg shrink-0" />}
            </button>
          </div>
        </div>

        {/* Color Palette Selector + Custom Builder */}
        <div className="pt-5 border-t border-[#EFEAE1] dark:border-[#344639] space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-accent-fg" />
            <div>
              <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
                Pilihan Warna Tampilan
              </h3>
              <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                Pilih palet siap pakai atau racik warna kustom sendiri sesuai identitas studio Anda.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {COLOR_PALETTES.map((p) => {
              const isSelected = colorPalette === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChangePalette(p.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'border-accent bg-accent-soft surface-3d-subtle'
                      : 'border-[#EAE4DA] dark:border-[#344639] bg-[#FAF8F4]/75 dark:bg-[#1F2B23]/75 hover:border-[#C5D3C7] dark:hover:border-[#3A4A3E]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center -space-x-1.5">
                      {p.swatches.map((hex, i) => (
                        <span
                          key={i}
                          className="w-5 h-5 rounded-full border-2 border-white dark:border-[#1A221C] shadow-xs"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-accent-fg shrink-0" />}
                  </div>
                  <div>
                    <p className="font-display font-semibold text-xs text-[#233126] dark:text-[#F8FAF7]">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-[#616E63] dark:text-[#BCC8BF] mt-0.5 leading-snug">
                      {p.description}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Custom Color Card */}
            <button
              type="button"
              onClick={() => onChangePalette('custom')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                colorPalette === 'custom'
                  ? 'border-accent bg-accent-soft surface-3d-subtle'
                  : 'border-[#EAE4DA] dark:border-[#344639] bg-[#FAF8F4]/75 dark:bg-[#1F2B23]/75 hover:border-[#C5D3C7] dark:hover:border-[#3A4A3E]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center -space-x-1.5">
                  <span
                    className="w-5 h-5 rounded-full border-2 border-white dark:border-[#1A221C] shadow-xs"
                    style={{ backgroundColor: customColors.primaryHex }}
                  />
                  <span
                    className="w-5 h-5 rounded-full border-2 border-white dark:border-[#1A221C] shadow-xs"
                    style={{ backgroundColor: customColors.secondaryHex }}
                  />
                  <span
                    className="w-5 h-5 rounded-full border-2 border-white dark:border-[#1A221C] shadow-xs"
                    style={{ backgroundColor: customColors.backdropHex }}
                  />
                </div>
                {colorPalette === 'custom' ? (
                  <Check className="w-4 h-4 text-accent-fg shrink-0" />
                ) : (
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#7D877E] dark:text-[#BCC8BF]" />
                )}
              </div>
              <div>
                <p className="font-display font-semibold text-xs text-[#233126] dark:text-[#F8FAF7]">
                  Warna Kustom Sendiri
                </p>
                <p className="text-[11px] text-[#616E63] dark:text-[#BCC8BF] mt-0.5 leading-snug">
                  Bebas pilih warna tombol, grafik &amp; gradasi latar favorit Anda.
                </p>
              </div>
            </button>
          </div>

          {/* Custom Color Picker Builder */}
          {colorPalette === 'custom' && (
            <div className="rounded-xl bg-[#FAF8F4]/90 dark:bg-[#1F2B23]/90 border border-accent-soft p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display font-semibold text-xs text-[#233126] dark:text-[#F8FAF7]">
                    Sesuaikan Warna Kustom Anda
                  </p>
                  <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
                    Klik kotak warna di bawah untuk mengubah tampilan secara langsung.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeCustomColors(DEFAULT_CUSTOM_COLORS)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-[11px] font-medium text-[#556257] dark:text-[#D4DFD6] hover:text-[#233126] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Default
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    key: 'primaryHex' as const,
                    label: 'Warna Utama',
                    hint: 'Tombol, menu aktif & grafik',
                  },
                  {
                    key: 'secondaryHex' as const,
                    label: 'Warna Aksen Kedua',
                    hint: 'Sorotan kartu & gradasi',
                  },
                  {
                    key: 'backdropHex' as const,
                    label: 'Warna Aura Latar',
                    hint: 'Gradasi buram di belakang',
                  },
                ].map((item) => {
                  const val = customColors[item.key];
                  return (
                    <div
                      key={item.key}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639]"
                    >
                      <input
                        type="color"
                        aria-label={item.label}
                        value={normalizeHex(val)}
                        onChange={(e) =>
                          onChangeCustomColors({
                            ...customColors,
                            [item.key]: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-10 h-10 rounded-lg cursor-pointer border border-[#EAE4DA] dark:border-[#344639] bg-transparent p-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7] truncate">
                          {item.label}
                        </p>
                        <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF] truncate">
                          {item.hint}
                        </p>
                        <p className="font-mono text-[10px] text-accent-fg mt-0.5">{val}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-6 surface-3d space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
              Nama Studio / Toko Buket
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
              Nama Pemilik
            </label>
            <input
              type="text"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
              Nomor WhatsApp Studio
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${inputCls} font-mono`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
              Alamat Workshop / Studio
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[#EFEAE1] dark:border-[#344639] grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
              Prefiks Nomor Invoice
            </label>
            <input
              type="text"
              required
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
              className={`${inputCls} font-mono`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
              Tarif Pajak Invoice (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={taxRate}
              onChange={(e) => setTaxRate(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              className={`${inputCls} font-mono tabular-nums`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
              Target Pendapatan Bulanan (Rp)
            </label>
            <input
              type="number"
              min={0}
              step={500000}
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(Math.max(0, Number(e.target.value) || 0))}
              className={`${inputCls} font-mono tabular-nums`}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[#EFEAE1] dark:border-[#344639] grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
              Nama Bank
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
              Nomor Rekening
            </label>
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className={`${inputCls} font-mono`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
              Atas Nama Rekening
            </label>
            <input
              type="text"
              value={bankHolder}
              onChange={(e) => setBankHolder(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[#EFEAE1] dark:border-[#344639] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={resetting}
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] text-xs font-medium text-[#616E63] dark:text-[#D4DFD6] btn-3d-secondary cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? 'Memulihkan...' : 'Pulihkan Data Contoh'}
          </button>

          <div className="flex items-center gap-3">
            {savedNotice && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-fg">
                <Check className="w-4 h-4" />
                Tersimpan
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </div>
      </form>

      <AvatarCropModal
        open={Boolean(pendingCropUrl)}
        imageSrc={pendingCropUrl}
        onCancel={handleCloseCropModal}
        onConfirm={handleConfirmCroppedPhoto}
      />

      <LogoCropModal
        open={Boolean(pendingLogoUrl)}
        imageSrc={pendingLogoUrl?.url || null}
        storeName={storeName}
        onCancel={handleCloseLogoModal}
        onConfirm={handleConfirmCroppedLogo}
      />
    </div>
  );
}
