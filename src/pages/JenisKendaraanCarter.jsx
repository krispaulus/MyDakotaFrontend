import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Truck, Search, Plus, Trash2, Edit3, CheckCircle2, MinusCircle, RefreshCw, X } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from "../context/DarkModeContext";
import Swal from 'sweetalert2';

const JenisKendaraanCarter = () => {
    const { isDarkMode } = useDarkMode();
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter Search States
    const [filterMerk, setFilterMerk] = useState('');
    const [filterModel, setFilterModel] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Modal Form State (Tambah / Edit)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const [formData, setFormData] = useState({
        jenis_id: '',
        jenis_merk: '',
        jenis_model: '',
        jenis_hargasewa: 0,
        jenis_aktifyn: 'Y'
    });

    // 1. FETCH DATA LIST JENIS KENDARAAN CARTER
    const fetchJenisKendaraan = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/master/jenis-kendaraan-carter/list', {
                params: {
                    merk: filterMerk,
                    model: filterModel
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data;
            if (Array.isArray(data)) {
                setDataList(data);
            } else {
                setDataList([]);
            }
        } catch (err) {
            console.error("Gagal memuat jenis kendaraan carter:", err);
            setDataList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJenisKendaraan();
    }, []);

    // ➕ OPEN MODAL TAMBAH BARU
    const handleOpenAdd = () => {
        setIsEditMode(false);
        setFormData({
            jenis_id: '',
            jenis_merk: '',
            jenis_model: '',
            jenis_hargasewa: 0,
            jenis_aktifyn: 'Y'
        });
        setIsModalOpen(true);
    };

    // 📝 OPEN MODAL EDIT
    const handleOpenEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            jenis_id: item.jenis_id || '',
            jenis_merk: item.jenis_merk || '',
            jenis_model: item.jenis_model || '',
            jenis_hargasewa: item.jenis_hargasewa || 0,
            jenis_aktifyn: item.jenis_aktifyn || 'Y'
        });
        setIsModalOpen(true);
    };

    // 💾 SUBMIT SAVE (SIMPAN / UPDATE)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.jenis_id.trim()) {
            return Swal.fire('Peringatan', 'Kode Jenis Kendaraan Wajib Diisi!', 'warning');
        }
        if (!formData.jenis_merk.trim() || !formData.jenis_model.trim()) {
            return Swal.fire('Peringatan', 'Merk dan Model Kendaraan Wajib Diisi!', 'warning');
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/master/jenis-kendaraan-carter/save', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', `Jenis Kendaraan ${formData.jenis_model} berhasil disimpan!`, 'success');
            setIsModalOpen(false);
            fetchJenisKendaraan();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data jenis kendaraan', 'error');
        }
    };

    // 🗑️ DELETE JENIS KENDARAAN
    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Jenis Kendaraan?',
            text: `Apakah Anda yakin ingin menghapus armada ${item.jenis_merk} ${item.jenis_model} (${item.jenis_id})?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/master/jenis-kendaraan-carter/delete/${item.jenis_id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Sukses', `Jenis Kendaraan ${item.jenis_id} berhasil dihapus`, 'success');
                    fetchJenisKendaraan();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus jenis kendaraan', 'error');
                }
            }
        });
    };

    // Filter Local Client Search Table
    const filteredData = dataList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.jenis_id && item.jenis_id.toLowerCase().includes(q)) ||
            (item.jenis_merk && item.jenis_merk.toLowerCase().includes(q)) ||
            (item.jenis_model && item.jenis_model.toLowerCase().includes(q))
        );
    });

    // DEFINISI KOLOM TABEL (SESUAI OPR_M_KENDJENIS.ASP)
    const columns = [
        {
            header: 'KODE',
            accessor: 'jenis_id',
            render: (item) => (
                <span
                    className="font-bold text-indigo-600 hover:underline cursor-pointer font-mono text-sm"
                    onClick={() => handleOpenEdit(item)}
                >
                    {item.jenis_id}
                </span>
            )
        },
        {
            header: 'MERK KENDARAAN',
            accessor: 'jenis_merk',
            render: (item) => (
                <span className="font-bold text-slate-800 text-sm">{item.jenis_merk}</span>
            )
        },
        {
            header: 'MODEL KENDARAAN',
            accessor: 'jenis_model',
            render: (item) => (
                <span className="font-semibold text-slate-700 text-sm">{item.jenis_model}</span>
            )
        },
        {
            header: 'HARGA SEWA (RP)',
            accessor: 'jenis_hargasewa',
            render: (item) => (
                <span className="font-black text-emerald-800 text-sm">
                    Rp {Number(item.jenis_hargasewa).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'STATUS AKTIF',
            accessor: 'jenis_aktifyn',
            render: (item) => (
                item.jenis_aktifyn === 'Y' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-full">
                        <CheckCircle2 size={14} /> Ya / Aktif
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-500 bg-slate-100 rounded-full">
                        <MinusCircle size={14} /> Tidak
                    </span>
                )
            )
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Menu */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <Truck size={20} className="text-indigo-600" /> Tarif Carter Kendaraan / Jenis Armada
                </h3>
            </div>

            {/* FILTER PANEL */}
            <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 grid grid-cols-12 gap-4 items-end text-xs font-bold text-slate-600">
                <div className="col-span-4">
                    <label className="block mb-1 text-slate-500 uppercase">MERK KENDARAAN</label>
                    <input
                        type="text"
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 bg-white outline-none uppercase"
                        placeholder="Contoh: ISUZU / MITSUBISHI..."
                        value={filterMerk}
                        onChange={e => setFilterMerk(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchJenisKendaraan()}
                    />
                </div>

                <div className="col-span-5">
                    <label className="block mb-1 text-slate-500 uppercase">MODEL KENDARAAN</label>
                    <input
                        type="text"
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 bg-white outline-none uppercase"
                        placeholder="Contoh: CDE BOX / CDD LONG..."
                        value={filterModel}
                        onChange={e => setFilterModel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchJenisKendaraan()}
                    />
                </div>

                <div className="col-span-3">
                    <button
                        onClick={fetchJenisKendaraan}
                        className="w-full h-[42px] bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition uppercase cursor-pointer"
                    >
                        <Search size={14} /> CARI / REFRESH
                    </button>
                </div>
            </div>

            {/* TABEL DATA TEMPLATE */}
            <DataTableTemplate
                title="TARIF CARTER KENDARAAN"
                columns={columns}
                data={filteredData}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={handleOpenAdd}
                onEdit={(item) => handleOpenEdit(item)}
                onDelete={(item) => handleDelete(item)}
            />

            {/* ============================================================== */}
            {/* 🟢 MODAL FORM INPUT/EDIT JENIS KENDARAAN                       */}
            {/* ============================================================== */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden my-8">
                        <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
                            <h4 className="font-bold text-sm uppercase">
                                {isEditMode ? `EDIT ARMADA: ${formData.jenis_id}` : 'TAMBAH JENIS KENDARAAN CARTER'}
                            </h4>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-slate-300"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block mb-1 text-slate-600 uppercase">KODE JENIS ARMADA *</label>
                                <input
                                    type="text"
                                    required
                                    readOnly={isEditMode}
                                    className={`w-full p-2.5 border rounded-lg uppercase text-sm font-black font-mono ${isEditMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-amber-50 text-indigo-900 focus:border-indigo-500'}`}
                                    placeholder="CONTOH: K0001"
                                    value={formData.jenis_id}
                                    onChange={e => setFormData({ ...formData, jenis_id: e.target.value.toUpperCase() })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">MERK KENDARAAN *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2.5 border rounded-lg uppercase text-sm font-bold text-slate-800"
                                        placeholder="CONTOH: ISUZU"
                                        value={formData.jenis_merk}
                                        onChange={e => setFormData({ ...formData, jenis_merk: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">MODEL KENDARAAN *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2.5 border rounded-lg uppercase text-sm font-bold text-slate-800"
                                        placeholder="CONTOH: CDE BOX"
                                        value={formData.jenis_model}
                                        onChange={e => setFormData({ ...formData, jenis_model: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block mb-1 text-slate-600 uppercase">HARGA SEWA STANDAR (RP)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full p-2.5 border rounded-lg text-sm font-black text-emerald-800 bg-white"
                                    value={formData.jenis_hargasewa}
                                    onChange={e => setFormData({ ...formData, jenis_hargasewa: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <label className="flex items-center gap-2 cursor-pointer font-black text-slate-800 uppercase">
                                    <input
                                        type="checkbox"
                                        checked={formData.jenis_aktifyn === 'Y'}
                                        onChange={e => setFormData({ ...formData, jenis_aktifyn: e.target.checked ? 'Y' : 'N' })}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    STATUS ARMADA AKTIF (Y / N)
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 border text-slate-600 font-bold rounded-lg uppercase">BATAL</button>
                                <button type="submit" className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg uppercase shadow-md">SIMPAN DATA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JenisKendaraanCarter;