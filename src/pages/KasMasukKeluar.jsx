import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Filter, Printer, X, ArrowLeft, Search, Trash2, Edit,
    RotateCcw, RefreshCw, Plus, FileSpreadsheet, FileCheck, ScanLine
} from 'lucide-react';
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

    // Helper dinamis mengambil PT aktif dari session/localStorage tanpa hardcode 'C'
    const getActivePtId = () => localStorage.getItem('pt_id') || localStorage.getItem('selected_pt') || '';
    const getDefaultAgenId = () => localStorage.getItem('agen_id') || localStorage.getItem('server_id') || (cabangList[0]?.agen_id || cabangList[0]?.AgenID || '');

    const [isCashFlowOpen, setIsCashFlowOpen] = useState(false);
    const [cashFlowData, setCashFlowData] = useState(null);
    const [loadingCashFlow, setLoadingCashFlow] = useState(false);

    const [isBPLKModalOpen, setIsBPLKModalOpen] = useState(false);
    const [noSuratTugas, setNoSuratTugas] = useState('');

    // 🌟 STATE TOGGLE FILTER (BUKA / TUTUP)
    const [showFilter, setShowFilter] = useState(true);

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
        cb_nourut: '',
        cb_tanggal: today,
        cb_tipe: 'K',
        cb_transagenid: '',
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

    // State Sumber Dana E-TOLL (sesuai gl_t_cashbank_e.asp)
    const [etollSearch, setEtollSearch] = useState('');
    const [etollOptions, setEtollOptions] = useState([]);
    const [selectedEtoll, setSelectedEtoll] = useState(null);
    const [showEtollDropdown, setShowEtollDropdown] = useState(false);

    // State Realisasi BPLK (sesuai gl_t_cashbank_e_t_r.asp)
    const [realisasiData, setRealisasiData] = useState(null);
    const [loadingRealisasi, setLoadingRealisasi] = useState(false);
    const [tglPostingKomisi, setTglPostingKomisi] = useState(today);
    const [tglPostingRealisasi, setTglPostingRealisasi] = useState(today);
    const [komisiBaruList, setKomisiBaruList] = useState([]);
    const [komisiForm, setKomisiForm] = useState({
        no: '',
        noBTT: '',
        layanan: '',
        beratBTT: '',
        tarif: '',
        biayaKirim: '',
        asalKota: '',
        tujuanKota: '',
        komisi: ''
    });

    // 🌟 STATE ALUR LENGKAP BPLK
    const [bplkStep, setBplkStep] = useState(1); // 1 = Input ST, 2 = Detail BPLK & Riwayat Kas
    const [bplkData, setBplkData] = useState(null);
    const [loadingBPLK, setLoadingBPLK] = useState(false);

    // Modal Pencairan Uang Muka (Gambar 5 & 6)
    const [isPencairanOpen, setIsPencairanOpen] = useState(false);
    const [inputKreditValues, setInputKreditValues] = useState({});

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

    //start
    // Eksekusi Cari Data Pengajuan Surat Tugas (Gambar 2 -> Gambar 3)
    const handleFetchBPLKDetail = async (stNumber) => {
        const cleanST = (stNumber || noSuratTugas).trim();
        if (!cleanST) {
            Swal.fire('Peringatan', 'Silakan masukkan nomor surat tugas!', 'warning');
            return;
        }

        setLoadingBPLK(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = getActivePtId();
            const res = await api.get(`/gl/cashbank/bplk/detail?st=${encodeURIComponent(cleanST)}&pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setBplkData(res.data?.data);
            setBplkStep(2); // Pindah ke tampilan Gambar 3
        } catch (err) {
            Swal.fire('Gagal!', err.response?.data?.message || 'Nomor Surat Tugas tidak ditemukan!', 'error');
        } finally {
            setLoadingBPLK(false);
        }
    };

    // Buka Modal Pencairan Uang Muka (Gambar 4 -> Gambar 5)
    const handleOpenPencairanUangMuka = () => {
        if (!bplkData) return;
        // Inisialisasi input kredit awal bernilai 0
        const initialKredit = {};
        bplkData.akun_kredit.forEach(ak => {
            initialKredit[ak.acc_code] = 0;
        });
        setInputKreditValues(initialKredit);
        setIsPencairanOpen(true);
    };

    // Simpan Kas Keluar Uang Muka BPLK (Gambar 6 -> Gambar 7)
    const handleProsesKasKeluarBPLK = async () => {
        const totalDebet = bplkData.total_uang_muka;
        let totalInputKredit = 0;
        const kreditPayload = [];

        Object.keys(inputKreditValues).forEach(code => {
            const val = Number(inputKreditValues[code] || 0);
            totalInputKredit += val;
            if (val > 0) {
                const foundAkun = bplkData.akun_kredit.find(a => a.acc_code === code);
                kreditPayload.push({
                    acc_code: code,
                    acc_name: foundAkun ? foundAkun.acc_name : '',
                    nominal: val
                });
            }
        });

        if (totalInputKredit !== totalDebet) {
            Swal.fire('Peringatan', `Total input kredit (Rp ${totalInputKredit.toLocaleString('id-ID')}) harus sama dengan total uang muka (Rp ${totalDebet.toLocaleString('id-ID')})!`, 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = getActivePtId();

            const payload = {
                sjh_id: bplkData.sjh_id,
                tanggal: today,
                debet_list: bplkData.item_debet,
                kredit_list: kreditPayload
            };

            const res = await api.post(`/gl/cashbank/bplk/proses-uang-muka?pt_id=${ptId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                title: 'SUKSES!',
                text: res.data?.message || 'Pencairan Kas Keluar BPLK Berhasil!',
                icon: 'success'
            });

            setIsPencairanOpen(false);
            // Refresh data BPLK agar tabel kas keluar langsung terupdate (Gambar 7)
            handleFetchBPLKDetail(bplkData.sjh_id);
            fetchCashBankData();
        } catch (err) {
            Swal.fire('Gagal!', err.response?.data?.message || 'Gagal memproses pencairan kas.', 'error');
        }
    };

    //end

    const fetchCashBankData = async (forceFilter = isFilterActive) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let queryParams = `/gl/cashbank?limit=500`;

            if (forceFilter) {
                // Jika mencari No. Transaksi spesifik, jangan dikunci tanggal hari ini saja
                if (!searchNoTrans.trim() && startDate && endDate) {
                    queryParams += `&start_date=${startDate}&end_date=${endDate}`;
                }
                if (selectedCabang) queryParams += `&cabang_nama=${encodeURIComponent(selectedCabang)}`;
                if (selectedTipe) queryParams += `&tipe=${encodeURIComponent(selectedTipe)}`;
                if (searchNoTrans.trim()) queryParams += `&no_trans=${encodeURIComponent(searchNoTrans.trim())}`;
                if (searchNoJurnal.trim()) queryParams += `&no_jurnal=${encodeURIComponent(searchNoJurnal.trim())}`;
                if (selectedAktif) queryParams += `&aktif_yn=${encodeURIComponent(selectedAktif)}`;
                if (selectedPosting) queryParams += `&posting_yn=${encodeURIComponent(selectedPosting)}`;
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
            cb_nourut: '',
            cb_tanggal: today,
            cb_tipe: defaultTipe,
            cb_transagenid: String(getDefaultAgenId()),
            cb_pembuat: localStorage.getItem('username') || '',
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
            cb_nourut: item.cb_nourut || '',
            cb_tanggal: item.cb_tanggal || today,
            cb_tipe: item.cb_tipe || 'K',
            cb_transagenid: String(item.cb_transagenid || item.cb_agenid || getDefaultAgenId()),
            cb_pembuat: item.cb_pembuat || localStorage.getItem('username') || '',
            cb_ket: item.cb_ket !== '-' ? item.cb_ket : '',
            cb_notrans_um_sebelumnya: '',
            cb_postyn: item.cb_postyn || 'N',
            cb_nojurnal: item.cb_nojurnal || '-'
        });

        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/gl/cashbank/detail?cb_id=${encodeURIComponent(item.cb_id)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const details = res.data?.details || res.data?.data || [];
            setRincianList(details.map(d => ({
                nama_biaya: d.item_name || d.cbd_ket,
                item_id: d.cbd_itemid,
                keterangan: d.cbd_ket || d.item_name,
                quantity: d.cbd_quantity,
                harga_satuan: d.cbd_hargasatuan,
                subtotal: d.cbd_quantity * d.cbd_hargasatuan
            })));
        } catch (err) {
            console.error("Gagal mengambil rincian kas:", err);
            setRincianList([]);
            Swal.fire({
                title: 'Gagal Memuat Rincian',
                text: err.response?.data?.message || 'Tidak dapat memuat rincian item dari database.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }

        setIsModalOpen(true);
    };

    const handleSaveForm = async () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        let finalRincian = [...rincianList];
        if (showTambahRincian && detailForm.item_id && Number(detailForm.harga_satuan) > 0) {
            const subtotal = Number(detailForm.quantity || 1) * Number(detailForm.harga_satuan);
            finalRincian.push({ ...detailForm, subtotal });
            setRincianList(finalRincian);
            setDetailForm({ nama_biaya: '', item_id: '', keterangan: '', quantity: 1, harga_satuan: 0 });
            setShowTambahRincian(false);
        }

        const totalNominal = finalRincian.reduce((acc, curr) => acc + Number(curr.subtotal), 0);

        if (totalNominal <= 0) {
            Swal.fire({
                title: 'Gagal Simpan',
                text: 'Tambahkan minimal 1 rincian kas dengan nominal!',
                icon: 'warning',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
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
                details: finalRincian.map(r => ({
                    item_id: r.item_id,
                    keterangan: r.keterangan || r.nama_biaya,
                    quantity: Number(r.quantity),
                    harga_satuan: Number(r.harga_satuan)
                }))
            };

            const res = await api.post(endpoint, payload, { headers: { Authorization: `Bearer ${token}` } });

            const savedNoTrans = res.data?.cb_id || res.data?.no_trans || formData.cb_id;
            setFormData(prev => ({ ...prev, cb_id: savedNoTrans, cb_postyn: prev.cb_postyn || 'N' }));
            setIsEditMode(true);

            Swal.fire({
                title: 'BERHASIL DISIMPAN!',
                text: `Transaksi ${savedNoTrans} berhasil disimpan. Sekarang Anda dapat memposting transaksi ini.`,
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
                text: err.response?.data?.message || 'Gagal menyimpan transaksi.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
    };

    const openPostingModal = (item) => {
        setSelectedItemForPosting(item);
        setSumberDana('kas operasional dk');
        setSelectedBank(null);
        setBankSearch('');
        setShowBankDropdown(false);
        setSelectedEtoll(null);
        setEtollSearch('');
        setShowEtollDropdown(false);
        setIsPostingModalOpen(true);
    };

    const handleSearchBank = async (query = '') => {
        setBankSearch(query);
        setShowBankDropdown(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = getActivePtId();

            const res = await api.get(`/gl/bank-data?search=${encodeURIComponent(query)}&pt_id=${encodeURIComponent(ptId)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const resultData = res.data?.data || [];
            setBankOptions(Array.isArray(resultData) ? resultData : []);
        } catch (err) {
            console.error("Gagal memuat bank dari database:", err);
            setBankOptions([]);
        }
    };

    const handleSearchEtoll = async (query = '') => {
        setEtollSearch(query);
        setShowEtollDropdown(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = getActivePtId();
            const res = await api.get(`/gl/etoll-data?q=toll&search=${encodeURIComponent(query)}&pt_id=${encodeURIComponent(ptId)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const resultData = res.data?.data || [];
            setEtollOptions(Array.isArray(resultData) ? resultData : []);
        } catch (err) {
            console.error("Gagal memuat E-TOLL:", err);
            setEtollOptions([]);
        }
    };

    const handleProceedPosting = async () => {
        if (!selectedItemForPosting) return;

        if (sumberDana === 'bank' && !selectedBank) {
            Swal.fire({ title: 'Peringatan', text: 'Silakan pilih bank dari dropdown terlebih dahulu!', icon: 'warning', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
            return;
        }

        if (sumberDana === 'etoll' && !selectedEtoll) {
            Swal.fire({ title: 'Peringatan', text: 'Silakan pilih E-TOLL dari dropdown terlebih dahulu!', icon: 'warning', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const payload = {
                cb_id: selectedItemForPosting.cb_id,
                sumber_dana: sumberDana,
                bank_code: selectedBank?.code || '',
                bank_name: selectedBank?.name || '',
                etoll_code: selectedEtoll?.code || '',
                etoll_name: selectedEtoll?.name || ''
            };

            const res = await api.post('/gl/cashbank/post', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                title: 'POSTING BERHASIL!',
                text: res.data?.message || `Transaksi Kas ${selectedItemForPosting.cb_id} berhasil diposting.`,
                icon: 'success',
                didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; }
            });

            setIsPostingModalOpen(false);
            if (isModalOpen) setIsModalOpen(false);
            fetchCashBankData();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL POSTING!',
                text: err.response?.data?.message || 'Terjadi kesalahan saat posting transaksi.',
                icon: 'error',
                didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; }
            });
        }
    };

    const handleOpenRealisasiBPLK = async () => {
        if (!bplkData?.sjh_id) return;
        setLoadingRealisasi(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = getActivePtId();
            const res = await api.get(`/gl/cashbank/bplk/realisasi?st=${encodeURIComponent(bplkData.sjh_id)}&pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRealisasiData(res.data?.data);
            setKomisiBaruList([]);
            setTglPostingKomisi(today);
            setTglPostingRealisasi(today);
            setBplkStep(3);
        } catch (err) {
            Swal.fire({
                title: 'Gagal!',
                text: err.response?.data?.message || 'Template uang muka belum dibuat atau gagal memuat data realisasi.',
                icon: 'error',
                didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; }
            });
        } finally {
            setLoadingRealisasi(false);
        }
    };

    // Otomatisasi Form Komisi (Carter = Biaya Kirim * 0.03 | Regular = Berat * Tarif)
    const handleKomisiFormChange = (field, value) => {
        setKomisiForm((prev) => {
            const updated = { ...prev, [field]: value };

            if (field === 'layanan') {
                if (value === 'Carter') {
                    updated.beratBTT = 0;
                    updated.asalKota = '-';
                    updated.tujuanKota = '-';
                    updated.tarif = 0.03;
                    updated.biayaKirim = '';
                    updated.komisi = '';
                } else if (value === 'Regular') {
                    updated.biayaKirim = 0;
                    updated.beratBTT = '';
                    updated.tarif = '';
                    updated.asalKota = '';
                    updated.tujuanKota = '';
                    updated.komisi = '';
                }
            }

            if (updated.layanan === 'Carter') {
                const bk = parseFloat(updated.biayaKirim) || 0;
                const trf = parseFloat(updated.tarif) || 0.03;
                updated.komisi = (bk * trf).toFixed(2);
            } else if (updated.layanan === 'Regular') {
                const brt = parseFloat(updated.beratBTT) || 0;
                const trf = parseFloat(updated.tarif) || 0;
                updated.komisi = (brt * trf).toFixed(2);
            }

            return updated;
        });
    };

    const handleTambahKomisiSementara = () => {
        const { no, noBTT, layanan, beratBTT, tarif, biayaKirim, asalKota, tujuanKota, komisi } = komisiForm;
        if (!no.trim() || !noBTT.trim() || !layanan || isNaN(parseFloat(beratBTT)) || isNaN(parseFloat(tarif)) || isNaN(parseFloat(biayaKirim)) || !asalKota.trim() || !tujuanKota.trim() || isNaN(parseFloat(komisi))) {
            Swal.fire({ title: 'Peringatan', text: 'Mohon lengkapi semua field komisi dengan benar!', icon: 'warning', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
            return;
        }

        setKomisiBaruList((prev) => [
            ...prev,
            {
                no: no.trim(),
                noBTT: noBTT.trim(),
                layanan,
                beratBTT: parseFloat(beratBTT),
                tarif: parseFloat(tarif),
                biayaKirim: parseFloat(biayaKirim),
                asalKota: asalKota.trim().toUpperCase(),
                tujuanKota: tujuanKota.trim().toUpperCase(),
                komisi: parseFloat(komisi)
            }
        ]);

        setKomisiForm({ no: '', noBTT: '', layanan: '', beratBTT: '', tarif: '', biayaKirim: '', asalKota: '', tujuanKota: '', komisi: '' });
    };

    const handleSimpanKomisiDB = async () => {
        if (komisiBaruList.length === 0) {
            Swal.fire({ title: 'Info', text: 'Tidak ada data komisi tambahan untuk disimpan!', icon: 'info', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/gl/cashbank/bplk/simpan-komisi', {
                sjId: bplkData.sjh_id,
                komisiData: komisiBaruList
            }, { headers: { Authorization: `Bearer ${token}` } });

            Swal.fire({ title: 'BERHASIL!', text: 'Data komisi tambahan berhasil disimpan ke database.', icon: 'success', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
            handleOpenRealisasiBPLK();
        } catch (err) {
            Swal.fire({ title: 'GAGAL!', text: err.response?.data?.message || 'Gagal menyimpan komisi.', icon: 'error', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
        }
    };

    const handlePostingKomisiBPLK = async (totalKomisiGabungan) => {
        if (!tglPostingKomisi || tglPostingKomisi > today) {
            Swal.fire({ title: 'Peringatan', text: 'Tanggal posting komisi harus kurang dari atau sama dengan hari ini!', icon: 'warning', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await api.post('/gl/cashbank/bplk/posting-komisi', {
                sjId: bplkData.sjh_id,
                totalKomisi: totalKomisiGabungan,
                tanggalPosting: tglPostingKomisi
            }, { headers: { Authorization: `Bearer ${token}` } });

            Swal.fire({ title: 'BERHASIL!', text: 'Komisi BPLK berhasil diposting.', icon: 'success', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
            handleOpenRealisasiBPLK();
        } catch (err) {
            Swal.fire({ title: 'GAGAL!', text: err.response?.data?.message || 'Gagal posting komisi.', icon: 'error', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
        }
    };

    const handleUnpostingKomisiBPLK = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.post('/gl/cashbank/bplk/unposting-komisi', { sjId: bplkData.sjh_id }, { headers: { Authorization: `Bearer ${token}` } });
            Swal.fire({ title: 'BERHASIL!', text: 'Unposting komisi berhasil.', icon: 'success', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
            handleOpenRealisasiBPLK();
        } catch (err) {
            Swal.fire({ title: 'GAGAL!', text: err.response?.data?.message || 'Gagal unposting komisi.', icon: 'error', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
        }
    };

    const handlePostingRealisasiBPLK = async () => {
        if (!tglPostingRealisasi || tglPostingRealisasi > today) {
            Swal.fire({ title: 'Peringatan', text: 'Tanggal posting realisasi harus kurang dari atau sama dengan hari ini!', icon: 'warning', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await api.post('/gl/cashbank/bplk/posting-realisasi', {
                sjId: bplkData.sjh_id,
                tanggalPosting: tglPostingRealisasi
            }, { headers: { Authorization: `Bearer ${token}` } });

            Swal.fire({ title: 'BERHASIL!', text: 'Realisasi BPLK berhasil diposting.', icon: 'success', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
            handleOpenRealisasiBPLK();
        } catch (err) {
            Swal.fire({ title: 'GAGAL!', text: err.response?.data?.message || 'Gagal posting realisasi.', icon: 'error', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
        }
    };

    const handleUnpostingRealisasiBPLK = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.post('/gl/cashbank/bplk/unposting-realisasi', { sjId: bplkData.sjh_id }, { headers: { Authorization: `Bearer ${token}` } });
            Swal.fire({ title: 'BERHASIL!', text: 'Unposting realisasi berhasil.', icon: 'success', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
            handleOpenRealisasiBPLK();
        } catch (err) {
            Swal.fire({ title: 'GAGAL!', text: err.response?.data?.message || 'Gagal unposting realisasi.', icon: 'error', didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999999'; } });
        }
    };


    const handleUnposting = async (cb_id) => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        Swal.fire({
            title: 'Batalkan Posting?',
            text: `Yakin ingin unposting transaksi kas ${cb_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Unposting!',
            cancelButtonText: 'Batal',
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.post('/gl/cashbank/unpost', { cb_id }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire({
                        title: 'BERHASIL UNPOSTING!',
                        text: `Transaksi Kas ${cb_id} kembali ke status Unposted. Sekarang data dapat diedit.`,
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });

                    // Ubah state modal edit langsung ke UNPOSTED agar bisa langsung diedit tanpa tutup modal
                    setFormData(prev => ({ ...prev, cb_postyn: 'N', cb_nojurnal: '-' }));
                    fetchCashBankData();
                } catch (err) {
                    Swal.fire({
                        title: 'GAGAL!',
                        text: err.response?.data?.message || 'Gagal unposting.',
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


    const handlePrint = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = getActivePtId();
            const ptQuery = ptId ? `?pt_id=${encodeURIComponent(ptId)}` : '';

            let details = [];
            let lawanName = '';
            let lawanCode = '';
            let lawanAgenId = item.cb_agenid || item.cb_transagenid || '';
            let totalAmount = Number(item.total_amount || item.cb_total || 0);

            const fetchNamaAkunCOA = async (accCode) => {
                if (!accCode || accCode === '-') return '';
                const cleanCode = String(accCode).trim();
                try {
                    const coaRes = await api.get(`/gl/kode-perkiraan?limit=1000`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const foundCoa = (coaRes.data?.data || []).find(
                        c => String(c.ca_id).trim() === cleanCode
                    );
                    if (foundCoa?.ca_name) return foundCoa.ca_name;

                    const bankRes = await api.get(`/gl/bank-data?search=${encodeURIComponent(cleanCode)}${ptId ? `&pt_id=${encodeURIComponent(ptId)}` : ''}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const foundBank = (bankRes.data?.data || []).find(
                        b => String(b.code).trim() === cleanCode
                    );
                    return foundBank?.name || '';
                } catch {
                    return '';
                }
            };

            if (item.cb_nojurnal && item.cb_nojurnal !== '-' && item.cb_nojurnal !== '') {
                const jRes = await api.get(`/gl/jurnal/detail/${encodeURIComponent(item.cb_nojurnal)}${ptQuery}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const jDetails = jRes.data?.details || [];

                const lawanRow = item.cb_tipe === 'K'
                    ? jDetails.find(d => Number(d.tjurd_kredit) > 0)
                    : jDetails.find(d => Number(d.tjurd_debet) > 0);

                if (lawanRow) {
                    lawanCode = lawanRow.tjurd_acccode || '';
                    lawanAgenId = lawanRow.tjurd_agenid || lawanAgenId;
                    lawanName = (lawanRow.ca_name && lawanRow.ca_name !== '-')
                        ? lawanRow.ca_name
                        : await fetchNamaAkunCOA(lawanCode);
                }

                const detailRows = item.cb_tipe === 'K'
                    ? jDetails.filter(d => Number(d.tjurd_debet) > 0)
                    : jDetails.filter(d => Number(d.tjurd_kredit) > 0);

                details = await Promise.all(detailRows.map(async (d) => {
                    const accCode = d.tjurd_acccode || '';
                    const namaAkun = (d.ca_name && d.ca_name !== '-')
                        ? d.ca_name
                        : await fetchNamaAkunCOA(accCode);

                    return {
                        code: accCode,
                        agenId: d.tjurd_agenid || lawanAgenId,
                        nama: namaAkun,
                        keterangan: d.tjurd_keterangan || '',
                        nominal: Number(item.cb_tipe === 'K' ? d.tjurd_debet : d.tjurd_kredit) || 0
                    };
                }));

                if (details.length > 0) {
                    totalAmount = details.reduce((sum, d) => sum + Number(d.nominal), 0);
                }
            } else {
                const cbRes = await api.get(`/gl/cashbank/detail?cb_id=${encodeURIComponent(item.cb_id)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const rawDetails = cbRes.data?.details || [];
                if (rawDetails.length > 0) {
                    details = rawDetails.map(d => ({
                        code: d.item_owncaid || d.cbd_itemid,
                        agenId: d.cbd_agenid || lawanAgenId,
                        nama: d.item_name || '',
                        keterangan: d.cbd_ket || d.item_name || '',
                        nominal: Number(d.cbd_quantity * d.cbd_hargasatuan) || 0
                    }));
                    totalAmount = details.reduce((sum, d) => sum + Number(d.nominal), 0);
                } else {
                    Swal.fire({
                        title: 'Data Belum Lengkap',
                        text: 'Transaksi ini belum diposting dan tidak memiliki rincian biaya di database.',
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
                keterangan: item.cb_ket || '',
                tipe: item.cb_tipe,
                total: totalAmount,
                lawanCode,
                lawanName,
                lawanAgenId,
                details
            });
            setIsPrintOpen(true);
        } catch (err) {
            console.error("Gagal memuat voucher cetak:", err);
            Swal.fire({
                title: 'GAGAL PRINT',
                text: err.response?.data?.message || 'Tidak dapat memuat data rincian kas untuk dicetak.',
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
            header: 'TYPE',
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

    ];

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
                                <select
                                    value={formData.cb_transagenid}
                                    onChange={(e) => setFormData({ ...formData, cb_transagenid: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-indigo-600"
                                >
                                    <option value="">-- Pilih Cabang / Transaksi --</option>
                                    {cabangList.map((cabang, idx) => (
                                        <option key={idx} value={String(cabang.agen_id || cabang.AgenID)}>
                                            {cabang.agen_nama || cabang.AgenNama}
                                        </option>
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

                            <div className="col-span-2 md:col-span-4">
                                <span className="text-slate-400 font-bold block mb-1">KETERANGAN :</span>
                                {formData.cb_postyn?.trim() !== 'Y' ? (
                                    <input
                                        type="text"
                                        value={formData.cb_ket}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val.includes(',')) {
                                                Swal.fire({
                                                    title: 'Peringatan',
                                                    text: 'Tidak boleh menggunakan karakter koma (,) dalam keterangan',
                                                    icon: 'warning',
                                                    didOpen: () => {
                                                        const c = document.querySelector('.swal2-container');
                                                        if (c) c.style.zIndex = '9999999';
                                                    }
                                                });
                                                setFormData({ ...formData, cb_ket: val.replace(/,/g, '') });
                                            } else {
                                                setFormData({ ...formData, cb_ket: val });
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-sky-500"
                                    />
                                ) : (
                                    <span className="font-medium text-slate-700">{formData.cb_ket}</span>
                                )}
                            </div>
                        </div>

                        {/* Tabel Rincian Kas */}
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
                                            {formData.cb_postyn?.trim() !== 'Y' && <th className="p-2.5 text-center">AKSI</th>}
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
                                                {formData.cb_postyn?.trim() !== 'Y' && (
                                                    <td className="p-2.5 text-center flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            title="Edit Rincian"
                                                            onClick={() => {
                                                                setDetailForm({
                                                                    nama_biaya: item.nama_biaya,
                                                                    item_id: item.item_id,
                                                                    keterangan: item.keterangan || item.nama_biaya,
                                                                    quantity: item.quantity,
                                                                    harga_satuan: item.harga_satuan
                                                                });
                                                                handleDeleteRincian(idx);
                                                                setShowTambahRincian(true);
                                                            }}
                                                            className="text-sky-600 hover:text-sky-800 p-1 cursor-pointer"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Hapus Rincian"
                                                            onClick={() => handleDeleteRincian(idx)}
                                                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-100 font-black">
                                        <tr>
                                            <td colSpan={4} className="p-2.5 text-right uppercase">TOTAL NOMINAL :</td>
                                            <td className="p-2.5 text-right font-mono text-emerald-700 text-sm">
                                                Rp {rincianList.reduce((acc, curr) => acc + Number(curr.subtotal), 0).toLocaleString('id-ID')}
                                            </td>
                                            {formData.cb_postyn?.trim() !== 'Y' && <td></td>}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                        {/* Form Tambah Rincian hanya muncul jika status belum posting (cb_postyn !== 'Y') */}
                        {formData.cb_postyn?.trim() !== 'Y' && (
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
                        )}

                        {/* ... Footer tombol SIMPAN / POSTING / UNPOSTING / CETAK / KELUAR ... */}
                        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-3">
                                {formData.cb_postyn?.trim() !== 'Y' && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.currentTarget.blur(); // <-- Lepas fokus sebelum Swal.fire muncul
                                            handleSaveForm();
                                        }}
                                        className="px-8 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black rounded-lg transition shadow-md uppercase cursor-pointer"
                                    >
                                        SIMPAN
                                    </button>
                                )}

                                {formData.cb_postyn?.trim() === 'Y' ? (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.currentTarget.blur();
                                            handleUnposting(formData.cb_id);
                                        }}
                                        className="px-8 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition shadow-md uppercase cursor-pointer"
                                    >
                                        UNPOSTING
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={!formData.cb_id || formData.cb_id === 'AUTO GENERATE'}
                                        onClick={(e) => {
                                            e.currentTarget.blur();
                                            openPostingModal(formData);
                                        }}
                                        className={`px-8 py-2.5 font-bold rounded-lg transition uppercase ${!formData.cb_id || formData.cb_id === 'AUTO GENERATE'
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                                            : 'bg-sky-600 hover:bg-sky-700 text-white shadow-md cursor-pointer'
                                            }`}
                                    >
                                        POSTING
                                    </button>
                                )}

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

    const postingModalElement = isPostingModalOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity" style={{ zIndex: 999999 }}>
            <div className="w-full max-w-md rounded-2xl shadow-2xl bg-white text-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
                            <input
                                type="radio"
                                name="sumberDana"
                                value={opt.val}
                                checked={sumberDana === opt.val}
                                onChange={(e) => {
                                    setSumberDana(e.target.value);
                                    setSelectedBank(null);
                                    setSelectedEtoll(null);
                                }}
                                className="w-4 h-4 text-sky-600"
                            />
                            <span>{opt.label}</span>
                        </label>
                    ))}

                    {/* OPSI BANK */}
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
                                    setSelectedEtoll(null);
                                    setBankSearch('');
                                    handleSearchBank('');
                                }}
                                className="w-4 h-4 text-sky-600 cursor-pointer"
                            />
                            <span className="font-bold text-slate-800">BANK</span>
                        </label>

                        {selectedBank && (
                            <div className="text-xs text-sky-600 font-bold italic mt-2 ml-7 bg-white p-2 rounded-lg border border-sky-200 flex items-center justify-between shadow-xs">
                                <span>✓ {selectedBank.name} ({selectedBank.code})</span>
                                <span className="text-[10px] text-slate-400 font-normal">Klik pencarian untuk ganti</span>
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

                    {/* OPSI E-TOLL */}
                    <div className={`p-3 rounded-xl border transition ${sumberDana === 'etoll' ? 'border-sky-500 bg-sky-50/50' : 'border-slate-200'}`}>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="sumberDana"
                                value="etoll"
                                checked={sumberDana === 'etoll'}
                                onChange={() => {
                                    setSumberDana('etoll');
                                    setSelectedBank(null);
                                    setSelectedEtoll(null);
                                    setEtollSearch('');
                                    handleSearchEtoll('');
                                }}
                                className="w-4 h-4 text-sky-600 cursor-pointer"
                            />
                            <span className="font-bold text-slate-800">E-TOLL</span>
                        </label>

                        {selectedEtoll && (
                            <div className="text-xs text-sky-600 font-bold italic mt-2 ml-7 bg-white p-2 rounded-lg border border-sky-200 flex items-center justify-between shadow-xs">
                                <span>✓ {selectedEtoll.name} ({selectedEtoll.code})</span>
                                <span className="text-[10px] text-slate-400 font-normal">Klik pencarian untuk ganti</span>
                            </div>
                        )}

                        {sumberDana === 'etoll' && (
                            <div className="mt-3 ml-7 space-y-2 relative">
                                <input
                                    type="text"
                                    placeholder="Cari E-TOLL di database..."
                                    value={etollSearch}
                                    onChange={(e) => handleSearchEtoll(e.target.value)}
                                    onFocus={() => handleSearchEtoll(etollSearch)}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 outline-none focus:border-sky-500 bg-white font-medium text-slate-800 shadow-inner"
                                />
                                {showEtollDropdown && (
                                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl divide-y divide-slate-100 text-xs mt-1 z-50">
                                        {etollOptions.length > 0 ? (
                                            etollOptions.map((et, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setSelectedEtoll(et);
                                                        setShowEtollDropdown(false);
                                                        setEtollSearch('');
                                                    }}
                                                    className="p-2.5 hover:bg-sky-100 cursor-pointer transition flex flex-col text-slate-700"
                                                >
                                                    <span className="font-bold text-slate-800">{et.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">Kode: {et.code}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 text-center text-slate-400 font-medium">Data E-TOLL tidak ditemukan</div>
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

    const printModalElement = isPrintOpen && printData ? (
        <div className="fixed inset-0 z-[999999] bg-white overflow-y-auto p-8 print:p-0">
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
                        {/* BARIS ATAS: DEBET (RINCIAN BIAYA / ITEM) */}
                        {printData.details.map((d, i) => (
                            <tr key={i} className="border-b border-slate-300">
                                <td className="p-2 border-r border-slate-400">{d.code}</td>
                                <td className="p-2 text-center border-r border-slate-400">{d.agenId || '-'}</td>
                                <td className="p-2 border-r border-slate-400 font-bold uppercase">
                                    {d.keterangan || d.nama || '-'}
                                </td>
                                <td className="p-2 text-right border-r border-slate-400">
                                    {printData.tipe === 'K' ? Number(d.nominal).toLocaleString('id-ID', { minimumFractionDigits: 2 }) : '0.00'}
                                </td>
                                <td className="p-2 text-right">
                                    {printData.tipe === 'T' ? Number(d.nominal).toLocaleString('id-ID', { minimumFractionDigits: 2 }) : '0.00'}
                                </td>
                            </tr>
                        ))}

                        {/* BARIS BAWAH: KREDIT (AKUN BANK / SUMBER DANA) */}
                        <tr className="border-b border-slate-300">
                            <td className="p-2 border-r border-slate-400">{printData.lawanCode}</td>
                            <td className="p-2 text-center border-r border-slate-400">{printData.lawanAgenId || '-'}</td>
                            <td className="p-2 border-r border-slate-400 font-bold uppercase">
                                {printData.lawanName || printData.keterangan || '-'}
                            </td>
                            <td className="p-2 text-right border-r border-slate-400">
                                {printData.tipe === 'T' ? Number(printData.total).toLocaleString('id-ID', { minimumFractionDigits: 2 }) : '0.00'}
                            </td>
                            <td className="p-2 text-right">
                                {printData.tipe === 'K' ? Number(printData.total).toLocaleString('id-ID', { minimumFractionDigits: 2 }) : '0.00'}
                            </td>
                        </tr>
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

    // 🌟 Handler Cetak Laporan Cash Flow
    const handleOpenLaporanCashFlow = async () => {
        setLoadingCashFlow(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = getActivePtId();

            let url = `/gl/cashbank/laporan-cashflow?pt_id=${ptId}&start_date=${startDate}&end_date=${endDate}`;
            if (selectedCabang && selectedCabang !== '-- SEMUA CABANG --') {
                url += `&cabang_nama=${encodeURIComponent(selectedCabang)}`;
            }

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setCashFlowData(res.data);
            setIsCashFlowOpen(true);
        } catch (err) {
            Swal.fire('Gagal!', err.response?.data?.message || 'Gagal mengambil data laporan cash flow.', 'error');
        } finally {
            setLoadingCashFlow(false);
        }
    };

    {/* 🌟 MODAL LENGKAP BPLK 8 TAHAPAN SESUAI SISTEM LAWAS */ }
    const bplkModalElement = isBPLKModalOpen ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[95vh]">

                {/* Header Modal */}
                <div className="bg-[#004b84] px-6 py-3.5 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                            <ScanLine size={18} className="text-amber-300" />
                            BPLK (BIAYA PENGELUARAN LEMBAR KERJA)
                        </h2>
                        {bplkData && bplkStep === 2 && (
                            <span className="text-xs font-mono text-emerald-300 font-bold block mt-0.5">
                                NO. SURAT TUGAS: {bplkData.sjh_id}
                            </span>
                        )}
                    </div>
                    <button onClick={() => setIsBPLKModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
                    {/* TAHAP 1: INPUT NO SURAT TUGAS (GAMBAR 2) */}
                    {bplkStep === 1 && (
                        <div className="max-w-lg mx-auto py-8 space-y-5">
                            <div className="border border-slate-200 bg-slate-50 p-6 rounded-2xl shadow-inner space-y-3">
                                <label className="font-bold text-slate-800 block text-xs tracking-wide uppercase">
                                    MASUKKAN NOMOR SURAT TUGAS :
                                </label>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Ketikkan Nomor Surat Tugas atau scan barcode..."
                                    value={noSuratTugas}
                                    onChange={(e) => setNoSuratTugas(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleFetchBPLKDetail(e.target.value);
                                    }}
                                    className="w-full p-3.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 text-sm outline-none focus:border-sky-500 shadow-xs uppercase"
                                />
                                <span className="text-[11px] text-slate-400 italic block">
                                    * Contoh: 001JC2026110114 (Tekan Enter atau klik tombol hijau di bawah)
                                </span>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => handleFetchBPLKDetail(noSuratTugas)}
                                    disabled={loadingBPLK}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl uppercase transition cursor-pointer shadow-sm flex items-center gap-2"
                                >
                                    {loadingBPLK ? <RefreshCw size={14} className="animate-spin" /> : null}
                                    DATA PENGAJUAN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsBPLKModalOpen(false)}
                                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase transition cursor-pointer"
                                >
                                    KELUAR
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAHAP 2: DETAIL SURAT TUGAS & DAFTAR KAS KELUAR (GAMBAR 3 & 4) */}
                    {bplkStep === 2 && bplkData && (
                        <div className="space-y-4">
                            {/* Card Informasi Surat Jalan */}
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px] uppercase">Nomor Surat Tugas :</span>
                                        <span className="font-mono font-black text-slate-900 text-sm">{bplkData.sjh_id}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px] uppercase">Keterangan :</span>
                                        <span className="font-bold text-slate-800 block">{bplkData.ass_nama}</span>
                                        <span className="text-slate-600 text-[11px]">{bplkData.sjh_keterangan}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px] uppercase">Nomor Kendaraan :</span>
                                        <span className="font-mono font-black text-slate-900 text-sm">{bplkData.sjh_kendid}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px] uppercase">Driver :</span>
                                        <span className="font-bold text-slate-800">
                                            {bplkData.nm_sopir1} {bplkData.nm_sopir2 ? `- ${bplkData.nm_sopir2}` : ''}
                                        </span>
                                    </div>
                                </div>

                                {bplkData.rute_utama && (
                                    <div className="md:col-span-2 pt-2 border-t border-slate-200">
                                        <span className="text-slate-400 font-bold block text-[10px] uppercase">Rute Utama :</span>
                                        <span className="font-bold text-sky-800 font-mono text-[11px]">{bplkData.rute_utama}</span>
                                    </div>
                                )}
                            </div>

                            {/* Tombol Aksi Utama: Uang Muka, Realisasi, Keluar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleOpenPencairanUangMuka}
                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg uppercase transition shadow cursor-pointer text-xs flex items-center gap-1.5"
                                    >
                                        {(bplkData.daftar_kas_keluar || []).length > 0 ? 'Tambah Kekurangan Uang Muka' : 'Uang Muka'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={loadingRealisasi}
                                        onClick={handleOpenRealisasiBPLK}
                                        className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg uppercase transition shadow cursor-pointer text-xs flex items-center gap-1.5"
                                    >
                                        {loadingRealisasi && <RefreshCw size={13} className="animate-spin" />}
                                        Realisasi
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setBplkStep(1)}
                                        className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-lg uppercase transition cursor-pointer text-xs"
                                    >
                                        GANTI ST
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsBPLKModalOpen(false)}
                                        className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg uppercase transition cursor-pointer text-xs"
                                    >
                                        Keluar
                                    </button>
                                </div>
                            </div>

                            {/* Tabel Daftar Kas Keluar (Gambar 3 & 7) */}
                            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs mt-4">
                                <div className="bg-[#004b84] text-white p-2.5 font-bold uppercase text-center text-xs tracking-wider">
                                    DAFTAR KAS KELUAR
                                </div>
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300 text-[11px]">
                                        <tr>
                                            <th className="p-2.5 text-center">TANGGAL</th>
                                            <th className="p-2.5">CABANG</th>
                                            <th className="p-2.5 text-center">NO. KAS</th>
                                            <th className="p-2.5 text-center">NO. JURNAL</th>
                                            <th className="p-2.5 text-right">NOMINAL</th>
                                            <th className="p-2.5 text-center w-28">ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(bplkData.daftar_kas_keluar || []).map((k, idx) => (
                                            <tr key={idx} className="hover:bg-sky-50 font-medium">
                                                <td className="p-2.5 text-center font-mono">{k.cb_tanggal}</td>
                                                <td className="p-2.5 uppercase">{k.agen_nama}</td>
                                                <td className="p-2.5 text-center font-mono font-bold text-sky-700">{k.cb_id}</td>
                                                <td className="p-2.5 text-center font-mono font-bold text-emerald-700">{k.cb_nojurnal}</td>
                                                <td className="p-2.5 text-right font-mono font-black text-slate-800">
                                                    Rp {Number(k.nominal || 0).toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePrint({
                                                            cb_id: k.cb_id,
                                                            cb_nojurnal: k.cb_nojurnal,
                                                            cb_tanggal: k.cb_tanggal,
                                                            cb_tipe: 'K',
                                                            cb_ket: `BPLK UANG MUKA ${bplkData.sjh_id}`,
                                                            total_amount: k.nominal
                                                        })}
                                                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[11px] transition cursor-pointer shadow-xs"
                                                    >
                                                        Cetak
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!bplkData.daftar_kas_keluar || bplkData.daftar_kas_keluar.length === 0) && (
                                            <tr>
                                                <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                                                    Belum ada kas keluar untuk nomor surat tugas ini. Silakan klik tombol <b>Uang Muka</b> di atas.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAHAP 3: REALISASI BPLK & KOMISI SUPIR (SESUAI gl_t_cashbank_e_t_r.asp) */}
                    {bplkStep === 3 && realisasiData && (() => {
                        const dbKomisiList = realisasiData.komisi_list || [];
                        const totalKomisiDB = dbKomisiList.reduce((sum, item) => sum + Number(item.komisi || 0), 0);
                        const totalKomisiBaru = komisiBaruList.reduce((sum, item) => sum + Number(item.komisi || 0), 0);
                        const totalKomisiGabungan = totalKomisiDB + totalKomisiBaru;
                        const totalRealisasi = (realisasiData.rincian_realisasi || []).reduce((sum, item) => sum + Number(item.nominal || 0), 0);

                        return (
                            <div className="space-y-6">
                                {/* Header Navigasi Tahap 3 */}
                                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">REALISASI SURAT TUGAS</span>
                                        <span className="font-mono font-black text-sm text-slate-800">{bplkData.sjh_id}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setBplkStep(2)}
                                        className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <ArrowLeft size={14} /> Kembali ke BPLK
                                    </button>
                                </div>

                                {/* 1. TABEL UANG MUKA */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="bg-[#004b84] text-white px-4 py-2 font-bold uppercase text-xs">UANG MUKA</div>
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                                            <tr>
                                                <th className="p-2.5 text-left">Nama Biaya</th>
                                                <th className="p-2.5 text-right w-40">Nominal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(realisasiData.uang_muka || []).map((um, idx) => (
                                                <tr key={idx}>
                                                    <td className="p-2.5">{um.item_name}</td>
                                                    <td className="p-2.5 text-right font-mono font-bold">Rp {Number(um.nominal || 0).toLocaleString('id-ID')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50 font-black border-t">
                                            <tr>
                                                <td className="p-2.5 text-right">TOTAL UANG MUKA</td>
                                                <td className="p-2.5 text-right font-mono text-emerald-700">
                                                    Rp {(realisasiData.uang_muka || []).reduce((s, u) => s + Number(u.nominal || 0), 0).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* 2. TABEL KOMISI & FORM TAMBAH KOMISI */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden space-y-4 p-4 bg-white">
                                    <div className="font-black text-slate-800 uppercase text-xs border-b pb-2">TABEL KOMISI SUPIR</div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs border-collapse border border-slate-200">
                                            <thead className="bg-[#004b84] text-white font-bold text-[11px]">
                                                <tr>
                                                    <th className="p-2 border">No</th>
                                                    <th className="p-2 border">No BTT</th>
                                                    <th className="p-2 border">Layanan</th>
                                                    <th className="p-2 border text-right">Biaya Kirim</th>
                                                    <th className="p-2 border text-right">Tarif</th>
                                                    <th className="p-2 border">Asal</th>
                                                    <th className="p-2 border">Tujuan</th>
                                                    <th className="p-2 border text-right">Berat (Kg)</th>
                                                    <th className="p-2 border text-right">Komisi</th>
                                                    <th className="p-2 border text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {dbKomisiList.map((k, idx) => (
                                                    <tr key={`db-${idx}`} className="bg-emerald-50/40">
                                                        <td className="p-2 border text-center font-mono">{k.no}</td>
                                                        <td className="p-2 border text-center font-mono">{k.noBTT}</td>
                                                        <td className="p-2 border">{k.layanan}</td>
                                                        <td className="p-2 border text-right font-mono">{Number(k.biayaKirim || 0).toLocaleString('id-ID')}</td>
                                                        <td className="p-2 border text-right font-mono">{Number(k.tarif || 0).toLocaleString('id-ID')}</td>
                                                        <td className="p-2 border">{k.asalKota}</td>
                                                        <td className="p-2 border">{k.tujuanKota}</td>
                                                        <td className="p-2 border text-right font-mono">{Number(k.beratBTT || 0).toLocaleString('id-ID')}</td>
                                                        <td className="p-2 border text-right font-mono font-bold">Rp {Number(k.komisi || 0).toLocaleString('id-ID')}</td>
                                                        <td className="p-2 border text-center"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">Tersimpan</span></td>
                                                    </tr>
                                                ))}
                                                {komisiBaruList.map((k, idx) => (
                                                    <tr key={`new-${idx}`} className="bg-amber-50/60">
                                                        <td className="p-2 border text-center font-mono">{k.no}</td>
                                                        <td className="p-2 border text-center font-mono">{k.noBTT}</td>
                                                        <td className="p-2 border">{k.layanan}</td>
                                                        <td className="p-2 border text-right font-mono">{Number(k.biayaKirim || 0).toLocaleString('id-ID')}</td>
                                                        <td className="p-2 border text-right font-mono">{Number(k.tarif || 0).toLocaleString('id-ID')}</td>
                                                        <td className="p-2 border">{k.asalKota}</td>
                                                        <td className="p-2 border">{k.tujuanKota}</td>
                                                        <td className="p-2 border text-right font-mono">{Number(k.beratBTT || 0).toLocaleString('id-ID')}</td>
                                                        <td className="p-2 border text-right font-mono font-bold">Rp {Number(k.komisi || 0).toLocaleString('id-ID')}</td>
                                                        <td className="p-2 border text-center">
                                                            <button type="button" onClick={() => setKomisiBaruList(prev => prev.filter((_, i) => i !== idx))} className="text-rose-600 hover:underline font-bold text-[10px] cursor-pointer">Hapus</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-slate-100 font-black">
                                                <tr>
                                                    <td colSpan={8} className="p-2 border text-right">TOTAL KOMISI</td>
                                                    <td className="p-2 border text-right font-mono text-emerald-700">Rp {totalKomisiGabungan.toLocaleString('id-ID')}</td>
                                                    <td className="p-2 border"></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* Form Tambah Komisi Baru */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                                        <div className="font-bold text-slate-700">Tambah Data Komisi Baru</div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <input type="text" placeholder="No Loper / SP / SPPAD" value={komisiForm.no} onChange={(e) => handleKomisiFormChange('no', e.target.value)} className="p-2 border rounded-lg bg-white" />
                                            <input type="text" placeholder="No BTT" value={komisiForm.noBTT} onChange={(e) => handleKomisiFormChange('noBTT', e.target.value)} className="p-2 border rounded-lg bg-white" />
                                            <select value={komisiForm.layanan} onChange={(e) => handleKomisiFormChange('layanan', e.target.value)} className="p-2 border rounded-lg bg-white font-bold">
                                                <option value="">-- Pilih Layanan --</option>
                                                <option value="Regular">Regular</option>
                                                <option value="Carter">Carter</option>
                                            </select>
                                            <input type="number" step="0.01" placeholder="Berat BTT (Kg)" readOnly={komisiForm.layanan === 'Carter'} value={komisiForm.beratBTT} onChange={(e) => handleKomisiFormChange('beratBTT', e.target.value)} className="p-2 border rounded-lg bg-white" />
                                            <input type="number" step="0.01" placeholder="Tarif" readOnly={komisiForm.layanan === 'Carter'} value={komisiForm.tarif} onChange={(e) => handleKomisiFormChange('tarif', e.target.value)} className="p-2 border rounded-lg bg-white" />
                                            <input type="number" step="0.01" placeholder="Biaya Kirim" readOnly={komisiForm.layanan === 'Regular'} value={komisiForm.biayaKirim} onChange={(e) => handleKomisiFormChange('biayaKirim', e.target.value)} className="p-2 border rounded-lg bg-white" />
                                            <input type="text" placeholder="Asal Kota" readOnly={komisiForm.layanan === 'Carter'} value={komisiForm.asalKota} onChange={(e) => handleKomisiFormChange('asalKota', e.target.value)} className="p-2 border rounded-lg bg-white" />
                                            <input type="text" placeholder="Tujuan Kota" readOnly={komisiForm.layanan === 'Carter'} value={komisiForm.tujuanKota} onChange={(e) => handleKomisiFormChange('tujuanKota', e.target.value)} className="p-2 border rounded-lg bg-white" />
                                            <input type="number" placeholder="Komisi (Otomatis)" readOnly value={komisiForm.komisi} className="p-2 border rounded-lg bg-slate-100 font-mono font-bold text-emerald-700" />
                                        </div>
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            <button type="button" onClick={handleTambahKomisiSementara} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg cursor-pointer">+ Tambah ke Tabel</button>
                                            {komisiBaruList.length > 0 && (
                                                <button type="button" onClick={handleSimpanKomisiDB} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer">Simpan Komisi ke DB</button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 3. SECTION POSTING & UNPOSTING KOMISI & REALISASI */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Posting Komisi */}
                                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                                        <div className="font-black text-slate-800 uppercase">Posting Komisi</div>
                                        {realisasiData.posting_komisi === 'Y' ? (
                                            <div className="space-y-2">
                                                <p className="text-xs text-slate-600">No Jurnal Komisi: <b className="font-mono text-sky-700">{realisasiData.no_jurnal_komisi || '-'}</b></p>
                                                <button type="button" onClick={handleUnpostingKomisiBPLK} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer">Unposting Komisi</button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <label className="font-bold">Tgl Posting:</label>
                                                    <input type="date" max={today} value={tglPostingKomisi} onChange={(e) => setTglPostingKomisi(e.target.value)} className="p-1.5 border rounded-lg bg-white font-mono" />
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={totalKomisiGabungan <= 0}
                                                    onClick={() => handlePostingKomisiBPLK(totalKomisiGabungan)}
                                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg cursor-pointer"
                                                >
                                                    Posting Komisi
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Posting Realisasi */}
                                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                                        <div className="font-black text-slate-800 uppercase">Posting Realisasi</div>
                                        {realisasiData.posting_realisasi === 'Y' ? (
                                            <div className="space-y-2">
                                                <p className="text-xs text-slate-600">No Jurnal Realisasi: <b className="font-mono text-sky-700">{realisasiData.no_jurnal_realisasi || '-'}</b></p>
                                                <button type="button" onClick={handleUnpostingRealisasiBPLK} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer">Unposting Realisasi</button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <label className="font-bold">Tgl Posting:</label>
                                                    <input type="date" max={today} value={tglPostingRealisasi} onChange={(e) => setTglPostingRealisasi(e.target.value)} className="p-1.5 border rounded-lg bg-white font-mono" />
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={totalRealisasi <= 0}
                                                    onClick={handlePostingRealisasiBPLK}
                                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg cursor-pointer"
                                                >
                                                    Posting Realisasi
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* 🌟 SUB-MODAL PENCAIRAN UANG MUKA DEBET & KREDIT (GAMBAR 5 & 6) */}
            {isPencairanOpen && bplkData && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
                    <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-300 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <span className="font-mono font-bold text-emerald-600 block text-xs">{bplkData.sjh_id}</span>
                                <h3 className="font-black text-slate-800 text-sm tracking-wide">Pencairan Uang Muka BPLK Debet</h3>
                            </div>
                            <button onClick={() => setIsPencairanOpen(false)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-5 text-xs">
                            {/* Tabel Debet */}
                            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                                <table className="w-full border-collapse">
                                    <thead className="bg-[#004b84] text-white font-bold text-[11px] uppercase">
                                        <tr>
                                            <th className="p-2 text-left">NAMA BIAYA</th>
                                            <th className="p-2 text-right w-36">NOMINAL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {bplkData.item_debet.map((d, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="p-2">{d.item_name}</td>
                                                <td className="p-2 text-right font-mono font-bold">
                                                    {Number(d.nominal || 0).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300">
                                        <tr>
                                            <td className="p-2.5 text-right uppercase">TOTAL UANG MUKA DEBET :</td>
                                            <td className="p-2.5 text-right font-mono text-emerald-700 text-sm">
                                                {Number(bplkData.total_uang_muka || 0).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Section Kredit */}
                            <div className="space-y-3 pt-2">
                                <h4 className="font-black text-slate-800 text-xs tracking-wide uppercase border-b border-slate-200 pb-1">
                                    Pencairan Uang Muka BPLK Kredit
                                </h4>

                                {bplkData.akun_kredit.map((ak, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="font-bold text-slate-700 block text-[11px]">
                                                {ak.acc_code} | {ak.acc_name}
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const totalLain = Object.entries(inputKreditValues)
                                                        .filter(([k]) => k !== ak.acc_code)
                                                        .reduce((sum, [, v]) => sum + Number(v || 0), 0);
                                                    const sisa = Math.max(0, bplkData.total_uang_muka - totalLain);
                                                    setInputKreditValues({ ...inputKreditValues, [ak.acc_code]: sisa });
                                                }}
                                                className="text-[10px] text-sky-600 font-bold hover:underline cursor-pointer"
                                            >
                                                Gunakan Sisa
                                            </button>
                                        </div>
                                        <input
                                            type="number"
                                            value={inputKreditValues[ak.acc_code] || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setInputKreditValues({ ...inputKreditValues, [ak.acc_code]: val });
                                            }}
                                            placeholder="0"
                                            className="w-full p-2.5 bg-cyan-50/50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-sky-500 shadow-inner"
                                        />
                                    </div>
                                ))}

                                {(() => {
                                    const totalInput = Object.values(inputKreditValues).reduce((a, b) => a + Number(b || 0), 0);
                                    const sisa = bplkData.total_uang_muka - totalInput;

                                    return (
                                        <div className="flex justify-between items-center pt-2 font-bold text-xs">
                                            <span>Total Input: <b className="font-mono text-emerald-700">{totalInput.toLocaleString('id-ID')}</b></span>
                                            <span className={sisa === 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                                Sisa Input: <b className="font-mono">{sisa.toLocaleString('id-ID')}</b>
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Tombol Proses Kas Keluar (Gambar 6) */}
                            {(() => {
                                const totalInput = Object.values(inputKreditValues).reduce((a, b) => a + Number(b || 0), 0);
                                const isValid = totalInput === bplkData.total_uang_muka && totalInput > 0;

                                return (
                                    <div className="flex justify-end pt-3 border-t border-slate-100">
                                        <button
                                            type="button"
                                            disabled={!isValid}
                                            onClick={handleProsesKasKeluarBPLK}
                                            className={`px-8 py-2.5 font-black rounded-xl text-xs uppercase transition shadow-md cursor-pointer ${isValid
                                                ? 'bg-amber-400 hover:bg-amber-500 text-slate-900 active:scale-95'
                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                                                }`}
                                        >
                                            Proses Kas Keluar
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    ) : null;

    {/* 🌟 MODAL CETAK LAPORAN CASH FLOW LENGKAP */ }
    const cashFlowModalElement = isCashFlowOpen && cashFlowData ? (
        <div className="fixed inset-0 z-[99999] bg-white overflow-y-auto p-6 print:p-0">
            <div className="max-w-5xl mx-auto flex justify-between items-center mb-6 pb-3 border-b print:hidden">
                <button
                    onClick={() => setIsCashFlowOpen(false)}
                    className="px-4 py-2 text-xs bg-slate-200 hover:bg-slate-300 rounded-lg font-bold uppercase transition"
                >
                    ← Kembali
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.print()}
                        className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow uppercase transition cursor-pointer"
                    >
                        <Printer size={15} /> Print Laporan
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto border border-slate-300 p-8 rounded-xl shadow-sm print:border-none print:shadow-none print:p-0 text-slate-900 font-sans text-xs">
                {/* Header Profil */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-3">
                    <div className="space-y-0.5">
                        <h2 className="font-black text-sm uppercase tracking-wide text-slate-900">
                            PT DAKOTA LOGISTIK INDONESIA
                        </h2>
                        <p className="text-[11px] text-slate-600">Jl. Wibawa Mukti II No. 99 Jatiasih, Bekasi</p>
                        <p className="text-[11px] text-slate-600">BEKASI KOTA - JAWA BARAT</p>
                        <p className="text-[11px] text-slate-600">(021) 8603278 / (021) 86608589</p>
                    </div>
                    <div>
                        <img src={logoDakota} alt="Dakota Cargo" className="h-10 w-auto object-contain" />
                    </div>
                </div>

                {/* Judul Laporan */}
                <div className="text-center my-4">
                    <h1 className="font-black text-base uppercase tracking-wider text-slate-900">
                        LAPORAN CASH FLOW
                    </h1>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">
                        PERIODE : <span className="font-mono">{startDate}</span> s/d <span className="font-mono">{endDate}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                        Tanggal Cetak : {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>

                {/* Tabel Laporan Cashflow Identik Sistem Lawas */}
                <table className="w-full border-collapse border border-slate-400 text-[11px] mt-4">
                    <thead>
                        <tr className="bg-slate-300 font-bold text-slate-900">
                            <th className="border border-slate-400 p-2 text-center w-12">No. Urut</th>
                            <th className="border border-slate-400 p-2 text-center w-28">Tanggal</th>
                            <th className="border border-slate-400 p-2 text-left w-48">No. Transaksi</th>
                            <th colSpan={2} className="border border-slate-400 p-2 text-left">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(cashFlowData.data || []).map((h, idx) => (
                            <React.Fragment key={idx}>
                                <tr className="font-bold bg-slate-50 border-t border-slate-400">
                                    <td className="border border-slate-400 p-2 text-center font-mono">{idx + 1}</td>
                                    <td className="border border-slate-400 p-2 text-center font-mono">{formatDate(h.cb_tanggal)}</td>
                                    <td className="border border-slate-400 p-2 font-mono text-sky-700">{h.cb_id}</td>
                                    <td colSpan={2} className="border border-slate-400 p-2 text-slate-800">{h.cb_ket}</td>
                                </tr>
                                <tr className="bg-slate-200 font-bold text-[10px] text-slate-700">
                                    <td className="border border-slate-400"></td>
                                    <td className="border border-slate-400 p-1.5 text-center">Uraian</td>
                                    <td className="border border-slate-400 p-1.5 text-center">Kode Perkiraan</td>
                                    <td className="border border-slate-400 p-1.5 text-right w-36">Debit (Rp)</td>
                                    <td className="border border-slate-400 p-1.5 text-right w-36">Kredit (Rp)</td>
                                </tr>
                                {(h.details || []).map((d, dIdx) => (
                                    <tr key={dIdx} className="hover:bg-slate-50/80">
                                        <td className="border border-slate-400"></td>
                                        <td className="border border-slate-400 p-1.5 pl-3">{d.cbd_ket || h.cb_ket}</td>
                                        <td className="border border-slate-400 p-1.5 text-center font-mono text-slate-600">{d.item_owncaid || '-'}</td>
                                        <td className="border border-slate-400 p-1.5 text-right font-mono">
                                            {Number(d.debet || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="border border-slate-400 p-1.5 text-right font-mono">
                                            {Number(d.kredit || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-100 font-bold text-[10px]">
                                    <td colSpan={3} className="border border-slate-400 p-1.5 text-right uppercase">
                                        SUBTOTAL :
                                    </td>
                                    <td className="border border-slate-400 p-1.5 text-right font-mono text-slate-900">
                                        {Number(h.sub_debet || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="border border-slate-400 p-1.5 text-right font-mono text-slate-900">
                                        {Number(h.sub_kredit || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-300 font-black text-xs">
                            <td colSpan={3} className="border border-slate-400 p-2.5 text-right uppercase">
                                TOTAL KESELURUHAN :
                            </td>
                            <td className="border border-slate-400 p-2.5 text-right font-mono text-slate-900">
                                Rp {Number(cashFlowData.grand_total_debet || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="border border-slate-400 p-2.5 text-right font-mono text-slate-900">
                                Rp {Number(cashFlowData.grand_total_kredit || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                        <tr className="bg-emerald-50 font-black text-sm">
                            <td colSpan={3} className="border border-slate-400 p-3 text-right uppercase text-emerald-900">
                                SISA KAS :
                            </td>
                            <td colSpan={2} className="border border-slate-400 p-3 text-right font-mono text-emerald-700 text-base">
                                Rp {Number(cashFlowData.sisa_kas || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-4">
            {/* 🌟 PANEL FILTER PENCATATAN CASH - BANK (DEFAULT TERBUKA) */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
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

                    {/* 🌟 BARIS TOMBOL AKSI: CETAK CASHFLOW, BPLK, RESET, & TAMPILKAN TRANSAKSI */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        {/* 1. CETAK LAPORAN CASHFLOW */}
                        <button
                            type="button"
                            onClick={handleOpenLaporanCashFlow}
                            disabled={loadingCashFlow}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer uppercase tracking-wider"
                            title="Cetak Laporan Cash Flow Sesuai Periode Tanggal"
                        >
                            <FileSpreadsheet size={15} className="text-emerald-600" />
                            {loadingCashFlow ? 'MEMUAT...' : 'CETAK LAPORAN CASHFLOW'}
                        </button>

                        {/* 2. BPLK */}
                        <button
                            type="button"
                            onClick={() => {
                                setBplkStep(1);
                                setNoSuratTugas('');
                                setBplkData(null);
                                setIsBPLKModalOpen(true);
                            }}
                            className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer uppercase tracking-wider"
                            title="Input / Scan Surat Tugas BPLK"
                        >
                            <FileCheck size={15} /> BPLK
                        </button>

                        {/* 3. RESET */}
                        <button type="button" onClick={handleResetFilter} className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer flex items-center gap-1.5">
                            <RotateCcw size={14} /> RESET
                        </button>

                        {/* 4. TAMPILKAN TRANSAKSI */}
                        <button type="submit" className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5">
                            <RefreshCw size={14} /> TAMPILKAN TRANSAKSI
                        </button>
                    </div>
                </form>
            )}
            {/* DataTableTemplate */}
            <DataTableTemplate
                title="PENCATATAN CASH - BANK"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onFilter={() => setShowFilter(prev => !prev)}
                renderExtraActions={(item) => (
                    <button
                        type="button"
                        onClick={() => handlePrint(item)}
                        className="p-1.5 rounded-lg border border-sky-200 bg-sky-50/70 text-sky-600 hover:bg-sky-100 transition cursor-pointer"
                        title="Print Voucher Kas"
                    >
                        <Printer size={15} />
                    </button>
                )}
            />

            {modalElement && ReactDOM.createPortal(modalElement, document.body)}
            {postingModalElement && ReactDOM.createPortal(postingModalElement, document.body)}
            {printModalElement && ReactDOM.createPortal(printModalElement, document.body)}
            {bplkModalElement && ReactDOM.createPortal(bplkModalElement, document.body)}
            {cashFlowModalElement && ReactDOM.createPortal(cashFlowModalElement, document.body)}
        </div>
    );
};

export default KasMasukKeluar;