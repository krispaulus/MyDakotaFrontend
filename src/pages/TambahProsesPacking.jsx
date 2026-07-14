import React, { useState, useEffect } from 'react';
import { Layers, X, RefreshCw, Info, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';
import Swal from 'sweetalert2';

const TambahProsesPacking = ({ isDarkMode = false, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [loadingBTT, setLoadingBTT] = useState(false);
    const [bttList, setBttList] = useState([]);
    const [selectedBtt, setSelectedBtt] = useState('');
    const [activeAgen, setActiveAgen] = useState(localStorage.getItem('active_agen_id') || 'PUSAT DAKOTA');

    // 📡 Ambil data resi/BTT yang outstanding (belum di-packing) dari backend
    useEffect(() => {
        const fetchBttOutstanding = async () => {
            setLoadingBTT(true);
            try {
                const token = localStorage.getItem('token');
                // Mengarah ke endpoint pencarian BTT yang siap di-packing bray
                const response = await api.get('/marketing/btt-outstanding-packing', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data && response.data.status === "success") {
                    setBttList(response.data.data || []);
                }
            } catch (err) {
                console.error("Gagal memuat outstanding BTT:", err);
                setBttList([]);
            } finally {
                setLoadingBTT(false);
            }
        };
        fetchBttOutstanding();
    }, []);

    // 📡 Fungsi eksekusi tombol PROSES ke database backend
    const handleProsesPacking = async (e) => {
        e.preventDefault();

        // 🚨 1. BENTENG VALIDASI AWAL (Jika Belum Pilih BTT)
        if (!selectedBtt) {
            Swal.fire({
                icon: 'warning',
                title: 'PERINGATAN BRAY!',
                text: 'Silakan pilih Nomor BTT terlebih dahulu sebelum memproses!',
                confirmButtonColor: '#f59e0b', // Warna amber biar senada
                confirmButtonText: 'OKE SIAP',
                customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl font-bold uppercase text-xs px-5 py-2.5' }
            });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.post('/marketing/proses-packing/add', {
                bttt_id: selectedBtt,
                agen_id: activeAgen
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // 🎉 2. NOTIFIKASI SUKSES KASTA TERTINGGI (200 OK)
            if (response.data && response.data.status === "success") {
                Swal.fire({
                    icon: 'success',
                    title: 'PROSES PACKING BERHASIL',
                    text: `Nomor BTT ${selectedBtt} sukses masuk antrean packing kargo!`,
                    confirmButtonColor: '#0b0ff5ff',
                    confirmButtonText: 'OKE',
                    customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl font-bold uppercase text-xs px-5 py-2.5' }
                }).then(() => {
                    onClose(); // Tutup modal & refresh tabel utama setelah klik tombol Oke bray
                });
            }
        } catch (err) {
            console.error("Gagal memproses packing:", err);

            // 💥 3. NOTIFIKASI GAGAL / ERROR DARI BACKEND (500 / 400)
            const errMsg = err.response?.data?.message || err.message;
            Swal.fire({
                icon: 'error',
                title: 'PROSES PACKING GAGAL!',
                text: `Gagal memproses data bray: ${errMsg}`,
                confirmButtonColor: '#rose-500',
                confirmButtonText: 'CEK KEMBALI',
                customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl font-bold uppercase text-xs px-5 py-2.5' }
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 text-slate-800">
            {/* Header Pop-up Form */}
            <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div>
                    <h1 className="text-xl font-black tracking-wider uppercase text-emerald-600">Proses Packing</h1>
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">{activeAgen}</h2>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-full transition-all"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Form Pilihan Dropdown BTT */}
            <form onSubmit={handleProsesPacking} className="space-y-6">
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
                    <div>
                        <label className="text-slate-600 uppercase block mb-2 text-xs font-black tracking-wider">
                            NOMOR BTT :
                        </label>

                        {loadingBTT ? (
                            <div className="w-full h-12 border border-slate-200 bg-slate-50 rounded-xl flex items-center px-4 gap-2 text-xs font-bold text-slate-400">
                                <RefreshCw className="animate-spin text-indigo-600" size={14} />
                                <span>Mencari nomor resi yang belum dipacking...</span>
                            </div>
                        ) : bttList.length === 0 ? (
                            <div className="w-full h-12 border border-amber-200 bg-amber-50/50 rounded-xl flex items-center px-4 gap-2 text-xs font-bold text-amber-700">
                                <Info size={14} />
                                <span>Tidak ada antrean nomor BTT untuk agen ini bray!</span>
                            </div>
                        ) : (
                            <select
                                value={selectedBtt}
                                onChange={(e) => setSelectedBtt(e.target.value)}
                                className="w-full h-12 px-4 border-2 border-amber-300 bg-amber-50/30 rounded-xl outline-none focus:border-indigo-500 text-slate-800 font-black tracking-wide text-sm transition-all shadow-inner"
                                required
                            >
                                <option value="">-- KETIK / PILIH NOMOR BTT RESI --</option>
                                {bttList.map((btt) => {
                                    // Berikan nilai cadangan string kosong jika data dari DB bernilai null/kosong bray
                                    const asalName = btt.bttt_asal_name || btt.bttt_asalname || '';
                                    const tujuanNama = btt.bttt_tujuan_nama || '';
                                    const tujuanKota = btt.bttt_tujuan_kota || '';

                                    return (
                                        <option key={btt.bttt_id} value={btt.bttt_id}>
                                            {btt.bttt_id} - {asalName.toUpperCase()} ➔ {tujuanNama.toUpperCase()} ({tujuanKota.toUpperCase()})
                                        </option>
                                    );
                                })}
                            </select>
                        )}
                    </div>
                </div>

                {/* Grup Tombol Kendali Aksi */}
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 h-11 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-md text-xs uppercase tracking-wider transition-all"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={loading || !selectedBtt}
                        className="px-6 h-11 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-black rounded-xl shadow-md text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                        {loading ? 'Memproses...' : 'Proses'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TambahProsesPacking;