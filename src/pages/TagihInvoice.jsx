import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Edit3, Trash2, Printer, X, CheckCircle2, FileText, Calendar, User, Search, RotateCcw } from 'lucide-react';
import Swal from 'sweetalert2';

const TagihInvoice = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [kolektors, setKolektors] = useState([]);
    const [showFilter, setShowFilter] = useState(false);

    // Filter Form State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [filterKolektor, setFilterKolektor] = useState('');
    const [filterNoPenagihan, setFilterNoPenagihan] = useState('');
    const [filterNoKW, setFilterNoKW] = useState('');

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState(null);

    // Form Tambah State
    const [inputTanggal, setInputTanggal] = useState(() => new Date().toISOString().split('T')[0]);
    const [inputKryNIP, setInputKryNIP] = useState('');
    const [availableInvoices, setAvailableInvoices] = useState([]);
    const [selectedInvoiceIDs, setSelectedInvoiceIDs] = useState([]);
    const [searchInvoice, setSearchInvoice] = useState('');

    const toggleFilterPanel = () => {
        setShowFilter(prev => !prev);
    };

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
            if (filterKolektor) params.kolektor = filterKolektor;
            if (filterNoPenagihan) params.no_penagihan = filterNoPenagihan;
            if (filterNoKW) params.no_kwitansi = filterNoKW;

            const res = await api.get('/piutang/tagih-invoice', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load tagih invoice:", err);
            Swal.fire('Error', 'Gagal memuat data penagihan invoice', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchKolektors = async () => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/karyawan/kolektor-dropdown?pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setKolektors(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load kolektor:", err);
        }
    };

    const fetchAvailableInvoices = async (q = '') => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get('/piutang/tagih-invoice/available-invoices', {
                params: { pt_id: ptId, search: q },
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvailableInvoices(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load available invoices:", err);
        }
    };

    useEffect(() => {
        fetchData();
        fetchKolektors();
    }, []);

    const handleResetFilter = () => {
        const d = new Date();
        setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
        setEndDate(new Date().toISOString().split('T')[0]);
        setFilterKolektor('');
        setFilterNoPenagihan('');
        setFilterNoKW('');
        fetchData(false);
    };

    const handleOpenAdd = () => {
        setInputTanggal(new Date().toISOString().split('T')[0]);
        setInputKryNIP('');
        setSelectedInvoiceIDs([]);
        setSearchInvoice('');
        fetchAvailableInvoices();
        setIsAddModalOpen(true);
    };

    const handleToggleSelectInvoice = (id) => {
        setSelectedInvoiceIDs(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAllInvoices = (e) => {
        if (e.target.checked) {
            setSelectedInvoiceIDs(availableInvoices.map(i => i.artih_id));
        } else {
            setSelectedInvoiceIDs([]);
        }
    };

    const handleSaveTagihan = async () => {
        if (!inputKryNIP) {
            Swal.fire('Peringatan', 'Silakan pilih petugas kolektor penagih!', 'warning');
            return;
        }
        if (selectedInvoiceIDs.length === 0) {
            Swal.fire('Peringatan', 'Pilih minimal satu faktur invoice yang akan ditagihkan!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            await api.post('/piutang/tagih-invoice', {
                pt_id: ptId,
                tanggal: inputTanggal,
                kry_nip: inputKryNIP,
                invoice_ids: selectedInvoiceIDs
            }, { headers: { Authorization: `Bearer ${token}` } });

            Swal.fire('Sukses', 'Manifest penagihan kolektor berhasil dibuat', 'success');
            setIsAddModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Gagal simpan penagihan:", err);
            Swal.fire('Error', 'Gagal membuat manifest penagihan', 'error');
        }
    };

    // Ambil detail menggunakan Query Param ?id=... (Aman dari issue slash)
    const handleViewDetail = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get('/piutang/tagih-invoice/detail', {
                params: { id: item.arttih_id, pt_id: ptId },
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedDetail(res.data?.data || null);
            setIsDetailModalOpen(true);
        } catch (err) {
            console.error("Gagal detail penagihan:", err);
            Swal.fire('Error', 'Gagal memuat detail dokumen penagihan', 'error');
        }
    };

    const handleCancelPenagihan = (item) => {
        Swal.fire({
            title: 'Hapus / Batalkan Penagihan?',
            text: `Apakah Anda yakin ingin membatalkan dokumen ${item.arttih_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Ya, Batalkan!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const ptId = localStorage.getItem('pt_id') || 'C';
                    await api.put('/piutang/tagih-invoice/batal', {}, {
                        params: { id: item.arttih_id, pt_id: ptId },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Dibatalkan!', 'Dokumen penagihan telah dibatalkan.', 'success');
                    fetchData();
                } catch (err) {
                    Swal.fire('Error', 'Gagal membatalkan dokumen', 'error');
                }
            }
        });
    };

    const columns = [
        {
            header: 'NO. PENAGIHAN',
            accessor: 'arttih_id',
            render: (item) => (
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {item.arttih_id}
                </span>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'arttih_tanggal_str',
            render: (item) => <span className="font-mono">{item.arttih_tanggal_str}</span>
        },
        {
            header: 'KOLEKTOR',
            accessor: 'kry_nama',
            render: (item) => <span className="font-bold">{item.kry_nama}</span>
        },
        {
            header: 'JUMLAH INVOICE',
            accessor: 'jumlah_invoice',
            render: (item) => (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200">
                    {item.jumlah_invoice} Invoice
                </span>
            )
        },
        {
            header: 'TOTAL TAGIHAN',
            accessor: 'total_nominal',
            render: (item) => (
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Rp {Number(item.total_nominal || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'STATUS',
            accessor: 'arttih_batalyn',
            render: (item) => (
                item.arttih_batalyn === 'Y' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                        BATAL
                    </span>
                ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                        AKTIF
                    </span>
                )
            )
        }
    ];

    // Kolom ACTION dengan icon Edit3 (Biru) dan Trash2 (Merah) sesuai screenshot referensi
    const renderCustomActions = (item) => (
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => handleViewDetail(item)}
                className="text-blue-500 hover:text-blue-700 transition cursor-pointer p-0.5"
                title="Lihat Detail & Cetak Manifest"
            >
                <Edit3 size={17} />
            </button>
            {item.arttih_batalyn !== 'Y' && (
                <button
                    type="button"
                    onClick={() => handleCancelPenagihan(item)}
                    className="text-rose-500 hover:text-rose-700 transition cursor-pointer p-0.5"
                    title="Batalkan Dokumen"
                >
                    <Trash2 size={17} />
                </button>
            )}
        </div>
    );

    const filterPanelContent = (
        <div className={`p-5 rounded-2xl border shadow-sm transition-all mb-4 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
                <div>
                    <label className={`block mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
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
                    <label className={`block mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
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
                    <label className={`block mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                        <User size={13} /> NAMA KOLEKTOR :
                    </label>
                    <input
                        type="text"
                        placeholder="Ketik nama kolektor..."
                        value={filterKolektor}
                        onChange={(e) => setFilterKolektor(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl font-bold outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                    />
                </div>
                <div>
                    <label className={`block mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                        <FileText size={13} /> NO. PENAGIHAN :
                    </label>
                    <input
                        type="text"
                        placeholder="001/TAG/..."
                        value={filterNoPenagihan}
                        onChange={(e) => setFilterNoPenagihan(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-gray-700">
                <button
                    type="button"
                    onClick={handleResetFilter}
                    className="px-4 py-2 border rounded-xl font-bold text-xs flex items-center gap-1.5 transition text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                    <RotateCcw size={14} /> Reset
                </button>
                <button
                    type="button"
                    onClick={() => fetchData(true)}
                    disabled={loading}
                    className="px-6 py-2 bg-[#2563eb] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                    <Search size={15} /> {loading ? 'MEMUAT...' : 'CARI DATA'}
                </button>
            </div>
        </div>
    );

    return (
        <div
            className="space-y-4"
            onClickCapture={(e) => {
                const target = e.target;
                if (target.closest('button') && target.closest('button').innerText?.includes('Filter')) {
                    toggleFilterPanel();
                }
            }}
        >
            {showFilter && filterPanelContent}

            <DataTableTemplate
                title="PENAGIHAN INVOICE OLEH KOLEKTOR"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleOpenAdd}
                onFilter={toggleFilterPanel}
                renderExtraActions={renderCustomActions}
            />

            {/* MODAL TAMBAH PENUGASAN PENAGIHAN */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-4xl p-6 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-slate-900 border border-slate-200'
                        }`}>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-gray-700 mb-4">
                            <h3 className="text-base font-black uppercase text-blue-600 dark:text-blue-400">
                                📋 TAMBAH PENUGASAN PENAGIHAN KOLEKTOR
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 overflow-y-auto pr-1 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold mb-1">TANGGAL PENUGASAN :</label>
                                    <input
                                        type="date"
                                        value={inputTanggal}
                                        onChange={(e) => setInputTanggal(e.target.value)}
                                        className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-slate-50 border-slate-200'
                                            }`}
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold mb-1">PILIH PETUGAS KOLEKTOR :</label>
                                    <select
                                        value={inputKryNIP}
                                        onChange={(e) => setInputKryNIP(e.target.value)}
                                        className={`w-full p-2.5 border rounded-xl font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-slate-50 border-slate-200'
                                            }`}
                                    >
                                        <option value="">-- PILIH KOLEKTOR --</option>
                                        {kolektors.map((k) => (
                                            <option key={k.kry_nip} value={k.kry_nip}>
                                                {k.kry_nama} ({k.kry_nip})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Daftar Invoice Siap Ditugaskan */}
                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-black uppercase tracking-wide text-slate-600 dark:text-gray-300">
                                        PILIH FAKTUR INVOICE (TERPILIH: {selectedInvoiceIDs.length}) :
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Cari No. Invoice / Customer..."
                                        value={searchInvoice}
                                        onChange={(e) => {
                                            setSearchInvoice(e.target.value);
                                            fetchAvailableInvoices(e.target.value);
                                        }}
                                        className={`p-1.5 px-3 border rounded-lg text-xs outline-none w-64 ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-slate-200'
                                            }`}
                                    />
                                </div>

                                <div className="border border-slate-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-gray-900 font-bold">
                                            <tr className="border-b border-slate-200 dark:border-gray-700">
                                                <th className="p-2.5 text-center w-10">
                                                    <input
                                                        type="checkbox"
                                                        onChange={handleSelectAllInvoices}
                                                        checked={availableInvoices.length > 0 && selectedInvoiceIDs.length === availableInvoices.length}
                                                        className="cursor-pointer"
                                                    />
                                                </th>
                                                <th className="p-2.5">No. Invoice</th>
                                                <th className="p-2.5">Customer</th>
                                                <th className="p-2.5">No. Kwitansi</th>
                                                <th className="p-2.5 text-right">Total Tagihan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-gray-700 font-mono">
                                            {availableInvoices.map((inv) => (
                                                <tr
                                                    key={inv.artih_id}
                                                    onClick={() => handleToggleSelectInvoice(inv.artih_id)}
                                                    className={`cursor-pointer transition ${selectedInvoiceIDs.includes(inv.artih_id)
                                                            ? isDarkMode ? 'bg-blue-950/40 text-blue-200' : 'bg-blue-50 text-blue-900'
                                                            : isDarkMode ? 'hover:bg-gray-700/30' : 'hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <td className="p-2.5 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedInvoiceIDs.includes(inv.artih_id)}
                                                            onChange={() => { }}
                                                            className="cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="p-2.5 font-bold">{inv.artih_id}</td>
                                                    <td className="p-2.5 font-sans font-medium">{inv.artih_custname}</td>
                                                    <td className="p-2.5">{inv.artih_nokw || '-'}</td>
                                                    <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                        Rp {Number(inv.artih_sisabayar || inv.artih_total).toLocaleString('id-ID')}
                                                    </td>
                                                </tr>
                                            ))}
                                            {availableInvoices.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                                                        Tidak ada invoice outstanding yang tersedia.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-gray-700 mt-4">
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-4 py-2 border rounded-xl font-bold text-slate-600 dark:text-gray-300 text-xs cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveTagihan}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                            >
                                <CheckCircle2 size={16} /> SIMPAN PENUGASAN
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL / PREVIEW CETAK MANIFEST */}
            {isDetailModalOpen && selectedDetail && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-3xl p-6 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-slate-900 border border-slate-200'
                        }`}>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-gray-700 mb-4 print:hidden">
                            <h3 className="text-base font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                <FileText size={18} /> DETAIL LEMBAR TUGAS PENAGIHAN
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                                >
                                    <Printer size={15} /> Cetak
                                </button>
                                <button onClick={() => setIsDetailModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full cursor-pointer">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 overflow-y-auto text-xs p-2">
                            <div className="border-b pb-3 space-y-1">
                                <div className="text-sm font-black uppercase tracking-wide">
                                    PT DAKOTA LOGISTIK INDONESIA
                                </div>
                                <div className="text-base font-black text-center uppercase tracking-wider py-1">
                                    MANIFEST PENAGIHAN INVOICE KOLEKTOR
                                </div>
                                <div className="grid grid-cols-2 pt-2 font-mono">
                                    <div>
                                        <strong>NO. DOKUMEN : </strong> {selectedDetail.header?.arttih_id}
                                    </div>
                                    <div>
                                        <strong>TANGGAL : </strong> {selectedDetail.header?.arttih_tanggal ? new Date(selectedDetail.header.arttih_tanggal).toLocaleDateString('id-ID') : '-'}
                                    </div>
                                    <div>
                                        <strong>PETUGAS KOLEKTOR : </strong> {selectedDetail.header?.kry_nama}
                                    </div>
                                    <div>
                                        <strong>STATUS : </strong> {selectedDetail.header?.batal_yn === 'Y' ? 'BATAL' : 'AKTIF'}
                                    </div>
                                </div>
                            </div>

                            <table className="w-full text-left border-collapse border border-slate-200 dark:border-gray-700 text-xs">
                                <thead>
                                    <tr className="bg-slate-100 dark:bg-gray-900 border-b font-black text-[11px] uppercase">
                                        <th className="p-2.5">No.</th>
                                        <th className="p-2.5">No. Invoice</th>
                                        <th className="p-2.5">Customer</th>
                                        <th className="p-2.5">No. Kwitansi</th>
                                        <th className="p-2.5 text-right">Nilai Tagihan</th>
                                        <th className="p-2.5 text-center">TTD / Stempel Customer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-700 font-mono">
                                    {(selectedDetail.details || []).map((d, dIdx) => (
                                        <tr key={dIdx}>
                                            <td className="p-2.5">{dIdx + 1}</td>
                                            <td className="p-2.5 font-bold">{d.artih_id}</td>
                                            <td className="p-2.5 font-sans font-medium">{d.artih_custname}</td>
                                            <td className="p-2.5">{d.artih_nokw || '-'}</td>
                                            <td className="p-2.5 text-right font-bold">
                                                Rp {Number(d.artih_sisabayar || d.artih_total).toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-2.5 border-l text-center text-slate-300">
                                                ....................
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TagihInvoice;