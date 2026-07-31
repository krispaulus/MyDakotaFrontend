import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { MapPin, Search, Plus, Edit2, Trash2, CheckCircle2, MinusCircle, RefreshCw, X } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from "../context/DarkModeContext";
import Swal from 'sweetalert2';

const TarifHandlingPropinsi = () => {
    const { isDarkMode } = useDarkMode();
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter Search States
    const [filterPropinsi, setFilterPropinsi] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Modal State Form CRUD
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const [formData, setFormData] = useState({
        propinsi: '',
        prosentaseyn: 'N',
        prosentaseval: 0,
        tarifyn: 'N',
        tarifval: 0
    });

    // 1. FETCH DATA LIST TARIF HANDLING PROPINSI
    const fetchTarifHandling = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/master/tarif-handling-propinsi/list', {
                params: { propinsi: filterPropinsi },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data;
            if (Array.isArray(data)) {
                setDataList(data);
            } else {
                setDataList([]);
            }
        } catch (err) {
            console.error("Gagal memuat tarif handling propinsi:", err);
            setDataList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTarifHandling();
    }, []);

    // ➕ OPEN MODAL TAMBAH BARU
    const handleOpenAdd = () => {
        setIsEditMode(false);
        setFormData({
            propinsi: '',
            prosentaseyn: 'N',
            prosentaseval: 0,
            tarifyn: 'N',
            tarifval: 0
        });
        setIsModalOpen(true);
    };

    // 📝 OPEN MODAL EDIT
    const handleOpenEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            propinsi: item.propinsi || '',
            prosentaseyn: item.prosentaseyn || 'N',
            prosentaseval: item.prosentaseval || 0,
            tarifyn: item.tarifyn || 'N',
            tarifval: item.tarifval || 0
        });
        setIsModalOpen(true);
    };

    // 💾 SUBMIT SAVE (SIMPAN / UPDATE)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.propinsi.trim()) {
            return Swal.fire('Peringatan', 'Nama Propinsi wajib diisi!', 'warning');
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/master/tarif-handling-propinsi/save', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', `Data Tarif Handling Propinsi ${formData.propinsi} berhasil disimpan!`, 'success');
            setIsModalOpen(false);
            fetchTarifHandling();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data tarif handling', 'error');
        }
    };

    // 🗑️ DELETE PROPINSI
    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Tarif Handling?',
            text: `Apakah Anda yakin ingin menghapus data tarif handling provinsi ${item.propinsi}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.post('/master/tarif-handling-propinsi/delete', { propinsi: item.propinsi }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Sukses', `Tarif Handling ${item.propinsi} berhasil dihapus`, 'success');
                    fetchTarifHandling();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus tarif handling', 'error');
                }
            }
        });
    };

    // Filter Local Client Search Table
    const filteredData = dataList.filter(item => {
        if (!globalSearch.trim()) return true;
        return item.propinsi && item.propinsi.toLowerCase().includes(globalSearch.toLowerCase());
    });

    // DEFINISI KOLOM TABEL (SESUAI OPR_M_TARIFHANDLINGBYPROPINSI.ASP)
    const columns = [
        {
            header: 'PROPINSI',
            accessor: 'propinsi',
            render: (item) => (
                <span
                    className="font-black text-indigo-700 hover:underline cursor-pointer text-sm block"
                    onClick={() => handleOpenEdit(item)}
                >
                    {item.propinsi}
                </span>
            )
        },
        {
            header: 'PERSENTASE',
            accessor: 'prosentaseyn',
            render: (item) => (
                item.prosentaseyn === 'Y' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-full">
                        <CheckCircle2 size={14} /> Aktif
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-bold">
                        <MinusCircle size={14} /> -
                    </span>
                )
            )
        },
        {
            header: 'NILAI %',
            accessor: 'prosentaseval',
            render: (item) => (
                item.prosentaseyn === 'Y' ? (
                    <span className="font-bold text-slate-800 text-sm">{Number(item.prosentaseval).toFixed(2)} %</span>
                ) : (
                    <span className="text-slate-400">-</span>
                )
            )
        },
        {
            header: 'TARIF NOMINAL',
            accessor: 'tarifyn',
            render: (item) => (
                item.tarifyn === 'Y' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-full">
                        <CheckCircle2 size={14} /> Aktif
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-bold">
                        <MinusCircle size={14} /> -
                    </span>
                )
            )
        },
        {
            header: 'NILAI TARIF (RP)',
            accessor: 'tarifval',
            render: (item) => (
                item.tarifyn === 'Y' ? (
                    <span className="font-bold text-indigo-900 text-sm">Rp {Number(item.tarifval).toLocaleString('id-ID')}</span>
                ) : (
                    <span className="text-slate-400">-</span>
                )
            )
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Menu */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <MapPin size={20} className="text-indigo-600" /> Tarif Handling By Propinsi
                </h3>
            </div>

            {/* FILTER PANEL */}
            <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 grid grid-cols-12 gap-4 items-end text-xs font-bold text-slate-600">
                <div className="col-span-9">
                    <label className="block mb-1 text-slate-500 uppercase">CARI NAMA PROPINSI</label>
                    <input
                        type="text"
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 bg-white outline-none uppercase"
                        placeholder="Contoh: JAWA BARAT..."
                        value={filterPropinsi}
                        onChange={e => setFilterPropinsi(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchTarifHandling()}
                    />
                </div>

                <div className="col-span-3">
                    <button
                        onClick={fetchTarifHandling}
                        className="w-full h-[42px] bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition uppercase cursor-pointer"
                    >
                        <Search size={14} /> CARI / REFRESH
                    </button>
                </div>
            </div>

            {/* TABEL DATA TEMPLATE */}
            <DataTableTemplate
                title="TARIF HANDLING BY PROPINSI"
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
            {/* 🟢 MODAL FORM INPUT/EDIT TARIF HANDLING                       */}
            {/* ============================================================== */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden my-8">
                        <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
                            <h4 className="font-bold text-sm uppercase">
                                {isEditMode ? `EDIT TARIF HANDLING: ${formData.propinsi}` : 'TAMBAH TARIF HANDLING PROPINSI'}
                            </h4>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-slate-300"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block mb-1 text-slate-600 uppercase">NAMA PROPINSI *</label>
                                <input
                                    type="text"
                                    required
                                    readOnly={isEditMode}
                                    className={`w-full p-2.5 border rounded-lg uppercase text-sm font-black ${isEditMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-amber-50 text-indigo-900 focus:border-indigo-500'}`}
                                    placeholder="CONTOH: JAWA TIMUR"
                                    value={formData.propinsi}
                                    onChange={e => setFormData({ ...formData, propinsi: e.target.value.toUpperCase() })}
                                />
                            </div>

                            {/* SKEMA PERSENTASE */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer font-black text-emerald-800 uppercase">
                                    <input
                                        type="checkbox"
                                        checked={formData.prosentaseyn === 'Y'}
                                        onChange={e => setFormData({ ...formData, prosentaseyn: e.target.checked ? 'Y' : 'N' })}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    SKEMA PERSENTASE (%)
                                </label>

                                {formData.prosentaseyn === 'Y' && (
                                    <div className="pt-2 animate-in fade-in">
                                        <label className="block mb-1 text-slate-500">NILAI PERSENTASE (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            className="w-full p-2 border rounded font-bold text-slate-800 bg-white"
                                            value={formData.prosentaseval}
                                            onChange={e => setFormData({ ...formData, prosentaseval: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* SKEMA TARIF NOMINAL */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer font-black text-indigo-800 uppercase">
                                    <input
                                        type="checkbox"
                                        checked={formData.tarifyn === 'Y'}
                                        onChange={e => setFormData({ ...formData, tarifyn: e.target.checked ? 'Y' : 'N' })}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    SKEMA TARIF NOMINAL (RP)
                                </label>

                                {formData.tarifyn === 'Y' && (
                                    <div className="pt-2 animate-in fade-in">
                                        <label className="block mb-1 text-slate-500">NILAI TARIF NOMINAL (RP)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full p-2 border rounded font-bold text-indigo-900 bg-white"
                                            value={formData.tarifval}
                                            onChange={e => setFormData({ ...formData, tarifval: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                )}
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

export default TarifHandlingPropinsi;