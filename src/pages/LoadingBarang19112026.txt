import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { PackageCheck, Search, X as XIcon, Save, Truck, CheckCircle, Clock } from 'lucide-react';
import Swal from 'sweetalert2';

const LoadingBarang = () => {
    const { isDarkMode } = useDarkMode();
    const [loadingList, setLoadingList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Dates
    const today = new Date().toISOString().split('T')[0];

    // Filter States
    const [filterTgla, setFilterTgla] = useState('2025-01-01');
    const [filterTgle, setFilterTgle] = useState(today);
    const [noLoad, setNoLoad] = useState('');
    const [noMobil, setNoMobil] = useState('');

    const [chkTgl, setChkTgl] = useState(true);
    const [chkNoLoad, setChkNoLoad] = useState(false);
    const [chkNoMobil, setChkNoMobil] = useState(false);

    const [globalSearch, setGlobalSearch] = useState('');

    // --- State Modal (Tambah / Edit) ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    const defaultForm = {
        loadh_id: '',
        loadh_tanggal: today,
        loadh_kend_id: '',
        loadh_update_id: '',
        loadh_approve_yn: 'N'
    };
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchLoadingData();
    }, []);

    // FETCH DATA API
    const fetchLoadingData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/loading-barang', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    noload: noLoad,
                    nomobil: noMobil,
                    cktgl: chkTgl,
                    cknoload: chkNoLoad,
                    cknomobil: chkNoMobil
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || [];
            setLoadingList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat data Loading Barang:", err);
            setLoadingList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem saat memuat data', 'error');
        } finally {
            setLoading(false);
        }
    };

    // HANDLER MODAL AKSI (TAMBAH, EDIT, DELETE)
    const handleAdd = () => {
        setEditData(null);
        setFormData(defaultForm);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setEditData(item);
        setFormData({
            loadh_id: item.loadh_id || '',
            loadh_tanggal: item.loadh_tanggal || today,
            loadh_kend_id: item.loadh_kend_id || '',
            loadh_update_id: item.loadh_update_id || '',
            loadh_approve_yn: item.loadh_approve_yn || 'N'
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Batalkan Loading Barang?',
            text: `Apakah Anda yakin ingin membatalkan/menghapus Manifest Loading ${item.loadh_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Batalkan'
        }).then((res) => {
            if (res.isConfirmed) {
                Swal.fire('Terhapus!', 'Manifest Loading berhasil dibatalkan.', 'success');
                fetchLoadingData();
            }
        });
    };

    const handleSubmitForm = (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'Sukses!',
            text: editData ? `Manifest Loading ${formData.loadh_id} berhasil diperbarui.` : 'Manifest Loading Baru berhasil dibuat.',
            icon: 'success',
            confirmButtonText: 'OK'
        });
        setIsModalOpen(false);
        fetchLoadingData();
    };

    const updateField = (key, val) => {
        setFormData(prev => ({ ...prev, [key]: val }));
    };

    // DEFINISI KOLOM TABLE
    const columns = [
        {
            header: 'KODE LOADING',
            accessor: 'loadh_id',
            render: (i) => <span className="font-mono font-bold text-indigo-700">{i.loadh_id}</span>
        },
        {
            header: 'TANGGAL LOADING',
            accessor: 'loadh_tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.loadh_tanggal}</span>
        },
        {
            header: 'NO. MOBIL',
            accessor: 'loadh_kend_id',
            render: (i) => <span className="font-bold uppercase text-slate-800">{i.loadh_kend_id}</span>
        },
        {
            header: 'PETUGAS',
            accessor: 'loadh_update_id',
            render: (i) => <span className="font-semibold uppercase text-slate-700">{i.loadh_update_id}</span>
        },
        {
            header: 'JML BARANG',
            accessor: 'jml_barang',
            render: (i) => <span className="font-mono font-bold text-slate-800">{i.jml_barang} Koli</span>
        },
        {
            header: 'APPROVE',
            accessor: 'loadh_approve_yn',
            render: (i) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 w-max ${i.loadh_approve_yn === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                    {i.loadh_approve_yn === 'Y' ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {i.loadh_approve_yn === 'Y' ? 'DISETUJUI' : 'PENDING'}
                </span>
            )
        }
    ];

    // Client-side Search Filter
    const filteredList = loadingList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.loadh_id && item.loadh_id.toLowerCase().includes(q)) ||
            (item.loadh_kend_id && item.loadh_kend_id.toLowerCase().includes(q)) ||
            (item.loadh_update_id && item.loadh_update_id.toLowerCase().includes(q))
        );
    });

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-12 gap-3">

                    {/* FILTER TANGGAL */}
                    <div className="col-span-4">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkTgl"
                                checked={chkTgl}
                                onChange={e => setChkTgl(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="chkTgl" className="text-slate-600 uppercase cursor-pointer">FILTER PERIODE TANGGAL</label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                disabled={!chkTgl}
                                className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium ${!chkTgl ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                                value={filterTgla}
                                onChange={e => setFilterTgla(e.target.value)}
                            />
                            <input
                                type="date"
                                disabled={!chkTgl}
                                className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium ${!chkTgl ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                                value={filterTgle}
                                onChange={e => setFilterTgle(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* FILTER NO LOADING */}
                    <div className="col-span-4">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkNoLoad"
                                checked={chkNoLoad}
                                onChange={e => setChkNoLoad(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="chkNoLoad" className="text-slate-600 uppercase cursor-pointer">FILTER NO. LOADING</label>
                        </div>
                        <input
                            type="text"
                            disabled={!chkNoLoad}
                            placeholder="Cari No. Loading..."
                            className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase ${!chkNoLoad ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                            value={noLoad}
                            onChange={e => setNoLoad(e.target.value)}
                        />
                    </div>

                    {/* FILTER NO MOBIL */}
                    <div className="col-span-4">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkNoMobil"
                                checked={chkNoMobil}
                                onChange={e => setChkNoMobil(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="chkNoMobil" className="text-slate-600 uppercase cursor-pointer">FILTER NO. MOBIL</label>
                        </div>
                        <input
                            type="text"
                            disabled={!chkNoMobil}
                            placeholder="Cari Plat Mobil..."
                            className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase ${!chkNoMobil ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                            value={noMobil}
                            onChange={e => setNoMobil(e.target.value)}
                        />
                    </div>
                </div>

                {/* BUTTON REFRESH */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={fetchLoadingData}
                        className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md"
                    >
                        <PackageCheck size={15} /> REFRESH DATA
                    </button>
                </div>
            </div>

            {/* DATATABLE TEMPLATE DENGAN PAGINATION & MODAL ACTION */}
            <DataTableTemplate
                title="MANIFEST LOADING BARANG OPERASIONAL"
                columns={columns}
                data={filteredList}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {/* CUSTOM MODAL EDIT / TAMBAH LOADING */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-2xl p-6 rounded-2xl shadow-2xl transition-all border flex flex-col min-h-0 ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>

                        {/* Title Header */}
                        <div className="flex justify-between items-center pb-3 border-b dark:border-slate-700">
                            <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wide">
                                <PackageCheck size={18} />
                                {editData ? `EDIT MANIFEST LOADING: ${formData.loadh_id}` : 'TAMBAH MANIFEST LOADING BARU'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition cursor-pointer">
                                <XIcon size={18} />
                            </button>
                        </div>

                        {/* FORM INPUT BODY */}
                        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs mt-4">
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">KODE LOADING</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-mono font-bold text-blue-600 outline-none uppercase"
                                        style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        value={formData.loadh_id}
                                        onChange={e => updateField('loadh_id', e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NO. MOBIL / ARMADA</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-bold outline-none uppercase"
                                        style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        value={formData.loadh_kend_id}
                                        onChange={e => updateField('loadh_kend_id', e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">TANGGAL LOADING</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-mono outline-none"
                                        style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        value={formData.loadh_tanggal}
                                        onChange={e => updateField('loadh_tanggal', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">PETUGAS OPERASIONAL</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-bold outline-none uppercase"
                                        style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        value={formData.loadh_update_id}
                                        onChange={e => updateField('loadh_update_id', e.target.value)}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="font-black text-slate-500 block mb-1 uppercase">STATUS APPROVAL</label>
                                    <select
                                        className="w-full p-2.5 border rounded-lg font-bold outline-none uppercase cursor-pointer"
                                        style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        value={formData.loadh_approve_yn}
                                        onChange={e => updateField('loadh_approve_yn', e.target.value)}
                                    >
                                        <option value="Y">✅ DISETUJUI (APPROVED)</option>
                                        <option value="N">⏳ PENDING / BELUM APPROVE</option>
                                    </select>
                                </div>

                            </div>

                            {/* FOOTER ACTION STICKY */}
                            <div className="flex justify-end gap-3 pt-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border font-bold hover:bg-slate-100 transition cursor-pointer text-slate-600"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-black shadow-md transition cursor-pointer"
                                >
                                    <Save size={14} />
                                    Simpan Manifest Loading
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoadingBarang;