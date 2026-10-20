import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Edit3, Trash2, Printer, X, CheckCircle2, Calendar,
    User, Search, RotateCcw, Building, FileText, Hash,
    FileCheck2, Layers, Calculator, CreditCard, Receipt,
    PlusCircle, Check, ArrowRightLeft, ShieldCheck
} from 'lucide-react';
import Swal from 'sweetalert2';

const PenerimaanPembayaran = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [agens, setAgens] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [showFilter, setShowFilter] = useState(true);

    // Filter Form State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [filterCabang, setFilterCabang] = useState('ALL');
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterNoReceipt, setFilterNoReceipt] = useState('');
    const [filterNoKwitansi, setFilterNoKwitansi] = useState('');
    const [filterPosting, setFilterPosting] = useState('ALL');
    const [isJurnalPrintModalOpen, setIsJurnalPrintModalOpen] = useState(false);

    const handleOpenCetakJurnal = () => {
        if (!editForm.nojurnal) {
            Swal.fire('Info', 'Nomor jurnal belum tersedia atau transaksi belum diposting!', 'info');
            return;
        }
        setIsJurnalPrintModalOpen(true);
    };

    // Modal Transaksi Terpadu
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        noreceipt: '',
        cabang: 'DLI PUSAT',
        posting_yn: 'N',
        nojurnal: '',
        customer: '',
        custid: '',
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: '',
        pembayaran_customer: [],
        pelunasan_faktur: [],
        kurang_lebih: []
    });

    // Sub-tab Rincian: 'terima' | 'pelunasan' | 'hub'
    const [activeTabRincian, setActiveTabRincian] = useState('terima');

    // Form Sub 1: Pembayaran Customer
    const [inputBayarTipe, setInputBayarTipe] = useState('2');
    const [inputBayarBG, setInputBayarBG] = useState('');
    const [inputBayarBank, setInputBayarBank] = useState('');
    const [inputBayarJT, setInputBayarJT] = useState(() => new Date().toISOString().split('T')[0]);
    const [inputBayarNilai, setInputBayarNilai] = useState('');

    // Form Sub 2: Pelunasan Faktur
    const [unpaidInvoices, setUnpaidInvoices] = useState([]);
    const [loadingUnpaid, setLoadingUnpaid] = useState(false);
    const [searchInvoiceQuery, setSearchInvoiceQuery] = useState('');
    const [filterDocType, setFilterDocType] = useState('ALL');

    // Form Sub 3: Kurang / Lebih Bayar
    const [inputHubJenis, setInputHubJenis] = useState('K');
    const [inputHubCAID, setInputHubCAID] = useState('');
    const [inputHubJumlah, setInputHubJumlah] = useState('');
    const [inputHubKet, setInputHubKet] = useState('');

    // Modal Preview Cetak Kwitansi
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState(null);

    const toggleFilterPanel = () => setShowFilter(prev => !prev);

    const fetchData = async (useDateFilter = true) => {
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
            if (filterCustomer.trim()) params.customer = filterCustomer.trim();
            if (filterNoReceipt.trim()) params.no_receipt = filterNoReceipt.trim();
            if (filterNoKwitansi.trim()) params.no_kwitansi = filterNoKwitansi.trim();
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
                setInputHubCAID(accList[0].ca_id);
            }
        } catch (err) {
            console.error("Gagal load options:", err);
        }
    };

    // Fungsi Reset Filter
    const handleResetFilter = () => {
        const d = new Date();
        setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
        setEndDate(new Date().toISOString().split('T')[0]);
        setFilterCabang('ALL');
        setFilterCustomer('');
        setFilterNoReceipt('');
        setFilterNoKwitansi('');
        setFilterPosting('ALL');
        fetchData(false);
    };

    useEffect(() => {
        fetchData();
        fetchOptions();
    }, []);

    // Load Daftar Tagihan Belum Lunas
    const fetchUnpaidInvoices = async (custID, searchStr = '') => {
        const cleanCust = (custID || '').trim();
        if (!cleanCust || cleanCust === '-') return;

        setLoadingUnpaid(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/piutang/penerimaan-pembayaran-kredit/unpaid-invoices', {
                params: {
                    cust_id: cleanCust,
                    q: searchStr,
                    tipe: filterDocType
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnpaidInvoices(res.data?.data || []);
        } catch (err) {
            console.error("Gagal memuat faktur belum lunas:", err);
            setUnpaidInvoices([]);
        } finally {
            setLoadingUnpaid(false);
        }
    };

    useEffect(() => {
        if (activeTabRincian === 'pelunasan' && editForm.custid) {
            fetchUnpaidInvoices(editForm.custid, searchInvoiceQuery);
        }
    }, [activeTabRincian, editForm.custid, filterDocType]);

    // Kalkulasi Total
    const totalPembayaranCustomer = (editForm.pembayaran_customer || []).reduce((acc, curr) => acc + (parseFloat(curr.trectd_nilai || curr.nilai) || 0), 0);
    const totalPelunasanFaktur = (editForm.pelunasan_faktur || []).reduce((acc, curr) => acc + (parseFloat(curr.trectdd_jumlah || curr.jumlah) || 0), 0);
    const totalLebihBayar = (editForm.kurang_lebih || []).filter(k => (k.thrd_kodelk || k.kodelk) === 'L').reduce((acc, curr) => acc + (parseFloat(curr.thrd_jumlah || curr.jumlah) || 0), 0);
    const totalKurangBayar = (editForm.kurang_lebih || []).filter(k => (k.thrd_kodelk || k.kodelk) === 'K').reduce((acc, curr) => acc + (parseFloat(curr.thrd_jumlah || curr.jumlah) || 0), 0);

    const selisihPembayaran = (totalPembayaranCustomer + totalKurangBayar) - (totalPelunasanFaktur + totalLebihBayar);

    // Buka Modal Tambah Baru
    const handleOpenCreate = () => {
        setEditForm({
            noreceipt: '(OTOMATIS SISTEM)',
            cabang: 'DLI PUSAT',
            posting_yn: 'N',
            nojurnal: '',
            customer: '',
            custid: '',
            tanggal: new Date().toISOString().split('T')[0],
            keterangan: '',
            pembayaran_customer: [],
            pelunasan_faktur: [],
            kurang_lebih: []
        });
        setActiveTabRincian('terima');
        setIsTransactionModalOpen(true);
    };

    // Buka Modal Edit
    const handleOpenEdit = async (receiptNo) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const res = await api.get('/piutang/penerimaan-pembayaran-kredit/detail', {
                params: { no_receipt: receiptNo, pt_id: ptId },
                headers: { Authorization: `Bearer ${token}` }
            });

            const det = res.data?.data || {};
            const h = det.header || {};

            setEditForm({
                noreceipt: h.trecth_no || receiptNo,
                cabang: 'DLI PUSAT',
                posting_yn: h.trecth_postingyn || 'N',
                nojurnal: h.trecth_tjurhno && h.trecth_tjurhno !== '-' ? h.trecth_tjurhno : '',
                customer: h.trecth_custname || '',
                custid: h.trecth_custid || '',
                tanggal: h.trecth_tanggal ? h.trecth_tanggal.split('T')[0] : new Date().toISOString().split('T')[0],
                keterangan: h.trecth_keterangan || '',
                pembayaran_customer: det.payments || [],
                pelunasan_faktur: det.invoices || [],
                kurang_lebih: det.kurang_lebih || []
            });

            setActiveTabRincian('pelunasan');
            setIsTransactionModalOpen(true);
        } catch (err) {
            console.error("Gagal load detail receipt:", err);
            Swal.fire('Error', 'Gagal memuat rincian transaksi', 'error');
        }
    };

    // Simpan Transaksi
    const handleSaveTransaction = async () => {
        if (!editForm.custid) {
            Swal.fire('Peringatan', 'Pilih customer terlebih dahulu!', 'warning');
            return;
        }

        let currentPayments = [...editForm.pembayaran_customer];
        if (currentPayments.length === 0 && inputBayarNilai && parseFloat(inputBayarNilai) > 0) {
            currentPayments.push({
                trectd_type: inputBayarTipe,
                trectd_nobg: inputBayarBG,
                trectd_nmbank: inputBayarBank || 'BANK',
                trectd_tanggaljt: inputBayarJT,
                trectd_nilai: parseFloat(inputBayarNilai)
            });
            setInputBayarNilai('');
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const payload = {
                pt_id: ptId,
                tanggal: editForm.tanggal,
                cabang: editForm.cabang,
                cust_id: editForm.custid,
                cust_name: editForm.customer,
                keterangan: editForm.keterangan,
                payments: currentPayments.map(p => ({
                    tipe: p.trectd_type || '2',
                    no_bg: p.trectd_nobg || '',
                    bank: p.trectd_nmbank || 'BANK',
                    tanggal_jt: p.trectd_tanggaljt || editForm.tanggal,
                    nilai: p.trectd_nilai || p.nilai
                })),
                invoices: editForm.pelunasan_faktur.map(f => ({
                    no_fpum: f.trectdd_nofpum || f.no_kwitansi,
                    jumlah: f.trectdd_jumlah || f.jumlah_tagihan
                })),
                kurang_lebih: editForm.kurang_lebih.map(k => ({
                    ca_id: k.thrd_caid || k.ca_id,
                    kodelk: k.thrd_kodelk || k.kodelk,
                    jumlah: k.thrd_jumlah || k.jumlah,
                    keterangan: k.thrd_keterangan || k.keterangan
                }))
            };

            const res = await api.post('/piutang/penerimaan-pembayaran-kredit', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newNo = res.data?.no_receipt || editForm.noreceipt;

            Swal.fire({
                title: 'Tersimpan!',
                text: `Data penerimaan ${newNo} berhasil disimpan. Lanjutkan pelunasan faktur.`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

            fetchData();
            handleOpenEdit(newNo);
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan transaksi', 'error');
        }
    };

    // Pilih Invoice Belum Lunas
    const handlePilihInvoice = (inv) => {
        const isExist = editForm.pelunasan_faktur.some(f => (f.trectdd_nofpum || f.no_kwitansi) === inv.no_kwitansi);
        if (isExist) {
            Swal.fire('Info', 'Faktur ini sudah dipilih ke dalam rincian pelunasan!', 'info');
            return;
        }

        const newFakturItem = {
            trectdd_nofpum: inv.no_kwitansi,
            trectdd_tgljt: inv.tanggalStr || inv.tanggal,
            trectdd_jumlah: inv.jumlahTagihan || inv.jumlah_tagihan
        };

        setEditForm(prev => ({
            ...prev,
            pelunasan_faktur: [...prev.pelunasan_faktur, newFakturItem]
        }));

        setUnpaidInvoices(prev => prev.filter(f => f.no_kwitansi !== inv.no_kwitansi));
    };

    // Tambah Kurang/Lebih Bayar
    const handleAddKurangLebih = (e) => {
        e.preventDefault();
        if (!inputHubJumlah || parseFloat(inputHubJumlah) <= 0) {
            Swal.fire('Peringatan', 'Nominal selisih harus lebih dari 0!', 'warning');
            return;
        }
        const accObj = accounts.find(a => a.ca_id === inputHubCAID);
        const newItem = {
            thrd_caid: inputHubCAID,
            ca_name: accObj ? accObj.ca_nama : inputHubCAID,
            thrd_kodelk: inputHubJenis,
            thrd_keterangan: inputHubKet || editForm.customer,
            thrd_jumlah: parseFloat(inputHubJumlah)
        };

        setEditForm(prev => ({
            ...prev,
            kurang_lebih: [...prev.kurang_lebih, newItem]
        }));

        setInputHubJumlah('');
        setInputHubKet('');
    };

    // Posting
    const handlePosting = async () => {
        if (Math.abs(selisihPembayaran) > 0.01) {
            Swal.fire({
                title: 'Transaksi Selisih!',
                text: `Transaksi masih memiliki selisih sebesar Rp ${Math.abs(selisihPembayaran).toLocaleString('id-ID')}. Mohon seimbangkan terlebih dahulu!`,
                icon: 'warning',
                confirmButtonColor: '#e11d48'
            });
            return;
        }

        Swal.fire({
            title: 'Posting Transaksi?',
            text: `Posting penerimaan pembayaran ${editForm.noreceipt} ke Jurnal Finansial?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#004b84',
            confirmButtonText: 'Ya, Posting!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const res = await api.post('/piutang/penerimaan-pembayaran-kredit/posting', {
                        no_receipt: editForm.noreceipt
                    }, { headers: { Authorization: `Bearer ${token}` } });

                    const noJur = res.data?.no_jurnal || '';
                    setEditForm(prev => ({
                        ...prev,
                        posting_yn: 'Y',
                        nojurnal: noJur
                    }));

                    Swal.fire('Berhasil!', `Transaksi berhasil diposting. No. Jurnal: ${noJur}`, 'success');
                    fetchData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal memposting transaksi', 'error');
                }
            }
        });
    };

    // Unposting
    const handleUnposting = async () => {
        Swal.fire({
            title: 'Batalkan Posting (Unposting)?',
            text: `Yakin ingin mengembalikan transaksi ${editForm.noreceipt} ke status Draft?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Unposting!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.post('/piutang/penerimaan-pembayaran-kredit/unposting', {
                        no_receipt: editForm.noreceipt
                    }, { headers: { Authorization: `Bearer ${token}` } });

                    setEditForm(prev => ({
                        ...prev,
                        posting_yn: 'N',
                        nojurnal: ''
                    }));

                    Swal.fire('Berhasil!', 'Status transaksi telah kembali menjadi Draft.', 'success');
                    fetchData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal unposting transaksi', 'error');
                }
            }
        });
    };

    const columns = [
        {
            header: 'NO. RECEIPT',
            accessor: 'trecth_no',
            render: (item) => (
                <button
                    type="button"
                    onClick={() => handleOpenEdit(item.trecth_no)}
                    className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-left"
                >
                    {item.trecth_no}
                </button>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'trecth_tanggal_str',
            render: (item) => <span className="font-mono text-xs">{item.trecth_tanggal_str}</span>
        },
        {
            header: 'PELANGGAN',
            accessor: 'trecth_custname',
            render: (item) => <span className="font-bold text-xs uppercase">{item.trecth_custname}</span>
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
            render: (item) => <span className="text-slate-600 dark:text-gray-300 text-xs">{item.trecth_keterangan || '-'}</span>
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
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => handleOpenEdit(item.trecth_no)}
                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition cursor-pointer"
                title="Buka / Edit Transaksi"
            >
                <Edit3 size={15} />
            </button>
            <button
                type="button"
                onClick={() => {
                    setSelectedDetail({
                        header: item,
                        payments: [],
                        invoices: []
                    });
                    setIsPrintModalOpen(true);
                }}
                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition cursor-pointer"
                title="Cetak Kwitansi"
            >
                <Printer size={15} />
            </button>
        </div>
    );

    return (
        <div className="space-y-4 font-sans">
            {/* Filter Panel */}
            {showFilter && (
                <div className={`p-6 rounded-3xl border shadow-sm transition-all mb-5 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-4 text-xs font-semibold">
                        <div className="md:col-span-3">
                            <label className="mb-1.5 flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider text-slate-500">
                                <Calendar size={13} className="text-blue-500" /> DARI TANGGAL
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-10 px-3.5 border rounded-xl font-bold font-mono outline-none bg-slate-50 border-slate-200 text-slate-800"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="mb-1.5 flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider text-slate-500">
                                <Calendar size={13} className="text-blue-500" /> SAMPAI TANGGAL
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full h-10 px-3.5 border rounded-xl font-bold font-mono outline-none bg-slate-50 border-slate-200 text-slate-800"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="mb-1.5 flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider text-slate-500">
                                <Building size={13} className="text-blue-500" /> CABANG / AGEN
                            </label>
                            <select
                                value={filterCabang}
                                onChange={(e) => setFilterCabang(e.target.value)}
                                className="w-full h-10 px-3 border rounded-xl font-bold outline-none bg-slate-50 border-slate-200 text-slate-800 cursor-pointer"
                            >
                                <option value="ALL">-- SEMUA CABANG --</option>
                                <option value="DLI PUSAT">DLI PUSAT</option>
                                {agens.map((a) => (
                                    <option key={a.agen_id} value={a.agen_nama}>{a.agen_nama}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <label className="mb-1.5 flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider text-slate-500">
                                <FileCheck2 size={13} className="text-blue-500" /> STATUS POSTING
                            </label>
                            <select
                                value={filterPosting}
                                onChange={(e) => setFilterPosting(e.target.value)}
                                className="w-full h-10 px-3 border rounded-xl font-bold outline-none bg-slate-50 border-slate-200 text-slate-800 cursor-pointer"
                            >
                                <option value="ALL">-- SEMUA STATUS --</option>
                                <option value="Y">POSTED (SUDAH POSTING)</option>
                                <option value="N">DRAFT (BELUM POSTING)</option>
                            </select>
                        </div>

                        <div className="md:col-span-4">
                            <label className="mb-1.5 flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider text-slate-500">
                                <Hash size={13} className="text-blue-500" /> NO. RECEIPT
                            </label>
                            <input
                                type="text"
                                placeholder="Contoh: 001/REC/..."
                                value={filterNoReceipt}
                                onChange={(e) => setFilterNoReceipt(e.target.value)}
                                className="w-full h-10 px-3.5 border rounded-xl font-bold font-mono outline-none uppercase bg-slate-50 border-slate-200 text-slate-800"
                            />
                        </div>
                        <div className="md:col-span-4">
                            <label className="mb-1.5 flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider text-slate-500">
                                <FileText size={13} className="text-blue-500" /> NO. KWITANSI / INVOICE
                            </label>
                            <input
                                type="text"
                                placeholder="Contoh: 001/INV/..."
                                value={filterNoKwitansi}
                                onChange={(e) => setFilterNoKwitansi(e.target.value)}
                                className="w-full h-10 px-3.5 border rounded-xl font-bold font-mono outline-none uppercase bg-slate-50 border-slate-200 text-slate-800"
                            />
                        </div>
                        <div className="md:col-span-4">
                            <label className="mb-1.5 flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider text-slate-500">
                                <User size={13} className="text-blue-500" /> CUSTOMER / PELANGGAN
                            </label>
                            <input
                                type="text"
                                list="customer-list-all"
                                placeholder="Pilih nama pelanggan..."
                                value={filterCustomer}
                                onChange={(e) => setFilterCustomer(e.target.value)}
                                className="w-full h-10 px-3.5 border rounded-xl font-bold outline-none uppercase bg-slate-50 border-slate-200 text-slate-800"
                            />
                            <datalist id="customer-list-all">
                                {customers.map((c) => (
                                    <option key={c.cust_id} value={c.cust_name} />
                                ))}
                            </datalist>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="h-10 px-5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-2 transition shadow-sm cursor-pointer uppercase tracking-wider"
                            >
                                <Printer size={15} /> CETAK TIPE 1
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="h-10 px-5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-2 transition shadow-sm cursor-pointer uppercase tracking-wider"
                            >
                                <Layers size={15} /> CETAK TIPE 2
                            </button>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={handleResetFilter}
                                className="h-10 px-4 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                                <RotateCcw size={14} /> Reset Filter
                            </button>
                            <button
                                type="button"
                                onClick={() => fetchData(true)}
                                disabled={loading}
                                className="h-10 px-6 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                            >
                                <Search size={15} /> {loading ? 'MEMUAT...' : 'CARI DATA'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Template */}
            <DataTableTemplate
                title="PENERIMAAN PEMBAYARAN KREDIT"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleOpenCreate}
                addButtonText="Tambah PENERIMAAN PEMBAYARAN KREDIT"
                onFilter={toggleFilterPanel}
                renderExtraActions={renderCustomActions}
            />

            {/* Modal Form Transaksi Terpadu */}
            {isTransactionModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 max-h-[94vh]">
                        {/* Header Modal */}
                        <div className="px-8 py-4 bg-[#004b84] text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-xl">
                                    <Receipt size={20} className="text-emerald-300" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-wider">
                                        Data Penerimaan Pembayaran Kredit
                                    </h2>
                                    <p className="text-[11px] text-sky-100 font-mono">
                                        No. Receipt: <b className="text-white">{editForm.noreceipt}</b> • Cabang: {editForm.cabang}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTransactionModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer font-bold"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-4 text-xs font-semibold text-slate-700 flex-1">
                            {/* 1. Header Penerimaan */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                    <span className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 text-xs">
                                        <FileText size={15} className="text-[#004b84]" /> Informasi Dokumen Penerimaan
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${editForm.posting_yn === 'Y' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {editForm.posting_yn === 'Y' ? 'Status: POSTED' : 'Status: DRAFT'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">NO. RECEIPT :</label>
                                        <input
                                            type="text"
                                            value={editForm.noreceipt}
                                            readOnly
                                            className="w-full h-9 px-3 bg-slate-200/70 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">CABANG / AGEN :</label>
                                        <select
                                            value={editForm.cabang}
                                            onChange={(e) => setEditForm({ ...editForm, cabang: e.target.value })}
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-bold text-xs uppercase outline-none focus:border-blue-500 cursor-pointer"
                                        >
                                            <option value="DLI PUSAT">DLI PUSAT</option>
                                            {agens.map((a) => (
                                                <option key={a.agen_id} value={a.agen_nama}>{a.agen_nama}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* POSTING RADIO (INTERAKTIF YA / TIDAK) */}
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">POSTING :</label>
                                        <div className="h-9 px-3 bg-white border border-slate-300 rounded-xl flex items-center justify-around font-bold text-xs">
                                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="vpostingyn"
                                                    value="Y"
                                                    checked={editForm.posting_yn === 'Y'}
                                                    onChange={() => setEditForm({ ...editForm, posting_yn: 'Y' })}
                                                    className="text-blue-600 cursor-pointer"
                                                />
                                                <span className={editForm.posting_yn === 'Y' ? 'text-blue-600 font-black' : 'text-slate-600'}>Ya</span>
                                            </label>
                                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="vpostingyn"
                                                    value="N"
                                                    checked={editForm.posting_yn === 'N' || !editForm.posting_yn}
                                                    onChange={() => setEditForm({ ...editForm, posting_yn: 'N' })}
                                                    className="text-amber-600 cursor-pointer"
                                                />
                                                <span className={editForm.posting_yn === 'N' || !editForm.posting_yn ? 'text-amber-600 font-black' : 'text-slate-600'}>Tidak</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">NO. JURNAL :</label>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="text"
                                                value={editForm.nojurnal || '-'}
                                                readOnly
                                                className={`w-full h-9 px-3 border rounded-xl font-mono font-bold outline-none ${editForm.nojurnal
                                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                                    : 'bg-slate-100 border-slate-300 text-slate-500'
                                                    }`}
                                            />
                                            {editForm.nojurnal && (
                                                <button
                                                    type="button"
                                                    onClick={handleOpenCetakJurnal}
                                                    className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                                                    title="Cetak Bukti Jurnal Memorial"
                                                >
                                                    <Printer size={13} /> CETAK
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">CUSTOMER :</label>
                                        <select
                                            value={editForm.custid}
                                            onChange={(e) => {
                                                const cId = e.target.value;
                                                const cObj = customers.find(c => String(c.cust_id) === String(cId));
                                                setEditForm({
                                                    ...editForm,
                                                    custid: cId,
                                                    customer: cObj ? cObj.cust_name : ''
                                                });
                                                if (cId) fetchUnpaidInvoices(cId);
                                            }}
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-bold text-xs uppercase outline-none focus:border-blue-500 cursor-pointer"
                                        >
                                            <option value="">-- PILIH CUSTOMER --</option>
                                            {customers.map((c) => (
                                                <option key={c.cust_id} value={c.cust_id}>
                                                    {c.cust_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">CUST ID :</label>
                                        <input
                                            type="text"
                                            value={editForm.custid || '-'}
                                            readOnly
                                            className="w-full h-9 px-3 bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">TANGGAL :</label>
                                        <input
                                            type="date"
                                            value={editForm.tanggal}
                                            onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })}
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">KETERANGAN :</label>
                                        <input
                                            type="text"
                                            value={editForm.keterangan}
                                            onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })}
                                            placeholder="Catatan pelunasan..."
                                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Kalkulasi Pembayaran & Selisih */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-2">
                                <span className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 text-xs">
                                    <Calculator size={15} className="text-[#004b84]" /> KALKULASI PEMBAYARAN
                                </span>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1">
                                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">LEBIH BAYAR</span>
                                        <span className="font-mono font-black text-sky-700 text-sm">
                                            {totalLebihBayar.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">KURANG BAYAR</span>
                                        <span className="font-mono font-black text-amber-600 text-sm">
                                            {totalKurangBayar.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">TOTAL TAGIHAN TERBAYAR</span>
                                        <span className="font-mono font-black text-slate-800 text-sm">
                                            {totalPelunasanFaktur.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">TOTAL PEMBAYARAN</span>
                                        <span className="font-mono font-black text-emerald-700 text-sm">
                                            {totalPembayaranCustomer.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className={`p-3 rounded-xl border ${Math.abs(selisihPembayaran) <= 0.01
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                        : 'bg-rose-50 border-rose-300 text-rose-900'
                                        }`}>
                                        <span className="text-[10px] uppercase font-black block">SELISIH :</span>
                                        <span className="font-mono font-black text-base">
                                            {selisihPembayaran.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Tambah Rincian Pembayaran */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                    <span className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 text-xs">
                                        <PlusCircle size={15} className="text-[#004b84]" /> TAMBAH RINCIAN PEMBAYARAN
                                    </span>

                                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTabRincian('terima')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeTabRincian === 'terima'
                                                ? 'bg-white text-blue-600 shadow-xs font-black'
                                                : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            <CreditCard size={13} /> Pembayaran Customer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTabRincian('pelunasan')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeTabRincian === 'pelunasan'
                                                ? 'bg-white text-blue-600 shadow-xs font-black'
                                                : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            <Receipt size={13} /> Pelunasan Faktur
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTabRincian('hub')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${activeTabRincian === 'hub'
                                                ? 'bg-white text-blue-600 shadow-xs font-black'
                                                : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            <ArrowRightLeft size={13} /> Kurang / Lebih Bayar
                                        </button>
                                    </div>
                                </div>

                                {activeTabRincian === 'terima' && (
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">TIPE :</label>
                                            <select
                                                value={inputBayarTipe}
                                                onChange={(e) => setInputBayarTipe(e.target.value)}
                                                className="w-full h-9 px-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs outline-none"
                                            >
                                                <option value="0">Cash / Tunai</option>
                                                <option value="1">Giro / Cek</option>
                                                <option value="2">Transfer Bank</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">NO. BG / CEK / REFF :</label>
                                            <input
                                                type="text"
                                                disabled={inputBayarTipe === '0'}
                                                placeholder={inputBayarTipe === '0' ? '(Tidak Perlu BG)' : 'Ketik No BG...'}
                                                value={inputBayarBG}
                                                onChange={(e) => setInputBayarBG(e.target.value)}
                                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono outline-none disabled:bg-slate-100 uppercase"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">NAMA BANK :</label>
                                            <input
                                                type="text"
                                                disabled={inputBayarTipe === '0'}
                                                placeholder="BCA / Mandiri / BRI..."
                                                value={inputBayarBank}
                                                onChange={(e) => setInputBayarBank(e.target.value)}
                                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs outline-none disabled:bg-slate-100 uppercase"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">JATUH TEMPO :</label>
                                            <input
                                                type="date"
                                                value={inputBayarJT}
                                                onChange={(e) => setInputBayarJT(e.target.value)}
                                                className="w-full h-9 px-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none"
                                            />
                                        </div>
                                        <div className="md:col-span-2 flex gap-2">
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">NILAI (RP) :</label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={inputBayarNilai}
                                                    onChange={(e) => setInputBayarNilai(e.target.value)}
                                                    className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-emerald-700 outline-none text-right"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!inputBayarNilai || parseFloat(inputBayarNilai) <= 0) {
                                                        Swal.fire('Peringatan', 'Isi nominal pembayaran customer!', 'warning');
                                                        return;
                                                    }
                                                    setEditForm(prev => ({
                                                        ...prev,
                                                        pembayaran_customer: [
                                                            ...prev.pembayaran_customer,
                                                            {
                                                                trectd_type: inputBayarTipe,
                                                                trectd_nobg: inputBayarBG,
                                                                trectd_nmbank: inputBayarBank || 'BANK',
                                                                trectd_tanggaljt: inputBayarJT,
                                                                trectd_nilai: parseFloat(inputBayarNilai)
                                                            }
                                                        ]
                                                    }));
                                                    setInputBayarNilai('');
                                                }}
                                                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase cursor-pointer"
                                            >
                                                TAMBAH
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTabRincian === 'pelunasan' && (
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                <span>Tipe:</span>
                                                {['ALL', 'INVOICE', 'ORDER JEMPUT', 'PACKING', 'ASURANSI'].map((t) => (
                                                    <label key={t} className="inline-flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="filterDocType"
                                                            checked={filterDocType === t}
                                                            onChange={() => setFilterDocType(t)}
                                                        />
                                                        <span className="text-[11px] uppercase">{t}</span>
                                                    </label>
                                                ))}
                                            </div>

                                            <div className="relative w-64">
                                                <input
                                                    type="text"
                                                    placeholder="Cari No. Dokumen / Kwitansi..."
                                                    value={searchInvoiceQuery}
                                                    onChange={(e) => {
                                                        setSearchInvoiceQuery(e.target.value);
                                                        fetchUnpaidInvoices(editForm.custid, e.target.value);
                                                    }}
                                                    className="w-full h-8 pl-8 pr-3 bg-white border border-slate-300 rounded-lg text-xs font-mono outline-none"
                                                />
                                                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="bg-[#004b84] text-white font-bold uppercase text-[10px]">
                                                    <tr>
                                                        <th className="p-2 w-10 text-center">NO</th>
                                                        <th className="p-2 w-24">TIPE</th>
                                                        <th className="p-2">NO. KWITANSI</th>
                                                        <th className="p-2">NO. INVOICE</th>
                                                        <th className="p-2">TANGGAL</th>
                                                        <th className="p-2 text-right">JUMLAH TAGIHAN</th>
                                                        <th className="p-2 text-center w-20">AKSI</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 font-medium">
                                                    {loadingUnpaid ? (
                                                        <tr>
                                                            <td colSpan={7} className="p-6 text-center text-slate-400">
                                                                Memuat daftar tagihan belum lunas...
                                                            </td>
                                                        </tr>
                                                    ) : unpaidInvoices.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                                                                Tidak ada faktur atau tagihan yang belum lunas untuk customer ini.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        unpaidInvoices.map((inv, idx) => (
                                                            <tr key={idx} className="hover:bg-sky-50/50">
                                                                <td className="p-2 text-center font-mono">{idx + 1}</td>
                                                                <td className="p-2 font-bold">{inv.tipe}</td>
                                                                <td className="p-2 font-mono font-bold text-sky-800">{inv.no_kwitansi}</td>
                                                                <td className="p-2 font-mono">{inv.no_invoice}</td>
                                                                <td className="p-2 font-mono">{inv.tanggalStr}</td>
                                                                <td className="p-2 text-right font-mono font-bold">
                                                                    Rp {Number(inv.jumlahTagihan || inv.jumlah_tagihan || 0).toLocaleString('id-ID')}
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handlePilihInvoice(inv)}
                                                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg text-xs uppercase cursor-pointer shadow-xs"
                                                                    >
                                                                        PILIH
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTabRincian === 'hub' && (
                                    <form onSubmit={handleAddKurangLebih} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">JENIS :</label>
                                            <select
                                                value={inputHubJenis}
                                                onChange={(e) => setInputHubJenis(e.target.value)}
                                                className="w-full h-9 px-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs outline-none cursor-pointer"
                                            >
                                                <option value="K">KURANG BAYAR</option>
                                                <option value="L">LEBIH BAYAR</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">NAMA AKUN / KODE BIAYA :</label>
                                            <select
                                                value={inputHubCAID}
                                                onChange={(e) => setInputHubCAID(e.target.value)}
                                                className="w-full h-9 px-2 bg-white border border-slate-300 rounded-xl font-bold text-xs outline-none cursor-pointer"
                                            >
                                                {accounts.map((a) => (
                                                    <option key={a.ca_id} value={a.ca_id}>{a.ca_id} - {a.ca_nama}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">KETERANGAN :</label>
                                            <input
                                                type="text"
                                                placeholder="Contoh: Potongan Bank / Admin..."
                                                value={inputHubKet}
                                                onChange={(e) => setInputHubKet(e.target.value)}
                                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">JUMLAH (RP) :</label>
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="0"
                                                value={inputHubJumlah}
                                                onChange={(e) => setInputHubJumlah(e.target.value)}
                                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 outline-none text-right"
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <button
                                                type="submit"
                                                className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs uppercase cursor-pointer"
                                            >
                                                SIMPAN
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* 4. Tabel Pelunasan Faktur Terpilih */}
                            {editForm.pelunasan_faktur.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-black text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                                            <Receipt size={14} className="text-blue-600" /> Pelunasan Faktur Terpilih
                                        </span>
                                        <span className="font-mono font-bold text-blue-700 text-xs">
                                            Total: Rp {totalPelunasanFaktur.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-[#004b84] text-white font-bold uppercase text-[10px]">
                                                <tr>
                                                    <th className="p-2 w-10 text-center">NO</th>
                                                    <th className="p-2">NO. FAKTUR / KWITANSI</th>
                                                    <th className="p-2">TANGGAL JT</th>
                                                    <th className="p-2 text-right">TAGIHAN TERBAYAR</th>
                                                    <th className="p-2 text-center w-16">HAPUS</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 font-medium">
                                                {editForm.pelunasan_faktur.map((inv, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="p-2 text-center font-mono">{idx + 1}</td>
                                                        <td className="p-2 font-mono font-bold text-blue-700">{inv.trectdd_nofpum}</td>
                                                        <td className="p-2 font-mono">{inv.trectdd_tgljt || '-'}</td>
                                                        <td className="p-2 text-right font-mono font-bold">
                                                            Rp {Number(inv.trectdd_jumlah || 0).toLocaleString('id-ID')}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditForm(prev => ({
                                                                    ...prev,
                                                                    pelunasan_faktur: prev.pelunasan_faktur.filter((_, i) => i !== idx)
                                                                }))}
                                                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* 5. Tabel Kurang / Lebih Bayar Terpilih */}
                            {editForm.kurang_lebih.length > 0 && (
                                <div className="space-y-2">
                                    <span className="font-black text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                                        <ArrowRightLeft size={14} className="text-amber-600" /> Kurang / Lebih Bayar
                                    </span>
                                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-[#004b84] text-white font-bold uppercase text-[10px]">
                                                <tr>
                                                    <th className="p-2 w-10 text-center">NO</th>
                                                    <th className="p-2">JENIS</th>
                                                    <th className="p-2">KODE AKUN</th>
                                                    <th className="p-2">KETERANGAN</th>
                                                    <th className="p-2 text-right">JUMLAH</th>
                                                    <th className="p-2 text-center w-16">HAPUS</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 font-medium">
                                                {editForm.kurang_lebih.map((hub, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="p-2 text-center font-mono">{idx + 1}</td>
                                                        <td className="p-2 font-bold uppercase">
                                                            {(hub.thrd_kodelk || hub.kodelk) === 'L' ? (
                                                                <span className="text-sky-700">LEBIH BAYAR</span>
                                                            ) : (
                                                                <span className="text-amber-600">KURANG BAYAR</span>
                                                            )}
                                                        </td>
                                                        <td className="p-2 font-mono">{hub.thrd_caid || hub.caid} {hub.ca_name ? `(${hub.ca_name})` : ''}</td>
                                                        <td className="p-2">{hub.thrd_keterangan || hub.keterangan || '-'}</td>
                                                        <td className="p-2 text-right font-mono font-bold">
                                                            Rp {Number(hub.thrd_jumlah || hub.jumlah || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditForm(prev => ({
                                                                    ...prev,
                                                                    kurang_lebih: prev.kurang_lebih.filter((_, i) => i !== idx)
                                                                }))}
                                                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Aksi */}
                        <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2">
                                {editForm.posting_yn !== 'Y' && (
                                    <button
                                        type="button"
                                        onClick={handleSaveTransaction}
                                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black rounded-xl text-xs uppercase flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                                    >
                                        <Check size={15} /> SIMPAN
                                    </button>
                                )}

                                {editForm.posting_yn !== 'Y' ? (
                                    <button
                                        type="button"
                                        onClick={handlePosting}
                                        className="px-5 py-2.5 bg-[#004b84] hover:bg-sky-900 active:scale-95 text-white font-black rounded-xl text-xs uppercase flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                                    >
                                        <ShieldCheck size={15} /> POSTING
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleUnposting}
                                        className="px-5 py-2.5 bg-slate-800 hover:bg-black active:scale-95 text-white font-black rounded-xl text-xs uppercase flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                                    >
                                        <RotateCcw size={15} /> UNPOSTING
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedDetail({
                                            header: {
                                                trecth_no: editForm.noreceipt,
                                                trecth_tanggal: editForm.tanggal,
                                                trecth_custname: editForm.customer,
                                                trecth_postingyn: editForm.posting_yn,
                                                trecth_total: totalPembayaranCustomer
                                            },
                                            payments: editForm.pembayaran_customer,
                                            invoices: editForm.pelunasan_faktur
                                        });
                                        setIsPrintModalOpen(true);
                                    }}
                                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                                >
                                    <Printer size={15} /> CETAK
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsTransactionModalOpen(false)}
                                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black rounded-xl text-xs uppercase transition shadow-sm cursor-pointer"
                            >
                                KELUAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 🌟 MODAL CETAK BUKTI JURNAL MEMORIAL (TRANSAKSI POSTING)                 */}
            {/* ========================================================================= */}
            {isJurnalPrintModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[85] p-4 animate-in fade-in duration-150">
                    <div className="w-full max-w-3xl p-6 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] bg-white text-black border border-slate-300">
                        {/* Header Modal */}
                        <div className="flex justify-between items-center pb-3 border-b border-slate-300 mb-4 print:hidden">
                            <div className="flex items-center gap-2">
                                <FileText size={18} className="text-emerald-600" />
                                <h3 className="text-sm font-black uppercase text-black tracking-wide">
                                    BUKTI JURNAL TRANSAKSI (MEMORIAL)
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-1.5 bg-[#004b84] hover:bg-sky-900 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer uppercase"
                                >
                                    <Printer size={15} /> Cetak Sekarang
                                </button>
                                <button
                                    onClick={() => setIsJurnalPrintModalOpen(false)}
                                    className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-black"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Area Kertas Cetak Voucher Jurnal */}
                        <div className="space-y-4 overflow-y-auto text-xs p-3 text-black">
                            {/* Header Perusahaan & Judul */}
                            <div className="border-b-2 border-slate-900 pb-3 space-y-1">
                                <div className="text-xs font-black uppercase text-slate-900 tracking-wider">
                                    PT DAKOTA LOGISTIK INDONESIA
                                </div>
                                <div className="text-base font-black text-center uppercase tracking-widest py-1 text-black font-mono">
                                    BUKTI MEMORIAL / JURNAL PENERIMAAN
                                </div>
                                <div className="grid grid-cols-2 pt-2 font-mono gap-y-1.5 text-black">
                                    <div>
                                        <strong>NO. JURNAL : </strong>
                                        <span className="font-bold ml-1 text-blue-800">{editForm.nojurnal}</span>
                                    </div>
                                    <div>
                                        <strong>TANGGAL : </strong>
                                        <span className="font-bold ml-1">{editForm.tanggal}</span>
                                    </div>
                                    <div>
                                        <strong>NO. RECEIPT : </strong>
                                        <span className="font-bold ml-1">{editForm.noreceipt}</span>
                                    </div>
                                    <div>
                                        <strong>CABANG / AGEN : </strong>
                                        <span className="font-bold ml-1">{editForm.cabang}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <strong>CUSTOMER : </strong>
                                        <span className="font-bold ml-1 uppercase">{editForm.customer} [{editForm.custid}]</span>
                                    </div>
                                    <div className="col-span-2">
                                        <strong>KETERANGAN : </strong>
                                        <span className="ml-1">{editForm.keterangan || 'Penerimaan Pembayaran Piutang Dagang'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tabel Jurnal Debet / Kredit */}
                            <div className="space-y-2">
                                <div className="font-black uppercase tracking-wider text-[11px] text-black">
                                    RINCIAN AKUN (DEBET / KREDIT) :
                                </div>
                                <div className="rounded-xl border border-slate-300 overflow-hidden">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-100 text-black border-b border-slate-300 font-black text-[11px] uppercase">
                                                <th className="p-2.5">Kode Akun</th>
                                                <th className="p-2.5">Keterangan Akun</th>
                                                <th className="p-2.5 text-right">Debet (Rp)</th>
                                                <th className="p-2.5 text-right">Kredit (Rp)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white font-mono text-black font-semibold">
                                            {/* Baris Kas/Bank (Debet) */}
                                            <tr>
                                                <td className="p-2.5 font-bold">11110</td>
                                                <td className="p-2.5 font-sans">KAS / BANK PENERIMAAN</td>
                                                <td className="p-2.5 text-right font-bold text-emerald-700">
                                                    {totalPembayaranCustomer.toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-2.5 text-right">0</td>
                                            </tr>

                                            {/* Baris Kurang Bayar jika ada (Debet) */}
                                            {totalKurangBayar > 0 && (
                                                <tr>
                                                    <td className="p-2.5 font-bold">
                                                        {editForm.kurang_lebih.find(k => (k.thrd_kodelk || k.kodelk) === 'K')?.thrd_caid || '51999'}
                                                    </td>
                                                    <td className="p-2.5 font-sans">BIAYA KURANG BAYAR / PEMBULATAN</td>
                                                    <td className="p-2.5 text-right font-bold text-amber-700">
                                                        {totalKurangBayar.toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="p-2.5 text-right">0</td>
                                                </tr>
                                            )}

                                            {/* Baris Piutang Dagang (Kredit) */}
                                            <tr>
                                                <td className="p-2.5 font-bold">11210</td>
                                                <td className="p-2.5 font-sans">PIUTANG DAGANG CUSTOMER</td>
                                                <td className="p-2.5 text-right">0</td>
                                                <td className="p-2.5 text-right font-bold text-blue-700">
                                                    {totalPelunasanFaktur.toLocaleString('id-ID')}
                                                </td>
                                            </tr>

                                            {/* Baris Lebih Bayar jika ada (Kredit) */}
                                            {totalLebihBayar > 0 && (
                                                <tr>
                                                    <td className="p-2.5 font-bold">
                                                        {editForm.kurang_lebih.find(k => (k.thrd_kodelk || k.kodelk) === 'L')?.thrd_caid || '21999'}
                                                    </td>
                                                    <td className="p-2.5 font-sans">PENDAPATAN LEBIH BAYAR</td>
                                                    <td className="p-2.5 text-right">0</td>
                                                    <td className="p-2.5 text-right font-bold text-sky-700">
                                                        {totalLebihBayar.toLocaleString('id-ID')}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-100 font-black border-t-2 border-slate-900 text-black">
                                                <td colSpan={2} className="p-2.5 text-right uppercase">TOTAL BALANCE :</td>
                                                <td className="p-2.5 text-right font-mono text-sm font-black text-emerald-800">
                                                    Rp {(totalPembayaranCustomer + totalKurangBayar).toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-2.5 text-right font-mono text-sm font-black text-blue-800">
                                                    Rp {(totalPelunasanFaktur + totalLebihBayar).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Kolom Tanda Tangan Dokumen Akuntansi */}
                            <div className="pt-8 grid grid-cols-4 text-center text-xs text-black">
                                <div>
                                    <p className="font-bold mb-16">Dibuat Oleh</p>
                                    <p className="font-medium underline">( Kasir / Keuangan )</p>
                                </div>
                                <div>
                                    <p className="font-bold mb-16">Diperiksa Oleh</p>
                                    <p className="font-medium underline">( Supervisor )</p>
                                </div>
                                <div>
                                    <p className="font-bold mb-16">Disetujui Oleh</p>
                                    <p className="font-medium underline">( Ka. Cabang )</p>
                                </div>
                                <div>
                                    <p className="font-bold mb-16">Pembukuan</p>
                                    <p className="font-medium underline">( Accounting )</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PenerimaanPembayaran;