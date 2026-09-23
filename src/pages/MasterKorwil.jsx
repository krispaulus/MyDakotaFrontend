import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Map, Search, Save, X as XIcon } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

export default function MasterKorwil() {
    const [korwilList, setKorwilList] = useState([]);
    const [loading, setLoading] = useState(false);

    // State Filter Pencarian
    const [searchNama, setSearchNama] = useState('');
    const [searchKode, setSearchKode] = useState('');

    // State Modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const [formData, setFormData] = useState({ username: '', kode_wilayah: '' });
    const [editFormData, setEditFormData] = useState({ username: '', kode_wilayah: '' });

    const fetchKorwil = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/master/korwil?nama=${searchNama}&kode=${searchKode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setKorwilList(res.data?.data || []);
        } catch (err) {
            Swal.fire('Gagal', 'Gagal memuat data group korwil', 'error');
            setKorwilList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKorwil();
    }, []);

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.post('/master/korwil', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Sukses', 'Data korwil berhasil ditambahkan!', 'success');
            setIsAddModalOpen(false);
            setFormData({ username: '', kode_wilayah: '' });
            fetchKorwil();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal menyimpan data korwil', 'error');
        }
    };

    const handleEditTrigger = (item) => {
        setSelectedItem(item);
        setEditFormData({
            username: item.username || '',
            kode_wilayah: item.kode_wilayah || ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put(`/master/korwil/${selectedItem.id}`, editFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Sukses', 'Data korwil berhasil diperbarui!', 'success');
            setIsEditModalOpen(false);
            fetchKorwil();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal memperbarui data', 'error');
        }
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Korwil?',
            text: `Yakin ingin menghapus ${item.username} (${item.kode_wilayah})?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/master/korwil/${item.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
                    fetchKorwil();
                } catch {
                    Swal.fire('Gagal', 'Gagal menghapus data', 'error');
                }
            }
        });
    };

    const columnsKorwil = [
        {
            header: 'ID',
            accessor: 'id',
            render: (i) => <span className="font-mono font-bold text-slate-800">#{i.id}</span>
        },
        {
            header: 'USERNAME KORWIL',
            accessor: 'username',
            render: (i) => <span className="font-bold text-blue-600">{i.username}</span>
        },
        {
            header: 'KODE WILAYAH',
            accessor: 'kode_wilayah',
            render: (i) => (
                <span className="px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 font-mono font-bold text-xs border border-sky-200">
                    {i.kode_wilayah}
                </span>
            )
        },
        {
            header: 'TERAKHIR DIPERBARUI',
            accessor: 'updated_at',
            render: (i) => (
                <span className="text-xs text-slate-500 font-medium">
                    {i.updated_at ? new Date(i.updated_at).toLocaleString('id-ID') : '-'}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-4">
            {/* Header Title */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                    <Map size={20} className="text-blue-600" /> Master Group Korwil (WEBLOGIN_GROUPKORWIL)
                </h3>
            </div>

            {/* Filter Bar Pencarian */}
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-slate-600">
                <div>
                    <label className="block mb-1">USERNAME</label>
                    <input
                        type="text"
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:border-sky-500"
                        placeholder="Cari username..."
                        value={searchNama}
                        onChange={(e) => setSearchNama(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block mb-1">KODE WILAYAH</label>
                    <input
                        type="text"
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:border-sky-500 uppercase"
                        placeholder="Cari kode wilayah..."
                        value={searchKode}
                        onChange={(e) => setSearchKode(e.target.value)}
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={fetchKorwil}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                        <Search size={15} /> REFRESH DATA
                    </button>
                </div>
            </div>

            {/* Table Template */}
            <DataTableTemplate
                title="DAFTAR GROUP KORWIL"
                columns={columnsKorwil}
                data={korwilList}
                loading={loading}
                isDarkMode={false}
                onAdd={() => {
                    setFormData({ username: '', kode_wilayah: '' });
                    setIsAddModalOpen(true);
                }}
                onEdit={handleEditTrigger}
                onDelete={handleDelete}
            />

            {/* Modal Tambah Data */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl border border-slate-200">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
                            <h3 className="text-sm font-black text-slate-800 uppercase">Tambah Data Korwil</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XIcon size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block mb-1">USERNAME *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:border-sky-500"
                                    placeholder="Contoh: korwil_jabar"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block mb-1">KODE WILAYAH *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs uppercase outline-none focus:border-sky-500"
                                    placeholder="Contoh: JABAR-01"
                                    value={formData.kode_wilayah}
                                    onChange={(e) => setFormData({ ...formData, kode_wilayah: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-50">Batal</button>
                                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
                                    <Save size={14} /> Simpan Data
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Edit Data */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl border border-slate-200">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
                            <h3 className="text-sm font-black text-slate-800 uppercase">Edit Group Korwil</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XIcon size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block mb-1">USERNAME</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:border-sky-500"
                                    value={editFormData.username}
                                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block mb-1">KODE WILAYAH</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs uppercase outline-none focus:border-sky-500"
                                    value={editFormData.kode_wilayah}
                                    onChange={(e) => setEditFormData({ ...editFormData, kode_wilayah: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-50">Batal</button>
                                <button type="submit" className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-sm">
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}