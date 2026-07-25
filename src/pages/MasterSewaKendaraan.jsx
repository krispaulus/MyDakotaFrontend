import React, { useState, useEffect } from 'react';
import api from "../api/axios";
import DataTableTemplate from "../components/organisms/DataTableTemplate";
import Swal from 'sweetalert2';
import { Truck, Search, Plus, Calendar, Wrench, Edit, Trash2 } from 'lucide-react';

export default function MasterSewaKendaraan() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);

    // State untuk parameter Filter Pencarian 
    const [filterNopol, setFilterNopol] = useState('');
    const [filterTgla, setFilterTgla] = useState('');
    const [filterTgle, setFilterTgle] = useState('');

    // State Pengontrol Modal Kustom (Tambah & Edit)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSewaId, setSelectedSewaId] = useState('');

    // State data form input penampung payload
    const [formData, setFormData] = useState({
        cabang_id: '', no_kendaraan: '', jns_kend_id: '',
        vendor_sewa_id: '', biaya_sewa: 0, tgl_start_sewa: '2026-07-15',
        tgl_end_sewa: '2026-07-15', kend_sopir1: '', kend_sopir2: ''
    });

    const [editFormData, setEditFormData] = useState({
        cabang_id: '', jns_kend_id: '', vendor_sewa_id: '',
        biaya_sewa: 0, tgl_start_sewa: '', tgl_end_sewa: '',
        kend_sopir1: '', kend_sopir2: ''
    });

    // 📱 FETCH DATA LIST SEWA DARI BACKEND GOLANG
    const fetchSewaKendaraan = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/master/sewa-kendaraan?nopol=${filterNopol}&tgla=${filterTgla}&tgle=${filterTgle}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && res.data.data) {
                setVehicles(res.data.data);
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Gagal', 'Gagal menarik data master sewa kendaraan', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSewaKendaraan();
    }, []);

    // ➕ HANDLER SUBMIT DATA SEWA BARU
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!formData.no_kendaraan || !formData.cabang_id) {
            return Swal.fire('Peringatan', 'No Polisi dan Cabang wajib diisi bray!', 'warning');
        }
        try {
            const token = localStorage.getItem('token');
            await api.post('/master/sewa-kendaraan', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Sukses', 'Armada sewa berhasil didaftarkan!', 'success');
            setIsAddModalOpen(false);
            fetchSewaKendaraan();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal menyimpan transaksi sewa', 'error');
        }
    };

    // 📝 HANDLER TRIGGER MODAL EDIT + AUTO FILL DATA
    const handleEditTrigger = (item) => {
        setSelectedSewaId(item.sewa_id);
        setEditFormData({
            cabang_id: item.cabang_id || '',
            jns_kend_id: item.jns_kend_id || '',
            vendor_sewa_id: item.vendor_sewa_id || '',
            biaya_sewa: item.biaya_sewa || 0,
            tgl_start_sewa: item.tgl_start_sewa ? item.tgl_start_sewa.split('T')[0] : '',
            tgl_end_sewa: item.tgl_end_sewa ? item.tgl_end_sewa.split('T')[0] : '',
            kend_sopir1: item.kend_sopir1 || '',
            kend_sopir2: item.kend_sopir2 || '',
            no_kendaraan: item.no_kendaraan || ''
        });
        setIsEditModalOpen(true);
    };

    // 💾 HANDLER UPDATE DATA KONTRAK SEWA
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put(`/master/sewa-kendaraan/${selectedSewaId}`, editFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Sukses', 'Kontrak sewa berhasil diperbarui bray!', 'success');
            setIsEditModalOpen(false);
            fetchSewaKendaraan();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal memperbarui kontrak sewa', 'error');
        }
    };

    // 🗑️ HANDLER SOFT DELETE (NON-AKTIFKAN SEWA VENDOR)
    const handleDeleteSewa = (id) => {
        Swal.fire({
            title: 'Apakah Lu Yakin bray?',
            text: "Status armada sewa ini akan diubah jadi Non-Aktif!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/master/sewa-kendaraan/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Dihapus!', 'Armada sewa resmi dinonaktifkan', 'success');
                    fetchSewaKendaraan();
                } catch (err) {
                    Swal.fire('Gagal', 'Gagal memproses penghapusan data sewa', 'error');
                }
            }
        });
    };

    // 👑 POTONG KOLOM ACTION DI SINI AGAR TIDAK DOUBLE BRAY! (KARENA SUDAH DI-HANDLE AUTOMATIC OLEH TEMPLATE)
    const columnsSewa = [
        {
            header: 'NO. POLISI',
            accessor: 'no_kendaraan',
            render: (i) => (
                <span className="font-mono font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => handleEditTrigger(i)}>
                    {i.no_kendaraan}
                </span>
            )
        },
        { header: 'MULAI SEWA', render: (i) => <span className="font-mono text-slate-600 text-sm">{i.tgl_start_sewa ? i.tgl_start_sewa.split('T')[0] : '-'}</span> },
        { header: 'AKHIR SEWA', render: (i) => <span className="font-mono text-slate-600 text-sm">{i.tgl_end_sewa ? i.tgl_end_sewa.split('T')[0] : '-'}</span> },
        { header: 'PEMILIK / VENDOR', accessor: 'vendor_sewa_id' },
        { header: 'JENIS / MODEL', render: (i) => <span>{i.jnskend_nama || i.jns_kend_id || '-'}</span> },
        {
            header: 'BIAYA SEWA',
            render: (i) => <span className="font-mono font-semibold text-emerald-700">Rp {Number(i.biaya_sewa).toLocaleString('id-ID')}</span>
        },
        { header: 'PEMBUAT', accessor: 'update_id_sewa' }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Menu Utama */}
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <Truck size={20} className="text-amber-600" /> Kendaraan Tambahan (Sewa Vendor)
                </h3>
                {/* 👑 TOMBOL TAMBAH ATAS DIHAPUS KARENA SUDAH DI-RENDER TEMPLATE DATATABLE LU BRAY */}
            </div>

            {/* BARIS GRID FILTER PENCARIAN DARURAT LOGISTIK  */}
            <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 grid grid-cols-4 gap-4 items-end text-xs font-bold text-slate-600">
                <div>
                    <label className="block mb-1">CARI NO. POLISI</label>
                    <input type="text" className="w-full p-2 border rounded font-mono uppercase" placeholder="Contoh: B 1234 ABC" value={filterNopol} onChange={e => setFilterNopol(e.target.value)} />
                </div>
                <div>
                    <label className="block mb-1">RENTANG AWAL KONTRAK</label>
                    <input type="date" className="w-full p-2 border rounded font-normal" value={filterTgla} onChange={e => setFilterTgla(e.target.value)} />
                </div>
                <div>
                    <label className="block mb-1">RENTANG AKHIR KONTRAK</label>
                    <input type="date" className="w-full p-2 border rounded font-normal" value={filterTgle} onChange={e => setFilterTgle(e.target.value)} />
                </div>
                <div>
                    <button onClick={fetchSewaKendaraan} className="w-full py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition uppercase">
                        <Search size={14} /> CARI ARMADA VENDOR
                    </button>
                </div>
            </div>

            {/* 👑 INTEGRASI PENUH: Masukkan fungsi onAdd, onEdit, onDelete ke Template agar rapi tanpa noda double! */}
            <DataTableTemplate
                title="Daftar Kontrak Transaksi Sewa Pihak Ketiga (OPR_T_KENDARAANSEWA)"
                columns={columnsSewa}
                data={vehicles}
                loading={loading}
                isDarkMode={false}
                onAdd={() => setIsAddModalOpen(true)}
                onEdit={handleEditTrigger}
                onDelete={(i) => handleDeleteSewa(i.sewa_id)}
            />

            {/* 👑 A. MODAL KUSTOM TAMBAH DATA SEWA */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-4xl p-6 bg-white rounded-2xl shadow-2xl border flex flex-col my-8">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-blue-400 text-blue-700 font-bold text-sm tracking-wide rounded-sm uppercase">
                                TAMBAH DATA KENDARAAN SEWA VENDOR
                            </span>
                        </div>
                        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block mb-1">NO POLISI</label>
                                    <input type="text" required className="w-full p-2 border rounded bg-amber-50 uppercase text-sm font-black" placeholder="B1234ABC" value={formData.no_kendaraan} onChange={e => setFormData({ ...formData, no_kendaraan: e.target.value.replace(/ /g, "").toUpperCase() })} />
                                </div>
                                <div>
                                    <label className="block mb-1">NAMA PEMILIK / VENDOR</label>
                                    <input type="text" required className="w-full p-2 border rounded font-normal" value={formData.vendor_sewa_id} onChange={e => setFormData({ ...formData, vendor_sewa_id: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">CABANG PENEMPATAN</label>
                                    <select required className="w-full p-2 border rounded font-normal" value={formData.cabang_id} onChange={e => setFormData({ ...formData, cabang_id: e.target.value })}>
                                        <option value="">-- PILIH CABANG --</option>
                                        <option value="853">ADIWERNA AGEN</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block mb-1">JENIS / MODEL TRUK</label>
                                    <select required className="w-full p-2 border rounded font-normal" value={formData.jns_kend_id} onChange={e => setFormData({ ...formData, jns_kend_id: e.target.value })}>
                                        <option value="">-- PILIH MODEL --</option>
                                        <option value="K0001">Blind Van</option>
                                        <option value="K0002">Colt Diesel</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1">BIAYA SEWA (RP)</label>
                                    <input type="number" className="w-full p-2 border rounded font-normal text-emerald-800" value={formData.biaya_sewa} onChange={e => setFormData({ ...formData, biaya_sewa: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">MASA MULAI KONTRAK SEWA</label>
                                    <input type="date" className="w-full p-2 border rounded font-normal" value={formData.tgl_start_sewa} onChange={e => setFormData({ ...formData, tgl_start_sewa: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">MASA BERAKHIR KONTRAK SEWA</label>
                                    <input type="date" className="w-full p-2 border rounded font-normal" value={formData.tgl_end_sewa} onChange={e => setFormData({ ...formData, tgl_end_sewa: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">DRIVER UTAMA (VENDOR)</label>
                                    <input type="text" className="w-full p-2 border rounded font-normal" placeholder="Nama Supir 1" value={formData.kend_sopir1} onChange={e => setFormData({ ...formData, kend_sopir1: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">DRIVER CADANGAN (VENDOR)</label>
                                    <input type="text" className="w-full p-2 border rounded font-normal" placeholder="Nama Supir 2" value={formData.kend_sopir2} onChange={e => setFormData({ ...formData, kend_sopir2: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-4 border-t mt-6">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2 border text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 text-xs uppercase">CANCEL</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-xs uppercase shadow-md">ADD VEHICLE</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 👑 B. MODAL KUSTOM EDIT DATA SEWA */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-4xl p-6 bg-white rounded-2xl shadow-2xl border flex flex-col my-8">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-amber-500 text-amber-700 font-bold text-sm tracking-wide rounded-sm uppercase">
                                EDIT KONTRAK SEWA: {editFormData.no_kendaraan}
                            </span>
                        </div>
                        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block mb-1">NO POLISI (LOCKED)</label>
                                    <input type="text" disabled className="w-full p-2 border rounded bg-slate-100 uppercase text-sm font-black text-slate-400 cursor-not-allowed" value={editFormData.no_kendaraan} />
                                </div>
                                <div>
                                    <label className="block mb-1">NAMA PEMILIK / VENDOR</label>
                                    <input type="text" required className="w-full p-2 border rounded font-normal" value={editFormData.vendor_sewa_id} onChange={e => setEditFormData({ ...editFormData, vendor_sewa_id: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">CABANG PENEMPATAN</label>
                                    <select required className="w-full p-2 border rounded font-normal" value={editFormData.cabang_id} onChange={e => setEditFormData({ ...editFormData, cabang_id: e.target.value })}>
                                        <option value="853">ADIWERNA AGEN</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block mb-1">JENIS / MODEL TRUK</label>
                                    <select required className="w-full p-2 border rounded font-normal" value={editFormData.jns_kend_id} onChange={e => setEditFormData({ ...editFormData, jns_kend_id: e.target.value })}>
                                        <option value="K0001">Blind Van</option>
                                        <option value="K0002">Colt Diesel</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1">BIAYA SEWA (RP)</label>
                                    <input type="number" className="w-full p-2 border rounded font-normal text-emerald-800" value={editFormData.biaya_sewa} onChange={e => setEditFormData({ ...editFormData, biaya_sewa: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">MASA MULAI KONTRAK SEWA</label>
                                    <input type="date" className="w-full p-2 border rounded font-normal" value={editFormData.tgl_start_sewa} onChange={e => setEditFormData({ ...editFormData, tgl_start_sewa: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">MASA BERAKHIR KONTRAK SEWA</label>
                                    <input type="date" className="w-full p-2 border rounded font-normal" value={editFormData.tgl_end_sewa} onChange={e => setEditFormData({ ...editFormData, tgl_end_sewa: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">DRIVER UTAMA (VENDOR)</label>
                                    <input type="text" className="w-full p-2 border rounded font-normal" value={editFormData.kend_sopir1} onChange={e => setEditFormData({ ...editFormData, kend_sopir1: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">DRIVER CADANGAN (VENDOR)</label>
                                    <input type="text" className="w-full p-2 border rounded font-normal" value={editFormData.kend_sopir2} onChange={e => setEditFormData({ ...editFormData, kend_sopir2: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-4 border-t mt-6">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 border text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 text-xs uppercase">CANCEL</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-xs uppercase shadow-md">UPDATE CONTRACT</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}