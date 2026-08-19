import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, Printer, X, CheckCircle2, ArrowLeft, Search, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

// 🌟 FUNGSI KONVERSI ANGKA KE TERBILANG BAHASA INDONESIA
const angkaTerbilang = (nilai) => {
    const angka = Math.floor(Math.abs(Number(nilai)));
    if (isNaN(angka) || angka === 0) return '';

    const huruf = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

    const bagi = (n) => {
        if (n < 12) return huruf[n];
        if (n < 20) return bagi(n - 10) + ' Belas';
        if (n < 100) return bagi(Math.floor(n / 10)) + ' Puluh ' + bagi(n % 10);
        if (n < 200) return 'Seratus ' + bagi(n - 100);
        if (n < 1000) return bagi(Math.floor(n / 100)) + ' Ratus ' + bagi(n % 100);
        if (n < 2000) return 'Seribu ' + bagi(n - 1000);
        if (n < 1000000) return bagi(Math.floor(n / 1000)) + ' Ribu ' + bagi(n % 1000);
        if (n < 1000000000) return bagi(Math.floor(n / 1000000)) + ' Juta ' + bagi(n % 1000000);
        if (n < 1000000000000) return bagi(Math.floor(n / 1000000000)) + ' Milyar ' + bagi(n % 1000000000);
        return bagi(Math.floor(n / 1000000000000)) + ' Triliun ' + bagi(n % 1000000000000);
    };

    return bagi(angka).replace(/\s+/g, ' ').trim() + ' Rupiah';
};

const KasMasukKeluar = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [cabangList, setCabangList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [selectedCabang, setSelectedCabang] = useState('');
    const [selectedTipe, setSelectedTipe] = useState('');
    const [searchNoTrans, setSearchNoTrans] = useState('');
    const [searchNoJurnal, setSearchNoJurnal] = useState('');
    const [selectedAktif, setSelectedAktif] = useState('');
    const [selectedPosting, setSelectedPosting] = useState('');
    const [isFilterActive, setIsFilterActive] = useState(false);

    // Modal Form State (Wizard)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [step, setStep] = useState(1); // 1 = Kategori, 2 = Header, 3 = Detail Rincian
    const [kategoriTrans, setKategoriTrans] = useState('');

    const [formData, setFormData] = useState({
        cb_id: '',
        cb_nourut: '0001',
        cb_tanggal: today,
        cb_tipe: 'K',
        cb_transagenid: '',
        cb_pembuat: localStorage.getItem('username') || 'staff',
        cb_ket: '',
        cb_notrans_um_sebelumnya: '',
        cb_postyn: 'N',
        cb_nojurnal: '-'
    });

    // Detail Items State
    const [rincianList, setRincianList] = useState([]);
    const [showTambahRincian, setShowTambahRincian] = useState(false);
    const [detailForm, setDetailForm] = useState({
        nama_biaya: '',
        item_id: '',
        keterangan: '',
        quantity: 1,
        harga_satuan: 0
    });

    // Autocomplete State
    const [itemList, setItemList] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Posting Modal
    const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);
    const [selectedItemForPosting, setSelectedItemForPosting] = useState(null);
    const [sumberDana, setSumberDana] = useState('KAS OPS DK');

    const fetchCabangList = async () => {
        try {
            const token = localStorage.getItem('token');
            let res = await api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } });
            let list = res.data?.data || [];
            if (list.length === 0) {
                res = await api.get('/agens?limit=1000', { headers: { Authorization: `Bearer ${token}` } });
                list = res.data?.data || res.data || [];
            }
            setCabangList(list);
        } catch (err) {
            console.error("Gagal load cabang:", err);
        }
    };

    const fetchCashBankData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let queryParams = `/gl/cashbank?limit=500`;

            if (isFilterActive) {
                if (startDate && endDate) queryParams += `&start_date=${startDate}&end_date=${endDate}`;
                if (selectedCabang) queryParams += `&cabang_nama=${selectedCabang}`;
                if (selectedTipe) queryParams += `&tipe=${selectedTipe}`;
                if (searchNoTrans) queryParams += `&no_trans=${searchNoTrans}`;
                if (searchNoJurnal) queryParams += `&no_jurnal=${searchNoJurnal}`;
                if (selectedAktif) queryParams += `&aktif_yn=${selectedAktif}`;
                if (selectedPosting) queryParams += `&posting_yn=${selectedPosting}`;
            }

            const res = await api.get(queryParams, { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data Kas/Bank:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCabangList();
    }, []);

    useEffect(() => {
        fetchCashBankData();
    }, [isFilterActive]);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        setIsFilterActive(true);
        fetchCashBankData();
    };

    const handleResetFilter = () => {
        setStartDate(firstDay);
        setEndDate(today);
        setSelectedCabang('');
        setSelectedTipe('');
        setSearchNoTrans('');
        setSearchNoJurnal('');
        setSelectedAktif('');
        setSelectedPosting('');
        setIsFilterActive(false);
    };

    // 🔍 Fungsi Search Autocomplete Master Biaya
    const handleSearchBiaya = async (q) => {
        setDetailForm((prev) => ({ ...prev, nama_biaya: q }));
        if (q.trim().length === 0) {
            setItemList([]);
            setShowDropdown(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/gl/cashbank/items?q=${encodeURIComponent(q)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dataItems = res.data?.data || [];
            setItemList(dataItems);
            setShowDropdown(dataItems.length > 0);
        } catch (err) {
            console.error("Gagal load item biaya:", err);
            setShowDropdown(false);
        }
    };

    // 🎯 Saat Item Biaya Dipilih dari Dropdown
    const handleSelectItem = (item) => {
        setDetailForm({
            nama_biaya: item.item_name,
            item_id: item.item_id,
            keterangan: item.item_name,
            quantity: 1,
            harga_satuan: 0
        });
        setShowDropdown(false);
    };

    // Tambah Rincian ke List Sementara
    const handleAddRincian = () => {
        if (!detailForm.item_id || !detailForm.nama_biaya) {
            Swal.fire({ title: 'Peringatan', text: 'Pilih nama biaya terlebih dahulu!', icon: 'warning' });
            return;
        }
        if (Number(detailForm.harga_satuan) <= 0) {
            Swal.fire({ title: 'Peringatan', text: 'Harga satuan harus lebih dari 0!', icon: 'warning' });
            return;
        }

        const subtotal = Number(detailForm.quantity) * Number(detailForm.harga_satuan);
        const newItem = {
            ...detailForm,
            subtotal
        };

        setRincianList([...rincianList, newItem]);
        // Reset Form Rincian
        setDetailForm({
            nama_biaya: '',
            item_id: '',
            keterangan: '',
            quantity: 1,
            harga_satuan: 0
        });
        setShowTambahRincian(false);
    };

    const handleDeleteRincian = (index) => {
        setRincianList(rincianList.filter((_, idx) => idx !== index));
    };

    // 🌟 STEP 1 -> STEP 2 (PILIH KATEGORI)
    const handleSelectKategori = (kategori) => {
        setKategoriTrans(kategori);
        setStep(2);

        let defaultKet = '';
        let defaultTipe = 'K';

        if (kategori === 'UM') {
            defaultKet = 'UANG MUKA';
        } else if (kategori === 'PUM') {
            defaultKet = 'PENYELESAIAN UM';
        } else if (kategori === 'MEMORIAL') {
            defaultTipe = 'T';
        }

        setFormData({
            cb_id: '',
            cb_nourut: '0001',
            cb_tanggal: today,
            cb_tipe: defaultTipe,
            cb_transagenid: '',
            cb_pembuat: localStorage.getItem('username') || 'staff',
            cb_ket: defaultKet,
            cb_notrans_um_sebelumnya: '',
            cb_postyn: 'N',
            cb_nojurnal: '-'
        });
        setRincianList([]);
    };

    const handleAdd = () => {
        setIsEditMode(false);
        setStep(1);
        setShowTambahRincian(false);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setIsEditMode(true);
        setStep(3);
        setFormData({
            cb_id: item.cb_id,
            cb_nourut: '0001',
            cb_tanggal: item.cb_tanggal || today,
            cb_tipe: item.cb_tipe || 'K',
            cb_transagenid: '',
            cb_pembuat: localStorage.getItem('username') || 'staff',
            cb_ket: item.cb_ket !== '-' ? item.cb_ket : '',
            cb_notrans_um_sebelumnya: '',
            cb_postyn: item.cb_postyn || 'N',
            cb_nojurnal: item.cb_nojurnal || '-'
        });
        // Default rincian dari data total
        setRincianList([
            {
                nama_biaya: item.cb_ket,
                item_id: 'ITEM-AUTO',
                keterangan: item.cb_ket,
                quantity: 1,
                harga_satuan: item.total_amount || 0,
                subtotal: item.total_amount || 0
            }
        ]);
        setIsModalOpen(true);
    };

    // 💾 SIMPAN TRANSAKSI KE DATABASE
    const handleSaveForm = async () => {
        const totalNominal = rincianList.reduce((acc, curr) => acc + Number(curr.subtotal), 0);

        if (totalNominal <= 0) {
            Swal.fire({ title: 'Gagal Simpan', text: 'Tambahkan minimal 1 rincian kas dengan nominal!', icon: 'warning' });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/gl/cashbank/update' : '/gl/cashbank/create';

            let keteranganFinal = formData.cb_ket;
            if (kategoriTrans === 'PUM' && formData.cb_notrans_um_sebelumnya) {
                keteranganFinal = `${formData.cb_ket} (REF: ${formData.cb_notrans_um_sebelumnya})`;
            }

            await api.post(endpoint, {
                ...formData,
                cb_ket: keteranganFinal,
                nominal: totalNominal
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                title: 'BERHASIL!',
                text: `Pencatatan Kas/Bank Berhasil ${isEditMode ? 'Diperbarui' : 'Disimpan'}.`,
                icon: 'success'
            });

            setIsModalOpen(false);
            fetchCashBankData();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Gagal menyimpan transaksi.',
                icon: 'error'
            });
        }
    };

    const openPostingModal = (item) => {
        setSelectedItemForPosting(item);
        setSumberDana('KAS OPS DK');
        setIsPostingModalOpen(true);
    };

    const handleProceedPosting = async () => {
        if (!selectedItemForPosting) return;

        try {
            const token = localStorage.getItem('token');
            const payload = {
                cb_id: selectedItemForPosting.cb_id,
                sumber_dana: sumberDana
            };

            const res = await api.post('/gl/cashbank/post', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                title: 'POSTING BERHASIL!',
                text: res.data?.message || `Transaksi Kas ${selectedItemForPosting.cb_id} berhasil diposting.`,
                icon: 'success'
            });

            setIsPostingModalOpen(false);
            if (isModalOpen) setIsModalOpen(false);
            fetchCashBankData();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL POSTING!',
                text: err.response?.data?.message || 'Terjadi kesalahan saat posting transaksi.',
                icon: 'error'
            });
        }
    };

    const handleUnposting = async (cb_id) => {
        Swal.fire({
            title: 'Batalkan Posting?',
            text: `Yakin ingin unposting transaksi kas ${cb_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Unposting!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.post('/gl/cashbank/unpost', { cb_id }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire({
                        title: 'BERHASIL UNPOSTING!',
                        text: `Transaksi Kas ${cb_id} kembali ke status Unposted.`,
                        icon: 'success'
                    });

                    if (isModalOpen) setIsModalOpen(false);
                    fetchCashBankData();
                } catch (err) {
                    Swal.fire({
                        title: 'GAGAL!',
                        text: err.response?.data?.message || 'Gagal unposting.',
                        icon: 'error'
                    });
                }
            }
        });
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Batalkan Transaksi Kas?',
            text: `Apakah Anda yakin ingin membatalkan transaksi kas No ${item.cb_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Batalkan!',
            cancelButtonText: 'Batal',
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    // 💡 encodeURIComponent agar slash '/' tidak memecah URL
                    await api.delete(`/gl/cashbank/${encodeURIComponent(item.cb_id)}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire({
                        title: 'TERHAPUS!',
                        text: 'Transaksi Kas berhasil dibatalkan.',
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                    fetchCashBankData();
                } catch (err) {
                    Swal.fire({
                        title: 'GAGAL!',
                        text: err.response?.data?.message || 'Gagal menghapus data.',
                        icon: 'error',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                }
            }
        });
    };

    const handlePrint = (item) => {
        Swal.fire({
            title: 'PRINT BUKTI KAS',
            text: `Mencetak Bukti Kas untuk No Transaksi ${item.cb_id}...`,
            icon: 'info',
            confirmButtonColor: '#0284c7'
        });
    };

    const formatDate = (dateString) => {
        if (!dateString || dateString === '-') return '-';
        const parts = dateString.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateString;
    };

    const columns = [
        {
            header: 'NO. TRANSAKSI',
            accessor: 'cb_id',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.cb_id}</span>
        },
        {
            header: 'CABANG',
            accessor: 'agen_nama',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.agen_nama}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'cb_tanggal',
            render: (item) => <span className="font-mono text-slate-800">{formatDate(item.cb_tanggal)}</span>
        },
        {
            header: 'TIPE',
            accessor: 'cb_tipe',
            render: (item) => item.cb_tipe === 'T' ? (
                <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">TERIMA KAS</span>
            ) : (
                <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">KELUAR KAS</span>
            )
        },
        {
            header: 'KETERANGAN',
            accessor: 'cb_ket',
            render: (item) => <span className="text-slate-600">{item.cb_ket}</span>
        },
        {
            header: 'STATUS',
            accessor: 'cb_aktifyn',
            render: (item) => item.cb_aktifyn === 'N' ? (
                <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">HAPUS / VOID</span>
            ) : (
                <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">AKTIF</span>
            )
        },
        {
            header: 'NO. JURNAL',
            accessor: 'cb_nojurnal',
            render: (item) => <span className="font-mono text-indigo-600 font-bold">{item.cb_nojurnal}</span>
        },
        {
            header: 'POSTING',
            accessor: 'cb_postyn',
            render: (item) => item.cb_postyn === 'Y' ? (
                <button
                    onClick={() => handleUnposting(item.cb_id)}
                    title="Klik untuk Unposting Transaksi"
                    className="px-2.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 rounded font-bold text-[10px] transition cursor-pointer"
                >
                    POSTING
                </button>
            ) : (
                <button
                    onClick={() => openPostingModal(item)}
                    title="Klik untuk Posting ke Jurnal"
                    className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 rounded font-bold text-[10px] transition cursor-pointer"
                >
                    UNPOSTED
                </button>
            )
        },
        {
            header: 'NOMINAL (RP)',
            accessor: 'total_amount',
            render: (item) => <span className="font-mono font-bold text-emerald-600">Rp {(item.total_amount || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'PRINT',
            accessor: 'print_action',
            render: (item) => (
                <button
                    onClick={() => handlePrint(item)}
                    title="Cetak Bukti Kas"
                    className="px-2.5 py-1 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-100 transition cursor-pointer flex items-center gap-1 mx-auto font-bold text-[10px]"
                >
                    <Printer size={12} /> Print
                </button>
            )
        }
    ];

    // 🌟 MODAL FORM POPUP
    const modalElement = isModalOpen ? (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            style={{ zIndex: 99999 }}
        >
            <div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden transition-all transform ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                {/* Header Modal */}
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {step > 1 && !isEditMode && (
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <h2 className="text-base font-black uppercase tracking-wider text-slate-800">
                            {step === 1 ? 'PILIH JENIS TRANSAKSI' : (step === 2 ? `INPUT DATA KAS MASUK / KELUAR (${kategoriTrans})` : 'EDIT DATA KAS MASUK / KELUAR (RINCIAN KAS)')}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Modal */}
                {step === 1 && (
                    // 🌟 STEP 1: PILIHAN JENIS TRANSAKSI (3 TOMBOL)
                    <div className="p-10 space-y-8 text-center">
                        <h3 className="text-base font-black text-slate-700 tracking-wide">Pilih Jenis Transaksi</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                            <button
                                type="button"
                                onClick={() => handleSelectKategori('UM')}
                                className="h-20 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center text-sm uppercase tracking-wider cursor-pointer"
                            >
                                Uang Muka
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSelectKategori('PUM')}
                                className="h-20 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center text-sm uppercase tracking-wider cursor-pointer px-4 text-center leading-tight"
                            >
                                Penyelesaian<br />Uang Muka
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSelectKategori('MEMORIAL')}
                                className="h-20 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center text-sm uppercase tracking-wider cursor-pointer"
                            >
                                Memorial
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    // 🌟 STEP 2: FORM HEADER
                    <div className="p-8 space-y-5 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">TRANSAKSI :</label>
                                <select
                                    value={formData.cb_transagenid}
                                    onChange={(e) => setFormData({ ...formData, cb_transagenid: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-indigo-600 transition"
                                >
                                    <option value="">-- PILIH CABANG / AGEN --</option>
                                    {cabangList.map((cabang, idx) => (
                                        <option key={idx} value={cabang.agen_id || cabang.AgenID}>
                                            {cabang.agen_nama || cabang.AgenNama}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">TANGGAL :</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.cb_tanggal}
                                    onChange={(e) => setFormData({ ...formData, cb_tanggal: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600 transition"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">PEMBUAT :</label>
                                <input
                                    type="text"
                                    disabled
                                    value={formData.cb_pembuat}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-100 font-bold text-slate-700"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">TYPE :</label>
                                <div className="flex items-center gap-5 pt-2">
                                    <label className="flex items-center gap-2 font-bold cursor-pointer text-slate-700">
                                        <input
                                            type="radio"
                                            name="tipeKas"
                                            value="T"
                                            checked={formData.cb_tipe === 'T'}
                                            onChange={(e) => setFormData({ ...formData, cb_tipe: e.target.value })}
                                            className="w-4 h-4 text-sky-600"
                                        />
                                        Terima Kas
                                    </label>
                                    <label className="flex items-center gap-2 font-bold cursor-pointer text-slate-700">
                                        <input
                                            type="radio"
                                            name="tipeKas"
                                            value="K"
                                            checked={formData.cb_tipe === 'K'}
                                            onChange={(e) => setFormData({ ...formData, cb_tipe: e.target.value })}
                                            className="w-4 h-4 text-sky-600"
                                        />
                                        Keluar Kas
                                    </label>
                                </div>
                            </div>

                            {kategoriTrans === 'PUM' && (
                                <div className="md:col-span-2">
                                    <label className="font-bold text-slate-700 block mb-1.5">NOMOR TRANSAKSI UANG MUKA SEBELUMNYA:</label>
                                    <input
                                        type="text"
                                        placeholder="Masukan Nomor Transaksi Uang Muka..."
                                        value={formData.cb_notrans_um_sebelumnya}
                                        onChange={(e) => setFormData({ ...formData, cb_notrans_um_sebelumnya: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-mono font-bold text-slate-800 outline-none focus:border-indigo-600 transition"
                                    />
                                </div>
                            )}

                            <div className="md:col-span-3">
                                <label className="font-bold text-slate-700 block mb-1.5">KETERANGAN :</label>
                                <textarea
                                    rows={2}
                                    placeholder="Masukkan keterangan rincian transaksi..."
                                    value={formData.cb_ket}
                                    onChange={(e) => setFormData({ ...formData, cb_ket: e.target.value })}
                                    className={`w-full px-3.5 py-2.5 border border-slate-300 rounded-lg font-bold outline-none focus:border-indigo-600 transition ${kategoriTrans === 'UM' || kategoriTrans === 'PUM' ? 'bg-cyan-50 text-slate-800' : 'bg-white text-slate-800'
                                        }`}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-start gap-3 pt-6 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setStep(3)}
                                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition shadow-md uppercase cursor-pointer"
                            >
                                TAMBAH RINCIAN
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    // 🌟 STEP 3: EDIT / RINCIAN KAS (GAMBAR 2, 3, 4, 5)
                    <div className="p-8 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
                        {/* Header Box */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <div>
                                <span className="text-slate-400 font-bold block mb-1">NO. TRANSAKSI :</span>
                                <span className="font-mono font-bold text-sky-600">{formData.cb_id || 'AUTO GENERATE'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 font-bold block mb-1">PEMBUAT :</span>
                                <span className="font-bold text-slate-800">{formData.cb_pembuat}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 font-bold block mb-1">TANGGAL :</span>
                                <span className="font-mono font-bold text-slate-800">{formData.cb_tanggal}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 font-bold block mb-1">TYPE :</span>
                                <span className="font-bold text-slate-800">{formData.cb_tipe === 'T' ? 'Terima Kas' : 'Keluar Kas'}</span>
                            </div>
                            <div className="col-span-2 md:col-span-4">
                                <span className="text-slate-400 font-bold block mb-1">KETERANGAN :</span>
                                <span className="font-medium text-slate-700">{formData.cb_ket}</span>
                            </div>
                        </div>

                        {/* Tabel Rincian Yang Sudah Ditambahkan */}
                        {rincianList.length > 0 && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-800 text-white font-bold">
                                        <tr>
                                            <th className="p-2.5">KODE ITEM</th>
                                            <th className="p-2.5">NAMA BIAYA / KETERANGAN</th>
                                            <th className="p-2.5 text-center">QTY</th>
                                            <th className="p-2.5 text-right">HARGA SATUAN</th>
                                            <th className="p-2.5 text-right">SUBTOTAL</th>
                                            <th className="p-2.5 text-center">AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rincianList.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-2.5 font-mono font-bold text-slate-700">{item.item_id}</td>
                                                <td className="p-2.5 text-slate-800">{item.nama_biaya}</td>
                                                <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                                                <td className="p-2.5 text-right font-mono font-bold">Rp {Number(item.harga_satuan).toLocaleString('id-ID')}</td>
                                                <td className="p-2.5 text-right font-mono font-bold text-emerald-600">Rp {Number(item.subtotal).toLocaleString('id-ID')}</td>
                                                <td className="p-2.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteRincian(idx)}
                                                        className="text-rose-600 hover:text-rose-800 cursor-pointer p-1"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-100 font-black">
                                        <tr>
                                            <td colSpan={4} className="p-2.5 text-right uppercase">TOTAL NOMINAL :</td>
                                            <td className="p-2.5 text-right font-mono text-emerald-700 text-sm">
                                                Rp {rincianList.reduce((acc, curr) => acc + Number(curr.subtotal), 0).toLocaleString('id-ID')}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {/* Section Tambah Rincian Kas (Gambar 2 & 3) */}
                        <div className="border border-sky-200 bg-sky-50/40 p-5 rounded-2xl space-y-4">
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={showTambahRincian}
                                        onChange={() => setShowTambahRincian(true)}
                                        className="w-4 h-4 text-sky-600"
                                    />
                                    TAMBAH : Rincian Kas.
                                </label>
                            </div>

                            {/* Form Input Rincian (Gambar 3, 4, 5) */}
                            {showTambahRincian && (
                                <div className="space-y-4 pt-3 border-t border-sky-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative" ref={dropdownRef}>
                                        {/* Nama Biaya (Autocomplete Query) */}
                                        <div className="relative">
                                            <label className="font-bold text-slate-700 block mb-1.5">NAMA BIAYA :</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Ketik nama biaya..."
                                                    value={detailForm.nama_biaya}
                                                    onChange={(e) => handleSearchBiaya(e.target.value)}
                                                    onFocus={() => {
                                                        if (detailForm.nama_biaya) handleSearchBiaya(detailForm.nama_biaya);
                                                    }}
                                                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-cyan-50 font-bold text-slate-800 outline-none focus:border-sky-500"
                                                />
                                                <Search size={14} className="absolute right-3 top-3.5 text-slate-400" />
                                            </div>

                                            {/* Dropdown Query List */}
                                            {showDropdown && itemList.length > 0 && (
                                                <div
                                                    className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-y-auto divide-y divide-slate-100 max-h-56"
                                                    style={{ zIndex: 9999999 }}
                                                >
                                                    {itemList.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => handleSelectItem(item)}
                                                            className="p-3 hover:bg-sky-50 cursor-pointer flex items-center justify-between text-xs transition"
                                                        >
                                                            <span className="font-bold text-slate-800">{item.item_name}</span>
                                                            <span className="font-mono text-sky-600 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-100">{item.item_id}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Kode Item (Auto Populated) */}
                                        <div>
                                            <label className="font-bold text-slate-700 block mb-1.5">KODE :</label>
                                            <input
                                                type="text"
                                                disabled
                                                value={detailForm.item_id}
                                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-100 font-mono font-bold text-slate-700"
                                            />
                                        </div>

                                        {/* Keterangan */}
                                        <div>
                                            <label className="font-bold text-slate-700 block mb-1.5">KETERANGAN :</label>
                                            <input
                                                type="text"
                                                value={detailForm.keterangan}
                                                onChange={(e) => setDetailForm({ ...detailForm, keterangan: e.target.value })}
                                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-sky-500"
                                            />
                                        </div>

                                        {/* Quantity & Harga Satuan */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="font-bold text-slate-700 block mb-1.5">QUANTITY :</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={detailForm.quantity}
                                                    onChange={(e) => setDetailForm({ ...detailForm, quantity: e.target.value })}
                                                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800 outline-none focus:border-sky-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="font-bold text-slate-700 block mb-1.5">HARGA SATUAN :</label>
                                                <input
                                                    type="number"
                                                    value={detailForm.harga_satuan}
                                                    onChange={(e) => setDetailForm({ ...detailForm, harga_satuan: e.target.value })}
                                                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-cyan-50 font-mono font-bold text-emerald-700 outline-none focus:border-sky-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Terbilang Otomatis (Gambar 5) */}
                                        <div className="md:col-span-2 pt-1">
                                            <span className="font-bold text-slate-500">TERBILANG : </span>
                                            <span className="font-bold text-rose-600 uppercase italic">
                                                {angkaTerbilang(Number(detailForm.quantity) * Number(detailForm.harga_satuan)) || '-'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowTambahRincian(false)}
                                            className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleAddRincian}
                                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition"
                                        >
                                            + Tambahkan Rincian
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tombol Aksi Utama (SIMPAN, POSTING, CETAK, KELUAR) */}
                        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleSaveForm}
                                    className="px-8 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black rounded-lg transition shadow-md uppercase cursor-pointer"
                                >
                                    SIMPAN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (formData.cb_id) {
                                            openPostingModal(formData);
                                        } else {
                                            Swal.fire({ title: 'Info', text: 'Simpan data transaksi terlebih dahulu sebelum posting!', icon: 'info' });
                                        }
                                    }}
                                    className="px-8 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition shadow-md uppercase cursor-pointer"
                                >
                                    POSTING
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (formData.cb_id) {
                                            handlePrint(formData);
                                        } else {
                                            Swal.fire({ title: 'Info', text: 'Simpan data terlebih dahulu untuk mencetak bukti!', icon: 'info' });
                                        }
                                    }}
                                    className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition shadow-md uppercase cursor-pointer"
                                >
                                    CETAK
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-8 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition shadow-md uppercase cursor-pointer"
                            >
                                KELUAR
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    ) : null;

    // 🌟 MODAL KONFIRMASI SUMBER DANA POSTING
    const postingModalElement = isPostingModalOpen ? (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            style={{ zIndex: 999999 }}
        >
            <div className="w-full max-w-md rounded-2xl shadow-2xl bg-white text-slate-800 p-6 space-y-5">
                <div className="text-center space-y-1 border-b border-slate-100 pb-3">
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">Konfirmasi Posting</h3>
                    <p className="text-xs text-slate-500 font-medium">Pilih Sumber Dana:</p>
                </div>

                <div className="space-y-3 text-xs font-bold text-slate-700">
                    {[
                        { id: 'kas_dk', label: 'KAS OPS DK', val: 'KAS OPS DK' },
                        { id: 'kas_lk', label: 'KAS OPS LK', val: 'KAS OPS LK' },
                        { id: 'bca_fleet', label: 'BCA FLEET', val: 'BCA FLEET' },
                        { id: 'bank', label: 'BANK', val: 'BANK' },
                        { id: 'etoll', label: 'E-TOLL', val: 'E-TOLL' }
                    ].map((opt) => (
                        <label
                            key={opt.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${sumberDana === opt.val ? 'border-sky-500 bg-sky-50/50 text-sky-900 shadow-xs' : 'border-slate-200 hover:bg-slate-50'}`}
                        >
                            <input
                                type="radio"
                                name="sumberDana"
                                value={opt.val}
                                checked={sumberDana === opt.val}
                                onChange={(e) => setSumberDana(e.target.value)}
                                className="w-4 h-4 text-sky-600 focus:ring-sky-500"
                            />
                            <span>{opt.label}</span>
                        </label>
                    ))}
                </div>

                <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => setIsPostingModalOpen(false)}
                        className="px-6 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition text-xs uppercase cursor-pointer"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleProceedPosting}
                        className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition text-xs uppercase cursor-pointer"
                    >
                        Posting
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-4">
            {/* Filter Panel */}
            <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                    <Filter size={16} className="text-sky-600" />
                    FILTER PENCATATAN CASH - BANK
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="font-bold text-slate-500 block mb-1">TGL MULAI</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="font-bold text-slate-500 block mb-1">TGL SAMPAI</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">CABANG / TRANSAKSI</label>
                        <select
                            value={selectedCabang}
                            onChange={(e) => setSelectedCabang(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA CABANG --</option>
                            {cabangList.map((cabang, idx) => (
                                <option key={idx} value={cabang.agen_nama || cabang.AgenNama}>
                                    {cabang.agen_nama || cabang.AgenNama}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">JENIS TRANSAKSI</label>
                        <select
                            value={selectedTipe}
                            onChange={(e) => setSelectedTipe(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA TIPE --</option>
                            <option value="K">Keluar Kas (K)</option>
                            <option value="T">Terima Kas (T)</option>
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">NO. TRANSAKSI</label>
                        <input
                            type="text"
                            placeholder="Ketik No Transaksi..."
                            value={searchNoTrans}
                            onChange={(e) => setSearchNoTrans(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={handleResetFilter}
                        className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer"
                    >
                        RESET
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer"
                    >
                        TAMPILKAN TRANSAKSI
                    </button>
                </div>
            </form>

            <DataTableTemplate
                title="PENCATATAN CASH - BANK"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {modalElement && ReactDOM.createPortal(modalElement, document.body)}
            {postingModalElement && ReactDOM.createPortal(postingModalElement, document.body)}
        </div>
    );
};

export default KasMasukKeluar;