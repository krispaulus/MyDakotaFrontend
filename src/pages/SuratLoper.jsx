import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, FileText, Truck, User, Calendar, CheckCircle2, ShieldAlert, RefreshCw, Barcode, Trash2, Plus, X } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

export default function SuratLoper() {
    const [loperData, setLoperData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchLoperId, setSearchLoperId] = useState('');

    // Modal & Action Control States
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false); // 🔥 Mode penentu Add / Edit info bray
    const [selectedLoper, setSelectedLoper] = useState(null);
    const [detailData, setDetailData] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);

    // Form Pembuatan / Pengeditan Manifes State
    const [formCreate, setFormCreate] = useState({
        id: null,
        loper_eid: '',
        loper_agenid: localStorage.getItem('active_agen_id') || 'PUSAT DAKOTA',
        loper_nipsopir: '',
        loper_keraniyn: 'N',
        loper_nipkerani: '',
        loper_nomobil: '',
        loper_aktifyn: 'Y'
    });

    // Temp Form Scan Barcode State
    const [scanBttNaik, setScanBttNaik] = useState('');
    const [scanBttTurun, setScanBttTurun] = useState('');

    // Fetch master history manifes loper dari backend
    const fetchLoperList = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`operasional/loper-list?loper_id=${searchLoperId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let dataFinal = [];
            if (res.data?.data && Array.isArray(res.data.data)) {
                dataFinal = res.data.data;
            } else if (Array.isArray(res.data)) {
                dataFinal = res.data;
            }

            setLoperData(dataFinal);
        } catch (err) {
            Swal.fire('Gagal', 'Gagal memuat daftar master manifes loper', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLoperList();
    }, []);

    // Open Modal untuk Tambah Data Baru
    const handleOpenAddModal = () => {
        setIsEditMode(false);
        setFormCreate({
            id: null,
            loper_eid: '',
            loper_agenid: localStorage.getItem('active_agen_id') || 'PUSAT DAKOTA',
            loper_nipsopir: '',
            loper_keraniyn: 'N',
            loper_nipkerani: '',
            loper_nomobil: '',
            loper_aktifyn: 'Y'
        });
        setIsCreateOpen(true);
    };

    // 🔥 MODAL EDIT SEKARANG BISA DIKLIK AKTIF DARI TOMBOL PULPEN BIRU BRAY!
    const handleOpenEditModal = (loper) => {
        setIsEditMode(true);
        setFormCreate({
            id: loper.id,
            loper_eid: loper.loper_eid,
            loper_agenid: loper.loper_agenid,
            loper_nipsopir: loper.loper_nipsopir,
            loper_keraniyn: loper.loper_keraniyn || 'N',
            loper_nipkerani: loper.loper_nipkerani || '',
            loper_nomobil: loper.loper_nomobil,
            loper_aktifyn: loper.loper_aktifyn || 'Y'
        });
        setIsCreateOpen(true);
    };

    // PROSES SIMPAN / UPDATE MANIFES KE POSTGRES
    const handleSaveNewLoper = async (e) => {
        e.preventDefault();
        if (!formCreate.loper_eid || !formCreate.loper_nipsopir || !formCreate.loper_nomobil) {
            Swal.fire('Peringatan', 'Mohon isi Nomor Manifes, Sopir, dan Nomor Mobil bray!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (isEditMode) {
                // Endpoint update data manifes bray
                await api.put(`operasional/loper-update/${formCreate.id}`, formCreate, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Sukses', 'Data Manifes Loper berhasil diperbarui bray!', 'success');
            } else {
                // Endpoint insert data manifes bray
                await api.post('operasional/loper-create', formCreate, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Sukses', 'Manifes Loper baru berhasil didaftarkan!', 'success');
            }
            setIsCreateOpen(false);
            fetchLoperList();
        } catch (err) {
            Swal.fire('Gagal Simpan', err.response?.data?.message || 'Terjadi kesalahan sistem internal', 'error');
        }
    };

    const handleTriggerDetail = (loper) => {
        setSelectedLoper(loper);
        setIsDetailOpen(true);
    };

    const formatTanggal = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const columnsIndex = [
        {
            header: 'NO. MANIFES LOPER',
            accessor: 'loper_eid',
            render: (i) => (
                <span className="font-mono font-black text-indigo-600 cursor-pointer hover:underline" onClick={() => handleTriggerDetail(i)}>
                    📋 {i.loper_eid}
                </span>
            )
        },
        { header: 'TANGGAL JALAN', accessor: 'loper_tanggal', render: (i) => <span className="font-semibold text-slate-700">{formatTanggal(i.loper_tanggal)}</span> },
        { header: 'NO. POLISI ARMADA', accessor: 'loper_nomobil', render: (i) => <span className="bg-slate-800 text-yellow-400 font-mono font-bold px-2 py-0.5 rounded text-xs">{i.loper_nomobil}</span> },
        { header: 'NIP / NAMA SOPIR', accessor: 'loper_nipsopir', render: (i) => <span className="font-medium text-slate-800">👤 {i.loper_nipsopir}</span> },
        {
            header: 'STATUS MANIFES',
            accessor: 'loper_aktifyn',
            render: (i) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-black ${i.loper_aktifyn === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {i.loper_aktifyn === 'Y' ? '🟢 MANIFES AKTIF' : '❌ BATAL'}
                </span>
            )
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Menu */}
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <Truck size={20} className="text-indigo-600" /> Operasional Cargo: Pembuatan Manifes Loper Barang
                </h3>
            </div>

            {/* Filter Panel Search */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 grid grid-cols-4 gap-4 items-end text-xs font-bold text-slate-600">
                <div className="col-span-3">
                    <label className="block mb-1 text-slate-500 uppercase">Cari Nomor Manifes Loper</label>
                    <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium bg-white outline-none focus:border-indigo-500 uppercase" placeholder="Masukkan Nomor Loper (LP/xxx/xxxx)..." value={searchLoperId} onChange={e => setSearchLoperId(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchLoperList()} />
                </div>
                <button onClick={fetchLoperList} className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition h-[42px] uppercase cursor-pointer shadow-sm">
                    <RefreshCw size={14} /> Tarik Manifes
                </button>
            </div>

            {/* Main Template Indeks Loper */}
            <DataTableTemplate
                title="Daftar Kontrol Pengiriman Last-Mile Kurir (OPR_T_eLoper)"
                columns={columnsIndex}
                data={loperData}
                loading={loading}
                isDarkMode={false}
                onAdd={handleOpenAddModal}
                onEdit={handleOpenEditModal} // 🔥 LINK ICON PULPEN LANGSUNG KUNCI KE MODAL EDIT BRAY
                onDelete={() => { }}
            />

            {/* ========================================================= */}
            {/* 🔥 MODAL DUA KOLOM MEWAH: MATCHING 100% DENGAN ADD USER INFO */}
            {/* ========================================================= */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">

                        {/* Title Header Modal */}
                        <div className="px-8 pt-8 pb-4 flex justify-between items-center border-b border-slate-100">
                            <h2 className="text-xl font-bold font-['Inter'] text-slate-900 tracking-wide uppercase">
                                {isEditMode ? 'EDIT MANIFES LOPER INFO' : 'ADD MANIFES LOPER INFO'}
                            </h2>
                            <button onClick={() => setIsCreateOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-500 transition-colors">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Body Form 2 Kolom Sejajar */}
                        <form onSubmit={handleSaveNewLoper} className="p-8 space-y-6 text-sm font-medium text-slate-700">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">

                                {/* Username / No Manifes */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">Nomor Manifes Loper (EID)</label>
                                    <input type="text" disabled={isEditMode} required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all font-mono uppercase bg-white disabled:bg-slate-50 disabled:text-slate-400" placeholder="Masukkan nomor surat jalan..." value={formCreate.loper_eid} onChange={e => setFormCreate({ ...formCreate, loper_eid: e.target.value.toUpperCase() })} />
                                </div>

                                {/* Pool Cabang ID */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">Pool Asal Cabang</label>
                                    <input type="text" disabled className="w-full p-3 border border-slate-200 rounded-xl outline-none font-mono bg-slate-50 text-slate-500" value={formCreate.loper_agenid} />
                                </div>

                                {/* NIP / Nama Sopir */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NIP / Nama Sopir Utama</label>
                                    <input type="text" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all bg-white" placeholder="Masukkan identitas sopir..." value={formCreate.loper_nipsopir} onChange={e => setFormCreate({ ...formCreate, loper_nipsopir: e.target.value })} />
                                </div>

                                {/* No. Polisi Kendaraan */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">Nomor Polisi Armada Mobil</label>
                                    <input type="text" required className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all font-mono uppercase bg-white" placeholder="Contoh: B9317KXS" value={formCreate.loper_nomobil} onChange={e => setFormCreate({ ...formCreate, loper_nomobil: e.target.value.toUpperCase() })} />
                                </div>

                                {/* Helper Dropdown */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">Status Helper / Kerani</label>
                                    <select className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all bg-white cursor-pointer" value={formCreate.loper_keraniyn} onChange={e => setFormCreate({ ...formCreate, loper_keraniyn: e.target.value, loper_nipkerani: e.target.value === 'N' ? '' : formCreate.loper_nipkerani })}>
                                        <option value="N">Tidak Menggunakan Helper</option>
                                        <option value="Y">Menggunakan Helper Pengiriman</option>
                                    </select>
                                </div>

                                {/* NIP Helper */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NIP Helper / Kerani</label>
                                    <input type="text" disabled={formCreate.loper_keraniyn === 'N'} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all bg-white disabled:bg-slate-50 disabled:cursor-not-allowed" placeholder="Masukkan NIP Helper..." value={formCreate.loper_nipkerani || ''} onChange={e => setFormCreate({ ...formCreate, loper_nipkerani: e.target.value })} />
                                </div>

                                {/* Status Aktif Manifes (Muncul hanya saat edit bray) */}
                                {isEditMode && (
                                    <div className="flex flex-col gap-1.5 col-span-2">
                                        <label className="text-slate-600 font-semibold">Status Manifes Loper</label>
                                        <select className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all bg-white cursor-pointer" value={formCreate.loper_aktifyn} onChange={e => setFormCreate({ ...formCreate, loper_aktifyn: e.target.value })}>
                                            <option value="Y">🟢 MANIFES AKTIF JALAN</option>
                                            <option value="N">❌ MANIFES DIBATALKAN / REJECT</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons Footer di Tengah Bawah Sesuai Figmamu bray */}
                            <div className="flex justify-center items-center gap-4 pt-6 border-t border-slate-100 mt-6">
                                <button type="button" onClick={() => setIsCreateOpen(false)} className="w-[160px] py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center text-xs">
                                    Cancel
                                </button>
                                <button type="submit" className="w-[160px] py-3 bg-[#1e1b4b] hover:opacity-90 active:scale-98 text-white font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center text-xs shadow-md">
                                    {isEditMode ? 'UPDATE LOPER' : 'ADD LOPER'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}