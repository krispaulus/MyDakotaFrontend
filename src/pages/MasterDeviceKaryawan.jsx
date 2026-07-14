import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Smartphone, ShieldCheck, MessageSquare, Search, Calendar, Edit, Save, X as XIcon, MapPin, Layers } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

const MasterDeviceKaryawan = () => {
    const isDarkMode = false; // Memaksa agar tampilan selalu putih bersih cerah se-Nusantara
    const [activeViewTab, setActiveViewTab] = useState('master-device');

    // State Data Pendukung
    const [employees, setEmployees] = useState([]);
    const [loadingDevice, setLoadingDevice] = useState(true);
    const [filterNama, setFilterNama] = useState('');
    const [filterType, setFilterType] = useState('');

    const [absensiList, setAbsensiList] = useState([]);
    const [loadingAbsensi, setLoadingAbsensi] = useState(false);
    const [filterAbsNip, setFilterAbsNip] = useState('');
    const [tglAwal, setTglAwal] = useState(new Date().toISOString().split('T')[0]);
    const [tglAkhir, setTglAkhir] = useState(new Date().toISOString().split('T')[0]);

    // State Modal & Data Form Kontrol
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({ kry_nip: '', kry_nama: '', kry_imei1: '', kry_imei2: '', kry_simcard_id1: '', kry_simcard_id2: '' });

    useEffect(() => {
        if (activeViewTab === 'master-device') {
            fetchDeviceKaryawan();
        } else {
            fetchRawAbsensi();
        }
    }, [activeViewTab]);

    // 📱 A. Load List Master Device Karyawan
    const fetchDeviceKaryawan = async () => {
        setLoadingDevice(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/hrd/device-karyawan?nama=${filterNama}&typekry=${filterType}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(res.data?.data || res.data || []);
        } catch (err) {
            Swal.fire('Error', 'Gagal memuat data device karyawan', 'error');
        } finally { setLoadingDevice(false); }
    };

    // 🗺️ B. Load History Raw Absensi Kurir
    const fetchRawAbsensi = async () => {
        setLoadingAbsensi(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/hrd/raw-absensi?nip=${filterAbsNip}&tgla=${tglAwal}&tgle=${tglAkhir}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAbsensiList(res.data?.data || res.data || []);
        } catch (err) {
            Swal.fire('Error', 'Gagal menarik log geografi absensi', 'error');
        } finally { setLoadingAbsensi(false); }
    };

    // 💾 C. Fungsi Simpan (Aksi Tombol Submit Form)
    const handleSaveDevice = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put(`/hrd/device-karyawan/${formData.kry_nip}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', 'Parameter perangkat karyawan berhasil disimpan.', 'success');
            setIsModalOpen(false);
            fetchDeviceKaryawan();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Gagal menyimpan data device', 'error');
        }
    };

    // 🚀 D. Fungsi Trigger Tombol WA Import
    const handleImportViaWhatsAppLink = () => {
        Swal.fire({
            title: 'Import Device via WA Link',
            text: 'Masukkan teks mentah atau Base64 terenkripsi dari WhatsApp (Format: NIP,IMEI1,SIMCARD1)',
            input: 'textarea',
            inputPlaceholder: 'Contoh: 0010807032,357892011,89621002...',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            confirmButtonText: '🚀 Inject Otomatis',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                try {
                    const token = localStorage.getItem('token');
                    const res = await api.post('/hrd/device-karyawan/whatsapp-import', { link_raw: result.value }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Berhasil!', res.data.message, 'success');
                    fetchDeviceKaryawan();
                } catch (err) {
                    Swal.fire('Gagal Inject', err.response?.data?.message || 'Format teks salah bray!', 'error');
                }
            }
        });
    };

    // ➕ MODAL MODE TAMBAH BARU (Form Kosong Bersih)
    const openAddModal = () => {
        setIsEditMode(false);
        setFormData({
            kry_nip: '',
            kry_nama: '',
            kry_imei1: '',
            kry_imei2: '',
            kry_simcard_id1: '',
            kry_simcard_id2: ''
        });
        setIsModalOpen(true);
    };

    // ✏️ MODAL MODE EDIT DATA (Form Terisi Otomatis)
    const openEditModal = (item) => {
        setIsEditMode(true);
        setFormData({
            kry_nip: item.kry_nip || '',
            kry_nama: item.kry_nama || '',
            kry_imei1: item.kry_imei1 || '',
            kry_imei2: item.kry_imei2 || '',
            kry_simcard_id1: item.kry_simcard_id1 || '',
            kry_simcard_id2: item.kry_simcard_id2 || ''
        });
        setIsModalOpen(true);
    };

    // Set Mapping Kolom Master Device
    const columnsDevice = [
        { header: 'NIP KARYAWAN', accessor: 'kry_nip', render: (i) => <span className="font-mono font-bold text-blue-600">{i.kry_nip}</span> },
        { header: 'NAMA LENGKAP', accessor: 'kry_nama', render: (i) => <span className="font-semibold text-slate-800">{i.kry_nama}</span> },
        { header: 'IMEI 1 (UTAMA)', accessor: 'kry_imei1', render: (i) => <span className="font-mono text-slate-700">{i.kry_imei1 || '⚠️ BELUM DIKUNCI'}</span> },
        { header: 'SIM CARD ID 1', accessor: 'kry_simcard_id1', render: (i) => <span className="font-mono text-xs text-slate-600">{i.kry_simcard_id1 || '-'}</span> },
        { header: 'STATUS KUNCI', render: (i) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${i.kry_imei1 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{i.kry_imei1 ? '🔒 LOCKED' : '🔓 OPEN'}</span> }
    ];

    // Set Mapping Kolom Raw Absensi
    const columnsAbsensi = [
        { header: 'WAKTU KETUK', accessor: 'abs_datetime', render: (i) => <span className="font-mono text-xs font-bold text-purple-600">{i.abs_datetime}</span> },
        { header: 'NIP', accessor: 'abs_nip', render: (i) => <span className="font-mono font-medium text-slate-700">{i.abs_nip}</span> },
        { header: 'NAMA KARYAWAN', accessor: 'kry_nama', render: (i) => <span className="font-bold text-slate-800">{i.kry_nama || 'Karyawan Lapangan'}</span> },
        { header: 'DIVISI', accessor: 'div_nama', render: (i) => <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">{i.div_nama || '-'}</span> },
        { header: 'CABANG/AGEN', accessor: 'agen_nama', render: (i) => <span className="font-bold text-slate-700">{i.agen_nama || `ID: ${i.abs_agenid}`}</span> },
        {
            header: 'KOORDINAT GPS MAPS',
            render: (i) => (
                <a
                    href={`http://maps.google.com/?q=${i.abs_lat},${i.abs_lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-mono text-[11px] text-emerald-600 font-bold hover:underline"
                >
                    <MapPin size={12} /> {i.abs_lat}, {i.abs_lon}
                </a>
            )
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">

            {/* TABS MENU BUTTONS */}
            <div className="flex gap-2 border-b pb-2 border-slate-200">
                <button
                    onClick={() => setActiveViewTab('master-device')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-xs transition-all ${activeViewTab === 'master-device' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border text-slate-600'}`}
                >
                    <Smartphone size={14} /> 📱 KUNCI DEVICE IMEI
                </button>
                <button
                    onClick={() => setActiveViewTab('raw-absensi')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-xs transition-all ${activeViewTab === 'raw-absensi' ? 'bg-purple-600 text-white shadow-md' : 'bg-white border text-slate-600'}`}
                >
                    <Layers size={14} /> 🗺️ HISTORI RAW ABSENSI GPS
                </button>
            </div>

            {/* TAB VIEW A: MENU KUNCI DEVICE */}
            {activeViewTab === 'master-device' && (
                <div className="space-y-4">
                    <div className="p-4 rounded-xl border grid grid-cols-4 gap-4 items-end text-xs bg-white border-slate-200 shadow-sm">
                        <div>
                            <label className="font-semibold text-slate-500 block mb-1">CARI NAMA KARYAWAN/SOPIR</label>
                            <input type="text" placeholder="Ketik nama..." className="w-full p-2 border border-slate-200 rounded text-sm font-medium bg-white text-slate-800 outline-none focus:border-blue-500 shadow-sm" value={filterNama} onChange={e => setFilterNama(e.target.value)} />
                        </div>
                        <div>
                            <label className="font-semibold text-slate-500 block mb-1">JENIS KARYAWAN (NIP)</label>
                            <select className="w-full p-2 border border-slate-200 rounded text-sm font-medium bg-white text-slate-800 outline-none focus:border-blue-500 shadow-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="">-- SEMUA KATEGORI --</option>
                                <option value="H">SOPIR/PEKERJA HARIAN (NIP H)</option>
                                <option value="KT">PEKERJA TETAP/KONTRAK</option>
                            </select>
                        </div>
                        <button onClick={fetchDeviceKaryawan} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-lg flex items-center justify-center gap-2 shadow-md transition h-[38px]"><Search size={14} /> Cari Data</button>
                        <button onClick={handleImportViaWhatsAppLink} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg flex items-center justify-center gap-2 shadow-md transition h-[38px]"><MessageSquare size={14} /> Link WA Inject</button>
                    </div>

                    <DataTableTemplate title="Otorisasi Perangkat Karyawan Lapangan (hrd_m_karyawan)" columns={columnsDevice} data={employees} loading={loadingDevice} isDarkMode={false} onAdd={openAddModal} onEdit={openEditModal} onDelete={() => { }} />
                </div>
            )}

            {/* TAB VIEW B: HISTORI ABSENSI GPS */}
            {activeViewTab === 'raw-absensi' && (
                <div className="space-y-4">
                    <div className="p-4 rounded-xl border grid grid-cols-4 gap-4 items-end text-xs bg-white border-slate-200 shadow-sm">
                        <div>
                            <label className="font-semibold text-slate-500 block mb-1">FILTER NIP</label>
                            <input type="text" placeholder="Contoh: 0010807032" className="w-full p-2 border border-slate-200 rounded font-mono text-sm bg-white text-slate-800 outline-none focus:border-blue-500 shadow-sm" value={filterAbsNip} onChange={e => setFilterAbsNip(e.target.value)} />
                        </div>
                        <div>
                            <label className="font-semibold text-slate-500 block mb-1 flex items-center gap-1"><Calendar size={13} /> TANGGAL AWAL</label>
                            <input type="date" className="w-full p-2 border border-slate-200 rounded font-mono text-sm bg-white text-slate-800 outline-none focus:border-blue-500 shadow-sm" value={tglAwal} onChange={e => setTglAwal(e.target.value)} />
                        </div>
                        <div>
                            <label className="font-semibold text-slate-500 block mb-1 flex items-center gap-1"><Calendar size={13} /> TANGGAL AKHIR</label>
                            <input type="date" className="w-full p-2 border border-slate-200 rounded font-mono text-sm bg-white text-slate-800 outline-none focus:border-blue-500 shadow-sm" value={tglAkhir} onChange={e => setTglAkhir(e.target.value)} />
                        </div>
                        <button onClick={fetchRawAbsensi} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-lg flex items-center justify-center gap-2 shadow-md transition h-[36px]"><Search size={14} /> Tarik Log Geo</button>
                    </div>

                    <DataTableTemplate title="Histori Audit Koordinat GPS Absensi Kurir (hrd_t_absensi)" columns={columnsAbsensi} data={absensiList} loading={loadingAbsensi} isDarkMode={false} onAdd={null} onEdit={null} onDelete={() => { }} />
                </div>
            )}

            {/* 🚀 MODAL FORM POPUP - FONT DIPERBESAR MAKSIMAL & TETAP NORMAL (ANTI BOLD) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-xl p-6 rounded-2xl shadow-xl border flex flex-col bg-white text-slate-900 border-slate-200 animate-in zoom-in-95 duration-150">

                        {/* Header Modal - Judul Diperbesar jadi text-xl */}
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                            <h3 className="text-xl font-medium text-slate-800 flex items-center gap-2">
                                <ShieldCheck size={22} className="text-blue-600" />
                                {isEditMode ? `Lock Device: ${formData.kry_nama}` : 'Otorisasi Perangkat Baru'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition"><XIcon size={20} /></button>
                        </div>

                        {/* Form Body - Semua Label naik ke text-sm, Input naik ke text-base */}
                        <form onSubmit={handleSaveDevice} className="space-y-5 mt-5">

                            {/* Baris 1: NIP & Nama */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="font-normal text-slate-500 text-sm block mb-1.5">NIP KARYAWAN</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-lg font-mono text-base bg-white text-slate-800 outline-none focus:border-blue-500 shadow-xs disabled:bg-slate-50 disabled:text-slate-400"
                                        value={formData.kry_nip}
                                        onChange={e => setFormData({ ...formData, kry_nip: e.target.value })}
                                        disabled={isEditMode}
                                        placeholder="Contoh: 0010807..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-normal text-slate-500 text-sm block mb-1.5">NAMA LENGKAP KARYAWAN</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-lg text-base bg-white text-slate-800 outline-none focus:border-blue-500 shadow-xs"
                                        value={formData.kry_nama}
                                        onChange={e => setFormData({ ...formData, kry_nama: e.target.value })}
                                        placeholder="Masukkan nama..."
                                        required
                                    />
                                </div>
                            </div>

                            {/* Baris 2: IMEI 1 & IMEI 2 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="font-normal text-slate-500 text-sm block mb-1.5">IMEI NOMOR 1 (UTAMA)</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-lg font-mono text-base bg-white text-slate-800 outline-none focus:border-blue-500 shadow-xs"
                                        value={formData.kry_imei1}
                                        onChange={e => setFormData({ ...formData, kry_imei1: e.target.value })}
                                        placeholder="Masukkan IMEI 1..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-normal text-slate-500 text-sm block mb-1.5">IMEI NOMOR 2 (CADANGAN)</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-lg font-mono text-base bg-white text-slate-800 outline-none focus:border-blue-500 shadow-xs"
                                        value={formData.kry_imei2}
                                        onChange={e => setFormData({ ...formData, kry_imei2: e.target.value })}
                                        placeholder="Masukkan IMEI 2..."
                                    />
                                </div>
                            </div>

                            {/* Baris 3: SIMCARD 1 & SIMCARD 2 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="font-normal text-slate-500 text-sm block mb-1.5">SIM CARD ID SLOTS 1</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-lg font-mono text-base bg-white text-slate-800 outline-none focus:border-blue-500 shadow-xs"
                                        value={formData.kry_simcard_id1}
                                        onChange={e => setFormData({ ...formData, kry_simcard_id1: e.target.value })}
                                        placeholder="Masukkan ICCID SIM 1..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-normal text-slate-500 text-sm block mb-1.5">SIM CARD ID SLOTS 2</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-lg font-mono text-base bg-white text-slate-800 outline-none focus:border-blue-500 shadow-xs"
                                        value={formData.kry_simcard_id2}
                                        onChange={e => setFormData({ ...formData, kry_simcard_id2: e.target.value })}
                                        placeholder="Masukkan ICCID SIM 2..."
                                    />
                                </div>
                            </div>

                            {/* Footer Modal Action Buttons - Tombol juga kita bikin proporsional text-sm */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm rounded-lg border font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 transition">Batal</button>
                                <button type="submit" className="px-6 py-2.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-medium shadow-md transition">
                                    <Save size={16} /> {isEditMode ? 'Update Hardware' : 'Simpan Perangkat'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterDeviceKaryawan;