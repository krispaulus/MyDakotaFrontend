import React, { useState, useEffect } from 'react';
import { MapPin, X, Save, AlertCircle, Building2 } from 'lucide-react';
import api from '../../api/axios';
import Swal from 'sweetalert2';

const EditWilayahModal = ({ isOpen, onClose, rowData, onSave }) => {
    if (!isOpen || !rowData) return null;

    const [form, setForm] = useState({
        consignee: rowData.consignee || '',
        address: rowData.address || '',
        propinsi: rowData.propinsi && rowData.propinsi !== '-' ? rowData.propinsi : '',
        kota: rowData.kota && rowData.kota !== '-' ? rowData.kota : '',
        kecamatan: rowData.kecamatan && rowData.kecamatan !== '-' ? rowData.kecamatan : '',
        kelurahan: rowData.kelurahan && rowData.kelurahan !== '-' ? rowData.kelurahan : '',
        kodepos: rowData.kodepos && rowData.kodepos !== '-' ? rowData.kodepos : '',
    });

    const [geoSuggestions, setGeoSuggestions] = useState([]);
    const [kelurahanSuggestions, setKelurahanSuggestions] = useState([]);
    const [showGeoDropdown, setShowGeoDropdown] = useState(false);
    const [showKelDropdown, setShowKelDropdown] = useState(false);
    const [loadingGeo, setLoadingGeo] = useState(false);

    // Ambil daftar kelurahan jika kecamatan sudah ada sebelumnya
    useEffect(() => {
        if (form.kecamatan) {
            loadKelurahanList(form.kecamatan);
        }
    }, []);

    // 1. Live search Kecamatan (Ketik minimal 2 huruf)
    const handleSearchKecamatan = async (val) => {
        const text = val.toUpperCase();
        setForm(prev => ({ ...prev, kecamatan: text }));

        if (text.trim().length < 2) {
            setGeoSuggestions([]);
            setShowGeoDropdown(false);
            return;
        }

        setLoadingGeo(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/btt/search-geo?q=${encodeURIComponent(text)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && res.data.status === "success") {
                setGeoSuggestions(Array.isArray(res.data.data) ? res.data.data : []);
                setShowGeoDropdown(true);
            }
        } catch (err) {
            console.warn("Gagal cari wilayah:", err);
            setGeoSuggestions([]);
        } finally {
            setLoadingGeo(false);
        }
    };

    // 2. Saat Kecamatan Dipilih: Otomatis isi Provinsi & Kota, lalu muat daftar Kelurahan
    const handleSelectKecamatan = (item) => {
        setForm(prev => ({
            ...prev,
            kecamatan: item.kecamatan || '',
            propinsi: item.propinsi || '',
            kota: item.kabupaten || '',
            kelurahan: '',
            kodepos: ''
        }));
        setShowGeoDropdown(false);
        setGeoSuggestions([]);
        loadKelurahanList(item.kecamatan);
    };

    const loadKelurahanList = async (kecamatanName) => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/btt/get-kelurahan?kecamatan=${encodeURIComponent(kecamatanName)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && res.data.status === "success") {
                setKelurahanSuggestions(res.data.data || []);
            }
        } catch (err) {
            console.warn("Gagal load kelurahan:", err);
            setKelurahanSuggestions([]);
        }
    };

    // 3. Saat Kelurahan Dipilih: Otomatis isi Kode Pos
    const handleSelectKelurahan = (sub) => {
        setForm(prev => ({
            ...prev,
            kelurahan: sub.kelurahan || '',
            kodepos: sub.kodepos || ''
        }));
        setShowKelDropdown(false);
    };

    const handleSimpan = () => {
        if (!form.kecamatan || !form.propinsi || !form.kota || !form.kelurahan) {
            Swal.fire({
                icon: 'warning',
                title: 'Data Wilayah Belum Lengkap',
                text: 'Kecamatan, Provinsi, Kota/Kabupaten, dan Kelurahan wajib diisi sebelum menyimpan!',
                confirmButtonColor: '#004b84',
                customClass: { container: 'z-[999999]' }
            });
            return;
        }

        onSave({
            ...rowData,
            propinsi: form.propinsi,
            kota: form.kota,
            kecamatan: form.kecamatan,
            kelurahan: form.kelurahan,
            kodepos: form.kodepos
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">

                {/* Header Modal */}
                <div className="px-6 py-4 bg-[#004b84] text-white flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                        <MapPin size={18} />
                        <h3 className="text-sm font-black uppercase tracking-wider">LENGKAPI INFORMASI WILAYAH TUJUAN</h3>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-rose-300 font-bold text-lg cursor-pointer">
                        ✕
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 space-y-4 text-xs text-slate-800 max-h-[80vh] overflow-y-auto">
                    {/* Ringkasan Penerima & Alamat */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <div className="font-bold text-[#004b84] flex items-center gap-1.5 uppercase">
                            <Building2 size={14} /> {form.consignee}
                        </div>
                        <div className="text-slate-500 text-[11px] leading-relaxed">
                            {form.address}
                        </div>
                    </div>

                    <div className="text-center font-bold text-[#004b84] text-xs tracking-wider uppercase pb-1 border-b border-slate-200">
                        INFORMASI TUJUAN AREA KIRIM (STANDAR BTT)
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. KECAMATAN AUTOCOMPLETE */}
                        <div className="relative">
                            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                                KECAMATAN : <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full p-2.5 border border-slate-300 rounded-xl font-bold uppercase text-slate-800 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-2xs"
                                placeholder="Ketik minimal 2 huruf..."
                                value={form.kecamatan}
                                onChange={(e) => handleSearchKecamatan(e.target.value)}
                                onFocus={() => {
                                    if (geoSuggestions.length > 0) setShowGeoDropdown(true);
                                }}
                            />

                            {/* Dropdown Melayang Rekomendasi Kecamatan */}
                            {showGeoDropdown && geoSuggestions.length > 0 && (
                                <div className="absolute left-0 right-0 top-[62px] bg-white border-2 border-teal-400 text-slate-900 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto text-xs divide-y divide-slate-100">
                                    {geoSuggestions.map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleSelectKecamatan(item)}
                                            className="p-3 hover:bg-teal-50 cursor-pointer transition-colors"
                                        >
                                            📍 <span className="font-black text-teal-700">{item.kecamatan}</span>
                                            <span className="text-slate-500 block text-[10px] mt-0.5">
                                                {item.kabupaten}, {item.propinsi} [{item.kodepos || '-'}]
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 2. PROVINSI (OTOMATIS) */}
                        <div>
                            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                                PROVINSI : <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="text"
                                readOnly
                                className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-700 cursor-not-allowed outline-none"
                                placeholder="Otomatis terisi..."
                                value={form.propinsi}
                            />
                        </div>

                        {/* 3. KOTA / KABUPATEN (OTOMATIS) */}
                        <div>
                            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                                KOTA / KABUPATEN : <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="text"
                                readOnly
                                className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-700 cursor-not-allowed outline-none"
                                placeholder="Otomatis terisi..."
                                value={form.kota}
                            />
                        </div>

                        {/* 4. KELURAHAN (PILIHAN DARI SUB-KECAMATAN) */}
                        <div className="relative">
                            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                                KELURAHAN : <span className="text-rose-600">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full p-2.5 border border-slate-300 rounded-xl font-bold uppercase text-slate-800 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-2xs"
                                placeholder={form.kecamatan ? "Pilih kelurahan..." : "Pilih kecamatan dulu"}
                                value={form.kelurahan}
                                disabled={!form.kecamatan}
                                onChange={(e) => {
                                    setForm(prev => ({ ...prev, kelurahan: e.target.value.toUpperCase() }));
                                    setShowKelDropdown(true);
                                }}
                                onFocus={() => setShowKelDropdown(true)}
                            />

                            {/* Dropdown Kelurahan */}
                            {showKelDropdown && kelurahanSuggestions.length > 0 && (
                                <div className="absolute left-0 right-0 top-[62px] bg-white border border-sky-400 text-slate-900 rounded-xl shadow-2xl z-50 max-h-44 overflow-y-auto text-xs divide-y divide-slate-100">
                                    {kelurahanSuggestions
                                        .filter(k => (k.kelurahan || '').toUpperCase().includes((form.kelurahan || '').toUpperCase()))
                                        .map((sub, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleSelectKelurahan(sub)}
                                                className="p-2.5 hover:bg-sky-50 cursor-pointer font-bold text-slate-800 flex items-center justify-between"
                                            >
                                                <span>🏘️ {sub.kelurahan}</span>
                                                <span className="text-slate-400 font-mono text-[11px]">[{sub.kodepos || '-'}]</span>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* 5. KODE POS (OTOMATIS) */}
                        <div className="md:col-span-2">
                            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                                KODE POS :
                            </label>
                            <input
                                type="text"
                                readOnly
                                className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-slate-700 cursor-not-allowed outline-none"
                                placeholder="Otomatis..."
                                value={form.kodepos}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Tombol Aksi */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-200 font-bold rounded-xl uppercase text-xs transition cursor-pointer"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSimpan}
                        className="px-6 py-2 bg-[#004b84] hover:bg-[#003863] text-white font-bold rounded-xl uppercase text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                        <Save size={14} /> Terapkan Wilayah
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditWilayahModal;