import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';
import { Filter, RefreshCw, Eye, X } from 'lucide-react';

const AreaCustomer = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [rights, setRights] = useState({ can_add: true, can_edit: true, can_delete: true });

    // Filter State
    const [showFilter, setShowFilter] = useState(false);
    const [filters, setFilters] = useState({
        tanggalStart: '',
        tanggalEnd: '',
        service: '',
        customer: '',
        tujuan: '',
        tujPulau: '',
        posting: '',
        kirim: '',
        nobtt: '',
        nosmu: '',
        agen: '',
        bayar: '',
        pembayaran: '',
        nosj: '',
        page: 1,
        limit: 15
    });

    // Modal Add State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addFormData, setAddFormData] = useState({
        bttt_asalname: '',
        bttt_tujuannama: '',
        bttt_namabarang: '',
        bttt_nosuratjalan: '',
        bttt_jmlunit: 1,
        bttt_berat: 1,
        bttt_tagihtujuan: 0,
        bttt_servid: 1,
        bttt_pembayaran: 1
    });

    // Modal Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        bttt_id: '',
        bttt_asalname: '',
        bttt_tujuannama: '',
        bttt_namabarang: '',
        bttt_nosuratjalan: '',
        bttt_jmlunit: 0,
        bttt_berat: 0,
        bttt_tagihtujuan: 0
    });
    const [submitting, setSubmitting] = useState(false);

    // 🌟 1. FETCH DATA BTT LIST DENGAN SINKRONISASI AGEN AKTIF DARI HEADER 🌟
    const fetchEconoteList = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const activeAgen = localStorage.getItem('active_agen_id'); // 👈 AMBIL AGEN DARI HEADER
            const params = new URLSearchParams();

            // Masukkan parameter filter bawaan form UI jika diisi
            Object.keys(filters).forEach(key => {
                if (filters[key] !== '') params.append(key, filters[key]);
            });

            // 🎯 FILTER SAKTI: Jika agen aktif bukan PUSAT DAKOTA, paksa kirim filter agen ke backend!
            if (activeAgen && activeAgen !== 'PUSAT DAKOTA' && activeAgen !== 'BKI0101' && activeAgen !== 'PST001' && activeAgen !== '1') {
                params.append('agen', activeAgen);
            }

            const res = await api.get(`/master/econote/list?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.status === 'success') {
                setData(res.data.data || []);
                if (res.data.rights) {
                    setRights(res.data.rights);
                }
            }
        } catch (err) {
            console.error("Gagal menarik data BTT Pengiriman:", err);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Memuat Data',
                text: 'Terjadi kesalahan saat mengambil daftar BTT Pengiriman.',
                confirmButtonColor: '#3085d6',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEconoteList();
    }, []);

    // Filter Handlers
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyFilter = (e) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, page: 1 }));
        fetchEconoteList();
    };

    const handleResetFilter = () => {
        setFilters({
            tanggalStart: '',
            tanggalEnd: '',
            service: '',
            customer: '',
            tujuan: '',
            tujPulau: '',
            posting: '',
            kirim: '',
            nobtt: '',
            nosmu: '',
            agen: '',
            bayar: '',
            pembayaran: '',
            nosj: '',
            page: 1,
            limit: 15
        });
    };

    // READ / VIEW DETAIL & PRINT POP-UP
    const handleSelectBTT = (item) => {
        if (!item) return;
        Swal.fire({
            title: `<div class="text-[11px] text-slate-400 uppercase tracking-widest font-bold">NOMOR BTT TERPILIH</div>
                    <div class="text-lg font-black text-blue-600 mt-0.5">${item.bttt_id}</div>`,
            html: `
                <div class="text-left text-xs font-semibold text-slate-700 space-y-2 border-t border-b border-gray-200 py-3 my-3">
                    <div class="grid grid-cols-2 gap-1">
                        <div><span class="text-gray-400">Pengirim:</span> ${item.cust_name || item.bttt_asalname || '-'}</div>
                        <div><span class="text-gray-400">Penerima:</span> ${item.bttt_tujuannama || '-'}</div>
                        <div><span class="text-gray-400">Layanan:</span> ${item.servisjd}</div>
                        <div><span class="text-gray-400">Pembayaran:</span> ${item.jnbayar}</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
                    <button id="btn-print-btt" class="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer">
                        🖨️ Print BTT
                    </button>
                    <button id="btn-print-bc" class="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer">
                        🏷️ Label Koli
                    </button>
                    <button id="btn-print-zeb" class="p-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer">
                        🖨️ Zebra Koli
                    </button>
                    <button id="btn-edit-btt" class="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer">
                        ✏️ Edit BTT
                    </button>
                </div>
            `,
            showConfirmButton: false,
            showCloseButton: true,
            didOpen: () => {
                document.getElementById('btn-print-btt')?.addEventListener('click', () => {
                    window.open(`/marketing/btt/print?id=${item.bttt_id}`, '_blank');
                });
                document.getElementById('btn-print-bc')?.addEventListener('click', () => {
                    window.open(`/marketing/btt/print-barcode?id=${item.bttt_id}`, '_blank');
                });
                document.getElementById('btn-print-zeb')?.addEventListener('click', () => {
                    window.open(`/marketing/btt/print-barcode-zebra?id=${item.bttt_id}`, '_blank');
                });
                document.getElementById('btn-edit-btt')?.addEventListener('click', () => {
                    Swal.close();
                    handleOpenEdit(item);
                });
            }
        });
    };

    // CREATE / TAMBAH BTT HANDLER
    const handleAddBtt = () => {
        try {
            navigate('/marketing/btt');
        } catch {
            setIsAddModalOpen(true);
        }
        setIsAddModalOpen(true);
    };

    // SUBMIT TAMBAH BTT FORM
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            await api.post('/btt/add', addFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIsAddModalOpen(false);
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'BTT Pengiriman Baru Berhasil Disimpan.',
                timer: 1500,
                showConfirmButton: false
            });
            fetchEconoteList();
        } catch (err) {
            console.error("Gagal membuat BTT baru:", err);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menyimpan',
                text: err.response?.data?.message || 'Terjadi kesalahan saat menambah BTT Pengiriman.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    // UPDATE / BUKA MODAL EDIT BTT
    const handleOpenEdit = (item) => {
        if (!item) return;
        setEditFormData({
            bttt_id: item.bttt_id,
            bttt_asalname: item.bttt_asalname || '',
            bttt_tujuannama: item.bttt_tujuannama || '',
            bttt_namabarang: item.bttt_namabarang || '',
            bttt_nosuratjalan: item.bttt_nosuratjalan || '',
            bttt_jmlunit: item.bttt_jmlunit || 0,
            bttt_berat: item.bttt_berat || 0,
            bttt_tagihtujuan: item.bttt_tagihtujuan || 0
        });
        setIsEditModalOpen(true);
    };

    // SUBMIT UPDATE FORM
    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            await api.put('/master/econote/update', editFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIsEditModalOpen(false);
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Data BTT berhasil diperbarui.',
                timer: 1500,
                showConfirmButton: false
            });
            fetchEconoteList();
        } catch (err) {
            console.error("Gagal update BTT:", err);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menyimpan',
                text: err.response?.data?.message || 'Terjadi kesalahan saat mengupdate BTT.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    // DELETE / SOFT DELETE BTT
    const handleDelete = (item) => {
        if (!item) return;
        Swal.fire({
            title: 'Apakah Anda Yakin?',
            text: `BTT "${item.bttt_id}" akan dinonaktifkan!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Nonaktifkan!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/master/econote/delete/${item.bttt_id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire({
                        icon: 'success',
                        title: 'Terhapus!',
                        text: 'BTT berhasil dinonaktifkan.',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    fetchEconoteList();
                } catch (err) {
                    console.error("Gagal menghapus BTT:", err);
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal Menghapus',
                        text: err.response?.data?.message || 'Terjadi kesalahan saat menghapus BTT.',
                    });
                }
            }
        });
    };

    // DEFINISI KOLOM DATA MURNI
    const columns = [
        {
            header: 'NO. BTT',
            accessor: 'bttt_id',
            render: (item) => (
                <button
                    type="button"
                    onClick={() => handleSelectBTT(item)}
                    className="font-mono text-[11px] font-extrabold text-blue-600 hover:underline bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shadow-xs cursor-pointer"
                >
                    {item.bttt_id}
                </button>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'bttt_tanggal',
            render: (item) => (
                <span className="text-[11px] font-medium text-slate-800 whitespace-nowrap">
                    {item.bttt_tanggal ? new Date(item.bttt_tanggal).toLocaleDateString('id-ID') : '-'}
                </span>
            )
        },
        {
            header: 'SERVICE',
            accessor: 'servisjd',
            render: (item) => (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${item.bttt_servid === 1 ? 'bg-slate-100 text-slate-800' :
                    item.bttt_servid === 2 ? 'bg-cyan-100 text-cyan-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                    {item.servisjd}
                </span>
            )
        },
        {
            header: 'PENGIRIM',
            accessor: 'bttt_asalname',
            render: (item) => (
                <div className="text-[11px] font-bold text-slate-900 max-w-[100px] truncate" title={item.cust_name || item.bttt_asalname}>
                    {item.cust_name || item.bttt_asalname}
                </div>
            )
        },
        {
            header: 'PENERIMA',
            accessor: 'bttt_tujuannama',
            render: (item) => (
                <div className="text-[11px] font-medium text-slate-800 max-w-[95px] truncate" title={item.bttt_tujuannama}>
                    {item.bttt_tujuannama || '-'}
                </div>
            )
        },
        {
            header: 'BAYAR',
            accessor: 'jnbayar',
            render: (item) => (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.bttt_pembayaran === 1 ? 'bg-emerald-100 text-emerald-800' :
                    item.bttt_pembayaran === 2 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                    {item.jnbayar}
                </span>
            )
        },
        {
            header: 'BARANG',
            accessor: 'bttt_namabarang',
            render: (item) => (
                <span className="text-[11px] font-normal text-slate-700 max-w-[80px] truncate block" title={item.bttt_namabarang}>
                    {item.bttt_namabarang || '-'}
                </span>
            )
        },
        {
            header: 'S.JALAN',
            accessor: 'bttt_nosuratjalan',
            render: (item) => (
                <span className="font-mono text-[11px] font-medium text-slate-700 max-w-[75px] truncate block" title={item.bttt_nosuratjalan}>
                    {item.bttt_nosuratjalan || '-'}
                </span>
            )
        },
        {
            header: 'KOLI',
            accessor: 'bttt_jmlunit',
            render: (item) => (
                <span className="font-bold text-slate-900 text-[11px]">
                    {item.bttt_jmlunit || 0}
                </span>
            )
        },
        {
            header: 'BERAT',
            accessor: 'bttt_berat',
            render: (item) => (
                <span className="font-bold text-blue-700 text-[11px] whitespace-nowrap">
                    {item.bttt_berat || 0} KG
                </span>
            )
        },
        {
            header: 'COD',
            accessor: 'bttt_tagihtujuan',
            render: (item) => (
                <span className="font-bold text-emerald-700 text-[11px] whitespace-nowrap">
                    {item.bttt_tagihtujuan > 0 ? `Rp${Number(item.bttt_tagihtujuan).toLocaleString('id-ID')}` : '-'}
                </span>
            )
        },
        {
            header: 'AKTIF',
            accessor: 'aktifjd',
            render: (item) => (
                <span className={`text-[9px] font-black px-1 py-0.5 rounded ${item.bttt_aktifyn === 'Y' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {item.aktifjd}
                </span>
            )
        }
    ];

    // 🌟 FILTER DATA DI FRONTEND (SAFETY GUARD): Jika backend mengirimkan semua data, saring lokal berdasarkan agen aktif
    const activeAgen = localStorage.getItem('active_agen_id');
    const filteredData = data.filter(item => {
        if (!activeAgen || activeAgen === 'PUSAT DAKOTA' || activeAgen === 'BKI0101' || activeAgen === 'PST001' || activeAgen === '1') {
            return true; // Tampilkan seluruh BTT nasional jika di Holding Pusat
        }

        const target = activeAgen.toString().trim().toUpperCase();
        return item.bttt_asalid?.toString().trim().toUpperCase() === target ||
            item.bttt_agenasal?.toString().trim().toUpperCase() === target ||
            item.bttt_cabangid?.toString().trim().toUpperCase() === target;
    });

    return (
        <div className="space-y-3">
            {/* Header Toolbar Ringkas */}
            <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${showFilter ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        <Filter size={14} /> Filter
                    </button>
                    <button
                        onClick={fetchEconoteList}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                    >
                        <RefreshCw size={13} /> Refresh
                    </button>
                </div>
            </div>

            {/* Panel Form Filter Dynamic */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-semibold text-slate-800">
                        <div>
                            <label className="block mb-1 text-slate-600">Mulai Tanggal</label>
                            <input
                                type="date"
                                name="tanggalStart"
                                value={filters.tanggalStart}
                                onChange={handleFilterChange}
                                className="w-full p-2 border border-gray-300 rounded-xl bg-white text-slate-900 outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-slate-600">Sampai Tanggal</label>
                            <input
                                type="date"
                                name="tanggalEnd"
                                value={filters.tanggalEnd}
                                onChange={handleFilterChange}
                                className="w-full p-2 border border-gray-300 rounded-xl bg-white text-slate-900 outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-slate-600">Layanan / Service</label>
                            <select
                                name="service"
                                value={filters.service}
                                onChange={handleFilterChange}
                                className="w-full p-2 border border-gray-300 rounded-xl bg-white text-slate-900 outline-none focus:border-indigo-500"
                            >
                                <option value="">-- Semua Service --</option>
                                <option value="1">1 - Darat</option>
                                <option value="2">2 - Laut</option>
                                <option value="3">3 - Udara</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 text-slate-600">Metode Pembayaran</label>
                            <select
                                name="pembayaran"
                                value={filters.pembayaran}
                                onChange={handleFilterChange}
                                className="w-full p-2 border border-gray-300 rounded-xl bg-white text-slate-900 outline-none focus:border-indigo-500"
                            >
                                <option value="">-- Semua Pembayaran --</option>
                                <option value="1">1 - Tunai</option>
                                <option value="2">2 - Kredit</option>
                                <option value="3">3 - Tagih / COD</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 text-slate-600">Nama Customer / Pengirim</label>
                            <input
                                type="text"
                                name="customer"
                                placeholder="Ketik nama customer..."
                                value={filters.customer}
                                onChange={handleFilterChange}
                                className="w-full p-2 border border-gray-300 rounded-xl bg-white text-slate-900 outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-slate-600">No. BTT / Resi</label>
                            <input
                                type="text"
                                name="nobtt"
                                placeholder="Contoh: AG0R..."
                                value={filters.nobtt}
                                onChange={handleFilterChange}
                                className="w-full p-2 border border-gray-300 rounded-xl bg-white text-slate-900 outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-slate-600">No. Surat Jalan</label>
                            <input
                                type="text"
                                name="nosj"
                                placeholder="Ketik no surat jalan..."
                                value={filters.nosj}
                                onChange={handleFilterChange}
                                className="w-full p-2 border border-gray-300 rounded-xl bg-white text-slate-900 outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition cursor-pointer"
                        >
                            Terapkan Filter
                        </button>
                    </div>
                </form>
            )}

            {/* 🌟 DATATABLETEMPLATE MENGGUNAKAN DATA YANG SUDAH TERFILTER PRESISI 🌟 */}
            <DataTableTemplate
                title="BUKTI TANDA TERIMA (BTT)"
                columns={columns}
                data={filteredData}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleAddBtt}
                onView={(item) => handleSelectBTT(item)}
                onEdit={(item) => handleOpenEdit(item)}
                onDelete={(item) => handleDelete(item)}
            />

            {/* MODAL TAMBAH & EDIT TETAP PRESISI SEPERTI SEMULA */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden bg-white border border-gray-100 p-8 transition-all">
                        <div className="flex justify-between items-start pb-4 border-b border-gray-100 mb-6">
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-900 uppercase tracking-wide">
                                    TAMBAH BTT PENGIRIMAN BARU
                                </h3>
                                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                                    Lengkapi data pengiriman customer di bawah ini:
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-full hover:bg-gray-100 transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold text-slate-700">
                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        Nama Pengirim / Customer
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ketik nama pengirim..."
                                        value={addFormData.bttt_asalname}
                                        onChange={(e) => setAddFormData({ ...addFormData, bttt_asalname: e.target.value })}
                                        required
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        Nama Penerima
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ketik nama penerima..."
                                        value={addFormData.bttt_tujuannama}
                                        onChange={(e) => setAddFormData({ ...addFormData, bttt_tujuannama: e.target.value })}
                                        required
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        Nama Barang
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ketik deskripsi barang..."
                                        value={addFormData.bttt_namabarang}
                                        onChange={(e) => setAddFormData({ ...addFormData, bttt_namabarang: e.target.value })}
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        No. Surat Jalan
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Surat jalan pengirim..."
                                        value={addFormData.bttt_nosuratjalan}
                                        onChange={(e) => setAddFormData({ ...addFormData, bttt_nosuratjalan: e.target.value })}
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        Layanan / Service
                                    </label>
                                    <select
                                        value={addFormData.bttt_servid}
                                        onChange={(e) => setAddFormData({ ...addFormData, bttt_servid: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                                    >
                                        <option value={1}>1 - Darat</option>
                                        <option value={2}>2 - Laut</option>
                                        <option value={3}>3 - Udara</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        Metode Pembayaran
                                    </label>
                                    <select
                                        value={addFormData.bttt_pembayaran}
                                        onChange={(e) => setAddFormData({ ...addFormData, bttt_pembayaran: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                                    >
                                        <option value={1}>1 - Tunai</option>
                                        <option value={2}>2 - Kredit</option>
                                        <option value={3}>3 - Tagih / COD</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        Jumlah Colly / Unit
                                    </label>
                                    <input
                                        type="number"
                                        value={addFormData.bttt_jmlunit}
                                        onChange={(e) => setAddFormData({ ...addFormData, bttt_jmlunit: Number(e.target.value) })}
                                        required
                                        min={1}
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        Berat Barang (KG)
                                    </label>
                                    <input
                                        type="number"
                                        value={addFormData.addFormData_berat || addFormData.bttt_berat}
                                        onChange={(e) => setAddFormData({ ...addFormData, bttt_berat: Number(e.target.value) })}
                                        required
                                        min={1}
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center items-center gap-3 pt-6 border-t border-gray-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-8 py-2.5 text-xs font-extrabold text-slate-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition uppercase tracking-wider cursor-pointer shadow-xs"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-8 py-2.5 text-xs font-extrabold text-white bg-indigo-950 hover:bg-indigo-900 active:scale-95 rounded-xl shadow-md transition uppercase tracking-wider cursor-pointer disabled:opacity-50"
                                >
                                    {submitting ? 'SAVING...' : 'Save Change'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden bg-white border border-gray-100 p-8 transition-all">
                        <div className="flex justify-between items-start pb-4 border-b border-gray-100 mb-6">
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-900 uppercase tracking-wide">
                                    EDIT DATA BTT
                                </h3>
                                <p className="text-xs font-mono font-bold text-blue-600 mt-1">
                                    NOMOR BTT: {editFormData.bttt_id}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-full hover:bg-gray-100 transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold text-slate-700">
                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        Nama Pengirim
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.bttt_asalname}
                                        onChange={(e) => setEditFormData({ ...editFormData, bttt_asalname: e.target.value })}
                                        required
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        Nama Penerima
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.bttt_tujuannama}
                                        onChange={(e) => setEditFormData({ ...editFormData, bttt_tujuannama: e.target.value })}
                                        required
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        Nama Barang
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.bttt_namabarang}
                                        onChange={(e) => setEditFormData({ ...editFormData, bttt_namabarang: e.target.value })}
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        No. Surat Jalan
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.bttt_nosuratjalan}
                                        onChange={(e) => setEditFormData({ ...editFormData, bttt_nosuratjalan: e.target.value })}
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        Jumlah Colly / Unit
                                    </label>
                                    <input
                                        type="number"
                                        value={editFormData.bttt_jmlunit}
                                        onChange={(e) => setEditFormData({ ...editFormData, bttt_jmlunit: Number(e.target.value) })}
                                        required
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-slate-800">
                                        Berat Barang (KG)
                                    </label>
                                    <input
                                        type="number"
                                        value={editFormData.bttt_berat}
                                        onChange={(e) => setEditFormData({ ...editFormData, bttt_berat: Number(e.target.value) })}
                                        required
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block mb-1.5 text-slate-800">
                                        Tagihan Tujuan / COD (Rp)
                                    </label>
                                    <input
                                        type="number"
                                        value={editFormData.bttt_tagihtujuan}
                                        onChange={(e) => setEditFormData({ ...editFormData, bttt_tagihtujuan: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition font-semibold text-emerald-600"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center items-center gap-3 pt-6 border-t border-gray-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-8 py-2.5 text-xs font-extrabold text-slate-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition uppercase tracking-wider cursor-pointer shadow-xs"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-8 py-2.5 text-xs font-extrabold text-white bg-indigo-950 hover:bg-indigo-900 active:scale-95 rounded-xl shadow-md transition uppercase tracking-wider cursor-pointer disabled:opacity-50"
                                >
                                    {submitting ? 'SAVING...' : 'Save Change'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AreaCustomer;