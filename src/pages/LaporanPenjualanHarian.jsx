import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Filter, RefreshCw, Printer, Calendar, FileText, CheckCircle2,
    XCircle, Plus, Eye, ArrowLeft, Send, RotateCcw, AlertTriangle
} from 'lucide-react';

const LaporanPenjualanHarian = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Filter Form State
    const [chkTanggal, setChkTanggal] = useState(false);
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);

    const [chkCabang, setChkCabang] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState('');
    const [cabangOptions, setCabangOptions] = useState([]);

    const [chkPembayaran, setChkPembayaran] = useState(false);
    const [pembayaranVal, setPembayaranVal] = useState('1');

    const [chkPosting, setChkPosting] = useState(false);
    const [postingVal, setPostingVal] = useState('Y');

    const [chkNoLap, setChkNoLap] = useState(false);
    const [noLapText, setNoLapText] = useState('');

    const [chkNoBTT, setChkNoBTT] = useState(false);
    const [noBTTText, setNoBTTText] = useState('');

    // State View
    const [showFilter, setShowFilter] = useState(true);
    const [loading, setLoading] = useState(false);
    const [dataList, setDataList] = useState([]);

    // State Detail Modal / View
    const [selectedHeader, setSelectedHeader] = useState(null);
    const [detailList, setDetailList] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);

    // State Modal Buat Baru
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createTgl, setCreateTgl] = useState(today);
    const [createCabang, setCreateCabang] = useState('');
    const [createBayar, setCreateBayar] = useState('1');
    const [availableBTT, setAvailableBTT] = useState([]);
    const [selectedBTTIDs, setSelectedBTTIDs] = useState([]);
    const [createLoading, setCreateLoading] = useState(false);

    // Load Cabang Dropdown
    useEffect(() => {
        const loadCabang = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await api.get('/laporan/btt-counter/combo-cabang', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const cList = res.data?.data || [];
                setCabangOptions(cList);
                if (cList.length > 0) {
                    setSelectedCabang(cList[0]);
                    setCreateCabang(cList[0]);
                }
            } catch (err) {
                console.error("Gagal load combo cabang:", err);
            }
        };
        loadCabang();
    }, []);

    // Fetch Daftar Header
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                chktanggal: chkTanggal ? 'true' : 'false',
                start_date: startDate,
                end_date: endDate,
                chkcabang: chkCabang ? 'true' : 'false',
                cabang: chkCabang ? selectedCabang : '',
                chkpembayaran: chkPembayaran ? 'true' : 'false',
                pembayaran: chkPembayaran ? pembayaranVal : '',
                chkposting: chkPosting ? 'true' : 'false',
                posting: chkPosting ? postingVal : '',
                chknolap: chkNoLap ? 'true' : 'false',
                nolap: chkNoLap ? noLapText : '',
                chknobtt: chkNoBTT ? 'true' : 'false',
                nobtt: chkNoBTT ? noBTTText : ''
            });

            const res = await api.get(`/laporan/penjualan-harian/data?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDataList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load laporan harian:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Load Detail Resi
    const handleViewDetail = async (headerItem) => {
        setSelectedHeader(headerItem);
        setDetailLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/laporan/penjualan-harian/detail/${headerItem.btth_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDetailList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load rincian resi:", err);
            setDetailList([]);
        } finally {
            setDetailLoading(false);
        }
    };

    // Toggle Posting Status
    const handleTogglePosting = async (btthId, currentStatus) => {
        const action = currentStatus === 'Y' ? 'UNPOSTING' : 'POSTING';
        if (!window.confirm(`Apakah Anda yakin ingin melakukan ${action} pada laporan ${btthId}?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/laporan/penjualan-harian/toggle-posting', {
                btth_id: btthId,
                action: action
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchData();
            if (selectedHeader && selectedHeader.btth_id === btthId) {
                setSelectedHeader(prev => ({
                    ...prev,
                    btth_postingyn: currentStatus === 'Y' ? 'N' : 'Y'
                }));
            }
        } catch (err) {
            alert("Gagal memperbarui status posting: " + (err.response?.data?.message || err.message));
        }
    };

    // Load BTT yang belum di-closing
    const handleOpenCreateModal = async () => {
        setIsCreateModalOpen(true);
        setSelectedBTTIDs([]);
        setCreateLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/laporan/penjualan-harian/btt-tersedia?pembayaran=${createBayar}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvailableBTT(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load btt tersedia:", err);
            setAvailableBTT([]);
        } finally {
            setCreateLoading(false);
        }
    };

    const handleSaveNewLaporan = async () => {
        if (selectedBTTIDs.length === 0) {
            alert("Pilih minimal 1 resi BTT untuk di-closing ke laporan!");
            return;
        }

        if (!window.confirm(`Konfirmasi: ${selectedBTTIDs.length} resi akan di-closing ke laporan penjualan harian?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/laporan/penjualan-harian/create', {
                tanggal: createTgl,
                agen_id: createCabang,
                pembayaran: createBayar,
                nobtt_list: selectedBTTIDs
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert("Laporan Penjualan Harian berhasil diterbitkan!");
            setIsCreateModalOpen(false);
            fetchData();
        } catch (err) {
            alert("Gagal membuat laporan: " + (err.response?.data?.message || err.message));
        }
    };

    // KPI Header Calculation
    const totalLaporan = dataList.length;
    const totalSemuaResi = useMemo(() => dataList.reduce((acc, i) => acc + (i.total_btt || 0), 0), [dataList]);
    const totalSemuaColly = useMemo(() => dataList.reduce((acc, i) => acc + (i.total_colly || 0), 0), [dataList]);
    const totalSemuaNominal = useMemo(() => dataList.reduce((acc, i) => acc + (i.total_nominal || 0), 0), [dataList]);

    // Kolom Tabel Header
    const columns = [
        {
            header: 'NO. LAPORAN',
            accessor: 'btth_id',
            render: (item) => (
                <button
                    onClick={() => handleViewDetail(item)}
                    className="font-mono font-black text-blue-700 hover:underline block text-[13.5px] tracking-tight cursor-pointer text-left"
                >
                    {item.btth_id}
                </button>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'btth_tanggal',
            render: (item) => {
                let displayTgl = item.btth_tanggal;
                if (!displayTgl && item.btth_id && item.btth_id.includes('/')) {
                    const parts = item.btth_id.split('/');
                    if (parts.length >= 3 && parts[1] && parts[2]) {
                        displayTgl = `${parts[2]}-${parts[1]}-01`;
                    }
                }
                return (
                    <span className="font-mono font-black text-black block text-[13px] whitespace-nowrap">
                        {displayTgl || '-'}
                    </span>
                );
            }
        },
        {
            header: 'CABANG / AGEN',
            accessor: 'agen_nama',
            render: (item) => (
                <span className="font-black text-black block text-[13px] min-w-[130px]">
                    {item.agen_nama || '-'}
                </span>
            )
        },
        {
            header: 'PEMBAYARAN',
            accessor: 'jnbayar',
            render: (item) => {
                const bayar = item.jnbayar && item.jnbayar !== '-' ? item.jnbayar : 'Tunai';
                return (
                    <span className={`inline-block px-2.5 py-0.5 rounded font-black text-xs whitespace-nowrap ${bayar === 'Tunai'
                            ? 'bg-emerald-200 text-emerald-950 border border-emerald-400'
                            : bayar === 'Kredit'
                                ? 'bg-amber-200 text-amber-950 border border-amber-400'
                                : 'bg-rose-200 text-rose-950 border border-rose-400'
                        }`}>
                        {bayar}
                    </span>
                );
            }
        },
        {
            header: 'JUMLAH RESI',
            accessor: 'total_btt',
            render: (item) => (
                <span className="font-mono text-[13.5px] font-black text-right block text-blue-800">
                    {item.total_btt} BTT
                </span>
            )
        },
        {
            header: 'NO. KAS MASUK',
            accessor: 'btth_cbid',
            render: (item) => (
                <span className="font-mono text-xs font-bold text-slate-800 block whitespace-nowrap">
                    {item.btth_cbid || '-'}
                </span>
            )
        },
        {
            header: 'NO. JURNAL',
            accessor: 'btth_tjurhno',
            render: (item) => (
                <span className="font-mono text-xs font-bold text-slate-800 block whitespace-nowrap">
                    {item.btth_tjurhno || '-'}
                </span>
            )
        },
        {
            header: 'POSTING',
            accessor: 'btth_postingyn',
            render: (item) => (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-black text-xs ${item.btth_postingyn === 'Y'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                    {item.btth_postingyn === 'Y' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {item.btth_postingyn === 'Y' ? 'POSTED' : 'DRAFT'}
                </span>
            )
        },
        {
            header: 'AKSI',
            accessor: 'aksi',
            render: (item) => (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => handleViewDetail(item)}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer"
                        title="Lihat Rincian BTT"
                    >
                        <Eye size={13} /> Detail
                    </button>
                    <button
                        onClick={() => handleTogglePosting(item.btth_id, item.btth_postingyn)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer border ${item.btth_postingyn === 'Y'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                        title={item.btth_postingyn === 'Y' ? 'Batalkan Posting' : 'Posting ke Buku Besar'}
                    >
                        {item.btth_postingyn === 'Y' ? <RotateCcw size={13} /> : <Send size={13} />}
                        {item.btth_postingyn === 'Y' ? 'Unpost' : 'Post'}
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-5">
            <style>
                {`
                .custom-lph-table table th {
                    color: #000000 !important;
                    font-size: 13px !important;
                    font-weight: 900 !important;
                    background-color: #f8fafc !important;
                    padding-top: 12px !important;
                    padding-bottom: 12px !important;
                }
                .custom-lph-table table tbody td {
                    color: #000000 !important;
                    font-size: 13.5px !important;
                    font-weight: 800 !important;
                    padding-top: 10px !important;
                    padding-bottom: 10px !important;
                }
                .custom-lph-table table tbody td * {
                    color: #000000 !important;
                    font-weight: 800 !important;
                }
                .custom-lph-table table tbody td button.text-blue-700 {
                    color: #1d4ed8 !important;
                }
                .custom-lph-table table tbody tr:hover td {
                    background-color: #f1f5f9 !important;
                }
                `}
            </style>

            {/* FORM FILTER MULTI-KRITERIA */}
            {showFilter && (
                <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-4 text-xs transition-all no-print">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 font-black uppercase text-slate-900 tracking-wider text-sm border-b border-slate-100 pb-3">
                            <Calendar size={18} className="text-blue-600" />
                            FILTER PARAMETER LAPORAN PENJUALAN HARIAN
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-1">
                                <input type="checkbox" checked={chkTanggal} onChange={(e) => setChkTanggal(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                <span>TANGGAL LAPORAN :</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <input type="date" disabled={!chkTanggal} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`w-full p-2 border rounded-lg font-bold text-xs outline-none ${!chkTanggal ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'}`} />
                                <span className="font-bold text-slate-400">s/d</span>
                                <input type="date" disabled={!chkTanggal} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`w-full p-2 border rounded-lg font-bold text-xs outline-none ${!chkTanggal ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'}`} />
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-1">
                                <input type="checkbox" checked={chkCabang} onChange={(e) => setChkCabang(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                <span>CABANG / AGEN :</span>
                            </label>
                            <select disabled={!chkCabang} value={selectedCabang} onChange={(e) => setSelectedCabang(e.target.value)} className={`w-full p-2 border rounded-lg font-bold text-xs outline-none ${!chkCabang ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 cursor-pointer'}`}>
                                {cabangOptions.map((cb, idx) => (<option key={idx} value={cb}>{cb}</option>))}
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-1">
                                <input type="checkbox" checked={chkPembayaran} onChange={(e) => setChkPembayaran(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                <span>METODE PEMBAYARAN :</span>
                            </label>
                            <select disabled={!chkPembayaran} value={pembayaranVal} onChange={(e) => setPembayaranVal(e.target.value)} className={`w-full p-2 border rounded-lg font-bold text-xs outline-none ${!chkPembayaran ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 cursor-pointer'}`}>
                                <option value="1">Tunai</option>
                                <option value="2">Kredit</option>
                                <option value="3">Tagih Naik</option>
                                <option value="4">Order Jemput</option>
                                <option value="5">Tagih Turun</option>
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-1">
                                <input type="checkbox" checked={chkNoLap} onChange={(e) => setChkNoLap(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                <span>NOMOR LAPORAN :</span>
                            </label>
                            <input type="text" disabled={!chkNoLap} placeholder="Ketik No. Laporan..." value={noLapText} onChange={(e) => setNoLapText(e.target.value)} className={`w-full p-2 border rounded-lg font-mono font-bold text-xs outline-none ${!chkNoLap ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'}`} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900">
                                <input type="checkbox" checked={chkPosting} onChange={(e) => setChkPosting(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                <span>STATUS POSTING:</span>
                            </label>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" disabled={!chkPosting} name="posting" value="Y" checked={postingVal === 'Y'} onChange={() => setPostingVal('Y')} /> Posted (Ya)</label>
                                <label className="flex items-center gap-1 cursor-pointer font-bold"><input type="radio" disabled={!chkPosting} name="posting" value="N" checked={postingVal === 'N'} onChange={() => setPostingVal('N')} /> Draft (Tidak)</label>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => window.print()} className="px-5 py-2 border border-slate-400 text-slate-900 hover:bg-slate-100 font-black rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer text-xs">
                                <Printer size={15} /> Cetak
                            </button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs">
                                <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> REFRESH DATA
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* KPI REKAPITULASI (SELALU MUNCUL DI ATAS) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL LAPORAN</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{totalLaporan} Dokumen</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL RESI TER-CLOSING</span>
                    <span className="text-2xl font-black font-mono text-blue-700">{totalSemuaResi.toLocaleString('id-ID')} BTT</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL COLLY</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{totalSemuaColly.toLocaleString('id-ID')} Koli</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL PENJUALAN KOTOR</span>
                    <span className="text-2xl font-black font-mono text-emerald-700">Rp {Math.round(totalSemuaNominal).toLocaleString('id-ID')}</span>
                </div>
            </div>

            {/* TABEL DATA HEADER */}
            <div className="no-print custom-lph-table">
                <DataTableTemplate
                    title="PENJUALAN HARIAN"
                    columns={columns}
                    data={dataList}
                    loading={loading}
                    isDarkMode={isDarkMode}
                    isAddDisabled={false}
                    hideAddButton={false}
                    onAdd={handleOpenCreateModal}
                    onFilter={() => setShowFilter(prev => !prev)}
                />
            </div>

            {/* MODAL VIEW RINCIAN RESI BTT */}
            {selectedHeader && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <FileText className="text-blue-600" size={20} />
                                    RINCIAN RESI BTT — NO. LAPORAN: <span className="font-mono text-blue-700">{selectedHeader.btth_id}</span>
                                </h3>
                                <p className="text-xs font-bold text-slate-500 mt-0.5">
                                    Cabang: {selectedHeader.agen_nama} | Tanggal: {selectedHeader.btth_tanggal} | Jenis: {selectedHeader.jnbayar}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedHeader(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-5 overflow-auto flex-1">
                            {detailLoading ? (
                                <div className="text-center py-10 font-bold text-slate-500">Memuat rincian resi...</div>
                            ) : detailList.length === 0 ? (
                                <div className="text-center py-10 font-bold text-slate-400">Belum ada resi yang ditautkan ke laporan ini.</div>
                            ) : (
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-300 font-black uppercase text-slate-900">
                                            <th className="p-2.5">NO. RESI BTT</th>
                                            <th className="p-2.5">TANGGAL</th>
                                            <th className="p-2.5">PENGIRIM</th>
                                            <th className="p-2.5">PENERIMA</th>
                                            <th className="p-2.5 text-right">COLLY</th>
                                            <th className="p-2.5 text-right">BERAT</th>
                                            <th className="p-2.5 text-right">TARIF KIRIM</th>
                                            <th className="p-2.5 text-right">PENERUS</th>
                                            <th className="p-2.5 text-right">TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 font-bold text-slate-900">
                                        {detailList.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-2.5 font-mono text-blue-700 font-black">{row.bttd_bttid}</td>
                                                <td className="p-2.5 font-mono">{row.bttt_tanggal}</td>
                                                <td className="p-2.5">{row.pengirim}</td>
                                                <td className="p-2.5">{row.penerima}</td>
                                                <td className="p-2.5 text-right font-mono">{row.bttt_jmlunit}</td>
                                                <td className="p-2.5 text-right font-mono">{row.bttt_berat.toFixed(1)} Kg</td>
                                                <td className="p-2.5 text-right font-mono">Rp {Math.round(row.biaya_kirim).toLocaleString('id-ID')}</td>
                                                <td className="p-2.5 text-right font-mono">Rp {Math.round(row.biaya_penerus).toLocaleString('id-ID')}</td>
                                                <td className="p-2.5 text-right font-mono font-black text-black">Rp {Math.round(row.total_biaya).toLocaleString('id-ID')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-3xl flex items-center justify-between">
                            <span className="text-xs font-black text-slate-700">Total: {detailList.length} Resi Terlampir</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleTogglePosting(selectedHeader.btth_id, selectedHeader.btth_postingyn)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer text-white shadow-sm ${selectedHeader.btth_postingyn === 'Y' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                        }`}
                                >
                                    {selectedHeader.btth_postingyn === 'Y' ? <RotateCcw size={14} /> : <Send size={14} />}
                                    {selectedHeader.btth_postingyn === 'Y' ? 'UNPOST LAPORAN INI' : 'POSTING LAPORAN INI'}
                                </button>
                                <button
                                    onClick={() => setSelectedHeader(null)}
                                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black cursor-pointer"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TAMBAH LAPORAN PENJUALAN HARIAN BARU */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <Plus className="text-emerald-600" size={20} />
                                BUAT LAPORAN PENJUALAN HARIAN BARU (CLOSING)
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer">
                                ✕
                            </button>
                        </div>

                        <div className="p-5 space-y-4 overflow-auto flex-1 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <div>
                                    <label className="font-bold text-slate-900 block mb-1">TANGGAL LAPORAN :</label>
                                    <input type="date" value={createTgl} onChange={(e) => setCreateTgl(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900" />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-900 block mb-1">CABANG / AGEN :</label>
                                    <select value={createCabang} onChange={(e) => setCreateCabang(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900">
                                        {cabangOptions.map((cb, idx) => (<option key={idx} value={cb}>{cb}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="font-bold text-slate-900 block mb-1">JENIS PEMBAYARAN :</label>
                                    <select
                                        value={createBayar}
                                        onChange={(e) => {
                                            setCreateBayar(e.target.value);
                                            setSelectedBTTIDs([]);
                                        }}
                                        className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900"
                                    >
                                        <option value="1">Tunai</option>
                                        <option value="2">Kredit</option>
                                        <option value="3">Tagih Naik</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-black text-slate-900 uppercase">Pilih Resi BTT yang Tersedia ({availableBTT.length} Resi):</span>
                                    <label className="flex items-center gap-1.5 font-bold text-blue-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={availableBTT.length > 0 && selectedBTTIDs.length === availableBTT.length}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedBTTIDs(availableBTT.map(b => b.bttt_id));
                                                else setSelectedBTTIDs([]);
                                            }}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        Pilih Semua
                                    </label>
                                </div>

                                <div className="border border-slate-300 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-slate-200 text-slate-900 font-black">
                                            <tr>
                                                <th className="p-2 w-10 text-center">PILIH</th>
                                                <th className="p-2">NO. BTT</th>
                                                <th className="p-2">PENGIRIM</th>
                                                <th className="p-2 text-right">COLLY</th>
                                                <th className="p-2 text-right">BERAT</th>
                                                <th className="p-2 text-right">TOTAL TARIF</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 font-bold text-slate-800">
                                            {createLoading ? (
                                                <tr><td colSpan="6" className="p-5 text-center text-slate-500">Mencari resi...</td></tr>
                                            ) : availableBTT.length === 0 ? (
                                                <tr><td colSpan="6" className="p-5 text-center text-slate-400">Semua resi sudah di-closing atau tidak ada data resi terbuka.</td></tr>
                                            ) : (
                                                availableBTT.map((btt, idx) => (
                                                    <tr key={idx} className="hover:bg-blue-50/50">
                                                        <td className="p-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedBTTIDs.includes(btt.bttt_id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedBTTIDs(prev => [...prev, btt.bttt_id]);
                                                                    else setSelectedBTTIDs(prev => prev.filter(id => id !== btt.bttt_id));
                                                                }}
                                                                className="w-4 h-4 text-blue-600 rounded"
                                                            />
                                                        </td>
                                                        <td className="p-2 font-mono font-black text-blue-700">{btt.bttt_id}</td>
                                                        <td className="p-2">{btt.pengirim}</td>
                                                        <td className="p-2 text-right font-mono">{btt.bttt_jmlunit}</td>
                                                        <td className="p-2 text-right font-mono">{btt.bttt_berat.toFixed(1)} Kg</td>
                                                        <td className="p-2 text-right font-mono font-black text-black">Rp {Math.round(btt.total_biaya).toLocaleString('id-ID')}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-3xl flex items-center justify-between">
                            <span className="text-xs font-black text-slate-700">{selectedBTTIDs.length} Resi Dipilih untuk di-Closing</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black cursor-pointer">
                                    Batal
                                </button>
                                <button onClick={handleSaveNewLaporan} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-md">
                                    SIMPAN & TERBITKAN LAPORAN
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaporanPenjualanHarian;