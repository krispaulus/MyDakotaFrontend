import React, { useState, useEffect, useRef } from 'react';
import {
    UploadCloud,
    Image as ImageIcon,
    Trash2,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Plus,
    RotateCw
} from 'lucide-react';
import api from '../../api/axios';

const TOTAL_SLOTS = 5;

const ManajemenBanner = () => {
    // Inisialisasi 5 Slot
    const [slots, setSlots] = useState(
        Array.from({ length: TOTAL_SLOTS }, (_, i) => ({
            index: i,
            url: '',          // URL dari backend
            file: null,       // File baru jika sedang diunggah
            previewUrl: '',   // Live preview
            isUploading: false
        }))
    );

    const [isLoading, setIsLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const fileInputRefs = useRef([]);

    useEffect(() => {
        fetchAllBanners();
    }, []);

    // 🚀 1. Ambil seluruh banner dari Backend
    const fetchAllBanners = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/settings/login-banner');
            let bannerList = [];

            // Backend bisa mengembalikan array langsung atau format JSON string
            if (Array.isArray(res.data?.banners)) {
                bannerList = res.data.banners;
            } else if (res.data?.banner_url) {
                try {
                    const parsed = JSON.parse(res.data.banner_url);
                    bannerList = Array.isArray(parsed) ? parsed : [res.data.banner_url];
                } catch {
                    bannerList = [res.data.banner_url];
                }
            }

            // Tentukan backendHost dinamis
            const backendHost = api.defaults.baseURL
                ? api.defaults.baseURL.replace(/\/api\/?$/, '')
                : `${window.location.protocol}//${window.location.hostname}:9090`;

            // Petakan ke 5 slot
            setSlots(Array.from({ length: TOTAL_SLOTS }, (_, i) => {
                const rawPath = bannerList[i] || '';
                let fullUrl = '';
                if (rawPath) {
                    const match = rawPath.match(/\/uploads\/.*$/);
                    const clean = match ? match[0] : rawPath;
                    fullUrl = clean.startsWith('/uploads') ? `${backendHost}${clean}` : clean;
                }

                return {
                    index: i,
                    url: rawPath,
                    file: null,
                    previewUrl: fullUrl,
                    isUploading: false
                };
            }));
        } catch (err) {
            console.error('Gagal mengambil daftar banner:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // 🚀 2. Saat user memilih gambar pada slot tertentu
    const handleFileSelect = async (slotIndex, e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setAlert({ show: true, type: 'error', message: 'Ukuran file maksimal 5 MB!' });
            return;
        }

        // Tampilkan preview lokal sementara
        const localPreview = URL.createObjectURL(file);
        setSlots(prev => prev.map((s, idx) => idx === slotIndex ? { ...s, previewUrl: localPreview, isUploading: true } : s));

        // Langsung upload gambar slot tersebut ke backend
        const formData = new FormData();
        formData.append('banner_file', file);
        formData.append('slot_index', slotIndex);

        try {
            const res = await api.post('/settings/upload-login-banner', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setAlert({
                show: true,
                type: 'success',
                message: `Banner Slot #${slotIndex + 1} berhasil diperbarui!`
            });
            fetchAllBanners();
        } catch (err) {
            setAlert({
                show: true,
                type: 'error',
                message: err.response?.data?.message || `Gagal mengunggah banner slot #${slotIndex + 1}`
            });
            fetchAllBanners();
        } finally {
            // Reset input ref agar bisa pilih file yang sama jika perlu
            if (fileInputRefs.current[slotIndex]) {
                fileInputRefs.current[slotIndex].value = '';
            }
        }
    };

    // 🚀 3. Hapus banner pada slot tertentu
    const handleDeleteBanner = async (slotIndex) => {
        if (!window.confirm(`Yakin ingin menghapus Banner Slot #${slotIndex + 1}?`)) return;

        setSlots(prev => prev.map((s, idx) => idx === slotIndex ? { ...s, isUploading: true } : s));

        try {
            // Panggil API hapus slot banner
            await api.delete(`/settings/login-banner/${slotIndex}`);

            setAlert({
                show: true,
                type: 'success',
                message: `Banner Slot #${slotIndex + 1} berhasil dihapus!`
            });
            fetchAllBanners();
        } catch (err) {
            // Fallback: jika backend belum ada endpoint DELETE khusus slot, kirim update array kosong
            try {
                await api.post('/settings/delete-login-banner', { slot_index: slotIndex });
                fetchAllBanners();
            } catch (fallbackErr) {
                console.error(fallbackErr);
                setAlert({
                    show: true,
                    type: 'error',
                    message: 'Gagal menghapus banner dari server.'
                });
                fetchAllBanners();
            }
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header Title */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Manajemen Banner Depan</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Kelola hingga 5 banner carousel (HUT Dakota, Promo, Hari Raya) untuk landing page depan.
                    </p>
                </div>
                <button
                    onClick={fetchAllBanners}
                    disabled={isLoading}
                    className="self-start md:self-auto px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition"
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    <span>Muat Ulang</span>
                </button>
            </div>

            {/* Alert Message */}
            {alert.show && (
                <div className={`p-4 rounded-xl flex items-center gap-3 border transition-all ${alert.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
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
                        {/* Header Tiap Slot */}
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Banner Slot #{idx + 1} {idx === 0 && <span className="text-blue-600 font-extrabold">(Utama)</span>}
                            </span>
                            {slot.previewUrl && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteBanner(idx)}
                                    disabled={slot.isUploading}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                    title="Hapus banner ini"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        {/* Input File Tersembunyi per Slot */}
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            ref={el => fileInputRefs.current[idx] = el}
                            onChange={(e) => handleFileSelect(idx, e)}
                            className="hidden"
                        />

                        {/* Kontainer Preview Foto */}
                        <div className="relative aspect-video bg-gray-100 flex items-center justify-center overflow-hidden group">
                            {slot.previewUrl ? (
                                <>
                                    <img
                                        src={slot.previewUrl}
                                        alt={`Banner Slot ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Overlay Hover untuk Ganti Foto */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRefs.current[idx]?.click()}
                                            disabled={slot.isUploading}
                                            className="px-3.5 py-1.5 bg-white text-gray-800 text-xs font-bold rounded-lg shadow hover:bg-gray-100 transition flex items-center gap-1.5"
                                        >
                                            <RotateCw size={13} />
                                            <span>Ganti Foto</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                /* Tampilan jika slot masih kosong */
                                <div
                                    onClick={() => fileInputRefs.current[idx]?.click()}
                                    className="w-full h-full flex flex-col items-center justify-center gap-2 p-6 text-center cursor-pointer hover:bg-blue-50/40 transition text-gray-400 hover:text-blue-500"
                                >
                                    <div className="p-3 bg-white rounded-full shadow-2xs border border-gray-200">
                                        <Plus size={22} className="text-gray-400" />
                                    </div>
                                    <span className="text-xs font-semibold">Klik untuk tambah gambar</span>
                                    <span className="text-[10px] text-gray-400">Maks. 5 MB (Lanskap)</span>
                                </div>
                            )}

                            {/* Loading overlay saat upload slot ini */}
                            {slot.isUploading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
                                    <RefreshCw size={24} className="animate-spin text-blue-600" />
                                    <span className="text-xs font-bold text-gray-700">Mengunggah...</span>
                                </div>
                            )}
                        </div>

                        {/* Footer Tombol Aksi */}
                        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRefs.current[idx]?.click()}
                                disabled={slot.isUploading}
                                className="w-full py-2 px-3 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                            >
                                <UploadCloud size={15} />
                                <span>{slot.previewUrl ? 'Upload Ulang' : 'Pilih Gambar'}</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Informasi Format */}
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl flex items-start gap-3">
                <ImageIcon size={20} className="text-blue-600 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-900 leading-relaxed">
                    <p className="font-bold">Tips Banner Carousel:</p>
                    <p>• Disarankan menggunakan gambar rasio lanskap (16:9 atau minimal 1280x720 piksel).</p>
                    <p>• Jika hanya 1 atau 2 slot yang diisi, carousel hanya akan memutar slot gambar yang aktif tersebut.</p>
                </div>
            </div>
        </div>
    );
};

export default ManajemenBanner;