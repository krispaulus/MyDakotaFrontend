import React, { useState, useEffect, useRef } from 'react';
import {
    UploadCloud,
    ImageIcon,
    Trash2,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Plus,
    RotateCw,
    Save
} from 'lucide-react';
import api from '../../api/axios';

const TOTAL_SLOTS = 5;

const defaultSlotData = (index) => ({
    index,
    url: '',
    previewUrl: '',
    tag: `DAKOTA PROMO #${index + 1}`,
    title: index === 0 ? 'Solusi Ekspedisi &' : 'Layanan Pengiriman',
    highlight: index === 0 ? 'Kargo Terpercaya' : 'Cepat & Aman',
    desc: 'Pengiriman barang ke seluruh Nusantara dengan jangkauan rute terluas dan tarif terbaik.',
    isUploading: false,
    isSaving: false
});

const ManajemenBanner = () => {
    const [slots, setSlots] = useState(
        Array.from({ length: TOTAL_SLOTS }, (_, i) => defaultSlotData(i))
    );
    const [isLoading, setIsLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const fileInputRefs = useRef([]);

    useEffect(() => {
        fetchAllBanners();
    }, []);

    const fetchAllBanners = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/settings/login-banner');
            let bannerList = [];

            if (Array.isArray(res.data?.banners)) {
                bannerList = res.data.banners;
            } else if (res.data?.banner_url) {
                try {
                    const parsed = JSON.parse(res.data.banner_url);
                    bannerList = Array.isArray(parsed) ? parsed : [];
                } catch {
                    bannerList = [];
                }
            }

            const backendHost = api.defaults.baseURL
                ? api.defaults.baseURL.replace(/\/api\/?$/, '')
                : `${window.location.protocol}//${window.location.hostname}:9090`;

            setSlots(Array.from({ length: TOTAL_SLOTS }, (_, i) => {
                const item = bannerList[i];
                const base = defaultSlotData(i);

                if (!item) return base;

                // Dukungan jika item berupa objek atau string lama
                const rawUrl = typeof item === 'object' ? item.url || '' : item;
                let fullUrl = '';
                if (rawUrl) {
                    const match = rawUrl.match(/\/uploads\/.*$/);
                    const clean = match ? match[0] : rawUrl;
                    fullUrl = clean.startsWith('/uploads') ? `${backendHost}${clean}` : clean;
                }

                return {
                    index: i,
                    url: rawUrl,
                    previewUrl: fullUrl,
                    tag: (typeof item === 'object' && item.tag) ? item.tag : base.tag,
                    title: (typeof item === 'object' && item.title) ? item.title : base.title,
                    highlight: (typeof item === 'object' && item.highlight) ? item.highlight : base.highlight,
                    desc: (typeof item === 'object' && item.desc) ? item.desc : base.desc,
                    isUploading: false,
                    isSaving: false
                };
            }));
        } catch (err) {
            console.error('Gagal mengambil daftar banner:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Update state teks form
    const handleTextChange = (slotIndex, field, value) => {
        setSlots(prev => prev.map((s, idx) => idx === slotIndex ? { ...s, [field]: value } : s));
    };

    // Handler Pilih & Langsung Upload Foto
    const handleFileSelect = async (slotIndex, e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setAlert({ show: true, type: 'error', message: 'Ukuran file maksimal 5 MB!' });
            return;
        }

        const currentSlot = slots[slotIndex];
        const localPreview = URL.createObjectURL(file);
        setSlots(prev => prev.map((s, idx) => idx === slotIndex ? { ...s, previewUrl: localPreview, isUploading: true } : s));

        const formData = new FormData();
        formData.append('banner_file', file);
        formData.append('slot_index', slotIndex);
        formData.append('tag', currentSlot.tag);
        formData.append('title', currentSlot.title);
        formData.append('highlight', currentSlot.highlight);
        formData.append('desc', currentSlot.desc);

        try {
            await api.post('/settings/upload-login-banner', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAlert({ show: true, type: 'success', message: `Foto Banner Slot #${slotIndex + 1} berhasil diperbarui!` });
            fetchAllBanners();
        } catch (err) {
            setAlert({ show: true, type: 'error', message: err.response?.data?.message || `Gagal unggah foto slot #${slotIndex + 1}` });
            fetchAllBanners();
        }
    };

    // Handler Simpan Judul & Teks Kata-Kata
    const handleSaveTextOnly = async (slotIndex) => {
        const currentSlot = slots[slotIndex];
        setSlots(prev => prev.map((s, idx) => idx === slotIndex ? { ...s, isSaving: true } : s));

        try {
            await api.post('/settings/save-banner-text', {
                slot_index: slotIndex,
                tag: currentSlot.tag,
                title: currentSlot.title,
                highlight: currentSlot.highlight,
                desc: currentSlot.desc
            });
            setAlert({ show: true, type: 'success', message: `Teks & Kata-kata Slot #${slotIndex + 1} berhasil disimpan!` });
        } catch (err) {
            setAlert({ show: true, type: 'error', message: 'Gagal menyimpan teks banner.' });
        } finally {
            setSlots(prev => prev.map((s, idx) => idx === slotIndex ? { ...s, isSaving: false } : s));
        }
    };

    // Handler Hapus Banner
    const handleDeleteBanner = async (slotIndex) => {
        if (!window.confirm(`Yakin ingin menghapus Banner Slot #${slotIndex + 1}?`)) return;

        try {
            await api.delete(`/settings/login-banner/${slotIndex}`);
            setAlert({ show: true, type: 'success', message: `Banner Slot #${slotIndex + 1} berhasil dihapus!` });
            fetchAllBanners();
        } catch (err) {
            setAlert({ show: true, type: 'error', message: 'Gagal menghapus banner.' });
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 font-['Inter']">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Manajemen Banner Depan</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Atur gambar banner dan teks kata-kata (Tag, Judul Utama, Highlight, dan Deskripsi) untuk halaman landing page depan.
                    </p>
                </div>
                <button
                    onClick={fetchAllBanners}
                    disabled={isLoading}
                    className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition"
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    <span>Muat Ulang</span>
                </button>
            </div>

            {/* Alert */}
            {alert.show && (
                <div className={`p-4 rounded-xl flex items-center gap-3 border transition-all ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    {alert.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="text-sm font-medium">{alert.message}</span>
                </div>
            )}

            {/* Grid 5 Slot Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {slots.map((slot, idx) => (
                    <div
                        key={slot.index}
                        className="bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-400 transition-all shadow-xs overflow-hidden flex flex-col justify-between"
                    >
                        {/* Header Slot */}
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Banner Slot #{idx + 1} {idx === 0 && <span className="text-blue-600 font-extrabold">(Utama)</span>}
                            </span>
                            {slot.previewUrl && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteBanner(idx)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                    title="Hapus banner ini"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        {/* Area Preview Foto */}
                        <div className="relative aspect-video bg-gray-100 flex items-center justify-center overflow-hidden group">
                            {slot.previewUrl ? (
                                <>
                                    <img src={slot.previewUrl} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRefs.current[idx]?.click()}
                                            disabled={slot.isUploading}
                                            className="px-3 py-1.5 bg-white text-gray-800 text-xs font-bold rounded-lg shadow hover:bg-gray-100 transition flex items-center gap-1.5"
                                        >
                                            <RotateCw size={13} />
                                            <span>Ganti Foto</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div
                                    onClick={() => fileInputRefs.current[idx]?.click()}
                                    className="w-full h-full flex flex-col items-center justify-center gap-2 p-6 text-center cursor-pointer hover:bg-blue-50/40 transition text-gray-400 hover:text-blue-500"
                                >
                                    <div className="p-3 bg-white rounded-full shadow-2xs border border-gray-200">
                                        <Plus size={20} className="text-gray-400" />
                                    </div>
                                    <span className="text-xs font-semibold">Klik untuk tambah gambar</span>
                                </div>
                            )}

                            {slot.isUploading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
                                    <RefreshCw size={22} className="animate-spin text-blue-600" />
                                    <span className="text-xs font-bold text-gray-700">Mengunggah Foto...</span>
                                </div>
                            )}
                        </div>

                        <input
                            type="file"
                            accept="image/*"
                            ref={el => fileInputRefs.current[idx] = el}
                            onChange={(e) => handleFileSelect(idx, e)}
                            className="hidden"
                        />

                        {/* 📝 4 INPUTAN KATA-KATA */}
                        <div className="p-4 space-y-3 bg-white border-t border-gray-100">
                            {/* 1. Tag Kategori */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    1. Tag Banner (Badge Atas):
                                </label>
                                <input
                                    type="text"
                                    value={slot.tag}
                                    onChange={(e) => handleTextChange(idx, 'tag', e.target.value)}
                                    placeholder="Contoh: DAKOTA PROMO #1"
                                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-semibold"
                                />
                            </div>

                            {/* 2. Judul Utama */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    2. Judul Utama:
                                </label>
                                <input
                                    type="text"
                                    value={slot.title}
                                    onChange={(e) => handleTextChange(idx, 'title', e.target.value)}
                                    placeholder="Contoh: Layanan Pengiriman"
                                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-bold"
                                />
                            </div>

                            {/* 3. Sub-Judul (Highlight Biru) */}
                            <div>
                                <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                                    3. Sub-Judul (Teks Highlight Biru):
                                </label>
                                <input
                                    type="text"
                                    value={slot.highlight}
                                    onChange={(e) => handleTextChange(idx, 'highlight', e.target.value)}
                                    placeholder="Contoh: Cepat & Aman"
                                    className="w-full px-3 py-1.5 text-xs border border-blue-200 bg-blue-50/20 text-blue-700 rounded-lg outline-none focus:border-blue-500 font-bold"
                                />
                            </div>

                            {/* 4. Deskripsi Teks */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    4. Deskripsi / Keterangan:
                                </label>
                                <textarea
                                    rows={2}
                                    value={slot.desc}
                                    onChange={(e) => handleTextChange(idx, 'desc', e.target.value)}
                                    placeholder="Contoh: Pengiriman barang ke seluruh Nusantara..."
                                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-500 resize-none font-medium text-gray-600"
                                />
                            </div>
                        </div>

                        {/* Footer Tombol Simpan Teks */}
                        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRefs.current[idx]?.click()}
                                className="px-3 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                            >
                                <UploadCloud size={14} />
                                <span>Foto</span>
                            </button>

                            <button
                                type="button"
                                disabled={slot.isSaving}
                                onClick={() => handleSaveTextOnly(idx)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                            >
                                <Save size={14} />
                                <span>{slot.isSaving ? 'Menyimpan...' : 'Simpan Teks'}</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ManajemenBanner;