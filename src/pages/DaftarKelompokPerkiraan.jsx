import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { X, Layers } from 'lucide-react';
import Swal from 'sweetalert2';

const DaftarKelompokPerkiraan = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // 🌟 STATE MODAL FORM & ERRORS
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('ADD');
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        k_id: '',
        k_name: '',
        k_aktif_yn: 'Y'
    });

    const fetchKelompokData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/kelompok-perkiraan?limit=500', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data kelompok perkiraan:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKelompokData();
    }, []);

    const handleAdd = () => {
        setModalMode('ADD');
        setErrors({});
        setFormData({
            k_id: '',
            k_name: '',
            k_aktif_yn: 'Y'
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setModalMode('EDIT');
        setErrors({});
        setFormData({
            k_id: item.k_id,
            k_name: item.k_name || '',
            k_aktif_yn: item.k_aktif_yn || 'Y'
        });
        setIsModalOpen(true);
    };

    const validateForm = () => {
        let newErrors = {};
        if (!formData.k_id.trim()) newErrors.k_id = 'Kode Kelompok wajib diisi!';
        if (!formData.k_name.trim()) newErrors.k_name = 'Nama Kelompok wajib diisi!';

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
                await api.post('/gl/kelompok-perkiraan', formData);
                Swal.fire({
                    title: 'BERHASIL!',
                    text: 'Kelompok Perkiraan berhasil ditambahkan.',
                    icon: 'success',
                    didOpen: () => {
                        const container = document.querySelector('.swal2-container');
                        if (container) container.style.zIndex = '9999999';
                    }
                });
            } else {
                await api.put(`/gl/kelompok-perkiraan/${formData.k_id}`, formData);
                Swal.fire({
                    title: 'BERHASIL!',
                    text: 'Kelompok Perkiraan berhasil diperbarui.',
                    icon: 'success',
                    didOpen: () => {
                        const container = document.querySelector('.swal2-container');
                        if (container) container.style.zIndex = '9999999';
                    }
                });
            }

            setIsModalOpen(false);
            fetchKelompokData();
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
            title: 'Hapus Kelompok Permanen?',
            text: `Apakah Anda yakin ingin menghapus kelompok ${item.k_name} (${item.k_id})?`,
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
                    await api.delete(`/gl/kelompok-perkiraan/${item.k_id}`);
                    Swal.fire({
                        title: 'TERHAPUS!',
                        text: 'Kelompok Perkiraan berhasil dihapus.',
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                    fetchKelompokData();
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

    const columns = [
        { header: 'KODE', accessor: 'k_id', render: (item) => <span className="font-mono font-bold text-sky-600">{item.k_id}</span> },
        { header: 'NAMA KELOMPOK PERKIRAAN', accessor: 'k_name', render: (item) => <span className="font-bold uppercase text-slate-800">{item.k_name}</span> },
        {
            header: 'STATUS AKTIF',
            accessor: 'k_aktif_yn',
            render: (item) => item.k_aktif_yn === 'Y' ? (
                <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold">YA</span>
            ) : (
                <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full text-xs font-bold">TIDAK</span>
            )
        },
    ];

    const modalElement = isModalOpen ? (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/70"
            style={{
                zIndex: 99999,
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none'
            }}
        >
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>

                {/* Header Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <Layers size={18} className="text-sky-600" />
                        {modalMode === 'ADD' ? 'TAMBAH KELOMPOK PERKIRAAN' : `EDIT KELOMPOK (${formData.k_id})`}
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
                    <div className="grid grid-cols-1 gap-4">

                        {/* Kode Kelompok */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Kode Kelompok <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                disabled={modalMode === 'EDIT'}
                                placeholder="MISAL: KEL01 / K01"
                                value={formData.k_id}
                                onChange={e => {
                                    setFormData({ ...formData, k_id: e.target.value.toUpperCase() });
                                    if (errors.k_id) setErrors({ ...errors, k_id: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none uppercase ${errors.k_id ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.k_id && <span className="text-[10px] text-rose-500 font-bold">{errors.k_id}</span>}
                        </div>

                        {/* Nama Kelompok */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Nama Kelompok Perkiraan <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                placeholder="MISAL: AKTIVA LANCAR / BEBAN OPERASIONAL..."
                                value={formData.k_name}
                                onChange={e => {
                                    setFormData({ ...formData, k_name: e.target.value.toUpperCase() });
                                    if (errors.k_name) setErrors({ ...errors, k_name: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none uppercase ${errors.k_name ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.k_name && <span className="text-[10px] text-rose-500 font-bold">{errors.k_name}</span>}
                        </div>

                        {/* Status Aktif */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Status Aktif</label>
                            <select
                                value={formData.k_aktif_yn}
                                onChange={e => setFormData({ ...formData, k_aktif_yn: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            >
                                <option value="Y">YA (AKTIF)</option>
                                <option value="N">TIDAK (NON-AKTIF)</option>
                            </select>
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
                            {modalMode === 'ADD' ? 'SIMPAN KELOMPOK' : 'UPDATE KELOMPOK'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    ) : null;

    return (
        <>
            <DataTableTemplate
                title="MASTER KELOMPOK PERKIRAAN"
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

export default DaftarKelompokPerkiraan;