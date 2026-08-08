import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { X, Building2 } from 'lucide-react';
import Swal from 'sweetalert2';

const DaftarBank = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [kotaList, setKotaList] = useState([]);
    const [loading, setLoading] = useState(false);

    // 🌟 STATE MODAL FORM & ERRORS VALIDASI
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('ADD');
    const [errors, setErrors] = useState({}); // State untuk menampung pesan error inline
    const [formData, setFormData] = useState({
        bank_id: '',
        bank_name: '',
        bank_acc_code: '',
        bank_kota_id: '',
        bank_address: '',
        bank_phone: '',
        bank_fax: '',
        bank_aktif_yn: 'Y'
    });

    const fetchMasterKota = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const res = await api.get('/gl/master-kota', { headers });
            setKotaList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load master kota:", err);
        }
    };

    const fetchBankData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const resBank = await api.get('/gl/daftar-bank?limit=500', { headers });
            setData(resBank.data?.data || resBank.data || []);
        } catch (err) {
            console.error("Gagal tarik data bank:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBankData();
        fetchMasterKota();
    }, []);

    const handleAdd = () => {
        setModalMode('ADD');
        setErrors({});
        setFormData({
            bank_id: '',
            bank_name: '',
            bank_acc_code: '',
            bank_kota_id: '',
            bank_address: '',
            bank_phone: '',
            bank_fax: '',
            bank_aktif_yn: 'Y'
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setModalMode('EDIT');
        setErrors({});
        setFormData({
            bank_id: item.bank_id,
            bank_name: item.bank_name || '',
            bank_acc_code: item.bank_acc_code || '',
            bank_kota_id: String(item.bank_kota_id || item.bank_kotaid || ''),
            bank_address: item.bank_address || '',
            bank_phone: item.bank_phone || '',
            bank_fax: item.bank_fax || '',
            bank_aktif_yn: item.bank_aktif_yn || 'Y'
        });
        setIsModalOpen(true);
    };

    // 🎯 VALIDASI FORM (INLINE & POPUP Z-INDEX FIX)
    const validateForm = () => {
        let newErrors = {};
        if (!formData.bank_id.trim()) newErrors.bank_id = 'Kode Bank wajib diisi!';
        if (!formData.bank_name.trim()) newErrors.bank_name = 'Nama Bank wajib diisi!';
        if (!formData.bank_acc_code.trim()) newErrors.bank_acc_code = 'No. Rekening wajib diisi!';
        if (!formData.bank_kota_id.trim()) newErrors.bank_kota_id = 'Kota wajib dipilih!';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            // Tampilkan SweetAlert DENGAN Z-INDEX DI ATAS MODAL
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
                await api.post('/gl/bank', formData);
                Swal.fire({
                    title: 'BERHASIL!',
                    text: 'Bank baru berhasil disimpan.',
                    icon: 'success',
                    didOpen: () => {
                        const container = document.querySelector('.swal2-container');
                        if (container) container.style.zIndex = '9999999';
                    }
                });
            } else {
                await api.put(`/gl/bank/${formData.bank_id}`, formData);
                Swal.fire({
                    title: 'BERHASIL!',
                    text: 'Data bank berhasil diperbarui.',
                    icon: 'success',
                    didOpen: () => {
                        const container = document.querySelector('.swal2-container');
                        if (container) container.style.zIndex = '9999999';
                    }
                });
            }

            setIsModalOpen(false);
            fetchBankData();
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
            title: 'Hapus Bank Permanen?',
            text: `Apakah Anda yakin ingin menghapus bank ${item.bank_name} (${item.bank_id})?`,
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
                    await api.delete(`/gl/bank/${item.bank_id}`);
                    Swal.fire({
                        title: 'TERHAPUS!',
                        text: 'Data bank berhasil dihapus.',
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                    fetchBankData();
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
        { header: 'Kode Bank', accessor: 'bank_id', render: (item) => <span className="font-mono font-bold text-sky-600">{item.bank_id}</span> },
        { header: 'Nama Bank', accessor: 'bank_name', render: (item) => <span className="font-bold uppercase text-slate-800">{item.bank_name}</span> },
        { header: 'Alamat', accessor: 'bank_address', render: (item) => item.bank_address || '-' },
        { header: 'Kota', accessor: 'kota_nama', render: (item) => item.kota_nama || item.bank_kota_id || '-' },
        { header: 'Telepon / Fax', accessor: 'bank_phone', render: (item) => `${item.bank_phone || '-'} / ${item.bank_fax || '-'}` },
        { header: 'No. Rekening', accessor: 'bank_acc_code', render: (item) => <span className="font-mono font-bold text-slate-900">{item.bank_acc_code || '-'}</span> },
        {
            header: 'Status',
            accessor: 'bank_aktif_yn',
            render: (item) => item.bank_aktif_yn === 'Y' ? (
                <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold">AKTIF</span>
            ) : (
                <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full text-xs font-bold">NON-AKTIF</span>
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
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transform transition-all ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>

                {/* Header Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <Building2 size={18} className="text-sky-600" />
                        {modalMode === 'ADD' ? 'ADD BANK INFO' : `EDIT BANK INFO (${formData.bank_id})`}
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

                        {/* Kode Bank */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Kode Bank <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                disabled={modalMode === 'EDIT'}
                                placeholder="MASUKKAN KODE BANK..."
                                value={formData.bank_id}
                                onChange={e => {
                                    setFormData({ ...formData, bank_id: e.target.value.toUpperCase() });
                                    if (errors.bank_id) setErrors({ ...errors, bank_id: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none uppercase ${errors.bank_id ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.bank_id && <span className="text-[10px] text-rose-500 font-bold">{errors.bank_id}</span>}
                        </div>

                        {/* Nama Bank */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Nama Bank <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                placeholder="MASUKKAN NAMA BANK..."
                                value={formData.bank_name}
                                onChange={e => {
                                    setFormData({ ...formData, bank_name: e.target.value.toUpperCase() });
                                    if (errors.bank_name) setErrors({ ...errors, bank_name: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none uppercase ${errors.bank_name ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.bank_name && <span className="text-[10px] text-rose-500 font-bold">{errors.bank_name}</span>}
                        </div>

                        {/* No Rekening */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">No. Rekening / Acc Code <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                placeholder="123456789"
                                value={formData.bank_acc_code}
                                onChange={e => {
                                    setFormData({ ...formData, bank_acc_code: e.target.value });
                                    if (errors.bank_acc_code) setErrors({ ...errors, bank_acc_code: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none ${errors.bank_acc_code ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.bank_acc_code && <span className="text-[10px] text-rose-500 font-bold">{errors.bank_acc_code}</span>}
                        </div>

                        {/* Kota */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Kota ({kotaList.length} Tersedia) <span className="text-rose-500">*</span></label>
                            <select
                                value={formData.bank_kota_id}
                                onChange={e => {
                                    setFormData({ ...formData, bank_kota_id: e.target.value });
                                    if (errors.bank_kota_id) setErrors({ ...errors, bank_kota_id: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none ${errors.bank_kota_id ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            >
                                <option value="">Select Option</option>
                                {kotaList.map((k) => (
                                    <option key={k.kota_id} value={k.kota_id}>
                                        {k.kota_nama} ({k.kota_id})
                                    </option>
                                ))}
                            </select>
                            {errors.bank_kota_id && <span className="text-[10px] text-rose-500 font-bold">{errors.bank_kota_id}</span>}
                        </div>

                        {/* Telepon */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Mobile / Telepon</label>
                            <input
                                type="text"
                                placeholder="021-xxxxxx"
                                value={formData.bank_phone}
                                onChange={e => setFormData({ ...formData, bank_phone: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            />
                        </div>

                        {/* Fax */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Fax</label>
                            <input
                                type="text"
                                placeholder="021-xxxxxx"
                                value={formData.bank_fax}
                                onChange={e => setFormData({ ...formData, bank_fax: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            />
                        </div>

                        {/* Alamat */}
                        <div className="md:col-span-2 space-y-1">
                            <label className="font-bold text-slate-600 block">Alamat Cabang Bank</label>
                            <textarea
                                rows={2}
                                placeholder="Alamat lengkap cabang bank..."
                                value={formData.bank_address}
                                onChange={e => setFormData({ ...formData, bank_address: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500 resize-none"
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
                            {modalMode === 'ADD' ? 'ADD BANK' : 'SAVE CHANGES'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    ) : null;

    return (
        <>
            <DataTableTemplate
                title="DAFTAR REKENING BANK"
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

export default DaftarBank;