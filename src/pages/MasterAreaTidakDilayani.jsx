import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { ShieldAlert, Plus, X as XIcon, Save, Calendar, Layers } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

const MasterAreaTidakDilayani = () => {
    const { isDarkMode } = useDarkMode();
    const [uncoveredList, setUncoveredList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState("False");

    const defaultForm = {
        generatedID: '',
        asalKota: '',
        servID: 1, // Default ke layanan 1 (misal Reguler)
        tujuanPropinsi: '',
        tujuanKabupaten: '',
        tujuanKecamatan: '',
        blockYN: 'Y',
        validDate: new Date().toISOString().split('T')[0], // Hari ini bray
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
            // Ganti endpoint ini sesuai dengan route GET list data lu di backend bray
            const res = await api.get('/marketing/uncovered-areas', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUncoveredList(res.data?.data || res.data || []);
        } catch (err) {
            console.error(err);
            // Sediakan cadangan array kosong jika route GET belum dibuat di backend bray
            setUncoveredList([]);
        } finally {
            setLoading(false);
        }
    };

    // Pipa Pengecekan & Eksekusi Penyimpanan
    const executeSaveToBackend = async (payload) => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/marketing/uncovered-areas/process', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // 🟢 A) RESPON 200 OK - SUKSES MUTLAK
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

            // 🛡️ LAPIS 1: PROTEKSI REDUNDANSI (Status 409 Conflict)
            if (err.response?.status === 409 && resData?.status === "redundant") {
                Swal.fire({
                    icon: 'error',
                    title: 'ATURAN REDUNDAN!',
                    text: resData.message,
                    confirmButtonColor: '#ef4444'
                });
                return;
            }

            // 🛡️ LAPIS 2: DETEKSI KONFLIK HIERARKI (Status 202 / GORM Intercept)
            if (resData?.status === "conflict_detected") {
                const type = resData.conflictType;
                let textMessage = "";

                if (type === "null_to_specific") {
                    textMessage = `Di database sudah ada aturan untuk SEMUA KOTA (NULL) pada rute ini. Aturan spesifik baru Anda akan menghapus aturan umum lama tersebut. Lanjutkan penggantian?`;
                } else {
                    textMessage = `Di database sudah ada aturan SPESIFIK untuk tujuan ini bray. Aturan SEMUA KOTA (NULL) yang Anda masukkan akan menghapus seluruh aturan spesifik tersebut agar seragam. Lanjutkan?`;
                }

                // Tampilkan Modal Konfirmasi Dua Arah Mewah SweetAlert2
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
                        // Jika admin setuju, tembak ulang dengan flag confirmReplace = YES bray!
                        executeSaveToBackend({
                            ...payload,
                            confirmReplace: 'YES'
                        });
                    }
                });
                return;
            }

            // Error umum lainnya bray
            Swal.fire('Error', resData?.message || 'Gagal memproses aturan loper', 'error');
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
        { header: 'ID ATURAN', accessor: 'generated_id', render: (i) => <span className="font-mono font-bold text-slate-500">{i.generated_id}</span> },
        { header: 'ASAL KOTA', accessor: 'asal_kota', render: (i) => <span className="font-bold">{i.asal_kota || '🌍 SEMUA KOTA (NULL)'}</span> },
        { header: 'SERVID', accessor: 'serv_id', render: (i) => <span className="px-2 py-0.5 font-bold rounded bg-slate-100 text-slate-700">Layanan: {i.serv_id}</span> },
        { header: 'TUJUAN WILAYAH', render: (i) => <span className="font-medium text-blue-600 dark:text-blue-400">{`${i.tujuan_propinsi || 'SEMUA'} / ${i.tujuan_kabupaten || 'SEMUA'} / ${i.tujuan_kecamatan || 'SEMUA'}`}</span> },
        { header: 'BLOCKYN', render: (i) => <span className={`px-2 py-0.5 rounded-full text-xs font-black ${i.block_yn === 'Y' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{i.block_yn === 'Y' ? '❌ BLOCKED' : '✅ OPEN'}</span> },
        { header: 'MASA BERLAKU', render: (i) => <span className="font-mono text-xs">{i.valid_date ? i.valid_date.split('T')[0] : '-'}</span> }
    ];

    return (
        <div className={`min-h-screen p-4 space-y-4 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
            <DataTableTemplate title="Master Aturan Area Tidak Dilayani (MKT_M_UncoveredAreas)" columns={columns} data={uncoveredList} loading={loading} isDarkMode={isDarkMode} onAdd={handleOpenAdd} onEdit={handleOpenEdit} onDelete={() => { }} />

            {/* MODAL TRANSAKSI UTAMA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-2xl p-6 rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>

                        <div className="flex justify-between items-center pb-3 border-b dark:border-slate-700">
                            <h3 className="text-base font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                <ShieldAlert size={18} />
                                {editMode === "True" ? `EDIT DATA ATURAN LOGISTIK: ${formData.generatedID}` : 'TAMBAH ATURAN AREA TIDAK DILAYANI'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition"><XIcon size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 text-xs mt-4">
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">

                                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>

                                    {/* Kolom 1: Asal Kota & ID Layanan */}
                                    <div>
                                        <label className="font-black text-gray-400 block mb-1">ASAL KOTA (Kosongkan Untuk Semua Kota)</label>
                                        <input type="text" placeholder="Contoh: BEKASI" className="w-full p-2 border rounded font-bold uppercase outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.asalKota} onChange={e => setFormData({ ...formData, asalKota: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="font-black text-gray-400 block mb-1">JENIS LAYANAN (SERVID)</label>
                                        <select className="w-full p-2 border rounded font-bold outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.servID} onChange={e => setFormData({ ...formData, servID: parseInt(e.target.value) || 1 })}>
                                            <option value={1}>1 - REGULER CARGO</option>
                                            <option value={2}>2 - EKONOMIS CARGO</option>
                                            <option value={3}>3 - CHARTER TRUCKING</option>
                                            <option value={4}>4 - UNIT CARGO</option>
                                        </select>
                                    </div>

                                    {/* Kolom 2: Cluster Geografi Tujuan se-Nusantara */}
                                    <div className="col-span-2 border-t pt-3 dark:border-slate-700">
                                        <span className="font-bold text-blue-500 flex items-center gap-1 mb-2"><Layers size={14} /> CLUSTER GEOGRAFI TUJUAN (Kosongkan Berarti Berlaku Makro)</span>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="font-black text-gray-400 block mb-0.5">PROVINSI</label>
                                                <input type="text" placeholder="JAWA BARAT" className="w-full p-2 border rounded uppercase font-bold outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.tujuanPropinsi} onChange={e => setFormData({ ...formData, tujuanPropinsi: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="font-black text-gray-400 block mb-0.5">KABUPATEN/KOTA</label>
                                                <input type="text" placeholder="BEKASI" className="w-full p-2 border rounded uppercase font-bold outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.tujuanKabupaten} onChange={e => setFormData({ ...formData, tujuanKabupaten: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="font-black text-gray-400 block mb-0.5">KECAMATAN</label>
                                                <input type="text" placeholder="CIBARUSAH" className="w-full p-2 border rounded uppercase font-bold outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.tujuanKecamatan} onChange={e => setFormData({ ...formData, tujuanKecamatan: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Kolom 3: Status & Masa Berlaku */}
                                    <div className="border-t pt-3 dark:border-slate-700">
                                        <label className="font-black text-gray-400 block mb-1">STATUS BLOCKING (BLOCKYN)</label>
                                        <div className="flex items-center gap-4 h-[38px] font-bold">
                                            <label className="flex items-center gap-1.5 cursor-pointer text-red-500">
                                                <input type="radio" name="blockYN" className="w-4 h-4 accent-red-600" checked={formData.blockYN === 'Y'} onChange={() => setFormData({ ...formData, blockYN: 'Y' })} />
                                                <span>❌ BLOKIR RUTE</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer text-green-500">
                                                <input type="radio" name="blockYN" className="w-4 h-4 accent-green-600" checked={formData.blockYN === 'N'} onChange={() => setFormData({ ...formData, blockYN: 'N' })} />
                                                <span>✅ IJINKAN LEWAT</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="border-t pt-3 dark:border-slate-700">
                                        <label className="font-black text-gray-400 block mb-1 flex items-center gap-1"><Calendar size={13} /> MASA BERLAKU ATURAN (VALID DATE)</label>
                                        <input type="date" className="w-full p-2 border rounded font-mono font-bold outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.validDate} onChange={e => setFormData({ ...formData, validDate: e.target.value })} required />
                                    </div>

                                </div>
                            </div>

                            {/* FOOTER ACTION STICKY */}
                            <div className="flex justify-end gap-3 pt-3 border-t mt-auto" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border font-bold hover:scale-105 active:scale-95 transition" style={{ backgroundColor: isDarkMode ? '#334155' : '#f1f5f9', color: isDarkMode ? '#e2e8f0' : '#475569', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}>
                                    Batal
                                </button>
                                <button type="submit" className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 font-black shadow-md transition hover:scale-105 active:scale-95">
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