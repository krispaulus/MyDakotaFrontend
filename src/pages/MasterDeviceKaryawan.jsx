import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import {
    Smartphone, ShieldCheck, MessageSquare, Search, Calendar,
    Save, X as XIcon, MapPin, Layers, Printer, Upload
} from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';
import dliLogo from '../assets/logoDLI.png';

const MasterDeviceKaryawan = () => {
    const isDarkMode = false;
    const [activeViewTab, setActiveViewTab] = useState('master-device');
    const csvInputRef = useRef(null);

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
    const [formData, setFormData] = useState({
        kry_nip: '', kry_nama: '', kry_imei1: '', kry_imei2: '', kry_simcard_id1: '', kry_simcard_id2: ''
    });

    useEffect(() => {
        if (activeViewTab === 'master-device') {
            fetchDeviceKaryawan();
        } else {
            fetchRawAbsensi();
        }
    }, [activeViewTab]);

    // A. Load List Master Device Karyawan
    const fetchDeviceKaryawan = async () => {
        setLoadingDevice(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/hrd/device-karyawan?nama=${filterNama}&typekry=${filterType}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = res.data?.data ?? res.data;
            setEmployees(Array.isArray(list) ? list : []);
        } catch (err) {
            setEmployees([]);
            Swal.fire('Error', err.response?.data?.message || 'Gagal memuat data device karyawan', 'error');
        } finally {
            setLoadingDevice(false);
        }
    };

    // B. Load History Raw Absensi Kurir
    const fetchRawAbsensi = async () => {
        setLoadingAbsensi(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/hrd/raw-absensi?nip=${filterAbsNip}&tgla=${tglAwal}&tgle=${tglAkhir}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = res.data?.data ?? res.data;
            setAbsensiList(Array.isArray(list) ? list : []);
        } catch (err) {
            setAbsensiList([]);
            Swal.fire('Error', 'Gagal menarik log geografi absensi', 'error');
        } finally {
            setLoadingAbsensi(false);
        }
    };

    // C. Simpan Manual (p-hrd_m_kry_device_e.asp)
    const handleSaveDevice = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put(`/hrd/device-karyawan/${encodeURIComponent(formData.kry_nip)}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', 'Parameter perangkat karyawan berhasil disimpan.', 'success');
            setIsModalOpen(false);
            fetchDeviceKaryawan();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Gagal menyimpan data device', 'error');
        }
    };

    // D. Hapus / Reset Otorisasi Device (p-hrd_m_kry_device.asp)
    const handleDeleteDevice = (item) => {
        Swal.fire({
            title: 'Hapus Otorisasi Perangkat?',
            html: `IMEI dan SIM Card untuk <b>${item.kry_nama}</b> (${item.kry_nip}) akan dikosongkan.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Hapus Device!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/hrd/device-karyawan/${encodeURIComponent(item.kry_nip)}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Berhasil!', 'Otorisasi device karyawan telah dihapus.', 'success');
                    fetchDeviceKaryawan();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus device', 'error');
                }
            }
        });
    };

    // E. Cetak Data Device Karyawan (hrd_m_kry_device_print.asp)
    const handlePrintDevice = (item) => {
        const win = window.open('', '_blank', 'width=800,height=600');
        if (!win) return;
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Otorisasi Device Karyawan - ${item.kry_nip}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; font-size: 12px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                    td { border: 1px solid #cbd5e1; padding: 8px 10px; }
                    .lbl { width: 35%; font-weight: bold; background: #f1f5f9; }
                </style>
            </head>
            <body onload="window.print()">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #004b84; padding-bottom:10px;">
                    <div>
                        <strong style="font-size:15px; color:#004b84;">PT. DAKOTA LOGISTIK INDONESIA</strong><br/>
                        <span style="font-size:11px; color:#475569;">SURAT OTORISASI PERANGKAT MOBILE & GPS TRACKER</span>
                    </div>
                    <img src="${window.location.origin}${dliLogo}" style="height:38px;" onerror="this.style.display='none'"/>
                </div>
                <table>
                    <tr><td class="lbl">NIP KARYAWAN</td><td style="font-family:monospace; font-weight:bold;">${item.kry_nip}</td></tr>
                    <tr><td class="lbl">NAMA LENGKAP</td><td style="font-weight:bold;">${item.kry_nama}</td></tr>
                    <tr><td class="lbl">IMEI 1 (UTAMA)</td><td style="font-family:monospace;">${item.kry_imei1 || '-'}</td></tr>
                    <tr><td class="lbl">SIMCARD 1</td><td style="font-family:monospace;">${item.kry_simcard_id1 || '-'}</td></tr>
                    <tr><td class="lbl">IMEI 2 (CADANGAN)</td><td style="font-family:monospace;">${item.kry_imei2 || '-'}</td></tr>
                    <tr><td class="lbl">SIMCARD 2</td><td style="font-family:monospace;">${item.kry_simcard_id2 || '-'}</td></tr>
                    <tr><td class="lbl">STATUS KUNCI</td><td>${item.kry_imei1 ? 'TERKUNCI (LOCKED)' : 'BELUM DIKUNCI (OPEN)'}</td></tr>
                </table>
            </body>
            </html>
        `);
        win.document.close();
    };

    // F. Import via Link WhatsApp (hrd_m_kry_device_a.asp: mendukung Link biasa & Link Base64)
    const handleImportViaWhatsAppLink = () => {
        Swal.fire({
            title: 'Tambah Device Dari Link WhatsApp',
            html: `
                <div style="text-align:left; font-size:12px; margin-bottom:8px;">
                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Link Dari WhatsApp (Plain: NIP,IMEI1,SIMCARD1) :</label>
                    <input id="swal-wa-link" class="swal2-input" style="margin:0 0 12px 0; width:100%; font-size:13px;" placeholder="Contoh: 0010807032,357892011,89621002">
                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Atau (New) Link Base64 Enkripsi :</label>
                    <input id="swal-wa-b64" class="swal2-input" style="margin:0; width:100%; font-size:13px;" placeholder="Tempel kode Base64 dari WhatsApp...">
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            confirmButtonText: 'Simpan Link',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const plain = document.getElementById('swal-wa-link').value.trim();
                const b64 = document.getElementById('swal-wa-b64').value.trim();
                const raw = b64 || plain;
                if (!raw) {
                    Swal.showValidationMessage('Masukkan salah satu Link dari WhatsApp!');
                    return false;
                }
                return raw;
            }
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
                    Swal.fire('Gagal Inject', err.response?.data?.message || 'Format link WhatsApp tidak valid!', 'error');
                }
            }
        });
    };

    // G. Upload CSV Register HP Karyawan (hrd_m_kry_device_upload.asp)
    const handleCSVUploadChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const form = new FormData();
        form.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/hrd/device-karyawan/upload-csv', form, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            Swal.fire('Sukses!', res.data.message, 'success');
            fetchDeviceKaryawan();
        } catch (err) {
            Swal.fire('Gagal Upload CSV', err.response?.data?.message || 'Gagal memproses file CSV', 'error');
        }
    };

    const openAddModal = () => {
        setIsEditMode(false);
        setFormData({
            kry_nip: '', kry_nama: '', kry_imei1: '', kry_imei2: '', kry_simcard_id1: '', kry_simcard_id2: ''
        });
        setIsModalOpen(true);
    };

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

    const columnsDevice = [
        { header: 'NIP KARYAWAN', accessor: 'kry_nip', render: (i) => <span className="font-mono font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => openEditModal(i)}>{i.kry_nip}</span> },
        { header: 'NAMA LENGKAP', accessor: 'kry_nama', render: (i) => <span className="font-semibold text-slate-800">{i.kry_nama}</span> },
        { header: 'IMEI 1 (UTAMA)', accessor: 'kry_imei1', render: (i) => <span className="font-mono text-slate-700">{i.kry_imei1 || '⚠️ BELUM DIKUNCI'}</span> },
        { header: 'IMEI 2', accessor: 'kry_imei2', render: (i) => <span className="font-mono text-xs text-slate-500">{i.kry_imei2 || '-'}</span> },
        { header: 'SIM CARD ID 1', accessor: 'kry_simcard_id1', render: (i) => <span className="font-mono text-xs text-slate-600">{i.kry_simcard_id1 || '-'}</span> },
        { header: 'SIM CARD ID 2', accessor: 'kry_simcard_id2', render: (i) => <span className="font-mono text-xs text-slate-500">{i.kry_simcard_id2 || '-'}</span> },
        {
            header: 'STATUS KUNCI',
            render: (i) => (
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${i.kry_imei1 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {i.kry_imei1 ? '🔒 LOCKED' : '🔓 OPEN'}
                    </span>
                    <button
                        type="button"
                        onClick={() => handlePrintDevice(i)}
                        title="Cetak Surat Otorisasi Device"
                        className="p-1 text-sky-600 hover:bg-sky-50 rounded transition cursor-pointer"
                    >
                        <Printer size={14} />
                    </button>
                </div>
            )
        }
    ];

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
            <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVUploadChange}
            />

            {/* TABS MENU BUTTONS */}
            <div className="flex gap-2 border-b pb-2 border-slate-200">
                <button
                    onClick={() => setActiveViewTab('master-device')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-xs transition-all cursor-pointer ${activeViewTab === 'master-device' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border text-slate-600'}`}
                >
                    <Smartphone size={14} /> 📱 KUNCI DEVICE IMEI
                </button>
                <button
                    onClick={() => setActiveViewTab('raw-absensi')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-xs transition-all cursor-pointer ${activeViewTab === 'raw-absensi' ? 'bg-purple-600 text-white shadow-md' : 'bg-white border text-slate-600'}`}
                >
                    <Layers size={14} /> 🗺️ HISTORI RAW ABSENSI GPS
                </button>
            </div>

            {/* TAB VIEW A: MENU KUNCI DEVICE */}
            {activeViewTab === 'master-device' && (
                <div className="space-y-4">
                    <div className="p-4 rounded-xl border grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs bg-white border-slate-200 shadow-sm">
                        <div className="md:col-span-3">
                            <label className="font-semibold text-slate-500 block mb-1">CARI NAMA KARYAWAN/SOPIR</label>
                            <input
                                type="text"
                                placeholder="Ketik nama atau NIP..."
                                className="w-full p-2 border border-slate-200 rounded text-sm font-medium bg-white text-slate-800 outline-none focus:border-blue-500 shadow-sm"
                                value={filterNama}
                                onChange={e => setFilterNama(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && fetchDeviceKaryawan()}
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="font-semibold text-slate-500 block mb-1">JENIS KARYAWAN (NIP)</label>
                            <select
                                className="w-full p-2 border border-slate-200 rounded text-sm font-medium bg-white text-slate-800 outline-none focus:border-blue-500 shadow-sm"
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                            >
                                <option value="">-- SEMUA KATEGORI --</option>
                                <option value="H">SOPIR/PEKERJA HARIAN (NIP H)</option>
                                <option value="KT">PEKERJA TETAP/KONTRAK</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <button onClick={fetchDeviceKaryawan} className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md transition h-[38px] cursor-pointer">
                                <Search size={14} /> Cari Data
                            </button>
                        </div>
                        <div className="md:col-span-2">
                            <button onClick={handleImportViaWhatsAppLink} className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md transition h-[38px] cursor-pointer">
                                <MessageSquare size={14} /> Link WA Inject
                            </button>
                        </div>
                        <div className="md:col-span-2">
                            <button onClick={() => csvInputRef.current?.click()} className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md transition h-[38px] cursor-pointer">
                                <Upload size={14} /> Upload CSV HP
                            </button>
                        </div>
                    </div>

                    <DataTableTemplate
                        title="Otorisasi Perangkat Karyawan Lapangan (hrd_m_karyawan)"
                        columns={columnsDevice}
                        data={employees}
                        loading={loadingDevice}
                        isDarkMode={false}
                        onAdd={openAddModal}
                        onEdit={openEditModal}
                        onDelete={handleDeleteDevice}
                    />
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
                        <button onClick={fetchRawAbsensi} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-lg flex items-center justify-center gap-2 shadow-md transition h-[36px] cursor-pointer"><Search size={14} /> Tarik Log Geo</button>
                    </div>

                    <DataTableTemplate title="Histori Audit Koordinat GPS Absensi Kurir (hrd_t_absensi)" columns={columnsAbsensi} data={absensiList} loading={loadingAbsensi} isDarkMode={false} onAdd={null} onEdit={null} onDelete={() => { }} />
                </div>
            )}

            {/* MODAL FORM POPUP */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-xl p-6 rounded-2xl shadow-xl border flex flex-col bg-white text-slate-900 border-slate-200 animate-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                            <h3 className="text-xl font-medium text-slate-800 flex items-center gap-2">
                                <ShieldCheck size={22} className="text-blue-600" />
                                {isEditMode ? `Lock Device: ${formData.kry_nama}` : 'Otorisasi Perangkat Baru'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition cursor-pointer"><XIcon size={20} /></button>
                        </div>

                        <form onSubmit={handleSaveDevice} className="space-y-5 mt-5">
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
                                        className="w-full p-3 border border-slate-200 rounded-lg text-base bg-white text-slate-800 outline-none focus:border-blue-500 shadow-xs disabled:bg-slate-50 disabled:text-slate-500"
                                        value={formData.kry_nama}
                                        onChange={e => setFormData({ ...formData, kry_nama: e.target.value })}
                                        disabled={isEditMode}
                                        placeholder="Masukkan nama..."
                                        required
                                    />
                                </div>
                            </div>

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

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm rounded-lg border font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 transition cursor-pointer">Batal</button>
                                <button type="submit" className="px-6 py-2.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-medium shadow-md transition cursor-pointer">
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