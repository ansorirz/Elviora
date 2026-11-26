import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Maximize2,
  Move,
  RotateCcw,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { renderCroppedLogo } from '../utils/imageUtils';

interface LogoCropModalProps {
  open: boolean;
  imageSrc: string | null;
  storeName: string;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => Promise<void>;
}

const SIZE_OPTIONS: Array<{
  size: 128 | 200 | 280;
  label: string;
  desc: string;
}> = [
  { size: 128, label: 'Kecil', desc: '128 × 128 px · Ringan' },
  { size: 200, label: 'Sedang', desc: '200 × 200 px · Standar' },
  { size: 280, label: 'Besar', desc: '280 × 280 px · Tajam' },
];

export function LogoCropModal({
  open,
  imageSrc,
  storeName,
  onCancel,
  onConfirm,
}: LogoCropModalProps) {
  const [outputSize, setOutputSize] = useState<128 | 200 | 280>(200);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [bgMode, setBgMode] = useState<'transparent' | 'white'>('transparent');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sidebarPreviewUrl, setSidebarPreviewUrl] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImgRef = useRef<HTMLImageElement | null>(null);
  const [imgVersion, setImgVersion] = useState(0);
  const dragStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    origOffsetX: number;
    origOffsetY: number;
  }>({ dragging: false, startX: 0, startY: 0, origOffsetX: 0, origOffsetY: 0 });

  useEffect(() => {
    if (!open || !imageSrc) return;
    setOutputSize(200);
    setFitMode('cover');
    setBgMode('transparent');
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setErrorMsg('');

    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      loadedImgRef.current = img;
      setImgVersion((v) => v + 1);
    };
    img.onerror = () => {
      if (!active) return;
      setErrorMsg('Gambar logo tidak dapat dimuat.');
    };
    img.src = imageSrc;

    return () => {
      active = false;
      loadedImgRef.current = null;
    };
  }, [open, imageSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = loadedImgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const natW = img.naturalWidth || img.width || size;
    const natH = img.naturalHeight || img.height || size;
    const safeZoom = Math.max(0.6, Math.min(2.6, zoom || 1));

    ctx.clearRect(0, 0, size, size);
    if (bgMode === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
    }

    const baseScale =
      fitMode === 'cover' ? Math.max(size / natW, size / natH) : Math.min(size / natW, size / natH);
    const drawScale = baseScale * safeZoom;
    const drawW = natW * drawScale;
    const drawH = natH * drawScale;
    const dx = (size - drawW) / 2 + offsetX * (size * 0.45);
    const dy = (size - drawH) / 2 + offsetY * (size * 0.45);

    ctx.drawImage(img, dx, dy, drawW, drawH);

    try {
      setSidebarPreviewUrl(canvas.toDataURL('image/png'));
    } catch {
      // Ignore tainted canvas preview
    }
  }, [fitMode, bgMode, zoom, offsetX, offsetY, imgVersion]);

  if (!open || !imageSrc) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origOffsetX: offsetX,
      origOffsetY: offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStateRef.current.dragging) return;
    const dx = (e.clientX - dragStateRef.current.startX) / 110;
    const dy = (e.clientY - dragStateRef.current.startY) / 110;
    setOffsetX(Math.max(-1, Math.min(1, dragStateRef.current.origOffsetX + dx)));
    setOffsetY(Math.max(-1, Math.min(1, dragStateRef.current.origOffsetY + dy)));
  };

  const handlePointerUp = () => {
    dragStateRef.current.dragging = false;
  };

  const handleConfirm = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const dataUrl = await renderCroppedLogo(imageSrc, {
        outputSize,
        fitMode,
        bgMode,
        zoom,
        offsetX,
        offsetY,
      });
      await onConfirm(dataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan logo Elviora.');
    } finally {
      setSaving(false);
    }
  };

  const previewDisplayPx = outputSize === 128 ? 144 : outputSize === 200 ? 180 : 212;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#233126]/55 dark:bg-black/70 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] surface-3d w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-[#16201A] px-6 py-4 border-b border-[#EFEAE1] dark:border-[#344639] flex items-center justify-between z-10">
          <div>
            <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
              Atur Ukuran &amp; Pas Bingkai Logo Elviora
            </h3>
            <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
              Sesuaikan ukuran, mode pas, dan posisi agar logo tampil tepat ke dalam bingkai.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup"
            className="p-2 rounded-xl text-[#7D877E] dark:text-[#BCC8BF] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-xl bg-[#FDF4F5] dark:bg-[#D88C94]/15 border border-[#F2CFD3] dark:border-[#D88C94]/30 px-3.5 py-2.5 text-xs text-[#B85D68] dark:text-[#F4B4BC]">
              {errorMsg}
            </div>
          )}

          {/* Interactive Logo Canvas Stage */}
          <div className="rounded-2xl bg-[#FAF8F4] dark:bg-[#121814] border border-[#EAE4DA] dark:border-[#344639] p-5 flex flex-col items-center justify-center gap-3.5">
            <div className="flex flex-wrap items-center justify-between w-full gap-2 text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
              <span className="inline-flex items-center gap-1">
                <Move className="w-3.5 h-3.5 text-accent-fg" />
                Seret logo untuk memposisikan
              </span>

              <div className="inline-flex rounded-lg bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setFitMode('cover');
                    setZoom(1);
                    setOffsetX(0);
                    setOffsetY(0);
                  }}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                    fitMode === 'cover'
                      ? 'bg-accent text-white'
                      : 'text-[#616E63] dark:text-[#BCC8BF]'
                  }`}
                >
                  Pas Penuh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFitMode('contain');
                    setZoom(1);
                    setOffsetX(0);
                    setOffsetY(0);
                  }}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                    fitMode === 'contain'
                      ? 'bg-accent text-white'
                      : 'text-[#616E63] dark:text-[#BCC8BF]'
                  }`}
                >
                  Utuh (Fit)
                </button>
              </div>
            </div>

            <div className="h-[220px] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={280}
                height={280}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  width: `${previewDisplayPx}px`,
                  height: `${previewDisplayPx}px`,
                  backgroundImage:
                    bgMode === 'transparent'
                      ? 'linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,0.05) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.05) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.05) 75%)'
                      : undefined,
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
                className="rounded-2xl border-2 border-accent shadow-md cursor-grab active:cursor-grabbing touch-none transition-all duration-200 bg-white dark:bg-[#1E2720]"
              />
            </div>

            {/* Live Header Preview */}
            <div className="w-full pt-3 border-t border-[#EAE4DA]/80 dark:border-[#344639] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#EAE4DA] dark:border-[#344639] bg-white dark:bg-[#1F2B23] shrink-0">
                  {sidebarPreviewUrl && (
                    <img
                      src={sidebarPreviewUrl}
                      alt="Pratinjau logo"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-xs text-[#233126] dark:text-[#F8FAF7] leading-tight">
                    Elviora
                  </p>
                  <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF] truncate">
                    {storeName || 'Pratinjau Tampilan Sidebar'}
                  </p>
                </div>
              </div>

              <div className="inline-flex rounded-lg bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] p-0.5 text-[10px] shrink-0">
                <button
                  type="button"
                  onClick={() => setBgMode('transparent')}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                    bgMode === 'transparent'
                      ? 'bg-accent text-white'
                      : 'text-[#616E63] dark:text-[#BCC8BF]'
                  }`}
                >
                  Transparan
                </button>
                <button
                  type="button"
                  onClick={() => setBgMode('white')}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                    bgMode === 'white'
                      ? 'bg-accent text-white'
                      : 'text-[#616E63] dark:text-[#BCC8BF]'
                  }`}
                >
                  Putih
                </button>
              </div>
            </div>
          </div>

          {/* Output Resolution Selector */}
          <div>
            <label className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7] inline-flex items-center gap-1.5 mb-2">
              <Maximize2 className="w-3.5 h-3.5 text-accent-fg" />
              Pilih Ukuran Resolusi Logo
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {SIZE_OPTIONS.map((opt) => {
                const selected = outputSize === opt.size;
                return (
                  <button
                    key={opt.size}
                    type="button"
                    onClick={() => setOutputSize(opt.size)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-accent bg-accent-soft surface-3d-subtle'
                        : 'border-[#EAE4DA] dark:border-[#344639] bg-[#FAF8F4]/70 dark:bg-[#1F2B23]/70 hover:border-[#C5D3C7]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-xs text-[#233126] dark:text-[#F8FAF7]">
                        {opt.label}
                      </span>
                      {selected && <Check className="w-3.5 h-3.5 text-accent-fg" />}
                    </div>
                    <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF] mt-0.5">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scale / Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#556257] dark:text-[#D4DFD6]">
                Skala Logo ({Math.round(zoom * 100)}%)
              </span>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setOffsetX(0);
                  setOffsetY(0);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-accent-fg hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Posisi
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
                aria-label="Perkecil skala logo"
                className="p-1.5 rounded-lg border border-[#EAE4DA] dark:border-[#344639] text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min={0.6}
                max={2.6}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 cursor-pointer"
                style={{ accentColor: 'var(--accent)' }}
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.6, Number((z + 0.1).toFixed(2))))}
                aria-label="Perbesar skala logo"
                className="p-1.5 rounded-lg border border-[#EAE4DA] dark:border-[#344639] text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 px-6 py-4 border-t border-[#EFEAE1] dark:border-[#344639] flex items-center justify-end gap-2.5 bg-[#FAF8F4]/95 dark:bg-[#151C17]/95">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] text-xs font-medium text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] btn-3d-secondary cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleConfirm()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {saving ? 'Menyimpan...' : 'Pas & Simpan Logo'}
          </button>
        </div>
      </div>
    </div>
  );
}
