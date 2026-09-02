import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import {
    FileText,
    Printer,
    X,
    CheckCircle2,
    Calendar,
    Building,
    Search,
    RotateCcw,
    DollarSign,
    Filter,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowUpRight
} from 'lucide-react';
import Swal from 'sweetalert2';

const PenerimaanSetoranAgen = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [agens, setAgens] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [showFilter, setShowFilter] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter Form State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [filterAgen, setFilterAgen] = useState('ALL');
    const [filterTerbayar, setFilterTerbayar] = useState('ALL');
    const [filterPosting, setFilterPosting] = useState('ALL');
    const [filterNoClosing, setFilterNoClosing] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modal State
    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedClosing, setSelectedClosing] = useState(null);
    const [bttList, setBttList] = useState([]);

    // Print Report Modal State
    const [printReportType, setPrintReportType] = useState(null); // 'tipe1' | 'tipe2' | 'os'

    // Form Input Modal
    const [inputTanggal, setInputTanggal] = useState(() => new Date().toISOString().split('T')[0]);
    const [inputCAID, setInputCAID] = useState('');
    const [inputNominal, setInputNominal] = useState(0);
    const [inputKeterangan, setInputKeterangan] = useState('');

    const fetchData = async (useDateFilter = false) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const params = { pt_id: ptId };
            if (useDateFilter && startDate && endDate) {
                params.start_date = startDate;
                params.end_date = endDate;
            }
            if (filterAgen !== 'ALL') params.agen_nama = filterAgen;
            if (filterTerbayar !== 'ALL') params.terbayar = filterTerbayar;
            if (filterPosting !== 'ALL') params.posting = filterPosting;
            if (filterNoClosing) params.no_closing = filterNoClosing;

            const res = await api.get('/piutang/penerimaan-setoran-agen', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setData(res.data?.data || []);
            setCurrentPage(1);
        } catch (err) {
            console.error("Gagal load setoran agen:", err);
            Swal.fire('Error', 'Gagal memuat data penerimaan setoran agen', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const [resAgen, resAcc] = await Promise.all([
                api.get(`/agens?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
                api.get(`/akun/kas-bank-dropdown?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } }))
            ]);

            setAgens(resAgen.data?.data || []);
            const accList = resAcc.data?.data || [];
            setAccounts(accList);
            if (accList.length > 0) setInputCAID(accList[0].ca_id);
        } catch (err) {
            console.error("Gagal load options:", err);
        }
    };

    useEffect(() => {
        fetchData();
        fetchOptions();
    }, []);

    const handleResetFilter = () => {
        const d = new Date();
        setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
        setEndDate(new Date().toISOString().split('T')[0]);
        setFilterAgen('ALL');
        setFilterTerbayar('ALL');
        setFilterPosting('ALL');
        setFilterNoClosing('');
        setSearchQuery('');
        fetchData(false);
    };

    const filteredData = useMemo(() => {
        if (!searchQuery) return data;
        const q = searchQuery.toLowerCase();
        return data.filter(item =>
            (item.btth_id && item.btth_id.toLowerCase().includes(q)) ||
            (item.agen_nama && item.agen_nama.toLowerCase().includes(q)) ||
            (item.no_pembayaran && item.no_pembayaran.toLowerCase().includes(q)) ||
            (item.no_jurnal && item.no_jurnal.toLowerCase().includes(q))
        );
    }, [data, searchQuery]);

    const kpiSummary = useMemo(() => {
        const totalClosing = filteredData.length;
        const totalNominal = filteredData.reduce((acc, curr) => acc + Number(curr.jml_setoran || 0), 0);
        const totalTerbayar = filteredData.filter(d => d.stt_bayar === 'Y').reduce((acc, curr) => acc + Number(curr.jml_setoran || 0), 0);
        const totalBelumTerbayar = totalNominal - totalTerbayar;
        const countBelumBayar = filteredData.filter(d => d.stt_bayar !== 'Y').length;

        return { totalClosing, totalNominal, totalTerbayar, totalBelumTerbayar, countBelumBayar };
    }, [filteredData]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage]);

    const handleOpenProcess = (item) => {
        setSelectedClosing(item);
        setInputTanggal(new Date().toISOString().split('T')[0]);
        if (accounts.length > 0) setInputCAID(accounts[0].ca_id);
        setInputNominal(item.jml_setoran || 0);
        setInputKeterangan(`Penerimaan setoran closing BTT ${item.btth_id} - Agen ${item.agen_nama}`);
        setIsProcessModalOpen(true);
    };

    const handleSaveProcess = async () => {
        if (!inputCAID) {
            Swal.fire('Peringatan', 'Silakan pilih rekening akun kas/bank penerima!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            await api.post('/piutang/penerimaan-setoran-agen/proses', {
                pt_id: ptId,
                btth_id: selectedClosing.btth_id,
                agen_nama: selectedClosing.agen_nama,
                tanggal: inputTanggal,
                ca_id: inputCAID,
                nominal: parseFloat(inputNominal),
                keterangan: inputKeterangan
            }, { headers: { Authorization: `Bearer ${token}` } });

            Swal.fire('Sukses', 'Setoran agen berhasil diterima dan diproses', 'success');
            setIsProcessModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Gagal proses setoran:", err);
            Swal.fire('Error', 'Gagal memproses setoran agen', 'error');
        }
    };

    const handleOpenDetail = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get('/piutang/penerimaan-setoran-agen/detail', {
                params: { btth_id: item.btth_id, pt_id: ptId },
                headers: { Authorization: `Bearer ${token}` }
            });

            setSelectedClosing(res.data?.data?.header || item);
            setBttList(res.data?.data?.items || []);
            setIsDetailModalOpen(true);
        } catch (err) {
            console.error("Gagal detail setoran:", err);
            Swal.fire('Error', 'Gagal memuat rincian resi closing', 'error');
        }
    };

    const printDataset = useMemo(() => {
        if (printReportType === 'os') {
            return filteredData.filter(d => d.stt_bayar !== 'Y');
        }
        return filteredData;
    }, [filteredData, printReportType]);

    return (
        <div className={`min-h-screen p-4 md:p-6 space-y-6 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

            {/* TOP HEADER CARD */}
            <div className={`p-6 rounded-2xl shadow-sm border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                }`}>
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md flex items-center justify-center">
                            <DollarSign size={22} className="stroke-[2.5]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Penerimaan Setoran Agen
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                                Monitoring closing penjualan BTT harian agen, penerimaan kasir, dan status jurnal piutang.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ACTION TOOLS */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <button
                        type="button"
                        onClick={() => setShowFilter(!showFilter)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border ${showFilter
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : isDarkMode
                                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 shadow-xs'
                            }`}
                    >
                        <Filter size={15} /> Filter Data
                    </button>

                    <button
                        type="button"
                        onClick={() => setPrintReportType('tipe1')}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 transition shadow-sm cursor-pointer"
                    >
                        <Printer size={15} /> Cetak Tipe 1
                    </button>

                    <button
                        type="button"
                        onClick={() => setPrintReportType('tipe2')}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 transition shadow-sm cursor-pointer"
                    >
                        <Printer size={15} /> Cetak Tipe 2
                    </button>

                    <button
                        type="button"
                        onClick={() => setPrintReportType('os')}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 transition shadow-sm cursor-pointer"
                    >
                        <AlertCircle size={15} /> OS Belum Bayar
                    </button>
                </div>
            </div>

            {/* KPI STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                    }`}>
                    <div>
                        <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Dokumen Closing</div>
                        <div className="text-2xl font-black font-mono mt-1 text-slate-900 dark:text-white">
                            {kpiSummary.totalClosing} <span className="text-xs font-sans font-bold text-slate-500">Berkas</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                        <FileText size={22} className="stroke-[2.5]" />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                    }`}>
                    <div>
                        <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Nilai Setoran</div>
                        <div className="text-2xl font-black font-mono mt-1 text-indigo-600 dark:text-indigo-400">
                            Rp {kpiSummary.totalNominal.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                        <TrendingUp size={22} className="stroke-[2.5]" />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                    }`}>
                    <div>
                        <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sudah Diterima (Lunas)</div>
                        <div className="text-2xl font-black font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                            Rp {kpiSummary.totalTerbayar.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                        <CheckCircle size={22} className="stroke-[2.5]" />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                    }`}>
                    <div>
                        <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Outstanding (Belum Bayar)</div>
                        <div className="text-2xl font-black font-mono mt-1 text-rose-600 dark:text-rose-400">
                            Rp {kpiSummary.totalBelumTerbayar.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                        <Clock size={22} className="stroke-[2.5]" />
                    </div>
                </div>
            </div>

            {/* FILTER PANEL */}
            {showFilter && (
                <div className={`p-6 rounded-2xl border shadow-sm transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                    }`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
                        <div>
                            <label className="block mb-1.5 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <Calendar size={14} className="text-blue-600" /> Dari Tanggal:
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                    }`}
                            />
                        </div>
                        <div>
                            <label className="block mb-1.5 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <Calendar size={14} className="text-blue-600" /> Sampai Tanggal:
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                    }`}
                            />
                        </div>
                        <div>
                            <label className="block mb-1.5 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <Building size={14} className="text-blue-600" /> Agen / Cabang:
                            </label>
                            <select
                                value={filterAgen}
                                onChange={(e) => setFilterAgen(e.target.value)}
                                className={`w-full p-2.5 border rounded-xl font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                    }`}
                            >
                                <option value="ALL">-- SEMUA AGEN --</option>
                                {agens.map((a) => (
                                    <option key={a.agen_id} value={a.agen_nama}>{a.agen_nama}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1.5 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <FileText size={14} className="text-blue-600" /> Status Bayar:
                            </label>
                            <select
                                value={filterTerbayar}
                                onChange={(e) => setFilterTerbayar(e.target.value)}
                                className={`w-full p-2.5 border rounded-xl font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                    }`}
                            >
                                <option value="ALL">-- SEMUA STATUS --</option>
                                <option value="Y">TERBAYAR (LUNAS)</option>
                                <option value="N">BELUM TERBAYAR (OS)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-4 py-2 border rounded-xl font-bold text-xs flex items-center gap-1.5 transition text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                            <RotateCcw size={14} /> Reset Filter
                        </button>
                        <button
                            type="button"
                            onClick={() => fetchData(true)}
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            <Search size={15} /> {loading ? 'Memuat...' : 'Cari Data'}
                        </button>
                    </div>
                </div>
            )}

            {/* DATA TABLE */}
            <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                }`}>

                {/* Table Header Bar */}
                <div className="p-5 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Daftar Closing Setoran Agen
                    </div>
                    <div className="relative w-full sm:w-80">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari no closing / agen / kwitansi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 text-xs font-bold rounded-xl border outline-none transition ${isDarkMode
                                ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                                }`}
                        />
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className={`border-b font-black uppercase tracking-wider text-[11px] ${isDarkMode ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-800 border-slate-300'
                                }`}>
                                <th className="p-3.5 pl-5">NO. CLOSING</th>
                                <th className="p-3.5">TANGGAL</th>
                                <th className="p-3.5">AGEN / CABANG</th>
                                <th className="p-3.5 text-center">KOMISI (%)</th>
                                <th className="p-3.5 text-right">JML. SETORAN</th>
                                <th className="p-3.5 text-center">NO. PEMBAYARAN</th>
                                <th className="p-3.5">NO. JURNAL</th>
                                <th className="p-3.5 text-center">POSTING</th>
                                <th className="p-3.5 pr-5 text-center">AKSI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-semibold">
                            {paginatedData.map((item, idx) => (
                                <tr
                                    key={idx}
                                    className="hover:bg-blue-50/60 dark:hover:bg-blue-950/40 transition-colors"
                                >
                                    <td className="p-3.5 pl-5">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenDetail(item)}
                                            className="font-mono font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            {item.btth_id}
                                            <ArrowUpRight size={13} />
                                        </button>
                                    </td>
                                    <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                                        {item.btth_tanggal_str}
                                    </td>
                                    <td className="p-3.5 font-black text-slate-900 dark:text-white">
                                        {item.agen_nama}
                                    </td>
                                    <td className="p-3.5 text-center font-mono font-black text-slate-800 dark:text-slate-200">
                                        {Number(item.agen_komisikirim || 0)}%
                                    </td>
                                    <td className="p-3.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                        Rp {Number(item.jml_setoran || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="p-3.5 text-center">
                                        {item.no_pembayaran ? (
                                            <span className="font-mono font-black text-cyan-700 dark:text-cyan-400 px-2.5 py-1 rounded-md bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-800">
                                                {item.no_pembayaran}
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenProcess(item)}
                                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-[10px] tracking-wider uppercase transition cursor-pointer shadow-xs"
                                            >
                                                PROSES
                                            </button>
                                        )}
                                    </td>
                                    <td className="p-3.5 font-mono font-bold text-slate-600 dark:text-slate-400">
                                        {item.no_jurnal || '-'}
                                    </td>
                                    <td className="p-3.5 text-center">
                                        {item.posting_yn === 'Y' ? (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                                                POSTED
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                                DRAFT
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3.5 pr-5 text-center">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenDetail(item)}
                                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition cursor-pointer"
                                            title="Lihat Rincian BTT Closing"
                                        >
                                            <FileText size={17} />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {paginatedData.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-10 text-center text-slate-500 font-bold">
                                        {loading ? 'Sedang memuat data setoran agen...' : 'Tidak ada data closing setoran yang ditemukan.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-bold">
                    <div className="text-slate-600 dark:text-slate-400">
                        Menampilkan {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} data
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer text-slate-800 dark:text-white"
                        >
                            Sebelumnya
                        </button>
                        <span className="px-3 py-1.5 font-black font-mono text-slate-900 dark:text-white">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer text-slate-800 dark:text-white"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL PROSES PENERIMAAN SETORAN */}
            {isProcessModalOpen && selectedClosing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-lg p-6 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] bg-white text-slate-900 border border-slate-300">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-300 mb-4">
                            <h3 className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
                                <DollarSign size={20} className="text-emerald-600 stroke-[2.5]" /> Proses Penerimaan Setoran Kasir
                            </h3>
                            <button onClick={() => setIsProcessModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-600 hover:text-black">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs font-semibold">
                            <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl space-y-1.5 font-mono">
                                <div><strong className="text-slate-700">NO. CLOSING : </strong> <span className="text-blue-600 font-black">{selectedClosing.btth_id}</span></div>
                                <div><strong className="text-slate-700">AGEN PENGIRIM : </strong> <span className="text-slate-900 font-black">{selectedClosing.agen_nama}</span></div>
                                <div><strong className="text-slate-700">TOTAL NOMINAL : </strong> <span className="font-black text-emerald-600 text-sm">Rp {Number(selectedClosing.jml_setoran || 0).toLocaleString('id-ID')}</span></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold mb-1.5 text-slate-800">TANGGAL PENERIMAAN :</label>
                                    <input
                                        type="date"
                                        value={inputTanggal}
                                        onChange={(e) => setInputTanggal(e.target.value)}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold font-mono outline-none bg-white text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold mb-1.5 text-slate-800">AKUN KAS / BANK :</label>
                                    <select
                                        value={inputCAID}
                                        onChange={(e) => setInputCAID(e.target.value)}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold outline-none bg-white text-slate-900 cursor-pointer"
                                    >
                                        {accounts.map((a) => (
                                            <option key={a.ca_id} value={a.ca_id}>{a.ca_id} - {a.ca_nama}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold mb-1.5 text-slate-800">NOMINAL DITERIMA (RP) :</label>
                                <input
                                    type="number"
                                    value={inputNominal}
                                    onChange={(e) => setInputNominal(e.target.value)}
                                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-black text-emerald-700 text-sm outline-none bg-white"
                                />
                            </div>

                            <div>
                                <label className="block font-bold mb-1.5 text-slate-800">KETERANGAN SETORAN :</label>
                                <textarea
                                    rows={2}
                                    value={inputKeterangan}
                                    onChange={(e) => setInputKeterangan(e.target.value)}
                                    className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold outline-none bg-white text-slate-900"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-300 mt-4">
                            <button
                                type="button"
                                onClick={() => setIsProcessModalOpen(false)}
                                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 text-xs cursor-pointer hover:bg-slate-100"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveProcess}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                            >
                                <CheckCircle2 size={16} /> Konfirmasi & Buat Kwitansi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL CLOSING RESI BTT */}
            {isDetailModalOpen && selectedClosing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl p-6 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] bg-white text-slate-900 border border-slate-300">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-300 mb-4 print:hidden">
                            <h3 className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
                                <FileText size={20} className="text-blue-600" /> Detail Laporan Closing Penjualan BTT Agen
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-1.5 bg-[#0284c7] hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                                >
                                    <Printer size={15} /> Cetak Lembar Closing
                                </button>
                                <button onClick={() => setIsDetailModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-600 hover:text-black">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 overflow-y-auto text-xs p-2 text-slate-900">
                            <div className="border-b border-slate-300 pb-3 grid grid-cols-2 gap-y-1.5 font-mono font-bold">
                                <div><strong className="text-slate-600">NO. CLOSING : </strong> <span className="font-black text-blue-600">{selectedClosing.btth_id}</span></div>
                                <div><strong className="text-slate-600">TANGGAL : </strong> {selectedClosing.btth_tanggal ? new Date(selectedClosing.btth_tanggal).toLocaleDateString('id-ID') : '-'}</div>
                                <div><strong className="text-slate-600">AGEN / MITRA : </strong> <span className="font-black text-slate-900">{selectedClosing.agen_nama}</span></div>
                                <div><strong className="text-slate-600">KOMISI AGEN : </strong> {selectedClosing.agen_komisikirim || 0}%</div>
                                <div><strong className="text-slate-600">BUKTI PEMBAYARAN : </strong> <span className="font-black text-emerald-600">{selectedClosing.no_pembayaran || 'BELUM TERBAYAR'}</span></div>
                                <div><strong className="text-slate-600">STATUS POSTING : </strong> {selectedClosing.posting_yn === 'Y' ? 'POSTED' : 'DRAFT'}</div>
                            </div>

                            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 font-black text-[11px] uppercase">
                                        <th className="p-2.5">No. BTT / Resi</th>
                                        <th className="p-2.5">Penerima</th>
                                        <th className="p-2.5">Tujuan</th>
                                        <th className="p-2.5 text-right">Ongkir</th>
                                        <th className="p-2.5 text-right">Penerus</th>
                                        <th className="p-2.5 text-right">Packing</th>
                                        <th className="p-2.5 text-right">Asuransi</th>
                                        <th className="p-2.5 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white font-mono text-slate-900 font-bold">
                                    {bttList.map((b, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2.5 text-blue-600">{b.btt_id}</td>
                                            <td className="p-2.5 font-sans font-semibold">{b.penerima}</td>
                                            <td className="p-2.5 font-sans font-semibold">{b.tujuan}</td>
                                            <td className="p-2.5 text-right">Rp {Number(b.harga || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2.5 text-right">Rp {Number(b.biaya_penerus || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2.5 text-right">Rp {Number(b.biaya_packing || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2.5 text-right">Rp {Number(b.biaya_asuransi || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2.5 text-right text-emerald-700">
                                                Rp {Number(b.total_btt || 0).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))}
                                    {bttList.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-4 text-center text-slate-500 font-semibold">Tidak ada rincian resi untuk closing ini</td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-100 font-black border-t border-slate-300 text-slate-900">
                                        <td colSpan={7} className="p-2.5 text-right">TOTAL SETORAN CLOSING :</td>
                                        <td className="p-2.5 text-right font-mono text-emerald-700 text-sm font-black">
                                            Rp {bttList.reduce((acc, curr) => acc + Number(curr.total_btt || 0), 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL CETAK LAPORAN (TIPE 1 / TIPE 2 / OS BELUM BAYAR) */}
            {printReportType && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-6xl p-6 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] bg-white text-black border border-slate-300">
                        {/* Print Action Bar */}
                        <div className="flex justify-between items-center pb-3 border-b border-slate-300 mb-4 print:hidden">
                            <h3 className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
                                <Printer size={20} className="text-blue-600" />
                                {printReportType === 'tipe1' && 'Cetak Faktur Penagihan / Setoran Agen (Tipe 1)'}
                                {printReportType === 'tipe2' && 'Cetak Rekapitulasi Penerimaan Pembayaran (Tipe 2)'}
                                {printReportType === 'os' && 'Cetak Laporan Closing Agen Belum Terbayar (OS)'}
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                                >
                                    <Printer size={16} /> Cetak Dokumen
                                </button>
                                <button onClick={() => setPrintReportType(null)} className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer text-slate-600 hover:text-black">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Lembar Dokumen Siap Cetak */}
                        <div className="space-y-4 overflow-y-auto text-xs p-3 text-black font-sans">
                            {/* Kop Surat dengan Logo Dakota */}
                            <div className="flex justify-between items-center border-b-2 border-black pb-3 gap-4">
                                <div className="flex items-center gap-3.5">
                                    <img
                                        src="/src/assets/new_logo 2.png"
                                        alt="Dakota Cargo Logo"
                                        className="h-12 w-auto object-contain"
                                        onError={(e) => {
                                            // Fallback jika path url assets berbeda
                                            e.target.src = '/src/assets/logo.png';
                                        }}
                                    />
                                    <div>
                                        <div className="font-black text-sm uppercase tracking-wider text-slate-900">PT DAKOTA LOGISTIK INDONESIA</div>
                                        <div className="text-[11px] font-semibold text-slate-700">Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi - BEKASI KOTA</div>
                                        <div className="text-[11px] font-semibold text-slate-700">(021) 8603278 / (021) 86608589</div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-base font-black uppercase tracking-widest text-slate-900 font-mono">
                                        {printReportType === 'tipe1' && 'FAKTUR PENAGIHAN SETORAN AGEN'}
                                        {printReportType === 'tipe2' && 'REKAPITULASI PENERIMAAN PEMBAYARAN'}
                                        {printReportType === 'os' && 'LAPORAN CLOSING AGENT BELUM TERBAYAR (OS)'}
                                    </div>
                                    <div className="text-[11px] font-bold font-mono text-slate-800 mt-0.5">
                                        Periode: {startDate} s/d {endDate}
                                    </div>
                                </div>
                            </div>

                            {/* TABEL CETAK TIPE 1 & OS */}
                            {(printReportType === 'tipe1' || printReportType === 'os') && (
                                <table className="w-full text-left border-collapse border border-slate-400 text-xs mt-2">
                                    <thead>
                                        <tr className="bg-slate-200 border-b border-slate-400 font-black text-[11px] uppercase">
                                            <th className="p-2 border-r border-slate-400">No. Closing</th>
                                            <th className="p-2 border-r border-slate-400">Tanggal</th>
                                            <th className="p-2 border-r border-slate-400">Agen / Cabang</th>
                                            <th className="p-2 text-center border-r border-slate-400">Komisi %</th>
                                            <th className="p-2 text-right">Total Setoran (Rp)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-300 font-mono font-semibold">
                                        {printDataset.map((row, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2 border-r border-slate-300 font-bold">{row.btth_id}</td>
                                                <td className="p-2 border-r border-slate-300">{row.btth_tanggal_str}</td>
                                                <td className="p-2 border-r border-slate-300 font-sans">{row.agen_nama}</td>
                                                <td className="p-2 text-center border-r border-slate-300">{Number(row.agen_komisikirim || 0)}%</td>
                                                <td className="p-2 text-right font-black">
                                                    Rp {Number(row.jml_setoran || 0).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        ))}
                                        {printDataset.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-slate-500">Tidak ada data setoran untuk dicetak</td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-200 font-black border-t-2 border-slate-400 text-black">
                                            <td colSpan={4} className="p-2.5 text-right uppercase">TOTAL KESELURUHAN :</td>
                                            <td className="p-2.5 text-right font-mono text-sm font-black">
                                                Rp {printDataset.reduce((acc, curr) => acc + Number(curr.jml_setoran || 0), 0).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}

                            {/* TABEL CETAK TIPE 2 (MULTI-LEVEL DETAIL) */}
                            {printReportType === 'tipe2' && (
                                <table className="w-full text-left border-collapse border border-slate-400 text-[11px] mt-2">
                                    <thead>
                                        <tr className="bg-slate-200 border-b border-slate-400 font-black uppercase text-center text-[10px]">
                                            <th className="p-2 border-r border-slate-400">No Receipt</th>
                                            <th className="p-2 border-r border-slate-400">No Jurnal</th>
                                            <th className="p-2 border-r border-slate-400">Tanggal</th>
                                            <th className="p-2 border-r border-slate-400">Customer / Agen</th>
                                            <th className="p-2 border-r border-slate-400">No Closing</th>
                                            <th className="p-2 border-r border-slate-400 text-right">Cash / Nilai</th>
                                            <th className="p-2 border-r border-slate-400 text-center">Status Bayar</th>
                                            <th className="p-2 text-center">Posting</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-300 font-mono font-semibold">
                                        {printDataset.map((row, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2 border-r border-slate-300 font-bold">{row.no_pembayaran || '-'}</td>
                                                <td className="p-2 border-r border-slate-300">{row.no_jurnal || '-'}</td>
                                                <td className="p-2 border-r border-slate-300">{row.btth_tanggal_str}</td>
                                                <td className="p-2 border-r border-slate-300 font-sans">{row.agen_nama}</td>
                                                <td className="p-2 border-r border-slate-300 font-bold">{row.btth_id}</td>
                                                <td className="p-2 text-right border-r border-slate-300 font-black">
                                                    Rp {Number(row.jml_setoran || 0).toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-2 text-center border-r border-slate-300">
                                                    {row.stt_bayar === 'Y' ? 'LUNAS' : 'PENDING'}
                                                </td>
                                                <td className="p-2 text-center">
                                                    {row.posting_yn === 'Y' ? 'POSTED' : 'DRAFT'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-200 font-black border-t-2 border-slate-400 text-black">
                                            <td colSpan={5} className="p-2.5 text-right uppercase">TOTAL REKAPITULASI :</td>
                                            <td className="p-2.5 text-right font-mono text-sm font-black">
                                                Rp {printDataset.reduce((acc, curr) => acc + Number(curr.jml_setoran || 0), 0).toLocaleString('id-ID')}
                                            </td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default PenerimaanSetoranAgen;