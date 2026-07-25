import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, RefreshCw, Plus, Edit, Trash2, MapPin, X as XIcon, Truck } from 'lucide-react';
import Swal from 'sweetalert2';

const PerawatanKendaraan = () => {
    // State Data Table & Pagination
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // State Filter Search
    const [filterInput, setFilterInput] = useState({
        nopol: '',
        aktif: ''
    });

    // State Form Input / Edit
    const initialForm = {
        kend_id: '',
        kend_pemilik: '',
        kend_alamat: '',
        kend_merk: '',
        kend_jenis: '',
        kend_berlakustnk: '',
        kend_aktifyn: 'Y',
        kend_gps_imei: ''
    };
    const [formData, setFormData] = useState(initialForm);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editId, setEditId] = useState('');

    useEffect(() => {
        fetchData();
    }, [page]);

    // 1. FETCH DATA LIST KENDARAAN
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {
                page,
                limit,
                nopol: filterInput.nopol,
                aktif: filterInput.aktif
            };

            const res = await api.get('/master/perawatan-kendaraan/list', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setData(res.data.data || []);
            setTotalRecords(res.data.total_records || 0);
        } catch (err) {
            console.error("Gagal load data kendaraan:", err);
            Swal.fire('Error', 'Gagal memuat data kendaraan', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 2. SUBMIT TAMBAH KENDARAAN
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!formData.kend_id) {
            Swal.fire('Warning', 'No. Polisi / Plat Nomor wajib diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/master/perawatan-kendaraan/add', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', 'Data kendaraan berhasil ditambahkan', 'success');
            setIsAddModalOpen(false);
            setFormData(initialForm);
            fetchData();
        } catch (err) {
            const msg = err.response?.data?.message || 'Gagal menambah data';
            Swal.fire('Error', msg, 'error');
        }
    };

    // 3. OPEN EDIT MODAL
    const handleOpenEdit = (item) => {
        setEditId(item.kend_id);
        setFormData({
            kend_id: item.kend_id || '',
            kend_pemilik: item.kend_pemilik || '',
            kend_alamat: item.kend_alamat || '',
            kend_merk: item.kend_merk || '',
            kend_jenis: item.kend_jenis || '',
            kend_berlakustnk: item.kend_berlakustnk ? item.kend_berlakustnk.split('T')[0] : '',
            kend_aktifyn: item.kend_aktifyn || 'Y',
            kend_gps_imei: item.kend_gps_imei || ''
        });
        setIsEditModalOpen(true);
    };

    // 4. SUBMIT EDIT KENDARAAN
    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put(`/master/perawatan-kendaraan/update/${editId}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', 'Data kendaraan berhasil diperbarui', 'success');
            setIsEditModalOpen(false);
            setFormData(initialForm);
            fetchData();
        } catch (err) {
            Swal.fire('Error', 'Gagal memperbarui data kendaraan', 'error');
        }
    };

    // 5. DELETE KENDARAAN
    const handleDelete = (id) => {
        Swal.fire({
            title: 'Apakah Anda Yakin?',
            text: `Menghapus kendaraan No. Polisi ${id}?`,
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
                    await api.delete(`/master/perawatan-kendaraan/delete/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Terhapus!', 'Data kendaraan berhasil dihapus.', 'success');
                    fetchData();
                } catch (err) {
                    Swal.fire('Error', 'Gagal menghapus data', 'error');
                }
            }
        });
    };

    // Cek GPS Tracking Action
    const handleCekGPS = (imei, nopol) => {
        if (!imei) {
            Swal.fire('Informasi', `Kendaraan ${nopol} belum terpasang modul GPS IMEI`, 'info');
            return;
        }
        Swal.fire('GPS Tracker', `Membuka pelacakan GPS untuk IMEI: ${imei} (${nopol})`, 'success');
    };

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return (
        <div className="min-h-screen p-4 space-y-6 bg-slate-50 text-slate-800">

            {/* HEADER TITLE */}
            <div className="flex justify-between items-center border-b pb-3 border-slate-200">
                <div>
                    <h1 className="text-xl font-bold tracking-wide uppercase text-slate-800 flex items-center gap-2">
                        <Truck className="text-blue-600" size={24} /> DAFTAR KENDARAAN OPERASIONAL
                    </h1>
                    <p className="text-xs text-slate-500">
                        Master pengelolaan unit armada truk kargo, status STNK, dan integrasi GPS Tracker
                    </p>
                </div>
                <button
                    onClick={() => { setFormData(initialForm); setIsAddModalOpen(true); }}
                    className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
                >
                    <Plus size={16} /> TAMBAH KENDARAAN
                </button>
            </div>

            {/* 🔍 AREA FILTER & PENCARIAN */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Search size={14} /> FILTER & PENCARIAN ARMADA
                </h3>

                <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                        <label className="font-semibold text-slate-600 block mb-1">No. Kendaraan / Plat Nomor</label>
                        <input
                            type="text"
                            placeholder="MASUKKAN NO POLISI (CONTOH: B 9123 UCT)..."
                            className="w-full p-2.5 border border-slate-300 rounded uppercase bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                            value={filterInput.nopol}
                            onChange={(e) => setFilterInput({ ...filterInput, nopol: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="font-semibold text-slate-600 block mb-1">Status Keaktifan</label>
                        <select
                            className="w-full p-2.5 border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                            value={filterInput.aktif}
                            onChange={(e) => setFilterInput({ ...filterInput, aktif: e.target.value })}
                        >
                            <option value="">-- SEMUA STATUS --</option>
                            <option value="Y">AKTIF (YA)</option>
                            <option value="N">TIDAK AKTIF</option>
                        </select>
                    </div>

                    <div className="flex items-end gap-2">
                        <button
                            type="button"
                            onClick={() => { setPage(1); fetchData(); }}
                            className="px-4 py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                        >
                            <Search size={14} /> REFRESH
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setFilterInput({ nopol: '', aktif: '' });
                                setPage(1);
                                fetchData();
                            }}
                            className="px-4 py-2.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1"
                        >
                            <RefreshCw size={14} /> RESET
                        </button>
                    </div>
                </div>
            </div>

            {/* 📊 TABEL DAFTAR KENDARAAN */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-blue-600 text-white font-bold uppercase tracking-wider text-[11px]">
                                <th className="p-2.5 border-r border-white">No. Polisi</th>
                                <th className="p-2.5 border-r border-white">Pemilik</th>
                                <th className="p-2.5 border-r border-white">Alamat STNK</th>
                                <th className="p-2.5 border-r border-white">Merk / Tipe</th>
                                <th className="p-2.5 border-r border-white">Jenis / Model</th>
                                <th className="p-2.5 border-r border-white text-center">Tgl. Berlaku STNK</th>
                                <th className="p-2.5 border-r border-white text-center">Status GPS</th>
                                <th className="p-2.5 border-r border-white text-center">Aktif</th>
                                <th className="p-2.5 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="text-center p-8 text-gray-400 font-bold">Memuat data kendaraan...</td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan={9} className="text-center p-8 text-gray-400 font-bold">Tidak ada data kendaraan ditemukan</td></tr>
                            ) : (
                                data.map((row) => (
                                    <tr key={row.kend_id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                                        <td className="p-2.5 border-r border-slate-200 font-black text-blue-700 uppercase">{row.kend_id}</td>
                                        <td className="p-2.5 border-r border-slate-200 font-bold text-slate-800">{row.kend_pemilik || '-'}</td>
                                        <td className="p-2.5 border-r border-slate-200 text-slate-600">{row.kend_alamat || '-'}</td>
                                        <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-700">{row.kend_merk || '-'}</td>
                                        <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-700">{row.kend_jenis || '-'}</td>
                                        <td className="p-2.5 border-r border-slate-200 text-center font-mono font-bold text-slate-700">
                                            {row.kend_berlakustnk ? new Date(row.kend_berlakustnk).toLocaleDateString('id-ID') : '-'}
                                        </td>
                                        <td className="p-2.5 border-r border-slate-200 text-center">
                                            {row.kend_gps_imei ? (
                                                <button
                                                    onClick={() => handleCekGPS(row.kend_gps_imei, row.kend_id)}
                                                    className="px-2.5 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1 border border-emerald-300"
                                                >
                                                    <MapPin size={11} /> CEK POSISI GPS
                                                </button>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold text-[10px]">TIDAK AKTIF</span>
                                            )}
                                        </td>
                                        <td className="p-2.5 border-r border-slate-200 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.kend_aktifyn === 'Y' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                                {row.kend_aktifyn === 'Y' ? 'Ya' : 'Tidak'}
                                            </span>
                                        </td>
                                        <td className="p-2.5 text-center">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => handleOpenEdit(row)} className="p-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white"><Edit size={13} /></button>
                                                <button onClick={() => handleDelete(row.kend_id)} className="p-1.5 rounded bg-red-600 hover:bg-red-700 text-white"><Trash2 size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION FOOTER */}
                <div className="flex justify-between items-center mt-4 text-xs font-semibold">
                    <span className="text-slate-500">Total: {totalRecords} Armada (Halaman {page} dari {totalPages})</span>
                    <div className="flex gap-1">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
                        >
                            &laquo; Prev
                        </button>
                        <span className="px-3 py-1 bg-blue-600 text-white rounded font-bold">{page}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
                        >
                            Next &raquo;
                        </button>
                    </div>
                </div>
            </div>

            {/* 📝 MODAL FORM TAMBAH / EDIT KENDARAAN */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-2xl p-6 rounded-xl bg-white shadow-2xl text-slate-800 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                            <h3 className="font-bold text-slate-800 text-sm uppercase">
                                {isAddModalOpen ? "TAMBAH KENDARAAN BARU" : `EDIT KENDARAAN (${editId})`}
                            </h3>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-slate-400 hover:text-slate-600">
                                <XIcon size={20} />
                            </button>
                        </div>

                        <form onSubmit={isAddModalOpen ? handleCreate : handleUpdate} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">No. Polisi / Plat Nomor *</label>
                                    <input
                                        type="text"
                                        disabled={isEditModalOpen}
                                        placeholder="CONTOH: B 9123 UCT"
                                        className="w-full p-2.5 border border-slate-300 rounded font-bold uppercase bg-white text-slate-800 disabled:bg-slate-100 focus:outline-none focus:border-blue-500"
                                        value={formData.kend_id}
                                        onChange={(e) => setFormData({ ...formData, kend_id: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Nama Pemilik STNK</label>
                                    <input
                                        type="text"
                                        placeholder="NAMA PERUSAHAAN / PERORANGAN"
                                        className="w-full p-2.5 border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                                        value={formData.kend_pemilik}
                                        onChange={(e) => setFormData({ ...formData, kend_pemilik: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">Alamat STNK</label>
                                <textarea
                                    rows={2}
                                    placeholder="ALAMAT LENGKAP PADA STNK..."
                                    className="w-full p-2.5 border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                                    value={formData.kend_alamat}
                                    onChange={(e) => setFormData({ ...formData, kend_alamat: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Merk / Tipe Truk</label>
                                    <input
                                        type="text"
                                        placeholder="ISUZU, HINO, MITSUBISHI..."
                                        className="w-full p-2.5 border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                                        value={formData.kend_merk}
                                        onChange={(e) => setFormData({ ...formData, kend_merk: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Jenis / Model Box</label>
                                    <input
                                        type="text"
                                        placeholder="BOX ENGKEL, DOUBLE, TRONTON..."
                                        className="w-full p-2.5 border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                                        value={formData.kend_jenis}
                                        onChange={(e) => setFormData({ ...formData, kend_jenis: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-3">
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Tgl. Berlaku STNK</label>
                                    <input
                                        type="date"
                                        className="w-full p-2.5 border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                                        value={formData.kend_berlakustnk}
                                        onChange={(e) => setFormData({ ...formData, kend_berlakustnk: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">No. IMEI GPS Tracker</label>
                                    <input
                                        type="text"
                                        placeholder="MASUKKAN IMEI ALAT GPS..."
                                        className="w-full p-2.5 border border-slate-300 rounded font-mono bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                                        value={formData.kend_gps_imei}
                                        onChange={(e) => setFormData({ ...formData, kend_gps_imei: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Status Keaktifan</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded font-bold bg-white text-slate-800 focus:outline-none"
                                        value={formData.kend_aktifyn}
                                        onChange={(e) => setFormData({ ...formData, kend_aktifyn: e.target.value })}
                                    >
                                        <option value="Y">AKTIF (YA)</option>
                                        <option value="N">TIDAK AKTIF</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                                <button
                                    type="button"
                                    onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                                    className="px-4 py-2 rounded border border-slate-300 bg-white text-slate-700 font-bold"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                >
                                    {isAddModalOpen ? "Simpan Kendaraan" : "Simpan Perubahan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerawatanKendaraan;