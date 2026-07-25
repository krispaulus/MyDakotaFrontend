import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate'; // Jalur Relatif Lapis Baja Anti-Vite Error bray
import Swal from 'sweetalert2';
import { Truck, ShieldAlert, Wrench, Search, Calendar, Map, CheckCircle, AlertTriangle, AlertCircle, Plus, Edit, Trash2, X as XIcon } from 'lucide-react';

const MasterKendaraan = () => {
    const isDarkMode = false;

    // State Data Kendaraan & Loading[cite: 3]
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);

    // State Filter[cite: 3]
    const [filterNopol, setFilterNopol] = useState('');
    const [filterStatus, setFilterAktif] = useState('Y');

    // State Ranjau Auto Pop-up Expired Service[cite: 3]
    const [expiredServiceList, setExpiredServiceList] = useState([]);
    const [showExpiredModal, setShowExpiredModal] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    // 👑 STATE MODAL DILETAK KAN DI ATAS BIAR TIDAK BENTROK PANGGILAN BRAY![cite: 3]
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        kend_id: '', kend_pemilik: '', kend_pt: 'A', kend_leasing: 'A',
        kend_alamat: '', kend_lokasiid: '', kend_merk: '', kend_type: '',
        kend_jenis: '', kend_thnbuat: '2026', kend_thnrakit: '2026',
        kend_isisilinder: '0', kend_warna: '', kend_nik: '', kend_nomesin: '',
        kend_identid: '', kend_warnatnkb: '', kend_bahanbakar: '', kend_jarak: '0',
        kend_warnaplat: 'h', kend_berlakustnk: '2026-07-14', kend_berlakupajak: '2026-07-14',
        kend_berlakukir: '2026-07-14', kend_serahterimatime: '2026-07-14',
        kend_serahterimaid: '', kend_sopir1: '', kend_sopir2: ''
    });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedNopol, setSelectedNopol] = useState('');
    const [editFormData, setEditFormData] = useState({
        kend_pemilik: '', kend_pt: 'A', kend_leasing: 'A',
        kend_alamat: '', kend_lokasiid: '', kend_merk: '', kend_type: '',
        kend_jenis: '', kend_thnbuat: '2026', kend_thnrakit: '2026',
        kend_isisilinder: '0', kend_warna: '', kend_nik: '', kend_nomesin: '',
        kend_identid: '', kend_warnatnkb: '', kend_bahanbakar: '', kend_jarak: '0',
        kend_warnaplat: 'h', kend_berlakustnk: '2026-07-14', kend_berlakupajak: '2026-07-14',
        kend_berlakukir: '2026-07-14', kend_serahterimatime: '2026-07-14',
        kend_serahterimaid: '', kend_sopir1: '', kend_sopir2: '', kend_aktifyn: 'Y'
    });

    useEffect(() => {
        fetchMasterKendaraan();
        checkExpiredService();
    }, []);

    const fetchMasterKendaraan = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // 👑 Tembak ke endpoint kendaraan internal yang benar bray, bukan sewa-kendaraan!
            // 👑 Singkirkan filter tanggal gaib yang memicu ReferenceError!
            const res = await api.get(`/master/kendaraan?nopol=${filterNopol}&aktif=${filterStatus}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVehicles(res.data?.data || []);
        } catch (err) {
            console.error(err);
            Swal.fire('Gagal', 'Gagal menarik data master kendaraan', 'error');
        } finally {
            setLoading(false);
        }
    };

    const checkExpiredService = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/master/kendaraan/expired-service', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dataExpired = res.data?.data || [];
            setExpiredServiceList(dataExpired);
            if (dataExpired.length > 0) {
                setShowExpiredModal(true);
            }
        } catch (err) {
            console.error("Gagal mendeteksi status bengkel service:", err);
        }
    };

    const handleSelesaiService = async (kendId) => {
        if (!window.confirm(`Yakin kendaraan ${kendId} sudah selesai service?`)) return;
        setProcessingId(kendId);
        try {
            const token = localStorage.getItem('token');
            await api.put(`/master/kendaraan/selesai-service/${kendId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const updatedList = expiredServiceList.filter(item => item.kend_id !== kendId);
            setExpiredServiceList(updatedList);
            if (updatedList.length === 0) {
                setShowExpiredModal(false);
            }
            fetchMasterKendaraan();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal memperbarui status bengkel', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleTambahArmada = () => {
        setIsAddModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.kend_id) return Swal.fire('Error', 'No. Polisi Harus Diisi bray!', 'error');
        try {
            const token = localStorage.getItem('token');
            await api.post('/master/master/kendaraan', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Sukses', 'Data kendaraan berhasil disimpan', 'success');
            setIsAddModalOpen(false);
            fetchMasterKendaraan();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal menyimpan armada', 'error');
        }
    };

    const handleRegistrasiService = () => {
        Swal.fire({
            title: 'Registrasi Service Masuk Bengkel',
            html: `
                <input id="swal-svc-nopol" class="swal2-input" placeholder="No. Polisi Armada Truk" style="text-transform:uppercase;">
                <label style="font-size:11px; display:block; text-align:left; margin: 10px 20px 0 20px;">TANGGAL ESTIMASI SELESAI</label>
                <input id="swal-svc-end" type="date" class="swal2-input">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Masuk Bengkel',
            preConfirm: () => {
                return {
                    kendid: document.getElementById('swal-svc-nopol').value.trim().toUpperCase(),
                    tglselesai: document.getElementById('swal-svc-end').value
                }
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                if (!result.value.kendid || !result.value.tglselesai) return Swal.fire('Peringatan', 'Semua field wajib diisi bray.', 'warning');
                try {
                    const token = localStorage.getItem('token');
                    const params = new URLSearchParams();
                    params.append('kendid', result.value.kendid);
                    params.append('tglselesai', result.value.tglselesai);

                    await api.post('/master/kendaraan/masuk-service', params, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    });
                    Swal.fire('Berhasil', `Armada ${result.value.kendid} resmi masuk daftar perbaikan`, 'success');
                    fetchMasterKendaraan();
                    checkExpiredService();
                } catch (err) { Swal.fire('Gagal', 'Gagal memproses pendaftaran service', 'error'); }
            }
        });
    };

    const handleEditArmada = (item) => {
        setSelectedNopol(item.kend_id);
        // 🛡️ AMAN DARIPADA TYPEERROR SPLIT PADA POINTER STRING KOSONG BRAY!
        const safeSplit = (dateStr) => {
            if (!dateStr || !dateStr.includes('T')) return '2026-07-14';
            return dateStr.split('T')[0];
        };

        setEditFormData({
            kend_pemilik: item.kend_pemilik || '',
            kend_pt: item.kend_pt || 'A',
            kend_leasing: item.kend_leasing || 'A',
            kend_alamat: item.kend_alamat || '',
            kend_lokasiid: item.kend_lokasiid || '',
            kend_merk: item.kend_merk || '',
            kend_type: item.kend_type || '',
            kend_jenis: item.kend_jenis || '',
            kend_thnbuat: item.kend_thnbuat || '2026',
            kend_thnrakit: item.kend_thnrakit || '2026',
            kend_isisilinder: item.kend_isisilinder || '0',
            kend_warna: item.kend_warna || '',
            kend_nik: item.kend_nik || '',
            kend_nomesin: item.kend_nomesin || '',
            kend_identid: item.kend_identid || '',
            kend_warnatnkb: item.kend_warnatnkb || '',
            kend_bahanbakar: item.kend_bahanbakar || '',
            kend_jarak: item.kend_jarak || '0',
            kend_warnaplat: item.kend_warnaplat || 'h',
            kend_berlakustnk: safeSplit(item.kend_berlakustnk),
            kend_berlakupajak: safeSplit(item.kend_berlakupajak),
            kend_berlakukir: safeSplit(item.kend_berlakukir),
            kend_serahterimatime: safeSplit(item.kend_serahterimatime),
            kend_serahterimaid: item.kend_serahterimaid || '',
            kend_sopir1: item.kend_sopir1 || '',
            kend_sopir2: item.kend_sopir2 || '',
            kend_aktifyn: item.kend_aktifyn || 'Y'
        });
        setIsEditModalOpen(true);
    };

    const handleEditFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put(`/master/kendaraan/${selectedNopol}`, editFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Sukses', 'Data kendaraan berhasil diperbarui', 'success');
            setIsEditModalOpen(false);
            fetchMasterKendaraan();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal memperbarui data armada bray', 'error');
        }
    };

    const columnsKendaraan = [
        { header: 'NO. POLISI', accessor: 'kend_id', render: (i) => <span className="font-mono font-bold text-blue-600 text-sm cursor-pointer hover:underline" onClick={() => handleEditArmada(i)}>{i.kend_id}</span> },
        { header: 'PENGGUNA', accessor: 'kend_pt', render: (i) => <span className="text-slate-700 text-sm font-medium">{i.kend_pt === 'A' ? 'DBS' : i.kend_pt === 'B' ? 'DLB' : 'DLI'}</span> },
        { header: 'MERK / TIPE', render: (i) => <span className="text-slate-800 text-sm">{i.kend_merk || '-'} / {i.kend_type || '-'}</span> },
        { header: 'BERLAKU STNK', accessor: 'kend_berlakustnk', render: (i) => <span className="font-mono text-slate-600 text-sm">{i.kend_berlakustnk ? i.kend_berlakustnk.split('T')[0] : '-'}</span> },
        {
            header: 'STATUS GPS TRACKER',
            render: (i) => i.kend_gps_imei ? (
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">GPS ACTIVE</span>
            ) : (
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">NO GPS MODULE</span>
            )
        },
        {
            header: 'STATUS BENGKEL',
            render: (i) => i.kend_serviceyn === 'Y' ? (
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">UNDER SERVICE</span>
            ) : (
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">READY</span>
            )
        },
        {
            header: 'AKTIF',
            accessor: 'kend_aktifyn',
            render: (i) => i.kend_aktifyn === 'Y' ? (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">YA</span>
            ) : (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">TIDAK</span>
            )
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <Truck size={20} className="text-blue-600" /> Master Inventaris Kendaraan Armada
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={handleRegistrasiService} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition"><Wrench size={13} /> SERVICE KENDARAAN</button>
                    <button onClick={handleTambahArmada} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition"><Plus size={13} /> TAMBAH DATA</button>
                </div>
            </div>

            <div className="p-4 rounded-xl border grid grid-cols-3 gap-4 items-end text-xs bg-white border-slate-200 shadow-xs">
                <div>
                    <label className="font-medium text-slate-500 text-xs block mb-1.5">CARI NO. POLISI</label>
                    <input type="text" placeholder="Contoh: B 1234 ABC..." className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium bg-white text-slate-800 outline-none focus:border-blue-500 shadow-xs uppercase" value={filterNopol} onChange={e => setFilterNopol(e.target.value)} />
                </div>
                <div>
                    <label className="font-medium text-slate-500 text-xs block mb-1.5">STATUS AKTIF ARMADA</label>
                    <select className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium bg-white text-slate-800 outline-none focus:border-blue-500 shadow-xs" value={filterStatus} onChange={e => setFilterAktif(e.target.value)}>
                        <option value="Y">YA (ARMADA JALAN OPERASIONAL)</option>
                        <option value="N">TIDAK (ARMADA NON-AKTIF)</option>
                    </select>
                </div>
                <button onClick={fetchMasterKendaraan} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-md transition h-[42px]"><Search size={14} /> Cari Armada</button>
            </div>

            <DataTableTemplate
                title="Daftar Kendaraan Aktif Logistik Dakota Cargo (glb_m_kendaraan)"
                columns={columnsKendaraan}
                data={vehicles}
                loading={loading}
                isDarkMode={false}
                onAdd={handleTambahArmada}
                onEdit={handleEditArmada}
                onDelete={() => { }}
            />

            {/* MODAL AUTO POP-UP EXPIRED SERVICE */}
            {showExpiredModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-3xl p-6 rounded-2xl shadow-2xl border flex flex-col bg-white text-slate-900 border-red-200">
                        <div className="flex items-center gap-3 pb-3 border-b border-red-100 text-red-600">
                            <AlertCircle size={28} className="animate-bounce" />
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-wide">KENDARAAN MELEWATI TANGGAL SELESAI SERVICE!</h3>
                                <p className="text-slate-500 text-xs font-normal mt-0.5">Tentukan status perbaikan kendaraan di bawah ini sebelum melanjutkan aktivitas program.</p>
                            </div>
                        </div>
                        <div className="mt-4 overflow-x-auto max-h-[300px] border border-slate-100 rounded-xl shadow-xs">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-red-50 text-red-800 text-xs font-bold uppercase tracking-wider sticky top-0">
                                    <tr>
                                        <th className="p-3 border-b border-red-100">NO. POLISI</th>
                                        <th className="p-3 border-b border-red-100">TGL MULAI SERVICE</th>
                                        <th className="p-3 border-b border-red-100">ESTIMASI SELESAI</th>
                                        <th className="p-3 border-b border-red-100 text-center">AKSI TINDAKAN</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {expiredServiceList.map((item) => (
                                        <tr key={item.kend_id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-3 font-mono font-black text-blue-600">{item.kend_id}</td>
                                            <td className="p-3 font-mono text-xs">{item.kend_servicestartdate ? item.kend_servicestartdate.split('T')[0] : '-'}</td>
                                            <td className="p-3 font-mono text-xs text-rose-600 font-semibold">{item.kend_serviceenddate ? item.kend_serviceenddate.split('T')[0] : '-'}</td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleSelesaiService(item.kend_id)}
                                                    disabled={processingId === item.kend_id}
                                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-md shadow-xs transition"
                                                >
                                                    {processingId === item.kend_id ? 'Proses...' : '🔧 Selesai Service'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL KUSTOM TAMBAH DATA KENDARAAN */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-6xl p-6 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 flex flex-col my-8">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-blue-400 text-blue-700 font-bold text-sm tracking-wide rounded-sm uppercase">TAMBAH DATA KENDARAAN</span>
                        </div>
                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-2">
                                    <label className="block mb-1">NO POLISI</label>
                                    <input type="text" required className="w-full p-2 border border-slate-300 rounded bg-amber-50 uppercase text-sm font-black" value={formData.kend_id} onChange={e => setFormData({ ...formData, kend_id: e.target.value.replace(/ /g, "").toUpperCase() })} />
                                </div>
                                <div className="col-span-4">
                                    <label className="block mb-1">NAMA PEMILIK</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_pemilik} onChange={e => setFormData({ ...formData, kend_pemilik: e.target.value })} />
                                </div>
                                <div className="col-span-3">
                                    <label className="block mb-1">PENGGUNA (PENGHITUNGAN HANDLING)</label>
                                    <div className="flex gap-3 p-2 border border-slate-200 rounded bg-slate-50 font-normal">
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="pt" checked={formData.kend_pt === 'A'} onChange={() => setFormData({ ...formData, kend_pt: 'A' })} /> DBS</label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="pt" checked={formData.kend_pt === 'B'} onChange={() => setFormData({ ...formData, kend_pt: 'B' })} /> DLB</label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="pt" checked={formData.kend_pt === 'C'} onChange={() => setFormData({ ...formData, kend_pt: 'C' })} /> DLI</label>
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <label className="block mb-1">LEASING (LAPORAN ASET)</label>
                                    <div className="flex gap-3 p-2 border border-slate-200 rounded bg-slate-50 font-normal">
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="leasing" checked={formData.kend_leasing === 'A'} onChange={() => setFormData({ ...formData, kend_leasing: 'A' })} /> DBS</label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="leasing" checked={formData.kend_leasing === 'B'} onChange={() => setFormData({ ...formData, kend_leasing: 'B' })} /> DLB</label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="leasing" checked={formData.kend_leasing === 'C'} onChange={() => setFormData({ ...formData, kend_leasing: 'C' })} /> DLI</label>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-6">
                                    <label className="block mb-1">ALAMAT</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_alamat} onChange={e => setFormData({ ...formData, kend_alamat: e.target.value })} />
                                </div>
                                <div className="col-span-6">
                                    <label className="block mb-1">CABANG</label>
                                    <select className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_lokasiid} onChange={e => setFormData({ ...formData, kend_lokasiid: e.target.value })}>
                                        <option value="">-- PILIH CABANG PENEMPATAN --</option>
                                        <option value="853">ADIWERNA AGEN</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block mb-1">MERK/TIPE</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_merk} onChange={e => setFormData({ ...formData, kend_merk: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">JENIS/MODEL</label>
                                    <select className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_jenis} onChange={e => setFormData({ ...formData, kend_jenis: e.target.value })}>
                                        <option value="K0001">Blind Van</option>
                                        <option value="K0002">Colt Diesel</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1">TAHUN PEMBUATAN</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_thnbuat} onChange={e => setFormData({ ...formData, kend_thnbuat: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">TAHUN PERAKITAN</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_thnrakit} onChange={e => setFormData({ ...formData, kend_thnrakit: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block mb-1">ISI SILINDER</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_isisilinder} onChange={e => setFormData({ ...formData, kend_isisilinder: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">WARNA</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_warna} onChange={e => setFormData({ ...formData, kend_warna: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">NO. RANGKA/NIK</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_nik} onChange={e => setFormData({ ...formData, kend_nik: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">NO. MESIN</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_nomesin} onChange={e => setFormData({ ...formData, kend_nomesin: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block mb-1">IDENTITAS</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_identid} onChange={e => setFormData({ ...formData, kend_identid: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">WARNA TNKB</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_warnatnkb} onChange={e => setFormData({ ...formData, kend_warnatnkb: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">BAHAN BAKAR</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_bahanbakar} onChange={e => setFormData({ ...formData, kend_bahanbakar: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">JARAK 1 LITER :</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_jarak} onChange={e => setFormData({ ...formData, kend_jarak: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block mb-1">WARNA PLAT KENDARAAN :</label>
                                    <select className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_warnaplat} onChange={e => setFormData({ ...formData, kend_warnaplat: e.target.value })}>
                                        <option value="h">HITAM</option>
                                        <option value="k">KUNING</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1">BERLAKU STNK S/D :</label>
                                    <input type="date" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_berlakustnk} onChange={e => setFormData({ ...formData, kend_berlakustnk: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">BERLAKU PAJAK S/D :</label>
                                    <input type="date" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_berlakupajak} onChange={e => setFormData({ ...formData, kend_berlakupajak: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">BERLAKU KIR S/D :</label>
                                    <input type="date" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_berlakukir} onChange={e => setFormData({ ...formData, kend_berlakukir: e.target.value })} />
                                </div>
                            </div>
                            <div className="text-center pt-2 pb-1 border-t border-slate-100 mt-4">
                                <span className="px-4 py-1 border border-dashed border-cyan-400 text-cyan-700 font-bold text-[11px] rounded-sm uppercase">TAMBAHAN RINCIAN BARU (WAJIB DIISI)</span>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block mb-1">TGL SERAH TERIMA</label>
                                    <input type="date" className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_serahterimatime} onChange={e => setFormData({ ...formData, kend_serahterimatime: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">PENERIMA</label>
                                    <select className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_serahterimaid} onChange={e => setFormData({ ...formData, kend_serahterimaid: e.target.value })}>
                                        <option value="">-- PILIH KARYAWAN --</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1">DRIVER 1</label>
                                    <select className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_sopir1} onChange={e => setFormData({ ...formData, kend_sopir1: e.target.value })}>
                                        <option value="">-- PILIH SOPIR UTAMA --</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1">DRIVER 2</label>
                                    <select className="w-full p-2 border border-slate-300 rounded font-normal" value={formData.kend_sopir2} onChange={e => setFormData({ ...formData, kend_sopir2: e.target.value })}>
                                        <option value="">-- PILIH SOPIR CADANGAN --</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-200 mt-6">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2 border border-slate-300 text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 transition tracking-wide text-xs uppercase shadow-xs">CANCEL</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg transition tracking-wide text-xs uppercase shadow-md">ADD VEHICLE</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL KUSTOM EDIT DATA KENDARAAN */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-6xl p-6 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 flex flex-col my-8">
                        <div className="text-center border-b pb-3 mb-4">
                            <span className="px-4 py-1.5 border border-dashed border-amber-500 text-amber-700 font-bold text-sm tracking-wide rounded-sm uppercase">EDIT DATA KENDARAAN: {selectedNopol}</span>
                        </div>
                        <form onSubmit={handleEditFormSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-2">
                                    <label className="block mb-1">NO POLISI</label>
                                    <input type="text" disabled className="w-full p-2 border border-slate-300 rounded bg-slate-100 uppercase text-sm font-black text-slate-500 cursor-not-allowed" value={selectedNopol} />
                                </div>
                                <div className="col-span-4">
                                    <label className="block mb-1">NAMA PEMILIK</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_pemilik} onChange={e => setEditFormData({ ...editFormData, kend_pemilik: e.target.value })} />
                                </div>
                                <div className="col-span-3">
                                    <label className="block mb-1">PENGGUNA (PENGHITUNGAN HANDLING)</label>
                                    <div className="flex gap-3 p-2 border border-slate-200 rounded bg-slate-50 font-normal">
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="edit_pt" checked={editFormData.kend_pt === 'A'} onChange={() => setEditFormData({ ...editFormData, kend_pt: 'A' })} /> DBS</label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="edit_pt" checked={editFormData.kend_pt === 'B'} onChange={() => setEditFormData({ ...editFormData, kend_pt: 'B' })} /> DLB</label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="edit_pt" checked={editFormData.kend_pt === 'C'} onChange={() => setEditFormData({ ...editFormData, kend_pt: 'C' })} /> DLI</label>
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <label className="block mb-1">LEASING (LAPORAN ASET)</label>
                                    <div className="flex gap-3 p-2 border border-slate-200 rounded bg-slate-50 font-normal">
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="edit_leasing" checked={editFormData.kend_leasing === 'A'} onChange={() => setEditFormData({ ...editFormData, kend_leasing: 'A' })} /> DBS</label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="edit_leasing" checked={editFormData.kend_leasing === 'B'} onChange={() => setEditFormData({ ...editFormData, kend_leasing: 'B' })} /> DLB</label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="edit_leasing" checked={editFormData.kend_leasing === 'C'} onChange={() => setEditFormData({ ...editFormData, kend_leasing: 'C' })} /> DLI</label>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-6">
                                    <label className="block mb-1">ALAMAT</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_alamat} onChange={e => setEditFormData({ ...editFormData, kend_alamat: e.target.value })} />
                                </div>
                                <div className="col-span-6">
                                    <label className="block mb-1">CABANG</label>
                                    <select className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_lokasiid} onChange={e => setEditFormData({ ...editFormData, kend_lokasiid: e.target.value })}>
                                        <option value="">-- PILIH CABANG PENEMPATAN --</option>
                                        <option value="853">ADIWERNA AGEN</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block mb-1">MERK/TIPE</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_merk} onChange={e => setEditFormData({ ...editFormData, kend_merk: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">JENIS/MODEL</label>
                                    <select className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_jenis} onChange={e => setEditFormData({ ...editFormData, kend_jenis: e.target.value })}>
                                        <option value="K0001">Blind Van</option>
                                        <option value="K0002">Colt Diesel</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1">TAHUN PEMBUATAN</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_thnbuat} onChange={e => setEditFormData({ ...editFormData, kend_thnbuat: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">TAHUN PERAKITAN</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_thnrakit} onChange={e => setEditFormData({ ...editFormData, kend_thnrakit: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block mb-1">ISI SILINDER</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_isisilinder} onChange={e => setEditFormData({ ...editFormData, kend_isisilinder: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">WARNA</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_warna} onChange={e => setEditFormData({ ...editFormData, kend_warna: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">NO. RANGKA/NIK</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_nik} onChange={e => setEditFormData({ ...editFormData, kend_nik: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">NO. MESIN</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_nomesin} onChange={e => setEditFormData({ ...editFormData, kend_nomesin: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block mb-1">IDENTITAS</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_identid} onChange={e => setEditFormData({ ...editFormData, kend_identid: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">WARNA TNKB</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_warnatnkb} onChange={e => setEditFormData({ ...editFormData, kend_warnatnkb: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">BAHAN BAKAR</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_bahanbakar} onChange={e => setEditFormData({ ...editFormData, kend_bahanbakar: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">JARAK 1 LITER :</label>
                                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_jarak} onChange={e => setEditFormData({ ...editFormData, kend_jarak: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block mb-1">WARNA PLAT KENDARAAN :</label>
                                    <select className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_warnaplat} onChange={e => setEditFormData({ ...editFormData, kend_warnaplat: e.target.value })}>
                                        <option value="h">HITAM</option>
                                        <option value="k">KUNING</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1">BERLAKU STNK S/D :</label>
                                    <input type="date" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_berlakustnk} onChange={e => setEditFormData({ ...editFormData, kend_berlakustnk: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">BERLAKU PAJAK S/D :</label>
                                    <input type="date" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_berlakupajak} onChange={e => setEditFormData({ ...editFormData, kend_berlakupajak: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">BERLAKU KIR S/D :</label>
                                    <input type="date" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_berlakukir} onChange={e => setEditFormData({ ...editFormData, kend_berlakukir: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block mb-1 text-blue-600">ARMADA INI AKTIF OPERASIONAL?</label>
                                    <select className="w-full p-2 border border-blue-300 rounded font-black bg-blue-50 text-blue-800" value={editFormData.kend_aktifyn} onChange={e => setEditFormData({ ...editFormData, kend_aktifyn: e.target.value })}>
                                        <option value="Y">YA (ARMADA JALAN)</option>
                                        <option value="N">TIDAK (ARMADA NON-AKTIF)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="text-center pt-2 pb-1 border-t border-slate-100 mt-4">
                                <span className="px-4 py-1 border border-dashed border-cyan-400 text-cyan-700 font-bold text-[11px] rounded-sm uppercase">TAMBAHAN RINCIAN BARU (WAJIB DIISI)</span>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="block mb-1">TGL SERAH TERIMA</label>
                                    <input type="date" className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_serahterimatime} onChange={e => setEditFormData({ ...editFormData, kend_serahterimatime: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block mb-1">PENERIMA</label>
                                    <select className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_serahterimaid} onChange={e => setEditFormData({ ...editFormData, kend_serahterimaid: e.target.value })}>
                                        <option value="">-- PILIH KARYAWAN --</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1">DRIVER 1</label>
                                    <select className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_sopir1} onChange={e => setEditFormData({ ...editFormData, kend_sopir1: e.target.value })}>
                                        <option value="">-- PILIH SOPIR UTAMA --</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1">DRIVER 2</label>
                                    <select className="w-full p-2 border border-slate-300 rounded font-normal" value={editFormData.kend_sopir2} onChange={e => setEditFormData({ ...editFormData, kend_sopir2: e.target.value })}>
                                        <option value="">-- PILIH SOPIR CADANGAN --</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-200 mt-6">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 border border-slate-300 text-slate-600 font-bold rounded-lg bg-white hover:bg-slate-50 transition tracking-wide text-xs uppercase shadow-xs">CANCEL</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg transition tracking-wide text-xs uppercase shadow-md">UPDATE VEHICLE</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterKendaraan;