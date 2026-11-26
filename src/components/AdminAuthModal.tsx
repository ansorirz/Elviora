import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { BrandLogo } from './BrandLogo';

interface AdminAuthModalProps {
  open: boolean;
  onClose: () => void;
  storeName: string;
  storeLogoUrl?: string | null;
  adminToken: string | null;
  onAdminTokenIssued: (token: string) => void;
  user: User | null;
  isAuthorizedAdminUser: boolean;
  authError: string;
  onGoogleSignIn: () => Promise<void>;
  onSignOutNonAdmin: () => Promise<void>;
}

export function AdminAuthModal({
  open,
  onClose,
  storeName,
  storeLogoUrl,
  adminToken,
  onAdminTokenIssued,
  user,
  isAuthorizedAdminUser,
  authError,
  onGoogleSignIn,
  onSignOutNonAdmin,
}: AdminAuthModalProps) {
  const [statusLoading, setStatusLoading] = useState(true);
  const [passcodeConfigured, setPasscodeConfigured] = useState<boolean>(true);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [signingInGoogle, setSigningInGoogle] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLocalError('');
    setPasscode('');
    setConfirmPasscode('');
    let active = true;
    setStatusLoading(true);
    fetch('/api/admin/status')
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => {
        if (!active) return;
        setPasscodeConfigured(Boolean(data?.configured));
      })
      .catch(() => {
        if (!active) return;
        setPasscodeConfigured(true);
      })
      .finally(() => {
        if (active) setStatusLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  if (!open) return null;

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!passcodeConfigured) {
      if (passcode.trim().length < 6) {
        setLocalError('Sandi Admin minimal 6 karakter.');
        return;
      }
      if (passcode.trim() !== confirmPasscode.trim()) {
        setLocalError('Konfirmasi sandi tidak cocok.');
        return;
      }
    } else if (!passcode.trim()) {
      setLocalError('Masukkan sandi admin terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = passcodeConfigured ? '/api/admin/verify' : '/api/admin/setup';
      const payload = passcodeConfigured
        ? { passcode: passcode.trim() }
        : { passcode: passcode.trim(), confirmPasscode: confirmPasscode.trim() };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        token?: string;
        error?: string;
        needsSetup?: boolean;
      };

      if (!res.ok || !data.token) {
        if (data.needsSetup) {
          setPasscodeConfigured(false);
        }
        setLocalError(data.error || 'Verifikasi sandi admin gagal.');
        return;
      }

      setPasscode('');
      setConfirmPasscode('');
      onAdminTokenIssued(data.token);
    } catch {
      setLocalError('Tidak dapat terhubung ke server verifikasi admin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setLocalError('');
    setSigningInGoogle(true);
    try {
      await onGoogleSignIn();
    } finally {
      setSigningInGoogle(false);
    }
  };

  const isPasscodeVerified = Boolean(adminToken);
  const isBlockedNonAdmin = Boolean(user && !isAuthorizedAdminUser);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18221B]/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-gate-title"
        className="w-full max-w-md bg-white dark:bg-[#16201A] rounded-3xl border border-[#EAE4DA] dark:border-[#344639] surface-3d overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#EFEAE1] dark:border-[#344639] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo
              logoUrl={storeLogoUrl}
              alt={storeName}
              className="w-10 h-10 rounded-xl shrink-0"
              iconClassName="w-5 h-5"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-accent-fg shrink-0" />
                <h2
                  id="admin-gate-title"
                  className="font-display font-bold text-base text-[#233126] dark:text-[#F8FAF7] truncate"
                >
                  Portal Khusus Admin
                </h2>
              </div>
              <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] truncate">
                {storeName || 'Elviora Studio'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal admin"
            className="p-2 rounded-xl text-[#616E63] dark:text-[#BCC8BF] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Restriction Banner */}
          <div className="rounded-2xl bg-[#FAF8F4] dark:bg-[#1C2720] border border-[#EAE4DA] dark:border-[#344639] p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-accent-fg shrink-0 mt-0.5" />
            <p className="text-xs text-[#556257] dark:text-[#D4DFD6] leading-relaxed">
              Menu ini hanya untuk pengelola studio. Pelanggan/klien dapat memesan langsung melalui
              katalog beranda tanpa login ke Admin.
            </p>
          </div>

          {/* Step Indicators */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div
              className={`px-3 py-2 rounded-xl border flex items-center gap-2 font-medium ${
                isPasscodeVerified
                  ? 'border-accent bg-accent-soft text-accent-fg'
                  : 'border-[#EAE4DA] dark:border-[#344639] bg-white dark:bg-[#1F2B23] text-[#233126] dark:text-[#F8FAF7]'
              }`}
            >
              {isPasscodeVerified ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <KeyRound className="w-3.5 h-3.5 text-accent-fg shrink-0" />
              )}
              <span className="truncate">1. Sandi Admin</span>
            </div>

            <div
              className={`px-3 py-2 rounded-xl border flex items-center gap-2 font-medium ${
                isPasscodeVerified && isAuthorizedAdminUser
                  ? 'border-accent bg-accent-soft text-accent-fg'
                  : isPasscodeVerified
                    ? 'border-[#EAE4DA] dark:border-[#344639] bg-white dark:bg-[#1F2B23] text-[#233126] dark:text-[#F8FAF7]'
                    : 'border-[#EFEAE1] dark:border-[#2C3A30] bg-[#FAF8F4]/70 dark:bg-[#121A15] text-[#8E968F] dark:text-[#7D8B80]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">2. Akun Admin</span>
            </div>
          </div>

          {statusLoading ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
                Memeriksa keamanan portal...
              </p>
            </div>
          ) : !isPasscodeVerified ? (
            <form onSubmit={handlePasscodeSubmit} className="space-y-4">
              {!passcodeConfigured && (
                <div className="rounded-xl bg-[#FBF7EC] dark:bg-[#C69C4D]/15 border border-[#F5EBD0] dark:border-[#C69C4D]/35 px-3.5 py-2.5 text-xs text-[#8C6725] dark:text-[#F2CF88]">
                  Sandi Admin belum diatur di server. Buat sandi admin Anda untuk pertama kali agar
                  klien tidak dapat mengakses dashboard.
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                  {passcodeConfigured ? 'Masukkan Sandi Admin' : 'Buat Sandi Admin Baru'}
                </label>
                <div className="relative">
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    autoFocus
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder={
                      passcodeConfigured ? 'Masukkan sandi rahasia admin...' : 'Minimal 6 karakter...'
                    }
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-sm text-[#233126] dark:text-[#F8FAF7] placeholder:text-[#8E968F] dark:placeholder:text-[#93A397] focus:outline-none focus-border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode((p) => !p)}
                    aria-label={showPasscode ? 'Sembunyikan sandi' : 'Lihat sandi'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#7D877E] dark:text-[#BCC8BF] hover:text-[#233126] dark:hover:text-white cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!passcodeConfigured && (
                <div>
                  <label className="block text-xs font-medium text-[#556257] dark:text-[#D4DFD6] mb-1.5">
                    Konfirmasi Sandi Admin
                  </label>
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    required
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Ulangi sandi admin..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-sm text-[#233126] dark:text-[#F8FAF7] placeholder:text-[#8E968F] dark:placeholder:text-[#93A397] focus:outline-none focus-border-accent"
                  />
                </div>
              )}

              {localError && (
                <p className="text-xs text-[#B85D68] dark:text-[#F4B4BC] bg-[#FDF4F5] dark:bg-[#D88C94]/15 border border-[#F2CFD3] dark:border-[#D88C94]/30 rounded-xl px-3.5 py-2.5">
                  {localError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#556257] dark:text-[#D4DFD6] btn-3d-secondary cursor-pointer"
                >
                  Kembali ke Katalog
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs font-semibold btn-3d-primary cursor-pointer disabled:opacity-60"
                >
                  <span>
                    {submitting
                      ? 'Memverifikasi...'
                      : passcodeConfigured
                        ? 'Buka Portal Admin'
                        : 'Simpan & Lanjutkan'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {isBlockedNonAdmin ? (
                <div className="rounded-2xl bg-[#FDF4F5] dark:bg-[#D88C94]/15 border border-[#F2CFD3] dark:border-[#D88C94]/35 p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#B85D68] dark:text-[#F4B4BC] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#B85D68] dark:text-[#F4B4BC]">
                        Akses Ditolak untuk Akun Pelanggan
                      </p>
                      <p className="text-xs text-[#616E63] dark:text-[#D4DFD6] leading-relaxed">
                        Akun <span className="font-semibold">{user?.email}</span> bukan akun Admin
                        resmi Elviora. Silakan keluar dan masuk menggunakan akun Google Admin studio.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void onSignOutNonAdmin()}
                      className="px-3.5 py-2 rounded-xl bg-[#B85D68] text-white text-xs font-semibold cursor-pointer hover:brightness-95"
                    >
                      Ganti Akun Google
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void onSignOutNonAdmin();
                        onClose();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#556257] dark:text-[#D4DFD6] cursor-pointer"
                    >
                      Kembali ke Katalog
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-accent-soft border border-accent-soft px-3.5 py-2.5 flex items-center gap-2 text-xs text-accent-fg font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Sandi Admin terverifikasi. Lanjutkan masuk dengan Google Admin.</span>
                  </div>

                  {(authError || localError) && (
                    <p className="text-xs text-[#B85D68] dark:text-[#F4B4BC] bg-[#FDF4F5] dark:bg-[#D88C94]/15 border border-[#F2CFD3] dark:border-[#D88C94]/30 rounded-xl px-3.5 py-2.5">
                      {authError || localError}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={signingInGoogle}
                    onClick={() => void handleGoogleAdminLogin()}
                    className="w-full inline-flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-white text-sm font-medium btn-3d-primary cursor-pointer disabled:opacity-60"
                  >
                    <svg
                      className="w-4 h-4 bg-white rounded-full p-0.5"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                      />
                    </svg>
                    <span>
                      {signingInGoogle ? 'Menghubungkan Google...' : 'Masuk dengan Google Admin'}
                    </span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
