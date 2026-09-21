import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Filter, RotateCcw, RefreshCw, X as XIcon, Save, Download, MapPin, Plus } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

const MasterHargaPerwilayah = () => {
    const { isDarkMode } = useDarkMode();

    // State Data Table
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // State Filter Panel (Collapsible)
    const [showFilter, setShowFilter] = useState(true);
    const [filterInput, setFilterInput] = useState({
        search_provinsiAsal: '',
        search_kotaAsal: '',
        search_provinsiTujuan: '',
        search_kotaTujuan: '',
        search_kategori: [],
        search_service: []
    });

    // State Modal Input (Tambah Data)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const initialForm = {
        kota_asal: '',
        kota_tujuan: '',
        kategori: 0,
        service: 1,
        nominal: ''
    };
    const [formData, setFormData] = useState(initialForm);

    // State Modal Edit
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [editForm, setEditForm] = useState(initialForm);

    useEffect(() => {
        fetchData();
    }, []);

    // 1. Fetch Data Tarif Transit
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();

            if (filterInput.search_provinsiAsal?.trim()) {
                params.append('search_provinsiAsal', filterInput.search_provinsiAsal.trim());
            }
            if (filterInput.search_kotaAsal?.trim()) {
                params.append('search_kotaAsal', filterInput.search_kotaAsal.trim());
            }
            if (filterInput.search_provinsiTujuan?.trim()) {
                params.append('search_provinsiTujuan', filterInput.search_provinsiTujuan.trim());
            }
            if (filterInput.search_kotaTujuan?.trim()) {
                params.append('search_kotaTujuan', filterInput.search_kotaTujuan.trim());
            }
            if (filterInput.search_kategori?.length > 0) {
                params.append('search_kategori', filterInput.search_kategori.join(','));
            }
            if (filterInput.search_service?.length > 0) {
                params.append('search_service', filterInput.search_service.join(','));
            }

            const res = await api.get(`/master/tarif-transit/list?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let rows = [];
            if (Array.isArray(res.data)) {
                rows = res.data;
            } else if (Array.isArray(res.data?.data)) {
                rows = res.data.data;
            } else if (Array.isArray(res.data?.data?.data)) {
                rows = res.data.data.data;
            }

            setData(rows);
        } catch (err) {
            console.error("Gagal load data tarif transit:", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // 2. Submit Form Tambah Data
    const handleSubmitAdd = async (e) => {
        e.preventDefault();
        if (!formData.kota_asal || !formData.kota_tujuan || !formData.nominal) {
            Swal.fire('Warning', 'Mohon lengkapi seluruh field wajib!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const payload = {
                kota_asal: formData.kota_asal,
                kota_tujuan: formData.kota_tujuan,
                kategori: parseInt(formData.kategori, 10),
                service: parseInt(formData.service, 10),
                nominal: parseFloat(formData.nominal)
            };

            const res = await api.post('/master/tarif-transit/add', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', res.data?.message || 'Data tarif transit berhasil disimpan', 'success');
            setFormData(initialForm);
            setIsAddModalOpen(false);
            fetchData();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Gagal menyimpan data', 'error');
        }
    };

    // 3. Modal Edit & Update Form
    const handleOpenEdit = (item) => {
        setEditData(item);
        setEditForm({
            kota_asal: item.tr_kotaasal || item.TrKotaAsal || '',
            kota_tujuan: item.tr_kotatujuan || item.TrKotaTujuan || '',
            kategori: item.tr_kategori ?? item.TrKategori ?? 0,
            service: item.tr_servicetype ?? item.TrServiceType ?? 1,
            nominal: item.tr_nominal ?? item.TrNominal ?? 0
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateForm = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = {
                kota_asal: editForm.kota_asal,
                kota_tujuan: editForm.kota_tujuan,
                kategori: parseInt(editForm.kategori, 10),
                service: parseInt(editForm.service, 10),
                nominal: parseFloat(editForm.nominal)
            };

            await api.put(`/master/tarif-transit/update/${editData.id || editData.ID}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', 'Data tarif transit berhasil diperbarui', 'success');
            setIsEditModalOpen(false);
            fetchData();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Gagal memperbarui data', 'error');
        }
    };

    // 4. Hapus Data
    const handleDelete = (item) => {
        const id = item.id || item.ID;
        const rute = `${item.tr_kotaasal || item.TrKotaAsal} -> ${item.tr_kotatujuan || item.TrKotaTujuan}`;
        Swal.fire({
            title: 'Hapus Tarif Transit?',
            text: `Yakin ingin menghapus tarif transit rute ${rute}?`,
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
                    await api.delete(`/master/tarif-transit/delete/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
                    fetchData();
                } catch (err) {
                    Swal.fire('Error', err.response?.data?.message || 'Gagal menghapus data', 'error');
                }
            }
        });
    };

    // 5. Export ke CSV / Excel
    const handleExportExcel = () => {
        if (!data || data.length === 0) {
            Swal.fire('Data Kosong', 'Tidak ada data untuk diekspor.', 'warning');
            return;
        }

        const headers = ["Provinsi Asal", "Kota Asal", "Provinsi Tujuan", "Kota Tujuan", "Kategori", "Service", "Nominal"];
        const rows = data.map(item => [
            `"${item.provinsi_asal || '-'}"`,
            `"${item.tr_kotaasal || item.TrKotaAsal || '-'}"`,
            `"${item.provinsi_tujuan || '-'}"`,
            `"${item.tr_kotatujuan || item.TrKotaTujuan || '-'}"`,
            `"${Number(item.tr_kategori ?? item.TrKategori) === 1 ? 'Loper' : 'Surat Perintah'}"`,
            `"${Number(item.tr_servicetype ?? item.TrServiceType) === 2 ? 'Laut' : Number(item.tr_servicetype ?? item.TrServiceType) === 3 ? 'Udara' : 'Darat'}"`,
            `"Rp ${Number(item.tr_nominal || item.TrNominal || 0).toLocaleString('id-ID')}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Tarif_Transit_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Reset Form Filter
    const handleResetFilter = () => {
        setFilterInput({
            search_provinsiAsal: '',
            search_kotaAsal: '',
            search_provinsiTujuan: '',
            search_kotaTujuan: '',
            search_kategori: [],
            search_service: []
        });
        const token = localStorage.getItem('token');
        setLoading(true);
        api.get('/master/tarif-transit/list', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => {
                const rows = res.data?.data || [];
                setData(Array.isArray(rows) ? rows : []);
            })
            .finally(() => setLoading(false));
    };

    // Konfigurasi Kolom Tabel
    const columns = [
        {
            header: 'PROVINSI ASAL',
            accessor: 'provinsi_asal',
            render: (i) => <span className="font-semibold text-xs uppercase !text-slate-800">{i.provinsi_asal || '-'}</span>
        },
        {
            header: 'KOTA ASAL',
            accessor: 'tr_kotaasal',
            render: (i) => <span className="font-bold text-xs uppercase !text-slate-900">{i.tr_kotaasal || i.TrKotaAsal || '-'}</span>
        },
        {
            header: 'PROVINSI TUJUAN',
            accessor: 'provinsi_tujuan',
            render: (i) => <span className="font-semibold text-xs uppercase !text-slate-800">{i.provinsi_tujuan || '-'}</span>
        },
        {
            header: 'KOTA TUJUAN',
            accessor: 'tr_kotatujuan',
            render: (i) => <span className="font-bold text-xs uppercase !text-sky-700">{i.tr_kotatujuan || i.TrKotaTujuan || '-'}</span>
        },
        {
            header: 'KATEGORI',
            accessor: 'tr_kategori',
            render: (i) => {
                const isLoper = Number(i.tr_kategori ?? i.TrKategori) === 1;
                return (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${isLoper ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                        {isLoper ? 'Loper' : 'Surat Perintah'}
                    </span>
                );
            }
        },
        {
            header: 'SERVICE',
            accessor: 'tr_servicetype',
            render: (i) => {
                const s = Number(i.tr_servicetype ?? i.TrServiceType);
                const label = s === 2 ? 'Laut' : s === 3 ? 'Udara' : 'Darat';
                return <span className="font-bold text-xs uppercase !text-slate-800">{label}</span>;
            }
        },
        {
            header: 'NOMINAL',
            accessor: 'tr_nominal',
            render: (i) => (
                <span className="font-mono font-black text-xs !text-emerald-600">
                    Rp {Number(i.tr_nominal || i.TrNominal || 0).toLocaleString('id-ID')}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-4 master-transit-wrapper">
            <style>
                {`
                .master-transit-wrapper table tbody tr td {
                    color: #0f172a !important;
                    font-weight: 600 !important;
                }
                `}
            </style>

            {/* Panel Filter Pencarian */}
            {showFilter && (
                <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-800 tracking-wider text-sm">
                        <Filter size={16} className="text-sky-600" />
                        Pencarian Tarif Transit
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="font-bold text-slate-600 block mb-1">Provinsi Asal:</label>
                            <input
                                type="text"
                                placeholder="Provinsi Asal..."
                                value={filterInput.search_provinsiAsal}
                                onChange={(e) => setFilterInput({ ...filterInput, search_provinsiAsal: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold text-slate-800 outline-none focus:border-sky-500 uppercase"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-600 block mb-1">Kota Asal:</label>
                            <input
                                type="text"
                                placeholder="Kota Asal..."
                                value={filterInput.search_kotaAsal}
                                onChange={(e) => setFilterInput({ ...filterInput, search_kotaAsal: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold text-slate-800 outline-none focus:border-sky-500 uppercase"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-600 block mb-1">Provinsi Tujuan:</label>
                            <input
                                type="text"
                                placeholder="Provinsi Tujuan..."
                                value={filterInput.search_provinsiTujuan}
                                onChange={(e) => setFilterInput({ ...filterInput, search_provinsiTujuan: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold text-slate-800 outline-none focus:border-sky-500 uppercase"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-600 block mb-1">Kota Tujuan:</label>
                            <input
                                type="text"
                                placeholder="Kota Tujuan..."
                                value={filterInput.search_kotaTujuan}
                                onChange={(e) => setFilterInput({ ...filterInput, search_kotaTujuan: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold text-slate-800 outline-none focus:border-sky-500 uppercase"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3">
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-slate-600">Kategori:</span>
                                {[
                                    { label: 'Surat Perintah', val: '0' },
                                    { label: 'Loper', val: '1' }
                                ].map((k) => (
                                    <label key={k.val} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={filterInput.search_kategori.includes(k.val)}
                                            onChange={(e) => {
                                                const updated = e.target.checked
                                                    ? [...filterInput.search_kategori, k.val]
                                                    : filterInput.search_kategori.filter(x => x !== k.val);
                                                setFilterInput({ ...filterInput, search_kategori: updated });
                                            }}
                                            className="w-4 h-4 rounded text-sky-600 accent-sky-600 cursor-pointer"
                                        />
                                        <span>{k.label}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="font-bold text-slate-600">Service:</span>
                                {[
                                    { label: 'Darat', val: '1' },
                                    { label: 'Laut', val: '2' },
                                    { label: 'Udara', val: '3' }
                                ].map((s) => (
                                    <label key={s.val} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={filterInput.search_service.includes(s.val)}
                                            onChange={(e) => {
                                                const updated = e.target.checked
                                                    ? [...filterInput.search_service, s.val]
                                                    : filterInput.search_service.filter(x => x !== s.val);
                                                setFilterInput({ ...filterInput, search_service: updated });
                                            }}
                                            className="w-4 h-4 rounded text-sky-600 accent-sky-600 cursor-pointer"
                                        />
                                        <span>{s.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
                            >
                                <RefreshCw size={14} /> Cari
                            </button>
                            <button
                                type="button"
                                onClick={handleResetFilter}
                                className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer flex items-center gap-1.5"
                            >
                                <RotateCcw size={14} /> Reset
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* 🌟 CONTAINER WRAPPER */}
            <div className="relative">
                {/* Turunkan ke top-[34px] atau top-8 agar satu garis horizontal sempurna */}
                <div className="absolute right-0 top-[34px] z-10">
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm cursor-pointer transition active:scale-95"
                        title="Export Data ke Excel/CSV"
                    >
                        <Download size={16} /> Export to Excel
                    </button>
                </div>

                {/* TABEL UTAMA */}
                <DataTableTemplate
                    title="DAFTAR TARIF TRANSIT"
                    columns={columns}
                    data={data}
                    loading={loading}
                    isDarkMode={isDarkMode}
                    onAdd={() => {
                        setFormData(initialForm);
                        setIsAddModalOpen(true);
                    }}
                    onFilter={() => setShowFilter(prev => !prev)}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                />
            </div>

            {/* Modal Tambah Data */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-2xl p-6 rounded-2xl bg-white shadow-2xl border border-slate-200 text-slate-800">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                            <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
                                <MapPin size={18} className="text-sky-600" />
                                INPUT TARIF TRANSIT BARU
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitAdd} className="space-y-4 my-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="font-bold text-slate-600 block">Kota Asal <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Ketik nama kota asal (misal: BEKASI KOTA)..."
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs uppercase font-bold bg-white text-slate-900 outline-none focus:border-sky-500"
                                        value={formData.kota_asal}
                                        onChange={(e) => setFormData({ ...formData, kota_asal: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-bold text-slate-600 block">Kota Tujuan <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Ketik nama kota tujuan (misal: AGAM)..."
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs uppercase font-bold bg-white text-slate-900 outline-none focus:border-sky-500"
                                        value={formData.kota_tujuan}
                                        onChange={(e) => setFormData({ ...formData, kota_tujuan: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Kategori</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-lg font-bold bg-white text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                                        value={formData.kategori}
                                        onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                                    >
                                        <option value={0}>Surat Perintah</option>
                                        <option value={1}>Loper</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Service Layanan</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-lg font-bold bg-white text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                                        value={formData.service}
                                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                                    >
                                        <option value={1}>Darat</option>
                                        <option value={2}>Laut</option>
                                        <option value={3}>Udara</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Nominal (Rp) <span className="text-rose-500">*</span></label>
                                    <input
                                        type="number"
                                        placeholder="Masukkan nominal Rp..."
                                        className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-emerald-600 bg-white outline-none focus:border-sky-500"
                                        value={formData.nominal}
                                        onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl text-xs uppercase cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase shadow-md flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Save size={14} /> Simpan Tarif Transit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Edit Data */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-xl p-6 rounded-2xl bg-white shadow-2xl border border-slate-200 text-slate-800">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                            <h3 className="font-black text-sm uppercase text-slate-800">EDIT TARIF TRANSIT</h3>
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateForm} className="space-y-4 my-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold block mb-1 text-slate-600">Kota Asal</label>
                                    <input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg font-bold uppercase bg-slate-100 text-slate-600" value={editForm.kota_asal} readOnly />
                                </div>
                                <div>
                                    <label className="font-bold block mb-1 text-slate-600">Kota Tujuan</label>
                                    <input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg font-bold uppercase bg-slate-100 text-slate-600" value={editForm.kota_tujuan} readOnly />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="font-bold block mb-1 text-slate-600">Kategori</label>
                                    <select className="w-full p-2.5 border border-slate-300 rounded-lg font-bold bg-white text-slate-800 outline-none cursor-pointer" value={editForm.kategori} onChange={e => setEditForm({ ...editForm, kategori: e.target.value })}>
                                        <option value={0}>Surat Perintah</option>
                                        <option value={1}>Loper</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-bold block mb-1 text-slate-600">Service</label>
                                    <select className="w-full p-2.5 border border-slate-300 rounded-lg font-bold bg-white text-slate-800 outline-none cursor-pointer" value={editForm.service} onChange={e => setEditForm({ ...editForm, service: e.target.value })}>
                                        <option value={1}>Darat</option>
                                        <option value={2}>Laut</option>
                                        <option value={3}>Udara</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-bold block mb-1 text-slate-600">Nominal (Rp)</label>
                                    <input type="number" className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-emerald-600 bg-white outline-none" value={editForm.nominal} onChange={e => setEditForm({ ...editForm, nominal: e.target.value })} required />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold uppercase hover:bg-slate-100 cursor-pointer">Batal</button>
                                <button type="submit" className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold uppercase shadow-md cursor-pointer">Simpan Perubahan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterHargaPerwilayah;