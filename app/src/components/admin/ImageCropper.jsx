import { useEffect, useRef, useState } from 'react';

// Khung cắt ảnh theo tỉ lệ 4:5 (giống khung ảnh món trên trang chủ). Kéo để di chuyển, thanh trượt để phóng to.
const W = 320;
const H = 400;

export default function ImageCropper({ bitmap, onConfirm, onCancel }) {
  const canvasRef = useRef(null);
  const drag = useRef(null);
  const base = Math.max(W / bitmap.width, H / bitmap.height); // tỉ lệ nhỏ nhất để ảnh phủ kín khung

  // "view" gồm mức phóng to và vị trí góc trên trái của ảnh trong khung.
  const [view, setView] = useState({ zoom: 1, ox: (W - bitmap.width * base) / 2, oy: (H - bitmap.height * base) / 2 });

  function clamp(v) {
    const w = bitmap.width * base * v.zoom;
    const h = bitmap.height * base * v.zoom;
    return { ...v, ox: Math.min(0, Math.max(W - w, v.ox)), oy: Math.min(0, Math.max(H - h, v.oy)) };
  }

  // Vẽ lại mỗi khi "view" đổi.
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(bitmap, view.ox, view.oy, bitmap.width * base * view.zoom, bitmap.height * base * view.zoom);
  }, [view, bitmap, base]);

  useEffect(() => { canvasRef.current.focus(); }, []);

  function onZoom(e) {
    const zoom = Number(e.target.value);
    setView((v) => {
      // Phóng to quanh tâm khung: giữ nguyên điểm ảnh đang nằm ở giữa.
      const cx = (W / 2 - v.ox) / (base * v.zoom);
      const cy = (H / 2 - v.oy) / (base * v.zoom);
      return clamp({ zoom, ox: W / 2 - cx * base * zoom, oy: H / 2 - cy * base * zoom });
    });
  }

  function onPointerDown(e) {
    drag.current = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!drag.current) return;
    const k = W / e.currentTarget.getBoundingClientRect().width;
    const d = drag.current;
    setView((v) => clamp({ ...v, ox: d.ox + (e.clientX - d.x) * k, oy: d.oy + (e.clientY - d.y) * k }));
  }

  function onKeyDown(e) {
    const step = 10;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!move) return;
    e.preventDefault();
    setView((v) => clamp({ ...v, ox: v.ox + move[0], oy: v.oy + move[1] }));
  }

  function confirm() {
    // Xuất ảnh 600x750 từ đúng vùng đang nhìn thấy trong khung.
    const out = document.createElement('canvas');
    out.width = 600;
    out.height = 750;
    const k = out.width / W;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(bitmap, view.ox * k, view.oy * k, bitmap.width * base * view.zoom * k, bitmap.height * base * view.zoom * k);
    out.toBlob((blob) => onConfirm(blob), 'image/jpeg', 0.85);
  }

  return (
    <div className="mt-2">
      <p className="mb-1 text-sm text-muted">Kéo ảnh để chọn vị trí cắt, dùng thanh trượt để phóng to. Khung hiển thị đúng như trên trang chủ.</p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        tabIndex={0}
        aria-label="Vùng cắt ảnh. Dùng phím mũi tên để di chuyển ảnh."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onKeyDown={onKeyDown}
        className="block aspect-[4/5] w-full max-w-80 cursor-grab touch-none rounded-lg border-2 border-primary bg-white active:cursor-grabbing"
      />
      <label htmlFor="mn-crop-zoom" className="mt-3 block">Phóng to</label>
      <input id="mn-crop-zoom" type="range" min="1" max="3" step="0.01" value={view.zoom} onChange={onZoom} className="w-full max-w-80" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={confirm} className="rounded-md bg-accent px-6 py-2.5 font-bold text-on-accent">Dùng ảnh này</button>
        <button type="button" onClick={onCancel} className="rounded-md border border-primary px-4 py-2 text-primary">Hủy</button>
      </div>
    </div>
  );
}
