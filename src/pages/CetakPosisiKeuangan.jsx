import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import { Search, Printer, FileSpreadsheet, Landmark, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';

const CetakPosisiKeuangan = () => {
    const { isDarkMode } = useDarkMode();

    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

    const [filterParams, setFilterParams] = useState({
        bulanend: currentMonth,
        tahun: '2023',
        jnslap: 'H',
        cabang: localStorage.getItem('active_agen_id') || '1'
    });

    const [cabangList, setCabangList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState({ aktiva: [], pasiva: [], totalAktiva: 0, totalPasiva: 0, isBalanced: true });

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

    const fetchPosisiKeuangan = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const res = await api.get('/gl/posisi-keuangan-report', { params: filterParams });

            setReportData({
                aktiva: res.data.aktiva || [],
                pasiva: res.data.pasiva || [],
                totalAktiva: res.data.total_aktiva || 0,
                totalPasiva: res.data.total_pasiva || 0,
                isBalanced: res.data.is_balanced
            });

            if (e) {
                Swal.fire({
                    title: 'BERHASIL',
                    text: 'Laporan Posisi Keuangan Berhasil Dimuat!',
                    icon: 'success',
                    confirmButtonColor: '#2563eb'
                });
            }
        } catch (err) {
            console.error("Gagal load Laporan Posisi Keuangan:", err);
            setReportData({ aktiva: [], pasiva: [], totalAktiva: 0, totalPasiva: 0, isBalanced: true });
        } finally {
            setLoading(false);
        }
    };

    const exportToExcelReal = async () => {
        try {
            Swal.fire({
                title: 'MEMPROSES EXCEL',
                text: 'Sedang menyiapkan file Excel Posisi Keuangan...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const queryParams = new URLSearchParams(filterParams).toString();

            const response = await api.get(`/gl/export-posisi-keuangan-xls?${queryParams}`, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/vnd.ms-excel' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `POSISI_KEUANGAN_${filterParams.bulanend}_${filterParams.tahun}.xls`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            Swal.fire({
                title: 'EXPORT EXCEL BERHASIL',
                text: 'File Posisi Keuangan .xls otomatis tersimpan!',
                icon: 'success',
                confirmButtonColor: '#059669'
            });
        } catch (err) {
            console.error("Gagal export Excel:", err);
            Swal.fire('GAGAL EXPORT', 'Terjadi kesalahan saat unduh file Excel.', 'error');
        }
    };

    return (
        <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>

            {/* Header Page */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                    <h1 className="text-base font-black uppercase tracking-wider text-blue-600 flex items-center gap-2">
                        <Landmark size={20} /> CETAK POSISI KEUANGAN
                    </h1>
                    <p className="text-[11px] text-gray-400 font-medium">
                        Laporan ringkasan posisi keuangan (Aktiva vs Pasiva) per periode bulan dan tahun.
                    </p>
                </div>
            </div>

            {/* Panel Filter */}
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 text-blue-600 font-black tracking-wider border-b border-slate-100 pb-2 text-xs">
                    <Search size={16} />
                    <span>PANEL FILTER POSISI KEUANGAN</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
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

                    {/* Bulan Selesai */}
                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 uppercase block">Bulan</label>
                        <select
                            value={filterParams.bulanend}
                            onChange={e => setFilterParams({ ...filterParams, bulanend: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none"
                        >
                            {Array.from({ length: 12 }, (_, i) => {
                                const m = String(i + 1).padStart(2, '0');
                                return <option key={m} value={m}>Bulan {m}</option>;
                            })}
                        </select>
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
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={fetchPosisiKeuangan}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition"
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

            {/* Tabel Result */}
            <div className="space-y-4">
                {(reportData.aktiva.length > 0 || reportData.pasiva.length > 0) && (
                    <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${reportData.isBalanced ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                        <div className="flex items-center gap-2">
                            {reportData.isBalanced ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                            <span>STATUS KESEIMBANGAN: <b>{reportData.isBalanced ? 'SEIMBANG (BALANCED)' : 'TIDAK SEIMBANG (UNBALANCED)'}</b></span>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Aktiva */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                        <div className="bg-slate-100 p-3 font-black text-xs uppercase text-slate-800 border-b">
                            AKTIVA (ASSETS)
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
                                    <tr><td colSpan="3" className="p-6 text-center animate-pulse">Memuat Aktiva...</td></tr>
                                ) : reportData.aktiva.length === 0 ? (
                                    <tr><td colSpan="3" className="p-6 text-center italic text-slate-400">Tidak ada data.</td></tr>
                                ) : (
                                    reportData.aktiva.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-3 font-mono font-bold text-blue-700">{item.ca_id}</td>
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
                                    <td colSpan="2" className="p-3 text-right uppercase">TOTAL AKTIVA:</td>
                                    <td className="p-3 text-right text-blue-700 text-sm">
                                        Rp {(reportData.totalAktiva || 0).toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Pasiva */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                        <div className="bg-slate-100 p-3 font-black text-xs uppercase text-slate-800 border-b">
                            PASIVA (KEWAJIBAN & EKUITAS)
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
                                    <tr><td colSpan="3" className="p-6 text-center animate-pulse">Memuat Pasiva...</td></tr>
                                ) : reportData.pasiva.length === 0 ? (
                                    <tr><td colSpan="3" className="p-6 text-center italic text-slate-400">Tidak ada data.</td></tr>
                                ) : (
                                    reportData.pasiva.map((item, idx) => (
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
                                    <td colSpan="2" className="p-3 text-right uppercase">TOTAL PASIVA:</td>
                                    <td className="p-3 text-right text-emerald-700 text-sm">
                                        Rp {(reportData.totalPasiva || 0).toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default CetakPosisiKeuangan;