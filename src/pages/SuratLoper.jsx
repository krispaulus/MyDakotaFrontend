import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, Truck, RefreshCw, X, Save, CheckCircle2, AlertCircle, Plus, Calendar } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';

export default function SuratLoper() {
    const { isDarkMode } = useDarkMode();
    const [loperData, setLoperData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const today = new Date().toISOString().split('T')[0];
    const [filterTgla, setFilterTgla] = useState('2025-01-01');
    const [filterTgle, setFilterTgle] = useState(today);
    const [searchLoperId, setSearchLoperId] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Modal Control
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Form Pembuatan / Pengeditan Manifes Loper
    const defaultForm = {
        loper_eid: '',
        loper_agenid: '1',
        loper_nipsopir: '',
        loper_keraniyn: 'N',
        loper_nipkerani: '',
        loper_nomobil: '',
        loper_aktifyn: 'Y'
    };
    const [formCreate, setFormCreate] = useState(defaultForm);

    // Fetch master list loper
    // FETCH MASTER HISTORY MANIFES LOPER DARI BACKEND
    const fetchLoperList = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/loper-list', {
                params: {
                    loper_id: searchLoperId,
                    tgla: filterTgla,
                    tgle: filterTgle
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || [];
            setLoperData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat list loper:", err);
            setLoperData([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal memuat daftar manifes loper', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLoperList();
    }, []);

    // Open Modal Tambah
    const handleOpenAddModal = () => {
        setIsEditMode(false);
        setFormCreate(defaultForm);
        setIsCreateOpen(true);
    };

    // Open Modal Edit
    const handleOpenEditModal = (item) => {
        setIsEditMode(true);
        setFormCreate({
            loper_eid: item.loper_eid || '',
            loper_agenid: item.loper_agenid || '1',
            loper_nipsopir: item.loper_nipsopir || '',
            loper_keraniyn: item.loper_keraniyn || 'N',
            loper_nipkerani: item.loper_nipkerani || '',
            loper_nomobil: item.loper_nomobil || '',
            loper_aktifyn: item.loper_aktifyn || 'Y'
        });
        setIsCreateOpen(true);
    };

    // Save Loper Form
    const handleSaveLoper = async (e) => {
        e.preventDefault();
        if (!formCreate.loper_eid || !formCreate.loper_nomobil || !formCreate.loper_nipsopir) {
            Swal.fire('Peringatan', 'Nomor Loper, Nomor Mobil, dan NIP Sopir Wajib Diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/operasional/loper-create', formCreate, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Sukses', 'Manifes Loper berhasil disimpan!', 'success');
            setIsCreateOpen(false);
            fetchLoperList();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan manifes loper', 'error');
        }
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Pembatalan Manifes Loper?',
            text: `Apakah Anda yakin ingin membatalkan Loper ${item.loper_eid}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Batalkan'
        }).then((res) => {
            if (res.isConfirmed) {
                Swal.fire('Berhasil', 'Manifes Loper dibatalkan.', 'success');
                fetchLoperList();
            }
        });
    };

    // Definisi Kolom Tabel Data
    const columns = [
        {
            header: 'NO. MANIFES LOPER',
            accessor: 'loper_eid',
            render: (i) => (
                <span className="font-mono font-bold text-indigo-700">
                    📋 {i.loper_eid}
                </span>
            )
        },
        {
            header: 'TANGGAL LOPER',
            accessor: 'loper_tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.loper_tanggal || '-'}</span>
        },
        {
            header: 'NO. MOBIL',
            accessor: 'loper_nomobil',
            render: (i) => <span className="bg-slate-800 text-yellow-400 font-mono font-bold px-2 py-0.5 rounded text-xs">{i.loper_nomobil}</span>
        },
        {
            header: 'SOPIR',
            accessor: 'nama_sopir',
            render: (i) => <span className="font-bold text-slate-800 uppercase">{i.nama_sopir} ({i.loper_nipsopir})</span>
        },
        {
            header: 'KERANI / HELPER',
            accessor: 'nama_kerani',
            render: (i) => <span className="font-semibold text-slate-700 uppercase">{i.loper_keraniyn === 'Y' ? i.nama_kerani : '-'}</span>
        },
        {
            header: 'TOTAL BTT',
            accessor: 'total_btt',
            render: (i) => <span className="font-mono font-bold text-slate-800">{i.total_btt || 0} Resi</span>
        },
        {
            header: 'STATUS',
            accessor: 'loper_aktifyn',
            render: (i) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-black ${i.loper_aktifyn === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                    {i.loper_aktifyn === 'Y' ? '🟢 AKTIF' : '❌ BATAL'}
                </span>
            )
        }
    ];

    // Client-side Search
    const filteredList = loperData.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.loper_eid && item.loper_eid.toLowerCase().includes(q)) ||
            (item.loper_nomobil && item.loper_nomobil.toLowerCase().includes(q)) ||
            (item.nama_sopir && item.nama_sopir.toLowerCase().includes(q))
        );
    });

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                        <label className="block mb-1 text-slate-500 uppercase">PERIODE TANGGAL AWAL</label>
                        <input
                            type="date"
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
                            value={filterTgla}
                            onChange={e => setFilterTgla(e.target.value)}
                        />
                    </div>
                    <div className="col-span-4">
                        <label className="block mb-1 text-slate-500 uppercase">PERIODE TANGGAL AKHIR</label>
                        <input
                            type="date"
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
                            value={filterTgle}
                            onChange={e => setFilterTgle(e.target.value)}
                        />
                    </div>
                    <div className="col-span-4">
                        <label className="block mb-1 text-slate-500 uppercase">CARI NO. MANIFES LOPER</label>
                        <input
                            type="text"
                            placeholder="Cari No Loper..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium uppercase"
                            value={searchLoperId}
                            onChange={e => setSearchLoperId(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={fetchLoperList}
                        className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md"
                    >
                        <RefreshCw size={15} /> REFRESH DATA MANIFES
                    </button>
                </div>
            </div>

            {/* DATATABLE TEMPLATE DENGAN PAGINATION & MODAL DUAL ACTION */}
            <DataTableTemplate
                title="DAFTAR MANIFES LOPER BARANG (OPR_T_eLoper)"
                columns={columns}
                data={filteredList}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={handleOpenAddModal}
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
            />

            {/* CUSTOM MODAL DIALOG MODAL EDIT/TAMBAH LOPER */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-3xl p-6 rounded-2xl shadow-2xl transition-all border flex flex-col min-h-0 ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>

                        <div className="flex justify-between items-center pb-3 border-b dark:border-slate-700">
                            <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wide">
                                <Truck size={18} />
                                {isEditMode ? `EDIT MANIFES LOPER: ${formCreate.loper_eid}` : 'TAMBAH MANIFES LOPER BARU'}
                            </h3>
                            <button onClick={() => setIsCreateOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveLoper} className="space-y-4 text-xs mt-4">
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NO. MANIFES LOPER (EID)</label>
                                    <input
                                        type="text"
                                        disabled={isEditMode}
                                        className="w-full p-2.5 border rounded-lg font-mono font-bold text-blue-600 outline-none uppercase bg-white disabled:bg-slate-100"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Misal: 001/LOPER/2025"
                                        value={formCreate.loper_eid}
                                        onChange={e => setFormCreate({ ...formCreate, loper_eid: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NO. MOBIL / ARMADA</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-mono font-bold uppercase outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Contoh: B 9330 KXU"
                                        value={formCreate.loper_nomobil}
                                        onChange={e => setFormCreate({ ...formCreate, loper_nomobil: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NIP / NAMA SOPIR</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-bold outline-none uppercase bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Masukkan NIP / Nama Sopir..."
                                        value={formCreate.loper_nipsopir}
                                        onChange={e => setFormCreate({ ...formCreate, loper_nipsopir: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">STATUS HELPER / KERANI</label>
                                    <select
                                        className="w-full p-2.5 border rounded-lg font-bold outline-none uppercase cursor-pointer bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        value={formCreate.loper_keraniyn}
                                        onChange={e => setFormCreate({ ...formCreate, loper_keraniyn: e.target.value })}
                                    >
                                        <option value="N">TIDAK ADA HELPER</option>
                                        <option value="Y">ADA HELPER / KERANI</option>
                                    </select>
                                </div>

                                {formCreate.loper_keraniyn === 'Y' && (
                                    <div className="col-span-2">
                                        <label className="font-black text-slate-500 block mb-1 uppercase">NIP / NAMA KERANI</label>
                                        <input
                                            type="text"
                                            className="w-full p-2.5 border rounded-lg font-bold outline-none uppercase bg-white"
                                            style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                            placeholder="Masukkan NIP / Nama Kerani..."
                                            value={formCreate.loper_nipkerani}
                                            onChange={e => setFormCreate({ ...formCreate, loper_nipkerani: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 rounded-lg border font-bold hover:bg-slate-100 transition cursor-pointer text-slate-600"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-black shadow-md transition cursor-pointer"
                                >
                                    <Save size={14} />
                                    {isEditMode ? 'Simpan Perubahan' : 'Tambah Loper'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}