import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Edit3, Trash2, Printer, X, CheckCircle2, Calendar, User, Search, RotateCcw, Building, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

const PenerimaanPembayaran = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [agens, setAgens] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [showFilter, setShowFilter] = useState(false);

    // Filter Form State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [filterCabang, setFilterCabang] = useState('ALL');
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterNoReceipt, setFilterNoReceipt] = useState('');
    const [filterPosting, setFilterPosting] = useState('ALL');

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState(null);

    // Form Tambah State
    const [inputTanggal, setInputTanggal] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedCustID, setSelectedCustID] = useState('');
    const [selectedCustName, setSelectedCustName] = useState('');
    const [inputKeterangan, setInputKeterangan] = useState('');
    const [inputCAID, setInputCAID] = useState('');
    const [inputNominalBayar, setInputNominalBayar] = useState(0);
    const [inputNoFPUM, setInputNoFPUM] = useState('');

    const toggleFilterPanel = () => setShowFilter(prev => !prev);

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
            if (filterCabang !== 'ALL') params.cabang = filterCabang;
            if (filterCustomer) params.customer = filterCustomer;
            if (filterNoReceipt) params.no_receipt = filterNoReceipt;
            if (filterPosting !== 'ALL') params.posting_yn = filterPosting;

            const res = await api.get('/piutang/penerimaan-pembayaran-kredit', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load penerimaan pembayaran:", err);
            Swal.fire('Error', 'Gagal memuat data penerimaan pembayaran', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const [resAgen, resCust, resAcc] = await Promise.all([
                api.get(`/agens?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
                api.get(`/customers?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
                api.get(`/akun/kas-bank-dropdown?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } }))
            ]);

            setAgens(resAgen.data?.data || []);
            setCustomers(resCust.data?.data || resCust.data?.customers || []);
            const accList = resAcc.data?.data || [];
            setAccounts(accList);
            if (accList.length > 0) {
                setInputCAID(accList[0].ca_id);
            }
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
        setFilterCabang('ALL');
        setFilterCustomer('');
        setFilterNoReceipt('');
        setFilterPosting('ALL');
        fetchData(false);
    };

    const handleOpenAdd = () => {
        setInputTanggal(new Date().toISOString().split('T')[0]);
        setSelectedCustID('');
        setSelectedCustName('');
        setInputKeterangan('');
        if (accounts.length > 0) setInputCAID(accounts[0].ca_id);
        setInputNominalBayar(0);
        setInputNoFPUM('');
        setIsAddModalOpen(true);
    };

    const handleSaveReceipt = async () => {
        if (!selectedCustID) {
            Swal.fire('Peringatan', 'Silakan pilih pelanggan terlebih dahulu!', 'warning');
            return;
        }
        if (Number(inputNominalBayar) <= 0) {
            Swal.fire('Peringatan', 'Nominal pembayaran harus lebih dari 0!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            await api.post('/piutang/penerimaan-pembayaran-kredit', {
                pt_id: ptId,
                tanggal: inputTanggal,
                cust_id: selectedCustID,
                cust_name: selectedCustName,
                keterangan: inputKeterangan,
                payments: [{
                    ca_id: inputCAID,
                    keterangan: inputKeterangan,
                    nilai: parseFloat(inputNominalBayar),
                    tipe: 'KAS'
                }],
                invoices: inputNoFPUM ? [{
                    no_fpum: inputNoFPUM,
                    jumlah: parseFloat(inputNominalBayar)
                }] : []
            }, { headers: { Authorization: `Bearer ${token}` } });

            Swal.fire('Sukses', 'Penerimaan pembayaran berhasil disimpan', 'success');
            setIsAddModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Gagal simpan pembayaran:", err);
            Swal.fire('Error', 'Gagal menyimpan pembayaran', 'error');
        }
    };

    const handleViewDetail = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get('/piutang/penerimaan-pembayaran-kredit/detail', {
                params: { no_receipt: item.trecth_no, pt_id: ptId },
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedDetail(res.data?.data || null);
            setIsDetailModalOpen(true);
        } catch (err) {
            console.error("Gagal detail pembayaran:", err);
            Swal.fire('Error', 'Gagal memuat detail pembayaran', 'error');
        }
    };

    const handleCancelReceipt = (item) => {
        Swal.fire({
            title: 'Hapus / Batalkan Kwitansi?',
            text: `Apakah Anda yakin ingin membatalkan pembayaran ${item.trecth_no}?`,
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
                    await api.put('/piutang/penerimaan-pembayaran-kredit/batal', {}, {
                        params: { no_receipt: item.trecth_no, pt_id: ptId },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Dibatalkan!', 'Dokumen pembayaran telah dibatalkan.', 'success');
                    fetchData();
                } catch (err) {
                    Swal.fire('Error', 'Gagal membatalkan dokumen', 'error');
                }
            }
        });
    };

    const columns = [
        {
            header: 'NO. RECEIPT',
            accessor: 'trecth_no',
            render: (item) => (
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {item.trecth_no}
                </span>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'trecth_tanggal_str',
            render: (item) => <span className="font-mono">{item.trecth_tanggal_str}</span>
        },
        {
            header: 'PELANGGAN',
            accessor: 'trecth_custname',
            render: (item) => <span className="font-bold">{item.trecth_custname}</span>
        },
        {
            header: 'TOTAL PEMBAYARAN',
            accessor: 'jbayar',
            render: (item) => (
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Rp {Number(item.jbayar || item.trecth_total || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'KETERANGAN',
            accessor: 'trecth_keterangan',
            render: (item) => <span className="text-slate-600 dark:text-gray-300">{item.trecth_keterangan || '-'}</span>
        },
        {
            header: 'STATUS',
            accessor: 'trecth_deleteyn',
            render: (item) => (
                item.trecth_deleteyn === 'Y' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                        BATAL
                    </span>
                ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                        AKTIF
                    </span>
                )
            )
        },
        {
            header: 'POSTING',
            accessor: 'trecth_postingyn',
            render: (item) => (
                item.trecth_postingyn === 'Y' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 border border-blue-200">
                        POSTED
                    </span>
                ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">
                        DRAFT
                    </span>
                )
            )
        }
    ];

    const renderCustomActions = (item) => (
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => handleViewDetail(item)}
                className="text-blue-500 hover:text-blue-700 transition cursor-pointer p-0.5"
                title="Lihat Detail & Cetak Kwitansi"
            >
                <Edit3 size={17} />
            </button>
            {item.trecth_deleteyn !== 'Y' && item.trecth_postingyn !== 'Y' && (
                <button
                    type="button"
                    onClick={() => handleCancelReceipt(item)}
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
                        <Building size={13} /> CABANG / AGEN :
                    </label>
                    <select
                        value={filterCabang}
                        onChange={(e) => setFilterCabang(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                    >
                        <option value="ALL">-- SEMUA CABANG --</option>
                        {agens.map((a) => (
                            <option key={a.agen_id} value={a.agen_nama}>{a.agen_nama}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={`block mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                        <User size={13} /> CUSTOMER :
                    </label>
                    <input
                        type="text"
                        placeholder="Nama pelanggan..."
                        value={filterCustomer}
                        onChange={(e) => setFilterCustomer(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl font-bold outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
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
                title="PENERIMAAN PEMBAYARAN KREDIT"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleOpenAdd}
                onFilter={toggleFilterPanel}
                renderExtraActions={renderCustomActions}
            />

            {/* MODAL ENTRI PEMBAYARAN */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-2xl p-6 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-slate-900 border border-slate-200'
                        }`}>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-gray-700 mb-4">
                            <h3 className="text-base font-black uppercase text-blue-600 dark:text-blue-400">
                                💳 ENTRI PENERIMAAN PEMBAYARAN KREDIT
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 overflow-y-auto pr-1 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold mb-1">TANGGAL RECEIPT :</label>
                                    <input
                                        type="date"
                                        value={inputTanggal}
                                        onChange={(e) => setInputTanggal(e.target.value)}
                                        className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-slate-50 border-slate-200'
                                            }`}
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold mb-1">PILIH CUSTOMER :</label>
                                    <select
                                        value={selectedCustID}
                                        onChange={(e) => {
                                            const cId = e.target.value;
                                            setSelectedCustID(cId);
                                            const cObj = customers.find(c => c.cust_id === cId);
                                            setSelectedCustName(cObj ? cObj.cust_name : '');
                                        }}
                                        className={`w-full p-2.5 border rounded-xl font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-slate-50 border-slate-200'
                                            }`}
                                    >
                                        <option value="">-- PILIH CUSTOMER --</option>
                                        {customers.map((c) => (
                                            <option key={c.cust_id} value={c.cust_id}>{c.cust_name} ({c.cust_id})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold mb-1">AKUN KAS / BANK :</label>
                                    <select
                                        value={inputCAID}
                                        onChange={(e) => setInputCAID(e.target.value)}
                                        className={`w-full p-2.5 border rounded-xl font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-slate-50 border-slate-200'
                                            }`}
                                    >
                                        {accounts.map((a) => (
                                            <option key={a.ca_id} value={a.ca_id}>{a.ca_id} - {a.ca_nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold mb-1">NOMINAL PEMBAYARAN (RP) :</label>
                                    <input
                                        type="number"
                                        value={inputNominalBayar}
                                        onChange={(e) => setInputNominalBayar(e.target.value)}
                                        className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none text-emerald-600 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-slate-50 border-slate-200'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold mb-1">NO. FAKTUR / INVOICE / KWITANSI :</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: 001/INV/... (Opsional)"
                                    value={inputNoFPUM}
                                    onChange={(e) => setInputNoFPUM(e.target.value)}
                                    className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-slate-50 border-slate-200'
                                        }`}
                                />
                            </div>

                            <div>
                                <label className="block font-bold mb-1">KETERANGAN :</label>
                                <textarea
                                    rows={2}
                                    placeholder="Catatan pelunasan faktur..."
                                    value={inputKeterangan}
                                    onChange={(e) => setInputKeterangan(e.target.value)}
                                    className={`w-full p-2.5 border rounded-xl font-medium outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-slate-50 border-slate-200'
                                        }`}
                                />
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
                                onClick={handleSaveReceipt}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                            >
                                <CheckCircle2 size={16} /> SIMPAN PEMBAYARAN
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL / CETAK KWITANSI */}
            {isDetailModalOpen && selectedDetail && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-2xl p-6 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] bg-white text-black border border-slate-300">
                        {/* Header Modal - Teks Hitam */}
                        <div className="flex justify-between items-center pb-3 border-b border-slate-300 mb-4 print:hidden">
                            <h3 className="text-base font-black uppercase text-black flex items-center gap-2 tracking-wide">
                                <FileText size={18} className="text-black" /> BUKTI PENERIMAAN PEMBAYARAN (KWITANSI)
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-1.5 bg-[#0284c7] hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                                >
                                    <Printer size={15} /> Cetak
                                </button>
                                <button onClick={() => setIsDetailModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-black hover:opacity-75">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Format Cetak Kwitansi Teks Hitam Pekat */}
                        <div className="space-y-4 overflow-y-auto text-xs p-2 text-black">
                            <div className="border-b border-slate-300 pb-3 space-y-1.5">
                                <div className="text-sm font-black uppercase text-black tracking-wider">
                                    PT DAKOTA LOGISTIK INDONESIA
                                </div>
                                <div className="text-base font-black text-center uppercase tracking-widest py-1 text-black font-mono">
                                    KWITANSI PENERIMAAN PEMBAYARAN
                                </div>
                                <div className="grid grid-cols-2 pt-2 font-mono gap-y-1.5 text-black">
                                    <div>
                                        <strong className="text-black">NO. RECEIPT : </strong>
                                        <span className="text-black font-bold ml-1">{selectedDetail.header?.trecth_no}</span>
                                    </div>
                                    <div>
                                        <strong className="text-black">TANGGAL : </strong>
                                        <span className="font-bold text-black ml-1">
                                            {selectedDetail.header?.trecth_tanggal ? new Date(selectedDetail.header.trecth_tanggal).toLocaleDateString('id-ID') : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <strong className="text-black">TERIMA DARI : </strong>
                                        <span className="font-black text-black ml-1">{selectedDetail.header?.trecth_custname || '-'}</span>
                                    </div>
                                    <div>
                                        <strong className="text-black">STATUS : </strong>
                                        {selectedDetail.header?.trecth_deleteyn === 'Y' ? (
                                            <span className="text-rose-600 font-bold ml-1">BATAL</span>
                                        ) : (
                                            <span className="text-emerald-700 font-bold ml-1">AKTIF</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Rincian Akun Pembayaran */}
                            <div className="space-y-2">
                                <div className="font-black uppercase tracking-wider text-[11px] text-black">
                                    RINCIAN KAS / BANK PENERIMA :
                                </div>
                                <div className="rounded-xl border border-slate-300 overflow-hidden">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-100 text-black border-b border-slate-300 font-black text-[11px] uppercase">
                                                <th className="p-2.5 text-black">Akun / Rekening</th>
                                                <th className="p-2.5 text-black">Keterangan</th>
                                                <th className="p-2.5 text-right text-black">Nominal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white font-mono text-black font-semibold">
                                            {(selectedDetail.payments || []).map((p, idx) => (
                                                <tr key={idx}>
                                                    <td className="p-2.5 font-bold text-black">
                                                        {p.trectd_caid} {p.ca_nama ? `- ${p.ca_nama}` : ''}
                                                    </td>
                                                    <td className="p-2.5 font-sans text-black">{p.trectd_keterangan || '-'}</td>
                                                    <td className="p-2.5 text-right font-bold text-black">
                                                        Rp {Number(p.trectd_nilai || 0).toLocaleString('id-ID')}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!selectedDetail.payments || selectedDetail.payments.length === 0) && (
                                                <tr>
                                                    <td colSpan={3} className="p-3 text-center text-black font-medium">Tidak ada rincian kas/bank</td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-100 font-black border-t border-slate-300 text-black">
                                                <td colSpan={2} className="p-2.5 text-right text-black">TOTAL PENERIMAAN :</td>
                                                <td className="p-2.5 text-right font-mono text-black text-sm font-black">
                                                    Rp {Number(selectedDetail.header?.trecth_total || 0).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Rincian Faktur / Invoice yang Dilunasi (Jika Ada) */}
                            {(selectedDetail.invoices && selectedDetail.invoices.length > 0) && (
                                <div className="space-y-2 pt-2">
                                    <div className="font-black uppercase tracking-wider text-[11px] text-black">
                                        FAKTUR INVOICE YANG DILUNASI :
                                    </div>
                                    <div className="rounded-xl border border-slate-300 overflow-hidden">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-100 text-black border-b border-slate-300 font-black text-[11px] uppercase">
                                                    <th className="p-2.5 text-black">No. Faktur / Kwitansi</th>
                                                    <th className="p-2.5 text-right text-black">Alokasi Pembayaran</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 bg-white font-mono text-black font-semibold">
                                                {selectedDetail.invoices.map((inv, iIdx) => (
                                                    <tr key={iIdx}>
                                                        <td className="p-2.5 font-bold text-black">{inv.trectdd_nofpum}</td>
                                                        <td className="p-2.5 text-right font-bold text-black">
                                                            Rp {Number(inv.trectdd_jumlah || 0).toLocaleString('id-ID')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PenerimaanPembayaran;