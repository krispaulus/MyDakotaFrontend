import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import { Search, Printer, FileSpreadsheet, TrendingUp, RefreshCw, TrendingDown, DollarSign } from 'lucide-react';
import Swal from 'sweetalert2';

const CetakRugiLaba = () => {
    const { isDarkMode } = useDarkMode();

    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

    // 📊 State Filter Parameter
    const [filterParams, setFilterParams] = useState({
        bulan: currentMonth,
        tahun: '2023',
        jnslap: 'H',   // 'H' = Header, 'D' = Detail
        cabang: localStorage.getItem('active_agen_id') || '1'
    });

    const [cabangList, setCabangList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState({
        pendapatan: [],
        beban: [],
        totalPendapatan: 0,
        totalBeban: 0,
        labaRugiBersih: 0
    });

    // 🏢 Fetch Cabang / Agen
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

    // 🔄 Fetch Data Rugi Laba
    const fetchRugiLaba = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/rugilaba-report', {
                params: filterParams,
                headers: { Authorization: `Bearer ${token}` }
            });

            setReportData({
                pendapatan: res.data.pendapatan || [],
                beban: res.data.beban || [],
                totalPendapatan: res.data.total_pendapatan || 0,
                totalBeban: res.data.total_beban || 0,
                labaRugiBersih: res.data.laba_rugi_bersih || 0
            });

            if (e) {
                Swal.fire({
                    title: 'BERHASIL',
                    text: `Laporan Rugi/Laba Mode ${filterParams.jnslap === 'H' ? 'HEADER' : 'DETAIL'} Dimuat!`,
                    icon: 'success',
                    confirmButtonColor: '#2563eb'
                });
            }
        } catch (err) {
            console.error("Gagal load Laporan Rugi Laba:", err);
            setReportData({ pendapatan: [], beban: [], totalPendapatan: 0, totalBeban: 0, labaRugiBersih: 0 });
        } finally {
            setLoading(false);
        }
    };

    // 📥 EXPORT TO EXCEL (.XLS)
    const exportToExcelReal = async () => {
        try {
            Swal.fire({
                title: 'MEMPROSES EXCEL',
                text: 'Sedang menyiapkan file Excel Rugi / Laba...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const currentToken = localStorage.getItem('token');
            const queryParams = new URLSearchParams(filterParams).toString();

            const response = await api.get(`/gl/export-rugilaba-xls?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${currentToken}` },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/vnd.ms-excel' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `RUGILABA_${filterParams.bulan}_${filterParams.tahun}.xls`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            Swal.fire({
                title: 'EXPORT EXCEL BERHASIL',
                text: 'File Rugi Laba .xls berhasil diunduh!',
                icon: 'success',
                confirmButtonColor: '#059669'
            });
        } catch (err) {
            console.error("Gagal export Excel:", err);
            Swal.fire('GAGAL EXPORT', 'Terjadi kesalahan saat unduh Excel.', 'error');
        }
    };

    return (
        <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>

            {/* Header Page */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                    <h1 className="text-base font-black uppercase tracking-wider text-blue-600 flex items-center gap-2">
                        <TrendingUp size={20} /> CETAK RUGI / LABA (INCOME STATEMENT)
                    </h1>
                    <p className="text-[11px] text-gray-400 font-medium">
                        Modul ikhtisar pendapatan dan beban biaya operasi perusahaan.
                    </p>
                </div>
            </div>

            {/* 🔍 PANEL FILTER */}
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 text-blue-600 font-black tracking-wider border-b border-slate-100 pb-2 text-xs">
                    <Search size={16} />
                    <span>PANEL FILTER LAPORAN RUGI / LABA</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
                    {/* Bulan */}
                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 uppercase block">Bulan</label>
                        <select
                            value={filterParams.bulan}
                            onChange={e => setFilterParams({ ...filterParams, bulan: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none"
                        >
                            {Array.from({ length: 12 }, (_, i) => {
                                const m = String(i + 1).padStart(2, '0');
                                return <option key={m} value={m}>Bulan {m}</option>;
                            })}
                        </select>
                    </div>

                    {/* Tahun */}
                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 uppercase block">Tahun</label>
                        <input
                            type="number"
                            maxLength={4}
                            value={filterParams.tahun}
                            onChange={e => setFilterParams({ ...filterParams, tahun: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none"
                        />
                    </div>

                    {/* Cabang / Agen */}
                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 uppercase block">Agen / Cabang</label>
                        <select
                            value={filterParams.cabang}
                            onChange={e => setFilterParams({ ...filterParams, cabang: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none"
                        >
                            <option value="1">KONSOLIDASI (SEMUA AGEN)</option>
                            {cabangList.map((c) => (
                                <option key={c.agen_id} value={c.agen_id}>{c.agen_nama}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tipe Tampilan */}
                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 uppercase block">Tipe Tampilan</label>
                        <div className="flex items-center gap-4 pt-2">
                            <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                <input
                                    type="radio"
                                    name="jnslap"
                                    value="H"
                                    checked={filterParams.jnslap === 'H'}
                                    onChange={e => setFilterParams({ ...filterParams, jnslap: e.target.value })}
                                />
                                <span>Header</span>
                            </label>
                            <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                <input
                                    type="radio"
                                    name="jnslap"
                                    value="D"
                                    checked={filterParams.jnslap === 'D'}
                                    onChange={e => setFilterParams({ ...filterParams, jnslap: e.target.value })}
                                />
                                <span>Detail</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={fetchRugiLaba}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2 transition"
                        >
                            <RefreshCw size={14} /> PROSES LAPORAN
                        </button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2 transition"
                        >
                            <Printer size={14} /> CETAK LAPORAN
                        </button>
                        <button
                            type="button"
                            onClick={exportToExcelReal}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2 transition"
                        >
                            <FileSpreadsheet size={14} /> EXPORT TO EXCEL
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition"
                    >
                        KELUAR
                    </button>
                </div>
            </div>

            {/* 📈 RINGKASAN PERFORMANCE (NET PROFIT SUMMARY) */}
            <div className={`p-5 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-4 ${reportData.labaRugiBersih >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${reportData.labaRugiBersih >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                        {reportData.labaRugiBersih >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider block opacity-75">HASIL OPERASIONAL (NET PROFIT / LOSS)</span>
                        <h2 className="text-xl font-black">
                            STATUS: {reportData.labaRugiBersih >= 0 ? 'SURPLUS / LABA BERSIH' : 'DEFISIT / RUGI BERSIH'}
                        </h2>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-xs font-bold uppercase block opacity-75">TOTAL LABA / RUGI BERSIH</span>
                    <span className="text-2xl font-black font-mono">
                        Rp {(reportData.labaRugiBersih || 0).toLocaleString('id-ID')}
                    </span>
                </div>
            </div>

            {/* 📋 TABEL PENDAPATAN VS BEBAN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 🔹 PENDAPATAN (REVENUE) */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="bg-slate-100 p-3 font-black text-xs uppercase text-slate-800 border-b flex items-center gap-2">
                        <DollarSign size={16} className="text-emerald-600" /> PENDAPATAN (REVENUE)
                    </div>
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                            <tr>
                                <th className="p-3">KODE AKUN</th>
                                <th className="p-3">NAMA AKUN</th>
                                <th className="p-3 text-right">SALDO (RP)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                <tr><td colSpan="3" className="p-6 text-center animate-pulse">Memuat Pendapatan...</td></tr>
                            ) : reportData.pendapatan.length === 0 ? (
                                <tr><td colSpan="3" className="p-6 text-center italic text-slate-400">Tidak ada data Pendapatan.</td></tr>
                            ) : (
                                reportData.pendapatan.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono font-bold text-emerald-700">{item.ca_id}</td>
                                        <td className="p-3 uppercase">{item.ca_name}</td>
                                        <td className="p-3 text-right font-bold text-slate-900">
                                            {(Number(item.saldo_akhir) || 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-slate-100 font-black text-xs border-t text-slate-900">
                            <tr>
                                <td colSpan="2" className="p-3 text-right uppercase">TOTAL PENDAPATAN:</td>
                                <td className="p-3 text-right text-emerald-700 text-sm">
                                    Rp {(reportData.totalPendapatan || 0).toLocaleString('id-ID')}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* 🔸 BEBAN / BIAYA (EXPENSES) */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="bg-slate-100 p-3 font-black text-xs uppercase text-slate-800 border-b flex items-center gap-2">
                        <DollarSign size={16} className="text-rose-600" /> BEBAN / BIAYA (EXPENSES)
                    </div>
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                            <tr>
                                <th className="p-3">KODE AKUN</th>
                                <th className="p-3">NAMA AKUN</th>
                                <th className="p-3 text-right">SALDO (RP)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                <tr><td colSpan="3" className="p-6 text-center animate-pulse">Memuat Beban...</td></tr>
                            ) : reportData.beban.length === 0 ? (
                                <tr><td colSpan="3" className="p-6 text-center italic text-slate-400">Tidak ada data Beban.</td></tr>
                            ) : (
                                reportData.beban.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono font-bold text-rose-700">{item.ca_id}</td>
                                        <td className="p-3 uppercase">{item.ca_name}</td>
                                        <td className="p-3 text-right font-bold text-slate-900">
                                            {(Number(item.saldo_akhir) || 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-slate-100 font-black text-xs border-t text-slate-900">
                            <tr>
                                <td colSpan="2" className="p-3 text-right uppercase">TOTAL BEBAN:</td>
                                <td className="p-3 text-right text-rose-700 text-sm">
                                    Rp {(reportData.totalBeban || 0).toLocaleString('id-ID')}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default CetakRugiLaba;