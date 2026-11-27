import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { CalendarDays, Search } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from "../context/DarkModeContext";
import Swal from 'sweetalert2';

const BULAN_OPTIONS = [
    { value: '', label: '-- SEMUA BULAN --' },
    { value: '1', label: 'JANUARI' },
    { value: '2', label: 'FEBRUARI' },
    { value: '3', label: 'MARET' },
    { value: '4', label: 'APRIL' },
    { value: '5', label: 'MEI' },
    { value: '6', label: 'JUNI' },
    { value: '7', label: 'JULI' },
    { value: '8', label: 'AGUSTUS' },
    { value: '9', label: 'SEPTEMBER' },
    { value: '10', label: 'OKTOBER' },
    { value: '11', label: 'NOVEMBER' },
    { value: '12', label: 'DESEMBER' }
];

const formatTanggalIndo = (ymd) => {
    if (!ymd) return '-';
    const [y, m, d] = ymd.split('-');
    return (y && m && d) ? `${d}/${m}/${y}` : ymd;
};

const MasterHariLibur = () => {
    const { isDarkMode } = useDarkMode();
    const currentYear = new Date().getFullYear();

    // Pilihan tahun dinamis (2 tahun ke belakang s/d 3 tahun ke depan)
    const tahunOptions = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter Tahun & Bulan
    const [filterTahun, setFilterTahun] = useState(String(currentYear));
    const [filterBulan, setFilterBulan] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // State Modal CRUD
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        tanggal_awal: `${currentYear}-01-01`,
        tanggal_akhir: `${currentYear}-01-01`,
        keterangan: ''
    });

    const [editFormData, setEditFormData] = useState({
        id: 0,
        tanggal: '',
        keterangan: ''
    });

    const fetchHariLibur = async (tahunParam = filterTahun, bulanParam = filterBulan) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {};
            if (tahunParam) params.tahun = tahunParam;
            if (bulanParam) params.bulan = bulanParam;

            const res = await api.get('/master/hari-libur/list', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setDataList(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch (err) {
            console.error("Gagal memuat data hari libur:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHariLibur(filterTahun, filterBulan);
    }, [filterTahun, filterBulan]);

    // Filter Search Lokal Tabel
    const filteredData = dataList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.tanggal && item.tanggal.toLowerCase().includes(q)) ||
            (formatTanggalIndo(item.tanggal).includes(q)) ||
            (item.hari_nama && item.hari_nama.toLowerCase().includes(q)) ||
            (item.keterangan && item.keterangan.toLowerCase().includes(q))
        );
    });

    // Buka Modal Tambah (Default tanggal mengikuti tahun & bulan yang sedang dipilih)
    const handleOpenAdd = () => {
        const yr = filterTahun || String(currentYear);
        const mo = filterBulan ? filterBulan.padStart(2, '0') : '01';
        const defaultDate = `${yr}-${mo}-01`;

        setFormData({
            tanggal_awal: defaultDate,
            tanggal_akhir: defaultDate,
            keterangan: ''
        });
        setIsAddModalOpen(true);
    };

    // Submit Tambah
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!formData.tanggal_awal || !formData.keterangan.trim()) {
            return Swal.fire('Peringatan', 'Tanggal dan Keterangan libur wajib diisi!', 'warning');
        }

        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/master/hari-libur/add', {
                tanggal_awal: formData.tanggal_awal,
                tanggal_akhir: formData.tanggal_akhir || formData.tanggal_awal,
                keterangan: formData.keterangan.toUpperCase()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', res.data?.message || 'Hari libur berhasil disimpan', 'success');
            setIsAddModalOpen(false);
            fetchHariLibur();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan hari libur', 'error');
        }
    };

    // Buka Modal Edit
    const handleEditTrigger = (item) => {
        setEditFormData({
            id: item.id,
            tanggal: item.tanggal,
            keterangan: item.keterangan
        });
        setIsEditModalOpen(true);
    };

    // Submit Edit
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put('/master/hari-libur/update', {
                id: editFormData.id,
                tanggal: editFormData.tanggal,
                keterangan: editFormData.keterangan.toUpperCase()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', 'Data hari libur berhasil diperbarui!', 'success');
            setIsEditModalOpen(false);
            fetchHariLibur();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengupdate hari libur', 'error');
        }
    };

    // Hapus Data
    const handleDeleteTrigger = (item) => {
        Swal.fire({
            title: 'Hapus Hari Libur?',
            text: `Tanggal ${formatTanggalIndo(item.tanggal)} (${item.keterangan}) akan dihapus!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/master/hari-libur/delete/${item.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Sukses', 'Data hari libur berhasil dihapus', 'success');
                    fetchHariLibur();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus data', 'error');
                }
            }
        });
    };

    const columns = [
        {
            header: 'TANGGAL',
            accessor: 'tanggal',
            render: (item) => (
                <span
                    onClick={() => handleEditTrigger(item)}
                    className="font-mono font-bold text-rose-600 cursor-pointer hover:underline"
                >
                    {formatTanggalIndo(item.tanggal)}
                </span>
            )
        },
        {
            header: 'HARI',
            accessor: 'hari_nama',
            render: (item) => (
                <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-xs">
                    {item.hari_nama}
                </span>
            )
        },
        {
            header: 'KETERANGAN LIBUR NASIONAL / CUTI BERSAMA',
            accessor: 'keterangan',
            render: (item) => <span className="font-bold uppercase text-slate-800">{item.keterangan}</span>
        },
        {
            header: 'DIBUAT OLEH',
            accessor: 'created_by',
            render: (item) => <span className="text-xs font-mono text-slate-500">{item.created_by}</span>
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Menu */}
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <CalendarDays size={20} className="text-rose-600" /> Master Hari Libur Nasional & Cuti Bersama
                </h3>
            </div>

            {/* FILTER TAHUN & BULAN */}
            <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs font-bold text-slate-600">
                <div>
                    <label className="block mb-1 text-slate-500 uppercase">PILIH TAHUN</label>
                    <select
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-indigo-900 focus:border-indigo-500 bg-white outline-none cursor-pointer"
                        value={filterTahun}
                        onChange={e => setFilterTahun(e.target.value)}
                    >
                        {tahunOptions.map(th => (
                            <option key={th} value={String(th)}>TAHUN {th}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block mb-1 text-slate-500 uppercase">PILIH BULAN</label>
                    <select
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-indigo-500 bg-white outline-none cursor-pointer"
                        value={filterBulan}
                        onChange={e => setFilterBulan(e.target.value)}
                    >
                        {BULAN_OPTIONS.map(b => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <button
                        type="button"
                        onClick={() => fetchHariLibur()}
                        className="w-full h-[42px] bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition uppercase cursor-pointer"
                    >
                        <Search size={14} /> TAMPILKAN DATA
                    </button>
                </div>
            </div>

            {/* TABEL DATA */}
            <DataTableTemplate
                title={`DAFTAR HARI LIBUR TAHUN ${filterTahun}`}
                columns={columns}
                data={filteredData}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={handleOpenAdd}
                onEdit={handleEditTrigger}
                onDelete={handleDeleteTrigger}
            />

            {/* MODAL TAMBAH (MENDUKUNG 1 HARI ATAU RENTANG CUTI BERSAMA) */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-lg p-6 bg-white rounded-2xl shadow-2xl border flex flex-col">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-rose-400 text-rose-700 font-bold text-sm tracking-wide rounded-sm uppercase">
                                TAMBAH HARI LIBUR NASIONAL
                            </span>
                        </div>

                        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">TANGGAL MULAI *</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-sm outline-none focus:border-indigo-500"
                                        value={formData.tanggal_awal}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setFormData(prev => ({
                                                ...prev,
                                                tanggal_awal: val,
                                                tanggal_akhir: prev.tanggal_akhir < val ? val : prev.tanggal_akhir
                                            }));
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1">SAMPAI TANGGAL <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span></label>
                                    <input
                                        type="date"
                                        min={formData.tanggal_awal}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-sm outline-none focus:border-indigo-500"
                                        value={formData.tanggal_akhir}
                                        onChange={e => setFormData({ ...formData, tanggal_akhir: e.target.value })}
                                    />
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500 font-normal -mt-2">
                                *Isi rentang tanggal berbeda jika ingin menginput Cuti Bersama beberapa hari sekaligus.
                            </p>

                            <div>
                                <label className="block mb-1">KETERANGAN HARI LIBUR *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2.5 border border-slate-300 rounded-lg font-bold uppercase outline-none focus:border-indigo-500"
                                    placeholder="Contoh: HARI RAYA IDUL FITRI / CUTI BERSAMA"
                                    value={formData.keterangan}
                                    onChange={e => setFormData({ ...formData, keterangan: e.target.value.toUpperCase() })}
                                />
                            </div>

                            <div className="flex items-center justify-center gap-3 pt-4 border-t mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-6 py-2 border text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 text-xs uppercase cursor-pointer"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-xs uppercase shadow-md cursor-pointer"
                                >
                                    SIMPAN HARI LIBUR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL EDIT */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-lg p-6 bg-white rounded-2xl shadow-2xl border flex flex-col">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-amber-500 text-amber-700 font-bold text-sm tracking-wide rounded-sm uppercase">
                                EDIT HARI LIBUR
                            </span>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block mb-1">TANGGAL *</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-sm outline-none focus:border-indigo-500"
                                    value={editFormData.tanggal}
                                    onChange={e => setEditFormData({ ...editFormData, tanggal: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block mb-1">KETERANGAN HARI LIBUR *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2.5 border border-slate-300 rounded-lg font-bold uppercase outline-none focus:border-indigo-500"
                                    value={editFormData.keterangan}
                                    onChange={e => setEditFormData({ ...editFormData, keterangan: e.target.value.toUpperCase() })}
                                />
                            </div>

                            <div className="flex items-center justify-center gap-3 pt-4 border-t mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-6 py-2 border text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 text-xs uppercase cursor-pointer"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-xs uppercase shadow-md cursor-pointer"
                                >
                                    UPDATE HARI LIBUR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterHariLibur;