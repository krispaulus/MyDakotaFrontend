import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Map, Search, Plus, Layers, Trash2 } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

export default function MasterKorwil() {
    const [korwilList, setKorwilList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [subLoading, setSubLoading] = useState(false);
    const [agenCakupan, setAgenCakupan] = useState([]);

    // Filter bar state
    const [searchNama, setSearchNama] = useState('');
    const [searchPJ, setSearchPJ] = useState('');

    // Modal state controllers
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeKorwilId, setActiveKorwilId] = useState('');

    // Form states
    const [formData, setFormData] = useState({ nama_wilayah: '', nip_karyawan: '', ket_korwil: '' });
    const [editFormData, setEditFormData] = useState({ nama_wilayah: '', nip_karyawan: '', ket_korwil: '' });
    const [selectedAgenToAssign, setSelectedAgenToAssign] = useState('');

    // State penampung list agen & karyawan untuk select option dinamis bray
    const [masterAgenList, setMasterAgenList] = useState([]);

    const fetchKorwil = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/master/korwil?nama=${searchNama}&namapj=${searchPJ}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setKorwilList(res.data?.data || []);
        } catch (err) {
            Swal.fire('Gagal', 'Gagal memuat koordinator wilayah', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchCakupanAgen = async (korwilId) => {
        setSubLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/master/korwil/detail/${korwilId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAgenCakupan(res.data?.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSubLoading(false);
        }
    };

    const fetchMasterAgenOpt = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/agens', { headers: { Authorization: `Bearer ${token}` } });
            setMasterAgenList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load master agen option:", err);
        }
    };

    useEffect(() => {
        fetchKorwil();
        fetchMasterAgenOpt();
    }, []);

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.post('/master/korwil', formData, { headers: { Authorization: `Bearer ${token}` } });
            Swal.fire('Sukses', 'Koordinator wilayah berhasil disimpan!', 'success');
            setIsAddModalOpen(false);
            setFormData({ nama_wilayah: '', nip_karyawan: '', ket_korwil: '' });
            fetchKorwil();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal menyimpan korwil', 'error');
        }
    };

    const handleEditTrigger = (item) => {
        setActiveKorwilId(item.kd_korwil);
        setEditFormData({
            nama_wilayah: item.nama_wilayah,
            nip_karyawan: item.nip_karyawan || '',
            ket_korwil: item.ket_korwil || ''
        });
        fetchCakupanAgen(item.kd_korwil);
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put(`/master/korwil/${activeKorwilId}`, editFormData, { headers: { Authorization: `Bearer ${token}` } });
            Swal.fire('Sukses', 'Data master korwil diperbarui!', 'success');
            fetchKorwil();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal update master korwil', 'error');
        }
    };

    const handleAddAgenCakupan = async () => {
        if (!selectedAgenToAssign) return Swal.fire('Peringatan', 'Pilih agen terlebih dahulu bray!', 'warning');
        try {
            const token = localStorage.getItem('token');
            // 👑 SINKRON: Properti JSON dicocokkan dengan struct glb_m_korwil_d backend bray!
            await api.post('/master/korwil/detail', {
                kd_wilayah_d: activeKorwilId,
                kd_wilayah_agen_id: selectedAgenToAssign
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedAgenToAssign('');
            fetchCakupanAgen(activeKorwilId);
        } catch (err) {
            Swal.fire('Gagal', 'Agen sudah masuk daftar cakupan wilayah ini bray!', 'error');
        }
    };

    const handleRemoveAgenCakupan = async (agenId) => {
        try {
            const token = localStorage.getItem('token');
            // 👑 SINKRON: Gunakan Query Param pas hapus biar ga bentrok constraint database bray!
            await api.delete(`/master/korwil/detail?kd_korwil=${activeKorwilId}&agen_id=${agenId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCakupanAgen(activeKorwilId);
        } catch (err) {
            Swal.fire('Gagal', 'Gagal mencabut cakupan agen', 'error');
        }
    };

    const columnsKorwil = [
        { header: 'KODE WILAYAH', accessor: 'kd_korwil', render: (i) => <span className="font-mono font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => handleEditTrigger(i)}>{i.kd_korwil}</span> },
        { header: 'NAMA WILAYAH', accessor: 'nama_wilayah' },
        { header: 'PENANGGUNG JAWAB', accessor: 'kry_nama', render: (i) => <span>{i.kry_nama || i.nip_karyawan || '-'}</span> },
        { header: 'CONTACT PJ', render: (i) => <span className="font-mono text-slate-600 text-sm">{i.kry_telp1 ? `${i.kry_telp1} / ${i.kry_telp2 || '-'}` : '-'}</span> },
        { header: 'KETERANGAN', accessor: 'ket_korwil', render: (i) => <span className="text-xs text-slate-500">{i.ket_korwil || '-'}</span> },

        // 👑 SUNTIKKAN BARIS EMAS INI BRAY DI ATAS KOLOM ACTION AGAR SINKRON SAMA DATABASE:
        {
            header: 'AKTIF Y/T',
            accessor: 'korwil_aktif_yn',
            render: (i) => i.korwil_aktif_yn === 'Y' ? (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">YA</span>
            ) : (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">TIDAK</span>
            )
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Menu */}
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <Map size={20} className="text-emerald-600" /> Master Koordinator Wilayah Logistik
                </h3>
            </div>

            {/* Filter Bar Pencarian */}
            <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 grid grid-cols-3 gap-4 items-end text-xs font-bold text-slate-600">
                <div>
                    <label className="block mb-1">NAMA WILAYAH</label>
                    <input type="text" className="w-full p-2 border rounded text-sm uppercase font-medium" placeholder="Cari nama wilayah..." value={searchNama} onChange={e => setSearchNama(e.target.value)} />
                </div>
                <div>
                    <label className="block mb-1">NAMA PENANGGUNG JAWAB</label>
                    <input type="text" className="w-full p-2 border rounded text-sm font-medium" placeholder="Cari penanggung jawab..." value={searchPJ} onChange={e => setSearchPJ(e.target.value)} />
                </div>
                <button onClick={fetchKorwil} className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition h-[40px]">
                    <Search size={14} /> REFRESH DATA
                </button>
            </div>

            {/* Render DataTable List Utama */}
            <DataTableTemplate
                title="Daftar Pembagian Koordinator Wilayah Operasional (GLB_M_KORWIL)"
                columns={columnsKorwil}
                data={korwilList}
                loading={loading}
                isDarkMode={false}
                onAdd={() => setIsAddModalOpen(true)}
                onEdit={handleEditTrigger}
                onDelete={() => { }}
            />

            {/* A. MODAL TAMBAH DATA INDUK */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-xl p-6 bg-white rounded-2xl shadow-2xl flex flex-col">
                        <h3 className="text-sm font-black border-b pb-2 mb-4 text-slate-700 uppercase">Tambah Data Koordinator Wilayah</h3>
                        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block mb-1">NAMA WILAYAH (MAKS 30 CHAR)</label>
                                <input type="text" maxLength={30} required className="w-full p-2 border rounded uppercase font-normal text-sm" value={formData.nama_wilayah} onChange={e => setFormData({ ...formData, nama_wilayah: e.target.value.toUpperCase() })} />
                            </div>
                            <div>
                                <label className="block mb-1">NIP KARYAWAN (PENANGGUNG JAWAB)</label>
                                <input type="text" required className="w-full p-2 border rounded text-sm font-mono" placeholder="Contoh: 1605001" value={formData.nip_karyawan} onChange={e => setFormData({ ...formData, nip_karyawan: e.target.value })} />
                            </div>
                            <div>
                                <label className="block mb-1">KETERANGAN WILAYAH</label>
                                <textarea className="w-full p-2 border rounded font-normal text-sm" rows={2} placeholder="Keterangan operasional wilayah..." value={formData.ket_korwil} onChange={e => setFormData({ ...formData, ket_korwil: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border rounded-md hover:bg-slate-50">CANCEL</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md font-bold">SIMPAN DATA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* B. MODAL EDIT DATA INDUK + MANAJEMEN DETAIL CAKUPAN AGEN (RELASI MASTER-DETAIL) */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-3xl p-6 bg-white rounded-2xl shadow-2xl flex flex-col my-8">
                        <h3 className="text-sm font-black border-b pb-2 mb-4 text-slate-700 uppercase">Edit & Kelola Cakupan Wilayah Korwil</h3>

                        <form onSubmit={handleEditSubmit} className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-700 border-b pb-4 mb-4">
                            <div className="space-y-3">
                                <div>
                                    <label className="block mb-1">NAMA WILAYAH</label>
                                    <input type="text" className="w-full p-2 border rounded uppercase font-normal text-sm" value={editFormData.nama_wilayah} onChange={e => setEditFormData({ ...editFormData, nama_wilayah: e.target.value.toUpperCase() })} />
                                </div>
                                <div>
                                    <label className="block mb-1">KETERANGAN WILAYAH</label>
                                    <input type="text" className="w-full p-2 border rounded font-normal text-sm" value={editFormData.ket_korwil} onChange={e => setEditFormData({ ...editFormData, ket_korwil: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1">NIP KARYAWAN (PENANGGUNG JAWAB)</label>
                                <input type="text" className="w-full p-2 border rounded text-sm font-mono" value={editFormData.nip_karyawan} onChange={e => setEditFormData({ ...editFormData, nip_karyawan: e.target.value })} />
                                <button type="submit" className="mt-5 px-3 py-2 bg-blue-600 text-white rounded font-bold text-[11px] uppercase w-full shadow-sm hover:bg-blue-700">Update Info Induk</button>
                            </div>
                        </form>

                        {/* SUB SECTION DETAIL: CAKUPAN AGEN LOGISTIK */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-indigo-700 flex items-center gap-1 uppercase"><Layers size={14} /> Cabang / Agen / Counter Cakupan Korwil</h4>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-[11px] mb-1 font-bold text-slate-500">PILIH AGEN YANG INGIN DITAMBAHKAN</label>
                                    <select className="w-full p-2 border rounded text-xs font-normal bg-white" value={selectedAgenToAssign} onChange={e => setSelectedAgenToAssign(e.target.value)}>
                                        <option value="">-- Pilih Cabang/Agen/Counter --</option>
                                        {masterAgenList.map((agen) => (
                                            <option key={agen.agen_id} value={agen.agen_id}>{agen.agen_id} - {agen.agen_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="button" onClick={handleAddAgenCakupan} className="px-4 py-2 bg-indigo-900 text-white font-bold text-xs rounded uppercase h-[34px] flex items-center gap-1"><Plus size={14} /> Tambah Cakupan</button>
                            </div>

                            {/* Sub Table List Render Detail */}
                            <div className="border rounded-lg overflow-hidden max-h-[220px] overflow-y-auto bg-slate-50">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-200 text-slate-700 font-bold uppercase tracking-wider sticky top-0 text-[11px]">
                                        <tr>
                                            <th className="p-2.5">KODE AGEN</th>
                                            <th className="p-2.5">NAMA CABANG / AGEN / COUNTER</th>
                                            <th className="p-2.5 text-center">AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 text-slate-700">
                                        {subLoading ? (
                                            <tr><td colSpan={3} className="text-center p-4 font-normal animate-pulse text-slate-400">Memuat detail area...</td></tr>
                                        ) : agenCakupan.length === 0 ? (
                                            <tr><td colSpan={3} className="text-center p-4 font-normal text-slate-400">Belum ada cakupan agen operasional terdaftar bray.</td></tr>
                                        ) : agenCakupan.map((item) => (
                                            <tr key={item.kd_wilayah_agen_id} className="hover:bg-white transition-colors">
                                                <td className="p-2 font-mono font-bold">{item.kd_wilayah_agen_id}</td>
                                                <td className="p-2 font-medium">{item.agen_name || 'NAMA AGEN'}</td>
                                                <td className="p-2 text-center">
                                                    <button type="button" onClick={() => handleRemoveAgenCakupan(item.kd_wilayah_agen_id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded transition"><Trash2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t mt-6">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-1.5 bg-slate-800 text-white rounded-md font-bold text-xs uppercase">KELUAR MENU</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}