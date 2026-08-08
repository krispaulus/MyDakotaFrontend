import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import { useDarkMode } from '../context/DarkModeContext';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { X, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

const DaftarSGU = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [coaList, setCoaList] = useState([]);
    const [loading, setLoading] = useState(false);

    // 🌟 STATE MODAL FORM & ERRORS
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('ADD');
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        sgu_id: '',
        sgu_nama: '',
        sgu_keterangan: '',
        sgu_tanggal: new Date().toISOString().split('T')[0],
        sgu_periode_start: new Date().toISOString().split('T')[0],
        sgu_periode_end: new Date().toISOString().split('T')[0],
        sgu_caid: '',
        sgu_delete_yn: 'N'
    });

    const fetchCOAList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/kode-perkiraan?limit=500', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCoaList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal fetch COA list:", err);
        }
    };

    const fetchSGUData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/daftar-sgu?limit=500', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data SGU:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSGUData();
        fetchCOAList();
    }, []);

    const handleAdd = () => {
        setModalMode('ADD');
        setErrors({});
        const today = new Date().toISOString().split('T')[0];
        setFormData({
            sgu_id: '',
            sgu_nama: '',
            sgu_keterangan: '',
            sgu_tanggal: today,
            sgu_periode_start: today,
            sgu_periode_end: today,
            sgu_caid: '',
            sgu_delete_yn: 'N'
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setModalMode('EDIT');
        setErrors({});
        setFormData({
            sgu_id: item.sgu_id,
            sgu_nama: item.sgu_nama || '',
            sgu_keterangan: item.sgu_keterangan === '-' ? '' : item.sgu_keterangan || '',
            sgu_tanggal: item.sgu_tanggal || new Date().toISOString().split('T')[0],
            sgu_periode_start: item.sgu_periode_start || new Date().toISOString().split('T')[0],
            sgu_periode_end: item.sgu_periode_end || new Date().toISOString().split('T')[0],
            sgu_caid: item.sgu_caid === '-' ? '' : item.sgu_caid || '',
            sgu_delete_yn: item.sgu_delete_yn || 'N'
        });
        setIsModalOpen(true);
    };

    const validateForm = () => {
        let newErrors = {};
        if (!formData.sgu_id.trim()) newErrors.sgu_id = 'Kode SGU wajib diisi!';
        if (!formData.sgu_nama.trim()) newErrors.sgu_nama = 'Nama Leasing wajib diisi!';
        if (!formData.sgu_tanggal.trim()) newErrors.sgu_tanggal = 'Tanggal Kontrak wajib diisi!';

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
                await api.post('/gl/daftar-sgu', formData);
                Swal.fire({
                    title: 'BERHASIL!',
                    text: 'Data SGU berhasil ditambahkan.',
                    icon: 'success',
                    didOpen: () => {
                        const container = document.querySelector('.swal2-container');
                        if (container) container.style.zIndex = '9999999';
                    }
                });
            } else {
                await api.put(`/gl/daftar-sgu/${formData.sgu_id}`, formData);
                Swal.fire({
                    title: 'BERHASIL!',
                    text: 'Data SGU berhasil diperbarui.',
                    icon: 'success',
                    didOpen: () => {
                        const container = document.querySelector('.swal2-container');
                        if (container) container.style.zIndex = '9999999';
                    }
                });
            }

            setIsModalOpen(false);
            fetchSGUData();
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
            title: 'Hapus Data SGU Permanen?',
            text: `Apakah Anda yakin ingin menghapus data SGU ${item.sgu_nama} (${item.sgu_id})?`,
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
                    await api.delete(`/gl/daftar-sgu/${item.sgu_id}`);
                    Swal.fire({
                        title: 'TERHAPUS!',
                        text: 'Data SGU berhasil dihapus.',
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                    fetchSGUData();
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

    // Formatter Tanggal DD/MM/YYYY
    const formatDate = (dateString) => {
        if (!dateString || dateString === '-') return '-';
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateString;
    };

    const columns = [
        { header: 'KODE', accessor: 'sgu_id', render: (item) => <span className="font-mono font-bold text-sky-600">{item.sgu_id}</span> },
        { header: 'NAMA LEASING', accessor: 'sgu_nama', render: (item) => <span className="font-bold uppercase text-slate-800">{item.sgu_nama}</span> },
        { header: 'KETERANGAN', accessor: 'sgu_keterangan', render: (item) => <span className="text-slate-600">{item.sgu_keterangan}</span> },
        { header: 'TGL KONTRAK', accessor: 'sgu_tanggal', render: (item) => <span className="font-mono text-slate-800">{formatDate(item.sgu_tanggal)}</span> },
        { header: 'JML ANGSURAN', accessor: 'jml_angsuran', render: (item) => <span className="font-bold text-slate-900">{item.jml_angsuran}</span> },
        { header: 'TGL MULAI', accessor: 'sgu_periode_start', render: (item) => <span className="font-mono text-slate-600">{formatDate(item.sgu_periode_start)}</span> },
        { header: 'TGL SELESAI', accessor: 'sgu_periode_end', render: (item) => <span className="font-mono text-slate-600">{formatDate(item.sgu_periode_end)}</span> },
        {
            header: 'AKTIF',
            accessor: 'aktif_jadi',
            render: (item) => item.aktif_jadi === 'YA' ? (
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
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transform transition-all ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>

                {/* Header Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <FileText size={18} className="text-sky-600" />
                        {modalMode === 'ADD' ? 'TAMBAH KONTRAK SGU' : `EDIT SGU (${formData.sgu_id})`}
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

                        {/* Kode SGU */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Kode SGU / Kontrak <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                disabled={modalMode === 'EDIT'}
                                placeholder="MISAL: SGU001"
                                value={formData.sgu_id}
                                onChange={e => {
                                    setFormData({ ...formData, sgu_id: e.target.value.toUpperCase() });
                                    if (errors.sgu_id) setErrors({ ...errors, sgu_id: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none uppercase ${errors.sgu_id ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.sgu_id && <span className="text-[10px] text-rose-500 font-bold">{errors.sgu_id}</span>}
                        </div>

                        {/* Nama Leasing */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Nama Leasing <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                placeholder="NAMA PERUSAHAAN LEASING..."
                                value={formData.sgu_nama}
                                onChange={e => {
                                    setFormData({ ...formData, sgu_nama: e.target.value.toUpperCase() });
                                    if (errors.sgu_nama) setErrors({ ...errors, sgu_nama: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none uppercase ${errors.sgu_nama ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.sgu_nama && <span className="text-[10px] text-rose-500 font-bold">{errors.sgu_nama}</span>}
                        </div>

                        {/* Tanggal Kontrak */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Tgl Kontrak <span className="text-rose-500">*</span></label>
                            <input
                                type="date"
                                value={formData.sgu_tanggal}
                                onChange={e => setFormData({ ...formData, sgu_tanggal: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            />
                        </div>

                        {/* COA Perkiraan */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Akun COA Terkait</label>
                            <select
                                value={formData.sgu_caid}
                                onChange={e => setFormData({ ...formData, sgu_caid: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            >
                                <option value="">-- Pilih Akun COA --</option>
                                {coaList.map((c) => (
                                    <option key={c.ca_id} value={c.ca_id}>
                                        {c.ca_name} ({c.ca_id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Tgl Periode Mulai */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Tgl Periode Mulai</label>
                            <input
                                type="date"
                                value={formData.sgu_periode_start}
                                onChange={e => setFormData({ ...formData, sgu_periode_start: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            />
                        </div>

                        {/* Tgl Periode Selesai */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Tgl Periode Selesai</label>
                            <input
                                type="date"
                                value={formData.sgu_periode_end}
                                onChange={e => setFormData({ ...formData, sgu_periode_end: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            />
                        </div>

                        {/* Keterangan */}
                        <div className="md:col-span-2 space-y-1">
                            <label className="font-bold text-slate-600 block">Keterangan Kontrak</label>
                            <textarea
                                rows={2}
                                placeholder="Keterangan perihal kontrak leasing/SGU..."
                                value={formData.sgu_keterangan}
                                onChange={e => setFormData({ ...formData, sgu_keterangan: e.target.value })}
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
                            {modalMode === 'ADD' ? 'SIMPAN SGU' : 'UPDATE SGU'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    ) : null;

    return (
        <>
            <DataTableTemplate
                title="DAFTAR SGU (SEWA GUNA USAHA / LEASING)"
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

export default DaftarSGU;