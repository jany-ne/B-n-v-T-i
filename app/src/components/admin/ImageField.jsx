import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { publicImageUrl } from '../../lib/supabase.js';
import ImageCropper from './ImageCropper.jsx';
import { asset } from '../../lib/asset.js';

export default function ImageField({ value, onChange, onBusyChange }) {
  const { request } = useAuth();
  const lastBitmap = useRef(null); // giữ ảnh gốc vừa chọn để có thể chỉnh lại vùng cắt
  const [cropping, setCropping] = useState(null); // ảnh đang được cắt
  const [status, setStatus] = useState('');

  function pick(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setStatus('Chỉ nhận ảnh JPG, PNG hoặc WebP.'); e.target.value = ''; return; }
    if (file.size > 10 * 1024 * 1024) { setStatus('Ảnh quá lớn (tối đa 10MB).'); e.target.value = ''; return; }
    setStatus('');
    createImageBitmap(file)
      .then((bmp) => { lastBitmap.current = bmp; setCropping(bmp); })
      .catch(() => { setStatus('Không đọc được ảnh này.'); })
      .finally(() => { e.target.value = ''; });
  }

  async function upload(blob) {
    setCropping(null);
    if (!blob) { setStatus('Không xử lý được ảnh.'); return; }
    const name = `${crypto.randomUUID ? crypto.randomUUID() : Date.now()}.jpg`;
    onBusyChange(true);
    setStatus('Đang tải ảnh lên...');
    try {
      const res = await request(`/storage/v1/object/menu-images/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'false' },
        body: blob,
      });
      if (!res.ok) throw new Error(res.status);
      onChange(publicImageUrl(name));
      setStatus('Đã tải ảnh lên.');
    } catch (e) {
      if (e.message !== 'expired') setStatus('Tải ảnh không thành công. Bạn đã chạy supabase-storage.sql chưa?');
    } finally {
      onBusyChange(false);
    }
  }

  function remove() {
    lastBitmap.current = null;
    onChange('');
    setStatus('');
  }

  return (
    <div className="mb-4">
      <label htmlFor="mn-file" className="mb-1 block font-bold">Ảnh món</label>
      <input id="mn-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="w-full rounded-md border border-muted bg-surface px-3 py-2" />

      {cropping && <ImageCropper bitmap={cropping} onConfirm={upload} onCancel={() => setCropping(null)} />}

      {value && !cropping && (
        <div className="mt-2">
          <img src={asset(value)} alt="Ảnh món đã chọn" className="block max-w-40 rounded-lg shadow" />
          <div className="mt-2 flex flex-wrap gap-2">
            {lastBitmap.current && (
              <button type="button" onClick={() => setCropping(lastBitmap.current)} className="rounded-md border border-primary px-3 py-1.5 text-primary">Chỉnh vị trí cắt</button>
            )}
            <button type="button" onClick={remove} className="rounded-md border border-red-700 px-3 py-1.5 text-red-700 dark:border-red-400 dark:text-red-400">Bỏ ảnh</button>
          </div>
        </div>
      )}
      <p role="status" className="mt-1 text-sm text-muted">{status}</p>
    </div>
  );
}
