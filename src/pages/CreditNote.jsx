import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, CheckCircle2, XCircle, Search, RefreshCw, Printer, X, Plus, Trash2, ShieldCheck, Lock, Unlock, FileText, DollarSign } from 'lucide-react';
import Swal from 'sweetalert2';
import dakotaLogo from '../assets/new_logo 2.png';

const CreditNote = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // State Buka-Tutup Filter
    const [showFilter, setShowFilter] = useState(false);

    const [cabangList, setCabangList] = useState([]);
    const [custList, setCustList] = useState([]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

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

    // Filter States
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [bypassTanggal, setBypassTanggal] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState(isHoldingUser ? '' : currentActiveAgen.id);
    const [selectedAlasan, setSelectedAlasan] = useState('');
    const [selectedPosting, setSelectedPosting] = useState('');
    const [searchCustomer, setSearchCustomer] = useState('');
    const [searchNoCN, setSearchNoCN] = useState('');

    // Sinkronisasi cabang otomatis untuk cabang daerah
    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setSelectedCabang(currentActiveAgen.id);
        }
    }, [isHoldingUser, currentActiveAgen.id, cabangList]);

    // Modal Add / Edit State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPrintDocOpen, setIsPrintDocOpen] = useState(false);
    const [activeCN, setActiveCN] = useState({
        artcnh_no: '',
        artcnh_tanggal: today,
        artcnh_custid: '',
        cust_name: '',
        artcnh_alasan: 'PENGHAPUSAN',
        artcnh_keterangan: '',
        artcnh_agenid: currentActiveAgen.id || '001',
        artcnh_postingyn: 'N',
        artcnh_journalid: '',
        details: []
    });

    // Invoice Picker Modal State
    const [availableInvoices, setAvailableInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

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
            console.error('Gagal load opsi dropdown:', err);
        }
    };

    const fetchCNList = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            let url = `/piutang/credit-note?pt_id=${ptId}&bypass_tanggal=${bypassTanggal}`;

            if (!bypassTanggal) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : selectedCabang;
            if (activeFilterCabang) url += `&agen_id=${encodeURIComponent(activeFilterCabang)}`;
            if (selectedAlasan) url += `&alasan=${encodeURIComponent(selectedAlasan)}`;
            if (selectedPosting) url += `&posting_yn=${encodeURIComponent(selectedPosting)}`;
            if (searchCustomer) url += `&customer=${encodeURIComponent(searchCustomer)}`;
            if (searchNoCN) url += `&no_cn=${encodeURIComponent(searchNoCN)}`;

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data?.data || []);
        } catch (err) {
            console.error('Gagal load daftar Credit Note:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchCNList();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchCNList();
    };

    const handleResetFilter = () => {
        setStartDate(firstDay);
        setEndDate(today);
        setBypassTanggal(false);
        setSelectedCabang(isHoldingUser ? '' : currentActiveAgen.id);
        setSelectedAlasan('');
        setSelectedPosting('');
        setSearchCustomer('');
        setSearchNoCN('');
        fetchCNList();
    };

    // ➕ Tambah Baru
    const handleAddNew = () => {
        setActiveCN({
            artcnh_no: '',
            artcnh_tanggal: today,
            artcnh_custid: '',
            cust_name: '',
            artcnh_alasan: 'PENGHAPUSAN',
            artcnh_keterangan: '',
            artcnh_agenid: currentActiveAgen.id || '001',
            artcnh_postingyn: 'N',
            artcnh_journalid: '',
            details: []
        });
        setAvailableInvoices([]);
        setIsModalOpen(true);
    };

    // ✏️ Buka Edit Detail
    const handleOpenEdit = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/piutang/credit-note/detail/${encodeURIComponent(item.artcnh_no)}?pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const header = res.data?.header;
            const details = (res.data?.details || []).map(d => ({
                artih_id: d.artcnd_artihid,
                artih_nokw: d.artcnd_artihnokw,
                nilai: d.artcnd_nilai,
                keterangan: d.artcnd_keterangan,
                artih_tanggal: d.artih_tanggal,
                artih_total: d.artih_total,
                outstanding: d.outstanding_saat_ini
            }));

            setActiveCN({
                ...header,
                artcnh_tanggal: String(header.artcnh_tanggal || '').split('T')[0],
                details: details
            });

            setIsModalOpen(true);
        } catch (err) {
            Swal.fire({ title: 'Error', text: 'Gagal mengambil detail Credit Note.', icon: 'error' });
        }
    };

    // Cari Invoice Milik Customer yang Dipilih
    const handleLoadInvoices = async () => {
        if (!activeCN.artcnh_custid) {
            Swal.fire({ title: 'Pilih Customer', text: 'Silakan pilih customer terlebih dahulu.', icon: 'info' });
            return;
        }

        setLoadingInvoices(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/piutang/credit-note/invoices-outstanding?pt_id=${ptId}&cust_id=${encodeURIComponent(activeCN.artcnh_custid)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const existingKW = activeCN.details.map(d => d.artih_nokw);
            const list = (res.data?.data || []).filter(inv => !existingKW.includes(inv.artih_nokw));

            setAvailableInvoices(list);
            if (list.length === 0) {
                Swal.fire({ title: 'Informasi', text: 'Tidak ada invoice outstanding (belum lunas) untuk customer ini.', icon: 'info' });
            }
        } catch (err) {
            Swal.fire({ title: 'Gagal', text: 'Gagal mengambil tagihan invoice customer.', icon: 'error' });
        } finally {
            setLoadingInvoices(false);
        }
    };

    // Tambah invoice dari picker ke tabel detail
    const handleAddInvoiceToDetail = (inv) => {
        setActiveCN(prev => ({
            ...prev,
            details: [
                ...prev.details,
                {
                    artih_id: inv.artih_id,
                    artih_nokw: inv.artih_nokw,
                    nilai: inv.outstanding,
                    keterangan: '',
                    artih_tanggal: inv.artih_tanggal,
                    artih_total: inv.artih_total,
                    outstanding: inv.outstanding
                }
            ]
        }));
        setAvailableInvoices(prev => prev.filter(i => i.artih_nokw !== inv.artih_nokw));
    };

    const handleRemoveDetail = (idx) => {
        setActiveCN(prev => ({
            ...prev,
            details: prev.details.filter((_, i) => i !== idx)
        }));
    };

    const handleDetailValueChange = (idx, val) => {
        const num = parseFloat(val) || 0;
        setActiveCN(prev => {
            const arr = [...prev.details];
            arr[idx].nilai = num;
            return { ...prev, details: arr };
        });
    };

    const handleSaveCN = async (e) => {
        e.preventDefault();
        if (activeCN.details.length === 0) {
            Swal.fire({ title: 'Rincian Kosong', text: 'Harap tambahkan minimal 1 invoice yang dipotong.', icon: 'warning' });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const payload = {
                artcnh_no: activeCN.artcnh_no,
                artcnh_tanggal: activeCN.artcnh_tanggal,
                artcnh_custid: activeCN.artcnh_custid,
                artcnh_alasan: activeCN.artcnh_alasan,
                artcnh_keterangan: activeCN.artcnh_keterangan,
                artcnh_agenid: activeCN.artcnh_agenid,
                details: activeCN.details.map(d => ({
                    artih_id: d.artih_id,
                    artih_nokw: d.artih_nokw,
                    nilai: d.nilai,
                    keterangan: d.keterangan
                }))
            };

            const res = await api.post(`/piutang/credit-note/save?pt_id=${ptId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                title: 'BERHASIL!',
                text: res.data?.message || 'Data Credit Note berhasil disimpan.',
                icon: 'success'
            });

            setIsModalOpen(false);
            fetchCNList();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Gagal menyimpan Credit Note.',
                icon: 'error'
            });
        }
    };

    // 🔒 Posting GL
    const handlePosting = async () => {
        const result = await Swal.fire({
            title: 'Posting Credit Note?',
            text: `Credit Note ${activeCN.artcnh_no} akan diposting ke Jurnal GL Piutang.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Posting Sekarang'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const ptId = localStorage.getItem('pt_id') || 'C';
                const res = await api.post(`/piutang/credit-note/posting?pt_id=${ptId}`, { artcnh_no: activeCN.artcnh_no }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                Swal.fire({ title: 'BERHASIL POSTING!', text: res.data?.message, icon: 'success' });
                setIsModalOpen(false);
                fetchCNList();
            } catch (err) {
                Swal.fire({ title: 'Gagal Posting', text: err.response?.data?.message || 'Gagal posting jurnal.', icon: 'error' });
            }
        }
    };

    // 🔓 Unposting GL
    const handleUnposting = async () => {
        const result = await Swal.fire({
            title: 'Unposting Credit Note?',
            text: `Jurnal ${activeCN.artcnh_journalid} akan dibatalkan/void.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Unposting'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const ptId = localStorage.getItem('pt_id') || 'C';
                const res = await api.post(`/piutang/credit-note/unposting?pt_id=${ptId}`, { artcnh_no: activeCN.artcnh_no }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                Swal.fire({ title: 'BERHASIL UNPOSTING!', text: res.data?.message, icon: 'success' });
                setIsModalOpen(false);
                fetchCNList();
            } catch (err) {
                Swal.fire({ title: 'Gagal Unposting', text: err.response?.data?.message || 'Gagal unposting.', icon: 'error' });
            }
        }
    };

    // 🗑️ Delete (Soft Delete)
    const handleDeleteCN = (item) => {
        Swal.fire({
            title: 'Hapus Credit Note?',
            text: `Apakah Anda yakin ingin menghapus Credit Note ${item.artcnh_no}?`,
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
                    await api.delete(`/piutang/credit-note/${encodeURIComponent(item.artcnh_no)}?pt_id=${ptId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire({ title: 'Berhasil!', text: `Credit Note ${item.artcnh_no} berhasil dihapus.`, icon: 'success' });
                    fetchCNList();
                } catch (err) {
                    Swal.fire({ title: 'Gagal!', text: err.response?.data?.message || 'Gagal menghapus Credit Note.', icon: 'error' });
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

    const KwitansiSlip = ({ copyType }) => (
        <div className="py-2 text-[11px] leading-relaxed text-black font-sans">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2.5">
                    <img
                        src={dakotaLogo}
                        alt="Logo Dakota"
                        className="h-10 w-auto object-contain"
                    />
                    <div className="font-bold text-[10px] uppercase leading-tight text-slate-800">
                        <div>DAKOTA LOGISTIK INDONESIA</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-black text-xs uppercase tracking-wider text-slate-900">NOMOR KWITANSI</div>
                    <div className="font-bold text-xs font-mono text-slate-800">{activeCN.details[0]?.artih_nokw || activeCN.artcnh_no}</div>
                </div>
            </div>

            <div className="space-y-1.5 mb-4">
                <div className="grid grid-cols-12">
                    <div className="col-span-3 font-medium text-slate-700">Telah Diterima Dari</div>
                    <div className="col-span-9 font-bold text-slate-900">: {activeCN.cust_name}</div>
                </div>
                <div className="grid grid-cols-12">
                    <div className="col-span-3 font-medium text-slate-700">Uang Sebesar</div>
                    <div className="col-span-9 font-bold font-mono text-slate-900">: Rp. {Number(totalCN).toLocaleString('id-ID', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="grid grid-cols-12 items-start">
                    <div className="col-span-3 font-medium text-slate-700">Terbilang</div>
                    <div className="col-span-9 font-bold uppercase text-slate-900">: {terbilangKapital(totalCN)} RUPIAH</div>
                </div>
                <div className="grid grid-cols-12 items-start pt-1">
                    <div className="col-span-3 font-medium text-slate-700">Untuk Pembayaran</div>
                    <div className="col-span-9 font-medium text-slate-800">: {activeCN.artcnh_keterangan || 'BIAYA KIRIM BARANG (CREDIT NOTE)'}</div>
                </div>
            </div>

            <div className="flex justify-end mb-2">
                <div className="text-center w-60">
                    <div className="text-[10px] mb-0.5 font-medium text-slate-700">DLI PUSAT, {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</div>
                    <div className="text-[10px] font-bold uppercase mb-12 text-slate-900">PT. DAKOTA LINTAS BUANA</div>
                    <div className="font-bold text-[11px] text-slate-900">( ____________________ )</div>
                </div>
            </div>

            <div className="text-[9px] font-bold italic text-slate-600">
                {copyType}
            </div>
        </div>
    );

    const totalCN = activeCN.details.reduce((sum, d) => sum + (parseFloat(d.nilai) || 0), 0);
    const isPosted = activeCN.artcnh_postingyn === 'Y';

    const columns = [
        {
            header: 'NO. CREDIT NOTE',
            accessor: 'artcnh_no',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.artcnh_no}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'artcnh_tanggal',
            render: (item) => <span className="font-mono text-slate-600">{String(item.artcnh_tanggal || '').split('T')[0]}</span>
        },
        {
            header: 'CUSTOMER',
            accessor: 'cust_name',
            render: (item) => <span className="font-bold text-slate-800">{item.cust_name}</span>
        },
        {
            header: 'ALASAN',
            accessor: 'artcnh_alasan',
            render: (item) => item.artcnh_alasan === 'KOREKSI' ? (
                <span className="font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-[10px]">KOREKSI</span>
            ) : (
                <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">PENGHAPUSAN</span>
            )
        },
        {
            header: 'TOTAL NILAI (RP)',
            accessor: 'artcnh_total',
            render: (item) => <span className="font-mono font-black text-rose-600">Rp {Number(item.artcnh_total || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'STATUS POSTING',
            accessor: 'artcnh_postingyn',
            render: (item) => item.artcnh_postingyn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> POSTED
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                    <XCircle size={12} /> DRAFT
                </span>
            )
        }
    ];

    // Modal Edit / Add
    const modalElement = isModalOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs transition-opacity" style={{ zIndex: 99999 }}>
            <div className={`w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                <div className="px-8 py-4 bg-slate-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black uppercase text-sm tracking-wider">
                        <FileText size={18} className="text-sky-400" />
                        {activeCN.artcnh_no ? `EDIT CREDIT NOTE (${activeCN.artcnh_no})` : 'TAMBAH CREDIT NOTE BARU'}
                    </div>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveCN} className="p-6 space-y-5 overflow-y-auto text-xs flex-1">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. CREDIT NOTE :</label>
                            <input
                                type="text"
                                readOnly
                                value={activeCN.artcnh_no || '(Otomatis Setelah Simpan)'}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 font-mono font-bold text-sky-700 outline-none"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">TANGGAL :</label>
                            <input
                                type="date"
                                disabled={isPosted}
                                value={activeCN.artcnh_tanggal}
                                onChange={(e) => setActiveCN({ ...activeCN, artcnh_tanggal: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG / AGEN :</label>
                            <input
                                type="text"
                                readOnly
                                tabIndex={-1}
                                value={currentActiveAgen.nama || 'PUSAT DAKOTA'}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 font-bold text-slate-700 cursor-not-allowed select-none outline-none"
                                title="Cabang otomatis terkunci sesuai lokasi login"
                            />
                            <input type="hidden" value={activeCN.artcnh_agenid} />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">ALASAN PENERBITAN :</label>
                            <select
                                disabled={isPosted}
                                value={activeCN.artcnh_alasan}
                                onChange={(e) => setActiveCN({ ...activeCN, artcnh_alasan: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="PENGHAPUSAN">PENGHAPUSAN (Piutang Macet)</option>
                                <option value="KOREKSI">KOREKSI (Penyesuaian Harga)</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-500 block mb-1">CUSTOMER :</label>
                            <select
                                disabled={isPosted || activeCN.details.length > 0}
                                value={activeCN.artcnh_custid}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const found = custList.find(c => c.cust_id === val);
                                    setActiveCN({ ...activeCN, artcnh_custid: val, cust_name: found ? found.cust_name : '' });
                                    setAvailableInvoices([]);
                                }}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- PILIH CUSTOMER --</option>
                                {custList.map((c, i) => (
                                    <option key={i} value={c.cust_id}>{c.cust_name} [{c.cust_id}]</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-500 block mb-1">KETERANGAN :</label>
                            <input
                                type="text"
                                disabled={isPosted}
                                placeholder="Catatan alasan pemotongan piutang..."
                                value={activeCN.artcnh_keterangan}
                                onChange={(e) => setActiveCN({ ...activeCN, artcnh_keterangan: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>
                    </div>

                    {/* Rincian Invoice yang Dipotong */}
                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                        <div className="flex justify-between items-center border-b pb-2 border-slate-100">
                            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                                RINCIAN INVOICE YANG DIPOTONG
                            </span>
                            {!isPosted && (
                                <button
                                    type="button"
                                    onClick={handleLoadInvoices}
                                    className="px-3.5 py-1.5 bg-sky-50 text-sky-700 border border-sky-300 rounded-lg font-bold hover:bg-sky-100 transition cursor-pointer flex items-center gap-1 text-[11px]"
                                >
                                    <Search size={13} /> {loadingInvoices ? 'Mencari...' : 'Cari Invoice Outstanding'}
                                </button>
                            )}
                        </div>

                        {availableInvoices.length > 0 && (
                            <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2">
                                <span className="font-bold text-sky-900 block text-[11px]">Klik (+) untuk menambahkan invoice ke pemotongan:</span>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                    {availableInvoices.map((inv, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-sky-200 text-xs">
                                            <div>
                                                <span className="font-bold text-sky-800 font-mono mr-2">{inv.artih_nokw}</span>
                                                <span className="text-slate-500">Tgl: {String(inv.artih_tanggal).split('T')[0]}</span>
                                                <span className="text-rose-600 font-bold ml-2">Outstanding: Rp {Number(inv.outstanding).toLocaleString('id-ID')}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleAddInvoiceToDetail(inv)}
                                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-md font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1 text-[10px]"
                                            >
                                                <Plus size={11} /> Tambah
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-700 bg-slate-50 uppercase text-[10px] font-black">
                                    <th className="p-2">NO. KWITANSI / INVOICE</th>
                                    <th className="p-2 text-right">TOTAL INVOICE</th>
                                    <th className="p-2 text-right">OUTSTANDING</th>
                                    <th className="p-2 text-right">NILAI POTONGAN CN</th>
                                    <th className="p-2">KETERANGAN</th>
                                    {!isPosted && <th className="p-2 text-center">AKSI</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {activeCN.details.map((d, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="p-2 font-mono font-bold text-sky-700">{d.artih_nokw}</td>
                                        <td className="p-2 text-right font-mono">Rp {Number(d.artih_total || 0).toLocaleString('id-ID')}</td>
                                        <td className="p-2 text-right font-mono text-slate-500">Rp {Number(d.outstanding || 0).toLocaleString('id-ID')}</td>
                                        <td className="p-2 text-right">
                                            {isPosted ? (
                                                <span className="font-mono font-bold text-rose-600">Rp {Number(d.nilai || 0).toLocaleString('id-ID')}</span>
                                            ) : (
                                                <input
                                                    type="number"
                                                    value={d.nilai}
                                                    onChange={(e) => handleDetailValueChange(idx, e.target.value)}
                                                    className="w-32 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-right outline-none focus:border-sky-500"
                                                />
                                            )}
                                        </td>
                                        <td className="p-2">
                                            {isPosted ? (
                                                <span className="text-slate-600">{d.keterangan || '-'}</span>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={d.keterangan || ''}
                                                    placeholder="Keterangan..."
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setActiveCN(prev => {
                                                            const arr = [...prev.details];
                                                            arr[idx].keterangan = val;
                                                            return { ...prev, details: arr };
                                                        });
                                                    }}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded text-slate-800 outline-none focus:border-sky-500"
                                                />
                                            )}
                                        </td>
                                        {!isPosted && (
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveDetail(idx)}
                                                    className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {activeCN.details.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-6 text-center text-slate-400 font-bold">
                                            Belum ada rincian invoice. Klik "Cari Invoice Outstanding" di atas.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Total Grand Ringkasan */}
                    <div className="flex justify-end items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="font-black text-slate-700 uppercase tracking-wider text-xs">TOTAL NILAI CREDIT NOTE :</span>
                        <span className="font-mono font-black text-rose-600 text-lg">Rp {Number(totalCN).toLocaleString('id-ID')}</span>
                    </div>

                    {/* Tombol Footer */}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 py-2.5 bg-slate-500 hover:bg-slate-600 text-white font-bold rounded-xl uppercase transition cursor-pointer"
                        >
                            BATAL
                        </button>

                        <div className="flex gap-2">
                            {activeCN.artcnh_no && (
                                <button
                                    type="button"
                                    onClick={() => setIsPrintDocOpen(true)}
                                    className="px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl uppercase transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                    <Printer size={15} /> CETAK
                                </button>
                            )}

                            {isPosted ? (
                                <button
                                    type="button"
                                    onClick={handleUnposting}
                                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase transition flex items-center gap-1.5 cursor-pointer shadow-md"
                                >
                                    <Unlock size={15} /> UNPOSTING
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition cursor-pointer shadow-md"
                                    >
                                        SIMPAN
                                    </button>
                                    {activeCN.artcnh_no && (
                                        <button
                                            type="button"
                                            onClick={handlePosting}
                                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl uppercase transition flex items-center gap-1.5 cursor-pointer shadow-md"
                                        >
                                            <Lock size={15} /> POSTING JURNAL
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    // Modal Cetak Dokumen Credit Note
    const printDocElement = isPrintDocOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity" style={{ zIndex: 999999 }}>
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                <div className="px-6 py-3 bg-slate-800 text-white flex items-center justify-between no-print">
                    <span className="font-bold text-sm">PREVIEW CETAK KWITANSI (2 RANGKAP)</span>
                    <button type="button" onClick={() => setIsPrintDocOpen(false)} className="text-slate-300 hover:text-white cursor-pointer"><X size={18} /></button>
                </div>

                <div className="p-8 overflow-y-auto print-container bg-white">
                    <KwitansiSlip copyType="*LEMBAR ASLI, UNTUK PENERIMA" />
                    <div className="my-5 border-b-2 border-dashed border-slate-400"></div>
                    <KwitansiSlip copyType="*LEMBAR COPY, UNTUK PEMBUAT KWITANSI" />
                </div>

                <div className="px-6 py-3 bg-slate-100 border-t flex justify-end gap-2 no-print">
                    <button type="button" onClick={() => window.print()} className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md">
                        <Printer size={14} /> Cetak Kwitansi
                    </button>
                </div>
            </div>
        </div>
    ) : null;

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

            {/* Filter Panel (Kondisional Buka/Tutup) */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all no-print">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER CREDIT NOTE
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

                        {/* Cabang Filter */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG / AGEN</label>
                            <select
                                value={!isHoldingUser && currentActiveAgen.id ? currentActiveAgen.id : selectedCabang}
                                disabled={!isHoldingUser}
                                onChange={(e) => setSelectedCabang(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser
                                        ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                                        : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'
                                    }`}
                                title={!isHoldingUser ? 'Filter cabang terkunci sesuai lokasi login Anda' : 'Pilih cabang untuk monitoring'}
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

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">ALASAN</label>
                            <select
                                value={selectedAlasan}
                                onChange={(e) => setSelectedAlasan(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA ALASAN --</option>
                                <option value="PENGHAPUSAN">Penghapusan (Piutang Macet)</option>
                                <option value="KOREKSI">Koreksi (Penyesuaian Harga)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS POSTING</label>
                            <select
                                value={selectedPosting}
                                onChange={(e) => setSelectedPosting(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA STATUS --</option>
                                <option value="Y">Posted (Sudah Jurnal)</option>
                                <option value="N">Draft (Belum Jurnal)</option>
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
                            <label className="font-bold text-slate-500 block mb-1">NO. CREDIT NOTE</label>
                            <input
                                type="text"
                                placeholder="Nomor CN..."
                                value={searchNoCN}
                                onChange={(e) => setSearchNoCN(e.target.value)}
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
                            <Printer size={14} /> Cetak Laporan
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

            {/* Tabel List Credit Note */}
            <DataTableTemplate
                title="CREDIT NOTE"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                isAddDisabled={false}
                hideAddButton={false}
                onFilter={() => setShowFilter(prev => !prev)}
                onAdd={handleAddNew}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteCN}
            />

            {modalElement && ReactDOM.createPortal(modalElement, document.body)}
            {printDocElement && ReactDOM.createPortal(printDocElement, document.body)}
        </div>
    );
};

export default CreditNote;