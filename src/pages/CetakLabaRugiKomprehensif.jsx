import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import { Search, Printer, FileSpreadsheet, RefreshCw, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import Swal from 'sweetalert2';

const CetakLabaRugiKomprehensif = () => {
    const { isDarkMode } = useDarkMode();

    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

    const [filterParams, setFilterParams] = useState({
        bulan: currentMonth,
        tahun: '2023',
        cabang: localStorage.getItem('active_agen_id') || '1',
        jnslap: 'SA',    // 'SA' = s/d Periode, 'N' = Hanya Bulan Terpilih
        komparasi: 'N'   // 'Y' = Dengan Tahun Lalu, 'N' = Tahun Berjalan Saja
    });

    const [cabangList, setCabangList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState({
        tahunSekarang: '2023',
        tahunLalu: '2022',
        pendapatan: [],
        beban: [],
        totalPendapatanNow: 0,
        totalPendapatanLalu: 0,
        totalBebanNow: 0,
        totalBebanLalu: 0,
        labaBersihNow: 0,
        labaBersihLalu: 0
    });

    useEffect(() => {
        const fetchCabang = async () => {
            try {
                const res = await api.get('/agens');
                setCabangList(res.data.data || []);
            } catch (err) {
                console.error("Gagal load agen:", err);
            }
        };
        fetchCabang();
    }, []);

    const fetchReport = async (e, modeJns = filterParams.jnslap, modeKomp = filterParams.komparasi) => {
        if (e) e.preventDefault();
        setLoading(true);

        const activeParams = { ...filterParams, jnslap: modeJns, komparasi: modeKomp };
        setFilterParams(activeParams);

        try {
            const res = await api.get('/gl/labarugi-komprehensif-report', { params: activeParams });

            setReportData({
                tahunSekarang: res.data.tahun_sekarang,
                tahunLalu: res.data.tahun_lalu,
                pendapatan: res.data.pendapatan || [],
                beban: res.data.beban || [],
                totalPendapatanNow: res.data.total_pendapatan_now || 0,
                totalPendapatanLalu: res.data.total_pendapatan_lalu || 0,
                totalBebanNow: res.data.total_beban_now || 0,
                totalBebanLalu: res.data.total_beban_lalu || 0,
                labaBersihNow: res.data.laba_bersih_now || 0,
                labaBersihLalu: res.data.laba_bersih_lalu || 0
            });

            if (e) {
                Swal.fire({
                    title: 'BERHASIL',
                    text: 'Laporan Laba Rugi Komprehensif Berhasil Dimuat!',
                    icon: 'success',
                    confirmButtonColor: '#0284c7'
                });
            }
        } catch (err) {
            console.error("Gagal load Laporan:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>

            {/* Header Page */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                    <h1 className="text-base font-black uppercase tracking-wider text-sky-600 flex items-center gap-2">
                        <TrendingUp size={20} /> CETAK LABA RUGI DAN PENGHASILAN KOMPREHENSIF LAIN
                    </h1>
                    <p className="text-[11px] text-gray-400 font-medium">
                        Laporan kinerja keuangan operasional dan hasil usaha komprehensif perusahaan.
                    </p>
                </div>
            </div>

            {/* Panel Filter */}
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 text-sky-600 font-black tracking-wider border-b border-slate-100 pb-2 text-xs">
                    <Search size={16} />
                    <span>PANEL FILTER OPSI CETAK</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 uppercase block">Bulan</label>
                        <select
                            value={filterParams.bulan}
                            onChange={e => setFilterParams({ ...filterParams, bulan: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                        >
                            {Array.from({ length: 12 }, (_, i) => {
                                const m = String(i + 1).padStart(2, '0');
                                return <option key={m} value={m}>Bulan {m}</option>;
                            })}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 uppercase block">Tahun</label>
                        <input
                            type="number"
                            maxLength={4}
                            value={filterParams.tahun}
                            onChange={e => setFilterParams({ ...filterParams, tahun: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 uppercase block">Agen / Cabang</label>
                        <select
                            value={filterParams.cabang}
                            onChange={e => setFilterParams({ ...filterParams, cabang: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                        >
                            <option value="1">KONSOLIDASI (SEMUA AGEN)</option>
                            {cabangList.map((c) => (
                                <option key={c.agen_id} value={c.agen_id}>{c.agen_nama}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 🎯 4 TOMBOL OPSIONAL WARNA BIRU & BIRU MUDA */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={(e) => fetchReport(e, 'SA', 'N')}
                            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase cursor-pointer flex items-center justify-center gap-2 transition shadow-xs"
                        >
                            <RefreshCw size={14} /> CETAK SAMPAI PERIODE TERPILIH (YTD)
                        </button>

                        <button
                            type="button"
                            onClick={(e) => fetchReport(e, 'N', 'N')}
                            className="p-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs uppercase cursor-pointer flex items-center justify-center gap-2 transition shadow-xs"
                        >
                            <RefreshCw size={14} /> CETAK HANYA BULAN TERPILIH
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={(e) => fetchReport(e, 'SA', 'Y')}
                            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase cursor-pointer flex items-center justify-center gap-2 transition shadow-xs"
                        >
                            <RefreshCw size={14} /> CETAK SAMPAI PERIODE TERPILIH & TAHUN LALU
                        </button>

                        <button
                            type="button"
                            onClick={(e) => fetchReport(e, 'N', 'Y')}
                            className="p-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase cursor-pointer flex items-center justify-center gap-2 transition shadow-xs"
                        >
                            <RefreshCw size={14} /> CETAK BULAN TERPILIH & TAHUN LALU
                        </button>
                    </div>
                </div>
            </div>

            {/* Performance Banner (Laba = Hijau, Defisit = Biru Muda Soft) */}
            <div className={`p-5 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-4 ${reportData.labaBersihNow >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-sky-50 border-sky-200 text-sky-900'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${reportData.labaBersihNow >= 0 ? 'bg-emerald-600 text-white' : 'bg-sky-600 text-white'}`}>
                        {reportData.labaBersihNow >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider block opacity-75">HASIL LABA RUGI BERSIH ({reportData.tahunSekarang})</span>
                        <h2 className="text-xl font-black">
                            STATUS: {reportData.labaBersihNow >= 0 ? 'SURPLUS / LABA BERSIH' : 'DEFISIT / RUGI BERSIH'}
                        </h2>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-xs font-bold uppercase block opacity-75">TOTAL LABA BERSIH</span>
                    <span className="text-2xl font-black font-mono">
                        Rp {(reportData.labaBersihNow || 0).toLocaleString('id-ID')}
                    </span>
                </div>
            </div>

            {/* Tabel Result (Pendapatan vs Beban Operasional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 🔹 Pendapatan (Revenue) */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="bg-slate-100 p-3 font-black text-xs uppercase text-slate-800 border-b flex items-center gap-2">
                        <DollarSign size={16} className="text-emerald-600" /> PENDAPATAN (REVENUE)
                    </div>
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                            <tr>
                                <th className="p-3">KODE AKUN</th>
                                <th className="p-3">NAMA AKUN</th>
                                <th className="p-3 text-right">THN {reportData.tahunSekarang} (RP)</th>
                                {filterParams.komparasi === 'Y' && <th className="p-3 text-right">THN {reportData.tahunLalu} (RP)</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                <tr><td colSpan="4" className="p-6 text-center animate-pulse">Memuat...</td></tr>
                            ) : reportData.pendapatan.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-3 font-mono font-bold text-emerald-700">{item.ca_id}</td>
                                    <td className="p-3 uppercase">{item.ca_name}</td>
                                    <td className="p-3 text-right font-bold text-slate-900">
                                        {(Number(item.saldo_now) || 0).toLocaleString('id-ID')}
                                    </td>
                                    {filterParams.komparasi === 'Y' && (
                                        <td className="p-3 text-right font-bold text-slate-500">
                                            {(Number(item.saldo_lalu) || 0).toLocaleString('id-ID')}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 font-black text-xs border-t text-slate-900">
                            <tr>
                                <td colSpan="2" className="p-3 text-right uppercase">TOTAL PENDAPATAN:</td>
                                <td className="p-3 text-right text-emerald-700 text-sm">
                                    Rp {(reportData.totalPendapatanNow || 0).toLocaleString('id-ID')}
                                </td>
                                {filterParams.komparasi === 'Y' && (
                                    <td className="p-3 text-right text-slate-500 text-sm">
                                        Rp {(reportData.totalPendapatanLalu || 0).toLocaleString('id-ID')}
                                    </td>
                                )}
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* 🔹 Beban Operasional (Expenses) -> Tampilan Warna Biru Muda */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="bg-slate-100 p-3 font-black text-xs uppercase text-slate-800 border-b flex items-center gap-2">
                        <DollarSign size={16} className="text-sky-600" /> BEBAN OPERASIONAL (EXPENSES)
                    </div>
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                            <tr>
                                <th className="p-3">KODE AKUN</th>
                                <th className="p-3">NAMA AKUN</th>
                                <th className="p-3 text-right">THN {reportData.tahunSekarang} (RP)</th>
                                {filterParams.komparasi === 'Y' && <th className="p-3 text-right">THN {reportData.tahunLalu} (RP)</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                <tr><td colSpan="4" className="p-6 text-center animate-pulse">Memuat...</td></tr>
                            ) : reportData.beban.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-3 font-mono font-bold text-sky-600">{item.ca_id}</td>
                                    <td className="p-3 uppercase">{item.ca_name}</td>
                                    <td className="p-3 text-right font-bold text-slate-900">
                                        {(Number(item.saldo_now) || 0).toLocaleString('id-ID')}
                                    </td>
                                    {filterParams.komparasi === 'Y' && (
                                        <td className="p-3 text-right font-bold text-slate-500">
                                            {(Number(item.saldo_lalu) || 0).toLocaleString('id-ID')}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 font-black text-xs border-t text-slate-900">
                            <tr>
                                <td colSpan="2" className="p-3 text-right uppercase">TOTAL BEBAN:</td>
                                <td className="p-3 text-right text-sky-600 text-sm">
                                    Rp {(reportData.totalBebanNow || 0).toLocaleString('id-ID')}
                                </td>
                                {filterParams.komparasi === 'Y' && (
                                    <td className="p-3 text-right text-slate-500 text-sm">
                                        Rp {(reportData.totalBebanLalu || 0).toLocaleString('id-ID')}
                                    </td>
                                )}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default CetakLabaRugiKomprehensif;