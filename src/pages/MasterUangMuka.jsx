import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    RefreshCw, X as XIcon, Truck, Printer, Plus,
    Search, Trash2, CheckCircle, XCircle,
    DollarSign, Eye, Route, Power, Filter,
    PlusCircle, Layers
} from 'lucide-react';
import Swal from 'sweetalert2';
import dliLogo from '../assets/logoDLI.png';

const MasterUangMuka = () => {
    const { isDarkMode } = useDarkMode();
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter
    const [showFilter, setShowFilter] = useState(true);
    const [filterKeyword, setFilterKeyword] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Modal Tambah Trayek Header Baru
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addForm, setAddForm] = useState({
        trh_id: '',
        trh_name: '',
        trh_jnskend: '',
        trh_aktifyn: 'Y'
    });
    const [kendaraanOptions, setKendaraanOptions] = useState([]);

    // Modal Detail Rincian Biaya BPLK
    const [selectedItem, setSelectedItem] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [biayaList, setBiayaList] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Modal Print
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // 🌟 STATE BARU: MODAL INPUT MULTI-ROW TAMBAH KOMPONEN BIAYA BPLK
    const [isTambahBiayaModalOpen, setIsTambahBiayaModalOpen] = useState(false);
    const [kamusBiayaList, setKamusBiayaList] = useState([]);
    const [rowsBiayaBaru, setRowsBiayaBaru] = useState([
        { kode_biaya: '', nama_biaya: '', nominal: '', um_yn: 'Ya' }
    ]);

    useEffect(() => {
        fetchUangMukaData();
        fetchKendaraanOptions();
        fetchKamusBiaya();
    }, []);

    const fetchKendaraanOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/master/jenis-kendaraan', {
                headers: { Authorization: `Bearer ${token}` }
            }).catch(() => ({ data: [] }));
            setKendaraanOptions(res.data?.data || res.data || []);
        } catch (err) {
            console.error('Gagal memuat jenis kendaraan:', err);
        }
    };

    // Mengambil kamus biaya murni dari database melalui API
    const fetchKamusBiaya = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/master/uang-muka/kamus-biaya', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data?.data || [];
            setKamusBiayaList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Gagal memuat kamus biaya dari API:', err);
            setKamusBiayaList([]);
        }
    };

    // Fetch List Utama Trayek Uang Muka
    const fetchUangMukaData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const res = await api.get('/master/uang-muka', {
                params: { q: filterKeyword, pt_id: ptId },
                headers: { Authorization: `Bearer ${token}` }
            });
            setDataList(res.data?.data || []);
        } catch (err) {
            console.error('Gagal memuat master uang muka:', err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    // Load Rincian Biaya Komponen BPLK
    const handleOpenDetail = async (item) => {
        setSelectedItem(item);
        setIsDetailModalOpen(true);
        setLoadingDetail(true);
        setBiayaList([]);

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/master/uang-muka/detail/${encodeURIComponent(item.trh_id)}`, {
                params: { pt_id: ptId },
                headers: { Authorization: `Bearer ${token}` }
            });
            setBiayaList(res.data?.biaya || []);
        } catch (err) {
            Swal.fire('Error', 'Gagal memuat rincian biaya operasional.', 'error');
        } finally {
            setLoadingDetail(false);
        }
    };

    // 🌟 HAPUS SATU BARIS KOMPONEN BIAYA DARI TRAYEK
    const handleDeleteBiayaItem = (biayaItem) => {
        Swal.fire({
            title: 'Hapus Biaya?',
            text: `Hapus komponen biaya "${biayaItem.nama_biaya}" (${biayaItem.kode}) dari trayek ini?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/master/uang-muka/biaya-delete', {
                        params: {
                            trh_id: selectedItem.trh_id,
                            kode: biayaItem.kode
                        },
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Terhapus!', 'Komponen biaya berhasil dihapus.', 'success');
                    handleOpenDetail(selectedItem); // Reload rincian
                    fetchUangMukaData(); // Reload list utama
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus komponen biaya', 'error');
                }
            }
        });
    };

    // 🌟 BUKA MODAL TAMBAH MULTI-ROW BIAYA
    const handleOpenModalTambahBiaya = () => {
        fetchKamusBiaya(); // Memastikan list selalu termutakhir dari database
        setRowsBiayaBaru([
            { kode_biaya: '', nama_biaya: '', nominal: '', um_yn: 'Ya' }
        ]);
        setIsTambahBiayaModalOpen(true);
    };

    // Tambah Baris Kosong Baru
    const handleAddRowBiaya = () => {
        setRowsBiayaBaru(prev => [
            ...prev,
            { kode_biaya: '', nama_biaya: '', nominal: '', um_yn: 'Ya' }
        ]);
    };

    // Hapus Baris Input
    const handleRemoveRowBiaya = (indexToRemove) => {
        if (rowsBiayaBaru.length === 1) {
            Swal.fire('Info', 'Minimal harus ada 1 baris pengisian.', 'info');
            return;
        }
        setRowsBiayaBaru(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    // Update Nilai Field Baris Dinamis
    const handleUpdateRowBiaya = (index, field, value) => {
        setRowsBiayaBaru(prev => {
            const copy = [...prev];
            copy[index][field] = value;
            if (field === 'kode_biaya') {
                const found = kamusBiayaList.find(k => k.bplku_id === value);
                if (found) {
                    copy[index].nama_biaya = found.bplku_nama;
                }
            }
            return copy;
        });
    };

    // 🌟 SUBMIT SIMPAN BIAYA MULTI-ROW
    const handleSubmitSimpanBiaya = async (e) => {
        e.preventDefault();

        // Validasi
        const validRows = rowsBiayaBaru.filter(r => r.kode_biaya && r.nominal !== '');
        if (validRows.length === 0) {
            Swal.fire('Peringatan', 'Lengkapi minimal satu komponen biaya beserta nominalnya!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const payload = {
                trh_id: selectedItem.trh_id,
                items: validRows.map(r => ({
                    kode_biaya: r.kode_biaya,
                    nominal: parseFloat(r.nominal) || 0,
                    um_yn: r.um_yn
                }))
            };

            await api.post('/master/uang-muka/biaya-save', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', 'Rincian komponen biaya operasional berhasil disimpan.', 'success');
            setIsTambahBiayaModalOpen(false);
            handleOpenDetail(selectedItem); // Refresh rincian biaya di modal
            fetchUangMukaData(); // Refresh list master
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan komponen biaya', 'error');
        }
    };

    // Toggle Status Aktif / Non-Aktif
    const handleToggleStatus = (item) => {
        const isCurrentlyActive = item.trh_aktifyn === 'Y' || item.trh_aktifyn === '';
        const targetStatus = isCurrentlyActive ? 'N' : 'Y';
        const actionLabel = isCurrentlyActive ? 'NON-AKTIFKAN' : 'AKTIFKAN';

        Swal.fire({
            title: `${actionLabel} Plafon Trayek?`,
            text: `Ubah status ${item.trh_id} (${item.trh_name}) menjadi ${actionLabel}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: isCurrentlyActive ? '#e11d48' : '#16a34a',
            cancelButtonColor: '#64748b',
            confirmButtonText: `Ya, ${actionLabel}!`,
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.post('/master/uang-muka/toggle-status', {
                        trh_id: item.trh_id,
                        trh_aktifyn: targetStatus
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Berhasil!', 'Status trayek diperbarui.', 'success');
                    fetchUangMukaData();
                    if (selectedItem && selectedItem.trh_id === item.trh_id) {
                        setSelectedItem(prev => ({ ...prev, trh_aktifyn: targetStatus }));
                    }
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengubah status', 'error');
                }
            }
        });
    };

    // Handler Print Dokumen
    const handlePrintSingle = (item) => {
        handleOpenDetail(item);
        setTimeout(() => setIsPrintModalOpen(true), 400);
    };

    const handlePrintDocument = () => {
        const printContent = document.getElementById('printable-area-bplk');
        if (!printContent) return;

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
                <title>Cetak BPLK - ${selectedItem?.trh_id || ''}</title>
                ${styles}
                <style>
                    @page { size: A4 portrait; margin: 12mm 15mm; }
                    body {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
                        -webkit-print-color-adjust: exact !important;
                    }
                </style>
            </head>
            <body onload="window.print()">
                ${printContent.innerHTML}
            </body>
            </html>
        `);
        doc.close();

        iframe.contentWindow.onafterprint = () => {
            document.body.removeChild(iframe);
        };
    };

    // Filter Global
    const filteredList = dataList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.trh_id && item.trh_id.toLowerCase().includes(q)) ||
            (item.trh_name && item.trh_name.toLowerCase().includes(q)) ||
            (item.jnskend_nama && item.jnskend_nama.toLowerCase().includes(q))
        );
    });

    // Kolom Grid Utama
    const columns = [
        {
            header: 'KODE',
            accessor: 'trh_id',
            render: (i) => (
                <button
                    type="button"
                    onClick={() => handleOpenDetail(i)}
                    className="font-mono font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer flex items-center gap-1.5"
                >
                    <Route size={14} className="text-sky-600" />
                    {i.trh_id || '-'}
                </button>
            )
        },
        {
            header: 'NAMA TRAYEK / OPERASIONAL',
            accessor: 'trh_name',
            render: (i) => (
                <div>
                    <span className="font-bold text-slate-800 uppercase block text-xs">{i.trh_name || '-'}</span>
                    {i.rute_utama && i.rute_utama !== '-' && (
                        <span className="text-[10px] text-slate-500 font-medium block mt-0.5 line-clamp-1">
                            📍 Rute: {i.rute_utama}
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'JENIS KENDARAAN',
            accessor: 'jnskend_nama',
            render: (i) => (
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                    <Truck size={12} className="text-slate-500" />
                    {i.jnskend_nama || '-'}
                </span>
            )
        },
        {
            header: 'TOTAL BPLK (RP)',
            accessor: 'jbplk',
            render: (i) => (
                <span className="font-mono font-black text-emerald-700 text-xs">
                    Rp {Number(i.jbplk || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'STATUS',
            accessor: 'trh_aktifyn',
            render: (i) => {
                const isActive = i.trh_aktifyn === 'Y' || i.trh_aktifyn === '';
                return (
                    <button
                        type="button"
                        onClick={() => handleToggleStatus(i)}
                        className="cursor-pointer"
                        title="Klik untuk ubah status"
                    >
                        {isActive ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                                <CheckCircle size={12} /> AKTIF
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">
                                <XCircle size={12} /> NON-AKTIF
                            </span>
                        )}
                    </button>
                );
            }
        },
        {
            header: 'ACTION',
            accessor: 'action',
            render: (item) => (
                <div className="flex items-center justify-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => handleOpenDetail(item)}
                        title="Buka Rincian Biaya BPLK"
                        className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                    >
                        <Eye size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handlePrintSingle(item)}
                        title="Cetak Plafon Trayek"
                        className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                    >
                        <Printer size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        title={item.trh_aktifyn === 'Y' ? 'Non-Aktifkan' : 'Aktifkan'}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${item.trh_aktifyn === 'Y' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                    >
                        <Power size={15} />
                    </button>
                </div>
            )
        }
    ];

    const totalNominalDetail = biayaList.reduce((sum, b) => sum + Number(b.nominal || 0), 0);

    return (
        <div className="space-y-4 font-sans">
            {/* Filter */}
            {showFilter && (
                <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200 space-y-4 text-xs font-bold text-slate-600">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-8">
                            <label className="block mb-1.5 text-slate-700 font-black uppercase tracking-wider">
                                UANG MUKA BIAYA OPERASIONAL (KODE / NAMA TRAYEK) :
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Masukkan Kode Uang Muka Biaya Operasional / Nama Trayek..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-600"
                                    value={filterKeyword}
                                    onChange={(e) => setFilterKeyword(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            fetchUangMukaData();
                                        }
                                    }}
                                />
                                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                            </div>
                        </div>

                        <div className="md:col-span-4 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={fetchUangMukaData}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition text-xs uppercase shadow-sm cursor-pointer"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> REFRESH
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition text-xs uppercase shadow-sm cursor-pointer"
                            >
                                <Printer size={14} /> CETAK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🌟 3. DATA TABLE TEMPLATE (HILANGKAN TOMBOL FILTER BAWAAN) */}
            <DataTableTemplate
                title="MASTER UANG MUKA BIAYA OPERASIONAL (BPLK / BPDK)"
                columns={columns}
                data={filteredList}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                hideAddButton={false}
                onAdd={() => {
                    setAddForm({ trh_id: '', trh_name: '', trh_jnskend: '', trh_aktifyn: 'Y' });
                    setIsAddModalOpen(true);
                }}
                onFilter={() => setShowFilter(prev => !prev)}
            />

            {/* ========================================================================= */}
            {/* 🌟 1. MODAL DETAIL RINCIAN BIAYA DENGAN TOMBOL TAMBAH & ACTION EDIT/HAPUS */}
            {/* ========================================================================= */}
            {isDetailModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 max-h-[92vh]">
                        {/* Header Modal */}
                        <div className="px-8 py-5 bg-[#004b84] text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/10 rounded-2xl shadow-md">
                                    <DollarSign size={22} className="text-emerald-300" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-wider">
                                        Rincian Uang Muka Biaya Operasional (BPLK)
                                    </h2>
                                    <p className="text-[11px] text-sky-200 font-mono mt-0.5">
                                        {selectedItem.trh_id} — {selectedItem.trh_name}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsDetailModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer font-bold"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>

                        {/* Body Modal */}
                        <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                            {/* Metadata Trayek */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700">
                                <div>
                                    <span className="block text-slate-400 text-[10px] uppercase">KODE TRAYEK :</span>
                                    <span className="font-mono text-sky-800 text-xs">{selectedItem.trh_id}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-400 text-[10px] uppercase">JENIS KENDARAAN :</span>
                                    <span className="text-slate-800 text-xs">{selectedItem.jnskend_nama}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-400 text-[10px] uppercase">STATUS TRAYEK :</span>
                                    <span className={`inline-block font-black text-[10px] uppercase ${selectedItem.trh_aktifyn === 'Y' || selectedItem.trh_aktifyn === '' ? 'text-emerald-700' : 'text-rose-600'}`}>
                                        {selectedItem.trh_aktifyn === 'Y' || selectedItem.trh_aktifyn === '' ? 'AKTIF' : 'NON-AKTIF'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-slate-400 text-[10px] uppercase">TOTAL PLAFON :</span>
                                    <span className="font-mono text-emerald-700 text-sm">
                                        Rp {Number(totalNominalDetail || selectedItem.jbplk || 0).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>

                            {/* 🌟 BARIS TOMBOL TAMBAH KOMPONEN BIAYA (MODERN SEPERTI GAMBAR 2) */}
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                                        <Layers size={15} className="text-[#004b84]" /> Daftar Komponen Biaya Operasional
                                    </span>
                                    <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                        {biayaList.length} Komponen
                                    </span>
                                </div>

                                {/* 🌟 TOMBOL TAMBAH BIAYA OPERASIONAL */}
                                <button
                                    type="button"
                                    onClick={handleOpenModalTambahBiaya}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                                >
                                    <PlusCircle size={15} /> Tambah Biaya BPLK
                                </button>
                            </div>

                            {/* Tabel Rincian Biaya BPLK dengan Kolom Action Hapus */}
                            <div className="overflow-hidden rounded-xl border border-slate-300 shadow-xs">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-[#004b84] text-white font-bold uppercase text-[11px] tracking-wider">
                                        <tr>
                                            <th className="py-2.5 px-3 w-36">KODE BIAYA</th>
                                            <th className="py-2.5 px-3">KOMPONEN BIAYA OPERASIONAL</th>
                                            <th className="py-2.5 px-3 text-center w-24">UANG MUKA</th>
                                            <th className="py-2.5 px-3 text-right w-36">NOMINAL (RP)</th>
                                            <th className="py-2.5 px-3 text-center w-20">AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 font-medium">
                                        {loadingDetail ? (
                                            <tr>
                                                <td colSpan="5" className="text-center py-8 text-slate-400 font-mono">
                                                    <RefreshCw className="animate-spin inline mr-2" size={16} /> Memuat komponen biaya operasional...
                                                </td>
                                            </tr>
                                        ) : biayaList.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center py-8 text-slate-400 italic">
                                                    Belum ada komponen rincian biaya yang terdaftar untuk trayek ini. Klik tombol <b className="text-emerald-700">"Tambah Biaya BPLK"</b> di atas.
                                                </td>
                                            </tr>
                                        ) : (
                                            biayaList.map((b, idx) => (
                                                <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                                                    <td className="py-2.5 px-3 font-mono font-bold text-sky-700">{b.kode}</td>
                                                    <td className="py-2.5 px-3 uppercase text-slate-800 font-semibold">{b.nama_biaya}</td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                                                            {b.um_yn === 'Y' ? 'YA' : 'TIDAK'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                                                        {Number(b.nominal || 0).toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteBiayaItem(b)}
                                                            title="Hapus Biaya"
                                                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 border-t-2 border-slate-800 font-black text-slate-900">
                                            <td colSpan="3" className="py-2.5 px-3 uppercase tracking-wider text-right text-xs">
                                                TOTAL BIAYA OPERASIONAL (BPLK) :
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-sm text-[#004b84]">
                                                Rp {totalNominalDetail.toLocaleString('id-ID')}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Footer Modal */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => handleToggleStatus(selectedItem)}
                                className={`px-4 py-2 font-bold rounded-xl text-xs uppercase transition cursor-pointer flex items-center gap-1.5 ${selectedItem.trh_aktifyn === 'Y' || selectedItem.trh_aktifyn === '' ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}
                            >
                                <Power size={14} />
                                {selectedItem.trh_aktifyn === 'Y' || selectedItem.trh_aktifyn === '' ? 'Non-Aktifkan Trayek' : 'Aktifkan Trayek'}
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handlePrintSingle(selectedItem)}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                                >
                                    <Printer size={14} /> Cetak Plafon
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-200 font-bold rounded-xl uppercase text-xs transition cursor-pointer"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 🌟 2. MODAL ENTRI MULTI-ROW TAMBAH KOMPONEN BIAYA (MODERN SEPERTI GAMBAR 3) */}
            {/* ========================================================================= */}
            {isTambahBiayaModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 max-h-[90vh]">
                        {/* Header Modal */}
                        <div className="px-6 py-4 bg-[#004b84] text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                                    <PlusCircle size={18} className="text-emerald-300" /> Entri Komponen Biaya Operasional (BPLK)
                                </h3>
                                <p className="text-xs text-sky-100 font-medium mt-0.5">
                                    {selectedItem.trh_id} — {selectedItem.trh_name} ({selectedItem.jnskend_nama})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTambahBiayaModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer font-bold"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>

                        {/* Body Form Multi-Row */}
                        <form onSubmit={handleSubmitSimpanBiaya} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 overflow-y-auto space-y-3 flex-1">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                    <span className="text-xs font-bold text-slate-600 uppercase">
                                        Rincian Komponen Biaya Yang Ingin Ditambahkan / Diperbarui :
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleAddRowBiaya}
                                        className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                                    >
                                        <Plus size={14} /> Tambah Baris
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    {rowsBiayaBaru.map((row, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap md:flex-nowrap items-center gap-3 hover:border-sky-300 transition">
                                            {/* Nomor Urut */}
                                            <span className="w-6 h-6 rounded-full bg-slate-200 font-mono text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                {idx + 1}
                                            </span>

                                            {/* Pilih Komponen Biaya */}
                                            <div className="flex-1 min-w-[220px]">
                                                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                                                    Komponen Biaya :
                                                </label>
                                                <select
                                                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-600 cursor-pointer"
                                                    value={row.kode_biaya}
                                                    onChange={(e) => handleUpdateRowBiaya(idx, 'kode_biaya', e.target.value)}
                                                    required
                                                >
                                                    <option value="">-- Pilih Komponen Biaya --</option>
                                                    {kamusBiayaList.map((k, kIdx) => (
                                                        <option key={kIdx} value={k.bplku_id}>
                                                            {k.bplku_nama} ({k.bplku_id})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Nominal (Rp) */}
                                            <div className="w-48 min-w-[160px]">
                                                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                                                    Nominal (Rp) :
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-sky-600 text-right"
                                                    value={row.nominal}
                                                    onChange={(e) => handleUpdateRowBiaya(idx, 'nominal', e.target.value)}
                                                    required
                                                />
                                            </div>

                                            {/* Uang Muka Flag */}
                                            <div className="w-28 min-w-[100px]">
                                                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                                                    U. Muka :
                                                </label>
                                                <select
                                                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-600 cursor-pointer text-center"
                                                    value={row.um_yn}
                                                    onChange={(e) => handleUpdateRowBiaya(idx, 'um_yn', e.target.value)}
                                                >
                                                    <option value="Ya">Ya</option>
                                                    <option value="Tidak">Tidak</option>
                                                </select>
                                            </div>

                                            {/* Tombol Hapus Baris */}
                                            <div className="pt-4 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRowBiaya(idx)}
                                                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                                    title="Hapus Baris"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer Modal Input */}
                            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={handleAddRowBiaya}
                                    className="px-4 py-2 border border-sky-600 text-sky-700 hover:bg-sky-50 font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <Plus size={14} /> Tambah Baris Baru
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsTambahBiayaModalOpen(false)}
                                        className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-200 font-bold rounded-xl text-xs uppercase transition cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase transition cursor-pointer shadow-md"
                                    >
                                        Simpan Rincian Biaya
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 🌟 3. MODAL TAMBAH TRAYEK HEADER BARU */}
            {/* ========================================================================= */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                        <div className="px-6 py-4 bg-[#004b84] text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Plus size={18} />
                                <h3 className="font-bold text-sm tracking-wide uppercase">Tambah Plafon Uang Muka BPLK</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer font-bold"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!addForm.trh_id || !addForm.trh_name) {
                                    Swal.fire('Peringatan', 'Kode dan Nama Trayek wajib diisi!', 'warning');
                                    return;
                                }
                                try {
                                    const token = localStorage.getItem('token');
                                    await api.post('/master/uang-muka/create', addForm, {
                                        headers: { Authorization: `Bearer ${token}` }
                                    });
                                    Swal.fire('Berhasil', 'Master uang muka berhasil disimpan.', 'success');
                                    setIsAddModalOpen(false);
                                    fetchUangMukaData();
                                } catch (err) {
                                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data', 'error');
                                }
                            }}
                            className="p-6 space-y-4 text-xs font-bold text-slate-700"
                        >
                            <div>
                                <label className="block mb-1 text-slate-600 uppercase">KODE TRAYEK / UANG MUKA :</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: TR2026C000001"
                                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-indigo-600 uppercase font-mono"
                                    value={addForm.trh_id}
                                    onChange={e => setAddForm({ ...addForm, trh_id: e.target.value.toUpperCase() })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-slate-600 uppercase">NAMA TRAYEK / OPERASIONAL :</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: APL - SURABAYA (INAP - LONG)"
                                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-indigo-600 uppercase"
                                    value={addForm.trh_name}
                                    onChange={e => setAddForm({ ...addForm, trh_name: e.target.value.toUpperCase() })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-slate-600 uppercase">JENIS KENDARAAN :</label>
                                <select
                                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-indigo-600 uppercase bg-white cursor-pointer font-medium text-slate-800"
                                    value={addForm.trh_jnskend}
                                    onChange={e => setAddForm({ ...addForm, trh_jnskend: e.target.value })}
                                    required
                                >
                                    <option value="">-- PILIH JENIS ARMADA --</option>
                                    {kendaraanOptions.map((k, i) => (
                                        <option key={i} value={k.jnskend_id || k.id || k.kend_id}>
                                            {k.jnskend_nama || k.kend_nama || k.kend_identid}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl uppercase transition cursor-pointer shadow-sm"
                                >
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Cetak Dokumen */}
            {isPrintModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
                        <div className="p-4 bg-slate-100 border-b flex justify-between items-center print:hidden">
                            <span className="font-bold text-xs uppercase text-slate-700">Preview Cetak Master Biaya Operasional</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handlePrintDocument}
                                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                    <Printer size={14} /> Cetak Sekarang
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPrintModalOpen(false)}
                                    className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer font-bold ml-1"
                                >
                                    <XIcon size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto bg-white font-sans text-slate-800 leading-normal" id="printable-area-bplk">
                            <div className="space-y-4 text-xs">
                                <div className="flex justify-between items-start pb-3 border-b-2 border-slate-800">
                                    <div className="space-y-1">
                                        <img src={dliLogo} alt="Dakota Logistik Indonesia" className="h-10 w-auto object-contain mb-1" />
                                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                                            STANDAR UANG MUKA BIAYA OPERASIONAL (BPLK)
                                        </h2>
                                        <p className="text-[11px] font-medium text-slate-500">https://www.dakotacargo.co.id</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono font-black text-sm text-sky-800 block">{selectedItem.trh_id}</span>
                                        <span className="text-[10px] text-slate-500 font-semibold uppercase">{selectedItem.jnskend_nama}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-y-1.5 py-1 text-slate-700 font-medium">
                                    <div className="col-span-3 font-bold uppercase text-slate-900">NAMA TRAYEK</div>
                                    <div className="col-span-9 font-bold uppercase text-slate-900">: {selectedItem.trh_name}</div>

                                    <div className="col-span-3 text-slate-600">RUTE UTAMA</div>
                                    <div className="col-span-9 font-semibold">: {selectedItem.rute_utama || '-'}</div>

                                    <div className="col-span-3 text-slate-600">STATUS AKTIF</div>
                                    <div className="col-span-9 font-semibold">: {selectedItem.trh_aktifyn === 'Y' || selectedItem.trh_aktifyn === '' ? 'AKTIF' : 'NON-AKTIF'}</div>
                                </div>

                                <div className="border-t border-slate-200 my-2"></div>

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
                                            {biayaList.map((b, bIdx) => (
                                                <tr key={bIdx} className={bIdx % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}>
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
                                                    TOTAL PLAFON BPLK
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono text-sm text-[#004b84]">
                                                    Rp {totalNominalDetail.toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterUangMuka;