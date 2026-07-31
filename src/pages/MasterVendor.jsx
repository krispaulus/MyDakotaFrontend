import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Building2, Search, Plus, CheckCircle2, MinusCircle, X, Phone, FileText } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from "../context/DarkModeContext";
import Swal from 'sweetalert2';

const MasterVendor = () => {
    const { isDarkMode } = useDarkMode();
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const [filterNama, setFilterNama] = useState('');
    const [filterAktif, setFilterAktif] = useState('Y');
    const [globalSearch, setGlobalSearch] = useState('');

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const [formData, setFormData] = useState({
        vend_id: '',
        vend_name: '',
        vend_npwp: '',
        vend_telp1: '',
        vend_telp2: '',
        vend_contactperson: '',
        vend_alamat1: '',
        vend_aktifyn: 'Y',
        vend_approveyn: 'N'
    });

    // 1. FETCH DATA VENDOR
    const fetchVendors = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/master/vendor/list', {
                params: {
                    nama: filterNama,
                    aktif: filterAktif
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data;
            setDataList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat vendor:", err);
            setDataList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    // ➕ OPEN MODAL TAMBAH
    const handleOpenAdd = () => {
        setIsEditMode(false);
        setFormData({
            vend_id: '',
            vend_name: '',
            vend_npwp: '',
            vend_telp1: '',
            vend_telp2: '',
            vend_contactperson: '',
            vend_alamat1: '',
            vend_aktifyn: 'Y',
            vend_approveyn: 'N'
        });
        setIsModalOpen(true);
    };

    // 📝 OPEN MODAL EDIT
    const handleOpenEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            vend_id: item.vend_id || '',
            vend_name: item.vend_name || '',
            vend_npwp: item.vend_npwp || '',
            vend_telp1: item.vend_telp1 || '',
            vend_telp2: item.vend_telp2 || '',
            vend_contactperson: item.vend_contactperson || '',
            vend_alamat1: item.vend_alamat1 || '',
            vend_aktifyn: item.vend_aktifyn || 'Y',
            vend_approveyn: item.vend_approveyn || 'N'
        });
        setIsModalOpen(true);
    };

    // 💾 SUBMIT SAVE / UPDATE
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.vend_id.trim() || !formData.vend_name.trim()) {
            return Swal.fire('Peringatan', 'Kode dan Nama Vendor wajib diisi!', 'warning');
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/master/vendor/save', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', `Vendor ${formData.vend_name} berhasil disimpan!`, 'success');
            setIsModalOpen(false);
            fetchVendors();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan vendor', 'error');
        }
    };

    // 🗑️ DELETE VENDOR
    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Vendor?',
            text: `Apakah Anda yakin ingin menghapus vendor ${item.vend_name} (${item.vend_id})?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/master/vendor/delete/${item.vend_id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Sukses', 'Vendor berhasil dihapus', 'success');
                    fetchVendors();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus vendor', 'error');
                }
            }
        });
    };

    // Filter Client-side Search
    const filteredData = dataList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.vend_id && item.vend_id.toLowerCase().includes(q)) ||
            (item.vend_name && item.vend_name.toLowerCase().includes(q)) ||
            (item.vend_contactperson && item.vend_contactperson.toLowerCase().includes(q))
        );
    });

    // KOLOM TABEL
    const columns = [
        {
            header: 'KODE',
            accessor: 'vend_id',
            render: (item) => (
                <span
                    className="font-bold text-indigo-600 hover:underline cursor-pointer font-mono text-xs"
                    onClick={() => handleOpenEdit(item)}
                >
                    {item.vend_id}
                </span>
            )
        },
        {
            header: 'NAMA VENDOR',
            accessor: 'vend_name',
            render: (item) => <span className="font-bold text-slate-800 text-xs uppercase">{item.vend_name}</span>
        },
        {
            header: 'NPWP',
            accessor: 'vend_npwp',
            render: (item) => <span className="font-mono text-slate-600 text-xs">{item.vend_npwp || '-'}</span>
        },
        {
            header: 'TELEPON',
            accessor: 'vend_telp1',
            render: (item) => <span className="text-slate-600 text-xs">{item.vend_telp1 || '-'}</span>
        },
        {
            header: 'CONTACT PERSON',
            accessor: 'vend_contactperson',
            render: (item) => <span className="text-slate-700 text-xs font-semibold">{item.vend_contactperson || '-'}</span>
        },
        {
            header: 'APPROVE',
            accessor: 'vend_approveyn',
            render: (item) => (
                item.vend_approveyn === 'Y' ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-100 rounded-full">APPROVED</span>
                ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full">PENDING</span>
                )
            )
        },
        {
            header: 'AKTIF',
            accessor: 'vend_aktifyn',
            render: (item) => (
                item.vend_aktifyn === 'Y' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full">
                        <CheckCircle2 size={12} /> Ya
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full">
                        <MinusCircle size={12} /> Tidak
                    </span>
                )
            )
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <Building2 size={20} className="text-indigo-600" /> Master Vendor
                </h3>
            </div>

            {/* FILTER PANEL */}
            <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 grid grid-cols-12 gap-4 items-end text-xs font-bold text-slate-600">
                <div className="col-span-4">
                    <label className="block mb-1 text-slate-500 uppercase">STATUS AKTIF</label>
                    <select
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium bg-white outline-none cursor-pointer"
                        value={filterAktif}
                        onChange={e => setFilterAktif(e.target.value)}
                    >
                        <option value="Y">AKTIF (YA)</option>
                        <option value="N">TIDAK AKTIF</option>
                        <option value="">SEMUA STATUS</option>
                    </select>
                </div>

                <div className="col-span-5">
                    <label className="block mb-1 text-slate-500 uppercase">NAMA VENDOR</label>
                    <input
                        type="text"
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 bg-white outline-none uppercase"
                        placeholder="Ketik nama vendor..."
                        value={filterNama}
                        onChange={e => setFilterNama(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchVendors()}
                    />
                </div>

                <div className="col-span-3">
                    <button
                        onClick={fetchVendors}
                        className="w-full h-[42px] bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition uppercase cursor-pointer"
                    >
                        <Search size={14} /> REFRESH / CARI
                    </button>
                </div>
            </div>

            {/* TABEL TEMPLATE */}
            <DataTableTemplate
                title="DAFTAR VENDOR"
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

            {/* MODAL INPUT / EDIT VENDOR */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden my-8">
                        <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
                            <h4 className="font-bold text-sm uppercase">
                                {isEditMode ? `EDIT VENDOR: ${formData.vend_id}` : 'TAMBAH VENDOR BARU'}
                            </h4>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-slate-300"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">KODE VENDOR *</label>
                                    <input
                                        type="text"
                                        required
                                        readOnly={isEditMode}
                                        className={`w-full p-2.5 border rounded-lg uppercase text-sm font-black font-mono ${isEditMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-amber-50 text-indigo-900 focus:border-indigo-500'}`}
                                        placeholder="KODE VENDOR..."
                                        value={formData.vend_id}
                                        onChange={e => setFormData({ ...formData, vend_id: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">NAMA VENDOR *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2.5 border rounded-lg uppercase text-sm font-bold text-slate-800"
                                        placeholder="NAMA VENDOR..."
                                        value={formData.vend_name}
                                        onChange={e => setFormData({ ...formData, vend_name: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">NPWP</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg text-sm font-mono"
                                        placeholder="NOMOR NPWP..."
                                        value={formData.vend_npwp}
                                        onChange={e => setFormData({ ...formData, vend_npwp: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">CONTACT PERSON</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg text-sm uppercase"
                                        placeholder="NAMA CP..."
                                        value={formData.vend_contactperson}
                                        onChange={e => setFormData({ ...formData, vend_contactperson: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">TELEPON 1</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg text-sm font-mono"
                                        placeholder="NO TELP..."
                                        value={formData.vend_telp1}
                                        onChange={e => setFormData({ ...formData, vend_telp1: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">TELEPON 2</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg text-sm font-mono"
                                        placeholder="NO TELP 2..."
                                        value={formData.vend_telp2}
                                        onChange={e => setFormData({ ...formData, vend_telp2: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block mb-1 text-slate-600 uppercase">ALAMAT VENDOR</label>
                                <textarea
                                    rows="2"
                                    className="w-full p-2.5 border rounded-lg text-sm uppercase resize-none"
                                    placeholder="ALAMAT LENGKAP..."
                                    value={formData.vend_alamat1}
                                    onChange={e => setFormData({ ...formData, vend_alamat1: e.target.value.toUpperCase() })}
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <label className="flex items-center gap-2 cursor-pointer font-black text-slate-800 uppercase">
                                    <input
                                        type="checkbox"
                                        checked={formData.vend_aktifyn === 'Y'}
                                        onChange={e => setFormData({ ...formData, vend_aktifyn: e.target.checked ? 'Y' : 'N' })}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    STATUS AKTIF (Y/N)
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer font-black text-slate-800 uppercase">
                                    <input
                                        type="checkbox"
                                        checked={formData.vend_approveyn === 'Y'}
                                        onChange={e => setFormData({ ...formData, vend_approveyn: e.target.checked ? 'Y' : 'N' })}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    APPROVE (Y/N)
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t mt-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 border text-slate-600 font-bold rounded-lg uppercase">BATAL</button>
                                <button type="submit" className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg uppercase shadow-md">SIMPAN VENDOR</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterVendor;