import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import { Search, Printer, FileSpreadsheet, Scale, RefreshCw, CheckCircle, AlertTriangle, Filter } from 'lucide-react';
import Swal from 'sweetalert2';
import dakotaLogo from '../assets/new_logo 2.png';

const CetakNeracaSaldo = () => {
    const { isDarkMode } = useDarkMode();

    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());

    // 📊 State Filter
    const [showFilter, setShowFilter] = useState(true);
    const [filterParams, setFilterParams] = useState({
        bulan: currentMonth,
        tahun: currentYear,
        pilcab: 'Y',
        cabang: localStorage.getItem('active_agen_id') || '1'
    });

    const [cabangList, setCabangList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [summary, setSummary] = useState({ totalDebet: 0, totalKredit: 0, isBalanced: true });

    // 🏢 Fetch Daftar Agen/Cabang
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

    // 🔄 Fetch Data Laporan Neraca Saldo
    const fetchNeracaSaldo = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/neraca-saldo-report', {
                params: filterParams,
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data.data || [];
            setReportData(data);

            const totDebet = res.data.grand_total_debet !== undefined
                ? res.data.grand_total_debet
                : data.reduce((s, i) => s + (Number(i.saldo_debet ?? i.debet ?? 0)), 0);

            const totKredit = res.data.grand_total_kredit !== undefined
                ? res.data.grand_total_kredit
                : data.reduce((s, i) => s + (Number(i.saldo_kredit ?? i.kredit ?? 0)), 0);

            setSummary({
                totalDebet: totDebet,
                totalKredit: totKredit,
                isBalanced: res.data.is_balanced !== undefined ? res.data.is_balanced : (totDebet === totKredit)
            });

            if (e) {
                Swal.fire({
                    title: 'BERHASIL',
                    text: `Ditemukan ${data.length} Akun Neraca Saldo`,
                    icon: 'success',
                    confirmButtonColor: '#2563eb'
                });
            }
        } catch (err) {
            console.error("Gagal load Neraca Saldo:", err);
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    // 🖨️ CETAK LAPORAN RESMI POP-UP (STANDAR DAKOTA)
    const handlePrintNeracaSaldo = () => {
        if (!reportData || reportData.length === 0) {
            Swal.fire({
                title: 'DATA KOSONG',
                text: 'Silakan klik PROSES LAPORAN terlebih dahulu sebelum mencetak.',
                icon: 'warning',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        const printWindow = window.open('', '_blank', 'width=950,height=750');
        if (!printWindow) {
            Swal.fire('Popup Diblokir', 'Mohon izinkan popup browser untuk mencetak dokumen ini.', 'warning');
            return;
        }

        const todayFormatted = new Date().toLocaleDateString('id-ID', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

        const selectedCabangObj = cabangList.find(c => String(c.agen_id) === String(filterParams.cabang));
        const namaCabang = filterParams.cabang === '1' ? 'KONSOLIDASI' : (selectedCabangObj?.agen_nama || 'PUSAT DAKOTA');

        const rowsHtml = reportData.map((row, idx) => {
            const debetVal = Number(row.saldo_debet ?? row.debet ?? 0);
            const kreditVal = Number(row.saldo_kredit ?? row.kredit ?? 0);

            return `
                <tr style="font-family: monospace; font-size: 11px;">
                    <td style="border: 1px solid #000; padding: 4px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${row.ca_id || row.kode_akun || '-'}</td>
                    <td style="border: 1px solid #000; padding: 4px;">${row.ca_name || row.nama_akun || '-'}</td>
                    <td style="border: 1px solid #000; padding: 4px; text-align: right;">${debetVal.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #000; padding: 4px; text-align: right;">${kreditVal.toLocaleString('id-ID')}</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Neraca Saldo - Bulan ${filterParams.bulan}/${filterParams.tahun}</title>
                <style>
                    @page { size: A4 portrait; margin: 12mm; }
                    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { border: 1px solid #000; padding: 6px; background-color: #cfcfcf; font-size: 11px; }
                </style>
            </head>
            <body>
                <div style="position: relative; width: 100%; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px;">
                    <table style="width: 100%; border: none;">
                        <tr>
                            <td style="width: 60%; vertical-align: middle; border: none;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <img id="logoDakota" src="${dakotaLogo}" alt="Logo Dakota" style="height: 40px; width: auto; object-fit: contain;" />
                                    <div>
                                        <div style="font-size: 12px; font-weight: bold;">PT. DAKOTA LOGISTIK INDONESIA</div>
                                        <div style="font-size: 10px; color: #555;">Jl. Wibawa Mukti II No. 99, Jatiasih, Bekasi</div>
                                    </div>
                                </div>
                            </td>
                            <td style="width: 40%; text-align: right; vertical-align: middle; border: none;">
                                <h2 style="margin: 0; font-size: 16px; font-weight: 900; text-decoration: underline;">NERACA SALDO</h2>
                                <div style="font-size: 11px; margin-top: 4px; font-weight: bold;">${namaCabang}</div>
                                <div style="font-size: 11px; margin-top: 2px;">PERIODE: BULAN ${filterParams.bulan} / ${filterParams.tahun}</div>
                                <div style="font-size: 10px; color: #444; margin-top: 2px;">Tanggal Cetak: ${todayFormatted}</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">NO</th>
                            <th style="width: 20%;">KODE AKUN</th>
                            <th style="width: 45%;">NAMA PERKIRAAN</th>
                            <th style="width: 15%; text-align: right;">DEBET (RP)</th>
                            <th style="width: 15%; text-align: right;">KREDIT (RP)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold; background-color: #ebebeb; font-family: monospace; font-size: 11px;">
                            <td colspan="3" style="border: 1px solid #000; padding: 6px; text-align: center;">TOTAL NERACA SALDO:</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">${Number(summary.totalDebet || 0).toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: right;">${Number(summary.totalKredit || 0).toLocaleString('id-ID')}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="margin-top: 35px; page-break-inside: avoid;">
                    <table style="width: 100%; border: none;">
                        <tr style="text-align: center; border: none;">
                            <td style="width: 33%; border: none;">
                                <div>Dibuat Oleh,</div>
                                <div style="height: 50px;"></div>
                                <div style="font-weight: bold; text-decoration: underline;">( Accounting Staff )</div>
                            </td>
                            <td style="width: 33%; border: none;">
                                <div>Diperiksa Oleh,</div>
                                <div style="height: 50px;"></div>
                                <div style="font-weight: bold; text-decoration: underline;">( Supervisor GL )</div>
                            </td>
                            <td style="width: 33%; border: none;">
                                <div>Disetujui Oleh,</div>
                                <div style="height: 50px;"></div>
                                <div style="font-weight: bold; text-decoration: underline;">( Manager Keuangan )</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <script>
                    const img = document.getElementById('logoDakota');
                    if (img && !img.complete) {
                        img.onload = () => window.print();
                    } else {
                        window.onload = () => window.print();
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // 📥 FITUR EXPORT EXCEL SEJATI (.XLS)
    const exportToExcelReal = async () => {
        try {
            Swal.fire({
                title: 'MEMPROSES EXCEL',
                text: 'Sedang menyiapkan file Excel Neraca Saldo...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const currentToken = localStorage.getItem('token');
            const queryParams = new URLSearchParams(filterParams).toString();

            const response = await api.get(`/gl/export-neraca-saldo-xls?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${currentToken}` },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/vnd.ms-excel' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `NERACA_SALDO_${filterParams.bulan}_${filterParams.tahun}.xls`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            Swal.fire({
                title: 'EXPORT EXCEL BERHASIL',
                text: 'File Neraca Saldo .xls otomatis tersimpan!',
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

            {/* Header Page & Tombol Toggle Filter */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                    <h1 className="text-base font-black uppercase tracking-wider text-blue-600 flex items-center gap-2">
                        <Scale size={20} /> CETAK NERACA SALDO
                    </h1>
                    <p className="text-[11px] text-gray-400 font-medium">
                        Modul laporan neraca saldo (Trial Balance) per periode bulan dan tahun seluruh akun COA.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowFilter(prev => !prev)}
                    className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                >
                    <Filter size={14} className={showFilter ? 'text-blue-600' : 'text-slate-400'} />
                    {showFilter ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
                </button>
            </div>

            {/* 🔍 PANEL FILTER */}
            {showFilter && (
                <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2 text-blue-600 font-black tracking-wider border-b border-slate-100 pb-2 text-xs">
                        <Search size={16} />
                        <span>PANEL FILTER LAPORAN NERACA SALDO</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                        {/* Bulan */}
                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-600 uppercase block">Bulan</label>
                            <select
                                value={filterParams.bulan}
                                onChange={e => setFilterParams({ ...filterParams, bulan: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-blue-500"
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
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Cabang / Agen */}
                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-600 uppercase block">Agen / Cabang</label>
                            <select
                                value={filterParams.cabang}
                                onChange={e => setFilterParams({ ...filterParams, cabang: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-blue-500"
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
                                onClick={fetchNeracaSaldo}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition"
                            >
                                <RefreshCw size={14} /> PROSES LAPORAN
                            </button>
                            <button
                                type="button"
                                onClick={handlePrintNeracaSaldo}
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
            )}

            {/* 📋 TABEL NERACA SALDO */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                {/* Balance Status Banner */}
                {reportData.length > 0 && (
                    <div className={`p-3 text-xs font-bold flex items-center justify-between ${summary.isBalanced ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-rose-50 text-rose-800 border-b border-rose-200'}`}>
                        <div className="flex items-center gap-2">
                            {summary.isBalanced ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                            <span>STATUS KESEIMBANGAN: <b>{summary.isBalanced ? 'SEIMBANG (BALANCED)' : 'TIDAK SEIMBANG (UNBALANCED)'}</b></span>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-black border-b uppercase">
                            <tr>
                                <th className="p-3 w-32">KODE AKUN</th>
                                <th className="p-3">NAMA AKUN COA</th>
                                <th className="p-3 text-right">DEBET (RP)</th>
                                <th className="p-3 text-right">KREDIT (RP)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-10 text-center font-bold text-slate-400 animate-pulse">
                                        Sedang menghitung Neraca Saldo...
                                    </td>
                                </tr>
                            ) : reportData.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-10 text-center italic text-slate-400">
                                        Klik <b className="text-blue-600">PROSES LAPORAN</b> untuk menampilkan Neraca Saldo.
                                    </td>
                                </tr>
                            ) : (
                                reportData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono font-bold text-blue-700">{item.ca_id || item.kode_akun}</td>
                                        <td className="p-3 uppercase font-medium">{item.ca_name || item.nama_akun}</td>
                                        <td className="p-3 text-right font-bold text-slate-900">
                                            {(Number(item.saldo_debet ?? item.debet ?? 0)).toLocaleString('id-ID')}
                                        </td>
                                        <td className="p-3 text-right font-bold text-slate-900">
                                            {(Number(item.saldo_kredit ?? item.kredit ?? 0)).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {reportData.length > 0 && (
                            <tfoot className="bg-slate-100 font-black text-xs border-t text-slate-900">
                                <tr>
                                    <td colSpan="2" className="p-3 text-right uppercase">TOTAL NERACA SALDO:</td>
                                    <td className="p-3 text-right text-blue-700 text-sm">
                                        Rp {(summary.totalDebet || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="p-3 text-right text-slate-800 text-sm">
                                        Rp {(summary.totalKredit || 0).toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

        </div>
    );
};

export default CetakNeracaSaldo;