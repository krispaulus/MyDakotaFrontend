import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { ShieldAlert, Plus, X as XIcon, Save, Calendar, Layers, Filter, RotateCcw, RefreshCw } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

const MasterAreaTidakDilayani = () => {
    const { isDarkMode } = useDarkMode();
    const [uncoveredList, setUncoveredList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState("False");

    // 🌟 State Toggle Filter & Parameter Pencarian
    const [showFilter, setShowFilter] = useState(false);
    const [filterAsalKota, setFilterAsalKota] = useState('');
    const [filterServID, setFilterServID] = useState('');
    const [filterTujuan, setFilterTujuan] = useState('');
    const [filterBlockYN, setFilterBlockYN] = useState('');

    const defaultForm = {
        generatedID: '',
        asalKota: '',
        servID: 1,
        tujuanPropinsi: '',
        tujuanKabupaten: '',
        tujuanKecamatan: '',
        blockYN: 'Y',
        validDate: new Date().toISOString().split('T')[0],
        confirmReplace: 'NO'
    };

    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchUncoveredAreas();
    }, []);

    const fetchUncoveredAreas = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/marketing/uncovered-areas', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUncoveredList(res.data?.data || res.data || []);
        } catch (err) {
            console.error(err);
            setUncoveredList([]);
        } finally {
            setLoading(false);
        }
    };

    // 🌟 Filter Data Lokal Reaktif Multi-Kriteria
    const filteredList = useMemo(() => {
        return uncoveredList.filter(item => {
            const asal = (item.asal_kota || item.AsalKota || '').toLowerCase();
            const tujuan = `${item.tujuan_propinsi || ''} ${item.tujuan_kabupaten || ''} ${item.tujuan_kecamatan || ''}`.toLowerCase();
            const serv = String(item.serv_id || item.servID || '');
            const block = (item.block_yn || item.BlockYN || '').toUpperCase();

            const matchAsal = !filterAsalKota || asal.includes(filterAsalKota.trim().toLowerCase());
            const matchTujuan = !filterTujuan || tujuan.includes(filterTujuan.trim().toLowerCase());
            const matchServ = !filterServID || serv === filterServID;
            const matchBlock = !filterBlockYN || block === filterBlockYN;

            return matchAsal && matchTujuan && matchServ && matchBlock;
        });
    }, [uncoveredList, filterAsalKota, filterTujuan, filterServID, filterBlockYN]);

    const handleResetFilter = () => {
        setFilterAsalKota('');
        setFilterServID('');
        setFilterTujuan('');
        setFilterBlockYN('');
    };

    // Pipa Pengecekan & Eksekusi Penyimpanan
    const executeSaveToBackend = async (payload) => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/marketing/uncovered-areas/process', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.status === "success") {
                Swal.fire({
                    icon: 'success',
                    title: 'BERHASIL DISIMPAN',
                    text: res.data.message || 'Aturan area tidak dilayani resmi aktif!',
                    confirmButtonColor: '#f59e0b'
                });
                setIsModalOpen(false);
                fetchUncoveredAreas();
            }
        } catch (err) {
            const resData = err.response?.data;

            if (err.response?.status === 409 && resData?.status === "redundant") {
                Swal.fire({
                    icon: 'error',
                    title: 'ATURAN REDUNDAN!',
                    text: resData.message,
                    confirmButtonColor: '#ef4444'
                });
                return;
            }

            if (resData?.status === "conflict_detected") {
                const type = resData.conflictType;
                let textMessage = "";

                if (type === "null_to_specific") {
                    textMessage = `Di database sudah ada aturan untuk SEMUA KOTA (NULL) pada rute ini. Aturan spesifik baru Anda akan menghapus aturan umum lama tersebut. Lanjutkan penggantian?`;
                } else {
                    textMessage = `Di database sudah ada aturan SPESIFIK untuk tujuan ini. Aturan SEMUA KOTA (NULL) yang Anda masukkan akan menghapus seluruh aturan spesifik tersebut agar seragam. Lanjutkan?`;
                }

                Swal.fire({
                    title: 'KONFLIK ATURAN TERDETEKSI!',
                    text: textMessage,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#f59e0b',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'Ya, Hapus & Ganti!',
                    cancelButtonText: 'Batal'
                }).then((result) => {
                    if (result.isConfirmed) {
                        executeSaveToBackend({
                            ...payload,
                            confirmReplace: 'YES'
                        });
                    }
                });
                return;
            }

            Swal.fire('Error', resData?.message || 'Gagal memproses aturan', 'error');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        executeSaveToBackend({ ...formData, editMode });
    };

    const handleOpenAdd = () => {
        setEditMode("False");
        setFormData(defaultForm);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditMode("True");
        setFormData({
            editMode: "True",
            generatedID: item.generated_id || '',
            asalKota: item.asal_kota || item.AsalKota || '',
            servID: item.serv_id || item.servID || 1,
            tujuanPropinsi: item.tujuan_propinsi || item.Tujuan_Propinsi || '',
            tujuanKabupaten: item.tujuan_kabupaten || item.Tujuan_Kabupaten || '',
            tujuanKecamatan: item.tujuan_kecamatan || item.Tujuan_Kecamatan || '',
            blockYN: item.block_yn || item.BlockYN || 'Y',
            validDate: item.valid_date ? item.valid_date.split('T')[0] : new Date().toISOString().split('T')[0],
            confirmReplace: 'NO'
        });
        setIsModalOpen(true);
    };

    const columns = [
        {
            header: 'ID ATURAN',
            accessor: 'generated_id',
            render: (i) => (
                <span className="font-mono font-bold text-slate-700 text-xs">
                    {i.generated_id || '-'}
                </span>
            )
        },
        {
            header: 'ASAL KOTA',
            accessor: 'asal_kota',
            render: (i) => (
                <span className="font-bold text-xs uppercase" style={{ color: '#0f172a' }}>
                    {i.asal_kota || '🌍 SEMUA KOTA (NULL)'}
                </span>
            )
        },
        {
            header: 'SERVID',
            accessor: 'serv_id',
            render: (i) => (
                <span className="px-2 py-0.5 font-bold rounded text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                    Layanan: {i.serv_id || i.servID || '-'}
                </span>
            )
        },
        {
            header: 'TUJUAN WILAYAH',
            render: (i) => (
                <span className="font-semibold text-xs text-sky-700 uppercase">
                    {`${i.tujuan_propinsi || 'SEMUA'} / ${i.tujuan_kabupaten || 'SEMUA'} / ${i.tujuan_kecamatan || 'SEMUA'}`}
                </span>
            )
        },
        {
            header: 'STATUS BLOKIR',
            render: (i) => {
                const isBlocked = (i.block_yn || i.BlockYN) === 'Y';
                return (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${isBlocked ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                        {isBlocked ? 'BLOKIR RUTE' : 'DIIJINKAN'}
                    </span>
                );
            }
        },
        {
            header: 'MASA BERLAKU',
            render: (i) => (
                <span className="font-mono text-xs font-semibold text-slate-700">
                    {i.valid_date ? i.valid_date.split('T')[0] : '-'}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-4 master-uncovered-wrapper">
            {/* 🌟 FORCE CSS: Memastikan kontras teks selalu jelas */}
            <style>
                {`
                .master-uncovered-wrapper table tbody tr td {
                    color: #0f172a !important;
                    font-weight: 600 !important;
                }
                `}
            </style>

            {/* 🌟 PANEL FILTER BERSYARAT (COLLAPSIBLE) */}
            {showFilter && (
                <form onSubmit={(e) => e.preventDefault()} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER ATURAN AREA TIDAK DILAYANI
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">ASAL KOTA</label>
                            <input
                                type="text"
                                placeholder="Cari asal kota..."
                                value={filterAsalKota}
                                onChange={(e) => setFilterAsalKota(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 uppercase"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">JENIS LAYANAN</label>
                            <select
                                value={filterServID}
                                onChange={(e) => setFilterServID(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer bg-white"
                            >
                                <option value="">-- SEMUA LAYANAN --</option>
                                <option value="1">1 - REGULER CARGO</option>
                                <option value="2">2 - EKONOMIS CARGO</option>
                                <option value="3">3 - CHARTER TRUCKING</option>
                                <option value="4">4 - UNIT CARGO</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">TUJUAN WILAYAH</label>
                            <input
                                type="text"
                                placeholder="Cari provinsi / kota / kecamatan..."
                                value={filterTujuan}
                                onChange={(e) => setFilterTujuan(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 uppercase"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS BLOKIR</label>
                            <select
                                value={filterBlockYN}
                                onChange={(e) => setFilterBlockYN(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer bg-white"
                            >
                                <option value="">-- SEMUA STATUS --</option>
                                <option value="Y">BLOKIR RUTE (Y)</option>
                                <option value="N">DIIJINKAN (N)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer flex items-center gap-1.5"
                        >
                            <RotateCcw size={14} /> RESET
                        </button>
                        <button
                            type="button"
                            onClick={fetchUncoveredAreas}
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw size={14} /> REFRESH DATA
                        </button>
                    </div>
                </form>
            )}

            {/* TABEL DATA TEMPLATE */}
            <DataTableTemplate
                title="Master Aturan Area Tidak Dilayani (MKT_M_UncoveredAreas)"
                columns={columns}
                data={filteredList}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleOpenAdd}
                onEdit={handleOpenEdit}
                onDelete={() => { }}
                onFilter={() => setShowFilter(prev => !prev)}
            />

            {/* MODAL TRANSAKSI UTAMA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-2xl p-6 rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'
                        }`}>

                        <div className="flex justify-between items-center pb-3 border-b dark:border-slate-700">
                            <h3 className="text-base font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                <ShieldAlert size={18} />
                                {editMode === "True" ? `EDIT DATA ATURAN LOGISTIK: ${formData.generatedID}` : 'TAMBAH ATURAN AREA TIDAK DILAYANI'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition cursor-pointer">
                                <XIcon size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 text-xs mt-4">
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
                                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>

                                    <div>
                                        <label className="font-black text-gray-400 block mb-1">ASAL KOTA (Kosongkan Untuk Semua Kota)</label>
                                        <input
                                            type="text"
                                            placeholder="Contoh: BEKASI"
                                            className="w-full p-2 border rounded font-bold uppercase outline-none"
                                            style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                            value={formData.asalKota}
                                            onChange={e => setFormData({ ...formData, asalKota: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="font-black text-gray-400 block mb-1">JENIS LAYANAN (SERVID)</label>
                                        <select
                                            className="w-full p-2 border rounded font-bold outline-none cursor-pointer"
                                            style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                            value={formData.servID}
                                            onChange={e => setFormData({ ...formData, servID: parseInt(e.target.value) || 1 })}
                                        >
                                            <option value={1}>1 - REGULER CARGO</option>
                                            <option value={2}>2 - EKONOMIS CARGO</option>
                                            <option value={3}>3 - CHARTER TRUCKING</option>
                                            <option value={4}>4 - UNIT CARGO</option>
                                        </select>
                                    </div>

                                    <div className="col-span-2 border-t pt-3 dark:border-slate-700">
                                        <span className="font-bold text-blue-500 flex items-center gap-1 mb-2">
                                            <Layers size={14} /> CLUSTER GEOGRAFI TUJUAN (Kosongkan Berarti Berlaku Makro)
                                        </span>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="font-black text-gray-400 block mb-0.5">PROVINSI</label>
                                                <input
                                                    type="text"
                                                    placeholder="JAWA BARAT"
                                                    className="w-full p-2 border rounded uppercase font-bold outline-none"
                                                    style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                                    value={formData.tujuanPropinsi}
                                                    onChange={e => setFormData({ ...formData, tujuanPropinsi: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="font-black text-gray-400 block mb-0.5">KABUPATEN/KOTA</label>
                                                <input
                                                    type="text"
                                                    placeholder="BEKASI"
                                                    className="w-full p-2 border rounded uppercase font-bold outline-none"
                                                    style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                                    value={formData.tujuanKabupaten}
                                                    onChange={e => setFormData({ ...formData, tujuanKabupaten: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="font-black text-gray-400 block mb-0.5">KECAMATAN</label>
                                                <input
                                                    type="text"
                                                    placeholder="CIBARUSAH"
                                                    className="w-full p-2 border rounded uppercase font-bold outline-none"
                                                    style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                                    value={formData.tujuanKecamatan}
                                                    onChange={e => setFormData({ ...formData, tujuanKecamatan: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t pt-3 dark:border-slate-700">
                                        <label className="font-black text-gray-400 block mb-1">STATUS BLOCKING (BLOCKYN)</label>
                                        <div className="flex items-center gap-4 h-[38px] font-bold">
                                            <label className="flex items-center gap-1.5 cursor-pointer text-red-500">
                                                <input
                                                    type="radio"
                                                    name="blockYN"
                                                    className="w-4 h-4 accent-red-600"
                                                    checked={formData.blockYN === 'Y'}
                                                    onChange={() => setFormData({ ...formData, blockYN: 'Y' })}
                                                />
                                                <span>BLOKIR RUTE</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer text-emerald-600">
                                                <input
                                                    type="radio"
                                                    name="blockYN"
                                                    className="w-4 h-4 accent-emerald-600"
                                                    checked={formData.blockYN === 'N'}
                                                    onChange={() => setFormData({ ...formData, blockYN: 'N' })}
                                                />
                                                <span>IJINKAN LEWAT</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="border-t pt-3 dark:border-slate-700">
                                        <label className="font-black text-gray-400 block mb-1 flex items-center gap-1">
                                            <Calendar size={13} /> MASA BERLAKU ATURAN (VALID DATE)
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full p-2 border rounded font-mono font-bold outline-none"
                                            style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                            value={formData.validDate}
                                            onChange={e => setFormData({ ...formData, validDate: e.target.value })}
                                            required
                                        />
                                    </div>

                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t mt-auto" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border font-bold hover:scale-105 active:scale-95 transition cursor-pointer"
                                    style={{ backgroundColor: isDarkMode ? '#334155' : '#f1f5f9', color: isDarkMode ? '#e2e8f0' : '#475569', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 font-black shadow-md transition hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    <Save size={14} />
                                    Simpan Aturan
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterAreaTidakDilayani;