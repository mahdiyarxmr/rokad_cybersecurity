import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { Crop, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

export const EVENT_COVER_TARGET_W = 1200;
export const EVENT_COVER_TARGET_H = 630;
export const EVENT_COVER_ASPECT = EVENT_COVER_TARGET_W / EVENT_COVER_TARGET_H;
export const EVENT_COVER_MAX_BYTES = 5 * 1024 * 1024;

export const EVENT_COVER_SPEC_LABEL =
  'ابعاد پیشنهادی ۱۲۰۰×۶۳۰ پیکسل (نسبت ~۱.۹۱:۱)؛ حداکثر ۵ مگابایت. اگر عکس بزرگ‌تر یا نسبت‌دار نباشد، قبل از آپلود می‌توانید قسمت دلخواه را ببرید.';

export function needsCoverCrop(naturalW: number, naturalH: number): boolean {
  if (!naturalW || !naturalH) return false;
  if (naturalW > EVENT_COVER_TARGET_W || naturalH > EVENT_COVER_TARGET_H) return true;
  const aspect = naturalW / naturalH;
  const drift = Math.abs(aspect - EVENT_COVER_ASPECT) / EVENT_COVER_ASPECT;
  return drift > 0.08;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  fileName?: string;
  onConfirm: (blob: Blob) => Promise<void> | void;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const stageMaxW = 560;
const stageMaxH = 320;

function fitCoverBox(vw: number, vh: number): ViewBox {
  let w = vw;
  let h = w / EVENT_COVER_ASPECT;
  if (h > vh) {
    h = vh;
    w = h * EVENT_COVER_ASPECT;
  }
  return { x: (vw - w) / 2, y: (vh - h) / 2, w, h };
}

export const EventCoverCropModal: React.FC<Props> = ({
  isOpen,
  onClose,
  imageSrc,
  fileName,
  onConfirm,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [stage, setStage] = useState({ w: stageMaxW, h: stageMaxH });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isConfirming, setIsConfirming] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNat(null);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setIsConfirming(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.min(el.clientWidth || stageMaxW, stageMaxW);
      const h = Math.min(Math.max(el.clientHeight || 200, 200), stageMaxH);
      setStage({ w, h: Math.min(h, Math.round(w / EVENT_COVER_ASPECT) + 40) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNat({ w: img.naturalWidth, h: img.naturalHeight });
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    setOffset({ x: d.ox + (e.clientX - d.startX), y: d.oy + (e.clientY - d.startY) });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const clampZoom = (z: number) => Math.min(3, Math.max(0.5, z));

  const buildCropBlob = useCallback(async (): Promise<Blob | null> => {
    const img = imgRef.current;
    const stageEl = stageRef.current;
    if (!img || !stageEl) return null;

    const stageRect = stageEl.getBoundingClientRect();
    const sw = stageRect.width;
    const sh = stageRect.height;
    if (sw < 1 || sh < 1) return null;

    const view = fitCoverBox(sw, sh);
    const layoutW = img.offsetWidth;
    const layoutH = img.offsetHeight;
    if (layoutW < 1 || layoutH < 1) return null;

    const canvas = document.createElement('canvas');
    canvas.width = EVENT_COVER_TARGET_W;
    canvas.height = EVENT_COVER_TARGET_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const sx = canvas.width / view.w;
    const sy = canvas.height / view.h;

    ctx.save();
    ctx.translate(-view.x * sx, -view.y * sy);
    ctx.scale(sx, sy);

    ctx.translate(sw / 2 + offset.x, sh / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.drawImage(img, -layoutW / 2, -layoutH / 2, layoutW, layoutH);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
    });
  }, [offset.x, offset.y, rotation, zoom]);

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      const blob = await buildCropBlob();
      if (!blob) return;
      await onConfirm(blob);
      onClose();
    } finally {
      setIsConfirming(false);
    }
  };

  const view = nat ? fitCoverBox(stage.w, stage.h) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="انتخاب قسمت بنر رویداد"
      description={
        nat
          ? `عکس فعلی: ${nat.w}×${nat.h} پیکسل — خروجی نهایی: ${EVENT_COVER_TARGET_W}×${EVENT_COVER_TARGET_H}`
          : 'قاب را روی بخش دلخواه بکشید و اندازه را تنظیم کنید'
      }
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div
          ref={stageRef}
          className="relative mx-auto w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-[#0f172a] select-none touch-none"
          style={{ height: Math.min(stageMaxH, Math.round(stageMaxW / EVENT_COVER_ASPECT) + 40), maxHeight: stageMaxH, maxWidth: stageMaxW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              width: view?.w ?? stage.w,
              height: view?.h ?? stage.h,
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              border: '2px solid #59BBAF',
              borderRadius: 8,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              ref={imgRef}
              src={imageSrc}
              alt={fileName || 'پیش‌نمایش برش'}
              draggable={false}
              onLoad={onImgLoad}
              className="max-w-none cursor-grab active:cursor-grabbing"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                transformOrigin: 'center center',
                maxWidth: '92%',
                maxHeight: '92%',
              }}
            />
          </div>
          <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between gap-2 pointer-events-none">
            <span className="px-2 py-1 rounded-md bg-black/60 text-white text-[10px] font-bold">
              بکشید تا جابه‌جا شود
            </span>
            <span className="px-2 py-1 rounded-md bg-black/60 text-white text-[10px] font-bold font-mono">
              {EVENT_COVER_TARGET_W}×{EVENT_COVER_TARGET_H}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z - 0.1))}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-ink-normal dark:text-white hover:bg-gray-50 dark:hover:bg-[#1C2536] transition-all"
            title="کوچک‌نمایی"
            aria-label="کوچک‌نمایی"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(clampZoom(Number(e.target.value)))}
            className="w-40 accent-[#59BBAF]"
            aria-label="بزرگ‌نمایی"
          />
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z + 0.1))}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-ink-normal dark:text-white hover:bg-gray-50 dark:hover:bg-[#1C2536] transition-all"
            title="بزرگ‌نمایی"
            aria-label="بزرگ‌نمایی"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-ink-normal dark:text-white hover:bg-gray-50 dark:hover:bg-[#1C2536] transition-all"
            title="چرخش ۹۰ درجه"
            aria-label="چرخش ۹۰ درجه"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isConfirming}>
            انصراف
          </Button>
          <Button type="button" variant="primary" size="md" onClick={handleConfirm} disabled={isConfirming}>
            <Crop className="w-4 h-4" />
            {isConfirming ? 'در حال پردازش...' : 'برش و آپلود'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read fail'));
    reader.readAsDataURL(file);
  });
}

export function loadImageDimensions(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error('img fail'));
    img.src = src;
  });
}

export async function uploadCoverBlob(blob: Blob, fileName = 'event-cover.jpg'): Promise<string> {
  const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
  const formData = new FormData();
  formData.append('file', file);
  formData.append('moduleName', 'calendar');
  try {
    const { apiClient } = await import('../../../../lib/api/client');
    const uploadRes = await apiClient.post('/storage/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const uploadData = uploadRes.data?.data || uploadRes.data;
    const url = uploadData?.fileUrl || uploadData?.url || '';
    if (url) return url;
  } catch {
    // fall through to data URL
  }
  return readFileAsDataUrl(file);
}
