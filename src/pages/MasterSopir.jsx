import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { UserCheck, Search, Plus, Smartphone, CheckCircle, XCircle } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

export default function MasterSopir() {
    const [supirList, setSupirList] = useState([]);
    const [loading, setLoading] = useState(false);

    // State Filter Pencarian
    const [searchNama, setSearchNama] = useState('');

    // State Pengontrol Modal CRUD
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeSupirId, setActiveSupirId] = useState('');

    // State Form Input Data Pelacak & Identitas
    const [formData, setFormData] = useState({
        supir_id: '', supir_nama: '', supir_borongan_yn: 'N',
        supir_imei1: '', supir_imei2: '', supir_simcard_id1: '', supir_simcard_id2: ''
    });

    const [editFormData, setEditFormData] = useState({
        supir_nama: '', supir_borongan_yn: 'N',
        supir_imei1: '', supir_imei2: '', supir_simcard_id1: '', supir_simcard_id2: ''
    });

    const fetchSupir = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/master/sopir?nama=${searchNama}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSupirList(res.data?.data || []);
        } catch (err) {
            Swal.fire('Gagal', 'Gagal memuat master daftar sopir', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSupir();
    }, []);

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!formData.supir_id || !formData.supir_nama) {
            return Swal.fire('Peringatan', 'ID Sopir dan Nama wajib diisi bray!', 'warning');
        }
        try {
            const token = localStorage.getItem('token');
            await api.post('/master/sopir', formData, { headers: { Authorization: `Bearer ${token}` } });
            Swal.fire('Sukses', 'Sopir baru resmi terdaftar & device ter-pairing!', 'success');
            setIsAddModalOpen(false);
            setFormData({ supir_id: '', supir_nama: '', supir_borongan_yn: 'N', supir_imei1: '', supir_imei2: '', supir_simcard_id1: '', supir_simcard_id2: '' });
            fetchSupir();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal mendaftarkan sopir baru', 'error');
        }
    };

    const handleEditTrigger = (item) => {
        setActiveSupirId(item.supir_id);
        setEditFormData({
            supir_nama: item.supir_nama,
            supir_borongan_yn: item.supir_borongan_yn || 'N',
            supir_imei1: item.supir_imei1 || '',
            supir_imei2: item.supir_imei2 || '',
            supir_simcard_id1: item.supir_simcard_id1 || '',
            supir_simcard_id2: item.supir_simcard_id2 || ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put(`/master/sopir/${activeSupirId}`, editFormData, { headers: { Authorization: `Bearer ${token}` } });
            Swal.fire('Sukses', 'Data identitas sopir diperbarui!', 'success');
            setIsEditModalOpen(false);
            fetchSupir();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal memperbarui data sopir bray', 'error');
        }
    };

    const handleDeleteTrigger = (id) => {
        Swal.fire({
            title: 'Non-Aktifkan Sopir?',
            text: `Status Supir dengan ID ${id} akan diubah menjadi Non-Aktif Jalan!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Non-Aktifkan!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/master/sopir/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                    Swal.fire('Sukses', 'Sopir dinonaktifkan dari manifes jalan!', 'success');
                    fetchSupir();
                } catch (err) {
                    Swal.fire('Gagal', 'Gagal mengubah status supir', 'error');
                }
            }
        });
    };

    const columnsSupir = [
        { header: 'ID SOPIR', accessor: 'supir_id', render: (i) => <span className="font-mono font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => handleEditTrigger(i)}>{i.supir_id}</span> },
        { header: 'NAMA SOPIR', accessor: 'supir_nama', render: (i) => <span className="font-bold text-slate-700">{i.supir_nama}</span> },
        { header: 'SISTEM KERJA', render: (i) => <span className="font-medium">{i.supir_borongan_yn === 'Y' ? '🛠️ BORONGAN' : '💼 GAJIAN'}</span> },
        { header: 'IMEI 1 Pelacak', accessor: 'supir_imei1', render: (i) => <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{i.supir_imei1 || '-'}</span> },
        { header: 'SIMCARD 1 ID', accessor: 'supir_simcard_id1', render: (i) => <span className="font-mono text-xs text-slate-500">{i.supir_simcard_id1 || '-'}</span> },
        {
            header: 'STATUS AKTIF',
            render: (i) => i.supir_aktif_yn === 'Y' ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">READY JALAN</span>
            ) : (
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">NON-AKTIF</span>
            )
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Menu */}
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <UserCheck size={20} className="text-blue-600" /> Master Manajemen Sopir & Pelacak GPS
                </h3>
            </div>

            {/* Filter Bar */}
            <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 grid grid-cols-4 gap-4 items-end text-xs font-bold text-slate-600">
                <div className="col-span-3">
                    <label className="block mb-1 text-slate-500 uppercase">CARI NAMA LENGKAP SOPIR</label>
                    <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium bg-white outline-none focus:border-blue-500" placeholder="Masukkan nama pengemudi..." value={searchNama} onChange={e => setSearchNama(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchSupir()} />
                </div>
                <button onClick={fetchSupir} className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition h-[42px] uppercase">
                    <Search size={14} /> Cari Driver
                </button>
            </div>

            {/* Template DataTable List Utama */}
            <DataTableTemplate
                title="Daftar Pengemudi & Sinkronisasi Mobile Tracker (OPR_M_Supir)"
                columns={columnsSupir}
                data={supirList}
                loading={loading}
                isDarkMode={false}
                onAdd={() => setIsAddModalOpen(true)}
                onEdit={handleEditTrigger}
                onDelete={(i) => handleDeleteTrigger(i.supir_id)}
            />

            {/* A. MODAL TAMBAH DATA SOPIR & DEVICE PAIRING */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-3xl p-6 bg-white rounded-2xl shadow-2xl flex flex-col my-8 border border-slate-200">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-blue-400 text-blue-700 font-bold text-sm tracking-wide rounded-sm uppercase">PENDAFTARAN SOPIR & GPS MOBILE PAIRING</span>
                        </div>
                        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-3">
                                    <label className="block mb-1">ID SOPIR (NIP / KTP)</label>
                                    <input type="text" required className="w-full p-2 border rounded bg-amber-50 font-black uppercase text-sm font-mono" placeholder="Contoh: 1605001" value={formData.supir_id} onChange={e => setFormData({ ...formData, supir_id: e.target.value.toUpperCase().replace(/ /g, "") })} />
                                </div>
                                <div className="col-span-6">
                                    <label className="block mb-1">NAMA LENGKAP SOPIR</label>
                                    <input type="text" required className="w-full p-2 border rounded font-normal text-sm uppercase" placeholder="Masukkan nama lengkap supir" value={formData.supir_name} onChange={e => setFormData({ ...formData, supir_name: e.target.value.toUpperCase() })} />
                                </div>
                                <div className="col-span-3">
                                    <label className="block mb-1">SISTEM KERJA PENGGAJIAN</label>
                                    <div className="flex gap-4 p-2 border rounded bg-slate-50 font-normal mt-0.5">
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="borongan" checked={formData.supir_borongan_yn === 'N'} onChange={() => setFormData({ ...formData, supir_borongan_yn: 'N' })} /> GAJIAN</label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="borongan" checked={formData.supir_borongan_yn === 'Y'} onChange={() => setFormData({ ...formData, supir_borongan_yn: 'Y' })} /> BORONGAN</label>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center pt-2 pb-1 border-t border-slate-100 mt-4 flex items-center justify-center gap-1 text-indigo-700 uppercase">
                                <Smartphone size={14} /> <span>Kunci Otentikasi Device Tracker Supir (Wajib Sinkron)</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 border rounded-xl bg-slate-50/50 space-y-3">
                                    <span className="text-[11px] text-indigo-600 block border-b pb-1">SMARTPHONE UTAMA (SLOT 1)</span>
                                    <div>
                                        <label className="block mb-1">NOMOR IMEI 1</label>
                                        <input type="text" required className="w-full p-2 border rounded bg-white font-mono font-normal" placeholder="Masukkan IMEI 1 HP supir" value={formData.supir_imei1} onChange={e => setFormData({ ...formData, supir_imei1: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block mb-1">NOMOR SERI SIMCARD 1</label>
                                        <input type="text" required className="w-full p-2 border rounded bg-white font-mono font-normal" placeholder="Masukkan Nomor SIM Card 1" value={formData.supir_simcard_id1} onChange={e => setFormData({ ...formData, supir_simcard_id1: e.target.value })} />
                                    </div>
                                </div>
                                <div className="p-3 border rounded-xl bg-slate-50/50 space-y-3">
                                    <span className="text-[11px] text-slate-500 block border-b pb-1">SMARTPHONE CADANGAN (SLOT 2 - OPTIONAL)</span>
                                    <div>
                                        <label className="block mb-1">NOMOR IMEI 2</label>
                                        <input type="text" className="w-full p-2 border rounded bg-white font-mono font-normal" placeholder="Masukkan IMEI 2 (Jika ada)" value={formData.supir_imei2} onChange={e => setFormData({ ...formData, supir_imei2: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block mb-1">NOMOR SERI SIMCARD 2</label>
                                        <input type="text" className="w-full p-2 border rounded bg-white font-mono font-normal" placeholder="Masukkan Nomor SIM Card 2 (Jika ada)" value={formData.supir_simcard_id2} onChange={e => setFormData({ ...formData, supir_simcard_id2: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-3 pt-4 border-t mt-6">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2 border text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 text-xs uppercase">CANCEL</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-xs uppercase shadow-md">REGISTER DRIVER</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* B. MODAL EDIT DATA SOPIR & DEVICE RE-PAIRING */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-3xl p-6 bg-white rounded-2xl shadow-2xl flex flex-col my-8 border border-slate-200">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-amber-500 text-amber-700 font-bold text-sm tracking-wide rounded-sm uppercase">EDIT FORM IDENTITAS SOPIR: {activeSupirId}</span>
                        </div>
                        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-3">
                                    <label className="block mb-1">ID SOPIR (LOCKED)</label>
                                    <input type="text" disabled className="w-full p-2 border rounded bg-slate-100 font-black text-sm font-mono text-slate-400 cursor-not-allowed" value={activeSupirId} />
                                </div>
                                <div className="col-span-6">
                                    <label className="block mb-1">NAMA LENGKAP SOPIR</label>
                                    <input type="text" required className="w-full p-2 border rounded font-normal text-sm uppercase" value={editFormData.supir_nama} onChange={e => setEditFormData({ ...editFormData, supir_nama: e.target.value.toUpperCase() })} />
                                </div>
                                <div className="col-span-3">
                                    <label className="block mb-1">SISTEM KERJA PENGGAJIAN</label>
                                    <div className="flex gap-4 p-2 border rounded bg-slate-50 font-normal mt-0.5">
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="edit_borongan" checked={editFormData.supir_borongan_yn === 'N'} onChange={() => setEditFormData({ ...editFormData, supir_borongan_yn: 'N' })} /> GAJIAN</label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="edit_borongan" checked={editFormData.supir_borongan_yn === 'Y'} onChange={() => setEditFormData({ ...editFormData, supir_borongan_yn: 'Y' })} /> BORONGAN</label>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center pt-2 pb-1 border-t border-slate-100 mt-4 flex items-center justify-center gap-1 text-amber-700 uppercase">
                                <Smartphone size={14} /> <span>Update Otorisasi Perangkat mobile GPS Driver</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 border rounded-xl bg-slate-50/50 space-y-3">
                                    <span className="text-[11px] text-amber-600 block border-b pb-1">SMARTPHONE UTAMA (SLOT 1)</span>
                                    <div>
                                        <label className="block mb-1">NOMOR IMEI 1</label>
                                        <input type="text" required className="w-full p-2 border rounded bg-white font-mono font-normal" value={editFormData.supir_imei1} onChange={e => setEditFormData({ ...editFormData, supir_imei1: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block mb-1">NOMOR SERI SIMCARD 1</label>
                                        <input type="text" required className="w-full p-2 border rounded bg-white font-mono font-normal" value={editFormData.supir_simcard_id1} onChange={e => setEditFormData({ ...editFormData, supir_simcard_id1: e.target.value })} />
                                    </div>
                                </div>
                                <div className="p-3 border rounded-xl bg-slate-50/50 space-y-3">
                                    <span className="text-[11px] text-slate-500 block border-b pb-1">SMARTPHONE CADANGAN (SLOT 2 - OPTIONAL)</span>
                                    <div>
                                        <label className="block mb-1">NOMOR IMEI 2</label>
                                        <input type="text" className="w-full p-2 border rounded bg-white font-mono font-normal" value={editFormData.supir_imei2} onChange={e => setEditFormData({ ...editFormData, supir_imei2: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block mb-1">NOMOR SERI SIMCARD 2</label>
                                        <input type="text" className="w-full p-2 border rounded bg-white font-mono font-normal" value={editFormData.supir_simcard_id2} onChange={e => setEditFormData({ ...editFormData, supir_simcard_id2: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-3 pt-4 border-t mt-6">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 border text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 text-xs uppercase">CANCEL</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-xs uppercase shadow-md">UPDATE DATA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}