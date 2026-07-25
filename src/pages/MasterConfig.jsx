import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';

const MasterConfigParam = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // State Modal CRUD
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        id: null,
        set_cabid: '1',
        set_varname: '',
        set_description: '',
        set_varvalue: '',
        set_vartype: '1'
    });

    // Fetch data dari backend
    const fetchConfigParams = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/config/params`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.data) {
                setData(res.data.data);
            } else {
                setData(res.data || []);
            }
        } catch (err) {
            console.error("Gagal menarik data konfigurasi:", err);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Memuat Data',
                text: 'Tidak dapat terhubung ke server konfigurasi.',
                confirmButtonColor: '#3085d6',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigParams();
    }, []);

    // Handlers Modal
    const handleAdd = () => {
        setIsEditMode(false);
        setFormData({
            id: null,
            set_cabid: '1',
            set_varname: '',
            set_description: '',
            set_varvalue: '',
            set_vartype: '1'
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            id: item.id,
            set_cabid: item.set_cabid || '1',
            set_varname: item.set_varname || '',
            set_description: item.set_description || '',
            set_varvalue: item.set_varvalue || '',
            set_vartype: item.set_vartype || '1'
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: `Parameter "${item.set_varname}" akan dihapus permanen!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    // Mengirim set_varname sebagai pengganti ID
                    await api.delete(`/config/params/${item.set_varname}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire({
                        icon: 'success',
                        title: 'Terhapus!',
                        text: 'Parameter berhasil dihapus.',
                        timer: 1500,
                        showConfirmButton: false
                    });

                    fetchConfigParams();
                } catch (err) {
                    console.error("Gagal menghapus parameter:", err);
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal Menghapus',
                        text: err.response?.data?.message || 'Terjadi kesalahan saat menghapus data.',
                    });
                }
            }
        });
    };

    // Submit Create / Update
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            let response;
            if (isEditMode) {
                response = await api.put(`/config/params`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                response = await api.post(`/config/params`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setIsModalOpen(false);

            // Pop-up Sukses
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: response.data?.message || (isEditMode ? 'Parameter berhasil diperbarui.' : 'Parameter baru berhasil ditambahkan.'),
                timer: 2000,
                showConfirmButton: false
            });

            fetchConfigParams();
        } catch (err) {
            console.error("Gagal menyimpan data:", err);

            // Pop-up Error jika Server melempar error 500 / 400
            const errorMsg = err.response?.data?.message || 'Terjadi kesalahan pada server. Silakan coba lagi.';
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menyimpan',
                text: errorMsg,
                confirmButtonColor: '#3085d6',
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Definisi Kolom Tabel - Pakai !text-black & !text-slate-900
    const columns = [
        {
            header: 'DESKRIPSI',
            accessor: 'set_description',
            render: (item) => (
                <div className="font-bold !text-slate-900 dark:!text-black text-sm">
                    {item.set_description || item.set_varname}
                </div>
            )
        },
        {
            header: 'NAMA VARIABEL',
            accessor: 'set_varname',
            render: (item) => (
                <span className="font-mono text-xs font-bold !bg-slate-200 !text-slate-900 dark:!bg-slate-700 dark:!text-white px-2 py-1 rounded shadow-sm inline-block">
                    {item.set_varname}
                </span>
            )
        },
        {
            header: 'PARAMETER / NILAI',
            accessor: 'set_varvalue',
            render: (item) => (
                <span className="font-bold !text-blue-600 dark:!text-blue-400">
                    {item.set_varvalue || <i className="!text-slate-400 font-normal">(Kosong)</i>}
                </span>
            )
        },
        {
            header: 'TERAKHIR DIUBAH',
            accessor: 'set_updatetime',
            render: (item) => (
                <div className="text-xs !text-slate-800 font-semibold dark:!text-slate-900">
                    <div>{item.set_updateid ? `By: ${item.set_updateid}` : '-'}</div>
                    {item.set_updatetime && (
                        <div>{new Date(item.set_updatetime).toLocaleString('id-ID')}</div>
                    )}
                </div>
            )
        }
    ];

    return (
        <>
            <DataTableTemplate
                title="KONFIGURASI SISTEM"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {/* Modal Form CRUD */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden !bg-white border !border-gray-200 p-8 transition-all">

                        {/* Header Modal Clean & Judul Jelas */}
                        <div className="border-b border-gray-200 pb-4 mb-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black tracking-wider uppercase !text-slate-900">
                                    {isEditMode ? 'EDIT KONFIGURASI PARAMETER' : 'TAMBAH KONFIGURASI PARAMETER'}
                                </h3>
                                <p className="text-xs !text-slate-500 font-medium mt-1">
                                    Atur variabel sistem Dakota Cargo secara terpusat.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="!text-slate-400 hover:!text-slate-700 transition font-bold text-base p-1 rounded-lg hover:bg-gray-100"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Input Nama Variabel */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold !text-slate-800">
                                        Nama Variabel (VarName)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.set_varname}
                                        onChange={(e) => setFormData({ ...formData, set_varname: e.target.value })}
                                        disabled={isEditMode}
                                        placeholder="Contoh: AGEN_ID"
                                        required
                                        className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none font-semibold transition-all ${isEditMode
                                            ? '!bg-gray-100 !text-slate-500 !border-gray-300 cursor-not-allowed'
                                            : '!bg-white !text-slate-900 !border-gray-300 focus:!border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                                            }`}
                                    />
                                </div>

                                {/* Input Tipe Parameter */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold !text-slate-800">
                                        Tipe Parameter
                                    </label>
                                    <select
                                        value={formData.set_vartype}
                                        onChange={(e) => setFormData({ ...formData, set_vartype: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border !border-gray-300 !bg-white !text-slate-900 outline-none focus:!border-blue-600 focus:ring-2 focus:ring-blue-500/20 font-semibold transition-all cursor-pointer"
                                    >
                                        <option value="1">1 - String / Teks</option>
                                        <option value="2">2 - Number / Angka</option>
                                        <option value="3">3 - Boolean / Flag</option>
                                    </select>
                                </div>
                            </div>

                            {/* Input Deskripsi Parameter */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold !text-slate-800">
                                    Deskripsi Parameter
                                </label>
                                <input
                                    type="text"
                                    value={formData.set_description}
                                    onChange={(e) => setFormData({ ...formData, set_description: e.target.value })}
                                    placeholder="Masukkan deskripsi penjelas..."
                                    required
                                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border !border-gray-300 !bg-white !text-slate-900 outline-none focus:!border-blue-600 focus:ring-2 focus:ring-blue-500/20 font-semibold transition-all"
                                />
                            </div>

                            {/* Input Nilai / Parameter */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold !text-slate-800">
                                    Nilai / Parameter (VarValue)
                                </label>
                                <textarea
                                    rows="3"
                                    value={formData.set_varvalue}
                                    onChange={(e) => setFormData({ ...formData, set_varvalue: e.target.value })}
                                    placeholder="Masukkan nilai parameter di sini..."
                                    required
                                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border !border-gray-300 !bg-white !text-slate-900 outline-none focus:!border-blue-600 focus:ring-2 focus:ring-blue-500/20 font-semibold transition-all resize-none"
                                />
                            </div>

                            {/* Action Buttons Clean */}
                            <div className="flex justify-end items-center gap-3 pt-5 border-t border-gray-200 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-xs font-bold !text-slate-700 !bg-gray-100 hover:!bg-gray-200 rounded-xl transition uppercase tracking-wider"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 text-xs font-bold !text-white !bg-blue-600 hover:!bg-blue-700 active:scale-95 rounded-xl shadow-md transition uppercase tracking-wider disabled:opacity-50"
                                >
                                    {submitting ? 'SAVING...' : 'SAVE CHANGE'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default MasterConfigParam;