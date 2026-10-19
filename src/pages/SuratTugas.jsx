import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    RefreshCw, X as XIcon, Truck, Save, Printer,
    Download, AlertOctagon, FileSpreadsheet, Plus, Filter, Search,
    Edit3, Trash2, MapPin, Navigation, ExternalLink
} from 'lucide-react';
import Swal from 'sweetalert2';
import { QRCodeSVG } from 'qrcode.react';
import { Search as SearchIcon, CheckCircle } from 'lucide-react';
import dakotaLogo from '../assets/new_logo 2.png';

const SuratTugas = () => {
    const { isDarkMode } = useDarkMode();
    const [stList, setStList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Master Dropdown List States
    const [kendaraanList, setKendaraanList] = useState([]);
    const [sopirList, setSopirList] = useState([]);
    const [agenList, setAgenList] = useState([]);
    const [tugasList, setTugasList] = useState([]);
    const [trayekList, setTrayekList] = useState([]);

    // State Toggle Filter
    const [showFilter, setShowFilter] = useState(true);

    // Filter Form States
    const today = new Date().toISOString().split('T')[0];
    const [filterTgla, setFilterTgla] = useState(today);
    const [filterTgle, setFilterTgle] = useState(today);
    const [filterCabang, setFilterCabang] = useState(localStorage.getItem('active_agen_id') || '001');
    const [filterNoSt, setFilterNoSt] = useState('');
    const [filterNoMobil, setFilterNoMobil] = useState('');
    const [filterNipSopir, setFilterNipSopir] = useState('');
    const [filterNamaSopir, setFilterNamaSopir] = useState('');
    const [filterTugas, setFilterTugas] = useState('');
    const [filterTrayek, setFilterTrayek] = useState('');
    const activeAgenId = localStorage.getItem('active_agen_id') || localStorage.getItem('cabang_id') || '';

    const [isUmListVisible, setIsUmListVisible] = useState(false);
    const [globalSearch, setGlobalSearch] = useState('');

    // Modal Create / Edit States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // 🌟 Modal View GPS Tracking State
    const defaultForm = {
        sjh_id: '',
        tgl_berangkat: today,
        jam_berangkat: '11:00:00',
        tgl_kembali: today,
        jam_kembali: '12:00:00',
        by_loading: 'Tidak',
        status_loading: 'Tidak',
        status_checkin: 'Tidak',
        sjh_kendid: '',
        sjh_sopir1_nip: '',
        sjh_sopir2_nip: '',
        // 🌟 Dinamis mengikuti akun cabang yang sedang login
        sjh_startagenid: activeAgenId,
        sjh_endagenid: activeAgenId,
        sjh_assid: '',
        sjh_trayekid: '',
        nama_um: '',
        nominal_um: 0,
        sjh_keterangan: ''
    };

    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchMasterData();
        fetchSuratTugasData();
    }, []);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [resKend, resSopir, resAgen, resTugas, resTrayek] = await Promise.all([
                api.get('/master/kendaraan', { headers }).catch(() => ({ data: [] })),
                api.get('/sopir-list', { headers }).catch(() => api.get('/sopir/list', { headers })).catch(() => ({ data: [] })),
                api.get('/agens', { headers }).catch(() => ({ data: [] })),
                api.get('/master/assignment', { headers }).catch(() => ({ data: [] })),
                api.get('/master/trayek', { headers }).catch(() => ({ data: [] }))
            ]);

            setKendaraanList(resKend.data?.data || resKend.data || []);
            setSopirList(resSopir.data?.data || resSopir.data || []);
            setAgenList(resAgen.data?.data || resAgen.data || []);
            setTugasList(resTugas.data?.data || resTugas.data || []);
            setTrayekList(resTrayek.data?.data || resTrayek.data || []);
        } catch (err) {
            console.error("Gagal memuat master data:", err);
        }
    };

    const fetchSuratTugasData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/surattugas-list', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    cabang: filterCabang,
                    no_st: filterNoSt,
                    no_mobil: filterNoMobil,
                    nip_sopir: filterNipSopir,
                    sopir_nama: filterNamaSopir,
                    tugas_id: filterTugas,
                    trayek_id: filterTrayek,
                    chktgl: true
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || res.data || [];
            setStList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat data Surat Tugas:", err);
            setStList([]);
        } finally {
            setLoading(false);
        }
    };

    // Aksi Toolbar
    const handleCetakRekap = () => {
        if (stList.length === 0) {
            Swal.fire('Info', 'Tidak ada data Surat Tugas untuk dicetak.', 'info');
            return;
        }
        window.open(`/operasional/surattugas/print-rekap?tgla=${filterTgla}&tgle=${filterTgle}&cabang=${filterCabang}`, '_blank');
    };

    const handleExportExcel = () => {
        if (stList.length === 0) {
            Swal.fire('Info', 'Tidak ada data Surat Tugas untuk diekspor.', 'info');
            return;
        }
        const token = localStorage.getItem('token');
        window.open(`${api.defaults.baseURL}/operasional/surattugas-export?tgla=${filterTgla}&tgle=${filterTgle}&cabang=${filterCabang}&token=${token}`, '_blank');
    };

    const handleOpenStopST = () => {
        Swal.fire({
            title: 'Open Stop Surat Tugas',
            html: `
                <div class="text-left text-xs space-y-2 p-1">
                    <label class="font-bold text-slate-700 block uppercase">Masukkan No. Surat Tugas / No. Mobil:</label>
                    <input id="swal-input-st" class="swal2-input !m-0 !w-full !text-xs !font-mono font-bold" placeholder="Contoh: 001JC2026... atau Plat Mobil" />
                    <p class="text-[11px] text-slate-500 mt-1 italic leading-relaxed">
                        Fitur ini digunakan untuk membuka penahanan/hold armada pengiriman agar status surat tugas aktif kembali.
                    </p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Buka Hold / Open Stop',
            confirmButtonColor: '#e11d48',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const val = document.getElementById('swal-input-st').value;
                if (!val) {
                    Swal.showValidationMessage('Nomor Surat Tugas atau Plat Mobil wajib diisi!');
                }
                return val;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const res = await api.post('/operasional/surattugas/open-stop', { keyword: result.value }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Berhasil!', res.data?.message || 'Armada Surat Tugas telah dibuka dari status STOP.', 'success');
                    fetchSuratTugasData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal memproses Open Stop', 'error');
                }
            }
        });
    };

    const handleRekapST = () => {
        Swal.fire({
            title: 'Rekapitulasi Surat Tugas',
            html: `
                <div class="text-xs text-left p-2 space-y-2 text-slate-700">
                    <p>Periode: <b>${filterTgla}</b> s/d <b>${filterTgle}</b></p>
                    <div class="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1">
                        <div>Total Armada Bertugas: <b class="font-mono text-sky-800 text-sm">${stList.length}</b></div>
                        <div>Total Uang Muka Operasional: <b class="font-mono text-emerald-700 text-sm">Rp ${stList.reduce((acc, curr) => acc + (parseFloat(curr.nominal_um) || 0), 0).toLocaleString('id-ID')}</b></div>
                    </div>
                </div>
            `,
            icon: 'info',
            confirmButtonColor: '#004b84',
            confirmButtonText: 'Tutup'
        });
    };

    const handleAdd = () => {
        setIsEditMode(false);
        setFormData({
            ...defaultForm,
            sjh_startagenid: activeAgenId,
            sjh_endagenid: activeAgenId
        });
        setIsUmListVisible(false);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setIsEditMode(true);
        const tglBerangkat = item.sjh_tanggal ? item.sjh_tanggal.split(' ')[0] : today;
        const jamBerangkat = item.sjh_tanggal && item.sjh_tanggal.includes(' ') ? item.sjh_tanggal.split(' ')[1] : '11:00:00';
        const tglKembali = item.sjh_tanggalkembali ? item.sjh_tanggalkembali.split(' ')[0] : today;
        const jamKembali = item.sjh_tanggalkembali && item.sjh_tanggalkembali.includes(' ') ? item.sjh_tanggalkembali.split(' ')[1] : '12:00:00';

        // 🌟 Normalisasi status_loading ('Ya' / 'Tidak')
        const rawLoading = String(item.status_loading || item.proses || '').toUpperCase();
        const loadingVal = (rawLoading === 'YA' || rawLoading === 'Y') ? 'Ya' : 'Tidak';

        // 🌟 Normalisasi status_checkin ('Ya' / 'Tidak')
        const rawCheckin = String(item.status_checkin || item.completejd || '').toUpperCase();
        const isComplete = item.sjh_completeyn === 'Y' || rawCheckin.includes('CHECKIN') || rawCheckin === 'YA' || rawCheckin === 'SELESAI';
        const checkinVal = isComplete ? 'Ya' : 'Tidak';

        setFormData({
            sjh_id: item.sjh_id || '',
            tgl_berangkat: tglBerangkat,
            jam_berangkat: jamBerangkat,
            tgl_kembali: tglKembali,
            jam_kembali: jamKembali,
            by_loading: item.sjh_byloading || 'Tidak',

            // Terisi nilai 'Ya' atau 'Tidak'
            status_loading: loadingVal,
            status_checkin: checkinVal,

            sjh_kendid: item.sjh_kendid || '',
            sjh_sopir1_nip: item.sjh_sopir1_nip !== '-' ? item.sjh_sopir1_nip : '',
            sjh_sopir2_nip: item.sjh_sopir2_nip !== '-' ? item.sjh_sopir2_nip : '',
            sjh_startagenid: item.sjh_startagenid || '',
            sjh_endagenid: item.sjh_endagenid || '',
            sjh_assid: item.sjh_assid !== '-' ? item.sjh_assid : '',
            nominal_um: item.nominal_um || 0,
            sjh_keterangan: item.sjh_keterangan !== '-' ? item.sjh_keterangan : ''
        });

        setIsModalOpen(true);
        setIsUmListVisible(false);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Surat Tugas?',
            text: `Apakah Anda yakin ingin menghapus nomor Surat Tugas ${item.sjh_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/surattugas-delete', {
                        params: { sjh_id: item.sjh_id },
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Terhapus!', 'Surat Tugas berhasil dihapus.', 'success');
                    fetchSuratTugasData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus record', 'error');
                }
            }
        });
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.sjh_kendid) {
            Swal.fire('Peringatan', 'Nomor Kendaraan wajib dipilih!', 'warning');
            return;
        }

        const fullTglBerangkat = `${formData.tgl_berangkat} ${formData.jam_berangkat}`;
        const fullTglKembali = `${formData.tgl_kembali} ${formData.jam_kembali}`;

        // 🌟 AUTO GENERATE SJH_ID JIKA MODE TAMBAH BARU (AGAR LOLOS VALIDASI BACKEND)
        let finalSjhId = formData.sjh_id;
        if (!isEditMode && (!finalSjhId || finalSjhId.trim() === '')) {
            const cbg = (formData.sjh_startagenid || '001').substring(0, 3);
            const tglClean = (formData.tgl_berangkat || today).replace(/-/g, '');
            const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4 digit angka acak/urut
            finalSjhId = `${cbg}JC${tglClean}${randomSuffix}`;
        }

        const payload = {
            ...formData,
            sjh_id: finalSjhId, // Pastikan tidak dikirim string kosong ""
            sjh_tanggal: fullTglBerangkat,
            sjh_tanggalkembali: fullTglKembali,
            nominal_um: parseFloat(formData.nominal_um) || 0
        };

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/operasional/surattugas-update' : '/operasional/surattugas-create';
            const method = isEditMode ? api.put : api.post;

            await method(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', isEditMode ? 'Surat Tugas berhasil diperbarui.' : 'Surat Tugas berhasil direkam.', 'success');
            setIsModalOpen(false);
            fetchSuratTugasData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data', 'error');
        }
    };

    // 🌟 KOLOM TABEL LENGKAP: EDIT - VIEW GPS - DELETE
    const columns = [
        {
            header: 'NO. SURAT TUGAS',
            accessor: 'sjh_id',
            render: (i) => <span className="font-mono font-bold text-indigo-700">🚚 {i.sjh_id || '-'}</span>
        },
        {
            header: 'TANGGAL BERANGKAT',
            accessor: 'sjh_tanggal',
            render: (i) => <span className="font-mono text-slate-700 text-xs">{i.sjh_tanggal || '-'}</span>
        },
        {
            header: 'NO. MOBIL',
            accessor: 'sjh_kendid',
            render: (i) => <span className="font-bold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{i.sjh_kendid || '-'}</span>
        },
        {
            header: 'SOPIR 1',
            accessor: 'nmsopir1',
            render: (i) => <span className="font-semibold text-slate-800 uppercase">{i.nmsopir1 || i.sjh_sopir1_nip || '-'}</span>
        },
        {
            header: 'SOPIR 2',
            accessor: 'nmsopir2',
            render: (i) => <span className="font-medium text-slate-600 uppercase">{i.nmsopir2 || i.sjh_sopir2_nip || '-'}</span>
        },
        {
            header: 'ASSIGNMENT',
            accessor: 'ass_nama',
            render: (i) => <span className="font-semibold text-indigo-900 uppercase">{i.ass_nama || '-'}</span>
        },
        {
            header: 'UANG MUKA (RP)',
            accessor: 'nominal_um',
            render: (i) => <span className="font-bold text-emerald-700 font-mono">Rp {Number(i.nominal_um || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'STATUS',
            accessor: 'sjh_completeyn',
            render: (i) => (
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${i.sjh_completeyn === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {i.sjh_completeyn === 'Y' ? 'SELESAI' : 'BERJALAN'}
                </span>
            )
        },
        {
            header: 'ACTION',
            accessor: 'action',
            render: (item) => (
                <div className="flex items-center justify-center gap-2">
                    {/* 1. EDIT */}
                    <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        title="Edit Surat Tugas"
                        className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                    >
                        <Edit3 size={15} />
                    </button>

                    <button
                        type="button"
                        onClick={() => handlePrintSuratTugas(item)}
                        title="Cetak Surat Tugas"
                        className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                    >
                        <Printer size={15} />
                    </button>

                    {/* 2. VIEW GPS */}
                    <button
                        type="button"
                        onClick={() => handleViewGPS(item)}
                        title="View GPS / History Tracking Armada"
                        className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                    >
                        <MapPin size={15} />
                    </button>

                    {/* 3. DELETE */}
                    <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        title="Hapus Surat Tugas"
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            )
        }
    ];

    const filteredList = stList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.sjh_id && item.sjh_id.toLowerCase().includes(q)) ||
            (item.sjh_kendid && item.sjh_kendid.toLowerCase().includes(q)) ||
            (item.nmsopir1 && item.nmsopir1.toLowerCase().includes(q)) ||
            (item.sjh_sopir1_nip && item.sjh_sopir1_nip.toLowerCase().includes(q))
        );
    });

    // State Modal & Data GPS
    const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
    const [selectedGpsItem, setSelectedGpsItem] = useState(null);
    const [gpsHistoryList, setGpsHistoryList] = useState([]);
    const [loadingGps, setLoadingGps] = useState(false);

    // Handler saat tombol View GPS di kolom Action diklik
    const handleViewGPS = async (item) => {
        setSelectedGpsItem(item);
        setIsGpsModalOpen(true);
        setLoadingGps(true);
        setGpsHistoryList([]);

        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/operasional/surattugas/gps-history?sjh_id=${encodeURIComponent(item.sjh_id)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.status === 'success') {
                setGpsHistoryList(res.data?.data || []);
            }
        } catch (err) {
            console.warn("Gagal memuat history koordinat GPS:", err);
        } finally {
            setLoadingGps(false);
        }
    };

    // State Modal Print & Data Cetak
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printData, setPrintData] = useState(null);
    const [loadingPrint, setLoadingPrint] = useState(false);

    // State Modal Pencarian Uang Muka
    const [isUmModalOpen, setIsUmModalOpen] = useState(false);
    const [umKeyword, setUmKeyword] = useState('');
    const [umList, setUmList] = useState([]);
    const [loadingUm, setLoadingUm] = useState(false);

    // Tambahkan field id_uang_muka & nama_uang_muka pada defaultForm
    // sjh_trayekid: '', nama_um: '',

    // Cari Uang Muka saat modal dibuka atau keyword berubah
    const handleSearchUangMuka = async (keyword) => {
        setLoadingUm(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/operasional/surattugas/uang-muka-search?q=${encodeURIComponent(keyword)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUmList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal mengambil data uang muka:", err);
        } finally {
            setLoadingUm(false);
        }
    };

    // Handler saat tombol PILIH di tabel modal Uang Muka diklik (Gambar 1)
    const handlePilihUangMuka = (item) => {
        setFormData(prev => ({
            ...prev,
            sjh_trayekid: item.kode_uang_muka,
            nama_um: item.nama,
            nominal_um: item.total
        }));
        setIsUmModalOpen(false);
    };

    // Handler cetak surat tugas dari baris tabel (Gambar 2)
    const handlePrintSuratTugas = async (item) => {
        setIsPrintModalOpen(true);
        setLoadingPrint(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/operasional/surattugas/detail-print?sjh_id=${encodeURIComponent(item.sjh_id)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPrintData(res.data?.data || null);
        } catch (err) {
            Swal.fire('Gagal', 'Tidak dapat memuat template cetak', 'error');
            setIsPrintModalOpen(false);
        } finally {
            setLoadingPrint(false);
        }
    };

    // 🖨️ Handler Print Bersih Bebas Background Hitam
    const handlePrintDocument = () => {
        const printContent = document.getElementById('printable-area');
        if (!printContent) return;

        // Buat iframe tersembunyi
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(style => style.outerHTML)
            .join('\n');

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak Surat Tugas - ${printData?.sjh_id || ''}</title>
            ${styles}
            <style>
                @page {
                    size: A4 portrait;
                    margin: 12mm 15mm;
                }
                body {
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
            </style>
        </head>
        <body onload="window.print()">
            ${printContent.innerHTML}
        </body>
        </html>
    `);
        doc.close();

        // Hapus iframe setelah dialog print selesai / ditutup
        iframe.contentWindow.onafterprint = () => {
            document.body.removeChild(iframe);
        };
    };

    return (
        <div className="space-y-4 font-sans">
            {/* 🌟 1. PANEL FILTER TOGGLE (Bersih, Rapi, Tanpa Checkbox Kaku) */}
            {showFilter && (
                <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200 space-y-4 text-xs font-bold text-slate-600 animate-in fade-in duration-150">

                    {/* Baris 1: Periode Tanggal & Cabang */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-6">
                            <label className="block mb-1 text-slate-700 font-black uppercase">
                                PERIODE TANGGAL :
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-600"
                                    value={filterTgla}
                                    onChange={e => setFilterTgla(e.target.value)}
                                />
                                <input
                                    type="date"
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-600"
                                    value={filterTgle}
                                    onChange={e => setFilterTgle(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-6">
                            <label className="block mb-1 text-slate-700 font-black uppercase">
                                CABANG :
                            </label>
                            <select
                                value={filterCabang}
                                onChange={e => setFilterCabang(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-600 cursor-pointer uppercase"
                            >
                                <option value="">-- SEMUA CABANG --</option>
                                <option value="001">001 - DLI PUSAT</option>
                                {agenList.map((a, i) => (
                                    <option key={i} value={a.agen_id}>{a.agen_id} - {a.agen_nama}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Baris 2: NIP Sopir, Nama Sopir, Tugas */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-4">
                            <label className="block mb-1 text-slate-700 font-black uppercase">
                                NIP SOPIR :
                            </label>
                            <input
                                type="text"
                                placeholder="Masukkan NIP Sopir..."
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono outline-none focus:border-indigo-600 uppercase"
                                value={filterNipSopir}
                                onChange={e => setFilterNipSopir(e.target.value)}
                            />
                        </div>

                        <div className="md:col-span-4">
                            <label className="block mb-1 text-slate-700 font-black uppercase">
                                NAMA SOPIR :
                            </label>
                            <input
                                type="text"
                                placeholder="Masukkan Nama Sopir..."
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 uppercase"
                                value={filterNamaSopir}
                                onChange={e => setFilterNamaSopir(e.target.value)}
                            />
                        </div>

                        <div className="md:col-span-4">
                            <label className="block mb-1 text-slate-700 font-black uppercase">
                                TUGAS / ASSIGNMENT :
                            </label>
                            <select
                                value={filterTugas}
                                onChange={e => setFilterTugas(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-600 cursor-pointer uppercase"
                            >
                                <option value="">-- SEMUA TUGAS --</option>
                                {tugasList.map((t, i) => (
                                    <option key={i} value={t.ass_id}>{t.ass_nama}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Baris 3: No. Surat Tugas, No. Kendaraan, Trayek */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-4">
                            <label className="block mb-1 text-slate-700 font-black uppercase">
                                NO. SURAT TUGAS :
                            </label>
                            <input
                                type="text"
                                placeholder="Masukkan Nomor Surat Tugas..."
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono outline-none focus:border-indigo-600 uppercase"
                                value={filterNoSt}
                                onChange={e => setFilterNoSt(e.target.value)}
                            />
                        </div>

                        <div className="md:col-span-4">
                            <label className="block mb-1 text-slate-700 font-black uppercase">
                                NO. KENDARAAN :
                            </label>
                            <input
                                type="text"
                                placeholder="Masukkan Nomor Kendaraan / Plat..."
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono outline-none focus:border-indigo-600 uppercase"
                                value={filterNoMobil}
                                onChange={e => setFilterNoMobil(e.target.value)}
                            />
                        </div>

                        <div className="md:col-span-4">
                            <label className="block mb-1 text-slate-700 font-black uppercase">
                                TRAYEK :
                            </label>
                            <select
                                value={filterTrayek}
                                onChange={e => setFilterTrayek(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-600 cursor-pointer uppercase"
                            >
                                <option value="">-- SEMUA TRAYEK --</option>
                                {trayekList.map((tr, i) => (
                                    <option key={i} value={tr.trayek_id || tr.id}>{tr.trayek_nama || tr.nama}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={fetchSuratTugasData}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs uppercase shadow-sm cursor-pointer"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> REFRESH
                            </button>

                            <button
                                type="button"
                                onClick={handleCetakRekap}
                                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs uppercase shadow-sm cursor-pointer"
                            >
                                <Printer size={14} /> CETAK
                            </button>

                            <button
                                type="button"
                                onClick={handleExportExcel}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs uppercase shadow-sm cursor-pointer"
                            >
                                <Download size={14} /> EXPORT
                            </button>

                            <button
                                type="button"
                                onClick={handleOpenStopST}
                                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl flex items-center gap-1.5 transition text-xs uppercase shadow-sm cursor-pointer tracking-wider"
                            >
                                <AlertOctagon size={15} /> OPEN STOP SURAT TUGAS
                            </button>

                            <button
                                type="button"
                                onClick={handleRekapST}
                                className="px-4 py-2 bg-[#004b84] hover:bg-[#003863] text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs uppercase shadow-sm cursor-pointer"
                            >
                                <FileSpreadsheet size={14} /> REKAP SURAT TUGAS
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🌟 2. DATA TABLE TEMPLATE (Action sudah ditangani langsung di array columns) */}
            <DataTableTemplate
                title="SURAT TUGAS / SURAT JALAN SUPIR"
                columns={columns}
                data={filteredList}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={handleAdd}
                onFilter={() => setShowFilter((prev) => !prev)}
                showFilter={showFilter}
            />

            {/* ========================================================================= */}
            {/* 📍 MODAL VIEW GPS HISTORY SESUAI FILE LAWAS OPR_T_SURATJALAN_GPSHIST.ASP   */}
            {/* ========================================================================= */}
            {isGpsModalOpen && selectedGpsItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 max-h-[92vh]">

                        {/* Header Modal */}
                        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-xl">
                                    <Navigation size={22} className="animate-pulse text-emerald-200" />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-wide">
                                        History Tracking GPS Armada ({selectedGpsItem.sjh_kendid})
                                    </h3>
                                    <p className="text-[11px] text-emerald-100">
                                        No. ST: <span className="font-mono font-bold">{selectedGpsItem.sjh_id}</span> | Pengemudi: {selectedGpsItem.nmsopir1 || selectedGpsItem.sjh_sopir1_nip}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsGpsModalOpen(false)}
                                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                            >
                                <XIcon size={20} />
                            </button>
                        </div>

                        {/* Content Body Modal */}
                        <div className="p-6 space-y-4 text-xs overflow-y-auto">
                            {/* Ringkasan Data Surat Tugas */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700">
                                <div>
                                    <span className="block text-slate-400 text-[10px] uppercase">STATUS PENUGASAN</span>
                                    <span className={`font-extrabold uppercase ${selectedGpsItem.sjh_completeyn === 'Y' ? 'text-emerald-700' : 'text-amber-600'}`}>
                                        {selectedGpsItem.sjh_completeyn === 'Y' ? 'SELESAI' : 'DALAM PERJALANAN'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-slate-400 text-[10px] uppercase">TGL BERANGKAT</span>
                                    <span className="font-mono">{selectedGpsItem.sjh_tanggal || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-400 text-[10px] uppercase">PENGEMUDI 1 & 2</span>
                                    <span className="uppercase">{selectedGpsItem.nmsopir1 || '-'} / {selectedGpsItem.nmsopir2 || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-400 text-[10px] uppercase">NO. KENDARAAN</span>
                                    <span className="font-mono font-black text-indigo-700">{selectedGpsItem.sjh_kendid}</span>
                                </div>
                            </div>

                            {/* Tabel Riwayat Koordinat GPS Sesuai File Lawas */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-slate-700 text-xs uppercase flex items-center gap-1.5">
                                        <MapPin size={14} className="text-emerald-600" /> Log Riwayat Koordinat Satelit
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-semibold">
                                        Total Titik Terekam: <b className="text-emerald-700">{gpsHistoryList.length}</b>
                                    </span>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-[#004b84] text-white text-[11px] font-bold uppercase tracking-wider">
                                            <tr>
                                                <th className="p-3 w-12 text-center">NO</th>
                                                <th className="p-3">TANGGAL / JAM UPDATE</th>
                                                <th className="p-3">KOORDINAT (LATITUDE, LONGITUDE)</th>
                                                <th className="p-3 text-center w-36">AKSI PETA</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                                            {loadingGps ? (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-8 text-slate-400">
                                                        <RefreshCw className="animate-spin inline mr-2" size={16} /> Mengambil riwayat sinyal GPS...
                                                    </td>
                                                </tr>
                                            ) : gpsHistoryList.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-8 text-slate-400">
                                                        Belum ada log rekaman titik GPS satelit untuk armada ini.
                                                    </td>
                                                </tr>
                                            ) : (
                                                gpsHistoryList.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-emerald-50/50 transition">
                                                        <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                                                        <td className="p-2.5 font-mono text-slate-700">{row.sjl_updatetime}</td>
                                                        <td className="p-2.5 font-mono font-bold text-emerald-800">
                                                            {row.sjl_lat}, {row.sjl_long}
                                                        </td>
                                                        <td className="p-2.5 text-center">
                                                            <a
                                                                href={`https://www.google.com/maps/place/${row.sjl_lat},${row.sjl_long}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                                                            >
                                                                <ExternalLink size={12} /> Buka Maps
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Footer Modal */}
                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsGpsModalOpen(false)}
                                className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-200 font-bold rounded-xl uppercase text-xs transition cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL POP-UP PEMBUATAN / EDIT SURAT TUGAS */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 max-h-[92vh]">

                        {/* 🌟 1. HEADER MODAL DENGAN NOMOR SURAT TUGAS RESMI */}
                        <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md">
                                    <Truck size={22} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-black text-emerald-700 tracking-wide uppercase">
                                            {isEditMode ? 'EDIT SURAT TUGAS' : 'PEMBUATAN SURAT TUGAS'}
                                        </h2>
                                        {isEditMode && formData.sjh_id && (
                                            <span className="px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 font-mono font-black text-xs rounded-xl shadow-2xs">
                                                {formData.sjh_id}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        Form administrasi penugasan armada operasional jalan
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition font-bold cursor-pointer"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSubmitForm} className="p-8 space-y-5 text-xs font-bold text-slate-700 overflow-y-auto flex-1">

                            {/* 🌟 BARIS 1: WAKTU BERANGKAT, BY LOADING, STATUS LOADING, STATUS CHECKIN */}
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-12 md:col-span-3">
                                    <label className="block mb-1 text-slate-600 uppercase">TANGGAL BERANGKAT :</label>
                                    <input
                                        type="date"
                                        className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-emerald-50/50 font-medium"
                                        value={formData.tgl_berangkat}
                                        onChange={e => setFormData({ ...formData, tgl_berangkat: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-span-12 md:col-span-3">
                                    <label className="block mb-1 text-slate-600 uppercase">JAM BERANGKAT :</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-mono bg-white"
                                        placeholder="HH:MM:SS"
                                        value={formData.jam_berangkat}
                                        onChange={e => setFormData({ ...formData, jam_berangkat: e.target.value })}
                                        required
                                    />
                                </div>

                                {/* By Loading */}
                                <div className="col-span-12 md:col-span-2">
                                    <label className="block mb-1 text-slate-600 uppercase">BY LOADING :</label>
                                    <div className="flex items-center gap-4 pt-2 font-bold">
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="by_loading"
                                                value="Ya"
                                                checked={formData.by_loading === 'Ya'}
                                                onChange={e => setFormData({ ...formData, by_loading: e.target.value })}
                                                className="w-4 h-4 text-emerald-600"
                                            />
                                            <span>Ya</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="by_loading"
                                                value="Tidak"
                                                checked={formData.by_loading === 'Tidak'}
                                                onChange={e => setFormData({ ...formData, by_loading: e.target.value })}
                                                className="w-4 h-4 text-emerald-600"
                                            />
                                            <span>Tidak</span>
                                        </label>
                                    </div>
                                </div>

                                {/* STATUS LOADING */}
                                <div className="col-span-12 md:col-span-2">
                                    <label className="block mb-1 text-slate-600 uppercase">STATUS LOADING :</label>
                                    <div className="flex items-center gap-4 pt-2 font-bold">
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status_loading"
                                                value="Ya"
                                                checked={formData.status_loading === 'Ya'}
                                                onChange={e => setFormData({ ...formData, status_loading: e.target.value })}
                                                className="w-4 h-4 text-emerald-600 cursor-pointer"
                                            />
                                            <span>Ya</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status_loading"
                                                value="Tidak"
                                                checked={formData.status_loading === 'Tidak'}
                                                onChange={e => setFormData({ ...formData, status_loading: e.target.value })}
                                                className="w-4 h-4 text-emerald-600 cursor-pointer"
                                            />
                                            <span>Tidak</span>
                                        </label>
                                    </div>
                                </div>

                                {/* STATUS CHECKIN */}
                                <div className="col-span-12 md:col-span-2">
                                    <label className="block mb-1 text-slate-600 uppercase">STATUS CHECKIN :</label>
                                    <div className="flex items-center gap-4 pt-2 font-bold">
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status_checkin"
                                                value="Ya"
                                                checked={formData.status_checkin === 'Ya'}
                                                onChange={e => setFormData({ ...formData, status_checkin: e.target.value })}
                                                className="w-4 h-4 text-emerald-600 cursor-pointer"
                                            />
                                            <span>Ya</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status_checkin"
                                                value="Tidak"
                                                checked={formData.status_checkin === 'Tidak'}
                                                onChange={e => setFormData({ ...formData, status_checkin: e.target.value })}
                                                className="w-4 h-4 text-emerald-600 cursor-pointer"
                                            />
                                            <span>Tidak</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Baris 2: Tanggal Kembali, Jam Kembali */}
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-12 md:col-span-6">
                                    <label className="block mb-1 text-slate-600 uppercase">TANGGAL KEMBALI :</label>
                                    <input
                                        type="date"
                                        className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white font-medium"
                                        value={formData.tgl_kembali}
                                        onChange={e => setFormData({ ...formData, tgl_kembali: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-12 md:col-span-6">
                                    <label className="block mb-1 text-slate-600 uppercase">JAM KEMBALI :</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-mono bg-white"
                                        placeholder="HH:MM:SS"
                                        value={formData.jam_kembali}
                                        onChange={e => setFormData({ ...formData, jam_kembali: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Baris 3: Armada, Pengemudi 1, Pengemudi 2 */}
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-12 md:col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">NOMOR KENDARAAN :</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white cursor-pointer uppercase font-bold text-slate-800"
                                        value={formData.sjh_kendid}
                                        onChange={e => setFormData({ ...formData, sjh_kendid: e.target.value })}
                                        required
                                    >
                                        <option value="">-- PILIH ARMADA --</option>
                                        {kendaraanList.map((k, i) => (
                                            <option key={i} value={k.kend_id || k.kend_identid}>{k.kend_identid || k.kend_id}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-12 md:col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">PENGEMUDI 1 :</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white cursor-pointer uppercase text-xs font-bold text-slate-800"
                                        value={formData.sjh_sopir1_nip}
                                        onChange={e => setFormData({ ...formData, sjh_sopir1_nip: e.target.value })}
                                        disabled={formData.by_loading === 'Ya'}
                                    >
                                        <option value="">-- PILIH PENGEMUDI 1 --</option>
                                        {formData.by_loading === 'Ya' ? (
                                            <option value="">DAFTAR PENGEMUDI DIKOSONGKAN</option>
                                        ) : (
                                            sopirList.map((s, i) => (
                                                <option key={i} value={s.kry_nip}>{s.kry_nama} [{s.kry_nip}]</option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div className="col-span-12 md:col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">PENGEMUDI 2 :</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white cursor-pointer uppercase text-xs font-bold text-slate-800"
                                        value={formData.sjh_sopir2_nip}
                                        onChange={e => setFormData({ ...formData, sjh_sopir2_nip: e.target.value })}
                                        disabled={formData.by_loading === 'Ya'}
                                    >
                                        <option value="">-- PILIH PENGEMUDI 2 (OPSIONAL) --</option>
                                        {formData.by_loading === 'Ya' ? (
                                            <option value="">DAFTAR PENGEMUDI DIKOSONGKAN</option>
                                        ) : (
                                            sopirList.map((s, i) => (
                                                <option key={i} value={s.kry_nip}>{s.kry_nama} [{s.kry_nip}]</option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            </div>

                            {/* Baris 4: Berangkat Dari, Pulang Ke, Tugas */}
                            <div className="grid grid-cols-12 gap-4">
                                {/* BERANGKAT DARI */}
                                <div className="col-span-12 md:col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">BERANGKAT DARI :</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white cursor-pointer uppercase font-bold text-slate-800"
                                        value={formData.sjh_startagenid}
                                        onChange={e => setFormData({ ...formData, sjh_startagenid: e.target.value })}
                                        required
                                    >
                                        <option value="">-- PILIH AGEN ASAL --</option>
                                        {agenList.map((a, i) => {
                                            // Jika agen adalah PUSAT DAKOTA, tampilkan sebagai DLI PUSAT
                                            const labelNama = (a.agen_nama === 'PUSAT DAKOTA' || a.agen_id === 'PST001' || a.agen_id === '001')
                                                ? 'DLI PUSAT'
                                                : a.agen_nama;
                                            return (
                                                <option key={i} value={a.agen_id}>
                                                    {labelNama}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* PULANG KE */}
                                <div className="col-span-12 md:col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">PULANG KE :</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white cursor-pointer uppercase font-bold text-slate-800"
                                        value={formData.sjh_endagenid}
                                        onChange={e => setFormData({ ...formData, sjh_endagenid: e.target.value })}
                                        required
                                    >
                                        <option value="">-- PILIH AGEN TUJUAN --</option>
                                        {agenList.map((a, i) => {
                                            const labelNama = (a.agen_nama === 'PUSAT DAKOTA' || a.agen_id === 'PST001' || a.agen_id === '001')
                                                ? 'DLI PUSAT'
                                                : a.agen_nama;
                                            return (
                                                <option key={i} value={a.agen_id}>
                                                    {labelNama}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div className="col-span-12 md:col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">TUGAS :</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white cursor-pointer uppercase font-bold text-indigo-900"
                                        value={formData.sjh_assid}
                                        onChange={e => setFormData({ ...formData, sjh_assid: e.target.value })}
                                    >
                                        <option value="">-- PILIH TUGAS --</option>
                                        {tugasList.map((t, i) => (
                                            <option key={i} value={t.ass_id}>{t.ass_nama}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Baris Uang Muka Biaya Operasional (Tabel Dropdown Langsung Muncul di Bawah Input) */}
                            <div className="space-y-2 relative">
                                <label className="block text-slate-600 uppercase">UANG MUKA BIAYA OPERASIONAL :</label>
                                <div className="flex gap-3">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            placeholder="Ketik nama trayek / kode uang muka (contoh: Medan, Cikarang)..."
                                            className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-indigo-600 bg-white font-bold text-slate-800"
                                            value={formData.nama_um || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData(prev => ({ ...prev, nama_um: val }));
                                                if (val.trim().length > 0) {
                                                    handleSearchUangMuka(val);
                                                    setIsUmListVisible(true);
                                                } else {
                                                    setIsUmListVisible(false);
                                                }
                                            }}
                                            onFocus={() => {
                                                if (formData.nama_um) {
                                                    handleSearchUangMuka(formData.nama_um);
                                                    setIsUmListVisible(true);
                                                }
                                            }}
                                        />
                                        {formData.nama_um && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, nama_um: '', sjh_trayekid: '', nominal_um: 0 }));
                                                    setIsUmListVisible(false);
                                                }}
                                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                            >
                                                <XIcon size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="w-48">
                                        <input
                                            type="text"
                                            readOnly
                                            placeholder="Nominal Rp 0"
                                            className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono font-bold text-emerald-700 outline-none"
                                            value={`Rp ${Number(formData.nominal_um || 0).toLocaleString('id-ID')}`}
                                        />
                                    </div>
                                </div>

                                {/* Dropdown Tabel Muncul Tepat di Bawah Input */}
                                {isUmListVisible && (
                                    <div className="max-h-64 overflow-y-auto border border-slate-300 rounded-xl bg-white shadow-xl z-20 relative">
                                        {loadingUm ? (
                                            <div className="p-4 text-center text-slate-400 font-bold text-xs">Mencari rincian biaya uang muka...</div>
                                        ) : umList.length === 0 ? (
                                            <div className="p-4 text-center text-slate-400 font-bold text-xs">Tidak ada data uang muka yang cocok.</div>
                                        ) : (
                                            <table className="w-full border-collapse text-xs">
                                                <thead className="bg-[#004b84] text-white sticky top-0">
                                                    <tr>
                                                        <th className="p-2.5 text-left w-36">KODE UANG MUKA</th>
                                                        <th className="p-2.5 text-left">NAMA</th>
                                                        <th className="p-2.5 text-left">NAMA BIAYA</th>
                                                        <th className="p-2.5 text-right w-32">NOMINAL</th>
                                                    </tr>
                                                </thead>

                                                <tbody className="divide-y divide-slate-200">
                                                    {umList.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-sky-50/50">
                                                            {/* 1. KODE UANG MUKA */}
                                                            <td className="p-2.5 font-mono font-bold align-top text-slate-700 w-36">
                                                                {item.kode_uang_muka || '-'}
                                                            </td>

                                                            {/* 2. NAMA TRAYEK */}
                                                            <td className="p-2.5 font-bold align-top text-slate-800">
                                                                {item.nama || '-'}
                                                            </td>

                                                            {/* 3. RINCIAN BIAYA & TOMBOL PILIH */}
                                                            <td className="p-0 align-top">
                                                                <table className="w-full text-[11px] border-collapse">
                                                                    <tbody>
                                                                        {item.details && item.details.length > 0 ? (
                                                                            item.details.map((d, dIdx) => (
                                                                                <tr key={dIdx} className="border-b border-slate-100 last:border-0">
                                                                                    <td className="p-1.5 text-slate-600 font-medium">{d.nama_biaya}</td>
                                                                                    <td className="p-1.5 text-right font-mono text-slate-700 w-28">
                                                                                        {Number(d.nominal).toLocaleString('id-ID')}
                                                                                    </td>
                                                                                </tr>
                                                                            ))
                                                                        ) : (
                                                                            <tr>
                                                                                <td colSpan="2" className="p-2 text-slate-400 italic">Rincian biaya belum diatur</td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                                <div className="p-1.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                sjh_trayekid: item.kode_uang_muka,
                                                                                nama_um: item.nama,
                                                                                nominal_um: item.total
                                                                            }));
                                                                            setIsUmListVisible(false);
                                                                        }}
                                                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded text-[11px] cursor-pointer shadow-xs"
                                                                    >
                                                                        PILIH
                                                                    </button>
                                                                    <span className="font-mono font-bold text-slate-700 text-[11px]">
                                                                        Total: {Number(item.total).toLocaleString('id-ID')}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            {/* 4. TOTAL NOMINAL */}
                                                            <td className="p-2.5 text-right font-mono font-bold text-emerald-700 align-top w-32">
                                                                Rp {Number(item.total).toLocaleString('id-ID')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Baris 6: Keterangan */}
                            <div>
                                <label className="block mb-1 text-slate-600 uppercase">KETERANGAN :</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white font-medium"
                                    placeholder="Masukkan Keterangan"
                                    value={formData.sjh_keterangan}
                                    onChange={e => setFormData({ ...formData, sjh_keterangan: e.target.value })}
                                />
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex justify-center items-center gap-4 pt-6 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-[160px] py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center text-xs"
                                >
                                    BATAL
                                </button>
                                <button
                                    type="submit"
                                    className="w-[160px] py-3 bg-[#1e1b4b] hover:opacity-90 active:scale-98 text-white font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center text-xs shadow-md"
                                >
                                    {isEditMode ? 'UPDATE ST' : 'SIMPAN ST'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* 🌟 MODAL PEMILIHAN UANG MUKA OPERASIONAL */}
            {isUmModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 max-h-[85vh]">
                        <div className="px-6 py-4 bg-[#004b84] text-white flex justify-between items-center">
                            <h3 className="font-bold text-sm tracking-wide uppercase">Pilih Uang Muka Biaya Operasional</h3>
                            <button onClick={() => setIsUmModalOpen(false)} className="cursor-pointer text-white/80 hover:text-white">
                                <XIcon size={20} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-200">
                            <input
                                type="text"
                                placeholder="Ketik kode uang muka atau tujuan trayek (contoh: Cikarang, Medan, Lampung)..."
                                className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-xs outline-none focus:border-indigo-600"
                                value={umKeyword}
                                onChange={(e) => {
                                    setUmKeyword(e.target.value);
                                    handleSearchUangMuka(e.target.value);
                                }}
                            />
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            {loadingUm ? (
                                <div className="py-8 text-center text-slate-400 font-bold text-xs">Memuat data biaya operasional...</div>
                            ) : umList.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 font-bold text-xs">Data Uang Muka tidak ditemukan.</div>
                            ) : (
                                <table className="w-full border-collapse border border-slate-200 text-xs">
                                    <thead>
                                        <tr className="bg-[#004b84] text-white font-bold text-[11px] text-center uppercase">
                                            <th className="p-2.5 border border-slate-200 w-36">KODE UANG MUKA</th>
                                            <th className="p-2.5 border border-slate-200">NAMA</th>
                                            <th className="p-2.5 border border-slate-200">NAMA BIAYA</th>
                                            <th className="p-2.5 border border-slate-200 w-32">NOMINAL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {umList.map((item, idx) => (
                                            <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/80">
                                                <td className="p-3 border border-slate-200 font-mono font-bold align-top text-slate-700">
                                                    {item.kode_uang_muka}
                                                </td>
                                                <td className="p-3 border border-slate-200 font-bold align-top text-slate-800">
                                                    {item.nama}
                                                </td>
                                                <td className="p-0 border border-slate-200 align-top">
                                                    <table className="w-full border-collapse text-[11px]">
                                                        <tbody>
                                                            {item.details?.map((d, dIdx) => (
                                                                <tr key={dIdx} className="border-b border-slate-100 last:border-0">
                                                                    <td className="p-2 text-slate-600 font-medium">{d.nama_biaya}</td>
                                                                    <td className="p-2 text-right font-mono text-slate-700 w-28">
                                                                        {Number(d.nominal).toLocaleString('id-ID')}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    <div className="p-2 flex items-center justify-between bg-slate-100 border-t border-slate-200">
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePilihUangMuka(item)}
                                                            className="px-4 py-1.5 bg-[#009b4d] hover:bg-emerald-700 text-white font-black text-xs rounded transition uppercase tracking-wider cursor-pointer shadow-xs"
                                                        >
                                                            PILIH
                                                        </button>
                                                        <span className="font-mono font-bold text-slate-700 text-xs">
                                                            Total: {Number(item.total).toLocaleString('id-ID')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3 border border-slate-200 text-right font-mono font-bold text-emerald-700 align-top">
                                                    Rp {Number(item.total).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 🖨️ MODAL CETAK SURAT TUGAS RESMI DAKOTA BESERTA QR CODE */}
            {isPrintModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
                        {/* Toolbar Cetak */}
                        <div className="p-4 bg-slate-100 border-b flex justify-between items-center print:hidden">
                            <span className="font-bold text-xs uppercase text-slate-700">Preview Cetak Dokumen Surat Tugas</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handlePrintDocument}
                                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                    <Printer size={14} /> Cetak Dokumen
                                </button>
                                <button
                                    onClick={() => setIsPrintModalOpen(false)}
                                    className="px-3 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg font-bold text-xs cursor-pointer"
                                >
                                    Tutup
                                </button>
                                <button
                                    onClick={() => setIsPrintModalOpen(false)}
                                    className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer font-bold ml-1"
                                >
                                    <XIcon size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Layout Cetak Modern Ready Print & Zebra Table */}
                        <div className="p-8 overflow-y-auto bg-white font-sans text-slate-800 leading-normal" id="printable-area">
                            {loadingPrint || !printData ? (
                                <div className="text-center py-12 text-slate-400 text-xs font-mono">Menyiapkan halaman cetak...</div>
                            ) : (
                                <div className="space-y-4 text-xs">
                                    {/* 🌟 1. HEADER ATAS: LOGO DAKOTA & QR CODE MODERN */}
                                    <div className="flex justify-between items-start pb-3 border-b-2 border-slate-800">
                                        <div className="space-y-1">
                                            <img
                                                src={dakotaLogo}
                                                alt="Dakota Cargo"
                                                className="h-10 w-auto object-contain mb-1"
                                            />
                                            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                                                SURAT TUGAS SUPIR LK
                                            </h2>
                                            <p className="text-[11px] font-medium text-slate-500">https://www.dakotacargo.co.id</p>
                                            <p className="text-[10px] text-slate-400 italic">
                                                Mohon scan QRCode/Barcode untuk validasi surat tugas ini
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                                            <QRCodeSVG
                                                value={printData.sjh_id || '-'}
                                                size={84}
                                                level="M"
                                                includeMargin={false}
                                            />
                                            <span className="font-mono font-black text-[11px] mt-1.5 text-slate-900 tracking-wider">
                                                {printData.sjh_id}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 🌟 2. RINCIAN TUGAS & JADWAL */}
                                    <div className="grid grid-cols-12 gap-y-1.5 py-1 text-slate-700 font-medium">
                                        <div className="col-span-3 font-bold uppercase text-slate-900">TUGAS</div>
                                        <div className="col-span-9 font-bold uppercase text-slate-900">: {printData.ass_nama}</div>

                                        <div className="col-span-3 text-slate-600">TGL BERANGKAT</div>
                                        <div className="col-span-9 font-mono font-semibold">: {printData.sjh_tanggal}</div>

                                        <div className="col-span-3 text-slate-600">TGL KEDATANGAN</div>
                                        <div className="col-span-9 font-mono font-semibold">: {printData.sjh_tanggalkembali}</div>
                                    </div>

                                    <div className="border-t border-slate-200 my-2"></div>

                                    {/* 🌟 3. RINCIAN KENDARAAN & PENGEMUDI */}
                                    <div className="grid grid-cols-12 gap-y-1.5 py-1 text-slate-700">
                                        <div className="col-span-3 font-bold uppercase text-slate-900">NO KENDARAAN</div>
                                        <div className="col-span-9 font-mono font-black text-slate-900">: {printData.sjh_kendid}</div>

                                        <div className="col-span-3 text-slate-600">PENGEMUDI</div>
                                        <div className="col-span-4 font-semibold">: 1. {printData.nmsopir1}</div>
                                        <div className="col-span-5 font-semibold">2. {printData.nmsopir2 !== '-' ? printData.nmsopir2 : ''}</div>

                                        <div className="col-span-3 text-slate-600">NIP PENGEMUDI</div>
                                        <div className="col-span-4 font-mono text-slate-600">: 1. {printData.sjh_sopir1_nip}</div>
                                        <div className="col-span-5 font-mono text-slate-600">2. {printData.sjh_sopir2_nip !== '-' ? printData.sjh_sopir2_nip : ''}</div>
                                    </div>

                                    <div className="border-t border-slate-200 my-2"></div>

                                    {/* 🌟 4. BLOK ISIAN MANUAL KM & JAM OPERASIONAL */}
                                    <div className="grid grid-cols-12 gap-y-2 py-1.5 text-slate-700">
                                        <div className="col-span-2 text-slate-600">KM AWAL</div>
                                        <div className="col-span-4 font-mono">: ....................................</div>
                                        <div className="col-span-3 text-slate-600">JAM BERANGKAT</div>
                                        <div className="col-span-3 font-mono">: ....................</div>

                                        <div className="col-span-2 text-slate-600">KM AKHIR</div>
                                        <div className="col-span-4 font-mono">: ....................................</div>
                                        <div className="col-span-3 text-slate-600">JAM KEDATANGAN</div>
                                        <div className="col-span-3 font-mono">: ....................</div>
                                    </div>

                                    <div className="border-t border-slate-200 my-2"></div>

                                    {/* 🌟 5. TABEL RINCIAN UANG MUKA / BPLK DENGAN EFEK ZEBRA */}
                                    {printData.rincian_biaya && printData.rincian_biaya.length > 0 && (
                                        <div className="space-y-2 pt-1 pb-1">
                                            {/* Header Trayek Card */}
                                            <div className="text-center font-bold text-xs uppercase tracking-wide bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200 text-slate-800">
                                                {printData.nama_trayek} <span className="font-mono text-slate-600">({printData.sjh_trayekid})</span>
                                            </div>

                                            <div className="overflow-hidden rounded-xl border border-slate-300">
                                                <table className="w-full border-collapse text-xs">
                                                    <thead>
                                                        <tr className="bg-[#004b84] text-white text-left font-bold uppercase text-[11px] tracking-wider">
                                                            <th className="py-2.5 px-3 w-40">KODE</th>
                                                            <th className="py-2.5 px-3">NAMA BIAYA</th>
                                                            <th className="py-2.5 px-3 text-right w-36">NOMINAL</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200">
                                                        {printData.rincian_biaya.map((b, bIdx) => (
                                                            <tr
                                                                key={bIdx}
                                                                /* 🌟 Efek Zebra Kolom/Baris: Genap Putih, Ganjil Slate Halus */
                                                                className={bIdx % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}
                                                            >
                                                                <td className="py-2 px-3 font-mono text-slate-700 font-semibold">{b.kode}</td>
                                                                <td className="py-2 px-3 uppercase text-slate-800 font-medium">{b.nama_biaya}</td>
                                                                <td className="py-2 px-3 text-right font-mono text-slate-900 font-bold">
                                                                    {Number(b.nominal).toLocaleString('id-ID')}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="border-t-2 border-slate-800 bg-slate-100 font-black text-slate-900">
                                                            <td colSpan="2" className="py-2 px-3 uppercase tracking-wider text-xs">
                                                                TOTAL BPLK
                                                            </td>
                                                            <td className="py-2 px-3 text-right font-mono text-sm text-[#004b84]">
                                                                Rp {Number(printData.total_bplk || 0).toLocaleString('id-ID')}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>

                                            <div className="border-t border-slate-200 my-2"></div>
                                        </div>
                                    )}

                                    {/* 🌟 6. BLOK TANDA TANGAN */}
                                    <div className="pt-2">
                                        <p className="text-[11px] mb-8 text-slate-600 font-medium">
                                            {printData.cbgmulai}, {printData.tgl_cetak || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>

                                        <div className="grid grid-cols-3 text-center text-xs">
                                            <div>
                                                <p className="font-bold text-slate-800 mb-16">Pemberi Tugas</p>
                                                <p className="font-medium text-slate-600">( Operasional )</p>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 mb-16">Pengemudi</p>
                                                <p className="font-semibold text-slate-900 underline underline-offset-4">{printData.nmsopir1}</p>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 mb-16">Menyetujui</p>
                                                <p className="font-medium text-slate-600">( .................................... )</p>
                                            </div>
                                        </div>
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

export default SuratTugas;