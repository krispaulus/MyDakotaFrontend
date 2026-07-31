import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plus, X, RefreshCw, ClipboardCheck, Edit3, Trash2 } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

export default function Pengambilan() {
    const [ambilData, setAmbilData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchAmbilId, setSearchAmbilId] = useState('');
    const [searchBttId, setSearchBttId] = useState('');

    // Modal States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Form Default Structure
    const defaultForm = {
        ambil_id: '',
        ambil_agenid: localStorage.getItem('active_agen_id') || 'PUSAT DAKOTA',
        ambil_bttid: '',
        ambil_checkernip: '',
        ambil_custnama: '',
        ambil_custalamat: '',
        ambil_custtelp: '',
        ambil_custjnsid: 'KTP',
        ambil_custid: '',
        ambil_skyn: 'N',
        ambil_foldersk: '',
        ambil_updateid: localStorage.getItem('user_name') || 'admin'
    };

    const [formData, setFormData] = useState(defaultForm);

    // Fetch data history dari backend Golang
    const fetchAmbilList = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`operasional/ambil-list?ambil_id=${searchAmbilId}&btt_id=${searchBttId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAmbilData(res.data?.data || []);
        } catch (err) {
            Swal.fire('Gagal', 'Gagal memuat data pengambilan barang', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAmbilList();
    }, []);

    // 1. TAMBAH TRANSAKSI BARU
    const handleAdd = () => {
        setFormData(defaultForm);
        setIsCreateOpen(true);
    };

    const handleSaveAmbil = async (e) => {
        e.preventDefault();
        if (!formData.ambil_id || !formData.ambil_bttid || !formData.ambil_custnama) {
            Swal.fire('Peringatan', 'Mohon lengkapi data No. Pengambilan, No. BTT, dan Nama Pengambil!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('operasional/ambil-create', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', 'Transaksi penyerahan barang berhasil direkam!', 'success');
            setIsCreateOpen(false);
            setFormData(defaultForm);
            fetchAmbilList();
        } catch (err) {
            Swal.fire('Gagal Simpan', err.response?.data?.message || 'Terjadi kesalahan internal', 'error');
        }
    };

    // 2. EDIT TRANSAKSI
    const handleEdit = (item) => {
        setFormData({
            ambil_id: item.ambil_id || '',
            ambil_agenid: item.ambil_agenid || 'PUSAT DAKOTA',
            ambil_bttid: item.ambil_bttid || '',
            ambil_checkernip: item.ambil_chekernip || item.ambil_checkernip || '',
            ambil_custnama: item.ambil_custnama || '',
            ambil_custalamat: item.ambil_custalamat || '',
            ambil_custtelp: item.ambil_custtelp || '',
            ambil_custjnsid: item.ambil_custjnsid || 'KTP',
            ambil_custid: item.ambil_custid || '',
            ambil_skyn: item.ambil_skyn || 'N',
            ambil_foldersk: item.ambil_foldersk || '',
            ambil_updateid: localStorage.getItem('user_name') || 'admin'
        });
        setIsEditOpen(true);
    };

    const handleUpdateAmbil = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put('operasional/ambil-update', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', `Data Pengambilan ${formData.ambil_id} berhasil diperbarui!`, 'success');
            setIsEditOpen(false);
            fetchAmbilList();
        } catch (err) {
            Swal.fire('Gagal Update', err.response?.data?.message || 'Terjadi kesalahan saat memperbarui data', 'error');
        }
    };

    // 3. DELETE TRANSAKSI
    const handleDeleteAmbil = (item) => {
        Swal.fire({
            title: 'Hapus Transaksi Pengambilan?',
            text: `Apakah Anda yakin ingin menghapus nomor pengambilan ${item.ambil_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`operasional/ambil-delete?ambil_id=${item.ambil_id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Terhapus!', 'Data transaksi berhasil dihapus.', 'success');
                    fetchAmbilList();
                } catch (err) {
                    Swal.fire('Gagal Hapus', err.response?.data?.message || 'Gagal menghapus data', 'error');
                }
            }
        });
    };

    const formatTanggal = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Mapping kolom tabel
    const columns = [
        {
            header: 'No. PENGAMBILAN',
            accessor: 'ambil_id',
            render: (i) => <span className="font-mono font-bold text-indigo-600">📄 {i.ambil_id}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'ambil_tanggal',
            render: (i) => <span className="font-semibold text-slate-700">{formatTanggal(i.ambil_tanggal)}</span>
        },
        {
            header: 'NO. BTT',
            accessor: 'ambil_bttid',
            render: (i) => <span className="bg-slate-800 text-yellow-400 font-mono font-bold px-2 py-0.5 rounded text-xs">{i.ambil_bttid}</span>
        },
        { header: 'PETUGAS SERAH TERIMA', accessor: 'kry_nama', render: (i) => i.kry_nama || i.ambil_chekernip || '-' },
        { header: 'NAMA PENGAMBIL', accessor: 'ambil_custnama' },
        { header: 'ID PENGAMBIL', accessor: 'ambil_custid', render: (i) => <span className="font-mono text-slate-500">{i.ambil_custid || '-'}</span> },
        {
            header: 'SURAT KUASA',
            accessor: 'skjd',
            render: (i) => (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${i.ambil_skyn === 'Y' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>
                    {i.ambil_skyn === 'Y' ? 'YA' : 'TIDAK'}
                </span>
            )
        },
        {
            header: 'AKTIF',
            accessor: 'aktifjd',
            render: (i) => (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${i.ambil_aktifyn === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {i.ambil_aktifyn === 'Y' ? 'YA' : 'TIDAK'}
                </span>
            )
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Title */}
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <ClipboardCheck size={20} className="text-indigo-600" /> PENGAMBILAN BARANG SENDIRI (Oleh Customer)
                </h3>
            </div>

            {/* Filter Group Multi-Search */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 grid grid-cols-3 gap-4 items-end text-xs font-bold text-slate-600">
                <div>
                    <label className="block mb-1 text-slate-500 uppercase">No. Pengambilan</label>
                    <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-indigo-500 uppercase" placeholder="AMB/xxxx" value={searchAmbilId} onChange={e => setSearchAmbilId(e.target.value)} />
                </div>
                <div>
                    <label className="block mb-1 text-slate-500 uppercase">No. BTT / Resi</label>
                    <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-indigo-500 uppercase" placeholder="Masukkan nomor resi..." value={searchBttId} onChange={e => setSearchBttId(e.target.value)} />
                </div>
                <button onClick={fetchAmbilList} className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 h-[42px] uppercase cursor-pointer">
                    <RefreshCw size={14} /> REFRESH
                </button>
            </div>

            {/* Data Table */}
            <DataTableTemplate
                title="Daftar Kontrol Serah Terima Mandiri Gudang (OPR_T_eAmbil)"
                columns={columns}
                data={ambilData}
                loading={loading}
                isDarkMode={false}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDeleteAmbil}
            />

            {/* ========================================================= */}
            {/* 🔥 MODAL (TAMBAH / EDIT) TRANSAKSI PENGAMBILAN */}
            {/* ========================================================= */}
            {(isCreateOpen || isEditOpen) && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">

                        {/* Title Header Modal */}
                        <div className="px-8 pt-8 pb-4 flex justify-between items-center border-b border-slate-100">
                            <h2 className="text-xl font-bold font-['Inter'] text-slate-900 tracking-wide uppercase">
                                {isEditOpen ? `EDIT TRANSACTION INFO (${formData.ambil_id})` : 'ADD TRANSACTION INFO (AMBIL SENDIRI)'}
                            </h2>
                            <button onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-500 transition-colors">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Body Form 2 Kolom Sejajar */}
                        <form onSubmit={isEditOpen ? handleUpdateAmbil : handleSaveAmbil} className="p-8 space-y-6 text-sm font-medium text-slate-700">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">

                                {/* No Pengambilan */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">Nomor Transaksi Pengambilan</label>
                                    <input type="text" disabled={isEditOpen} required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all font-mono uppercase bg-white disabled:bg-slate-100" placeholder="Contoh: AMB/001/2026" value={formData.ambil_id} onChange={e => setFormData({ ...formData, ambil_id: e.target.value.toUpperCase() })} />
                                </div>

                                {/* No BTT */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">Nomor BTT / Resi Pengiriman</label>
                                    <input type="text" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all font-mono uppercase bg-white" placeholder="Masukkan nomor resi BTT..." value={formData.ambil_bttid} onChange={e => setFormData({ ...formData, ambil_bttid: e.target.value.toUpperCase() })} />
                                </div>

                                {/* Nama Pengambil */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">Nama Lengkap Pengambil (Penerima)</label>
                                    <input type="text" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all bg-white" placeholder="Masukkan nama penerima..." value={formData.ambil_custnama} onChange={e => setFormData({ ...formData, ambil_custnama: e.target.value })} />
                                </div>

                                {/* NIP Checker Gudang */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NIP Petugas Serah Terima (Checker)</label>
                                    <input type="text" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all bg-white" placeholder="Masukkan NIP checker..." value={formData.ambil_checkernip} onChange={e => setFormData({ ...formData, ambil_checkernip: e.target.value })} />
                                </div>

                                {/* Jenis ID & Nomor ID */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">Jenis Identitas & Nomor ID Pengambil</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <select className="p-3 border border-slate-200 rounded-xl outline-none bg-white cursor-pointer" value={formData.ambil_custjnsid} onChange={e => setFormData({ ...formData, ambil_custjnsid: e.target.value })}>
                                            <option value="KTP">KTP</option>
                                            <option value="SIM">SIM</option>
                                            <option value="PASPOR">PASPOR</option>
                                        </select>
                                        <input type="text" required className="col-span-2 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all bg-white" placeholder="Nomor ID Identitas..." value={formData.ambil_custid} onChange={e => setFormData({ ...formData, ambil_custid: e.target.value })} />
                                    </div>
                                </div>

                                {/* Nomor Telpon */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">Nomor Telepon Pengambil</label>
                                    <input type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all bg-white" placeholder="Contoh: 08123xxxx" value={formData.ambil_custtelp} onChange={e => setFormData({ ...formData, ambil_custtelp: e.target.value })} />
                                </div>

                                {/* Surat Kuasa Dropdown */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">Apakah Melampirkan Surat Kuasa?</label>
                                    <select className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all bg-white cursor-pointer" value={formData.ambil_skyn} onChange={e => setFormData({ ...formData, ambil_skyn: e.target.value })}>
                                        <option value="N">Tidak (Pengambil Asli Sesuai Resi)</option>
                                        <option value="Y">Ya (Diwakilkan Utusan Lain)</option>
                                    </select>
                                </div>

                                {/* Folder Path Dokumen */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">Path / Folder Arsip Surat Kuasa</label>
                                    <input type="text" disabled={formData.ambil_skyn === 'N'} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all bg-white disabled:bg-slate-50 disabled:cursor-not-allowed" placeholder="Contoh: /arsip/sk/2026/" value={formData.ambil_foldersk} onChange={e => setFormData({ ...formData, ambil_foldersk: e.target.value })} />
                                </div>

                                {/* Alamat Lengkap */}
                                <div className="flex flex-col gap-1.5 col-span-2">
                                    <label className="text-slate-600 font-semibold">Alamat Lengkap Rumah / Kantor Pengambil</label>
                                    <textarea rows={2} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white resize-none" placeholder="Masukkan alamat lengkap pengambil..." value={formData.ambil_custalamat} onChange={e => setFormData({ ...formData, ambil_custalamat: e.target.value })} />
                                </div>

                            </div>

                            {/* Action Buttons Footer */}
                            <div className="flex justify-center items-center gap-4 pt-6 border-t border-slate-100 mt-6">
                                <button type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="w-[160px] py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl uppercase tracking-wide cursor-pointer text-xs text-center">
                                    CANCEL
                                </button>
                                <button type="submit" className="w-[160px] py-3 bg-[#1e1b4b] hover:opacity-90 active:scale-98 text-white font-bold rounded-xl uppercase tracking-wide cursor-pointer text-xs text-center shadow-md">
                                    {isEditOpen ? 'UPDATE TRANSACTION' : 'ADD TRANSACTION'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}