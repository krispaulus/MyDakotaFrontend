import React, { useState, useEffect } from 'react';
import {
    Search, RefreshCw, Filter, RotateCcw,
    Printer, FileText, AlertOctagon, Truck, Split,
    Sliders, Upload, Trash2, X, Download
} from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';
import api from '../api/axios';
import EditMasterHargaCargo from './EditMasterHargaCargo';

const MasterTarifCustomer = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const token = localStorage.getItem('token');
    const roleUser = localStorage.getItem('role_akses') || 'AGEN';

    // State Transisi Tampilan: 'list' atau 'edit_cargo'
    const [currentView, setCurrentView] = useState('list');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedJenisHarga, setSelectedJenisHarga] = useState('0'); // 0: Berat, 1: Volume, 2: Kubikasi

    // Modal Pilihan General Cargo (Gambar 1)
    const [isCargoModalOpen, setIsCargoModalOpen] = useState(false);

    // Filter Panel State
    const [showFilter, setShowFilter] = useState(true);
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterCabang, setFilterCabang] = useState('');
    const [cabangOptions, setCabangOptions] = useState([]);

    const [hasReguler, setHasReguler] = useState(false);
    const [hasCharter, setHasCharter] = useState(false);
    const [hasMultidrop, setHasMultidrop] = useState(false);

    // Modal Upload CSV & Adjust Tarif
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadType, setUploadType] = useState('cargo');
    const [csvFile, setCsvFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [adjustType, setAdjustType] = useState('+');
    const [adjustPercent, setAdjustPercent] = useState(5);

    // 1. Ambil Opsi Cabang
    useEffect(() => {
        const fetchCabang = async () => {
            try {
                const res = await api.get('/customer/cabang-options', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.status === 'success') {
                    setCabangOptions(res.data.data || []);
                }
            } catch (err) {
                console.error(err);
            }
        };

        if (token) fetchCabang();
    }, [token]);

    // 2. Fetch Data Customer
    const fetchCustomers = async (customParams = {}) => {
        setLoading(true);
        try {
            const cleanAgenKode = localStorage.getItem('active_agen_id') || 'ALL';

            const custParam = customParams.customer ?? filterCustomer;
            const cabangParam = customParams.cabang ?? filterCabang;
            const regParam = customParams.has_reguler ?? hasReguler;
            const chaParam = customParams.has_charter ?? hasCharter;
            const mulParam = customParams.has_multidrop ?? hasMultidrop;

            let url = `/customer/with-tarif?customer_name=${encodeURIComponent(custParam)}&agen_id=${encodeURIComponent(cleanAgenKode)}&role_akses=${roleUser.toUpperCase()}`;

            if (cabangParam) {
                url += `&cabang_id=${encodeURIComponent(cabangParam)}`;
            }

            const anyTarifChecked = regParam || chaParam || mulParam;
            if (anyTarifChecked) {
                url += `&ck_tarif=true&has_reguler=${regParam}&has_charter=${chaParam}&has_multidrop=${mulParam}`;
            }

            const res = await api.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                setData(res.data.data || []);
            } else {
                setData([]);
            }
        } catch (err) {
            console.error(err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchCustomers();
    }, [token]);

    const handleApplyFilter = () => {
        fetchCustomers({
            customer: filterCustomer,
            cabang: filterCabang,
            has_reguler: hasReguler,
            has_charter: hasCharter,
            has_multidrop: hasMultidrop
        });
    };

    const handleResetFilter = () => {
        setFilterCustomer('');
        setFilterCabang('');
        setHasReguler(false);
        setHasCharter(false);
        setHasMultidrop(false);

        fetchCustomers({
            customer: '',
            cabang: '',
            has_reguler: false,
            has_charter: false,
            has_multidrop: false
        });
    };

    // Aksi Klik Icon General Cargo -> Munculkan Pilihan Modal (Gambar 1)
    const handleOpenCargoModal = (row) => {
        setSelectedCustomer(row);
        setIsCargoModalOpen(true);
    };

    // Pilih Jenis Harga di Gambar 1 -> Pindah ke Gambar 2
    const handleSelectJenisHarga = (jenisCode) => {
        setSelectedJenisHarga(jenisCode);
        setIsCargoModalOpen(false);
        setCurrentView('edit_cargo');
    };

    // Aksi Upload CSV
    const handleUploadCSV = async (e) => {
        e.preventDefault();
        if (!csvFile || !selectedCustomer) return;

        setUploading(true);
        const formPayload = new FormData();
        formPayload.append('file_csv', csvFile);
        formPayload.append('customer_id', selectedCustomer.cust_id);
        formPayload.append('jenis_tarif', uploadType);

        try {
            const res = await api.post('/tarif/upload-csv', formPayload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.data && res.data.status === "success") {
                setIsUploadModalOpen(false);
                setCsvFile(null);
                Swal.fire('Sukses!', `${res.data.inserted_count} baris tarif berhasil disinkronisasi.`, 'success');
                fetchCustomers();
            }
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || err.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    // Aksi Adjust Persentase
    const handleAdjustTarif = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/tarif/adjust', {
                customer_id: selectedCustomer.cust_id,
                tipe_aksi: adjustType,
                persentase: parseFloat(adjustPercent) || 0
            });

            if (res.data && res.data.status === "success") {
                setIsAdjustModalOpen(false);
                Swal.fire('Berhasil', res.data.message, 'success');
                fetchCustomers();
            }
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || err.message, 'error');
        }
    };

    // Jika sedang dalam tampilan Edit Harga Cargo (Gambar 2)
    if (currentView === 'edit_cargo') {
        return (
            <EditMasterHargaCargo
                customer={selectedCustomer}
                jenisHarga={selectedJenisHarga}
                onBack={() => {
                    setCurrentView('list');
                    fetchCustomers();
                }}
            />
        );
    }

    // Definisi Kolom Tabel Utama
    const columns = [
        {
            header: 'KODE CUSTOMER',
            accessor: 'cust_id',
            render: (row) => <span className="font-mono font-bold text-sky-600">{row.cust_id}</span>
        },
        {
            header: 'NAMA CUSTOMER',
            accessor: 'cust_name',
            render: (row) => <span className="font-bold text-slate-800">{row.cust_name}</span>
        },
        {
            header: 'ALAMAT',
            accessor: 'cust_alamat1',
            render: (row) => <span className="text-slate-600 text-xs block max-w-xs truncate">{row.cust_alamat1 || '-'}</span>
        },
        {
            header: 'TELEPON',
            accessor: 'cust_telp1',
            render: (row) => row.cust_telp1 || '-'
        },
        {
            header: 'CABANG / AGEN',
            accessor: 'cust_agenid',
            render: (row) => (
                <span className="text-xs text-slate-500 font-medium">
                    {row.cust_agenid ? `${row.cust_agenid} - ` : ''}{row.agen_nama || 'PUSAT DAKOTA'}
                </span>
            )
        },
        {
            header: 'JUMLAH TARIF KHUSUS',
            accessor: 'jml_reguler',
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.jml_reguler > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                        R: {row.jml_reguler || 0}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.jml_charter > 0 ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-400'}`}>
                        C: {row.jml_charter || 0}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.jml_multidrop > 0 ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-400'}`}>
                        M: {row.jml_multidrop || 0}
                    </span>
                </div>
            )
        },
        {
            header: 'ACTION',
            accessor: 'action',
            render: (row) => (
                <div className="flex items-center justify-center gap-1">
                    {/* 1. Print */}
                    <button
                        onClick={() => window.open(`${api.defaults.baseURL}/tarif/print?customer_id=${row.cust_id}`, '_blank')}
                        title="Print SP / Master Tarif"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                        <Printer size={16} />
                    </button>

                    {/* 2. Edit General Cargo -> Membuka Gambar 1 */}
                    <button
                        onClick={() => handleOpenCargoModal(row)}
                        title="Edit Harga General Cargo"
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                    >
                        <FileText size={16} />
                    </button>

                    {/* 3. Edit B3 DG */}
                    <button
                        onClick={() => Swal.fire('B3 Dangerous Goods', `Form edit tarif B3/DG untuk ${row.cust_id}`, 'info')}
                        title="Edit Harga B3 Dangerous Goods"
                        className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition"
                    >
                        <AlertOctagon size={16} />
                    </button>

                    {/* 4. Edit Charter */}
                    <button
                        onClick={() => Swal.fire('Tarif Charter', `Form edit tarif charter armada untuk ${row.cust_id}`, 'info')}
                        title="Edit Harga Charter Armada"
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    >
                        <Truck size={16} />
                    </button>

                    {/* 5. Edit Multidrop */}
                    <button
                        onClick={() => Swal.fire('Tarif Multidrop', `Form edit tarif multidrop untuk ${row.cust_id}`, 'info')}
                        title="Edit Harga Multidrop"
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                    >
                        <Split size={16} />
                    </button>

                    {/* 6. Penyesuaian Tarif (%) */}
                    <button
                        onClick={() => { setSelectedCustomer(row); setIsAdjustModalOpen(true); }}
                        title="Penyesuaian Tarif Massal (%)"
                        className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition"
                    >
                        <Sliders size={16} />
                    </button>

                    {/* 7. Upload CSV */}
                    <button
                        onClick={() => { setSelectedCustomer(row); setIsUploadModalOpen(true); }}
                        title="Upload CSV Tarif"
                        className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition"
                    >
                        <Upload size={16} />
                    </button>

                    {/* 8. Delete */}
                    <button
                        onClick={() => {
                            Swal.fire({
                                title: 'Hapus Tarif Customer?',
                                html: `Nonaktifkan seluruh tarif untuk: <b>${row.cust_id} - ${row.cust_name}</b>?`,
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#ef4444',
                                confirmButtonText: 'Ya, Hapus'
                            }).then(async (res) => {
                                if (res.isConfirmed) {
                                    await api.post('/tarif-customer/delete', { customer_id: row.cust_id });
                                    fetchCustomers();
                                }
                            });
                        }}
                        title="Hapus / Nonaktifkan Tarif"
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="relative space-y-4">
            {/* FILTER PANEL */}
            {showFilter && (
                <form
                    onSubmit={(e) => { e.preventDefault(); handleApplyFilter(); }}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all mb-4"
                >
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER MASTER TARIF CUSTOMER
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="font-bold text-slate-600 block mb-1 uppercase">CARI CUSTOMER</label>
                            <input
                                type="text"
                                placeholder="Ketik kode atau nama customer..."
                                value={filterCustomer}
                                onChange={(e) => setFilterCustomer(e.target.value)}
                                className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold text-slate-800 bg-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-600 block mb-1 uppercase">CABANG / AGEN</label>
                            <select
                                value={filterCabang}
                                onChange={(e) => setFilterCabang(e.target.value)}
                                className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold text-slate-800 bg-white outline-none focus:border-sky-500 cursor-pointer"
                            >
                                <option value="">-- SEMUA CABANG --</option>
                                {cabangOptions.map((cb) => (
                                    <option key={cb.agen_id} value={cb.agen_id}>
                                        {cb.agen_id} - {cb.agen_nama}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 text-slate-700 font-semibold">
                            <span className="text-slate-500 font-bold uppercase text-[11px]">STATUS TARIF:</span>

                            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition ${hasReguler ? 'bg-sky-50 border-sky-400 text-sky-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                <input type="checkbox" checked={hasReguler} onChange={(e) => setHasReguler(e.target.checked)} className="w-4 h-4 text-sky-600 rounded" />
                                Reguler / Paket
                            </label>

                            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition ${hasCharter ? 'bg-sky-50 border-sky-400 text-sky-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                <input type="checkbox" checked={hasCharter} onChange={(e) => setHasCharter(e.target.checked)} className="w-4 h-4 text-sky-600 rounded" />
                                Charter
                            </label>

                            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition ${hasMultidrop ? 'bg-sky-50 border-sky-400 text-sky-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                <input type="checkbox" checked={hasMultidrop} onChange={(e) => setHasMultidrop(e.target.checked)} className="w-4 h-4 text-sky-600 rounded" />
                                Multidrop
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleResetFilter}
                                className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer flex items-center gap-1.5"
                            >
                                <RotateCcw size={13} /> RESET
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
                            >
                                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> REFRESH DATA
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* TABEL DATA MASTER */}
            <DataTableTemplate
                title="MASTER HARGA CUSTOMER"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onFilter={() => setShowFilter((prev) => !prev)}
                showFilter={showFilter}
                onAdd={() => {
                    Swal.fire({
                        title: 'Master Customer',
                        text: 'Pendaftaran customer baru dapat dilakukan di menu Master Customer New.',
                        icon: 'info',
                        confirmButtonColor: '#0284c7'
                    });
                }}
            />

            {/* ========================================================================= */}
            {/* 🌟 MODAL PILIHAN GENERAL CARGO (PERSIS GAMBAR 1)                           */}
            {/* ========================================================================= */}
            {isCargoModalOpen && selectedCustomer && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 relative p-8 text-center space-y-6">

                        <button
                            onClick={() => setIsCargoModalOpen(false)}
                            className="absolute right-5 top-5 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                General Cargo - {selectedCustomer.cust_id}
                            </h2>
                            <p className="text-xs text-slate-500 mt-2 font-medium">
                                Pilih tipe tarif General Cargo untuk <b className="text-slate-800 uppercase">{selectedCustomer.cust_name}</b>:
                            </p>
                        </div>

                        {/* 3 Tombol Sesuai Gambar 1 */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                            <button
                                onClick={() => handleSelectJenisHarga('0')}
                                className="w-full sm:w-auto px-6 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                            >
                                Harga Berat (Kg)
                            </button>

                            <button
                                onClick={() => handleSelectJenisHarga('1')}
                                className="w-full sm:w-auto px-6 py-3 bg-[#0d9488] hover:bg-[#0f766e] text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                            >
                                Harga Volume (m³)
                            </button>

                            <button
                                onClick={() => handleSelectJenisHarga('2')}
                                className="w-full sm:w-auto px-6 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                            >
                                Harga Kubikasi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL UPLOAD CSV */}
            {isUploadModalOpen && selectedCustomer && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 bg-slate-100 border-b flex justify-between items-center">
                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                                <Upload size={18} className="text-sky-600" /> Upload File CSV Tarif Customer
                            </h3>
                            <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUploadCSV} className="p-6 space-y-4 text-xs">
                            <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl">
                                <span className="font-bold text-sky-900 block">Customer:</span>
                                <span className="font-mono text-sky-700">{selectedCustomer.cust_id} - {selectedCustomer.cust_name}</span>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 uppercase mb-2">Pilih Jenis Tarif</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`p-3 border-2 rounded-xl flex items-center gap-2 cursor-pointer font-bold ${uploadType === 'cargo' ? 'border-sky-600 bg-sky-50/30 text-sky-900' : 'border-slate-200'}`}>
                                        <input type="radio" name="uploadType" value="cargo" checked={uploadType === 'cargo'} onChange={() => setUploadType('cargo')} className="text-sky-600" />
                                        Cargo & Udara
                                    </label>
                                    <label className={`p-3 border-2 rounded-xl flex items-center gap-2 cursor-pointer font-bold ${uploadType === 'charter' ? 'border-sky-600 bg-sky-50/30 text-sky-900' : 'border-slate-200'}`}>
                                        <input type="radio" name="uploadType" value="charter" checked={uploadType === 'charter'} onChange={() => setUploadType('charter')} className="text-sky-600" />
                                        Charter Armada
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 uppercase mb-1">Pilih Berkas CSV</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    required
                                    onChange={(e) => setCsvFile(e.target.files[0])}
                                    className="w-full p-2.5 border border-slate-300 rounded-xl file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-sky-50 file:text-sky-700 file:font-bold hover:file:bg-sky-100 cursor-pointer"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">Batal</button>
                                <button type="submit" disabled={uploading} className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow cursor-pointer">
                                    {uploading ? <RefreshCw className="animate-spin" size={14} /> : <Upload size={14} />}
                                    {uploading ? 'Mengimpor...' : 'Mulai Sinkronisasi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL PENYESUAIAN TARIF */}
            {isAdjustModalOpen && selectedCustomer && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white text-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 bg-slate-100 border-b flex justify-between items-center">
                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                                <Sliders size={18} className="text-amber-600" /> Penyesuaian Tarif (%)
                            </h3>
                            <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAdjustTarif} className="p-6 space-y-4 text-xs">
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                <span className="font-bold text-amber-900 block">Customer:</span>
                                <span className="font-semibold text-amber-800">{selectedCustomer.cust_id} - {selectedCustomer.cust_name}</span>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 uppercase mb-2">Arah Penyesuaian</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                        <input type="radio" name="adj" value="+" checked={adjustType === '+'} onChange={() => setAdjustType('+')} />
                                        Naik (+)
                                    </label>
                                    <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                        <input type="radio" name="adj" value="-" checked={adjustType === '-'} onChange={() => setAdjustType('-')} />
                                        Turun (-)
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 uppercase mb-1">Persentase (%)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    required
                                    value={adjustPercent}
                                    onChange={(e) => setAdjustPercent(e.target.value)}
                                    className="w-full p-2.5 border rounded-xl font-bold text-slate-800 outline-none focus:border-amber-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold text-slate-600 cursor-pointer">Batal</button>
                                <button type="submit" className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer">Terapkan Perubahan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterTarifCustomer;