import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { MapPin, Building2, Edit, Trash2, Save, X as XIcon, Phone, DollarSign, Layers, Shield } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

const MasterAgen = () => {
    const { isDarkMode } = useDarkMode();
    const [agens, setAgens] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- State untuk Modal (Tambah/Edit) ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [activeTab, setActiveTab] = useState('umum');

    // 🚀 RACIKAN FORM NUSANTARA: Bersih total dari hardcode kota/cabang kaku
    const defaultForm = {
        agen_id: '',
        agen_kotaid: '',       // Di-nol-kan agar wajib dipilih/diisi sesuai regional asli
        agen_cabangid: '',     // Di-nol-kan agar fleksibel mengikuti cabang induk pelapor
        agen_tlc: '',
        agen_kode: '',
        agen_nama: '',
        agen_alamat: '',
        agen_kota: '',
        agen_kecamatan: '',
        agen_propinsi: '',
        agen_contactperson: '',
        agen_stt: '',
        agen_phone1: '',
        agen_phone2: '',
        agen_phone3: '',
        agen_dialstring: '',
        agen_komisikirm: 0,
        agen_komisiterima1: 0,
        agen_komisiterima2: 0,
        agen_komisitransit: 0,
        agen_transityn: 'N',
        agen_servername: '',
        agen_aktifyn: 'Y',
        agen_postingyn: 'N',
        agen_pcaid: '',
        agen_komisicarter: 0,
        agen_status: 'AKTIF',
        agen_npwp: '',
        agen_kodepajak: '',
        agen_alamatnpwp: '',
        agen_limitjual: 0,
        agen_limitbtt: 0,
        agen_minhand: 0,
        agen_insentifgudang: 0,
        agen_long: 0,
        agen_lat: 0,
        agen_virtualacc: '',
        agen_closingtime: '17:00',
        agen_umr: 0,
        agen_tarifkota: 0,
        agen_tarifkecamatan: 0,
        agen_barcodescannerprinterready: 'N',
        agen_md5: '',
        agen_virtualacc2: '',
        agen_kaakunting: '',
        agen_kacontact: '',
        agen_komisicaid: '',
        agen_npwppribadyn: 'N',
        agen_jemputpusatyn: 'N',
        agen_komisikirim: 0
    };

    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => { fetchAgens(); }, []);

    const fetchAgens = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:8080/api/agens', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAgens(res.data.data);
        } catch (err) {
            Swal.fire('Error', 'Gagal memuat data fisik agen', 'error');
        } finally { setLoading(false); }
    };

    const nextKode = useMemo(() => {
        if (!agens || agens.length === 0) return "0001";
        const daftarAngka = agens.map(item => parseInt(item.agen_kode, 10)).filter(num => !isNaN(num));
        if (daftarAngka.length === 0) return "0001";
        return String(Math.max(...daftarAngka) + 1).padStart(4, '0');
    }, [agens]);

    const columns = [
        {
            header: 'ID Agen',
            accessor: 'agen_id',
            render: (i) => (
                <span className={`font-mono text-xs font-bold px-2 py-1 rounded-md border tracking-wider shadow-sm ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-700 border-slate-200'
                    }`}>
                    {i.agen_id}
                </span>
            )
        },
        { header: 'Kode', accessor: 'agen_kode', render: (i) => <span className="font-mono font-bold text-blue-600">{i.agen_kode}</span> },
        { header: 'Nama Agen', accessor: 'agen_nama', render: (i) => <span className="font-semibold">{i.agen_nama}</span> },
        { header: 'Kota', accessor: 'agen_kota', render: (i) => <span className="font-medium text-slate-700 dark:text-slate-300">{i.agen_kota}</span> },
        { header: 'Status', render: (i) => <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${i.agen_aktifyn === 'Y' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{i.agen_aktifyn === 'Y' ? 'AKTIF' : 'NON'}</span> }
    ];

    const handleAdd = () => {
        setEditData(null);
        setFormData({ ...defaultForm, agen_kode: nextKode });
        setActiveTab('umum');
        setIsModalOpen(true);
    };

    // 🚀 ENGINE DETAIL NUSANTARA: Mengunci Parameter Kontak & Finansial Akunting
    const handleEdit = async (item) => {
        setEditData(item);
        setActiveTab('umum');

        const backupKotaId = item.agen_kotaid || item.AgenKotaID || '';
        const backupKota = item.agen_kota || item.AgenKota || '';
        const backupKecamatan = item.agen_kecamatan || item.AgenKecamatan || '';
        const backupPropinsi = item.agen_propinsi || item.AgenPropinsi || '';
        const backupAlamat = item.agen_alamat || item.AgenAlamat || '';

        const backupCP = item.agen_contactperson || '';
        const backupPhone1 = item.agen_phone1 || '';
        const backupPhone2 = item.agen_phone2 || '';
        const backupPhone3 = item.agen_phone3 || '';
        const backupDial = item.agen_dialstring || '';
        const backupStt = item.agen_stt || '';

        // 🟢 BACKUP BARU UNTUK AKUNTING & CONTACT
        const backupKaAkunting = item.agen_kaakunting || '';
        const backupKaContact = item.agen_kacontact || '';

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:8080/api/agens/detail/${item.agen_kode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.data) {
                const d = res.data.data;
                console.log("🔍 RESPONS LURUS DARI GOLANG BACKEND:", d);

                setFormData({
                    ...defaultForm,
                    ...item,
                    ...d,
                    agen_id: d.agen_id || item.agen_id || '',
                    agen_kode: d.agen_kode || item.agen_kode || '',
                    agen_nama: d.agen_nama || item.agen_nama || '',
                    agen_alamat: d.agen_alamat || backupAlamat,
                    agen_kotaid: d.agen_kotaid || backupKotaId,
                    agen_kota: d.agen_kota || backupKota,
                    agen_kecamatan: d.agen_kecamatan || backupKecamatan,
                    agen_propinsi: d.agen_propinsi || backupPropinsi,
                    agen_contactperson: d.agen_contactperson || backupCP,
                    agen_phone1: d.agen_phone1 || backupPhone1,
                    agen_phone2: d.agen_phone2 || backupPhone2,
                    agen_phone3: d.agen_phone3 || backupPhone3,
                    agen_dialstring: d.agen_dialstring || backupDial,
                    agen_stt: d.agen_stt || backupStt,

                    // 🟢 IKAT VALUE MANUALLY BIAR KAWIN 100% SAMA POSTGRES
                    agen_kaakunting: d.agen_kaakunting || backupKaAkunting,
                    agen_kacontact: d.agen_kacontact || backupKaContact
                });
            } else {
                setFormData({ ...defaultForm, ...item });
            }
        } catch (err) {
            console.error("Gagal mengambil detail agen lengkap, gunakan cadangan tabel:", err);
            setFormData({ ...defaultForm, ...item });
        }

        setIsModalOpen(true);
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (editData) {
                await axios.put(`http://localhost:8080/api/agens/${editData.agen_id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Sukses!', 'Data agen berhasil diperbarui.', 'success');
            } else {
                await axios.post('http://localhost:8080/api/agens', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Sukses!', 'Agen baru berhasil ditambahkan.', 'success');
            }
            setIsModalOpen(false);
            fetchAgens();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Gagal menyimpan data agen', 'error');
        }
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Non-aktifkan Agen?',
            text: `Mengubah status keaktifan agen ${item.agen_nama}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Non-aktifkan'
        }).then(async (res) => {
            if (res.isConfirmed) {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:8080/api/agens/${item.agen_id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Updated', 'Status agen dinonaktifkan.', 'success');
                fetchAgens();
            }
        });
    };

    const updateField = (key, val) => {
        const numFields = ['agen_komisikirm', 'agen_komisiterima1', 'agen_komisiterima2', 'agen_komisitransit', 'agen_komisicarter', 'agen_limitjual', 'agen_limitbtt', 'agen_minhand', 'agen_insentifgudang', 'agen_long', 'agen_lat', 'agen_umr', 'agen_tarifkota', 'agen_tarifkecamatan', 'agen_komisikirim'];
        setFormData(prev => ({
            ...prev,
            [key]: numFields.includes(key) ? (parseFloat(val) || 0) : val
        }));
    };

    return (
        <div className={`min-h-screen p-4 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
            <DataTableTemplate title="Master Agen (Full Fields)" columns={columns} data={agens} loading={loading} isDarkMode={isDarkMode} onAdd={handleAdd} onEdit={handleEdit} onDelete={handleDelete} />

            {/* MODAL CONTAINER DENGAN SUNTIKAN UI RESPONSIF COMPACT ANTIMELAR */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-4xl p-6 rounded-2xl shadow-2xl transition-all border flex flex-col min-h-0 max-h-[85vh] ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'
                        }`}>
                        {/* Title Header */}
                        <div className="flex justify-between items-center pb-2.5 border-b dark:border-slate-700">
                            <h3 className="text-base font-black text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                <Building2 size={18} />
                                {editData ? `EDIT DATA AGEN: ${formData.agen_nama} - ${formData.agen_id} - ${formData.agen_kecamatan}` : 'TAMBAH AGEN BARU'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition"><XIcon size={18} /></button>
                        </div>

                        {/* TABS HEADER TABEL */}
                        <div className="flex gap-1.5 my-3 border-b dark:border-slate-700 pb-2 overflow-x-auto text-xs">
                            {[
                                { id: 'umum', label: 'Data Umum', icon: Building2 },
                                { id: 'kontak', label: 'Kontak & Phone', icon: Phone },
                                { id: 'komisi', label: 'Komisi & Tarif', icon: DollarSign },
                                { id: 'pajak', label: 'Pajak & Limit', icon: Shield },
                                { id: 'sistem', label: 'Parameter Sistem', icon: Layers }
                            ].map(tab => {
                                const isCurrentActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-all duration-150 ${isCurrentActive
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                            : isDarkMode
                                                ? 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                                : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                                            }`}
                                    >
                                        <tab.icon size={14} className={isCurrentActive ? 'text-white' : 'text-blue-500'} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* FORM INPUT BODY - REKAYASA TOTAL ANTI-GELAP SE-NUSANTARA */}
                        <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col min-h-0 text-xs">
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">

                                {/* 📋 TAB 1: DATA UMUM */}
                                {activeTab === 'umum' && (
                                    <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border transition-colors duration-150" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">KODE AGEN</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono font-bold tracking-wider text-blue-600 outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#38bdf8' : '#2563eb', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_kode} onChange={e => updateField('agen_kode', e.target.value)} required maxLength={4} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">NAMA AGEN</label>
                                            <input type="text" className="w-full p-2 border rounded font-bold outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_nama} onChange={e => updateField('agen_nama', e.target.value)} required />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="font-black text-gray-400 block mb-1">ALAMAT LENGKAP</label>
                                            <textarea className="w-full p-2 border rounded font-medium leading-relaxed outline-none" rows={2} style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_alamat || ''} onChange={e => updateField('agen_alamat', e.target.value)} required />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">KOTA ID</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono uppercase font-bold outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_kotaid} onChange={e => updateField('agen_kotaid', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">KABUPATEN/KOTA</label>
                                            <input type="text" className="w-full p-2 border rounded font-bold uppercase outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_kota || ''} onChange={e => updateField('agen_kota', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">KECAMATAN</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border rounded font-bold uppercase outline-none"
                                                style={{
                                                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                                                    color: isDarkMode ? '#ffffff' : '#000000',
                                                    borderColor: isDarkMode ? '#475569' : '#cbd5e1'
                                                }}
                                                value={formData.agen_kecamatan || ''} // 🟢 PASTIKAN INI SINKRON LOWERCASE
                                                onChange={e => updateField('agen_kecamatan', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">PROPINSI</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border rounded font-bold uppercase outline-none"
                                                style={{
                                                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                                                    color: isDarkMode ? '#ffffff' : '#000000',
                                                    borderColor: isDarkMode ? '#475569' : '#cbd5e1'
                                                }}
                                                value={formData.agen_propinsi || ''} // 🟢 PASTIKAN INI SINKRON LOWERCASE
                                                onChange={e => updateField('agen_propinsi', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 📞 TAB 2: KONTAK & PHONE */}
                                {activeTab === 'kontak' && (
                                    <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border transition-colors duration-150" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>

                                        {/* Baris 1: Contact Person & Phone 1 */}
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">CONTACT PERSON</label>
                                            <input type="text" className="w-full p-2 border rounded font-bold outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_contactperson || ''} onChange={e => updateField('agen_contactperson', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">PHONE 1</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_phone1 || ''} onChange={e => updateField('agen_phone1', e.target.value)} />
                                        </div>

                                        {/* 🟢 Baris 2: KA AKUNTING & KA CONTACT (PERSIS FORMAT TERBARU NUSANTARA GAMBAR 1 & 3) */}
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">KA AKUNTING</label>
                                            <input type="text" className="w-full p-2 border rounded font-bold outline-none text-indigo-600 dark:text-indigo-400" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#4f46e5' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_kaakunting || ''} onChange={e => updateField('agen_kaakunting', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">KA CONTACT</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono font-bold outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_kacontact || ''} onChange={e => updateField('agen_kacontact', e.target.value)} />
                                        </div>

                                        {/* Baris 3: Phone 2 & Phone 3 */}
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">PHONE 2</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_phone2 || ''} onChange={e => updateField('agen_phone2', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">PHONE 3</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_phone3 || ''} onChange={e => updateField('agen_phone3', e.target.value)} />
                                        </div>

                                        {/* Baris 4: Dial String & STT No */}
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">DIAL STRING</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_dialstring || ''} onChange={e => updateField('agen_dialstring', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">STT NO</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_stt || ''} onChange={e => updateField('agen_stt', e.target.value)} />
                                        </div>

                                    </div>
                                )}

                                {/* 💰 TAB 3: KOMISI & TARIF */}
                                {activeTab === 'komisi' && (
                                    <div className="grid grid-cols-3 gap-4 p-4 rounded-xl border transition-colors duration-150" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">KOMISI KIRIM (REAL)</label>
                                            <input type="number" step="0.01" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_komisikirm} onChange={e => updateField('agen_komisikirm', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">KOMISI KIRIM (NUMERIC)</label>
                                            <input type="number" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_komisikirim} onChange={e => updateField('agen_komisikirim', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">KOMISI TERIMA 1</label>
                                            <input type="number" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_komisiterima1} onChange={e => updateField('agen_komisiterima1', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">KOMISI TERIMA 2</label>
                                            <input type="number" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_komisiterima2} onChange={e => updateField('agen_komisiterima2', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">KOMISI TRANSIT</label>
                                            <input type="number" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_komisitransit} onChange={e => updateField('agen_komisitransit', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">KOMISI CARTER</label>
                                            <input type="number" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_komisicarter} onChange={e => updateField('agen_komisicarter', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">TARIF KOTA</label>
                                            <input type="number" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_tarifkota} onChange={e => updateField('agen_tarifkota', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">TARIF KECAMATAN</label>
                                            <input type="number" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_tarifkecamatan} onChange={e => updateField('agen_tarifkecamatan', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">UMR WILAYAH</label>
                                            <input type="number" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_umr} onChange={e => updateField('agen_umr', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                {/* 🛡️ TAB 4: PAJAK & LIMIT */}
                                {activeTab === 'pajak' && (
                                    <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border transition-colors duration-150" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">NOMOR NPWP</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_npwp || ''} onChange={e => updateField('agen_npwp', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">KODE PAJAK</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_kodepajak || ''} onChange={e => updateField('agen_kodepajak', e.target.value)} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="font-black text-gray-400 block mb-1">ALAMAT NPWP</label>
                                            <textarea className="w-full p-2 border rounded font-medium outline-none" rows={2} style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_alamatnpwp || ''} onChange={e => updateField('agen_alamatnpwp', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">STATUS NPWP</label>
                                            <select className="w-full p-2 border rounded font-bold outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#indigo-400' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_npwppribadyn} onChange={e => updateField('agen_npwppribadyn', e.target.value)}>
                                                <option value="Y">Pribadi (PPh 21)</option>
                                                <option value="N">Badan Usaha (PPh 23)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">LIMIT JUAL</label>
                                            <input type="number" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_limitjual} onChange={e => updateField('agen_limitjual', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">LIMIT BTT</label>
                                            <input type="number" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_limitbtt} onChange={e => updateField('agen_limitbtt', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">MINIMAL HANDLING</label>
                                            <input type="number" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_minhand} onChange={e => updateField('agen_minhand', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                {/* ⚙️ TAB 5: PARAMETER SISTEM */}
                                {activeTab === 'sistem' && (
                                    <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border transition-colors duration-150" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">CABANG ID</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_cabangid} onChange={e => updateField('agen_cabangid', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">TLC KODE</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono uppercase outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_tlc || ''} onChange={e => updateField('agen_tlc', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">STATUS AKTIF (Y/N)</label>
                                            <select className="w-full p-2 border rounded font-bold outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_aktifyn} onChange={e => updateField('agen_aktifyn', e.target.value)}>
                                                <option value="Y">✅ AKTIF OPERASIONAL</option>
                                                <option value="N">❌ NON-AKTIF (SUSPEND)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">POSTING STATUS</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_postingyn || ''} onChange={e => updateField('agen_postingyn', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">AKUN PIUTANG COA (PCAID)</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_pcaid || ''} onChange={e => updateField('agen_pcaid', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">AKUN KOMISI COA (COMISICAID)</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_komisicaid || ''} onChange={e => updateField('agen_komisicaid', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">VIRTUAL ACCOUNT 1</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_virtualacc || ''} onChange={e => updateField('agen_virtualacc', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">VIRTUAL ACCOUNT 2</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_virtualacc2 || ''} onChange={e => updateField('agen_virtualacc2', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">CLOSING TIME</label>
                                            <input type="text" className="w-full p-2 border rounded font-mono outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_closingtime} onChange={e => updateField('agen_closingtime', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="font-black text-gray-400 block mb-1">JEMPUT PUSAT Y/N</label>
                                            <select className="w-full p-2 border rounded font-bold outline-none" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }} value={formData.agen_jemputpusatyn} onChange={e => updateField('agen_jemputpusatyn', e.target.value)}>
                                                <option value="Y">YES</option>
                                                <option value="N">NO</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 🚀 FOOTER ACTION STICKY - CERAH TOTAL 100% (ANTI-HITAM) */}
                            <div
                                className="flex justify-end gap-3 pt-3 border-t mt-auto rounded-b-xl transition-all duration-150"
                                style={{
                                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                                    borderColor: isDarkMode ? '#334155' : '#e2e8f0'
                                }}
                            >
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border font-bold hover:scale-105 active:scale-95 transition" style={{ backgroundColor: isDarkMode ? '#334155' : '#f1f5f9', color: isDarkMode ? '#e2e8f0' : '#475569', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}>
                                    Batal
                                </button>
                                <button type="submit" className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-black shadow-md transition hover:scale-105 active:scale-95">
                                    <Save size={14} />
                                    Simpan Agen
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterAgen;