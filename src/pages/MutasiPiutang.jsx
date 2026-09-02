import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import { FileText, Search, Printer, Calendar, Building, User, Layers } from 'lucide-react';
import Swal from 'sweetalert2';

const MutasiPiutang = () => {
    const { isDarkMode } = useDarkMode();
    const [loading, setLoading] = useState(false);
    const [agens, setAgens] = useState([]);
    const [customers, setCustomers] = useState([]);

    // Filter State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [cabangId, setCabangId] = useState('ALL');
    const [custId, setCustId] = useState('ALL');
    const [modeLaporan, setModeLaporan] = useState('1'); // 1 = Detail, 2 = Rekap, 3 = Kartu

    // Result Data
    const [reportData, setReportData] = useState([]);

    // Fetch Master Options
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const token = localStorage.getItem('token');
                const ptId = localStorage.getItem('pt_id') || 'C';

                // Fetch Agen
                const resAgens = await api.get(`/agens?pt_id=${ptId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: { data: [] } }));
                setAgens(resAgens.data?.data || []);

                // Fetch Customer
                let resCust;
                try {
                    resCust = await api.get(`/customers?pt_id=${ptId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch {
                    resCust = await api.get(`/marketing/customers?pt_id=${ptId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => ({ data: { data: [] } }));
                }

                setCustomers(resCust.data?.data || resCust.data?.customers || []);
            } catch (err) {
                console.error("Gagal load filter master:", err);
            }
        };
        fetchOptions();
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const res = await api.get('/piutang/mutasi-piutang', {
                params: {
                    pt_id: ptId,
                    start_date: startDate,
                    end_date: endDate,
                    cabang_id: cabangId,
                    cust_id: custId,
                    mode: modeLaporan
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            setReportData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load mutasi piutang:", err);
            Swal.fire('Error', 'Gagal memuat data mutasi piutang.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [modeLaporan]);

    const handlePrint = () => {
        window.print();
    };

    // Kalkulasi Total Grand
    const calculateGrandTotal = () => {
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
            return { awal: 0, trans: 0, bayar: 0, akhir: 0 };
        }

        if (modeLaporan === '2') {
            return reportData.reduce((acc, curr) => ({
                awal: acc.awal + (curr.saldo_awal || 0),
                trans: acc.trans + (curr.transaksi || 0),
                bayar: acc.bayar + (curr.pembayaran || 0),
                akhir: acc.akhir + (curr.saldo_akhir || 0)
            }), { awal: 0, trans: 0, bayar: 0, akhir: 0 });
        }

        if (modeLaporan === '1') {
            return reportData.reduce((acc, curr) => ({
                awal: acc.awal + (curr.saldo_awal || 0),
                trans: acc.trans + (curr.subtotal_invoice || 0),
                bayar: acc.bayar + ((curr.subtotal_kwitansi || 0) + (curr.subtotal_potongan || 0) + (curr.subtotal_penambah || 0)),
                akhir: acc.akhir + (curr.saldo_akhir || 0)
            }), { awal: 0, trans: 0, bayar: 0, akhir: 0 });
        }

        return { awal: 0, trans: 0, bayar: 0, akhir: 0 };
    };

    const grand = calculateGrandTotal();

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header & Filter Card */}
            <div className={`p-6 rounded-2xl border shadow-sm transition-all print:hidden ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                <div className={`flex items-center justify-between border-b pb-4 mb-5 ${isDarkMode ? 'border-gray-700' : 'border-slate-100'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-sky-950 text-sky-400' : 'bg-sky-50 text-sky-600'
                            }`}>
                            <FileText size={24} />
                        </div>
                        <div>
                            <h1 className="text-base font-black uppercase tracking-wider">MUTASI PIUTANG</h1>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                Rekonsiliasi saldo awal, faktur invoice, pelunasan kas/bank, dan kartu piutang pelanggan.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                        >
                            <Printer size={16} /> CETAK LAPORAN
                        </button>
                    </div>
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
                    <div>
                        <label className={`block mb-1 flex items-center gap-1 uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                            <Calendar size={13} /> DARI TANGGAL :
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                                }`}
                        />
                    </div>
                    <div>
                        <label className={`block mb-1 flex items-center gap-1 uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                            <Calendar size={13} /> SAMPAI TANGGAL :
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                                }`}
                        />
                    </div>
                    <div>
                        <label className={`block mb-1 flex items-center gap-1 uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                            <Building size={13} /> CABANG / AGEN :
                        </label>
                        <select
                            value={cabangId}
                            onChange={(e) => setCabangId(e.target.value)}
                            className={`w-full p-2.5 border rounded-xl font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                                }`}
                        >
                            <option value="ALL">-- SEMUA CABANG --</option>
                            {agens.map((a) => (
                                <option key={a.agen_id} value={a.agen_id}>
                                    {a.agen_id} - {a.agen_nama}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={`block mb-1 flex items-center gap-1 uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                            <User size={13} /> CUSTOMER :
                        </label>
                        <select
                            value={custId}
                            onChange={(e) => setCustId(e.target.value)}
                            className={`w-full p-2.5 border rounded-xl font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                                }`}
                        >
                            <option value="ALL">-- SEMUA CUSTOMER --</option>
                            {customers.map((c) => (
                                <option key={c.cust_id} value={c.cust_id}>
                                    {c.cust_name} ({c.cust_id})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Radio Format Laporan & Action Button */}
                <div className={`flex flex-wrap items-center justify-between pt-4 mt-4 border-t gap-4 ${isDarkMode ? 'border-gray-700' : 'border-slate-100'
                    }`}>
                    <div className="flex items-center gap-6 text-xs font-bold">
                        <span className={`uppercase tracking-wider flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            <Layers size={14} /> FORMAT :
                        </span>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="modeLaporan"
                                value="1"
                                checked={modeLaporan === '1'}
                                onChange={() => setModeLaporan('1')}
                                className="accent-sky-600"
                            />
                            <span>Detail Transaksi</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="modeLaporan"
                                value="2"
                                checked={modeLaporan === '2'}
                                onChange={() => setModeLaporan('2')}
                                className="accent-sky-600"
                            />
                            <span>Rekap Pelanggan</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="modeLaporan"
                                value="3"
                                checked={modeLaporan === '3'}
                                onChange={() => setModeLaporan('3')}
                                className="accent-sky-600"
                            />
                            <span>Kartu Piutang</span>
                        </label>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={fetchReport}
                            disabled={loading}
                            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            <Search size={15} /> {loading ? 'MEMUAT...' : 'PROSES FILTER'}
                        </button>
                    </div>
                </div>
            </div>

            {/* TABEL AREA TAMPILAN LAPORAN */}
            <div className={`p-6 rounded-2xl border shadow-sm transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                {/* Header Judul Periode */}
                <div className={`text-center space-y-1 mb-6 border-b pb-4 ${isDarkMode ? 'border-gray-700' : 'border-slate-100'
                    }`}>
                    <h2 className="text-lg font-black tracking-wide uppercase">
                        {modeLaporan === '1' && 'LAPORAN MUTASI PIUTANG DETAIL'}
                        {modeLaporan === '2' && 'LAPORAN REKAP MUTASI PIUTANG PELANGGAN'}
                        {modeLaporan === '3' && 'LAPORAN KARTU PIUTANG PELANGGAN'}
                    </h2>
                    <p className={`text-xs font-mono ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                        Periode: {startDate} s/d {endDate}
                    </p>
                </div>

                {/* 1. TAMPILAN MODE DETAIL */}
                {modeLaporan === '1' && (
                    <div className="space-y-6 overflow-x-auto text-xs">
                        {(reportData || []).map((group, gIdx) => (
                            <div key={gIdx} className={`border rounded-xl overflow-hidden shadow-xs ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-slate-200 bg-white'
                                }`}>
                                {/* Header Group Customer */}
                                <div className={`p-3.5 flex justify-between items-center font-bold border-b ${isDarkMode
                                    ? 'bg-cyan-950/40 border-cyan-800 text-cyan-200'
                                    : 'bg-cyan-100 border-cyan-200 text-cyan-950'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sky-600 font-black">CUSTOMER:</span>
                                        <span className="font-bold">{group.cust_name}</span>
                                        <span className={`font-mono text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                            ({group.cust_id})
                                        </span>
                                    </div>
                                    <div>
                                        <span className={isDarkMode ? 'text-gray-400' : 'text-slate-500'}>SALDO AWAL: </span>
                                        <strong className={`font-mono ${group.saldo_awal < 0 ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>
                                            Rp {Number(group.saldo_awal || 0).toLocaleString('id-ID')}
                                        </strong>
                                    </div>
                                </div>

                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className={`border-b font-black text-[11px] uppercase ${isDarkMode
                                            ? 'bg-gray-800/80 border-gray-700 text-gray-300'
                                            : 'bg-white border-slate-200 text-slate-700'
                                            }`}>
                                            <th className="p-3">Tanggal</th>
                                            <th className="p-3">No. Bukti</th>
                                            <th className="p-3 text-right">Invoice</th>
                                            <th className="p-3 text-right">Total Terbayar</th>
                                            <th className="p-3 text-right">Pengurang Piutang</th>
                                            <th className="p-3 text-right">Kwitansi</th>
                                            <th className="p-3 text-right">Selisih</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-gray-700 font-mono">
                                        {(group.details || []).map((d, dIdx) => (
                                            <tr key={dIdx} className={`transition ${isDarkMode ? 'hover:bg-gray-800/50 text-gray-200' : 'hover:bg-slate-50/80 text-slate-800'
                                                }`}>
                                                <td className="p-3">{d.tanggal}</td>
                                                <td className="p-3 font-bold text-slate-700 dark:text-slate-200">{d.no_bukti}</td>
                                                <td className="p-3 text-right font-bold text-sky-600 dark:text-sky-400">{Number(d.invoice_nominal || 0).toLocaleString('id-ID')}</td>
                                                <td className="p-3 text-right">{Number(d.total_terbayar || 0).toLocaleString('id-ID')}</td>
                                                <td className="p-3 text-right text-rose-500">{Number(d.pengurang_piutang || 0).toLocaleString('id-ID')}</td>
                                                <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{Number(d.bayar_kwitansi || 0).toLocaleString('id-ID')}</td>
                                                <td className="p-3 text-right">{Number(d.selisih_penambah || 0).toLocaleString('id-ID')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className={`font-black border-t ${isDarkMode
                                            ? 'bg-gray-900 border-gray-700 text-gray-200'
                                            : 'bg-slate-100 border-slate-200 text-slate-800'
                                            }`}>
                                            <td colSpan={2} className="p-3 text-right uppercase">SUBTOTAL :</td>
                                            <td className="p-3 text-right font-mono text-sky-600 dark:text-sky-400">{Number(group.subtotal_invoice || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-3 text-right font-mono">{Number(group.subtotal_terbayar || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-3 text-right font-mono text-rose-500">{Number(group.subtotal_potongan || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{Number(group.subtotal_kwitansi || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-3 text-right font-mono">{Number(group.subtotal_penambah || 0).toLocaleString('id-ID')}</td>
                                        </tr>
                                        <tr className={`font-black border-t ${isDarkMode
                                            ? 'bg-sky-950/40 border-sky-900 text-sky-300'
                                            : 'bg-sky-100 border-sky-100 text-sky-900'
                                            }`}>
                                            <td colSpan={6} className="p-3 text-right uppercase tracking-wide">SALDO AKHIR CUSTOMER :</td>
                                            <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400 text-sm">
                                                Rp {Number(group.saldo_akhir || 0).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. TAMPILAN MODE REKAP */}
                {modeLaporan === '2' && (
                    <div className="overflow-x-auto text-xs">
                        <table className={`w-full text-left border-collapse border rounded-xl ${isDarkMode ? 'border-gray-700' : 'border-slate-200'
                            }`}>
                            <thead>
                                <tr className={`font-black uppercase text-[11px] border-b ${isDarkMode
                                    ? 'bg-gray-900 border-gray-700 text-gray-300'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}>
                                    <th className="p-3.5">Cabang</th>
                                    <th className="p-3.5">Kode</th>
                                    <th className="p-3.5">Pelanggan</th>
                                    <th className="p-3.5 text-right">Saldo Awal</th>
                                    <th className="p-3.5 text-right">Transaksi (Invoice)</th>
                                    <th className="p-3.5 text-right">Pembayaran</th>
                                    <th className="p-3.5 text-right">Saldo Akhir Piutang</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-gray-700 font-medium">
                                {(reportData || []).map((row, idx) => (
                                    <tr key={idx} className={`transition ${isDarkMode ? 'hover:bg-gray-700/30 text-gray-200' : 'hover:bg-slate-50 text-slate-800'
                                        }`}>
                                        <td className="p-3.5">{row.cabang_nama}</td>
                                        <td className="p-3.5 font-mono font-bold text-sky-600 dark:text-sky-400">{row.cust_id}</td>
                                        <td className="p-3.5 font-bold">{row.cust_name}</td>
                                        <td className="p-3.5 text-right font-mono">{Number(row.saldo_awal || 0).toLocaleString('id-ID')}</td>
                                        <td className="p-3.5 text-right font-mono font-bold text-sky-600 dark:text-sky-400">{Number(row.transaksi || 0).toLocaleString('id-ID')}</td>
                                        <td className="p-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{Number(row.pembayaran || 0).toLocaleString('id-ID')}</td>
                                        <td className="p-3.5 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                            Rp {Number(row.saldo_akhir || 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className={`font-black border-t-2 ${isDarkMode
                                    ? 'bg-gray-900 border-gray-600 text-white'
                                    : 'bg-slate-100 border-slate-300 text-slate-900'
                                    }`}>
                                    <td colSpan={3} className="p-3.5 text-right uppercase">GRAND TOTAL :</td>
                                    <td className="p-3.5 text-right font-mono">Rp {grand.awal.toLocaleString('id-ID')}</td>
                                    <td className="p-3.5 text-right font-mono text-sky-600 dark:text-sky-400">Rp {grand.trans.toLocaleString('id-ID')}</td>
                                    <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">Rp {grand.bayar.toLocaleString('id-ID')}</td>
                                    <td className="p-3.5 text-right font-mono text-rose-600 dark:text-rose-400 text-sm">Rp {grand.akhir.toLocaleString('id-ID')}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {/* 3. TAMPILAN MODE KARTU PIUTANG */}
                {modeLaporan === '3' && (
                    <div className="space-y-6 overflow-x-auto text-xs">
                        {(reportData || []).map((group, kIdx) => (
                            <div key={kIdx} className={`border rounded-xl overflow-hidden shadow-xs ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-slate-200 bg-white'
                                }`}>
                                <div className={`p-3.5 flex justify-between items-center font-bold border-b ${isDarkMode
                                    ? 'bg-gray-900 border-gray-700 text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sky-600 font-black">KARTU PIUTANG:</span>
                                        <span className="font-bold">{group.cust_name}</span>
                                        <span className={`font-mono text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                            ({group.cust_id})
                                        </span>
                                    </div>
                                    <div>
                                        <span className={isDarkMode ? 'text-gray-400' : 'text-slate-500'}>SALDO AWAL: </span>
                                        <strong className="font-mono text-slate-800 dark:text-white">
                                            Rp {Number(group.saldo_awal || 0).toLocaleString('id-ID')}
                                        </strong>
                                    </div>
                                </div>

                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className={`border-b font-black text-[11px] uppercase ${isDarkMode
                                            ? 'bg-gray-800/80 border-gray-700 text-gray-300'
                                            : 'bg-white border-slate-200 text-slate-700'
                                            }`}>
                                            <th className="p-3 text-left">Tanggal</th>
                                            <th className="p-3 text-left">No. Bukti</th>
                                            <th className="p-3 text-left">Keterangan</th>
                                            <th className="p-3 text-right">Penjualan (Debet)</th>
                                            <th className="p-3 text-right">Pembayaran (Kredit)</th>
                                            <th className="p-3 text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-gray-700 font-mono">
                                        {(group.rows || []).map((r, rIdx) => (
                                            <tr key={rIdx} className={`transition ${isDarkMode ? 'hover:bg-gray-800/50 text-gray-200' : 'hover:bg-slate-50/80 text-slate-800'
                                                }`}>
                                                <td className="p-3">{r.tanggal}</td>
                                                <td className="p-3 font-bold text-slate-700 dark:text-slate-200">{r.no_bukti}</td>
                                                <td className="p-3 font-sans font-medium">{r.keterangan}</td>
                                                <td className="p-3 text-right text-sky-600 dark:text-sky-400">{r.penjualan ? Number(r.penjualan).toLocaleString('id-ID') : '-'}</td>
                                                <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">{r.pembayaran ? Number(r.pembayaran).toLocaleString('id-ID') : '-'}</td>
                                                <td className="p-3 text-right font-black text-slate-800 dark:text-white">
                                                    Rp {Number(r.saldo || 0).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {(!reportData || reportData.length === 0) && !loading && (
                    <div className="p-12 text-center text-slate-400 font-bold text-xs">
                        Tidak ada catatan mutasi piutang pada filter periode ini.
                    </div>
                )}
            </div>
        </div>
    );
};

export default MutasiPiutang;