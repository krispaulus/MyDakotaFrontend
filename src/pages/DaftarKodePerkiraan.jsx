import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { X, BookOpen } from 'lucide-react';
import Swal from 'sweetalert2';

const DaftarKodePerkiraan = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [kelompokList, setKelompokList] = useState([]);
    const [loading, setLoading] = useState(false);

    // 🌟 STATE MODAL FORM & ERRORS
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('ADD');
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        ca_id: '',
        ca_name: '',
        ca_up_id: '',
        ca_jenis: 'D',
        ca_type: 'D',
        ca_golongan: 'N',
        ca_kelompok: '',
        ca_aktif_yn: 'Y'
    });

    const fetchKelompokList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/kelompok-perkiraan?limit=500', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setKelompokList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal fetch kelompok list:", err);
        }
    };

    const fetchCOAData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/kode-perkiraan?limit=500', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data COA:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCOAData();
        fetchKelompokList();
    }, []);

    const handleAdd = () => {
        setModalMode('ADD');
        setErrors({});
        setFormData({
            ca_id: '',
            ca_name: '',
            ca_up_id: '',
            ca_jenis: 'D',
            ca_type: 'D',
            ca_golongan: 'N',
            ca_kelompok: '',
            ca_aktif_yn: 'Y'
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setModalMode('EDIT');
        setErrors({});
        setFormData({
            ca_id: item.ca_id,
            ca_name: item.ca_name || '',
            ca_up_id: item.ca_up_id === '-' ? '' : item.ca_up_id || '',
            ca_jenis: item.ca_jenis || 'D',
            ca_type: item.ca_type || 'D',
            ca_golongan: item.ca_golongan || 'N',
            ca_kelompok: item.ca_kelompok === '-' ? '' : item.ca_kelompok || '',
            ca_aktif_yn: item.ca_aktif_yn || 'Y'
        });
        setIsModalOpen(true);
    };

    const validateForm = () => {
        let newErrors = {};
        if (!formData.ca_id.trim()) newErrors.ca_id = 'Kode Akun wajib diisi!';
        if (!formData.ca_name.trim()) newErrors.ca_name = 'Nama Perkiraan wajib diisi!';
        if (!formData.ca_kelompok.trim()) newErrors.ca_kelompok = 'Kelompok Perkiraan wajib dipilih!';

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
                await api.post('/gl/kode-perkiraan', formData);
                Swal.fire({
                    title: 'BERHASIL!',
                    text: 'Kode Perkiraan berhasil ditambahkan.',
                    icon: 'success',
                    didOpen: () => {
                        const container = document.querySelector('.swal2-container');
                        if (container) container.style.zIndex = '9999999';
                    }
                });
            } else {
                await api.put(`/gl/kode-perkiraan/${formData.ca_id}`, formData);
                Swal.fire({
                    title: 'BERHASIL!',
                    text: 'Kode Perkiraan berhasil diperbarui.',
                    icon: 'success',
                    didOpen: () => {
                        const container = document.querySelector('.swal2-container');
                        if (container) container.style.zIndex = '9999999';
                    }
                });
            }

            setIsModalOpen(false);
            fetchCOAData();
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
            title: 'Hapus Kode Akun Permanen?',
            text: `Apakah Anda yakin ingin menghapus akun ${item.ca_name} (${item.ca_id})?`,
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
                    await api.delete(`/gl/kode-perkiraan/${item.ca_id}`);
                    Swal.fire({
                        title: 'TERHAPUS!',
                        text: 'Kode Perkiraan berhasil dihapus.',
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                    fetchCOAData();
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
        { header: 'KODE AKUN', accessor: 'ca_id', render: (item) => <span className="font-mono font-bold text-sky-600">{item.ca_id}</span> },
        { header: 'KETERANGAN / NAMA AKUN', accessor: 'ca_name', render: (item) => <span className="font-bold uppercase text-slate-800">{item.ca_name}</span> },
        { header: 'KODE UP AKUN', accessor: 'ca_up_id', render: (item) => <span className="font-mono text-slate-600">{item.ca_up_id}</span> },
        {
            header: 'JENIS',
            accessor: 'ca_jenis',
            render: (item) => item.ca_jenis === 'H' ? (
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[11px] font-bold">HEADER</span>
            ) : (
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px] font-bold">DETAIL</span>
            )
        },
        {
            header: 'TIPE',
            accessor: 'ca_type',
            render: (item) => item.ca_type === 'D' ? (
                <span className="text-emerald-700 font-bold">DEBET</span>
            ) : (
                <span className="text-rose-700 font-bold">KREDIT</span>
            )
        },
        { header: 'GOLONGAN', accessor: 'golongan_jadi', render: (item) => <span className="font-bold text-slate-700">{item.golongan_jadi}</span> },
        { header: 'KELOMPOK', accessor: 'ca_kelompok', render: (item) => <span className="font-mono text-slate-700">{item.ca_kelompok}</span> },
        {
            header: 'AKTIF',
            accessor: 'ca_aktif_yn',
            render: (item) => item.ca_aktif_yn === 'Y' ? (
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold">YA</span>
            ) : (
                <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-xs font-bold">TIDAK</span>
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
                        <BookOpen size={18} className="text-sky-600" />
                        {modalMode === 'ADD' ? 'TAMBAH KODE PERKIRAAN' : `EDIT AKUN (${formData.ca_id})`}
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

                        {/* Kode Akun */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Kode Akun <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                disabled={modalMode === 'EDIT'}
                                placeholder="MISAL: 1101.001"
                                value={formData.ca_id}
                                onChange={e => {
                                    setFormData({ ...formData, ca_id: e.target.value.toUpperCase() });
                                    if (errors.ca_id) setErrors({ ...errors, ca_id: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none uppercase ${errors.ca_id ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.ca_id && <span className="text-[10px] text-rose-500 font-bold">{errors.ca_id}</span>}
                        </div>

                        {/* Nama Perkiraan */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Nama Perkiraan <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                placeholder="MISAL: KAS KANTOR PUSAT..."
                                value={formData.ca_name}
                                onChange={e => {
                                    setFormData({ ...formData, ca_name: e.target.value.toUpperCase() });
                                    if (errors.ca_name) setErrors({ ...errors, ca_name: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none uppercase ${errors.ca_name ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.ca_name && <span className="text-[10px] text-rose-500 font-bold">{errors.ca_name}</span>}
                        </div>

                        {/* Kode Akun Induk (UP ID) */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Kode Akun Induk (Parent ID)</label>
                            <input
                                type="text"
                                placeholder="Kode Akun Header Diatasnya..."
                                value={formData.ca_up_id}
                                onChange={e => setFormData({ ...formData, ca_up_id: e.target.value.toUpperCase() })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none uppercase focus:border-sky-500"
                            />
                        </div>

                        {/* Kelompok Perkiraan */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Kelompok Perkiraan <span className="text-rose-500">*</span></label>
                            <select
                                value={formData.ca_kelompok}
                                onChange={e => {
                                    setFormData({ ...formData, ca_kelompok: e.target.value });
                                    if (errors.ca_kelompok) setErrors({ ...errors, ca_kelompok: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none ${errors.ca_kelompok ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            >
                                <option value="">-- Pilih Kelompok --</option>
                                {kelompokList.map((k) => (
                                    <option key={k.k_id} value={k.k_id}>
                                        {k.k_name} ({k.k_id})
                                    </option>
                                ))}
                            </select>
                            {errors.ca_kelompok && <span className="text-[10px] text-rose-500 font-bold">{errors.ca_kelompok}</span>}
                        </div>

                        {/* Jenis Akun */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Jenis Akun</label>
                            <select
                                value={formData.ca_jenis}
                                onChange={e => setFormData({ ...formData, ca_jenis: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            >
                                <option value="D">DETAIL (Posting Transaction)</option>
                                <option value="H">HEADER (Induk Perkiraan)</option>
                            </select>
                        </div>

                        {/* Tipe Saldo Normal */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Tipe Saldo Normal</label>
                            <select
                                value={formData.ca_type}
                                onChange={e => setFormData({ ...formData, ca_type: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            >
                                <option value="D">DEBET</option>
                                <option value="K">KREDIT</option>
                            </select>
                        </div>

                        {/* Golongan Laporan */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Golongan Laporan</label>
                            <select
                                value={formData.ca_golongan}
                                onChange={e => setFormData({ ...formData, ca_golongan: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            >
                                <option value="N">NERACA (Aktiva/Kewajiban/Modal)</option>
                                <option value="R">RUGI LABA (Pendapatan/Beban)</option>
                            </select>
                        </div>

                        {/* Status Aktif */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Status Aktif</label>
                            <select
                                value={formData.ca_aktif_yn}
                                onChange={e => setFormData({ ...formData, ca_aktif_yn: e.target.value })}
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
                            {modalMode === 'ADD' ? 'SIMPAN AKUN' : 'UPDATE AKUN'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    ) : null;

    return (
        <>
            <DataTableTemplate
                title="KODE PERKIRAAN (CHART OF ACCOUNTS)"
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

export default DaftarKodePerkiraan;