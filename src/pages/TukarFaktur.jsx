import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, RefreshCw, X, Search, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

// Helper standarisasi Nomor Invoice ke format resmi: [agen3digit][urut4digit]/[bulan]/[tahun4digit]/FP
function formatNomorInvoiceResmi(rawId, rawDate, fallbackAgenId = '') {
    if (!rawId) return '-';
    let clean = String(rawId).trim();

    if (clean.includes('/FP')) return clean;

    const digits = clean.replace(/\D/g, '');
    const d = rawDate ? new Date(rawDate) : new Date();
    let mm = String(d.getMonth() + 1).padStart(2, '0');
    let yyyy = String(d.getFullYear());

    let agen = '';
    if (clean.length >= 3 && isNaN(Number(clean.slice(0, 3))) === false) {
        agen = clean.slice(0, 3);
    } else if (fallbackAgenId) {
        agen = String(fallbackAgenId).padStart(3, '0').slice(-3);
    } else {
        const sessionAgen = localStorage.getItem('active_cabang_id') || localStorage.getItem('active_agen_id') || '';
        agen = sessionAgen ? String(sessionAgen).padStart(3, '0').slice(-3) : clean.slice(0, 3);
    }

    let urut = '0001';

    if (digits.length >= 11) {
        agen = digits.slice(0, 3);
        const bulanId = digits.slice(3, 5);
        const tahunId = digits.slice(5, 7);
        urut = digits.slice(7);

        if (Number(bulanId) >= 1 && Number(bulanId) <= 12) {
            mm = bulanId;
        }
        yyyy = `20${tahunId}`;
    } else if (digits.length >= 7) {
        agen = digits.slice(0, 3);
        urut = digits.slice(-4);
    } else if (digits.length > 0) {
        urut = digits.padStart(4, '0').slice(-4);
    }

    return `${agen}${urut}/${mm}/${yyyy}/FP`;
}

const TukarFaktur = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [cabangList, setCabangList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);

    const todayStr = new Date().toISOString().split('T')[0];

    // =========================================================================
    // STATE MODAL TUKAR FAKTUR (IDENTIK APLIKASI LAWAS)
    // =========================================================================
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [searchInvoiceInput, setSearchInvoiceInput] = useState('');
    const [availableInvoices, setAvailableInvoices] = useState([]);
    const [invoiceDetail, setInvoiceDetail] = useState(null);
    const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);

    const [formInput, setFormInput] = useState({
        invoice_no: '',
        tgl_tukar: todayStr,
        penerima: '',
        tgl_jt: ''
    });

    // =========================================================================
    // HELPER: DETEKSI CABANG & STATUS HOLDING / PUSAT SECARA DINAMIS
    // =========================================================================
    function getActiveAgen() {
        const activeAgenId = localStorage.getItem('active_agen_id') || localStorage.getItem('agen_id') || '';
        const activeCabangId = localStorage.getItem('active_cabang_id') || localStorage.getItem('cabang_id') || '';
        const sessionCabangNama = localStorage.getItem('active_cabang_nama')
            || localStorage.getItem('cabang_nama')
            || localStorage.getItem('active_agen_nama')
            || '';

        if (sessionCabangNama) {
            return {
                id: activeCabangId || activeAgenId || '',
                nama: sessionCabangNama.toUpperCase()
            };
        }

        const found = cabangList.find(c => {
            const cId = String(c.agen_id || c.AgenID || '').trim().toLowerCase();
            const cKode = String(c.agen_kode || c.AgenKode || '').trim().toLowerCase();
            const cNama = String(c.agen_nama || c.AgenNama || '').trim().toLowerCase();
            const targetAgen = activeAgenId.trim().toLowerCase();
            const targetCabang = activeCabangId.trim().toLowerCase();

            return (
                (targetAgen && (cId === targetAgen || cKode === targetAgen || cNama.includes(targetAgen))) ||
                (targetCabang && (cId === targetCabang || cKode === targetCabang || cNama.includes(targetCabang)))
            );
        });

        if (found) {
            return {
                id: String(found.agen_id || found.AgenID),
                nama: String(found.agen_nama || found.AgenNama).toUpperCase()
            };
        }

        if (activeAgenId && activeAgenId.toUpperCase().includes('PUSAT')) {
            return { id: '001', nama: 'PUSAT DAKOTA' };
        }

        return {
            id: activeCabangId || activeAgenId || '',
            nama: activeAgenId ? `AGEN ${activeAgenId.toUpperCase()}` : ''
        };
    }

    const currentActiveAgen = getActiveAgen();
    const isHoldingUser =
        String(currentActiveAgen.nama || '').toUpperCase().includes('PUSAT') ||
        String(currentActiveAgen.nama || '').toUpperCase().includes('HOLDING') ||
        String(currentActiveAgen.id || '') === '001' ||
        String(localStorage.getItem('active_agen_id') || '').toUpperCase().includes('PUSAT') ||
        (!currentActiveAgen.id && !currentActiveAgen.nama);

    // Filter Form State
    const [filterState, setFilterState] = useState({
        useTanggal: false,
        startDate: todayStr,
        endDate: todayStr,
        selectedCabang: isHoldingUser ? '' : currentActiveAgen.id,
        useNoInvoice: false,
        noInvoice: '',
        useNoKW: false,
        noKW: ''
    });

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const resCabang = await api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } });
            setCabangList(resCabang.data?.data || []);
        } catch (err) {
            console.error("Gagal load opsi cabang:", err);
        }
    };

    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setFilterState(prev => ({ ...prev, selectedCabang: currentActiveAgen.id }));
        }
    }, [isHoldingUser, currentActiveAgen.id, cabangList]);

    const fetchTukarFaktur = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const params = { pt_id: ptId };
            if (filterState.useTanggal) {
                params.start_date = filterState.startDate;
                params.end_date = filterState.endDate;
            }
            const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : filterState.selectedCabang;
            if (activeFilterCabang) {
                params.cabang_id = activeFilterCabang;
            }
            if (filterState.useNoInvoice && filterState.noInvoice.trim()) {
                params.no_invoice = filterState.noInvoice.trim();
            }
            if (filterState.useNoKW && filterState.noKW.trim()) {
                params.no_kw = filterState.noKW.trim();
            }

            const res = await api.get('/piutang/tukar-faktur/list', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data tukar faktur:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchTukarFaktur();
    }, []);

    const handleResetFilter = () => {
        setFilterState({
            useTanggal: false,
            startDate: todayStr,
            endDate: todayStr,
            selectedCabang: isHoldingUser ? '' : currentActiveAgen.id,
            useNoInvoice: false,
            noInvoice: '',
            useNoKW: false,
            noKW: ''
        });
        fetchTukarFaktur();
    };

    // =========================================================================
    // FETCH DETAIL INVOICE (AUTO-FILL DETAIL INVOICE SEPERTI APLIKASI LAWAS)
    // =========================================================================
    const loadInvoiceDetail = async (invIdentifier) => {
        if (!invIdentifier) return;
        setLoadingInvoiceDetail(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const res = await api.get(`/piutang/invoice/detail?id=${encodeURIComponent(invIdentifier)}&pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const header = res.data?.data?.header || res.data?.header;
            if (!header) {
                Swal.fire('Tidak Ditemukan', 'Detail Invoice tidak ditemukan.', 'warning');
                setInvoiceDetail(null);
                return;
            }

            setInvoiceDetail(header);
            setFormInput(prev => ({
                ...prev,
                invoice_no: header.artih_id,
                tgl_jt: String(header.artih_tanggal || '').split('T')[0] || todayStr
            }));

        } catch (err) {
            console.error("Gagal load detail invoice:", err);
            Swal.fire('Error', err.response?.data?.message || 'Gagal memuat detail invoice.', 'error');
            setInvoiceDetail(null);
        } finally {
            setLoadingInvoiceDetail(false);
        }
    };

    const handleOpenAddModal = async () => {
        setIsEditMode(false);
        setSearchInvoiceInput('');
        setInvoiceDetail(null);
        setFormInput({
            invoice_no: '',
            tgl_tukar: todayStr,
            penerima: '',
            tgl_jt: ''
        });

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const activeCabang = !isHoldingUser ? currentActiveAgen.id : filterState.selectedCabang;

            const res = await api.get('/piutang/tukar-faktur/available-invoices', {
                params: { pt_id: ptId, cabang_id: activeCabang || undefined },
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvailableInvoices(res.data?.data || []);
        } catch (e) {
            setAvailableInvoices([]);
        }

        setIsModalOpen(true);
    };

    const handleOpenEditModal = (item) => {
        setIsEditMode(true);
        setSearchInvoiceInput(item.invoice_no);
        setFormInput({
            invoice_no: item.invoice_no,
            tgl_tukar: item.tgl_tukar || todayStr,
            penerima: item.penerima || '',
            tgl_jt: item.tgl_jt || ''
        });
        loadInvoiceDetail(item.invoice_no);
        setIsModalOpen(true);
    };

    const handleSaveTukarFaktur = async () => {
        const invNo = formInput.invoice_no || searchInvoiceInput;
        if (!invNo) {
            Swal.fire('Peringatan', 'Nomor Invoice wajib dimasukkan / dipilih!', 'warning');
            return;
        }
        if (!formInput.penerima.trim()) {
            Swal.fire('Peringatan', 'Nama Penerima (PIC Pelanggan) wajib diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            await api.post('/piutang/tukar-faktur/save', {
                pt_id: ptId,
                invoice_no: invNo,
                tgl_tukar: formInput.tgl_tukar,
                penerima: formInput.penerima.trim().toUpperCase(),
                tgl_jt: formInput.tgl_jt || formInput.tgl_tukar
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                icon: 'success',
                title: 'BERHASIL DISIMPAN',
                text: 'Data Tukar Faktur berhasil disimpan.',
                timer: 1500,
                showConfirmButton: false
            });

            setIsModalOpen(false);
            fetchTukarFaktur();
        } catch (err) {
            Swal.fire('Gagal!', err.response?.data?.message || 'Gagal menyimpan transaksi tukar faktur.', 'error');
        }
    };

    const handleDelete = async (item) => {
        const confirm = await Swal.fire({
            title: 'Hapus Tukar Faktur?',
            html: `Apakah Anda yakin ingin membatalkan status Tukar Faktur untuk invoice <b>${formatNomorInvoiceResmi(item.invoice_no, item.tgl_invoice)}</b>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Hapus!'
        });

        if (confirm.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const ptId = localStorage.getItem('pt_id') || 'C';
                await api.delete('/piutang/tukar-faktur/delete', {
                    params: { pt_id: ptId, invoice_no: item.invoice_no },
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Terhapus', 'Status Tukar Faktur berhasil dihapus', 'success');
                fetchTukarFaktur();
            } catch (err) {
                console.error("Gagal hapus:", err);
                Swal.fire('Error', 'Gagal menghapus status tukar faktur', 'error');
            }
        }
    };

    // =========================================================================
    // KOLOM TABEL DATA GRID
    // =========================================================================
    const columns = [
        {
            header: 'NO. INVOICE',
            accessor: 'invoice_no',
            render: (item) => (
                <span className="font-mono font-bold text-sky-600 select-all">
                    {formatNomorInvoiceResmi(item.invoice_no, item.tgl_invoice)}
                </span>
            )
        },
        {
            header: 'TGL. INV',
            accessor: 'tgl_invoice',
            render: (item) => (
                <span className="font-mono text-slate-600">
                    {item.tgl_invoice || '-'}
                </span>
            )
        },
        {
            header: 'PELANGGAN',
            accessor: 'cust_name',
            render: (item) => (
                <div className="font-bold flex flex-col">
                    <span className="text-slate-800">{item.cust_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-normal">{item.cust_id}</span>
                </div>
            )
        },
        {
            header: 'FAKTUR PAJAK',
            accessor: 'faktur_pajak',
            render: (item) => (
                <span className="font-mono text-slate-700 text-xs">
                    {item.faktur_pajak || '-'}
                </span>
            )
        },
        {
            header: 'TAGIHAN (RP)',
            accessor: 'total_tagihan',
            render: (item) => (
                <span className="font-mono font-black text-rose-600">
                    Rp {Number(item.total_tagihan || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'TGL. TUKAR',
            accessor: 'tgl_tukar',
            render: (item) => (
                <span className="font-mono font-bold text-amber-600">
                    {item.tgl_tukar || '-'}
                </span>
            )
        },
        {
            header: 'PENERIMA (PIC)',
            accessor: 'penerima',
            render: (item) => (
                <span className="font-bold uppercase text-slate-800">
                    {item.penerima || '-'}
                </span>
            )
        }
    ];

    // =========================================================================
    // ELEMEN MODAL TUKAR FAKTUR (PORTAL KE MODAL-ROOT)
    // =========================================================================
    const modalElement = isModalOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs z-[1000] animate-in fade-in">
            <div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-slate-800'}`}>

                {/* Header Modal */}
                <div className="px-6 py-3 bg-[#004b84] text-white flex items-center justify-between font-bold uppercase tracking-wider text-xs">
                    <div className="flex items-center gap-2">
                        <FileText size={16} className="text-sky-300" />
                        <span>{isEditMode ? 'EDIT DATA TUKAR FAKTUR' : 'INPUT DATA TUKAR FAKTUR'}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="text-white/80 hover:text-white cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
                    {/* 1. KOTAK INPUT MASUKKAN NO. INVOICE */}
                    <div className="border border-sky-300 rounded-xl p-4 bg-slate-50/50 space-y-2">
                        <label className="font-bold text-rose-600 block text-xs tracking-wide">
                            * MASUKKAN NO. INVOICE
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Contoh: 0010001/10/2026/FP atau 00110260001"
                                disabled={isEditMode}
                                list="inv-options"
                                value={searchInvoiceInput}
                                onChange={(e) => setSearchInvoiceInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        loadInvoiceDetail(searchInvoiceInput);
                                    }
                                }}
                                className={`w-full p-2.5 border rounded-lg font-mono font-bold text-slate-800 outline-none text-xs transition ${isEditMode
                                    ? 'bg-slate-100 border-slate-300 cursor-not-allowed text-slate-500'
                                    : 'bg-rose-50/30 border-rose-300 focus:border-rose-500'
                                    }`}
                            />
                            <datalist id="inv-options">
                                {availableInvoices.map((inv, idx) => (
                                    <option key={idx} value={inv.invoice_no}>
                                        {formatNomorInvoiceResmi(inv.invoice_no, inv.tgl_invoice)} — {inv.cust_name}
                                    </option>
                                ))}
                            </datalist>

                            {!isEditMode && (
                                <button
                                    type="button"
                                    onClick={() => loadInvoiceDetail(searchInvoiceInput)}
                                    disabled={loadingInvoiceDetail || !searchInvoiceInput.trim()}
                                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg uppercase cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-sm text-xs"
                                >
                                    <Search size={14} className={loadingInvoiceDetail ? 'animate-spin' : ''} />
                                    {loadingInvoiceDetail ? 'MEMUAT...' : 'CARI'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 2. KOTAK DETAIL INVOICE (OTOMATIS MUNCUL) */}
                    {invoiceDetail && (
                        <div className="border border-slate-300 rounded-xl p-4 bg-white space-y-3 shadow-xs">
                            <div className="text-center font-bold text-sky-800 tracking-wider text-xs uppercase border-b pb-2 border-slate-200">
                                DETAIL INVOICE
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-semibold">
                                <div className="md:col-span-3">
                                    <label className="font-bold text-slate-700 block mb-1">CUSTOMER :</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={invoiceDetail.cust_name || invoiceDetail.artih_custname || '-'}
                                        className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-bold text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">CUST ID :</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={invoiceDetail.artih_custid || '-'}
                                        className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-700"
                                    />
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">TANGGAL INVOICE :</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={String(invoiceDetail.artih_tanggal || '').split('T')[0]}
                                        className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">NO KWITANSI :</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={invoiceDetail.artih_nokw || '-'}
                                        className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-emerald-700"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">TAGIHAN :</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={Number(invoiceDetail.artih_total || 0).toLocaleString('id-ID')}
                                        className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-black text-rose-600 text-right"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">PPN (%) :</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value="1.1"
                                        className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-bold text-slate-700 text-center"
                                    />
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">DPP (%) :</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value="100"
                                        className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-bold text-slate-700 text-center"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="font-bold text-slate-700 block mb-1">NO FAKTUR PAJAK :</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={(() => {
                                            const rawFP = String(invoiceDetail.artih_fktpajak || '').trim();
                                            if (!rawFP || rawFP === '010.' || rawFP === '010') {
                                                return '010.026.00.340034701'; // Fallback nomor faktur pajak aktif
                                            }
                                            return rawFP;
                                        })()}
                                        className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-800"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. INPUT DATA TUKAR FAKTUR */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3 font-semibold">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1 text-xs">
                                    TANGGAL TUKAR :
                                </label>
                                <input
                                    type="date"
                                    value={formInput.tgl_tukar}
                                    onChange={(e) => setFormInput({ ...formInput, tgl_tukar: e.target.value })}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1 text-xs">
                                    NAMA PENERIMA :
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: FIKRI / PAK SAIFUL"
                                    value={formInput.penerima}
                                    onChange={(e) => setFormInput({ ...formInput, penerima: e.target.value })}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 uppercase outline-none focus:border-sky-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Tombol Modal */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={handleSaveTukarFaktur}
                        className="px-8 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black uppercase rounded-xl transition shadow-sm cursor-pointer text-xs tracking-wider"
                    >
                        SIMPAN
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase rounded-xl transition cursor-pointer text-xs"
                    >
                        KELUAR
                    </button>
                </div>

            </div>
        </div>
    ) : null;

    const modalRoot = document.getElementById('modal-root') || document.body;

    return (
        <div className="space-y-5">
            {/* PANEL FILTER EXPANDABLE */}
            {showFilter && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        fetchTukarFaktur();
                    }}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all"
                >
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER PARAMETER TUKAR FAKTUR
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-bold">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={filterState.useTanggal}
                                    onChange={(e) => setFilterState(p => ({ ...p, useTanggal: e.target.checked }))}
                                    className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                                />
                                <span>TANGGAL TUKAR FAKTUR</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    disabled={!filterState.useTanggal}
                                    value={filterState.startDate}
                                    onChange={(e) => setFilterState(p => ({ ...p, startDate: e.target.value }))}
                                    className={`w-full p-2 border rounded-lg font-mono outline-none ${!filterState.useTanggal
                                        ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                        : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500'
                                        }`}
                                />
                                <input
                                    type="date"
                                    disabled={!filterState.useTanggal}
                                    value={filterState.endDate}
                                    onChange={(e) => setFilterState(p => ({ ...p, endDate: e.target.value }))}
                                    className={`w-full p-2 border rounded-lg font-mono outline-none ${!filterState.useTanggal
                                        ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                        : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500'
                                        }`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block mb-1 text-slate-500">AGEN / CABANG</label>
                            <select
                                value={!isHoldingUser && currentActiveAgen.id ? currentActiveAgen.id : filterState.selectedCabang}
                                disabled={!isHoldingUser}
                                onChange={(e) => setFilterState(p => ({ ...p, selectedCabang: e.target.value }))}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser
                                    ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'
                                    }`}
                                title={!isHoldingUser ? 'Filter cabang terkunci sesuai lokasi login Anda' : 'Pilih cabang'}
                            >
                                {isHoldingUser && (
                                    <option value="">-- SEMUA CABANG --</option>
                                )}

                                {!isHoldingUser ? (
                                    <option value={currentActiveAgen.id}>
                                        {currentActiveAgen.nama || 'CABANG AKTIF'}
                                    </option>
                                ) : (
                                    cabangList.map((c, i) => (
                                        <option key={i} value={c.agen_id || c.AgenID}>{c.agen_nama || c.AgenNama}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={filterState.useNoInvoice}
                                    onChange={(e) => setFilterState(p => ({ ...p, useNoInvoice: e.target.checked }))}
                                    className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                                />
                                <span>NO. INVOICE</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ketik No. Invoice..."
                                disabled={!filterState.useNoInvoice}
                                value={filterState.noInvoice}
                                onChange={(e) => setFilterState(p => ({ ...p, noInvoice: e.target.value }))}
                                className={`w-full p-2 border rounded-lg font-mono outline-none ${!filterState.useNoInvoice
                                    ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500'
                                    }`}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={filterState.useNoKW}
                                    onChange={(e) => setFilterState(p => ({ ...p, useNoKW: e.target.checked }))}
                                    className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                                />
                                <span>NO. KWITANSI</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ketik No. Kwitansi..."
                                disabled={!filterState.useNoKW}
                                value={filterState.noKW}
                                onChange={(e) => setFilterState(p => ({ ...p, noKW: e.target.value }))}
                                className={`w-full p-2 border rounded-lg font-mono outline-none ${!filterState.useNoKW
                                    ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500'
                                    }`}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer text-xs"
                        >
                            RESET
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs"
                        >
                            <RefreshCw size={14} /> REFRESH DATA
                        </button>
                    </div>
                </form>
            )}

            {/* TABEL TUKAR FAKTUR */}
            <DataTableTemplate
                title="TUKAR FAKTUR"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleOpenAddModal}
                onEdit={(item) => handleOpenEditModal(item)}
                onDelete={handleDelete}
                onFilter={() => setShowFilter((prev) => !prev)}
            />

            {/* PORTAL MODAL INPUT TUKAR FAKTUR */}
            {modalElement && ReactDOM.createPortal(modalElement, modalRoot)}
        </div>
    );
};

export default TukarFaktur;