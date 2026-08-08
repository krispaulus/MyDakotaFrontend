import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { X, Receipt } from 'lucide-react';
import Swal from 'sweetalert2';

const DaftarPemasukanPengeluaran = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [catList, setCatList] = useState([]);
    const [loading, setLoading] = useState(false);

    // 🌟 STATE MODAL FORM
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('ADD');
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        item_id: '',
        item_cat_id: '',
        item_name: '',
        item_status: 'L',
        item_own_caid: '',
        item_dep_caid: '',
        item_cash_caid: '',
        item_aktif_yn: 'Y'
    });

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/master-category-item', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCatList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal fetch kategori:", err);
        }
    };

    const fetchItems = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/pemasukan-pengeluaran?limit=500', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data item:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, []);

    const handleAdd = () => {
        setModalMode('ADD');
        setErrors({});
        setFormData({
            item_id: '',
            item_cat_id: '',
            item_name: '',
            item_status: 'L',
            item_own_caid: '',
            item_dep_caid: '',
            item_cash_caid: '',
            item_aktif_yn: 'Y'
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setModalMode('EDIT');
        setErrors({});
        setFormData({
            item_id: item.item_id,
            item_cat_id: String(item.item_cat_id || ''),
            item_name: item.item_name || '',
            item_status: item.item_status || 'L',
            item_own_caid: item.item_own_caid || '',
            item_dep_caid: item.item_dep_caid || '',
            item_cash_caid: item.item_cash_caid || '',
            item_aktif_yn: item.item_aktif_yn || 'Y'
        });
        setIsModalOpen(true);
    };

    // Validasi Inline Form
    const validateForm = () => {
        let newErrors = {};
        if (!formData.item_id.trim()) newErrors.item_id = 'Kode Item wajib diisi!';
        if (!formData.item_name.trim()) newErrors.item_name = 'Nama Item wajib diisi!';
        if (!formData.item_cat_id.trim()) newErrors.item_cat_id = 'Kategori wajib dipilih!';
        if (!formData.item_own_caid.trim()) newErrors.item_own_caid = 'No. Acc Utama wajib diisi!';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            Swal.fire({
                title: 'FORM BELUM LENGKAP!',
                text: 'Harap lengkapi semua field bertanda (*)',
                icon: 'warning',
                confirmButtonColor: '#0284c7',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
            return;
        }

        try {
            if (modalMode === 'ADD') {
                await api.post('/gl/pemasukan-pengeluaran', formData);
                Swal.fire({
                    title: 'BERHASIL!',
                    text: 'Item berhasil ditambahkan.',
                    icon: 'success',
                    didOpen: () => {
                        const container = document.querySelector('.swal2-container');
                        if (container) container.style.zIndex = '9999999';
                    }
                });
            } else {
                await api.put(`/gl/pemasukan-pengeluaran/${formData.item_id}`, formData);
                Swal.fire({
                    title: 'BERHASIL!',
                    text: 'Data item berhasil diperbarui.',
                    icon: 'success',
                    didOpen: () => {
                        const container = document.querySelector('.swal2-container');
                        if (container) container.style.zIndex = '9999999';
                    }
                });
            }

            setIsModalOpen(false);
            fetchItems();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Terjadi kesalahan saat menyimpan.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Item Permanen?',
            text: `Apakah Anda yakin ingin menghapus item ${item.item_name} (${item.item_id})?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal',
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/gl/pemasukan-pengeluaran/${item.item_id}`);
                    Swal.fire({
                        title: 'TERHAPUS!',
                        text: 'Item berhasil dihapus.',
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                    fetchItems();
                } catch (err) {
                    Swal.fire({
                        title: 'GAGAL!',
                        text: err.response?.data?.message || 'Gagal menghapus data.',
                        icon: 'error',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                }
            }
        });
    };

    // Definisi Kolom Tabel
    const columns = [
        { header: 'Kode', accessor: 'item_id', render: (item) => <span className="font-mono font-bold text-sky-600">{item.item_id}</span> },
        { header: 'Kategori', accessor: 'cat_name', render: (item) => <span className="font-bold text-slate-700">{item.cat_name}</span> },
        { header: 'Nama Item', accessor: 'item_name', render: (item) => <span className="font-bold uppercase text-slate-800">{item.item_name}</span> },
        {
            header: 'Status',
            accessor: 'item_status',
            render: (item) => item.item_status === 'A' ? (
                <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold">AKTIVA TETAP</span>
            ) : (
                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold">LAIN-LAIN</span>
            )
        },
        { header: 'No. Acc Utama', accessor: 'item_own_caid', render: (item) => <span className="font-mono font-bold text-slate-900">{item.item_own_caid || '-'}</span> },
        { header: 'No. Acc Dep', accessor: 'item_dep_caid', render: (item) => <span className="font-mono font-slate-600">{item.item_dep_caid || '-'}</span> },
        { header: 'No. Acc Kas', accessor: 'item_cash_caid', render: (item) => <span className="font-mono font-slate-600">{item.item_cash_caid || '-'}</span> },
        {
            header: 'Aktif',
            accessor: 'item_aktif_yn',
            render: (item) => item.item_aktif_yn === 'Y' ? (
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[11px] font-bold">YA</span>
            ) : (
                <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md text-[11px] font-bold">TIDAK</span>
            )
        },
    ];

    // Modal Portal
    const modalElement = isModalOpen ? (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/70"
            style={{
                zIndex: 99999,
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none'
            }}
        >
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transform transition-all ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>

                {/* Header Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <Receipt size={18} className="text-sky-600" />
                        {modalMode === 'ADD' ? 'ADD ITEM INFO' : `EDIT ITEM INFO (${formData.item_id})`}
                    </h3>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Modal */}
                <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Kode Item */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Kode Item <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                disabled={modalMode === 'EDIT'}
                                placeholder="MISAL: ITM001"
                                value={formData.item_id}
                                onChange={e => {
                                    setFormData({ ...formData, item_id: e.target.value.toUpperCase() });
                                    if (errors.item_id) setErrors({ ...errors, item_id: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none uppercase ${errors.item_id ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.item_id && <span className="text-[10px] text-rose-500 font-bold">{errors.item_id}</span>}
                        </div>

                        {/* Nama Item */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Nama Item <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                placeholder="NAMA PEMASUKAN / PENGELUARAN..."
                                value={formData.item_name}
                                onChange={e => {
                                    setFormData({ ...formData, item_name: e.target.value.toUpperCase() });
                                    if (errors.item_name) setErrors({ ...errors, item_name: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none uppercase ${errors.item_name ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.item_name && <span className="text-[10px] text-rose-500 font-bold">{errors.item_name}</span>}
                        </div>

                        {/* Kategori Item */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Kategori Item <span className="text-rose-500">*</span></label>
                            <select
                                value={formData.item_cat_id}
                                onChange={e => {
                                    setFormData({ ...formData, item_cat_id: e.target.value });
                                    if (errors.item_cat_id) setErrors({ ...errors, item_cat_id: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none ${errors.item_cat_id ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            >
                                <option value="">-- Pilih Kategori --</option>
                                {catList.map((c) => (
                                    <option key={c.cat_id} value={c.cat_id}>
                                        {c.cat_name}
                                    </option>
                                ))}
                            </select>
                            {errors.item_cat_id && <span className="text-[10px] text-rose-500 font-bold">{errors.item_cat_id}</span>}
                        </div>

                        {/* Status Item */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Status Jenis Item</label>
                            <select
                                value={formData.item_status}
                                onChange={e => setFormData({ ...formData, item_status: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            >
                                <option value="L">Lain-Lain (Operasional / Rutin)</option>
                                <option value="A">Aktiva Tetap (Aset)</option>
                            </select>
                        </div>

                        {/* No. Acc Utama */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">No. Acc Utama (COA) <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                placeholder="Kode COA Utama..."
                                value={formData.item_own_caid}
                                onChange={e => {
                                    setFormData({ ...formData, item_own_caid: e.target.value });
                                    if (errors.item_own_caid) setErrors({ ...errors, item_own_caid: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none ${errors.item_own_caid ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.item_own_caid && <span className="text-[10px] text-rose-500 font-bold">{errors.item_own_caid}</span>}
                        </div>

                        {/* No. Acc Depresiasi */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">No. Acc Depresiasi (Optional)</label>
                            <input
                                type="text"
                                placeholder="Kode COA Penyusutan..."
                                value={formData.item_dep_caid}
                                onChange={e => setFormData({ ...formData, item_dep_caid: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            />
                        </div>

                        {/* No. Acc Kas */}
                        <div className="space-y-1 md:col-span-2">
                            <label className="font-bold text-slate-600 block">No. Acc Kas / Bank (Optional)</label>
                            <input
                                type="text"
                                placeholder="Kode COA Kas/Bank..."
                                value={formData.item_cash_caid}
                                onChange={e => setFormData({ ...formData, item_cash_caid: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            />
                        </div>

                    </div>

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl text-xs uppercase cursor-pointer"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-xl text-xs uppercase shadow-md cursor-pointer"
                        >
                            {modalMode === 'ADD' ? 'ADD ITEM' : 'SAVE CHANGES'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    ) : null;

    return (
        <>
            <DataTableTemplate
                title="DAFTAR PEMASUKAN DAN PENGELUARAN"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {modalElement && ReactDOM.createPortal(modalElement, document.body)}
        </>
    );
};

export default DaftarPemasukanPengeluaran;