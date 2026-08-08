import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import { Search, Printer, FileSpreadsheet, BookOpen, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

const CetakBukuBesar = () => {
    const { isDarkMode } = useDarkMode();

    // 📊 State Filter
    const todayStr = new Date().toISOString().split('T')[0];
    const [filterParams, setFilterParams] = useState({
        tanggalStart: todayStr,
        tanggalEnd: todayStr,
        useAkun: false,
        akuna: '',
        akune: '',
        useCabang: false,
        cabang: '1',
        piltrans: 'S' // "S" = Semua, "A" = Ada Transaksi Saja
    });

    // 🔍 Auto-complete State
    const [searchCoaA, setSearchCoaA] = useState([]);
    const [searchCoaE, setSearchCoaE] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);

    // 🔎 Live Search COA Awal
    const handleSearchCoaA = async (val) => {
        setFilterParams(prev => ({ ...prev, akuna: val }));
        if (val.length < 2) return setSearchCoaA([]);
        try {
            const res = await api.get(`/gl/search-coa?caname=${val}`);
            setSearchCoaA(res.data.data || []);
        } catch (err) {
            console.error("Gagal search COA:", err);
        }
    };

    // 🔎 Live Search COA Akhir
    const handleSearchCoaE = async (val) => {
        setFilterParams(prev => ({ ...prev, akune: val }));
        if (val.length < 2) return setSearchCoaE([]);
        try {
            const res = await api.get(`/gl/search-coa?caname=${val}`);
            setSearchCoaE(res.data.data || []);
        } catch (err) {
            console.error("Gagal search COA:", err);
        }
    };

    // 🔄 Fetch Laporan Buku Besar
    const fetchBukuBesar = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {
                tanggalStart: filterParams.tanggalStart,
                tanggalEnd: filterParams.tanggalEnd,
                piltrans: filterParams.piltrans
            };

            if (filterParams.useAkun) {
                params.akuna = filterParams.akuna;
                params.akune = filterParams.akune;
            }
            if (filterParams.useCabang) {
                params.cabang = filterParams.cabang;
            }

            const res = await api.get('/gl/buku-besar-report', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setReportData(res.data.data || []);

            if (e) {
                Swal.fire({
                    title: 'BERHASIL',
                    text: `Ditemukan ${res.data.data?.length || 0} Akun COA Buku Besar`,
                    icon: 'success',
                    confirmButtonColor: '#2563eb'
                });
            }
        } catch (err) {
            console.error("Gagal narik Buku Besar:", err);
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    // 📥 FITUR EXPORT EXCEL SEJATI (SAMA PERSIS FORMAT APP LAWAS)
    const exportToExcelReal = async () => {
        try {
            Swal.fire({
                title: 'MEMPROSES EXCEL',
                text: 'Sedang menyiapkan file Excel Buku Besar...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const currentToken = localStorage.getItem('token');
            const queryParams = new URLSearchParams({
                tanggalStart: filterParams.tanggalStart,
                tanggalEnd: filterParams.tanggalEnd,
                piltrans: filterParams.piltrans,
                akuna: filterParams.useAkun ? filterParams.akuna : '',
                akune: filterParams.useAkun ? filterParams.akune : '',
                cabang: filterParams.useCabang ? filterParams.cabang : ''
            }).toString();

            // Download via axios dengan responseType 'blob'
            const response = await api.get(`/gl/export-buku-besar-xls?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                },
                responseType: 'blob'
            });

            // Buat objek URL dari blob data untuk otomatis terunduh
            const blob = new Blob([response.data], { type: 'application/vnd.ms-excel' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `BUKU_BESAR_${filterParams.tanggalStart}_s.d_${filterParams.tanggalEnd}.xls`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            Swal.fire({
                title: 'EXPORT EXCEL BERHASIL',
                text: 'File Buku Besar .xls otomatis tersimpan di komputer kamu!',
                icon: 'success',
                confirmButtonColor: '#059669'
            });
        } catch (err) {
            console.error("Gagal export Excel Buku Besar:", err);
            Swal.fire({
                title: 'GAGAL EXPORT',
                text: 'Terjadi kesalahan saat mengunduh file Excel.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        }
    };

    return (
        <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>

            {/* Header Page - Biru Elegan */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                    <h1 className="text-base font-black uppercase tracking-wider text-blue-600 flex items-center gap-2">
                        <BookOpen size={20} /> CETAK BUKU BESAR
                    </h1>
                    <p className="text-[11px] text-gray-400 font-medium">
                        Modul cetak dan eksport mutasi saldo serta rincian buku besar seluruh akun Chart of Accounts (COA).
                    </p>
                </div>
            </div>

            {/* 🔍 PANEL FILTER REPLIKA ASP LAWAS */}
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 text-blue-600 font-black tracking-wider border-b border-slate-100 pb-2 text-xs">
                    <Search size={16} />
                    <span>PANEL FILTER LAPORAN BUKU BESAR</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                    {/* Filter Tanggal */}
                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 uppercase block">Tanggal Awal</label>
                        <input
                            type="date"
                            value={filterParams.tanggalStart}
                            onChange={e => setFilterParams({ ...filterParams, tanggalStart: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 uppercase block">Sampai Tanggal</label>
                        <input
                            type="date"
                            value={filterParams.tanggalEnd}
                            onChange={e => setFilterParams({ ...filterParams, tanggalEnd: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none"
                        />
                    </div>

                    {/* Mode Transaksi */}
                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 uppercase block">Pilihan Transaksi</label>
                        <div className="flex items-center gap-4 pt-2">
                            <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                <input
                                    type="radio"
                                    name="piltrans"
                                    value="S"
                                    checked={filterParams.piltrans === 'S'}
                                    onChange={e => setFilterParams({ ...filterParams, piltrans: e.target.value })}
                                /> Semua
                            </label>
                            <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                <input
                                    type="radio"
                                    name="piltrans"
                                    value="A"
                                    checked={filterParams.piltrans === 'A'}
                                    onChange={e => setFilterParams({ ...filterParams, piltrans: e.target.value })}
                                /> Ada Transaksi Saja
                            </label>
                        </div>
                    </div>
                </div>

                {/* Filter Rentang Account COA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs pt-2 border-t border-slate-100">
                    <div className="space-y-1.5 relative">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 uppercase">
                            <input
                                type="checkbox"
                                checked={filterParams.useAkun}
                                onChange={e => setFilterParams({ ...filterParams, useAkun: e.target.checked })}
                                className="rounded text-blue-600 cursor-pointer"
                            />
                            Account (Awal)
                        </label>
                        <input
                            type="text"
                            placeholder="Ketik Kode / Nama Akun..."
                            disabled={!filterParams.useAkun}
                            value={filterParams.akuna}
                            onChange={e => handleSearchCoaA(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 uppercase disabled:opacity-40 outline-none"
                        />
                        {searchCoaA.length > 0 && (
                            <div className="absolute z-50 bg-white border rounded-lg shadow-lg w-full max-h-40 overflow-y-auto mt-1">
                                {searchCoaA.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setFilterParams(prev => ({ ...prev, akuna: item.ca_id }));
                                            setSearchCoaA([]);
                                        }}
                                        className="p-2 hover:bg-blue-50 cursor-pointer text-[11px] font-mono border-b"
                                    >
                                        <b>{item.ca_id}</b> - {item.ca_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5 relative">
                        <label className="font-bold text-slate-600 uppercase block pt-0.5">S/D Account (Akhir)</label>
                        <input
                            type="text"
                            placeholder="Ketik Kode / Nama Akun..."
                            disabled={!filterParams.useAkun}
                            value={filterParams.akune}
                            onChange={e => handleSearchCoaE(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 uppercase disabled:opacity-40 outline-none"
                        />
                        {searchCoaE.length > 0 && (
                            <div className="absolute z-50 bg-white border rounded-lg shadow-lg w-full max-h-40 overflow-y-auto mt-1">
                                {searchCoaE.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setFilterParams(prev => ({ ...prev, akune: item.ca_id }));
                                            setSearchCoaE([]);
                                        }}
                                        className="p-2 hover:bg-blue-50 cursor-pointer text-[11px] font-mono border-b"
                                    >
                                        <b>{item.ca_id}</b> - {item.ca_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={fetchBukuBesar}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition"
                        >
                            <RefreshCw size={14} /> PROSES LAPORAN
                        </button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2 transition"
                        >
                            <Printer size={14} /> CETAK BUKU BESAR
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

            {/* 📋 TAMPILAN LAPORAN BUKU BESAR REPLIKA ASP LAWAS */}
            <div className="space-y-6">
                {loading ? (
                    <div className="p-10 text-center font-bold text-slate-500 animate-pulse">
                        Sedang menghitung mutasi & kalkulasi saldo Buku Besar...
                    </div>
                ) : reportData.length === 0 ? (
                    <div className="p-10 text-center font-bold text-slate-400 bg-white rounded-2xl border">
                        Silakan klik <b className="text-blue-600">PROSES LAPORAN</b> untuk menampilkan data Buku Besar.
                    </div>
                ) : (
                    reportData.map((account, index) => (
                        <div key={index} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                            {/* Header Akun */}
                            <div className="bg-slate-100 p-4 border-b flex justify-between items-center text-xs font-bold">
                                <div className="flex gap-3 items-center">
                                    <span className="font-mono text-blue-700 font-black text-sm bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                        {account.ca_id}
                                    </span>
                                    <span className="uppercase text-slate-800 text-sm">{account.ca_name}</span>
                                </div>
                                <div className="text-slate-500">
                                    Saldo Awal: <b className="text-slate-800">Rp {(Number(account.saldo_awal) || 0).toLocaleString('id-ID')}</b>
                                </div>
                            </div>

                            {/* Tabel Mutasi Detail */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                                        <tr>
                                            <th className="p-3">TANGGAL</th>
                                            <th className="p-3">NO. JURNAL</th>
                                            <th className="p-3">KETERANGAN</th>
                                            <th className="p-3 text-right">DEBET</th>
                                            <th className="p-3 text-right">KREDIT</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                        {account.details && account.details.length > 0 ? (
                                            account.details.map((det, dIdx) => (
                                                <tr key={dIdx} className="hover:bg-slate-50">
                                                    <td className="p-3">{det.tanggal}</td>
                                                    <td className="p-3 font-mono text-blue-600 font-bold">{det.no_jurnal}</td>
                                                    <td className="p-3">{det.keterangan}</td>
                                                    <td className="p-3 text-right font-bold text-blue-700">
                                                        Rp {(Number(det.debet) || 0).toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="p-3 text-right font-bold text-slate-800">
                                                        Rp {(Number(det.kredit) || 0).toLocaleString('id-ID')}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="p-3 text-center italic text-slate-400">
                                                    Tidak ada mutasi transaksi pada periode ini.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {/* Footer Saldo Akhir Akun */}
                                    <tfoot className="bg-slate-50 font-black text-xs border-t">
                                        <tr>
                                            <td colSpan="3" className="p-3 text-right uppercase">Saldo Akhir Akun:</td>
                                            <td className="p-3 text-right text-blue-700">
                                                Rp {(Number(account.total_debet) || 0).toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-3 text-right text-slate-800">
                                                Rp {(Number(account.total_kredit) || 0).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                        <tr className="bg-blue-50 text-blue-900">
                                            <td colSpan="4" className="p-3 text-right uppercase">TOTAL SALDO AKHIR ({account.ca_jenis}):</td>
                                            <td className="p-3 text-right text-sm">
                                                Rp {(Number(account.saldo_akhir) || 0).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
};

export default CetakBukuBesar;