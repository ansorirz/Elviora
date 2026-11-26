import React, { useEffect, useRef, useState } from 'react';
import { Check, Maximize2, Move, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { renderCroppedAvatar } from '../utils/imageUtils';

interface AvatarCropModalProps {
  open: boolean;
  imageSrc: string | null;
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

export function AvatarCropModal({
  open,
  imageSrc,
  onCancel,
  onConfirm,
}: AvatarCropModalProps) {
  const [outputSize, setOutputSize] = useState<128 | 200 | 280>(200);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [previewShape, setPreviewShape] = useState<'rounded' | 'circle'>('rounded');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setErrorMsg('');

    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      loadedImgRef.current = img;
      setImgVersion((v) => v + 1);
    };
    img.onerror = () => {
      if (!active) return;
      setErrorMsg('Gambar tidak dapat dimuat.');
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

    const frameSize = canvas.width;
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    const baseSide = Math.min(natW, natH);
    const cropSide = baseSide / Math.max(1, zoom);

    const maxShiftX = Math.max(0, (natW - cropSide) / 2);
    const maxShiftY = Math.max(0, (natH - cropSide) / 2);
    const centerX = natW / 2 - offsetX * maxShiftX;
    const centerY = natH / 2 - offsetY * maxShiftY;
    const sx = Math.max(0, Math.min(natW - cropSide, centerX - cropSide / 2));
    const sy = Math.max(0, Math.min(natH - cropSide, centerY - cropSide / 2));

    ctx.clearRect(0, 0, frameSize, frameSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, frameSize, frameSize);
    ctx.drawImage(img, sx, sy, cropSide, cropSide, 0, 0, frameSize, frameSize);
  }, [zoom, offsetX, offsetY, imgVersion]);

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
    const dx = (e.clientX - dragStateRef.current.startX) / 90;
    const dy = (e.clientY - dragStateRef.current.startY) / 90;
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
      const dataUrl = await renderCroppedAvatar(imageSrc, {
        outputSize,
        zoom,
        offsetX,
        offsetY,
      });
      await onConfirm(dataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan foto profil.');
    } finally {
      setSaving(false);
    }
  };

  const previewDisplayPx = outputSize === 128 ? 148 : outputSize === 200 ? 184 : 216;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#233126]/55 dark:bg-black/70 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] surface-3d w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EFEAE1] dark:border-[#344639] flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
              Atur Ukuran &amp; Potongan Foto Profil
            </h3>
            <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
              Pilih ukuran hasil, zoom, dan geser posisi foto sebelum disimpan.
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

          {/* Interactive Preview Stage */}
          <div className="rounded-2xl bg-[#FAF8F4] dark:bg-[#121814] border border-[#EAE4DA] dark:border-[#344639] p-5 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center justify-between w-full text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">
              <span className="inline-flex items-center gap-1">
                <Move className="w-3.5 h-3.5 text-accent-fg" />
                Seret gambar untuk memposisikan
              </span>
              <div className="inline-flex rounded-lg bg-white dark:bg-[#16201A] border border-[#EAE4DA] dark:border-[#344639] p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPreviewShape('rounded')}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                    previewShape === 'rounded'
                      ? 'bg-accent text-white'
                      : 'text-[#616E63] dark:text-[#BCC8BF]'
                  }`}
                >
                  Kotak
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewShape('circle')}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                    previewShape === 'circle'
                      ? 'bg-accent text-white'
                      : 'text-[#616E63] dark:text-[#BCC8BF]'
                  }`}
                >
                  Bulat
                </button>
              </div>
            </div>

            <div className="h-[224px] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={280}
                height={280}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ width: `${previewDisplayPx}px`, height: `${previewDisplayPx}px` }}
                className={`border-2 border-accent shadow-md cursor-grab active:cursor-grabbing touch-none transition-all duration-200 ${
                  previewShape === 'circle' ? 'rounded-full' : 'rounded-2xl'
                }`}
              />
            </div>

            <span className="font-mono text-[11px] text-accent-fg font-medium">
              Resolusi terpilih: {outputSize} × {outputSize} px · Zoom {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Output Size Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7] inline-flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-accent-fg" />
                Pilih Ukuran Foto Profil
              </label>
            </div>
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

          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#556257] dark:text-[#D4DFD6]">
                Zoom / Pembesaran
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
                onClick={() => setZoom((z) => Math.max(1, Number((z - 0.15).toFixed(2))))}
                aria-label="Perkecil zoom"
                className="p-1.5 rounded-lg border border-[#EAE4DA] dark:border-[#344639] text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min={1}
                max={2.6}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 cursor-pointer"
                style={{ accentColor: 'var(--accent)' }}
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.6, Number((z + 0.15).toFixed(2))))}
                aria-label="Perbesar zoom"
                className="p-1.5 rounded-lg border border-[#EAE4DA] dark:border-[#344639] text-[#556257] dark:text-[#D4DFD6] hover:bg-[#FAF8F4] dark:hover:bg-[#222C24] cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#EFEAE1] dark:border-[#344639] flex items-center justify-end gap-2.5 bg-[#FAF8F4]/60 dark:bg-[#151C17]/60">
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
            className="px-4 py-2 rounded-xl text-white text-xs font-medium btn-3d-primary cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : 'Simpan Foto Profil'}
          </button>
        </div>
      </div>
    </div>
  );
}
