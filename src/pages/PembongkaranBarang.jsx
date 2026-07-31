import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Truck, Search, X as XIcon, Save, RefreshCw, CheckCircle, Clock, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

const PembongkaranBarang = () => {
    const { isDarkMode } = useDarkMode();
    const [unloadList, setUnloadList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const today = new Date().toISOString().split('T')[0];
    const [filterTgla, setFilterTgla] = useState('2025-01-01');
    const [filterTgle, setFilterTgle] = useState(today);
    const [noUnload, setNoUnload] = useState('');

    const [chkTgl, setChkTgl] = useState(true);
    const [chkNoUnload, setChkNoUnload] = useState(false);

    const [globalSearch, setGlobalSearch] = useState('');

    // --- State Modal (Tambah / Edit) ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Form Data States Lengkap All Parameters
    const defaultForm = {
        unloadh_id: '',
        unloadh_agen_id: '1',
        unloadh_tanggal: new Date().toISOString().slice(0, 16).replace('T', ' '),
        jml_sp: 0,
        unloadh_update_id: localStorage.getItem('username') || 'SUPERADMIN',
        unloadh_approve_yn: 'N'
    };
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchUnloadData();
    }, []);

    // FETCH DATA UNLOADING
    const fetchUnloadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/unload-barang', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    nounload: noUnload,
                    chktgl: chkTgl,
                    chknounload: chkNoUnload
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || [];
            setUnloadList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat Pembongkaran Barang:", err);
            setUnloadList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem saat memuat data', 'error');
        } finally {
            setLoading(false);
        }
    };

    // HANDLER MODAL AKSI (TAMBAH, EDIT, DELETE)
    const handleAdd = () => {
        setIsEditMode(false);
        setFormData({
            ...defaultForm,
            unloadh_update_id: localStorage.getItem('username') || 'SUPERADMIN'
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            unloadh_id: item.unloadh_id || '',
            unloadh_agen_id: item.unloadh_agen_id || '1',
            unloadh_tanggal: item.unloadh_tanggal || today,
            jml_sp: item.jml_sp || 0,
            unloadh_update_id: item.unloadh_update_id || 'SUPERADMIN',
            unloadh_approve_yn: item.unloadh_approve_yn || 'N'
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Batalkan Pembongkaran Barang?',
            text: `Apakah Anda yakin ingin menghapus Manifest Pembongkaran ${item.unloadh_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/unload-barang-delete', {
                        params: { unload_id: item.unloadh_id },
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Terhapus!', 'Manifest Pembongkaran berhasil dihapus.', 'success');
                    fetchUnloadData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus record', 'error');
                }
            }
        });
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.unloadh_id) {
            Swal.fire('Peringatan', 'Nomor Bongkar / Manifest Wajib Diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/operasional/unload-barang-update' : '/operasional/unload-barang-create';
            const method = isEditMode ? api.put : api.post;

            await method(endpoint, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', isEditMode ? `Manifest ${formData.unloadh_id} berhasil diperbarui.` : 'Manifest Pembongkaran Baru berhasil ditambahkan.', 'success');
            setIsModalOpen(false);
            fetchUnloadData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data', 'error');
        }
    };

    const updateField = (key, val) => {
        setFormData(prev => ({ ...prev, [key]: val }));
    };

    // DEFINISI KOLOM TABLE
    const columns = [
        {
            header: 'NO BONGKAR',
            accessor: 'unloadh_id',
            render: (i) => <span className="font-mono font-bold text-indigo-700">{i.unloadh_id}</span>
        },
        {
            header: 'TGL BONGKAR',
            accessor: 'unloadh_tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.unloadh_tanggal}</span>
        },
        {
            header: 'JML SP',
            accessor: 'jml_sp',
            render: (i) => <span className="font-mono font-bold text-slate-800">{i.jml_sp} Surat Pengantar</span>
        },
        {
            header: 'PETUGAS',
            accessor: 'unloadh_update_id',
            render: (i) => <span className="font-semibold uppercase text-slate-700">{i.unloadh_update_id}</span>
        },
        {
            header: 'APPROVE',
            accessor: 'unloadh_approve_yn',
            render: (i) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 w-max ${i.unloadh_approve_yn === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                    {i.unloadh_approve_yn === 'Y' ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {i.unloadh_approve_yn === 'Y' ? 'DISETUJUI' : 'PENDING'}
                </span>
            )
        }
    ];

    // Client-side Search Filter
    const filteredList = unloadList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.unloadh_id && item.unloadh_id.toLowerCase().includes(q)) ||
            (item.unloadh_update_id && item.unloadh_update_id.toLowerCase().includes(q))
        );
    });

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-12 gap-3">

                    {/* FILTER TANGGAL */}
                    <div className="col-span-6">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkTgl"
                                checked={chkTgl}
                                onChange={e => setChkTgl(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="chkTgl" className="text-slate-600 uppercase cursor-pointer">FILTER PERIODE TANGGAL BONGKAR</label>
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

                    {/* FILTER NO BONGKAR */}
                    <div className="col-span-6">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkNoUnload"
                                checked={chkNoUnload}
                                onChange={e => setChkNoUnload(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="chkNoUnload" className="text-slate-600 uppercase cursor-pointer">FILTER NO. BONGKAR</label>
                        </div>
                        <input
                            type="text"
                            disabled={!chkNoUnload}
                            placeholder="Cari No. Bongkar..."
                            className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase ${!chkNoUnload ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                            value={noUnload}
                            onChange={e => setNoUnload(e.target.value)}
                        />
                    </div>
                </div>

                {/* BUTTON REFRESH */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={fetchUnloadData}
                        className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md"
                    >
                        <RefreshCw size={15} /> REFRESH DATA
                    </button>
                </div>
            </div>

            {/* DATATABLE TEMPLATE DENGAN PAGINATION & MODAL ACTION */}
            <DataTableTemplate
                title="MANIFEST PEMBONGKARAN BARANG (UNLOADING OPERASIONAL)"
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

            {/* CUSTOM MODAL EDIT / TAMBAH PEMBONGKARAN FULL ALL PARAMETERS */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-3xl p-6 rounded-2xl shadow-2xl transition-all border flex flex-col min-h-0 ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>

                        {/* Title Header */}
                        <div className="flex justify-between items-center pb-3 border-b dark:border-slate-700">
                            <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wide">
                                <Truck size={18} />
                                {isEditMode ? `EDIT PEMBONGKARAN: ${formData.unloadh_id}` : 'TAMBAH PEMBONGKARAN BARU'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition cursor-pointer">
                                <XIcon size={18} />
                            </button>
                        </div>

                        {/* FORM INPUT BODY - GRID 2 KOLOM SEJAJAR PARAMETER LENGKAP */}
                        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs mt-4">
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NO. BONGKAR / MANIFEST</label>
                                    <input
                                        type="text"
                                        disabled={isEditMode}
                                        className="w-full p-2.5 border rounded-lg font-mono font-bold text-blue-600 outline-none uppercase bg-white disabled:bg-slate-100"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Misal: UNL202510200001"
                                        value={formData.unloadh_id}
                                        onChange={e => updateField('unloadh_id', e.target.value.toUpperCase())}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">TANGGAL BONGKAR</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-mono outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        value={formData.unloadh_tanggal}
                                        onChange={e => updateField('unloadh_tanggal', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">JUMLAH SP (SURAT PENGANTAR)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2.5 border rounded-lg font-mono font-bold outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="0"
                                        value={formData.jml_sp}
                                        onChange={e => updateField('jml_sp', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">PETUGAS OPERASIONAL</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-bold uppercase outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        value={formData.unloadh_update_id}
                                        onChange={e => updateField('unloadh_update_id', e.target.value.toUpperCase())}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="font-black text-slate-500 block mb-1 uppercase">STATUS APPROVAL</label>
                                    <select
                                        className="w-full p-2.5 border rounded-lg font-bold outline-none uppercase cursor-pointer bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        value={formData.unloadh_approve_yn}
                                        onChange={e => updateField('unloadh_approve_yn', e.target.value)}
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
                                    {isEditMode ? 'Simpan Perubahan' : 'Tambah Pembongkaran'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PembongkaranBarang;