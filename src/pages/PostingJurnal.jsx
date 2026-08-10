import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import { Lock, RefreshCw, Send, FileText, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';

const PostingJurnal = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();

    const [bulan, setBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'));
    const [tahun, setTahun] = useState(String(now.getFullYear()));
    const [yearList, setYearList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    const [statusSummary, setStatusSummary] = useState({
        unposted_jurnal: 0,
        unposted_cashbank: 0,
        unposted_vendor: 0,
        total_unposted: 0
    });
    const [unpostedList, setUnpostedList] = useState([]);

    const fetchYearList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/posting-jurnal/year-options', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = res.data?.data || [];
            setYearList(list);
            if (list.length > 0 && !list.some(y => y.tahun === tahun)) {
                setTahun(list[0].tahun);
            }
        } catch (err) {
            console.error("Gagal load year options:", err);
        }
    };

    const fetchPostingStatus = async (isManualRefresh = false) => {
        if (!bulan || !tahun) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/gl/posting-jurnal/status?bulan=${bulan}&tahun=${tahun}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.status === 'success') {
                setStatusSummary(res.data.summary);
                setUnpostedList(res.data.unposted_list || []);

                // Notifikasi toast saat user klik Refresh manual
                if (isManualRefresh) {
                    const Toast = Swal.mixin({
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000,
                        timerProgressBar: true,
                    });
                    Toast.fire({
                        icon: 'success',
                        title: `Status Pembukuan ${bulan}/${tahun} Diperbarui!`
                    });
                }
            }
        } catch (err) {
            console.error("Gagal cek status posting:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchYearList();
    }, []);

    useEffect(() => {
        fetchPostingStatus(false);
    }, [bulan, tahun]);

    const handleProcessPosting = (e) => {
        e.preventDefault();

        Swal.fire({
            title: 'PROSES POSTING PEMBUKUAN?',
            text: `Apakah Anda yakin ingin melakukan Closing / Posting Pembukuan untuk periode ${bulan}/${tahun}? Transaksi pada periode ini akan dikunci.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#0284c7',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Posting Sekarang!',
            cancelButtonText: 'Batal',
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                setProcessing(true);
                try {
                    const token = localStorage.getItem('token');
                    await api.post('/gl/posting-jurnal/process', {
                        bulan: bulan,
                        tahun: tahun
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire({
                        title: 'BERHASIL!',
                        text: `Posting Pembukuan Akhir Bulan Periode ${bulan}/${tahun} Berhasil Diselesaikan!`,
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });

                    fetchPostingStatus(false);
                } catch (err) {
                    Swal.fire({
                        title: 'GAGAL!',
                        text: err.response?.data?.message || 'Gagal memproses posting pembukuan.',
                        icon: 'error',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                } finally {
                    setProcessing(false);
                }
            }
        });
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header Panel */}
            <div className={`p-6 rounded-2xl border shadow-xs ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                            <Lock size={24} />
                        </div>
                        <div>
                            <h1 className="text-lg font-black uppercase tracking-wider">POSTING PEMBUKUAN AKHIR BULAN</h1>
                            <p className="text-xs text-slate-500">Modul penutupan dan penguncian transaksi pembukuan periode akuntansi.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => fetchPostingStatus(true)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin text-sky-600' : ''} /> Refresh Status
                    </button>
                </div>

                {/* Form Periode */}
                <form onSubmit={handleProcessPosting} className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="font-bold text-xs text-slate-600 block mb-2">BULAN (MM)</label>
                            <select
                                value={bulan}
                                onChange={(e) => setBulan(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-sky-500 text-sm"
                            >
                                <option value="01">01 - JANUARI</option>
                                <option value="02">02 - FEBRUARI</option>
                                <option value="03">03 - MARET</option>
                                <option value="04">04 - APRIL</option>
                                <option value="05">05 - MEI</option>
                                <option value="06">06 - JUNI</option>
                                <option value="07">07 - JULI</option>
                                <option value="08">08 - AGUSTUS</option>
                                <option value="09">09 - SEPTEMBER</option>
                                <option value="10">10 - OKTOBER</option>
                                <option value="11">11 - NOVEMBER</option>
                                <option value="12">12 - DESEMBER</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-xs text-slate-600 block mb-2">TAHUN (YYYY)</label>
                            <select
                                value={tahun}
                                onChange={(e) => setTahun(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-xl font-bold font-mono text-slate-800 outline-none focus:border-sky-500 text-sm"
                            >
                                {yearList.length > 0 ? (
                                    yearList.map((y, idx) => (
                                        <option key={idx} value={y.tahun}>
                                            {y.tahun}
                                        </option>
                                    ))
                                ) : (
                                    <option value={now.getFullYear()}>{now.getFullYear()}</option>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Cards Status Unposted */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                            <span className="text-xs font-bold block text-amber-600">UNPOSTED JURNAL</span>
                            <span className="text-2xl font-black font-mono">{statusSummary.unposted_jurnal}</span>
                            <span className="text-[10px] block text-amber-600">Transaksi Jurnal Umum</span>
                        </div>

                        <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900">
                            <span className="text-xs font-bold block text-sky-600">UNPOSTED KAS / BANK</span>
                            <span className="text-2xl font-black font-mono">{statusSummary.unposted_cashbank}</span>
                            <span className="text-[10px] block text-sky-600">Transaksi Penerimaan/Pengeluaran Kas</span>
                        </div>

                        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900">
                            <span className="text-xs font-bold block text-purple-600">UNPOSTED PEMBAYARAN VENDOR</span>
                            <span className="text-2xl font-black font-mono">{statusSummary.unposted_vendor}</span>
                            <span className="text-[10px] block text-purple-600">Pelunasan Tagihan Vendor</span>
                        </div>
                    </div>

                    {/* Tabel Rincian Transaksi Unposted */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText size={16} className="text-slate-600" />
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                                RINCIAN TRANSAKSI UNPOSTED PERIODE {bulan}/{tahun} ({unpostedList.length})
                            </h3>
                        </div>

                        {unpostedList.length > 0 ? (
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                                            <th className="p-3">NO. TRANSAKSI</th>
                                            <th className="p-3">TANGGAL</th>
                                            <th className="p-3">MODUL</th>
                                            <th className="p-3">DESKRIPSI / KETERANGAN</th>
                                            <th className="p-3 text-right">NOMINAL (RP)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {unpostedList.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition">
                                                <td className="p-3 font-mono font-bold text-sky-600">{item.no_trans}</td>
                                                <td className="p-3 font-mono text-slate-700">{item.tanggal}</td>
                                                <td className="p-3">
                                                    <span className="font-bold text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded">
                                                        {item.modul}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-slate-600">{item.deskripsi}</td>
                                                <td className="p-3 text-right font-mono font-bold text-emerald-600">
                                                    Rp {(item.nominal || 0).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-500">
                                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                                <p className="font-bold text-xs text-slate-700">Tidak ada transaksi UNPOSTED untuk periode {bulan}/{tahun}.</p>
                                <p className="text-[11px] text-slate-400">Seluruh transaksi pada bulan ini sudah diposting atau belum ada transaksi baru.</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        {/* 🌟 TOMBOL PROSES POSTING DIBUAT DENGAN OPSI AKTIF/BISA DIKLIK KAPAN SAJA */}
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-md uppercase cursor-pointer flex items-center gap-2 text-xs"
                        >
                            <Send size={16} />
                            {processing ? 'MEMPROSES POSTING...' : `PROSES POSTING (${bulan}/${tahun})`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PostingJurnal;