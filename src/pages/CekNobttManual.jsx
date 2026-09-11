import React, { useState, useRef } from 'react';
import api from '../api/axios';
import { Search, Printer, AlertTriangle, CheckCircle2, Package, MapPin, Calendar, User, ArrowRight } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';

export default function CekNobttManual() {
    const { isDarkMode } = useDarkMode();
    const [noBtt, setNoBtt] = useState('');
    const [loading, setLoading] = useState(false);
    const [bttData, setBttData] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const inputRef = useRef(null);

    // Auto-padding 12 digit persis fungsi lengkapin() warisan ASP
    const handleBlurPadding = () => {
        const val = noBtt.trim();
        if (val && val.length < 12 && /^\d+$/.test(val)) {
            const padded = val.padStart(12, '0');
            setNoBtt(padded);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();

        let targetNo = noBtt.trim();
        if (!targetNo) {
            Swal.fire('Peringatan', 'Ketik nomor fisik BTT manual atau barcode terlebih dahulu', 'warning');
            return;
        }

        if (targetNo.length < 12 && /^\d+$/.test(targetNo)) {
            targetNo = targetNo.padStart(12, '0');
            setNoBtt(targetNo);
        }

        setLoading(true);
        setHasSearched(true);
        setBttData(null);

        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/mkt/econote/cek-btt?no=${encodeURIComponent(targetNo)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                setBttData(res.data.data);
            }
        } catch (err) {
            if (err.response?.status === 404) {
                setBttData(null);
            } else {
                Swal.fire('Error', err.response?.data?.message || 'Gagal memeriksa nomor BTT', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePrintConote = (nomorConote) => {
        window.open(`/cetak/econote/${nomorConote}`, '_blank');
    };

    return (
        <div className={`min-h-screen p-4 space-y-6 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
            {/* HEADER CARD */}
            <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="max-w-3xl">
                    <h2 className="text-lg font-black tracking-wide text-blue-600 dark:text-blue-400 uppercase flex items-center gap-2">
                        <Package size={22} className="text-blue-600 dark:text-blue-400" /> CEK BTT PENGIRIMAN DARI FISIK NO. BTT MANUAL
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Validasi fisik resi manual kurir dan cek status sinkronisasi ke e-Conote digital.
                        Nomor digit pendek otomatis disesuaikan menjadi 12 digit (zero-padded).
                    </p>
                </div>

                {/* FORM INPUT PENCARIAN */}
                <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl">
                    <div className="relative flex-1">
                        <input
                            ref={inputRef}
                            type="text"
                            maxLength={16}
                            placeholder="Contoh: 009012017A0000321 atau 000000123456"
                            value={noBtt}
                            onChange={(e) => setNoBtt(e.target.value.toUpperCase())}
                            onBlur={handleBlurPadding}
                            className={`w-full px-4 py-3 rounded-xl font-mono font-bold text-sm uppercase outline-none border transition-all ${isDarkMode
                                    ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-600 focus:bg-white shadow-xs'
                                }`}
                        />
                        <span className="absolute right-3 top-3.5 text-[10px] text-slate-400 uppercase font-mono">Max 16 Digit</span>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-2 shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        <Search size={16} />
                        {loading ? 'Memvalidasi...' : 'VALIDASI BTT'}
                    </button>
                </form>
            </div>

            {/* HASIL PENCARIAN VALID */}
            {bttData && (
                <div className={`p-6 rounded-2xl border shadow-lg space-y-6 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-blue-900/50' : 'bg-white border-blue-200'
                    }`}>
                    <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-4 border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 block">Status Validasi Fisik</span>
                                <h3 className="text-lg font-black font-mono tracking-tight text-slate-800 dark:text-slate-100">{bttData.conote_nomor}</h3>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => handlePrintConote(bttData.conote_nomor)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                        >
                            <Printer size={16} /> Cetak Lembar e-Conote
                        </button>
                    </div>

                    {/* DETAIL TRANSAKSI GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nomor Fisik BTT Manual</span>
                            <span className="text-sm font-black font-mono text-blue-600 dark:text-blue-400">{bttData.conote_nobttmanual || '-'}</span>
                        </div>

                        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1">
                                <Calendar size={12} /> Tanggal Transaksi
                            </span>
                            <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-200">{bttData.conote_tgl || '-'}</span>
                        </div>

                        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1">
                                <MapPin size={12} /> Trayek Distribusi
                            </span>
                            <div className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
                                <span>{bttData.conote_asal}</span>
                                <ArrowRight size={14} className="text-blue-500" />
                                <span>{bttData.conote_tujuan}</span>
                            </div>
                        </div>
                    </div>

                    {/* PENGIRIM & PENERIMA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/20 border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block mb-1 flex items-center gap-1">
                                <User size={12} /> Identitas Pengirim
                            </span>
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{bttData.pengirim_nama || '-'}</p>
                        </div>

                        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/20 border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block mb-1 flex items-center gap-1">
                                <User size={12} /> Identitas Penerima
                            </span>
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{bttData.penerima_nama || '-'}</p>
                        </div>
                    </div>

                    {/* MUATAN & TARIF */}
                    <div className={`p-4 rounded-xl border flex flex-wrap justify-between items-center gap-4 ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-blue-50/50 border-blue-100'
                        }`}>
                        <div className="flex gap-6 text-xs">
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase block">Jumlah Koli</span>
                                <span className="text-sm font-black text-slate-800 dark:text-slate-100">{bttData.conote_koli} Koli</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase block">Total Berat</span>
                                <span className="text-sm font-black text-slate-800 dark:text-slate-100">{bttData.conote_berat} Kg</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase block">Layanan</span>
                                <span className="text-sm font-black uppercase text-blue-600 dark:text-blue-400">{bttData.conote_layanan}</span>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase block">Total Biaya Kirim</span>
                            <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
                                Rp {Number(bttData.conote_total_tarif || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* NOT FOUND NOTIFICATION */}
            {hasSearched && !loading && !bttData && (
                <div className={`p-8 rounded-2xl border text-center max-w-xl mx-auto space-y-3 ${isDarkMode ? 'bg-slate-900 border-red-900/50 text-slate-300' : 'bg-red-50/50 border-red-100 text-slate-700'
                    }`}>
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mx-auto">
                        <AlertTriangle size={24} />
                    </div>
                    <h4 className="text-sm font-black uppercase text-red-600">Fisik BTT Tidak Ditemukan</h4>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        Nomor resi manual <strong className="font-mono text-slate-800 dark:text-slate-200">[{noBtt}]</strong> belum diinput ke sistem e-Conote oleh cabang asal, atau salah ketik.
                    </p>
                </div>
            )}
        </div>
    );
}