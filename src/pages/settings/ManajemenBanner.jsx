import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Image, Save, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../api/axios';

const ManajemenBanner = () => {
    const [previewUrl, setPreviewUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchCurrentBanner();
    }, []);

    const fetchCurrentBanner = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/settings/login-banner');
            if (res.data?.banner_url) {
                setPreviewUrl(res.data.banner_url);
            }
        } catch (err) {
            console.error('Gagal mengambil banner aktif:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setAlert({ show: true, type: 'error', message: 'Ukuran file maksimal 5 MB!' });
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file)); // Live preview lokal
            setAlert({ show: false, type: '', message: '' });
        }
    };

    const handleUploadBanner = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            setAlert({ show: true, type: 'error', message: 'Silakan pilih gambar terlebih dahulu!' });
            return;
        }

        setIsSaving(true);
        setAlert({ show: false, type: '', message: '' });

        const formData = new FormData();
        formData.append('banner_file', selectedFile);

        try {
            const res = await api.post('/settings/upload-login-banner', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setAlert({
                show: true,
                type: 'success',
                message: res.data?.message || 'Banner berhasil diperbarui!'
            });
            setSelectedFile(null);
        } catch (err) {
            setAlert({
                show: true,
                type: 'error',
                message: err.response?.data?.message || 'Gagal mengunggah banner.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Manajemen Banner Depan</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Atur gambar poster perayaan (Lebaran, HUT Dakota, Natal, dll) untuk halaman login depan.
                </p>
            </div>

            {alert.show && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    {alert.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="text-sm font-medium">{alert.message}</span>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 pb-4 mb-6 border-b border-gray-100">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                        <Image size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Poster / Banner Halaman Login</h2>
                        <p className="text-xs text-gray-500">
                            Unggah file gambar beresolusi lanskap (disarankan minimal 1280x720 px, maks. 5 MB).
                        </p>
                    </div>
                </div>

                <form onSubmit={handleUploadBanner} className="space-y-6">
                    {/* Area Drag / Klik Upload */}
                    <div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            className="hidden"
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
                        >
                            <div className="p-3 bg-white rounded-full shadow-sm text-blue-600">
                                <UploadCloud size={28} />
                            </div>
                            <p className="text-sm font-semibold text-gray-700">
                                {selectedFile ? selectedFile.name : 'Klik untuk memilih file banner dari komputer'}
                            </p>
                            <p className="text-xs text-gray-400">Format yang didukung: PNG, JPG, JPEG, WEBP</p>
                        </div>
                    </div>

                    {/* Area Preview */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Live Preview Banner
                        </label>
                        <div className="relative w-full h-64 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Preview Banner"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-center text-gray-400">
                                    <Image size={44} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-xs">Gambar preview akan muncul di sini</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedFile(null);
                                fetchCurrentBanner();
                            }}
                            disabled={isLoading || isSaving}
                            className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl flex items-center gap-2 transition"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            Batal / Reset
                        </button>

                        <button
                            type="submit"
                            disabled={isSaving || !selectedFile}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-200 flex items-center gap-2 transition disabled:opacity-50"
                        >
                            <Save size={16} />
                            {isSaving ? 'Mengunggah...' : 'Simpan Banner'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManajemenBanner;