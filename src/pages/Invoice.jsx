import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, CheckCircle2, XCircle, Search, RefreshCw, Printer, X, Plus, Trash2, FileText, Calendar, CheckSquare, Square, Download, Lock, Unlock } from 'lucide-react';
import Swal from 'sweetalert2';
import dakotaLogo from '../assets/new_logo 2.png';

const Invoice = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [cabangList, setCabangList] = useState([]);
    const [custList, setCustList] = useState([]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);

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
        (!currentActiveAgen.id && !currentActiveAgen.nama); // Default jika login pusat tanpa ID agen

    // Filter States
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [bypassTanggal, setBypassTanggal] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState(isHoldingUser ? '' : currentActiveAgen.id);
    const [selectedJenis, setSelectedJenis] = useState('');
    const [selectedTerbayar, setSelectedTerbayar] = useState('');
    const [searchCustomer, setSearchCustomer] = useState('');
    const [searchInvoice, setSearchInvoice] = useState('');
    const [searchKwitansi, setSearchKwitansi] = useState('');
    const [searchBTT, setSearchBTT] = useState('');

    // Sinkronisasi cabang otomatis saat cabangList selesai di-fetch dari API
    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setSelectedCabang(currentActiveAgen.id);
        }
    }, [isHoldingUser, currentActiveAgen.id, cabangList]);

    // Modal Add Invoice
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newInvoiceForm, setNewInvoiceForm] = useState({
        artih_tanggal: today,
        artih_custid: '',
        artih_custname: '',
        artih_agenid: currentActiveAgen.id,
        artih_agenname: currentActiveAgen.nama,
        artih_jenis: 'K',
        artih_fktpajak: '',
        artih_keterangan: '',
        selected_btts: []
    });
    const [unbilledBTTList, setUnbilledBTTList] = useState([]);
    const [loadingUnbilled, setLoadingUnbilled] = useState(false);

    // Modal Edit
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeInvoice, setActiveInvoice] = useState(null);
    const [activeBTTList, setActiveBTTList] = useState([]);
    const [bttToRemove, setBttToRemove] = useState([]);
    const [availableBTTToAdd, setAvailableBTTToAdd] = useState([]);
    const [bttToAdd, setBttToAdd] = useState([]);
    const [loadingAddBTT, setLoadingAddBTT] = useState(false);

    // Modal Cetak Preview
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printMode, setPrintMode] = useState('KWITANSI_1');

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const [resCabang, resCust] = await Promise.all([
                api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/gl/customers?limit=1000', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setCabangList(resCabang.data?.data || []);
            setCustList(resCust.data?.data || []);
        } catch (err) {
            console.error("Gagal load opsi filter:", err);
        }
    };

    const fetchInvoiceList = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            let url = `/piutang/invoice?pt_id=${ptId}&bypass_tanggal=${bypassTanggal}`;

            if (!bypassTanggal) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            if (selectedCabang) url += `&agen_id=${encodeURIComponent(selectedCabang)}`;
            if (selectedJenis) url += `&jenis=${encodeURIComponent(selectedJenis)}`;
            if (selectedTerbayar) url += `&terbayar=${encodeURIComponent(selectedTerbayar)}`;
            if (searchCustomer) url += `&customer=${encodeURIComponent(searchCustomer)}`;
            if (searchInvoice) url += `&no_invoice=${encodeURIComponent(searchInvoice)}`;
            if (searchKwitansi) url += `&no_kwitansi=${encodeURIComponent(searchKwitansi)}`;
            if (searchBTT) url += `&no_btt=${encodeURIComponent(searchBTT)}`;

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load daftar invoice:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchInvoiceList();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchInvoiceList();
    };

    const handleResetFilter = () => {
        setStartDate(firstDay);
        setEndDate(today);
        setBypassTanggal(false);
        setSelectedCabang(isHoldingUser ? '' : currentActiveAgen.id);
        setSelectedJenis('');
        setSelectedTerbayar('');
        setSearchCustomer('');
        setSearchInvoice('');
        setSearchKwitansi('');
        setSearchBTT('');
        fetchInvoiceList();
    };

    // Load Unbilled BTT saat Customer Dipilih di Modal Tambah
    const handleSelectCustomerForNewInvoice = async (custId) => {
        const cust = custList.find(c => String(c.cust_id) === String(custId));
        setNewInvoiceForm(prev => ({
            ...prev,
            artih_custid: custId,
            artih_custname: cust ? (cust.cust_name || cust.CustName) : '',
            selected_btts: []
        }));

        if (!custId) {
            setUnbilledBTTList([]);
            return;
        }

        setLoadingUnbilled(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/piutang/invoice/unbilled-btt?pt_id=${ptId}&cust_id=${encodeURIComponent(custId)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnbilledBTTList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load unbilled BTT:", err);
            Swal.fire('Error', 'Gagal mengambil daftar BTT customer.', 'error');
        } finally {
            setLoadingUnbilled(false);
        }
    };

    // Simpan Invoice Baru
    const handleSaveNewInvoice = async (e) => {
        e.preventDefault();

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        const modalTarget = document.getElementById('modal-root') ? '#modal-root' : undefined;

        if (!newInvoiceForm.artih_custid) {
            Swal.fire({
                title: 'Peringatan',
                text: 'Pilih customer terlebih dahulu!',
                icon: 'warning',
                target: modalTarget
            });
            return;
        }

        if (newInvoiceForm.selected_btts.length === 0) {
            Swal.fire({
                title: 'Peringatan',
                text: 'Pilih minimal 1 resi BTT untuk difakturkan! Jika daftar kosong, customer belum memiliki resi BTT aktif yang unbilled.',
                icon: 'warning',
                target: modalTarget
            });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const payload = {
                artih_tanggal: newInvoiceForm.artih_tanggal,
                artih_custid: newInvoiceForm.artih_custid,
                artih_custname: newInvoiceForm.artih_custname,
                artih_agenid: newInvoiceForm.artih_agenid,
                artih_jenis: newInvoiceForm.artih_jenis,
                artih_fktpajak: newInvoiceForm.artih_fktpajak,
                artih_keterangan: newInvoiceForm.artih_keterangan,
                btt_list: newInvoiceForm.selected_btts
            };

            const res = await api.post(`/piutang/invoice/save?pt_id=${ptId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIsAddModalOpen(false);

            Swal.fire({
                title: 'Berhasil!',
                text: res.data?.message || 'Invoice berhasil diterbitkan.',
                icon: 'success'
            });

            fetchInvoiceList();
        } catch (err) {
            Swal.fire({
                title: 'Gagal!',
                text: err.response?.data?.message || 'Gagal menyimpan invoice.',
                icon: 'error',
                target: modalTarget
            });
        }
    };

    // Buka Modal Edit Invoice
    const handleOpenEditInvoice = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/piutang/invoice/detail?id=${encodeURIComponent(item.artih_id)}&pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const header = res.data?.header;
            const btts = res.data?.btt_list || [];

            setActiveInvoice({
                ...header,
                artih_tanggal: String(header.artih_tanggal || '').split('T')[0]
            });
            setActiveBTTList(btts);
            setBttToRemove([]);
            setBttToAdd([]);
            setIsEditModalOpen(true);

            if (header.artih_custid) {
                setLoadingAddBTT(true);
                const unbilledRes = await api.get(`/piutang/invoice/unbilled-btt?pt_id=${ptId}&cust_id=${encodeURIComponent(header.artih_custid)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAvailableBTTToAdd(unbilledRes.data?.data || []);
                setLoadingAddBTT(false);
            }
        } catch (err) {
            Swal.fire({ title: 'Error', text: 'Gagal mengambil detail invoice.', icon: 'error' });
        }
    };

    // Simpan Perubahan Edit Invoice
    const handleSaveEditInvoice = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const payload = {
                artih_id: activeInvoice.artih_id,
                artih_tanggal: activeInvoice.artih_tanggal,
                artih_fktpajak: activeInvoice.artih_fktpajak,
                artih_keterangan: activeInvoice.artih_keterangan,
                remove_btt_list: bttToRemove,
                add_btt_list: bttToAdd
            };

            const res = await api.post(`/piutang/invoice/update?pt_id=${ptId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({ title: 'BERHASIL!', text: res.data?.message, icon: 'success' });
            setIsEditModalOpen(false);
            fetchInvoiceList();
        } catch (err) {
            Swal.fire({ title: 'GAGAL!', text: err.response?.data?.message || 'Gagal menyimpan perubahan invoice.', icon: 'error' });
        }
    };

    const handleDeleteInvoice = (item) => {
        Swal.fire({
            title: 'Hapus Invoice?',
            text: `Apakah Anda yakin ingin menghapus Invoice ${item.artih_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const ptId = localStorage.getItem('pt_id') || 'C';
                    await api.delete(`/piutang/invoice?id=${encodeURIComponent(item.artih_id)}&pt_id=${ptId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire({ title: 'Berhasil!', text: `Invoice ${item.artih_id} berhasil dihapus.`, icon: 'success' });
                    fetchInvoiceList();
                } catch (err) {
                    Swal.fire({ title: 'Gagal!', text: err.response?.data?.message || 'Gagal menghapus invoice.', icon: 'error' });
                }
            }
        });
    };

    const terbilangKapital = (angka) => {
        const bilangan = ['', 'SATU', 'DUA', 'TIGA', 'EMPAT', 'LIMA', 'ENAM', 'TUJUH', 'DELAPAN', 'SEMBILAN', 'SEPULUH', 'SEBELAS'];
        angka = Math.floor(Math.abs(angka));
        if (angka < 12) return bilangan[angka];
        if (angka < 20) return `${terbilangKapital(angka - 10)} BELAS`;
        if (angka < 100) return `${terbilangKapital(Math.floor(angka / 10))} PULUH ${bilangan[angka % 10]}`.trim();
        if (angka < 200) return `SERATUS ${terbilangKapital(angka - 100)}`.trim();
        if (angka < 1000) return `${terbilangKapital(Math.floor(angka / 100))} RATUS ${terbilangKapital(angka % 100)}`.trim();
        if (angka < 2000) return `SERIBU ${terbilangKapital(angka - 1000)}`.trim();
        if (angka < 1000000) return `${terbilangKapital(Math.floor(angka / 1000))} RIBU ${terbilangKapital(angka % 1000)}`.trim();
        if (angka < 1000000000) return `${terbilangKapital(Math.floor(angka / 1000000))} JUTA ${terbilangKapital(angka % 1000000)}`.trim();
        return `${terbilangKapital(Math.floor(angka / 1000000000))} MILIAR ${terbilangKapital(angka % 1000000000)}`.trim();
    };

    // Hitung komponen tagihan akuntansi
    const currentActiveBTTs = activeBTTList.filter(b => !bttToRemove.includes(b.bttt_id));
    const totalBiayaKirim = currentActiveBTTs.reduce((sum, b) => sum + (parseFloat(b.bttt_harga) || 0), 0);
    const totalPenerus = currentActiveBTTs.reduce((sum, b) => sum + (parseFloat(b.bttt_biayapenerus) || 0), 0);
    const totalPacking = currentActiveBTTs.reduce((sum, b) => sum + (parseFloat(b.biaya_packing) || 0), 0);
    const totalAsuransi = currentActiveBTTs.reduce((sum, b) => sum + (parseFloat(b.biaya_asuransi) || 0), 0);

    const subtotalDPP = totalBiayaKirim + totalPenerus + totalPacking;
    const invYear = new Date(activeInvoice?.artih_tanggal || new Date()).getFullYear();
    const totalPPN = invYear >= 2025 ? subtotalDPP * 0.012 : subtotalDPP * 0.011;
    const grandTotalTagihan = subtotalDPP + totalPPN + totalAsuransi;

    const selectedBTTsData = unbilledBTTList.filter(b => newInvoiceForm.selected_btts.includes(b.bttt_id));
    const totalNewInvoice = selectedBTTsData.reduce((sum, b) => sum + (parseFloat(b.subtotal) || 0), 0);

    const columns = [
        {
            header: 'NO. INVOICE',
            accessor: 'artih_id',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.artih_id}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'artih_tanggal',
            render: (item) => <span className="font-mono text-slate-600">{String(item.artih_tanggal || '').split('T')[0]}</span>
        },
        {
            header: 'PELANGGAN',
            accessor: 'cust_name',
            render: (item) => (
                <div>
                    <span className="font-bold text-slate-800 block">{item.cust_name}</span>
                    <span className="font-mono text-[10px] text-slate-400">ID: {item.artih_custid}</span>
                </div>
            )
        },
        {
            header: 'NO. KWITANSI',
            accessor: 'artih_nokw',
            render: (item) => <span className="font-mono font-bold text-emerald-700">{item.artih_nokw || '-'}</span>
        },
        {
            header: 'TOTAL TAGIHAN (RP)',
            accessor: 'artih_total',
            render: (item) => <span className="font-mono font-black text-rose-600">Rp {Number(item.artih_total || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'TERBAYAR (RP)',
            accessor: 'terbayar',
            render: (item) => <span className="font-mono font-bold text-slate-700">Rp {Number(item.terbayar || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'JENIS',
            accessor: 'artih_jenis',
            render: (item) => {
                if (item.artih_jenis === 'K') return <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded text-[10px] border border-sky-200">KREDIT</span>;
                if (item.artih_jenis === 'B') return <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">TUNAI</span>;
                return <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] border border-amber-200">TAGIH</span>;
            }
        },
        {
            header: 'STATUS POSTING',
            accessor: 'artih_postingyn',
            render: (item) => item.artih_postingyn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> POSTED
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                    <XCircle size={12} /> DRAFT
                </span>
            )
        },
        {
            header: 'AKSI',
            accessor: 'artih_id',
            render: (item) => (
                <div className="flex items-center gap-1.5 justify-center no-print">
                    {/* Tombol Cetak Langsung */}
                    <button
                        type="button"
                        onClick={() => handleOpenEditInvoice(item)}
                        className="p-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded transition cursor-pointer"
                        title="Buka / Cetak Dokumen"
                    >
                        <Printer size={13} />
                    </button>

                    {/* Tombol Posting jika masih DRAFT */}
                    {item.artih_postingyn !== 'Y' && (
                        <button
                            type="button"
                            onClick={() => handlePostingInvoice(item.artih_id)}
                            className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded transition cursor-pointer"
                            title="Posting Invoice & Jurnal"
                        >
                            <Lock size={13} />
                        </button>
                    )}

                    {/* Tombol Unposting jika sudah POSTED */}
                    {item.artih_postingyn === 'Y' && (
                        <button
                            type="button"
                            onClick={() => handleUnpostingInvoice(item)}
                            className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded transition cursor-pointer"
                            title="Unposting Invoice (Kembali ke Draft)"
                        >
                            <Unlock size={13} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    // ==========================================
    // MODAL TAMBAH INVOICE
    // ==========================================
    const addModalElement = isAddModalOpen ? (
        <div
            role="dialog" aria-modal="true" aria-labelledby="add-invoice-title"
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs transition-opacity"
            style={{ zIndex: 1000 }}
        >
            <div className={`w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-slate-800'}`}>
                <div className="px-6 py-3.5 bg-blue-600 text-white flex items-center justify-between">
                    <div className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                        <Plus size={18} className="text-white" />
                        BUAT INVOICE PENAGIHAN BARU
                    </div>
                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveNewInvoice} className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="font-bold text-slate-600 block mb-1">TANGGAL INVOICE :</label>
                            <input
                                type="date"
                                value={newInvoiceForm.artih_tanggal}
                                onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_tanggal: e.target.value })}
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-600 block mb-1">CABANG / AGEN :</label>
                            <input
                                type="text"
                                readOnly
                                tabIndex={-1}
                                value={newInvoiceForm.artih_agenname || getActiveAgen().nama}
                                className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 cursor-not-allowed select-none outline-none focus:outline-none"
                                title="Cabang terkunci otomatis sesuai lokasi login aktif Anda"
                            />
                            <input type="hidden" value={newInvoiceForm.artih_agenid} />
                        </div>

                        <div>
                            <label className="font-bold text-slate-600 block mb-1">JENIS INVOICE :</label>
                            <select
                                value={newInvoiceForm.artih_jenis}
                                onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_jenis: e.target.value })}
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500"
                            >
                                <option value="K">Kredit (Langganan)</option>
                                <option value="B">Tunai (Cash)</option>
                                <option value="T">Tagih Turun (COD)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-600 block mb-1">FAKTUR PAJAK :</label>
                            <input
                                type="text"
                                placeholder="Nomor faktur pajak..."
                                value={newInvoiceForm.artih_fktpajak}
                                onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_fktpajak: e.target.value })}
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-600 block mb-1">CUSTOMER :</label>
                            <select
                                value={newInvoiceForm.artih_custid}
                                onChange={(e) => handleSelectCustomerForNewInvoice(e.target.value)}
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500"
                                required
                            >
                                <option value="">-- PILIH CUSTOMER --</option>
                                {custList.map((cust, i) => (
                                    <option key={i} value={cust.cust_id}>
                                        {cust.cust_name} [{cust.cust_id}]
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-600 block mb-1">KETERANGAN :</label>
                            <input
                                type="text"
                                placeholder="Catatan invoice..."
                                value={newInvoiceForm.artih_keterangan}
                                onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_keterangan: e.target.value })}
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between font-black uppercase text-xs text-slate-700">
                            <span>DAFTAR RESI BTT SIAP DIFAKTURKAN ({unbilledBTTList.length} RESI TERSEDIA)</span>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (newInvoiceForm.selected_btts.length === unbilledBTTList.length) {
                                            setNewInvoiceForm(p => ({ ...p, selected_btts: [] }));
                                        } else {
                                            setNewInvoiceForm(p => ({ ...p, selected_btts: unbilledBTTList.map(b => b.bttt_id) }));
                                        }
                                    }}
                                    className="text-blue-600 hover:underline cursor-pointer font-bold"
                                >
                                    {newInvoiceForm.selected_btts.length === unbilledBTTList.length && unbilledBTTList.length > 0 ? 'Batal Pilih Semua' : 'Pilih Semua'}
                                </button>
                                <span className="text-blue-700 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    {newInvoiceForm.selected_btts.length} Dipilih
                                </span>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl max-h-60 overflow-y-auto">
                            <table className="w-full text-left border-collapse text-[11px]">
                                <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 sticky top-0">
                                    <tr>
                                        <th className="p-2.5 w-12 text-center">PILIH</th>
                                        <th className="p-2.5">NO. BTT</th>
                                        <th className="p-2.5">TANGGAL</th>
                                        <th className="p-2.5">TUJUAN</th>
                                        <th className="p-2.5">PENERIMA</th>
                                        <th className="p-2.5">BERAT</th>
                                        <th className="p-2.5 text-right">TOTAL (RP)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {unbilledBTTList.map((btt, idx) => {
                                        const isChecked = newInvoiceForm.selected_btts.includes(btt.bttt_id);
                                        return (
                                            <tr key={idx} className={`hover:bg-blue-50/50 ${isChecked ? 'bg-blue-50/70 font-semibold' : ''}`}>
                                                <td className="p-2.5 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            setNewInvoiceForm(prev => ({
                                                                ...prev,
                                                                selected_btts: isChecked
                                                                    ? prev.selected_btts.filter(id => id !== btt.bttt_id)
                                                                    : [...prev, btt.bttt_id]
                                                            }));
                                                        }}
                                                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                                    />
                                                </td>
                                                <td className="p-2.5 font-mono font-bold text-blue-700">{btt.bttt_id}</td>
                                                <td className="p-2.5 font-mono">{String(btt.bttt_tanggal).split('T')[0]}</td>
                                                <td className="p-2.5">{btt.bttt_tujuankota}</td>
                                                <td className="p-2.5">{btt.bttt_tujuannama}</td>
                                                <td className="p-2.5 font-mono">{btt.bttt_berat} Kg</td>
                                                <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                                                    Rp {Number(btt.subtotal).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {unbilledBTTList.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                                                {loadingUnbilled
                                                    ? 'Memuat daftar resi BTT...'
                                                    : newInvoiceForm.artih_custid
                                                        ? 'Tidak ada resi BTT yang belum difakturkan untuk customer ini.'
                                                        : 'Silakan pilih customer terlebih dahulu untuk memuat resi BTT.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                        <div className="font-bold text-xs">
                            <span className="text-slate-500 mr-2">TOTAL TAGIHAN :</span>
                            <span className="font-mono text-base font-black text-rose-600">
                                Rp {Number(totalNewInvoice).toLocaleString('id-ID')}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl uppercase transition cursor-pointer"
                            >
                                BATAL
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl uppercase transition cursor-pointer shadow-md"
                            >
                                SIMPAN INVOICE
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    // ==========================================
    // MODAL EDIT INVOICE
    // ==========================================
    const editModalElement = isEditModalOpen && activeInvoice ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs transition-opacity" style={{ zIndex: 1000 }}>
            <div className={`w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-slate-800'}`}>
                <div className="px-6 py-3 bg-[#004b84] text-white flex items-center justify-between">
                    <div className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                        <FileText size={18} className="text-sky-300" />
                        EDIT INVOICE — {activeInvoice.artih_id}
                    </div>
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer"><X size={20} /></button>
                </div>

                <form onSubmit={handleSaveEditInvoice} className="p-6 space-y-5 overflow-y-auto text-xs flex-1">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG / AGEN :</label>
                            <input type="text" readOnly value={activeInvoice.agen_nama || 'DLI PUSAT'} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-bold text-slate-700" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. FAKTUR :</label>
                            <input type="text" readOnly value={activeInvoice.artih_id} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-sky-700" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. KWITANSI :</label>
                            <input type="text" readOnly value={activeInvoice.artih_nokw || '-'} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-emerald-700" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">JENIS INVOICE :</label>
                            <input type="text" readOnly value={activeInvoice.artih_jenis === 'K' ? 'Kredit' : activeInvoice.artih_jenis === 'B' ? 'Tunai' : 'Tagih Turun'} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-bold text-slate-700" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-500 block mb-1">CUSTOMER :</label>
                            <input type="text" readOnly value={`${activeInvoice.cust_name || activeInvoice.artih_custname} [${activeInvoice.artih_custid}]`} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-bold text-slate-800" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">TANGGAL INVOICE :</label>
                            <input type="date" value={activeInvoice.artih_tanggal} onChange={(e) => setActiveInvoice({ ...activeInvoice, artih_tanggal: e.target.value })} className="w-full p-2 bg-white border border-slate-300 rounded font-bold text-slate-800 outline-none focus:border-sky-500" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">FAKTUR PAJAK :</label>
                            <input type="text" placeholder="No Faktur Pajak..." value={activeInvoice.artih_fktpajak || ''} onChange={(e) => setActiveInvoice({ ...activeInvoice, artih_fktpajak: e.target.value })} className="w-full p-2 bg-white border border-slate-300 rounded font-bold text-slate-800 outline-none focus:border-sky-500" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="bg-[#004b84] text-white px-4 py-2 rounded-t-lg font-black uppercase text-center tracking-wider text-xs">
                            BTT YANG SUDAH DIPILIH ({currentActiveBTTs.length} RESI)
                        </div>
                        <div className="border border-slate-200 rounded-b-lg overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-black">
                                        <th className="p-2">NO. BTT</th>
                                        <th className="p-2">TANGGAL</th>
                                        <th className="p-2">PENGIRIM</th>
                                        <th className="p-2">PENERIMA</th>
                                        <th className="p-2">ISI KIRIMAN</th>
                                        <th className="p-2">KOTA TUJUAN</th>
                                        <th className="p-2">BERAT</th>
                                        <th className="p-2 text-right">BIAYA KIRIM</th>
                                        <th className="p-2 text-right">PENERUS</th>
                                        <th className="p-2 text-right">PACKING</th>
                                        <th className="p-2 text-right">JUMLAH</th>
                                        <th className="p-2 text-center text-rose-600 font-bold">HAPUS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {activeBTTList.map((btt, idx) => {
                                        const isMarkedDelete = bttToRemove.includes(btt.bttt_id);
                                        return (
                                            <tr key={idx} className={`hover:bg-slate-50/60 ${isMarkedDelete ? 'bg-rose-50/70 line-through text-slate-400' : ''}`}>
                                                <td className="p-2 font-mono font-bold text-sky-700">{btt.bttt_id}</td>
                                                <td className="p-2 font-mono">{String(btt.bttt_tanggal).split('T')[0]}</td>
                                                <td className="p-2">{btt.bttt_asalname}</td>
                                                <td className="p-2">{btt.bttt_tujuannama}</td>
                                                <td className="p-2">{btt.bttt_namabarang || '-'}</td>
                                                <td className="p-2">{btt.bttt_tujuankota}</td>
                                                <td className="p-2 font-mono">{btt.bttt_berat} Kg</td>
                                                <td className="p-2 text-right font-mono">Rp {Number(btt.bttt_harga).toLocaleString('id-ID')}</td>
                                                <td className="p-2 text-right font-mono">Rp {Number(btt.bttt_biayapenerus).toLocaleString('id-ID')}</td>
                                                <td className="p-2 text-right font-mono">Rp {Number(btt.biaya_packing).toLocaleString('id-ID')}</td>
                                                <td className="p-2 text-right font-mono font-bold text-slate-900">Rp {Number(btt.subtotal).toLocaleString('id-ID')}</td>
                                                <td className="p-2 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isMarkedDelete}
                                                        onChange={() => {
                                                            setBttToRemove(prev =>
                                                                prev.includes(btt.bttt_id)
                                                                    ? prev.filter(id => id !== btt.bttt_id)
                                                                    : [...prev, btt.bttt_id]
                                                            );
                                                        }}
                                                        className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                                                        title="Centang untuk menghapus resi dari invoice ini"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-100 p-4 rounded-xl border border-slate-200 font-bold text-xs">
                        <div><span className="text-slate-500 block text-[10px]">TOTAL BIAYA KIRIM:</span> <span className="font-mono text-slate-800">Rp {Number(totalBiayaKirim).toLocaleString('id-ID')}</span></div>
                        <div><span className="text-slate-500 block text-[10px]">TOTAL BIAYA PENERUS:</span> <span className="font-mono text-slate-800">Rp {Number(totalPenerus).toLocaleString('id-ID')}</span></div>
                        <div><span className="text-slate-500 block text-[10px]">TOTAL PACKING:</span> <span className="font-mono text-slate-800">Rp {Number(totalPacking).toLocaleString('id-ID')}</span></div>
                        <div className="text-right border-l pl-4 border-slate-300">
                            <span className="text-slate-500 block text-[10px]">TOTAL TAGIHAN INVOICE:</span>
                            <span className="font-mono font-black text-rose-600 text-sm">Rp {Number(grandTotalTagihan).toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                        <div className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">CETAK KWITANSI DAN FAKTUR :</div>
                        <div className="flex gap-2 flex-wrap">
                            <button type="button" onClick={() => { setPrintMode('KWITANSI_1'); setIsPrintModalOpen(true); }} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg uppercase cursor-pointer text-xs">
                                Kwitansi 1
                            </button>
                            <button type="button" onClick={() => { setPrintMode('KWITANSI_2'); setIsPrintModalOpen(true); }} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg uppercase cursor-pointer text-xs">
                                Kwitansi 2
                            </button>
                            <button type="button" onClick={() => { setPrintMode('TANDA_TERIMA'); setIsPrintModalOpen(true); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg uppercase cursor-pointer text-xs">
                                Tanda Terima Tagihan
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    // Prioritaskan nomor jurnal asli dari database; fallback ke format MEM jika belum terbawa
                                    const memNo = activeInvoice?.artih_journalid
                                        || (activeInvoice?.artih_id ? activeInvoice.artih_id.replace(/^[A-Za-z]{3}/, 'MEM') : '');
                                    handlePrintVoucherMemorial(memNo);
                                }}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-black text-white font-bold rounded-lg text-xs transition uppercase shadow cursor-pointer"
                            >
                                VOUCHER MEMORIAL
                            </button>
                            <button type="button" onClick={() => { setPrintMode('FAKTUR_2'); setIsPrintModalOpen(true); }} className="px-3 py-1.5 bg-sky-800 hover:bg-sky-900 text-white font-bold rounded-lg uppercase cursor-pointer text-xs">
                                Faktur Tipe 2
                            </button>
                            <button type="button" onClick={() => { setPrintMode('SUMMARY'); setIsPrintModalOpen(true); }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg uppercase cursor-pointer text-xs">
                                Summary Billing
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200">
                        <div className="font-black text-slate-700 uppercase tracking-wider text-xs flex justify-between items-center">
                            <span>DAFTAR NOMOR BTT UNTUK DITAMBAHKAN ({availableBTTToAdd.length} RESI TERSEDIA)</span>
                            <span className="text-sky-700 font-bold font-mono">{bttToAdd.length} Dipilih untuk Ditambahkan</span>
                        </div>

                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold">
                                        <th className="p-2 w-10 text-center">TAMBAH</th>
                                        <th className="p-2">NO. BTT</th>
                                        <th className="p-2">TANGGAL</th>
                                        <th className="p-2">TUJUAN</th>
                                        <th className="p-2">PENERIMA</th>
                                        <th className="p-2">KOLI/BERAT</th>
                                        <th className="p-2 text-right">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {availableBTTToAdd.map((btt, idx) => {
                                        const isSelected = bttToAdd.includes(btt.bttt_id);
                                        return (
                                            <tr key={idx} className={`hover:bg-sky-50/50 ${isSelected ? 'bg-sky-50 font-bold' : ''}`}>
                                                <td className="p-2 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            setBttToAdd(prev =>
                                                                prev.includes(btt.bttt_id)
                                                                    ? prev.filter(id => id !== btt.bttt_id)
                                                                    : [...prev, btt.bttt_id]
                                                            );
                                                        }}
                                                        className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                                                    />
                                                </td>
                                                <td className="p-2 font-mono text-sky-700">{btt.bttt_id}</td>
                                                <td className="p-2 font-mono">{String(btt.bttt_tanggal).split('T')[0]}</td>
                                                <td className="p-2">{btt.bttt_tujuankota}</td>
                                                <td className="p-2">{btt.bttt_tujuannama}</td>
                                                <td className="p-2 font-mono">{btt.bttt_jmlunit} Koli / {btt.bttt_berat} Kg</td>
                                                <td className="p-2 text-right font-mono text-rose-600">Rp {Number(btt.subtotal).toLocaleString('id-ID')}</td>
                                            </tr>
                                        );
                                    })}
                                    {availableBTTToAdd.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-6 text-center text-slate-400 font-bold">
                                                {loadingAddBTT ? 'Memuat resi...' : 'Tidak ada resi BTT lain yang siap ditambahkan untuk customer ini.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase transition cursor-pointer shadow-sm text-xs"
                            >
                                BATAL
                            </button>
                            <button
                                type="button"
                                onClick={() => { setPrintMode('KWITANSI_1'); setIsPrintModalOpen(true); }}
                                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl uppercase transition cursor-pointer shadow-sm text-xs flex items-center gap-1.5"
                            >
                                <Printer size={14} /> CETAK DOKUMEN
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Tombol Posting jika invoice belum diposting */}
                            {activeInvoice?.artih_postingyn !== 'Y' ? (
                                <button
                                    type="button"
                                    onClick={() => handlePostingInvoice(activeInvoice.artih_id)}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl uppercase transition cursor-pointer shadow-md text-xs flex items-center gap-1.5"
                                >
                                    <Lock size={14} /> POSTING INVOICE
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleUnpostingInvoice(activeInvoice)}
                                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl uppercase transition cursor-pointer shadow-md text-xs flex items-center gap-1.5"
                                >
                                    <Unlock size={14} /> UNPOSTING INVOICE
                                </button>
                            )}

                            {activeInvoice?.artih_postingyn !== 'Y' && (
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl uppercase transition cursor-pointer shadow-md text-xs"
                                >
                                    SIMPAN PERUBAHAN
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    // Sub-komponen Cetak Kwitansi
    const KwitansiSlip = ({ copyType }) => (
        <div className="py-2 text-[11px] leading-relaxed text-black font-sans">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2.5">
                    <img src={dakotaLogo} alt="Logo Dakota" className="h-10 w-auto object-contain" />
                    <div className="font-bold text-[10px] uppercase leading-tight text-slate-800">
                        <div>DAKOTA LOGISTIK INDONESIA</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-black text-xs uppercase tracking-wider text-slate-900">NOMOR KWITANSI</div>
                    <div className="font-bold text-xs font-mono text-slate-800">{activeInvoice?.artih_nokw || activeInvoice?.artih_id}</div>
                </div>
            </div>

            <div className="space-y-1.5 mb-4">
                <div className="grid grid-cols-12">
                    <div className="col-span-3 font-medium text-slate-700">Telah Diterima Dari</div>
                    <div className="col-span-9 font-bold text-slate-900">: {activeInvoice?.cust_name || activeInvoice?.artih_custname}</div>
                </div>
                <div className="grid grid-cols-12">
                    <div className="col-span-3 font-medium text-slate-700">Uang Sebesar</div>
                    <div className="col-span-9 font-bold font-mono text-slate-900">: Rp. {Number(grandTotalTagihan || activeInvoice?.artih_total || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="grid grid-cols-12 items-start">
                    <div className="col-span-3 font-medium text-slate-700">Terbilang</div>
                    <div className="col-span-9 font-bold uppercase text-slate-900">: {terbilangKapital(grandTotalTagihan || activeInvoice?.artih_total || 0)} RUPIAH</div>
                </div>
                <div className="grid grid-cols-12 items-start pt-1">
                    <div className="col-span-3 font-medium text-slate-700">Untuk Pembayaran</div>
                    <div className="col-span-9 font-medium text-slate-800">: BIAYA PENGIRIMAN BARANG (FAKTUR: {activeInvoice?.artih_id})</div>
                </div>
            </div>

            <div className="flex justify-end mb-2">
                <div className="text-center w-60">
                    <div className="text-[10px] mb-0.5 font-medium text-slate-700">{activeInvoice?.agen_nama || 'DLI PUSAT'}, {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</div>
                    <div className="text-[10px] font-bold uppercase mb-12 text-slate-900">PT. DAKOTA LINTAS BUANA</div>
                    <div className="font-bold text-[11px] text-slate-900">( ____________________ )</div>
                </div>
            </div>

            <div className="text-[9px] font-bold italic text-slate-600">
                {copyType}
            </div>
        </div>
    );

    const handlePrintVoucherMemorial = async (journalNo) => {
        if (!journalNo) {
            Swal.fire('Peringatan', 'Nomor jurnal belum tersedia atau invoice belum diposting!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const res = await api.get(`/gl/jurnal/detail/${encodeURIComponent(journalNo)}?pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const header = res.data?.header || {};
            const details = res.data?.details || [];

            if (details.length === 0) {
                Swal.fire('Informasi', 'Data rincian jurnal belum ditemukan.', 'info');
                return;
            }

            const totalDebet = details.reduce((sum, d) => sum + Number(d.tjurd_debet || 0), 0);
            const totalKredit = details.reduce((sum, d) => sum + Number(d.tjurd_kredit || 0), 0);

            const printWindow = window.open('', '_blank', 'width=950,height=700');
            if (!printWindow) {
                Swal.fire('Popup Diblokir', 'Mohon izinkan popup browser untuk mencetak dokumen ini.', 'warning');
                return;
            }

            const rowsHtml = details.map((row, idx) => `
                <tr style="font-family: monospace; font-size: 11px;">
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${row.tjurd_acccode}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${row.sakun_nama || '-'}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${row.tjurd_keterangan || '-'}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">${Number(row.tjurd_debet || 0).toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">${Number(row.tjurd_kredit || 0).toLocaleString('id-ID')}</td>
                </tr>
            `).join('');

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Voucher Memorial - ${header.tjurh_no || journalNo}</title>
                    <style>
                        @page { size: A4 portrait; margin: 12mm; }
                        body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th { border: 1px solid #000; padding: 6px; background-color: #f2f2f2; font-size: 11px; }
                    </style>
                </head>
                <body>
                    <div style="border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
                        <table style="width: 100%; margin: 0; border: none;">
                            <tr>
                                <td style="width: 60%; vertical-align: top; border: none;">
                                    <img id="logoDakota" src="${dakotaLogo}" alt="Logo Dakota Cargo" style="height: 38px; width: auto; object-fit: contain; display: block; margin-bottom: 4px;" />
                                    <div style="font-size: 11px; color: #222; font-weight: bold; letter-spacing: 0.3px;">PT. DAKOTA LOGISTIK INDONESIA</div>
                                    <div style="font-size: 10px; color: #555;">Jl. Wibawa Mukti II No. 99, Jatiasih, Bekasi</div>
                                </td>
                                <td style="width: 40%; text-align: right; vertical-align: top; border: none;">
                                    <h3 style="margin: 0; font-size: 16px; font-weight: 900; text-decoration: underline; letter-spacing: 0.5px;">BUKTI MEMORIAL</h3>
                                    <div style="font-family: monospace; font-size: 13px; font-weight: bold; margin-top: 5px;">NO: ${header.tjurh_no || journalNo}</div>
                                    <div style="font-size: 11px; margin-top: 3px;">TANGGAL: ${(header.tjurh_tanggal || '').substring(0, 10)}</div>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <div style="margin-bottom: 10px; font-size: 11px;">
                        <strong>Keterangan:</strong> ${header.tjurh_keterangan || '-'}
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 5%;">NO</th>
                                <th style="width: 15%;">KODE AKUN</th>
                                <th style="width: 25%;">NAMA PERKIRAAN</th>
                                <th style="width: 25%;">URAIAN TRANSAKSI</th>
                                <th style="width: 15%;">DEBET (RP)</th>
                                <th style="width: 15%;">KREDIT (RP)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight: bold; background-color: #fafafa; font-family: monospace; font-size: 12px;">
                                <td colspan="4" style="border: 1px solid #000; padding: 6px; text-align: center;">TOTAL TRANSAKSI</td>
                                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalDebet.toLocaleString('id-ID')}</td>
                                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalKredit.toLocaleString('id-ID')}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="margin-top: 40px;">
                        <table style="width: 100%; border: none;">
                            <tr style="text-align: center;">
                                <td style="width: 25%; border: none;">
                                    <div>Dibuat Oleh,</div>
                                    <div style="height: 55px;"></div>
                                    <div style="font-weight: bold; text-decoration: underline;">${header.tjurh_updateid || 'Accounting Staff'}</div>
                                </td>
                                <td style="width: 25%; border: none;">
                                    <div>Diperiksa Oleh,</div>
                                    <div style="height: 55px;"></div>
                                    <div style="font-weight: bold; text-decoration: underline;">( ......................... )</div>
                                </td>
                                <td style="width: 25%; border: none;">
                                    <div>Disetujui Oleh,</div>
                                    <div style="height: 55px;"></div>
                                    <div style="font-weight: bold; text-decoration: underline;">( ......................... )</div>
                                </td>
                                <td style="width: 25%; border: none;">
                                    <div>Dibukukan Oleh,</div>
                                    <div style="height: 55px;"></div>
                                    <div style="font-weight: bold; text-decoration: underline;">( ......................... )</div>
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
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengambil data voucher jurnal!', 'error');
        }
    };

    // Modal Cetak Dokumen
    const printDocElement = isPrintModalOpen && activeInvoice ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity" style={{ zIndex: 999999 }}>
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                <div className="px-6 py-3 bg-slate-800 text-white flex items-center justify-between no-print">
                    <span className="font-bold text-xs uppercase text-sky-400">PREVIEW CETAK: {printMode}</span>
                    <button onClick={() => setIsPrintModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer"><X size={18} /></button>
                </div>

                <div className="p-8 overflow-y-auto print-container bg-white text-black text-xs">
                    {printMode.startsWith('KWITANSI') ? (
                        <div className="space-y-6">
                            <KwitansiSlip copyType="*LEMBAR ASLI, UNTUK PENERIMA" />
                            <div className="border-b-2 border-dashed border-slate-400 my-4"></div>
                            <KwitansiSlip copyType="*LEMBAR COPY, UNTUK PEMBUAT KWITANSI" />
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div style="border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
                                <table style="width: 100%; margin: 0; border: none;">
                                    <tr>
                                        <td style="width: 60%; vertical-align: middle; border: none;">
                                            <div style="display: flex; align-items: center; gap: 14px;">
                                                <img src="${dakotaLogo}" alt="Logo Dakota" style="height: 44px; width: auto; object-fit: contain;" />
                                                <div>
                                                    <div style="font-size: 11px; font-weight: bold; color: #111;">PT. DAKOTA LOGISTIK INDONESIA</div>
                                                    <div style="font-size: 10px; color: #555; margin-top: 2px;">Jl. Wibawa Mukti II No. 99, Jatiasih, Bekasi</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="width: 40%; text-align: right; vertical-align: middle; border: none;">
                                            <h3 style="margin: 0; font-size: 16px; font-weight: 900; text-decoration: underline;">BUKTI MEMORIAL</h3>
                                            <div style="font-family: monospace; font-size: 13px; font-weight: bold; margin-top: 4px;">NO: ${header.tjurh_no || journalNo}</div>
                                            <div style="font-size: 11px; margin-top: 2px;">TANGGAL: ${(header.tjurh_tanggal || '').substring(0, 10)}</div>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                    <tr className="border-b-2 border-slate-400 bg-slate-100 font-bold uppercase">
                                        <th className="p-2 text-center">NO</th>
                                        <th className="p-2">NO. BTT</th>
                                        <th className="p-2">TGL BTT</th>
                                        <th className="p-2">TUJUAN</th>
                                        <th className="p-2">PENERIMA</th>
                                        <th className="p-2">KOLI</th>
                                        <th className="p-2">BERAT</th>
                                        <th className="p-2 text-right">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {currentActiveBTTs.map((b, i) => (
                                        <tr key={i}>
                                            <td className="p-2 text-center">{i + 1}</td>
                                            <td className="p-2 font-mono font-bold">{b.bttt_id}</td>
                                            <td className="p-2 font-mono">{String(b.bttt_tanggal).split('T')[0]}</td>
                                            <td className="p-2">{b.bttt_tujuankota}</td>
                                            <td className="p-2">{b.bttt_tujuannama}</td>
                                            <td className="p-2 font-mono">{b.bttt_jmlunit}</td>
                                            <td className="p-2 font-mono">{b.bttt_berat} Kg</td>
                                            <td className="p-2 text-right font-mono font-bold">Rp {Number(b.subtotal).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t-2 border-slate-400 font-bold bg-slate-50">
                                        <td colSpan={7} className="p-2 text-right">TOTAL TAGIHAN :</td>
                                        <td className="p-2 text-right font-mono text-rose-600">Rp {Number(grandTotalTagihan).toLocaleString('id-ID')}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 italic font-bold text-sky-900 text-xs">
                                Terbilang: {terbilangKapital(grandTotalTagihan)} RUPIAH
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-3 bg-slate-100 border-t flex justify-end gap-2 no-print">
                    <button onClick={() => window.print()} className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md">
                        <Printer size={14} /> Cetak Dokumen
                    </button>
                </div>
            </div>
            {printMode === 'TANDA_TERIMA' && (
                <div className="space-y-4 text-black">
                    <div className="text-center font-bold">
                        <h2 className="text-base uppercase tracking-wider">PT DAKOTA LOGISTIK INDONESIA</h2>
                        <h3 className="text-sm font-black underline">TANDA TERIMA TAGIHAN</h3>
                    </div>
                    <table className="w-full border-collapse border border-black text-[11px]">
                        <tbody>
                            <tr>
                                <td className="border border-black p-2 w-1/2">
                                    <strong>Tanggal :</strong>
                                    <p className="text-[9px] italic text-slate-600">(Wajib diisi oleh kurir saat menyerahkan tagihan)</p>
                                </td>
                                <td className="border border-black p-2"><strong>Tempat :</strong></td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2">
                                    <strong>Dari :</strong><br />PT. DAKOTA LOGISTIK INDONESIA
                                </td>
                                <td className="border border-black p-2">
                                    <strong>Untuk :</strong><br />{activeInvoice?.cust_name || activeInvoice?.artih_custname}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <table className="w-full border-collapse border border-black text-[11px]">
                        <thead>
                            <tr className="border border-black bg-slate-100 font-bold">
                                <th className="border border-black p-1.5 w-10 text-center">No.</th>
                                <th className="border border-black p-1.5">No. Kwitansi</th>
                                <th className="border border-black p-1.5">Tanggal</th>
                                <th className="border border-black p-1.5 text-right">Nilai Nominal</th>
                                <th className="border border-black p-1.5 text-center w-40">Diserahkan Oleh</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-black p-2 text-center">1</td>
                                <td className="border border-black p-2 font-mono font-bold">{activeInvoice?.artih_nokw || activeInvoice?.artih_id}</td>
                                <td className="border border-black p-2 font-mono">{String(activeInvoice?.artih_tanggal || '').split('T')[0]}</td>
                                <td className="border border-black p-2 font-mono text-right font-bold">Rp {Number(grandTotalTagihan).toLocaleString('id-ID')}</td>
                                <td className="border border-black p-2 text-center align-bottom pb-1 h-28">
                                    <span className="text-[10px] block">(Nama Jelas & TTD)</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {printMode === 'MEMORIAL' && (
                <div className="space-y-4 text-black font-sans">
                    <div className="flex justify-between items-start border-b pb-2">
                        <div>
                            <h2 className="font-black text-sm uppercase">PT. DAKOTA LOGISTIK INDONESIA</h2>
                            <p className="text-[10px] text-slate-600">CABANG / AGEN: {activeInvoice?.agen_nama || 'PUSAT'}</p>
                        </div>
                        <div className="text-right">
                            <h3 className="text-base font-black uppercase text-slate-900">VOUCHER MEMORIAL</h3>
                            <p className="text-xs font-mono font-bold">No. Faktur: {activeInvoice?.artih_id}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 text-[11px] py-1 border-b">
                        <div><strong>Pelanggan:</strong> {activeInvoice?.cust_name || activeInvoice?.artih_custname}</div>
                        <div className="text-right"><strong>Tanggal:</strong> {String(activeInvoice?.artih_tanggal || '').split('T')[0]}</div>
                    </div>

                    <table className="w-full border-collapse border border-black text-[11px] my-3">
                        <thead>
                            <tr className="bg-slate-200 border border-black font-bold">
                                <th className="border border-black p-2 text-left">Kode Akun</th>
                                <th className="border border-black p-2 text-center w-12">CC</th>
                                <th className="border border-black p-2 text-left">Keterangan Akun</th>
                                <th className="border border-black p-2 text-right">Debet (Rp)</th>
                                <th className="border border-black p-2 text-right">Kredit (Rp)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-black p-2 font-mono font-bold">A102010100</td>
                                <td className="border border-black p-2 text-center">1</td>
                                <td className="border border-black p-2">PIUTANG USAHA — {activeInvoice?.cust_name || activeInvoice?.artih_custname}</td>
                                <td className="border border-black p-2 text-right font-mono font-bold">{Math.round(grandTotalTagihan).toLocaleString('id-ID')}</td>
                                <td className="border border-black p-2 text-right font-mono">0</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 font-mono font-bold">B102010600</td>
                                <td className="border border-black p-2 text-center">1</td>
                                <td className="border border-black p-2">UTANG PPN KELUARAN</td>
                                <td className="border border-black p-2 text-right font-mono">0</td>
                                <td className="border border-black p-2 text-right font-mono font-bold">{Math.round(totalPPN).toLocaleString('id-ID')}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 font-mono font-bold">D101010200</td>
                                <td className="border border-black p-2 text-center">1</td>
                                <td className="border border-black p-2">PENJUALAN KREDIT / PENDAPATAN JASA ANGKUT</td>
                                <td className="border border-black p-2 text-right font-mono">0</td>
                                <td className="border border-black p-2 text-right font-mono font-bold">{Math.round(totalBiayaKirim).toLocaleString('id-ID')}</td>
                            </tr>
                            {totalPacking > 0 && (
                                <tr>
                                    <td className="border border-black p-2 font-mono font-bold">D101010300</td>
                                    <td className="border border-black p-2 text-center">1</td>
                                    <td className="border border-black p-2">PENDAPATAN JASA PACKING</td>
                                    <td className="border border-black p-2 text-right font-mono">0</td>
                                    <td className="border border-black p-2 text-right font-mono font-bold">{Math.round(totalPacking).toLocaleString('id-ID')}</td>
                                </tr>
                            )}
                            <tr className="border-t-2 border-black font-black bg-slate-100">
                                <td colSpan={3} className="border border-black p-2 text-right">TOTAL :</td>
                                <td className="border border-black p-2 text-right font-mono">Rp {Math.round(grandTotalTagihan).toLocaleString('id-ID')}</td>
                                <td className="border border-black p-2 text-right font-mono">Rp {Math.round(grandTotalTagihan).toLocaleString('id-ID')}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    ) : null;

    const modalRoot = document.getElementById('modal-root') || document.body;

    // Handler Tombol Unposting Invoice
    const handleUnpostingInvoice = (item) => {
        if (item.artih_postingyn !== 'Y') {
            Swal.fire('Perhatian', 'Hanya invoice berstatus POSTED yang dapat di-Unposting.', 'info');
            return;
        }

        Swal.fire({
            title: 'Unposting Invoice?',
            text: `Invoice ${item.artih_id} akan dikembalikan menjadi DRAFT dan jurnal terkait akan dibatalkan. Lanjutkan?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d97706',
            confirmButtonText: 'Ya, Unposting',
            cancelButtonText: 'Batal'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const ptId = localStorage.getItem('pt_id') || 'C';
                    const currentAgen = getActiveAgen();

                    const response = await api.post(`/piutang/invoice/unposting?pt_id=${ptId}`, {
                        invoice_id: item.artih_id,
                        agen_id: currentAgen.id
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Berhasil!', response.data?.message || 'Invoice berhasil di-unposting.', 'success');
                    fetchInvoiceList();
                } catch (err) {
                    Swal.fire('Gagal!', err.response?.data?.message || 'Gagal unposting invoice.', 'error');
                }
            }
        });
    };

    // Handler Posting Invoice
    const handlePostingInvoice = (invoiceId) => {
        const id = invoiceId || activeInvoice?.artih_id;
        Swal.fire({
            title: 'Posting Invoice?',
            text: `Invoice ${id} akan diposting dan jurnal voucher memorial otomatis dibuat. Lanjutkan?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            confirmButtonText: 'Ya, Posting Sekarang',
            cancelButtonText: 'Batal'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const ptId = localStorage.getItem('pt_id') || 'C';
                    const currentAgen = getActiveAgen();

                    const response = await api.post(`/piutang/invoice/posting?pt_id=${ptId}`, {
                        invoice_id: id,
                        agen_id: currentAgen.id
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Berhasil!', response.data?.message || 'Invoice berhasil diposting.', 'success');
                    setIsEditModalOpen(false);
                    fetchInvoiceList();
                } catch (err) {
                    Swal.fire('Gagal!', err.response?.data?.message || 'Gagal memposting invoice.', 'error');
                }
            }
        });
    };

    return (
        <div className="space-y-5">
            <style>
                {`
            @media print {
                body * { visibility: hidden; }
                .print-container, .print-container * { visibility: visible; }
                .print-container { position: absolute; left: 0; top: 0; width: 100%; }
                .no-print { display: none !important; }
            }
            `}
            </style>

            {/* 2. Panel Filter hanya tampil jika showFilter bernilai true */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER INVOICE PENAGIHAN PIUTANG
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AWAL</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AKHIR</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG</label>
                            <select
                                value={selectedCabang}
                                disabled={!isHoldingUser}
                                onChange={(e) => setSelectedCabang(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser
                                    ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'
                                    }`}
                                title={!isHoldingUser ? "Filter cabang terkunci sesuai lokasi login Anda" : "Pilih cabang untuk monitoring"}
                            >
                                {isHoldingUser && (
                                    <option value="">-- SEMUA CABANG --</option>
                                )}

                                {!isHoldingUser ? (
                                    <option value={currentActiveAgen.id}>
                                        {currentActiveAgen.nama}
                                    </option>
                                ) : (
                                    cabangList.map((c, i) => (
                                        <option key={i} value={c.agen_id || c.AgenID}>
                                            {c.agen_nama || c.AgenNama}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">JENIS INVOICE</label>
                            <select
                                value={selectedJenis}
                                onChange={(e) => setSelectedJenis(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA JENIS --</option>
                                <option value="K">Kredit (Langganan Tempo)</option>
                                <option value="B">Tunai (Cash)</option>
                                <option value="T">Tagih Turun (COD)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS PEMBAYARAN</label>
                            <select
                                value={selectedTerbayar}
                                onChange={(e) => setSelectedTerbayar(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA STATUS --</option>
                                <option value="Y">Lunas</option>
                                <option value="N">Belum Lunas</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CUSTOMER</label>
                            <input
                                type="text"
                                placeholder="Cari nama customer..."
                                value={searchCustomer}
                                onChange={(e) => setSearchCustomer(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. INVOICE</label>
                            <input
                                type="text"
                                placeholder="Nomor invoice..."
                                value={searchInvoice}
                                onChange={(e) => setSearchInvoice(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. KWITANSI</label>
                            <input
                                type="text"
                                placeholder="Nomor kwitansi..."
                                value={searchKwitansi}
                                onChange={(e) => setSearchKwitansi(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 mt-5">
                                <input
                                    type="checkbox"
                                    checked={bypassTanggal}
                                    onChange={(e) => setBypassTanggal(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded"
                                />
                                Bypass Filter Tanggal
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer"
                        >
                            <Printer size={14} /> Cetak Grid
                        </button>
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer"
                        >
                            RESET
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw size={14} /> REFRESH DATA
                        </button>
                    </div>
                </form>
            )}

            {/* 3. DataTableTemplate menerima prop onFilter */}
            <DataTableTemplate
                title="INVOICE"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                isAddDisabled={false}
                hideAddButton={false}
                onFilter={() => setShowFilter(prev => !prev)}
                onAdd={() => {
                    const currentAgen = getActiveAgen();
                    setNewInvoiceForm({
                        artih_tanggal: today,
                        artih_custid: '',
                        artih_custname: '',
                        artih_agenid: currentAgen.id,
                        artih_agenname: currentAgen.nama,
                        artih_jenis: 'K',
                        artih_fktpajak: '',
                        artih_keterangan: '',
                        selected_btts: []
                    });
                    setUnbilledBTTList([]);
                    setIsAddModalOpen(true);
                }}
                onEdit={handleOpenEditInvoice}
                onDelete={handleDeleteInvoice}
            />

            {addModalElement && ReactDOM.createPortal(addModalElement, modalRoot)}
            {editModalElement && ReactDOM.createPortal(editModalElement, modalRoot)}
            {printDocElement && ReactDOM.createPortal(printDocElement, modalRoot)}
        </div>
    );
};

export default Invoice;