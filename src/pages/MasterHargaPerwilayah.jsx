import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Save, Search, RefreshCw, Edit, Trash2, X as XIcon, Plus, Download } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';

const MasterHargaPerwilayah = () => {
    const { isDarkMode } = useDarkMode();

    // State Data Table & Pagination
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(15);
    const [totalRecords, setTotalRecords] = useState(0);

    // State Dropdown Master Options
    const [provinsiOptions, setProvinsiOptions] = useState([]);
    const [kotaAsalSuggestions, setKotaAsalSuggestions] = useState([]);
    const [kotaTujuanSuggestions, setKotaTujuanSuggestions] = useState([]);

    // State Form Input Utama (Tambah)
    const initialForm = {
        provinsi_asal: '',
        kota_asal: '',
        provinsi_tujuan: '',
        kota_tujuan: '',
        kategori: 0, // 0: Surat Perintah, 1: Loper
        service: 1,  // 1: Darat, 2: Laut, 3: Udara
        nominal: ''
    };
    const [formData, setFormData] = useState(initialForm);

    // State Form Filter Search
    const [filterInput, setFilterInput] = useState({
        search_provinsiAsal: '',
        search_kotaAsal: '',
        search_provinsiTujuan: '',
        search_kotaTujuan: '',
        search_kategori: [], // array untuk multi-check [0, 1]
        search_service: []   // array untuk multi-check [1, 2, 3]
    });

    // State Modal Edit
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [editForm, setEditForm] = useState(initialForm);
    const [editKotaAsalSuggestions, setEditKotaAsalSuggestions] = useState([]);
    const [editKotaTujuanSuggestions, setEditKotaTujuanSuggestions] = useState([]);

    useEffect(() => {
        fetchProvinsiList();
        fetchData();
    }, [page]);

    // 1. FETCH API PROVINSI
    const fetchProvinsiList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/master/tarif-transit/provinsi', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProvinsiOptions(res.data.data || []);
        } catch (err) {
            console.error("Gagal load data provinsi:", err);
        }
    };

    // 2. FETCH DATA TABLE (LIST TARIF TRANSIT)
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {
                page,
                limit,
                search_provinsiAsal: filterInput.search_provinsiAsal,
                search_kotaAsal: filterInput.search_kotaAsal,
                search_provinsiTujuan: filterInput.search_provinsiTujuan,
                search_kotaTujuan: filterInput.search_kotaTujuan,
                search_kategori: filterInput.search_kategori.join(','),
                search_service: filterInput.search_service.join(',')
            };

            const res = await api.get('/master/tarif-transit/list', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setData(res.data.data || []);
            setTotalRecords(res.data.total_records || 0);
        } catch (err) {
            console.error("Gagal load tarif transit:", err);
            Swal.fire('Error', 'Gagal memuat data tarif transit', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 3. AUTOCOMPLETE KOTA HANDLERS
    const handleKotaSearch = async (prov, query, targetType, isEdit = false) => {
        if (!prov) return;
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/master/tarif-transit/kota-by-provinsi', {
                params: { provinsi: prov, query },
                headers: { Authorization: `Bearer ${token}` }
            });

            const results = res.data.data || [];
            if (isEdit) {
                if (targetType === 'asal') setEditKotaAsalSuggestions(results);
                else setEditKotaTujuanSuggestions(results);
            } else {
                if (targetType === 'asal') setKotaAsalSuggestions(results);
                else setKotaTujuanSuggestions(results);
            }
        } catch (err) {
            console.error("Error autocomplete kota:", err);
        }
    };

    // 4. SUBMIT FORM TAMBAH DATA
    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.kota_asal || !formData.kota_tujuan || !formData.nominal) {
            Swal.fire('Warning', 'Mohon lengkapi semua field required!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                kategori: parseInt(formData.kategori),
                service: parseInt(formData.service),
                nominal: parseFloat(formData.nominal)
            };

            const res = await api.post('/master/tarif-transit/add', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', res.data.message || 'Data tarif transit berhasil disimpan', 'success');
            setFormData(initialForm);
            fetchData();
        } catch (err) {
            const msg = err.response?.data?.message || 'Gagal menyimpan data';
            Swal.fire('Error', msg, 'error');
        }
    };

    // 5. OPEN EDIT MODAL
    const handleOpenEdit = (item) => {
        setEditData(item);
        setEditForm({
            provinsi_asal: item.provinsi_asal || '',
            kota_asal: item.tr_kotaasal || '',
            provinsi_tujuan: item.provinsi_tujuan || '',
            kota_tujuan: item.tr_kotatujuan || '',
            kategori: item.tr_kategori || 0,
            service: item.tr_servicetype || 1,
            nominal: item.tr_nominal || 0
        });
        setIsEditModalOpen(true);
    };

    // 6. SUBMIT EDIT DATA
    const handleUpdateForm = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...editForm,
                kategori: parseInt(editForm.kategori),
                service: parseInt(editForm.service),
                nominal: parseFloat(editForm.nominal)
            };

            await api.put(`/master/tarif-transit/update/${editData.id}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', 'Data tarif transit berhasil diperbarui', 'success');
            setIsEditModalOpen(false);
            fetchData();
        } catch (err) {
            Swal.fire('Error', 'Gagal memperbarui data', 'error');
        }
    };

    // 7. DELETE DATA
    const handleDelete = (id, rute) => {
        Swal.fire({
            title: 'Apakah Anda Yakin?',
            text: `Menghapus tarif transit rute ${rute}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
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
                    Swal.fire('Error', 'Gagal menghapus data', 'error');
                }
            }
        });
    };

    // Helper text formatter
    const getKategoriLabel = (val) => (parseInt(val) === 1 ? 'Loper' : 'Surat Perintah');
    const getServiceLabel = (val) => {
        switch (parseInt(val)) {
            case 1: return 'Darat';
            case 2: return 'Laut';
            case 3: return 'Udara';
            default: return 'Darat';
        }
    };

    // Total Halaman
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return (
        <div className="min-h-screen p-4 space-y-6 bg-slate-50 text-slate-800">

            {/* HEADER TITLE */}
            <div className="flex justify-between items-center border-b pb-3 border-slate-200">
                <div>
                    <h1 className="text-xl font-bold tracking-wide uppercase text-slate-800">
                        MANAJEMEN TARIF TRANSIT (HARGA PERWILAYAH)
                    </h1>
                    <p className="text-xs text-slate-500">
                        Pengelolaan tarif transit operasional kargo antar kota & kabupaten se-Indonesia
                    </p>
                </div>
            </div>

            {/* 📋 AREA 1: FORM INPUT UTAMA (TAMBAH DATA - STYLE BERSIH DAKOTA) */}
            <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-4 flex items-center gap-2">
                    <Plus size={16} /> INPUT TARIF TRANSIT BARU
                </h3>
                <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">

                        {/* WILAYAH ASAL */}
                        <div className="p-3 border border-slate-200 rounded-lg space-y-3 bg-white">
                            <span className="font-bold text-blue-600 uppercase block text-[11px]">📍 WILAYAH ASAL</span>
                            <div>
                                <label className="font-semibold text-slate-600 block mb-1">Provinsi Asal</label>
                                <select
                                    className="w-full p-2.5 border border-slate-300 rounded text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                                    value={formData.provinsi_asal}
                                    onChange={(e) => {
                                        setFormData({ ...formData, provinsi_asal: e.target.value, kota_asal: '' });
                                        handleKotaSearch(e.target.value, '', 'asal');
                                    }}
                                >
                                    <option value="">-- Pilih Provinsi Asal --</option>
                                    {provinsiOptions.map((p, idx) => <option key={idx} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="relative">
                                <label className="font-semibold text-slate-600 block mb-1">Kota Asal</label>
                                <input
                                    type="text"
                                    disabled={!formData.provinsi_asal}
                                    placeholder={formData.provinsi_asal ? "Ketik nama kota..." : "PILIH PROVINSI TERLEBIH DAHULU"}
                                    className="w-full p-2.5 border border-slate-300 rounded text-xs uppercase font-bold bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                                    value={formData.kota_asal}
                                    onChange={(e) => {
                                        setFormData({ ...formData, kota_asal: e.target.value });
                                        handleKotaSearch(formData.provinsi_asal, e.target.value, 'asal');
                                    }}
                                />
                                {kotaAsalSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-40 overflow-y-auto z-20">
                                        {kotaAsalSuggestions.map((k, idx) => (
                                            <div
                                                key={idx}
                                                className="p-2 hover:bg-blue-50 cursor-pointer font-semibold text-slate-700"
                                                onClick={() => {
                                                    setFormData({ ...formData, kota_asal: k });
                                                    setKotaAsalSuggestions([]);
                                                }}
                                            >
                                                {k}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* WILAYAH TUJUAN */}
                        <div className="p-3 border border-slate-200 rounded-lg space-y-3 bg-white">
                            <span className="font-bold text-purple-600 uppercase block text-[11px]">🎯 WILAYAH TUJUAN</span>
                            <div>
                                <label className="font-semibold text-slate-600 block mb-1">Provinsi Tujuan</label>
                                <select
                                    className="w-full p-2.5 border border-slate-300 rounded text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:border-purple-500"
                                    value={formData.provinsi_tujuan}
                                    onChange={(e) => {
                                        setFormData({ ...formData, provinsi_tujuan: e.target.value, kota_tujuan: '' });
                                        handleKotaSearch(e.target.value, '', 'tujuan');
                                    }}
                                >
                                    <option value="">-- Pilih Provinsi Tujuan --</option>
                                    {provinsiOptions.map((p, idx) => <option key={idx} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="relative">
                                <label className="font-semibold text-slate-600 block mb-1">Kota Tujuan</label>
                                <input
                                    type="text"
                                    disabled={!formData.provinsi_tujuan}
                                    placeholder={formData.provinsi_tujuan ? "Ketik nama kota..." : "PILIH PROVINSI TERLEBIH DAHULU"}
                                    className="w-full p-2.5 border border-slate-300 rounded text-xs uppercase font-bold bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 disabled:bg-slate-100 disabled:text-slate-400"
                                    value={formData.kota_tujuan}
                                    onChange={(e) => {
                                        setFormData({ ...formData, kota_tujuan: e.target.value });
                                        handleKotaSearch(formData.provinsi_tujuan, e.target.value, 'tujuan');
                                    }}
                                />
                                {kotaTujuanSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-40 overflow-y-auto z-20">
                                        {kotaTujuanSuggestions.map((k, idx) => (
                                            <div
                                                key={idx}
                                                className="p-2 hover:bg-purple-50 cursor-pointer font-semibold text-slate-700"
                                                onClick={() => {
                                                    setFormData({ ...formData, kota_tujuan: k });
                                                    setKotaTujuanSuggestions([]);
                                                }}
                                            >
                                                {k}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PARAMETER & NOMINAL */}
                    <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-3">
                        <div>
                            <label className="font-semibold text-slate-600 block mb-1">Kategori</label>
                            <select
                                className="w-full p-2.5 border border-slate-300 rounded text-xs font-semibold bg-white text-slate-800 focus:outline-none"
                                value={formData.kategori}
                                onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                            >
                                <option value={0}>Surat Perintah</option>
                                <option value={1}>Loper</option>
                            </select>
                        </div>
                        <div>
                            <label className="font-semibold text-slate-600 block mb-1">Service Layanan</label>
                            <select
                                className="w-full p-2.5 border border-slate-300 rounded text-xs font-semibold bg-white text-slate-800 focus:outline-none"
                                value={formData.service}
                                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                            >
                                <option value={1}>Darat</option>
                                <option value={2}>Laut</option>
                                <option value={3}>Udara</option>
                            </select>
                        </div>
                        <div>
                            <label className="font-semibold text-slate-600 block mb-1">Nominal Tarif Transit (Rp)</label>
                            <input
                                type="number"
                                placeholder="Masukkan nominal Rp..."
                                className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono font-bold text-emerald-600 bg-white placeholder-slate-400 focus:outline-none"
                                value={formData.nominal}
                                onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="submit" className="px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm">
                            <Save size={14} /> Simpan Tarif Transit
                        </button>
                    </div>
                </form>
            </div>

            {/* 🔍 AREA 2: FORM PENCARIAN & MULTI-FILTER */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                    <Search size={14} /> FILTER & PENCARIAN TARIF TRANSIT
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                    <input
                        type="text"
                        placeholder="CARI KOTA ASAL..."
                        className="p-2.5 border border-slate-300 rounded bg-white text-slate-800 placeholder-slate-400 uppercase text-xs focus:outline-none"
                        value={filterInput.search_kotaAsal}
                        onChange={(e) => setFilterInput({ ...filterInput, search_kotaAsal: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="CARI KOTA TUJUAN..."
                        className="p-2.5 border border-slate-300 rounded bg-white text-slate-800 placeholder-slate-400 uppercase text-xs focus:outline-none"
                        value={filterInput.search_kotaTujuan}
                        onChange={(e) => setFilterInput({ ...filterInput, search_kotaTujuan: e.target.value })}
                    />
                </div>

                <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-3">
                    <div className="flex gap-6">
                        {/* Filter Kategori Checkboxes */}
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-600">Kategori:</span>
                            {[
                                { label: 'Surat Perintah', val: '0' },
                                { label: 'Loper', val: '1' }
                            ].map((k) => (
                                <label key={k.val} className="flex items-center gap-1 cursor-pointer text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={filterInput.search_kategori.includes(k.val)}
                                        onChange={(e) => {
                                            const updated = e.target.checked
                                                ? [...filterInput.search_kategori, k.val]
                                                : filterInput.search_kategori.filter(x => x !== k.val);
                                            setFilterInput({ ...filterInput, search_kategori: updated });
                                        }}
                                        className="accent-blue-600"
                                    />
                                    <span>{k.label}</span>
                                </label>
                            ))}
                        </div>

                        {/* Filter Service Checkboxes */}
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-600">Service:</span>
                            {[
                                { label: 'Darat', val: '1' },
                                { label: 'Laut', val: '2' },
                                { label: 'Udara', val: '3' }
                            ].map((s) => (
                                <label key={s.val} className="flex items-center gap-1 cursor-pointer text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={filterInput.search_service.includes(s.val)}
                                        onChange={(e) => {
                                            const updated = e.target.checked
                                                ? [...filterInput.search_service, s.val]
                                                : filterInput.search_service.filter(x => x !== s.val);
                                            setFilterInput({ ...filterInput, search_service: updated });
                                        }}
                                        className="accent-blue-600"
                                    />
                                    <span>{s.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => { setPage(1); fetchData(); }}
                            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                        >
                            <Search size={14} /> Cari
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setFilterInput({
                                    search_kotaAsal: '', search_kotaTujuan: '',
                                    search_kategori: [], search_service: []
                                });
                                setPage(1);
                                fetchData();
                            }}
                            className="px-4 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1"
                        >
                            <RefreshCw size={14} /> Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* 📊 AREA 3: TABEL DAFTAR TARIF TRANSIT */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-blue-600 text-white font-bold uppercase tracking-wider text-[11px]">
                                <th className="p-2.5 border-r border-white">Kota Asal</th>
                                <th className="p-2.5 border-r border-white">Kota Tujuan</th>
                                <th className="p-2.5 border-r border-white text-center">Kategori</th>
                                <th className="p-2.5 border-r border-white text-center">Service</th>
                                <th className="p-2.5 border-r border-white text-right">Nominal (Rp)</th>
                                <th className="p-2.5 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="text-center p-8 text-gray-400 font-bold">Memuat data tarif transit...</td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan={6} className="text-center p-8 text-gray-400 font-bold">Tidak ada data ditemukan</td></tr>
                            ) : (
                                data.map((row) => (
                                    <tr key={row.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                                        <td className="p-2.5 border-r border-slate-200 font-bold text-slate-800">{row.tr_kotaasal}</td>
                                        <td className="p-2.5 border-r border-slate-200 font-bold text-purple-700">{row.tr_kotatujuan}</td>
                                        <td className="p-2.5 border-r border-slate-200 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.tr_kategori === 1 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {getKategoriLabel(row.tr_kategori)}
                                            </span>
                                        </td>
                                        <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-700">{getServiceLabel(row.tr_servicetype)}</td>
                                        <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-emerald-600">
                                            Rp {row.tr_nominal?.toLocaleString()}
                                        </td>
                                        <td className="p-2.5 text-center">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => handleOpenEdit(row)} className="p-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white"><Edit size={13} /></button>
                                                <button onClick={() => handleDelete(row.id, `${row.tr_kotaasal} -> ${row.tr_kotatujuan}`)} className="p-1.5 rounded bg-red-600 hover:bg-red-700 text-white"><Trash2 size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION FOOTER */}
                <div className="flex justify-between items-center mt-4 text-xs font-semibold">
                    <span className="text-slate-500">Total: {totalRecords} Data (Halaman {page} dari {totalPages})</span>
                    <div className="flex gap-1">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
                        >
                            &laquo; Prev
                        </button>
                        <span className="px-3 py-1 bg-blue-600 text-white rounded font-bold">{page}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
                        >
                            Next &raquo;
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL EDIT (CLEAN WHITE STYLE SAMA DENGAN GAMBAR 2) */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-2xl p-6 rounded-xl bg-white shadow-2xl text-slate-800">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                            <h3 className="font-bold text-slate-800 text-sm uppercase">EDIT TARIF TRANSIT</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XIcon size={18} /></button>
                        </div>
                        <form onSubmit={handleUpdateForm} className="space-y-4 my-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold block mb-1 text-slate-600">Kota Asal</label>
                                    <input type="text" className="w-full p-2.5 border border-slate-300 rounded font-bold uppercase bg-slate-100 text-slate-600" value={editForm.kota_asal} readOnly />
                                </div>
                                <div>
                                    <label className="font-bold block mb-1 text-slate-600">Kota Tujuan</label>
                                    <input type="text" className="w-full p-2.5 border border-slate-300 rounded font-bold uppercase bg-slate-100 text-slate-600" value={editForm.kota_tujuan} readOnly />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="font-bold block mb-1 text-slate-600">Kategori</label>
                                    <select className="w-full p-2.5 border border-slate-300 rounded font-bold bg-white text-slate-800" value={editForm.kategori} onChange={e => setEditForm({ ...editForm, kategori: e.target.value })}>
                                        <option value={0}>Surat Perintah</option>
                                        <option value={1}>Loper</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-bold block mb-1 text-slate-600">Service</label>
                                    <select className="w-full p-2.5 border border-slate-300 rounded font-bold bg-white text-slate-800" value={editForm.service} onChange={e => setEditForm({ ...editForm, service: e.target.value })}>
                                        <option value={1}>Darat</option>
                                        <option value={2}>Laut</option>
                                        <option value={3}>Udara</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-bold block mb-1 text-slate-600">Nominal (Rp)</label>
                                    <input type="number" className="w-full p-2.5 border border-slate-300 rounded font-mono font-bold text-emerald-600 bg-white" value={editForm.nominal} onChange={e => setEditForm({ ...editForm, nominal: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-1.5 rounded border border-slate-300 bg-white text-slate-700 font-bold">Batal</button>
                                <button type="submit" className="px-5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold">Simpan Perubahan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterHargaPerwilayah;