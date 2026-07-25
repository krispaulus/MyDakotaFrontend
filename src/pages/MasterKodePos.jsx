import React, { useState, useEffect } from 'react';
import api from '../api/axios'; //
import { MapPin, Search } from 'lucide-react'; //
import DataTableTemplate from '../components/organisms/DataTableTemplate'; //
import { useDarkMode } from "../context/DarkModeContext"; //
import Swal from 'sweetalert2'; //

const MasterKodePos = () => {
    const { isDarkMode } = useDarkMode(); //
    const [data, setData] = useState([]); //
    const [loading, setLoading] = useState(false); //
    const [searchQuery, setSearchQuery] = useState(''); //

    // State Pengontrol Modal CRUD Kustom
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState('');

    // State Form Input Data Kontrak Wilayah
    const [formData, setFormData] = useState({
        kodepos: '', desakelurahan: '', kecamatandistrik: '',
        kotakabupaten: '', propinsi: '', area: ''
    });

    const [editFormData, setEditFormData] = useState({
        desakelurahan: '', kecamatandistrik: '',
        kotakabupaten: '', propinsi: '', area: ''
    });

    const fetchKodePos = async () => {
        setLoading(true); //
        try {
            const token = localStorage.getItem('token'); //
            const res = await api.get(`/master/kodepos?search=${searchQuery}`, { //
                headers: { Authorization: `Bearer ${token}` } //
            }); //
            setData(res.data || []); //
        } catch (err) {
            Swal.fire('Gagal', 'Gagal menarik data master kode pos', 'error'); //
        } finally {
            setLoading(false); //
        }
    };

    useEffect(() => {
        fetchKodePos(); //
    }, []); //

    // ➕ SUBMIT TAMBAH KODE POS BARU
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!formData.kodepos || !formData.desakelurahan) {
            return Swal.fire('Peringatan', 'Kode Pos dan Kelurahan wajib diisi!', 'warning');
        }
        try {
            const token = localStorage.getItem('token');
            await api.post('/master/kodepos', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Sukses', 'Wilayah baru berhasil disimpan', 'success');
            setIsAddModalOpen(false);
            setFormData({ kodepos: '', desakelurahan: '', kecamatandistrik: '', kotakabupaten: '', propinsi: '', area: '' });
            fetchKodePos();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal menambah data wilayah baru bray', 'error');
        }
    };

    // 📝 TRIGGER POPUP EDIT DAN AUTO-FILL
    const handleEditTrigger = (item) => {
        setSelectedId(item.kodepos);
        setEditFormData({
            desakelurahan: item.desakelurahan || '',
            kecamatandistrik: item.kecamatandistrik || '',
            kotakabupaten: item.kotakabupaten || '',
            propinsi: item.propinsi || '',
            area: item.area || ''
        });
        setIsEditModalOpen(true);
    };

    // 💾 SUBMIT PERBAIKAN DATA WILAYAH
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put(`/master/kodepos/${selectedId}`, editFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Sukses', 'Data wilayah berhasil diperbarui!', 'success');
            setIsEditModalOpen(false);
            fetchKodePos();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal meng-update data wilayah', 'error');
        }
    };

    // 🗑️ SUBMIT HAPUS PERMANEN KODE POS
    const handleDeleteTrigger = (id) => {
        Swal.fire({
            title: 'Hapus Wilayah bray?',
            text: `Kode pos ${id} akan dihapus permanen dari database!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/master/kodepos/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Sukses', 'Data wilayah berhasil dihapus', 'success');
                    fetchKodePos();
                } catch (err) {
                    Swal.fire('Gagal', 'Gagal menghapus wilayah terkait', 'error');
                }
            }
        });
    };

    const columns = [
        { header: 'KODE POS', accessor: 'kodepos', render: (item) => <span className="font-mono font-bold text-indigo-600 text-sm cursor-pointer hover:underline" onClick={() => handleEditTrigger(item)}>{item.kodepos}</span> }, //
        { header: 'KELURAHAN', accessor: 'desakelurahan' }, //
        { header: 'KECAMATAN', accessor: 'kecamatandistrik' }, //
        { header: 'KOTA/KAB', accessor: 'kotakabupaten' }, //
        { header: 'PROPINSI', accessor: 'propinsi' }, //
        { header: 'AREA', accessor: 'area' }, //
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Menu */}
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <MapPin size={20} className="text-indigo-600" /> Master Data Wilayah Kode Pos {/* */}
                </h3>
            </div>

            {/* GRID FILTER PENCARIAN MANDIRI */}
            <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 grid grid-cols-4 gap-4 items-end text-xs font-bold text-slate-600">
                <div className="col-span-3">
                    <label className="block mb-1 text-slate-500 uppercase">MASUKKAN KODE POS / NAMA KELURAHAN</label> {/* */}
                    <input //
                        type="text" //
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 bg-white outline-none" //
                        placeholder="Contoh: 17113 atau Adiwerna..." //
                        value={searchQuery} //
                        onChange={e => setSearchQuery(e.target.value)} //
                        onKeyDown={e => e.key === 'Enter' && fetchKodePos()} //
                    />
                </div>
                <div>
                    <button onClick={fetchKodePos} className="w-full h-[42px] bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition uppercase">
                        <Search size={14} /> CARI KODE POS {/* */}
                    </button>
                </div>
            </div>

            {/* Template Render DataTable List Utama */}
            <DataTableTemplate //
                title="MASTER DATA KODE POS INDONESIA (LIMIT 100)" //
                columns={columns} //
                data={data} //
                loading={loading} //
                isDarkMode={isDarkMode} //
                onAdd={() => setIsAddModalOpen(true)}
                onEdit={handleEditTrigger}
                onDelete={(item) => handleDeleteTrigger(item.kodepos)}
            />

            {/* A. MODAL KUSTOM TAMBAH DATA WILAYAH KODE POS */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-3xl p-6 bg-white rounded-2xl shadow-2xl border flex flex-col my-8">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-blue-400 text-blue-700 font-bold text-sm tracking-wide rounded-sm uppercase">TAMBAH MASTER DATA KODE POS</span>
                        </div>
                        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">KODE POS</label>
                                    <input type="text" required className="w-full p-2 border rounded bg-amber-50 font-black text-sm font-mono" placeholder="Contoh: 17113" value={formData.kodepos} onChange={e => setFormData({ ...formData, kodepos: e.target.value.replace(/ /g, "") })} />
                                </div>
                                <div>
                                    <label className="block mb-1">DESA / KELURAHAN</label>
                                    <input type="text" required className="w-full p-2 border rounded font-normal uppercase" value={formData.desakelurahan} onChange={e => setFormData({ ...formData, desakelurahan: e.target.value.toUpperCase() })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">KECAMATAN / DISTRIK</label>
                                    <input type="text" className="w-full p-2 border rounded font-normal uppercase" value={formData.kecamatandistrik} onChange={e => setFormData({ ...formData, kecamatandistrik: e.target.value.toUpperCase() })} />
                                </div>
                                <div>
                                    <label className="block mb-1">KOTA / KABUPATEN</label>
                                    <input type="text" className="w-full p-2 border rounded font-normal uppercase" value={formData.kotakabupaten} onChange={e => setFormData({ ...formData, kotakabupaten: e.target.value.toUpperCase() })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">PROPINSI</label>
                                    <input type="text" className="w-full p-2 border rounded font-normal uppercase" value={formData.propinsi} onChange={e => setFormData({ ...formData, propinsi: e.target.value.toUpperCase() })} />
                                </div>
                                <div>
                                    <label className="block mb-1">KODE AREA INTERNAL DAKOTA</label>
                                    <input type="text" className="w-full p-2 border rounded font-normal uppercase" placeholder="Contoh: JABODETABEK" value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value.toUpperCase() })} />
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-4 border-t mt-6">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2 border text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 text-xs uppercase">CANCEL</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-xs uppercase shadow-md">SAVE LOCATION</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* B. MODAL KUSTOM EDIT DATA WILAYAH KODE POS */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-3xl p-6 bg-white rounded-2xl shadow-2xl border flex flex-col my-8">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-amber-500 text-amber-700 font-bold text-sm tracking-wide rounded-sm uppercase">EDIT DATA WILAYAH: {selectedId}</span>
                        </div>
                        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">KODE POS (LOCKED)</label>
                                    <input type="text" disabled className="w-full p-2 border rounded bg-slate-100 font-black text-sm font-mono text-slate-400 cursor-not-allowed" value={selectedId} />
                                </div>
                                <div>
                                    <label className="block mb-1">DESA / KELURAHAN</label>
                                    <input type="text" required className="w-full p-2 border rounded font-normal uppercase" value={editFormData.desakelurahan} onChange={e => setEditFormData({ ...editFormData, desakelurahan: e.target.value.toUpperCase() })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">KECAMATAN / DISTRIK</label>
                                    <input type="text" className="w-full p-2 border rounded font-normal uppercase" value={editFormData.kecamatandistrik} onChange={e => setEditFormData({ ...editFormData, kecamatandistrik: e.target.value.toUpperCase() })} />
                                </div>
                                <div>
                                    <label className="block mb-1">KOTA / KABUPATEN</label>
                                    <input type="text" className="w-full p-2 border rounded font-normal uppercase" value={editFormData.kotakabupaten} onChange={e => setEditFormData({ ...editFormData, kotakabupaten: e.target.value.toUpperCase() })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">PROPINSI</label>
                                    <input type="text" className="w-full p-2 border rounded font-normal uppercase" value={editFormData.propinsi} onChange={e => setEditFormData({ ...editFormData, propinsi: e.target.value.toUpperCase() })} />
                                </div>
                                <div>
                                    <label className="block mb-1">KODE AREA INTERNAL DAKOTA</label>
                                    <input type="text" className="w-full p-2 border rounded font-normal uppercase" value={editFormData.area} onChange={e => setEditFormData({ ...editFormData, area: e.target.value.toUpperCase() })} />
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-4 border-t mt-6">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 border text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 text-xs uppercase">CANCEL</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-xs uppercase shadow-md">UPDATE LOCATION</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterKodePos;