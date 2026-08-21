import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, Printer, X, ArrowLeft, Search, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import logoDakota from '../assets/new_logo 2.png';

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
    const [step, setStep] = useState(1);
    const [kategoriTrans, setKategoriTrans] = useState('');

    const [formData, setFormData] = useState({
        cb_id: '',
        cb_nourut: '0001',
        cb_tanggal: today,
        cb_tipe: 'K',
        cb_transagenid: '1',
        cb_pembuat: localStorage.getItem('username') || 'staff',
        cb_ket: '',
        cb_notrans_um_sebelumnya: '',
        cb_postyn: 'N',
        cb_nojurnal: '-'
    });

    const [rincianList, setRincianList] = useState([]);
    const [showTambahRincian, setShowTambahRincian] = useState(false);
    const [detailForm, setDetailForm] = useState({
        nama_biaya: '',
        item_id: '',
        keterangan: '',
        quantity: 1,
        harga_satuan: 0
    });

    const [itemList, setItemList] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // Posting Modal State
    const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);
    const [selectedItemForPosting, setSelectedItemForPosting] = useState(null);
    const [sumberDana, setSumberDana] = useState('kas operasional dk');
    const [bankSearch, setBankSearch] = useState('');
    const [bankOptions, setBankOptions] = useState([]);
    const [selectedBank, setSelectedBank] = useState(null);
    const [showBankDropdown, setShowBankDropdown] = useState(false);

    // Print Modal State
    const [printData, setPrintData] = useState(null);
    const [isPrintOpen, setIsPrintOpen] = useState(false);

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
        setRincianList([...rincianList, { ...detailForm, subtotal }]);
        setDetailForm({ nama_biaya: '', item_id: '', keterangan: '', quantity: 1, harga_satuan: 0 });
        setShowTambahRincian(false);
    };

    const handleDeleteRincian = (index) => {
        setRincianList(rincianList.filter((_, idx) => idx !== index));
    };

    const handleSelectKategori = (kategori) => {
        setKategoriTrans(kategori);
        setStep(2);

        let defaultKet = '';
        let defaultTipe = 'K';

        if (kategori === 'UM') defaultKet = 'UANG MUKA ';
        else if (kategori === 'PUM') defaultKet = 'PENYELESAIAN UANG MUKA ';
        else if (kategori === 'MEMORIAL') defaultTipe = 'T';

        setFormData({
            cb_id: '',
            cb_nourut: '0001',
            cb_tanggal: today,
            cb_tipe: defaultTipe,
            cb_transagenid: '1',
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

    const handleEdit = async (item) => {
        setIsEditMode(true);
        setStep(3);
        setFormData({
            cb_id: item.cb_id,
            cb_nourut: '0001',
            cb_tanggal: item.cb_tanggal || today,
            cb_tipe: item.cb_tipe || 'K',
            cb_transagenid: '1',
            cb_pembuat: localStorage.getItem('username') || 'staff',
            cb_ket: item.cb_ket !== '-' ? item.cb_ket : '',
            cb_notrans_um_sebelumnya: '',
            cb_postyn: item.cb_postyn || 'N',
            cb_nojurnal: item.cb_nojurnal || '-'
        });

        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/gl/cashbank/detail/${encodeURIComponent(item.cb_id)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const details = res.data?.details || [];
            if (details.length > 0) {
                setRincianList(details.map(d => ({
                    nama_biaya: d.item_name || d.cbd_ket,
                    item_id: d.cbd_itemid,
                    keterangan: d.cbd_ket,
                    quantity: d.cbd_quantity,
                    harga_satuan: d.cbd_hargasatuan,
                    subtotal: d.cbd_quantity * d.cbd_hargasatuan
                })));
            } else {
                setRincianList([{
                    nama_biaya: item.cb_ket,
                    item_id: '084000000007',
                    keterangan: item.cb_ket,
                    quantity: 1,
                    harga_satuan: item.total_amount || 0,
                    subtotal: item.total_amount || 0
                }]);
            }
        } catch (err) {
            setRincianList([{
                nama_biaya: item.cb_ket,
                item_id: '084000000007',
                keterangan: item.cb_ket,
                quantity: 1,
                harga_satuan: item.total_amount || 0,
                subtotal: item.total_amount || 0
            }]);
        }

        setIsModalOpen(true);
    };

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

            const payload = {
                ...formData,
                cb_ket: keteranganFinal,
                nominal: totalNominal,
                details: rincianList.map(r => ({
                    item_id: r.item_id,
                    keterangan: r.keterangan || r.nama_biaya,
                    quantity: Number(r.quantity),
                    harga_satuan: Number(r.harga_satuan)
                }))
            };

            const res = await api.post(endpoint, payload, { headers: { Authorization: `Bearer ${token}` } });

            // Update ID transaksi yang baru di-generate dari backend
            const savedNoTrans = res.data?.cb_id || res.data?.no_trans || formData.cb_id;
            setFormData(prev => ({ ...prev, cb_id: savedNoTrans }));
            setIsEditMode(true);

            Swal.fire({
                title: 'BERHASIL DISIMPAN!',
                text: `Transaksi ${savedNoTrans} berhasil disimpan. Sekarang Anda dapat memposting transaksi ini.`,
                icon: 'success'
            });

            fetchCashBankData();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Gagal menyimpan transaksi.',
                icon: 'error'
            });
        }
    };

    // Modal Posting & Search Bank
    const openPostingModal = (item) => {
        setSelectedItemForPosting(item);
        setSumberDana('kas operasional dk');
        setSelectedBank(null);
        setBankSearch('');
        setShowBankDropdown(false);
        setIsPostingModalOpen(true);
    };

    // 🏦 Ambil List Bank Dinamis dari Database (Kirimkan PT-ID Aktif)
    const handleSearchBank = async (query = '') => {
        setBankSearch(query);
        setShowBankDropdown(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || localStorage.getItem('selected_pt') || 'C';

            const res = await api.get(`/gl/bank-data?search=${encodeURIComponent(query)}&pt_id=${encodeURIComponent(ptId)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const resultData = res.data?.data || [];
            console.log("Daftar Bank dari Database:", resultData);
            setBankOptions(Array.isArray(resultData) ? resultData : []);
        } catch (err) {
            console.error("Gagal memuat bank dari database:", err);
            setBankOptions([]);
        }
    };

    const handleProceedPosting = async () => {
        if (!selectedItemForPosting) return;

        if (sumberDana === 'bank' && !selectedBank) {
            Swal.fire({ title: 'Peringatan', text: 'Pilih bank terlebih dahulu!', icon: 'warning' });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const payload = {
                cb_id: selectedItemForPosting.cb_id,
                sumber_dana: sumberDana,
                bank_code: selectedBank?.code || '',
                bank_name: selectedBank?.name || ''
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

    // Print Handler
    // Print Voucher Handler 100% Dinamis Tanpa Hardcode
    const handlePrint = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || localStorage.getItem('selected_pt') || 'C';

            let details = [];
            let lawanName = '-';
            let lawanCode = '-';
            let totalAmount = Number(item.total_amount || item.cb_total || 0);

            // 1. Jika sudah posting dan memiliki Nomor Jurnal
            if (item.cb_nojurnal && item.cb_nojurnal !== '-' && item.cb_nojurnal !== '') {
                const jRes = await api.get(`/gl/jurnal/detail/${encodeURIComponent(item.cb_nojurnal)}?pt_id=${encodeURIComponent(ptId)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const jDetails = jRes.data?.details || [];

                // Cari baris akun lawan / sumber dana
                const lawanRow = item.cb_tipe === 'K'
                    ? jDetails.find(d => Number(d.tjurd_kredit) > 0)
                    : jDetails.find(d => Number(d.tjurd_debet) > 0);

                if (lawanRow) {
                    lawanName = lawanRow.ca_name || '-';
                    lawanCode = lawanRow.tjurd_acccode || '-';
                }

                // Ambil baris rincian transaksi
                const detailRows = item.cb_tipe === 'K'
                    ? jDetails.filter(d => Number(d.tjurd_debet) > 0)
                    : jDetails.filter(d => Number(d.tjurd_kredit) > 0);

                details = detailRows.map(d => ({
                    code: d.tjurd_acccode,
                    nama: d.ca_name,
                    keterangan: d.tjurd_keterangan,
                    nominal: Number(item.cb_tipe === 'K' ? d.tjurd_debet : d.tjurd_kredit) || 0
                }));

                if (details.length > 0) {
                    totalAmount = details.reduce((sum, d) => sum + Number(d.nominal), 0);
                }
            } else {
                // 2. Jika belum posting (ambil rincian dari data item kas aktif)
                const rawDetails = item.details || item.rincian || [];
                if (rawDetails.length > 0) {
                    details = rawDetails.map(d => ({
                        code: d.cbd_itemid || d.item_id || '-',
                        nama: d.item_name || d.cbd_ket || item.cb_ket || '-',
                        keterangan: d.cbd_ket || item.cb_ket || '-',
                        nominal: Number(d.cbd_total || (d.cbd_quantity * d.cbd_hargasatuan) || 0)
                    }));
                    totalAmount = details.reduce((sum, d) => sum + Number(d.nominal), 0);
                } else {
                    // Validasi: jika tidak ada detail sama sekali
                    Swal.fire({
                        title: 'Data Belum Lengkap',
                        text: 'Transaksi ini belum diposting dan tidak memiliki rincian biaya.',
                        icon: 'warning',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                    return;
                }
            }

            setPrintData({
                noTrans: (item.cb_nojurnal && item.cb_nojurnal !== '-') ? item.cb_nojurnal : item.cb_id,
                tanggal: formatDate(item.cb_tanggal),
                keterangan: item.cb_ket || '-',
                tipe: item.cb_tipe,
                total: totalAmount,
                lawanCode,
                lawanName,
                details
            });
            setIsPrintOpen(true);
        } catch (err) {
            console.error("Gagal memuat voucher cetak:", err);
            Swal.fire({
                title: 'GAGAL PRINT',
                text: 'Tidak dapat memuat data rincian kas untuk dicetak.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
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
                    className="px-2.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 rounded font-bold text-[10px] transition cursor-pointer"
                >
                    POSTING
                </button>
            ) : (
                <button
                    onClick={() => openPostingModal(item)}
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
                    className="px-2.5 py-1 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-100 transition cursor-pointer flex items-center gap-1 mx-auto font-bold text-[10px]"
                >
                    <Printer size={12} /> Print
                </button>
            )
        }
    ];

    // Modal Input & Wizard
    const modalElement = isModalOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity" style={{ zIndex: 99999 }}>
            <div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden transition-all transform ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {step > 1 && !isEditMode && (
                            <button type="button" onClick={() => setStep(step - 1)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer">
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <h2 className="text-base font-black uppercase tracking-wider text-slate-800">
                            {step === 1 ? 'PILIH JENIS TRANSAKSI' : (step === 2 ? `INPUT DATA KAS MASUK / KELUAR (${kategoriTrans})` : 'EDIT DATA KAS MASUK / KELUAR')}
                        </h2>
                    </div>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {step === 1 && (
                    <div className="p-10 space-y-8 text-center">
                        <h3 className="text-base font-black text-slate-700 tracking-wide">Pilih Jenis Transaksi</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                            <button type="button" onClick={() => handleSelectKategori('UM')} className="h-20 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center text-sm uppercase cursor-pointer">
                                Uang Muka
                            </button>
                            <button type="button" onClick={() => handleSelectKategori('PUM')} className="h-20 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center text-sm uppercase cursor-pointer px-4 text-center leading-tight">
                                Penyelesaian<br />Uang Muka
                            </button>
                            <button type="button" onClick={() => handleSelectKategori('MEMORIAL')} className="h-20 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center text-sm uppercase cursor-pointer">
                                Memorial
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="p-8 space-y-5 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">TRANSAKSI :</label>
                                <select value={formData.cb_transagenid} onChange={(e) => setFormData({ ...formData, cb_transagenid: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-indigo-600">
                                    <option value="1">DLI PUSAT</option>
                                    {cabangList.map((cabang, idx) => (
                                        <option key={idx} value={cabang.agen_id || cabang.AgenID}>{cabang.agen_nama || cabang.AgenNama}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">TANGGAL :</label>
                                <input type="date" required value={formData.cb_tanggal} onChange={(e) => setFormData({ ...formData, cb_tanggal: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600" />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">PEMBUAT :</label>
                                <input type="text" disabled value={formData.cb_pembuat} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-100 font-bold text-slate-700" />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">TYPE :</label>
                                <div className="flex items-center gap-5 pt-2">
                                    <label className="flex items-center gap-2 font-bold cursor-pointer text-slate-700">
                                        <input type="radio" name="tipeKas" value="T" checked={formData.cb_tipe === 'T'} onChange={(e) => setFormData({ ...formData, cb_tipe: e.target.value })} className="w-4 h-4 text-sky-600" /> Terima Kas
                                    </label>
                                    <label className="flex items-center gap-2 font-bold cursor-pointer text-slate-700">
                                        <input type="radio" name="tipeKas" value="K" checked={formData.cb_tipe === 'K'} onChange={(e) => setFormData({ ...formData, cb_tipe: e.target.value })} className="w-4 h-4 text-sky-600" /> Keluar Kas
                                    </label>
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <label className="font-bold text-slate-700 block mb-1.5">KETERANGAN :</label>
                                <textarea rows={2} placeholder="Masukkan keterangan rincian transaksi..." value={formData.cb_ket} onChange={(e) => setFormData({ ...formData, cb_ket: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg font-bold outline-none focus:border-indigo-600 bg-cyan-50 text-slate-800" />
                            </div>
                        </div>
                        <div className="flex items-center justify-start gap-3 pt-6 border-t border-slate-100">
                            <button type="button" onClick={() => setStep(3)} className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition shadow-md uppercase cursor-pointer">
                                TAMBAH RINCIAN
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="p-8 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <div><span className="text-slate-400 font-bold block mb-1">NO. TRANSAKSI :</span><span className="font-mono font-bold text-sky-600">{formData.cb_id || 'AUTO GENERATE'}</span></div>
                            <div><span className="text-slate-400 font-bold block mb-1">PEMBUAT :</span><span className="font-bold text-slate-800">{formData.cb_pembuat}</span></div>
                            <div><span className="text-slate-400 font-bold block mb-1">TANGGAL :</span><span className="font-mono font-bold text-slate-800">{formatDate(formData.cb_tanggal)}</span></div>
                            <div><span className="text-slate-400 font-bold block mb-1">TYPE :</span><span className="font-bold text-slate-800">{formData.cb_tipe === 'T' ? 'Terima Kas' : 'Keluar Kas'}</span></div>
                            <div className="col-span-2 md:col-span-4"><span className="text-slate-400 font-bold block mb-1">KETERANGAN :</span><span className="font-medium text-slate-700">{formData.cb_ket}</span></div>
                        </div>

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
                                                    <button type="button" onClick={() => handleDeleteRincian(idx)} className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"><Trash2 size={14} /></button>
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

                        <div className="border border-sky-200 bg-sky-50/40 p-5 rounded-2xl space-y-4">
                            <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                                <input type="radio" checked={showTambahRincian} onChange={() => setShowTambahRincian(true)} className="w-4 h-4 text-sky-600" />
                                TAMBAH : Rincian Kas.
                            </label>

                            {showTambahRincian && (
                                <div className="space-y-4 pt-3 border-t border-sky-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                                        <div className="relative">
                                            <label className="font-bold text-slate-700 block mb-1.5">NAMA BIAYA :</label>
                                            <div className="relative">
                                                <input type="text" placeholder="Ketik nama biaya..." value={detailForm.nama_biaya} onChange={(e) => handleSearchBiaya(e.target.value)} onFocus={() => { if (detailForm.nama_biaya) handleSearchBiaya(detailForm.nama_biaya); }} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-cyan-50 font-bold text-slate-800 outline-none focus:border-sky-500" />
                                                <Search size={14} className="absolute right-3 top-3.5 text-slate-400" />
                                            </div>

                                            {showDropdown && itemList.length > 0 && (
                                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-y-auto divide-y divide-slate-100 max-h-56 z-50">
                                                    {itemList.map((item, idx) => (
                                                        <div key={idx} onClick={() => handleSelectItem(item)} className="p-3 hover:bg-sky-50 cursor-pointer flex items-center justify-between text-xs">
                                                            <span className="font-bold text-slate-800">{item.item_name}</span>
                                                            <span className="font-mono text-sky-600 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-100">{item.item_id}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="font-bold text-slate-700 block mb-1.5">KODE :</label>
                                            <input type="text" disabled value={detailForm.item_id} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-100 font-mono font-bold text-slate-700" />
                                        </div>

                                        <div>
                                            <label className="font-bold text-slate-700 block mb-1.5">KETERANGAN :</label>
                                            <input type="text" value={detailForm.keterangan} onChange={(e) => setDetailForm({ ...detailForm, keterangan: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-sky-500" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="font-bold text-slate-700 block mb-1.5">QUANTITY :</label>
                                                <input type="number" min="1" value={detailForm.quantity} onChange={(e) => setDetailForm({ ...detailForm, quantity: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800 outline-none focus:border-sky-500" />
                                            </div>
                                            <div>
                                                <label className="font-bold text-slate-700 block mb-1.5">HARGA SATUAN :</label>
                                                <input type="number" value={detailForm.harga_satuan} onChange={(e) => setDetailForm({ ...detailForm, harga_satuan: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-cyan-50 font-mono font-bold text-emerald-700 outline-none focus:border-sky-500" />
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 pt-1">
                                            <span className="font-bold text-slate-500">TERBILANG : </span>
                                            <span className="font-bold text-rose-600 uppercase italic">
                                                {angkaTerbilang(Number(detailForm.quantity) * Number(detailForm.harga_satuan)) || '-'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button type="button" onClick={() => setShowTambahRincian(false)} className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition">Batal</button>
                                        <button type="button" onClick={handleAddRincian} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition">+ Tambahkan Rincian</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tombol Aksi Utama (SIMPAN, POSTING, CETAK, KELUAR) */}
                        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-3">
                                {/* Tombol SIMPAN selalu aktif */}
                                <button
                                    type="button"
                                    onClick={handleSaveForm}
                                    className="px-8 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black rounded-lg transition shadow-md uppercase cursor-pointer"
                                >
                                    SIMPAN
                                </button>

                                {/* Tombol POSTING: Hanya ENABLE jika sudah ada nomor transaksi (tersimpan) dan belum diposting */}
                                <button
                                    type="button"
                                    disabled={!formData.cb_id || formData.cb_id === 'AUTO GENERATE' || formData.cb_postyn === 'Y'}
                                    onClick={(e) => {
                                        e.currentTarget.blur(); // Mencegah focus trap aria-hidden
                                        openPostingModal(formData);
                                    }}
                                    className={`px-8 py-2.5 font-bold rounded-lg transition uppercase ${!formData.cb_id || formData.cb_id === 'AUTO GENERATE' || formData.cb_postyn === 'Y'
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                                        : 'bg-sky-600 hover:bg-sky-700 text-white shadow-md cursor-pointer'
                                        }`}
                                    title={!formData.cb_id ? 'Klik SIMPAN terlebih dahulu untuk memunculkan tombol posting' : ''}
                                >
                                    POSTING
                                </button>

                                {/* Tombol CETAK: Hanya ENABLE jika transaksi sudah tersimpan */}
                                <button
                                    type="button"
                                    disabled={!formData.cb_id || formData.cb_id === 'AUTO GENERATE'}
                                    onClick={(e) => {
                                        e.currentTarget.blur();
                                        handlePrint(formData);
                                    }}
                                    className={`px-8 py-2.5 font-bold rounded-lg transition uppercase ${!formData.cb_id || formData.cb_id === 'AUTO GENERATE'
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer'
                                        }`}
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

    // Modal Konfirmasi Posting dengan Search Bank
    const postingModalElement = isPostingModalOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity" style={{ zIndex: 999999 }}>
            <div className="w-full max-w-md rounded-2xl shadow-2xl bg-white text-slate-800 p-6 space-y-4">
                <div className="text-center space-y-1 border-b border-slate-100 pb-3">
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">Konfirmasi Posting</h3>
                    <p className="text-xs text-slate-500 font-medium">Pilih Sumber Dana:</p>
                </div>

                <div className="space-y-3 text-xs font-bold text-slate-700">
                    {[
                        { id: 'kas_dk', label: 'KAS OPS DK', val: 'kas operasional dk' },
                        { id: 'kas_lk', label: 'KAS OPS LK', val: 'kas operasional lk' },
                        { id: 'bca_fleet', label: 'BCA FLEET', val: 'bca fleet' },
                    ].map((opt) => (
                        <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${sumberDana === opt.val ? 'border-sky-500 bg-sky-50/50 text-sky-900 shadow-xs' : 'border-slate-200 hover:bg-slate-50'}`}>
                            <input type="radio" name="sumberDana" value={opt.val} checked={sumberDana === opt.val} onChange={(e) => { setSumberDana(e.target.value); setSelectedBank(null); }} className="w-4 h-4 text-sky-600" />
                            <span>{opt.label}</span>
                        </label>
                    ))}

                    {/* Radio Bank dengan Dropdown Dinamis dari Database */}
                    <div className={`p-3 rounded-xl border transition ${sumberDana === 'bank' ? 'border-sky-500 bg-sky-50/50' : 'border-slate-200'}`}>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="sumberDana"
                                value="bank"
                                checked={sumberDana === 'bank'}
                                onChange={() => {
                                    setSumberDana('bank');
                                    setSelectedBank(null);
                                    setBankSearch('');
                                    handleSearchBank(''); // 👈 Tarik data langsung saat radio di klik
                                }}
                                className="w-4 h-4 text-sky-600 cursor-pointer"
                            />
                            <span className="font-bold text-slate-800">BANK</span>
                        </label>

                        {/* Indikator Bank yang Dipilih */}
                        {selectedBank && (
                            <div className="text-xs text-sky-600 font-bold italic mt-2 ml-7 bg-white p-2 rounded-lg border border-sky-200 flex items-center justify-between shadow-xs">
                                <span>✓ {selectedBank.name} ({selectedBank.code})</span>
                                <span className="text-[10px] text-slate-400 font-normal">Klik kolom pencarian untuk mengganti</span>
                            </div>
                        )}

                        {sumberDana === 'bank' && (
                            <div className="mt-3 ml-7 space-y-2 relative">
                                <input
                                    type="text"
                                    placeholder="Ketik untuk mencari bank di database..."
                                    value={bankSearch}
                                    onChange={(e) => handleSearchBank(e.target.value)}
                                    onFocus={() => handleSearchBank(bankSearch)}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 outline-none focus:border-sky-500 bg-white font-medium text-slate-800 shadow-inner"
                                />

                                {showBankDropdown && (
                                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl divide-y divide-slate-100 text-xs mt-1 z-50">
                                        {bankOptions.length > 0 ? (
                                            bankOptions.map((b, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setSelectedBank(b);
                                                        setShowBankDropdown(false);
                                                        setBankSearch('');
                                                    }}
                                                    className={`p-2.5 hover:bg-sky-100 cursor-pointer transition flex flex-col ${selectedBank?.code === b.code ? 'bg-sky-50 font-bold text-sky-700' : 'text-slate-700'}`}
                                                >
                                                    <span className="font-bold text-slate-800">{b.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">Kode: {b.code}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 text-center text-slate-400 font-medium">Bank tidak ditemukan di database</div>
                                        )}
                                    </div>
                                )}

                            </div>
                        )}
                    </div>



                </div>

                <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setIsPostingModalOpen(false)} className="px-6 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition text-xs uppercase cursor-pointer">
                        Batal
                    </button>
                    <button type="button" onClick={handleProceedPosting} className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition text-xs uppercase cursor-pointer">
                        Posting
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    // Template Print Voucher
    const printModalElement = isPrintOpen && printData ? (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-8 print:p-0">
            <div className="max-w-4xl mx-auto flex justify-between items-center mb-6 pb-4 border-b print:hidden">
                <button onClick={() => setIsPrintOpen(false)} className="px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 rounded-lg font-bold">
                    ← Tutup
                </button>
                <button onClick={() => window.print()} className="px-5 py-2 text-sm bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold flex items-center gap-2 shadow">
                    <Printer size={16} /> Print Voucher
                </button>
            </div>

            <div className="max-w-4xl mx-auto border border-slate-300 p-8 rounded-lg shadow-sm print:border-none print:shadow-none print:p-0 text-black font-sans">
                <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                    <div>
                        <h2 className="font-bold text-sm tracking-wider">DAKOTA LOGISTIK INDONESIA</h2>
                        <p className="text-xs">Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi</p>
                        <p className="text-xs">BEKASI KOTA</p>
                        <p className="text-xs">(021) 8603278 / (021) 86608589</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <img
                            src={logoDakota}
                            alt="Dakota Cargo"
                            className="h-10 w-auto object-contain"
                        />
                    </div>
                </div>

                <div className="text-center my-4">
                    <h2 className="font-bold text-base uppercase underline tracking-wider">
                        {printData.tipe === 'T' ? 'VOUCHER PENERIMAAN KAS' : 'VOUCHER PENGELUARAN KAS'}
                    </h2>
                </div>

                <div className="text-xs mb-4 leading-relaxed">
                    <div className="flex"><span className="w-28 font-semibold">No. Transaksi</span><span>: {printData.noTrans}</span></div>
                    <div className="flex"><span className="w-28 font-semibold">Tanggal</span><span>: {printData.tanggal}</span></div>
                    <div className="flex"><span className="w-28 font-semibold">Keterangan</span><span>: {printData.keterangan}</span></div>
                </div>

                <table className="w-full text-xs border-collapse border border-slate-400 mb-6">
                    <thead>
                        <tr className="bg-slate-200 border-b border-slate-400">
                            <th className="border border-slate-400 p-2 text-left w-28">Account</th>
                            <th className="border border-slate-400 p-2 text-center w-10">CC</th>
                            <th className="border border-slate-400 p-2 text-left">Keterangan</th>
                            <th className="border border-slate-400 p-2 text-right w-28">Debet</th>
                            <th className="border border-slate-400 p-2 text-right w-28">Kredit</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-slate-300">
                            <td className="p-2 border-r border-slate-400">{printData.lawanCode}</td>
                            <td className="p-2 text-center border-r border-slate-400">1</td>
                            <td className="p-2 border-r border-slate-400 font-bold uppercase">
                                {printData.lawanName} : {printData.keterangan}
                            </td>
                            <td className="p-2 text-right border-r border-slate-400">{printData.tipe === 'T' ? Number(printData.total).toLocaleString('id-ID', { minimumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="p-2 text-right">{printData.tipe === 'K' ? Number(printData.total).toLocaleString('id-ID', { minimumFractionDigits: 2 }) : '0.00'}</td>
                        </tr>

                        {printData.details.map((d, i) => (
                            <tr key={i} className="border-b border-slate-300">
                                <td className="p-2 border-r border-slate-400">{d.code}</td>
                                <td className="p-2 text-center border-r border-slate-400">1</td>
                                <td className="p-2 border-r border-slate-400 font-bold uppercase">
                                    {d.nama} : {d.keterangan}
                                </td>
                                <td className="p-2 text-right border-r border-slate-400">{printData.tipe === 'K' ? Number(d.nominal).toLocaleString('id-ID', { minimumFractionDigits: 2 }) : '0.00'}</td>
                                <td className="p-2 text-right">{printData.tipe === 'T' ? Number(d.nominal).toLocaleString('id-ID', { minimumFractionDigits: 2 }) : '0.00'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-500">
                            <td colSpan={3} className="p-2 text-right border-r border-slate-400">TOTAL</td>
                            <td className="p-2 text-right border-r border-slate-400">{Number(printData.total).toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right">{Number(printData.total).toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>

                <div className="grid grid-cols-3 gap-8 text-center text-xs mt-12 pt-4">
                    <div><p className="mb-16 font-semibold">Diterima</p><p className="font-bold underline">( Keuangan )</p></div>
                    <div><p className="mb-16 font-semibold">Disetujui</p><p className="font-bold underline">( Direksi )</p></div>
                    <div><p className="mb-16 font-semibold">Diketahui</p><p className="font-bold underline">( Akunting )</p></div>
                </div>
            </div>
        </div>
    ) : null;

    // 🗑️ Fungsi Batalkan / Void Transaksi Kas
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
                        text: err.response?.data?.message || 'Gagal menghapus data transaksi.',
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

    return (
        <div className="space-y-4">
            <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                    <Filter size={16} className="text-sky-600" />
                    FILTER PENCATATAN CASH - BANK
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="font-bold text-slate-500 block mb-1">TGL MULAI</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500" />
                        </div>
                        <div className="flex-1">
                            <label className="font-bold text-slate-500 block mb-1">TGL SAMPAI</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500" />
                        </div>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">CABANG / TRANSAKSI</label>
                        <select value={selectedCabang} onChange={(e) => setSelectedCabang(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500">
                            <option value="">-- SEMUA CABANG --</option>
                            {cabangList.map((cabang, idx) => (
                                <option key={idx} value={cabang.agen_nama || cabang.AgenNama}>{cabang.agen_nama || cabang.AgenNama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">JENIS TRANSAKSI</label>
                        <select value={selectedTipe} onChange={(e) => setSelectedTipe(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500">
                            <option value="">-- SEMUA TIPE --</option>
                            <option value="K">Keluar Kas (K)</option>
                            <option value="T">Terima Kas (T)</option>
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">NO. TRANSAKSI</label>
                        <input type="text" placeholder="Ketik No Transaksi..." value={searchNoTrans} onChange={(e) => setSearchNoTrans(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500" />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onClick={handleResetFilter} className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer">
                        RESET
                    </button>
                    <button type="submit" className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer">
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
            {printModalElement && ReactDOM.createPortal(printModalElement, document.body)}
        </div>
    );
};

export default KasMasukKeluar;