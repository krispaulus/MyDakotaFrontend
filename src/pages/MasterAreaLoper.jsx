import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Save, X as XIcon, Search, AlertCircle, MapPin, Plus, FolderPlus } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

const MasterAreaLoper = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [unregistered, setUnregistered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showUnregisteredTab, setShowUnregisteredTab] = useState(false);
    const [editData, setEditData] = useState(null);

    // State manajemen Sub-Modal Editor Ganti Area Loper (Gambar 2)
    const [isGantiModalOpen, setIsGantiModalOpen] = useState(false);
    const [gantiActiveItem, setGantiActiveItem] = useState(null); // Menyimpan baris area terpilih yang diklik
    const [gantiPayload, setGantiPayload] = useState({ id: 0, penerusyn: 'N', kgmin: 0, hrgpenerus: 0, leadtime: 1, new_agen_kode: '' });

    // State manajemen Sub-Modal Batch Area Loper
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [listAllAgenOptions, setListAllAgenOptions] = useState([]);
    const [batchActiveItem, setBatchActiveItem] = useState(null);
    const [batchPayload, setBatchPayload] = useState({ level: 'kelurahan', new_agen_kode: '' });

    // STATE PENAMPUNG PROFIL AGEN DAN TABEL UTAMA
    const [areaTerpilih, setAreaTerpilih] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [agenProfil, setAgenProfil] = useState({ kode: '', nama: '', alamat: '', kota: '', telp: '' });

    // STATE MANAJEMEN LIVE SEARCH QUERY MASTER KODEPOS
    const [searchFormInput, setSearchFormInput] = useState({ propinsi: '', kabupaten: '', kecamatan: '', kelurahan: '' });
    const [searchResultMaster, setSearchResultMaster] = useState([]);
    const [selectedMasterRows, setSelectedMasterRows] = useState([]);

    const initialForm = {
        area_agenid: '', tujuan_kelurahan: '', tujuan_kecamatan: '', tujuan_kabupaten: '', tujuan_propinsi: '',
        hand_darat: 0, hand_laut: 0, hand_udara: 0, hand_daratkurir: 0, hand_lautkurir: 0, hand_udarakurir: 0,
        pickup_agenid: '', penerusyn: 'N', kgmin: 0, hrgpenerus: 0, leadtime: 1, prosentasebykirimyn: 'N'
    };
    const [formData, setFormData] = useState(initialForm);

    useEffect(() => {
        fetchData();
        fetchUnregistered();
    }, []);

    const fetchData = async (q = '') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:8080/api/area-loper?search=${q}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data.data);
        } catch (err) {
            Swal.fire('Error', 'Gagal memuat data wilayah', 'error');
        } finally { setLoading(false); }
    };

    const fetchUnregistered = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:8080/api/area-loper/unregistered', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnregistered(res.data.data);
        } catch (err) { console.error(err); }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchData(searchQuery);
    };

    const handleOpenAdd = () => {
        setEditData(null);
        setFormData(initialForm);
        setAgenProfil({ kode: '', nama: '', alamat: '', kota: '', telp: '' });
        setAreaTerpilih([]);
        setSearchResultMaster([]);
        setSelectedMasterRows([]);
        setIsModalOpen(true);
    };

    const fetchAgenProfilHeader = async (agencyCode) => {
        if (!agencyCode) return;
        try {
            const token = localStorage.getItem('token');
            const resProfil = await axios.get(`http://localhost:8080/api/agens/detail/${agencyCode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const d = resProfil.data.data;
            setAgenProfil({
                kode: d.agen_kode || agencyCode, nama: d.agen_nama || '', alamat: d.agen_alamat || '', kota: d.agen_kota || '', telp: d.agen_phone || '-'
            });

            const resArea = await axios.get(`http://localhost:8080/api/area-loper/terpilih/${agencyCode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAreaTerpilih(resArea.data.data || []);
            setSelectedRows([]);
        } catch (err) {
            setAgenProfil({ kode: agencyCode, nama: 'PROFIL AGEN GAGAL DIMUAT', alamat: '-', kota: '-', telp: '-' });
            setAreaTerpilih([]);
        }
    };

    const handleOpenEditCustom = (item) => {
        setEditData(item);
        const targetKode = item.agen_kode ? item.agen_kode.toString().trim() : '';
        setFormData({
            ...initialForm,
            area_agenid: targetKode,
            tujuan_propinsi: '', tujuan_kabupaten: '', tujuan_kecamatan: '', tujuan_kelurahan: ''
        });
        setSearchFormInput({ propinsi: '', kabupaten: '', kecamatan: '', kelurahan: '' });
        setSearchResultMaster([]);
        setSelectedMasterRows([]);
        fetchAgenProfilHeader(targetKode);
        setIsModalOpen(true);
        try {
            const token = localStorage.getItem('token');
            axios.get('http://localhost:8080/api/area-loper', { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setListAllAgenOptions(res.data.data || []));
        } catch (e) { console.error(e); }
    };

    const handleLiveSearchFormTyping = async (field, value) => {
        const updatedInput = { ...searchFormInput, [field]: value };
        setSearchFormInput(updatedInput);

        if (!updatedInput.propinsi && !updatedInput.kabupaten && !updatedInput.kecamatan && !updatedInput.kelurahan) {
            setSearchResultMaster([]);
            setSelectedMasterRows([]);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:8080/api/area-loper/suggest-wilayah`, {
                params: updatedInput,
                headers: { Authorization: `Bearer ${token}` }
            });

            // 🚀 SUNTIKAN SAKTI: Map data agar memiliki property value input operasional default
            const rawData = res.data.data || [];
            const mappedData = rawData.map(item => ({
                ...item,
                penerusyn: 'N',
                kgmin: 0,
                hrgpenerus: 0,
                leadtime: 1
            }));

            setSearchResultMaster(mappedData);
        } catch (err) {
            console.error("Gagal melakukan pencarian otomatis", err);
        }
    };

    const handleToggleMasterRow = (row) => {
        setSelectedMasterRows(prev => {
            const exists = prev.some(r => r.kelurahan === row.kelurahan && r.kecamatan === row.kecamatan);
            if (exists) {
                return prev.filter(r => !(r.kelurahan === row.kelurahan && r.kecamatan === row.kecamatan));
            } else {
                return [...prev, row];
            }
        });
    };

    const handleSelectAllMaster = (e) => {
        if (e.target.checked) {
            setSelectedMasterRows([...searchResultMaster]);
        } else {
            setSelectedMasterRows([]);
        }
    };

    const handleAssignMassalKeTerpilih = async () => {
        if (selectedMasterRows.length === 0) {
            Swal.fire('Warning', 'Silakan centang minimal satu wilayah untuk didaftarkan!', 'warning');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.post(`http://localhost:8080/api/area-loper/assign-wilayah-massal`, {
                agen_kode: agenProfil.kode.toString().trim(),
                wilayahs: selectedMasterRows
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({ title: 'Sukses', text: `${selectedMasterRows.length} Wilayah Berhasil Ditambahkan`, icon: 'success', timer: 1200, showConfirmButton: false });

            setSearchResultMaster([]);
            setSelectedMasterRows([]);
            setSearchFormInput({ propinsi: '', kabupaten: '', kecamatan: '', kelurahan: '' });
            fetchAgenProfilHeader(agenProfil.kode);
        } catch (err) {
            Swal.fire('Error', 'Gagal mendaftarkan kluster wilayah operasional', 'error');
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRows(areaTerpilih.map(item => item.id));
        } else {
            setSelectedRows([]);
        }
    };

    const handleToggleRow = (id) => {
        setSelectedRows(prev => prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]);
    };

    const columns = [
        { header: 'KODE', accessor: 'agen_kode', render: (i) => <span className="font-mono font-bold text-blue-600 tracking-wider text-[11px]" style={{ color: '#2563eb' }}>{i.agen_kode}</span> },
        { header: 'NAMA AGEN', accessor: 'agen_nama', render: (i) => <span className="font-bold text-[11px]" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{i.agen_nama}</span> },
        { header: 'ALAMAT', accessor: 'agen_alamat', render: (i) => <span className="text-[11px] block max-w-sm leading-relaxed font-medium" style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>{i.agen_alamat}</span> },
        { header: 'KOTA', accessor: 'agen_kota', render: (i) => <span className="font-bold text-[11px]" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{i.agen_kota}</span> },
        { header: 'TELP', accessor: 'agen_phone', render: (i) => <span className="font-mono text-[11px]" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{i.agen_phone || '-'}</span> },
        { header: 'JUMLAH', accessor: 'jumlah_wilayah', render: (i) => <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200 shadow-sm inline-block">{i.jumlah_wilayah || 0} Wilayah</span> }
    ];

    const handleOpenBatchSubModal = (row) => {
        setBatchActiveItem(row);
        setBatchPayload({ level: 'kelurahan', new_agen_kode: agenProfil.kode });
        setIsBatchModalOpen(true);
    };

    const handleSaveBatchMassal = async () => {
        if (!batchPayload.new_agen_kode) {
            Swal.fire('Warning', 'Silakan pilih cabang/agen petugas loper yang baru!', 'warning');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.post(`http://localhost:8080/api/area-loper/batch-update`, {
                level: batchPayload.level,
                propinsi: batchActiveItem.propinsi,
                kabupaten: batchActiveItem.kabupaten,
                kecamatan: batchActiveItem.kecamatan,
                kelurahan: batchActiveItem.kelurahan,
                new_agen_kode: batchPayload.new_agen_kode
            }, { headers: { Authorization: `Bearer ${token}` } });

            Swal.fire('Sukses', 'Batch penugasan area loper massal berhasil diperbarui', 'success');
            setIsBatchModalOpen(false);

            handleLiveSearchFormTyping('propinsi', searchFormInput.propinsi);
            fetchAgenProfilHeader(agenProfil.kode);
        } catch (err) {
            Swal.fire('Error', 'Gagal memproses batch update', 'error');
        }
    };

    const handleMasterRowInputChange = (idx, field, value) => {
        setSearchResultMaster(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            return updated;
        });

        // Sinkronkan juga data yang ada di dalam checklist selectedMasterRows jika baris tersebut sudah dicentang
        setSelectedMasterRows(prev => {
            const targetRow = searchResultMaster[idx];
            return prev.map(r => {
                if (r.kelurahan === targetRow.kelurahan && r.kecamatan === targetRow.kecamatan) {
                    return { ...r, [field]: value };
                }
                return r;
            });
        });
    };

    // 🚀 ENGINE DELETION MASSAL: Melepas keterikatan wilayah loper aktif dari agen (Gambar 1)
    const handleDeleteMassalTerpilih = async () => {
        if (selectedRows.length === 0) return;

        // Beri konfirmasi peringatan keras khas ERP Dakota Cargo
        Swal.fire({
            title: 'Apakah Anda Yakin?',
            text: `Melepas ${selectedRows.length} wilayah operasional dari keterikatan agen ini?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Lepaskan!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');

                    // Tembak endpoint delete massal ke Golang
                    await axios.delete(`http://localhost:8080/api/area-loper/remove-wilayah-massal`, {
                        headers: { Authorization: `Bearer ${token}` },
                        data: { ids: selectedRows } // Kirim array ID yang dicentang
                    });

                    Swal.fire({ title: 'Berhasil!', text: 'Wilayah sukses dilepas dari agen', icon: 'success', timer: 1200, showConfirmButton: false });

                    // Reset checkbox state kembali kosong
                    setSelectedRows([]);

                    // Refresh total tabel Daftar Area Loper Terpilih bawah biar langsung hilang barisnya
                    fetchAgenProfilHeader(agenProfil.kode);
                    // Refresh data tabel rekap utama depan
                    fetchData();
                } catch (err) {
                    Swal.fire('Error', 'Gagal melepaskan wilayah operasional', 'error');
                }
            }
        });
    };

    // Trigger saat tombol "Ganti" biru di baris area aktif diklik (Gambar 1)
    const handleOpenGantiSubModal = (row) => {
        setGantiActiveItem(row);
        setGantiPayload({
            id: row.id,
            penerusyn: row.penerusyn || 'N',
            kgmin: row.kgmin || 0,
            hrgpenerus: row.hrgpenerus || 0,
            leadtime: row.leadtime || 1,
            new_agen_kode: agenProfil.kode // Default ke kode agen saat ini
        });
        setIsGantiModalOpen(true);
    };

    // Eksekusi tombol Simpan pada sub-modal Ganti Area Loper (Gambar 2)
    const handleSaveGantiAtribut = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:8080/api/area-loper/update-single-atribut`, gantiPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({ title: 'Sukses!', text: 'Parameter wilayah loper berhasil diperbarui', icon: 'success', timer: 1200, showConfirmButton: false });
            setIsGantiModalOpen(false);

            // Refresh ulang data tabel Daftar Area Loper Terpilih bawah biar nilainya langsung berubah
            fetchAgenProfilHeader(agenProfil.kode);
            fetchData(); // Refresh table utama depan
        } catch (err) {
            Swal.fire('Error', 'Gagal memperbarui parameter wilayah loper', 'error');
        }
    };

    return (
        <div className={`min-h-screen p-4 space-y-4 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
            <DataTableTemplate title="Master Area Operasional Wilayah (opr_m_earea)" columns={columns} data={data} loading={loading} isDarkMode={isDarkMode} onAdd={handleOpenAdd} onEdit={handleOpenEditCustom} onDelete={() => { }} />

            {/* MODAL INPUT FORM INTEGRAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-6xl p-6 rounded-2xl shadow-2xl h-[95vh] flex flex-col ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
                        <div className="flex justify-between items-center pb-2 border-b dark:border-slate-700">
                            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">EDIT MASTER AREA LOPER</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"><XIcon size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 my-3 text-xs min-h-0">

                            {/* 📋 AREA 1: DATA AGEN/CABANG PELOPER */}
                            <div className={`p-4 border rounded-xl space-y-3 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide block border-b pb-1">📋 DATA AGEN/CABANG PELOPER</span>
                                <div className="grid grid-cols-5 gap-4">
                                    <div className="col-span-1"><label className="font-bold text-gray-400 block mb-1">KODE AGEN</label><input type="text" className={`w-full p-2 border rounded font-mono font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`} value={agenProfil.kode} readOnly /></div>
                                    <div className="col-span-4"><label className="font-bold text-gray-400 block mb-1">NAMA AGEN</label><input type="text" className={`w-full p-2 border rounded font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`} value={agenProfil.nama} readOnly /></div>
                                    <div className="col-span-3"><label className="font-bold text-gray-400 block mb-1">ALAMAT</label><input type="text" className={`w-full p-2 border rounded ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`} value={agenProfil.alamat} readOnly /></div>
                                    <div className="col-span-1"><label className="font-bold text-gray-400 block mb-1">KOTA</label><input type="text" className={`w-full p-2 border rounded ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`} value={agenProfil.kota} readOnly /></div>
                                    <div className="col-span-1"><label className="font-bold text-gray-400 block mb-1">TELP</label><input type="text" className={`w-full p-2 border rounded ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`} value={agenProfil.telp} readOnly /></div>
                                </div>
                            </div>

                            {/* 🔍 AREA 2: CARI AREA LOPER */}
                            <div className={`p-4 border rounded-xl space-y-3 ${isDarkMode ? 'bg-slate-900/30 border-slate-700' : 'bg-amber-50/40 border-amber-100'}`}>
                                <span className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide block border-b pb-1">🔍 CARI AREA LOPER (LIVE AUTOMATIC DATABASE SEARCH)</span>
                                <div className="grid grid-cols-4 gap-4">
                                    {['propinsi', 'kabupaten', 'kecamatan', 'kelurahan'].map((field) => (
                                        <div key={field}>
                                            <label className="font-bold text-gray-500 block mb-0.5 uppercase">{field}</label>
                                            <input type="text" placeholder={`Ketik ${field}...`} className={`w-full p-2 border rounded uppercase font-semibold outline-none ${isDarkMode ? 'bg-slate-800 border-slate-600 text-blue-400' : 'bg-white border-gray-200 text-blue-600 shadow-sm focus:border-blue-500 bg-yellow-50/10'}`} value={searchFormInput[field]} onChange={e => handleLiveSearchFormTyping(field, e.target.value)} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 📋 AREA GRID HASIL PENCARIAN MASTER DATA KODEPOS */}
                            {searchResultMaster.length > 0 && (
                                <div className={`border rounded-xl p-4 space-y-2 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    <div className={`flex justify-between items-center p-2.5 rounded-lg border shadow-xs transition-all ${isDarkMode
                                        ? 'bg-purple-950/40 border-purple-800 text-purple-200'
                                        : 'bg-purple-100 border-purple-200 text-purple-900'
                                        }`}>
                                        <span className="font-black uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                                            📋 HASIL QUERY MASTER SE-INDONESIA ({searchResultMaster.length} Baris Ditemukan)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleAssignMassalKeTerpilih}
                                            className="px-4 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-105 active:scale-95"
                                        >
                                            <FolderPlus size={14} />
                                            Tambahkan Wilayah Terpilih ({selectedMasterRows.length})
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto max-h-52 border rounded-lg shadow-inner">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-purple-600 text-white sticky top-0 font-bold uppercase tracking-wider text-center text-[10px] shadow-sm">
                                                    <th className="p-2 border-r border-purple-500">Propinsi</th>
                                                    <th className="p-2 border-r border-purple-500">Kota/Kabupaten</th>
                                                    <th className="p-2 border-r border-purple-500">Kecamatan</th>
                                                    <th className="p-2 border-r border-purple-500">Kelurahan</th>

                                                    <th className="p-2 border-r border-purple-500 min-w-[90px]">Penerus Y/N</th>
                                                    <th className="p-2 border-r border-purple-500 min-w-[80px]">Kg Minimal</th>
                                                    <th className="p-2 border-r border-purple-500 min-w-[100px]">Harga (Rp.)</th>
                                                    <th className="p-2 border-r border-purple-500 min-w-[70px]">LeadTime</th>

                                                    <th className="p-2 border-r border-purple-500">Cabang Loper</th>
                                                    <th className="p-2 text-center flex flex-col items-center justify-center gap-0.5 min-w-[70px] bg-purple-700 rounded-tr-lg">
                                                        <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer accent-white" onChange={handleSelectAllMaster} checked={searchResultMaster.length > 0 && selectedMasterRows.length === searchResultMaster.length} />
                                                        <span className="text-[8px] font-normal lowercase leading-none text-purple-100">Pilih Semua</span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {searchResultMaster.map((row, idx) => {
                                                    const isChecked = selectedMasterRows.some(r => r.kelurahan === row.kelurahan && r.kecamatan === row.kecamatan);
                                                    return (
                                                        <tr
                                                            key={idx}
                                                            className="border-b hover:bg-purple-50 dark:hover:bg-purple-950/40 transition text-[11px]"
                                                            style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }}
                                                        >
                                                            <td className="p-2 border-r dark:border-slate-800" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{row.propinsi}</td>
                                                            <td className="p-2 border-r dark:border-slate-800" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{row.kabupaten}</td>
                                                            <td className="p-2 border-r dark:border-slate-800" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{row.kecamatan}</td>
                                                            <td className="p-2 font-bold border-r dark:border-slate-800" style={{ color: isDarkMode ? '#c084fc' : '#6b21a8' }}>{row.kelurahan}</td>

                                                            {/* 🟢 BARIS CELL INPUT BARU (Gambar 1) */}
                                                            <td className="p-1 border-r dark:border-slate-800 text-center">
                                                                <select className="p-1 border rounded font-bold bg-white text-slate-800 text-[11px] outline-none" value={row.penerusyn} onChange={e => handleMasterRowInputChange(idx, 'penerusyn', e.target.value)}>
                                                                    <option value="N">N</option>
                                                                    <option value="Y">Y</option>
                                                                </select>
                                                            </td>
                                                            <td className="p-1 border-r dark:border-slate-800">
                                                                <input type="number" className="w-full p-1 border rounded text-right font-mono text-slate-800 text-[11px] bg-slate-50/50" value={row.kgmin} onChange={e => handleMasterRowInputChange(idx, 'kgmin', parseInt(e.target.value) || 0)} />
                                                            </td>
                                                            <td className="p-1 border-r dark:border-slate-800">
                                                                <input type="number" className="w-full p-1 border rounded text-right font-mono font-bold text-emerald-600 text-[11px] bg-slate-50/50" value={row.hrgpenerus} onChange={e => handleMasterRowInputChange(idx, 'hrgpenerus', parseInt(e.target.value) || 0)} />
                                                            </td>
                                                            <td className="p-1 border-r dark:border-slate-800">
                                                                <input type="number" className="w-full p-1 border rounded text-center font-mono text-slate-800 text-[11px] bg-slate-50/50" value={row.leadtime} onChange={e => handleMasterRowInputChange(idx, 'leadtime', parseInt(e.target.value) || 0)} />
                                                            </td>

                                                            <td className="p-1 text-center border-r dark:border-slate-800" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }}>
                                                                <button type="button" onClick={() => handleOpenBatchSubModal(row)} className="px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] shadow-sm transition">Batch</button>
                                                            </td>

                                                            <td className="p-2 text-center" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }}>
                                                                <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer accent-purple-600" checked={isChecked} onChange={() => { handleToggleMasterRow(row); }} />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* 🌐 AREA 3: DAFTAR AREA LOPER TERPILIH */}
                            <div className={`border rounded-xl p-4 space-y-3 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                                <div className={`p-2.5 rounded-lg font-bold uppercase tracking-wider text-center text-xs shadow-sm transition-colors ${isDarkMode ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                    🌐 DAFTAR AREA LOPER TERPILIH (AKTIF DI AGEN)
                                </div>
                                <div className={`overflow-x-auto max-h-52 border rounded-lg shadow-sm transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-blue-600 text-white sticky top-0 font-bold uppercase tracking-wider text-center text-[10px] shadow-sm">
                                                <th className="p-2 border-r border-blue-500">Propinsi</th>
                                                <th className="p-2 border-r border-blue-500">Kota</th>
                                                <th className="p-2 border-r border-blue-500">Kecamatan</th>
                                                <th className="p-2 border-r border-blue-500">Kelurahan</th>
                                                <th className="p-2 border-r border-blue-500">Penerus Y/N</th>
                                                <th className="p-2 border-r border-blue-500">Kg Minimal</th>
                                                <th className="p-2 border-r border-blue-500">Harga (Rp.)</th>
                                                <th className="p-2 border-r border-blue-500">LeadTime</th>
                                                <th className="p-2 border-r border-blue-500">Ganti</th>
                                                <th className="p-2 text-center flex flex-col items-center justify-center gap-1 min-w-[80px]">
                                                    <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer accent-blue-600" onChange={handleSelectAll} checked={areaTerpilih.length > 0 && selectedRows.length === areaTerpilih.length} />
                                                    <span className="text-[9px] font-normal lowercase leading-none text-blue-100">Pilih Semua</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {areaTerpilih.length === 0 ? (
                                                <tr><td colSpan={10} className={`text-center p-8 text-gray-400 font-bold tracking-wide transition-colors ${isDarkMode ? 'bg-slate-900/40' : 'bg-slate-50/50'}`}>Belum ada area loper terpilih untuk agen ini.</td></tr>
                                            ) : (
                                                areaTerpilih.map((row) => (
                                                    <tr key={row.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/40 transition duration-100 text-[11px]">
                                                        <td className="p-2 border-r dark:border-slate-800" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{row.tujuan_propinsi}</td>
                                                        <td className="p-2 border-r dark:border-slate-800" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{row.tujuan_kabupaten}</td>
                                                        <td className="p-2 border-r dark:border-slate-800" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{row.tujuan_kecamatan}</td>
                                                        <td className="p-2 font-bold border-r dark:border-slate-800" style={{ color: '#2563eb' }}>{row.tujuan_kelurahan}</td>
                                                        <td className="p-2 text-center border-r dark:border-slate-800"><span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${row.penerusyn === 'Y' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{row.penerusyn}</span></td>
                                                        <td className="p-2 text-right font-mono border-r dark:border-slate-800" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{row.kgmin} kg</td>
                                                        <td className="p-2 text-right font-mono font-bold text-emerald-600 border-r dark:border-slate-800">Rp {row.hrgpenerus?.toLocaleString()}</td>
                                                        <td className="p-2 text-center font-mono border-r dark:border-slate-800" style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>{row.leadtime} Hari</td>
                                                        <td className="p-1 text-center border-r dark:border-slate-800">
                                                            {/* 🟢 SUNTIKAN SAKTI: Menghubungkan klik ke sub-modal editor ganti (Gambar 1) */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenGantiSubModal(row)}
                                                                className="px-2.5 py-0.5 rounded bg-blue-500 hover:bg-blue-600 text-white font-bold text-[10px] shadow-sm transition"
                                                            >
                                                                Ganti
                                                            </button>
                                                        </td>
                                                        <td className="p-1 text-center"><input type="checkbox" className="w-3.5 h-3.5 cursor-pointer accent-blue-600" checked={selectedRows.includes(row.id)} onChange={() => handleToggleRow(row.id)} /></td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>

                        {/* FOOTER ACTION BUTTON */}
                        <div className={`flex justify-end gap-3 p-4 border-t sticky bottom-0 -mx-6 -mb-6 mt-auto rounded-b-2xl ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-gray-100'}`}>
                            {selectedRows.length > 0 && (
                                /* 🟢 SUNTIKAN SAKTI: Menghubungkan fungsi klik hapus massal dari checkbox area terpilih */
                                <button
                                    type="button"
                                    onClick={handleDeleteMassalTerpilih}
                                    className="mr-auto px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs transition-all shadow-xs"
                                >
                                    🗑️ Hapus Dari Agen ({selectedRows.length})
                                </button>
                            )}
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border bg-white dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-200 text-xs">Keluar</button>
                            <button type="button" className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 font-black shadow-md text-xs">💾 Simpan Massal</button>
                        </div>

                    </div>
                </div>
            )}

            {/* 📋 SUB-MODAL POP-UP: BATCH AREA LOPER MASSAL */}
            {isBatchModalOpen && batchActiveItem && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
                    <div className="w-full max-w-xl bg-white text-slate-900 p-6 rounded-xl shadow-2xl border border-gray-100 flex flex-col relative animate-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center pb-2 border-b">
                            <h4 className="text-base font-black text-slate-800 flex items-center gap-1.5">📦 Batch Area Loper</h4>
                            <button onClick={() => setIsBatchModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
                        </div>
                        <div className="my-4 space-y-4 text-xs">
                            <div className="space-y-1.5">
                                <label className="font-black text-gray-500 uppercase tracking-wider block">BATCH LEVEL :</label>
                                <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2.5 rounded-lg border border-dashed">
                                    {[
                                        { label: batchActiveItem.propinsi, value: 'propinsi' },
                                        { label: batchActiveItem.kabupaten, value: 'kabupaten' },
                                        { label: batchActiveItem.kecamatan, value: 'kecamatan' },
                                        { label: batchActiveItem.kelurahan, value: 'kelurahan' }
                                    ].map((opt, rIdx) => (
                                        <label key={rIdx} className="flex items-center gap-1.5 font-bold cursor-pointer text-slate-700 hover:text-black">
                                            <input type="radio" name="batchLevelRadio" className="w-3.5 h-3.5 accent-blue-600 cursor-pointer" checked={batchPayload.level === opt.value} onChange={() => setBatchPayload(prev => ({ ...prev, level: opt.value }))} />
                                            <span className={batchPayload.level === opt.value ? "text-blue-600 font-extrabold uppercase" : "uppercase text-[11px]"}>{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="font-black text-gray-500 uppercase tracking-wider block mb-1">PETUGAS LOPER SAAT INI :</label>
                                <input type="text" className="w-full p-2 border bg-gray-50 font-bold text-slate-600 rounded outline-none" value={agenProfil.nama} readOnly />
                            </div>
                            <div>
                                <label className="font-black text-gray-500 uppercase tracking-wider block mb-1">PILIH CABANG/AGEN PETUGAS LOPER BARU :</label>
                                <select className="w-full p-2 border rounded font-bold bg-white text-slate-800 shadow-sm focus:border-blue-500 outline-none cursor-pointer" value={batchPayload.new_agen_kode} onChange={e => setBatchPayload(prev => ({ ...prev, new_agen_kode: e.target.value }))}>
                                    <option value="">-- PILIH AGEN PENERUS BARU --</option>
                                    {listAllAgenOptions.map((agen) => (
                                        <option key={agen.agen_id} value={agen.agen_kode?.toString().trim()}>
                                            {agen.agen_kode} - {agen.agen_nama} ({agen.agen_kota})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t pt-3 mt-2">
                            <button type="button" onClick={() => setIsBatchModalOpen(false)} className="px-4 py-1.5 rounded border bg-slate-100 font-bold text-slate-700 text-xs hover:bg-slate-200 transition">Batal</button>
                            <button type="button" onClick={handleSaveBatchMassal} className="px-5 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition">Simpan Batch</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 📋 SUB-MODAL POP-UP: GANTI AREA LOPER (ATRIBUT EDITOR - PERSIS GAMBAR 2) */}
            {isGantiModalOpen && gantiActiveItem && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
                    <div className="w-full max-w-2xl bg-white text-slate-900 p-6 rounded-xl shadow-2xl border border-gray-100 flex flex-col relative animate-in zoom-in-95 duration-150">

                        {/* Close Button X */}
                        <div className="flex justify-between items-center pb-2 border-b mb-4">
                            <h4 className="text-base font-black text-slate-800 uppercase tracking-wide">⚙️ Ganti Area Loper</h4>
                            <button onClick={() => setIsGantiModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
                        </div>

                        {/* RENDER ROW GEOGRAFIS SIFATNYA READONLY (Kunci Data Wilayah Terpilih) */}
                        <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                            <div>
                                <label className="font-black text-gray-500 uppercase block mb-0.5">PROPINSI</label>
                                <input type="text" className="w-full p-2 border bg-gray-50 font-bold uppercase rounded text-slate-500" value={gantiActiveItem.tujuan_propinsi} readOnly />
                            </div>
                            <div>
                                <label className="font-black text-gray-500 uppercase block mb-0.5">KOTA/KABUPATEN</label>
                                <input type="text" className="w-full p-2 border bg-gray-50 font-bold uppercase rounded text-slate-500" value={gantiActiveItem.tujuan_kabupaten} readOnly />
                            </div>
                            <div>
                                <label className="font-black text-gray-500 uppercase block mb-0.5">KECAMATAN</label>
                                <input type="text" className="w-full p-2 border bg-gray-50 font-bold uppercase rounded text-slate-500" value={gantiActiveItem.tujuan_kecamatan} readOnly />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-xs mb-4">
                            <div>
                                <label className="font-black text-gray-500 uppercase block mb-0.5">KELURAHAN</label>
                                <input type="text" className="w-full p-2 border bg-gray-50 font-bold uppercase rounded text-slate-500" value={gantiActiveItem.tujuan_kelurahan} readOnly />
                            </div>

                            {/* PENERUS Y/N INPUT RADIO BUTTON (Gambar 2) */}
                            <div>
                                <label className="font-black text-gray-500 uppercase block mb-1">PENERUS Y/N</label>
                                <div className="flex items-center gap-4 p-2 border rounded bg-white h-[34px] font-bold">
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" name="gantiPenerusRadio" className="w-3.5 h-3.5 accent-blue-600" checked={gantiPayload.penerusyn === 'Y'} onChange={() => setGantiPayload(prev => ({ ...prev, penerusyn: 'Y' }))} />
                                        <span>Ya</span>
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" name="gantiPenerusRadio" className="w-3.5 h-3.5 accent-blue-600" checked={gantiPayload.penerusyn === 'N'} onChange={() => setGantiPayload(prev => ({ ...prev, penerusyn: 'N' }))} />
                                        <span>Tidak</span>
                                    </label>
                                </div>
                            </div>

                            {/* KG MINIMAL */}
                            <div>
                                <label className="font-black text-gray-500 uppercase block mb-0.5">KG MINIMAL</label>
                                <input type="number" placeholder="Masukan Minimal" className="w-full p-2 border rounded font-mono font-bold text-slate-800" value={gantiPayload.kgmin} onChange={e => setGantiPayload(prev => ({ ...prev, kgmin: parseFloat(e.target.value) || 0 }))} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                            {/* HARGA */}
                            <div>
                                <label className="font-black text-gray-500 uppercase block mb-0.5">HARGA (RP.)</label>
                                <input type="number" placeholder="Masukan Harga Minimal" className="w-full p-2 border rounded font-mono font-bold text-emerald-600" value={gantiPayload.hrgpenerus} onChange={e => setGantiPayload(prev => ({ ...prev, hrgpenerus: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            {/* LEADTIME */}
                            <div>
                                <label className="font-black text-gray-500 uppercase block mb-0.5">LEADTIME</label>
                                <input type="number" placeholder="Masukan Leadtime" className="w-full p-2 border rounded font-mono font-bold text-slate-800" value={gantiPayload.leadtime} onChange={e => setGantiPayload(prev => ({ ...prev, leadtime: parseInt(e.target.value) || 1 }))} />
                            </div>
                        </div>

                        {/* GANTI PETUGAS AGEN PENERUS (Gambar 2 Bawah) */}
                        <div className="text-xs border-t pt-3 mb-2">
                            <label className="font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide block mb-1">PILIH CABANG/AGEN PETUGAS LOPER BARU :</label>
                            <select className="w-full p-2 border rounded font-bold bg-white text-slate-800 shadow-sm focus:border-blue-500 outline-none cursor-pointer text-xs" value={gantiPayload.new_agen_kode} onChange={e => setGantiPayload(prev => ({ ...prev, new_agen_kode: e.target.value }))}>
                                {listAllAgenOptions.map((agen) => (
                                    <option key={agen.agen_id} value={agen.agen_kode?.toString().trim()}>
                                        {agen.agen_kode} - {agen.agen_nama} ({agen.agen_kota})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Action Trigger Footer Sub-Modal */}
                        <div className="flex justify-end gap-2 border-t pt-3 mt-4">
                            <button type="button" onClick={() => setIsGantiModalOpen(false)} className="px-4 py-1.5 rounded border bg-slate-100 font-bold text-slate-700 text-xs hover:bg-slate-200 transition">Batal</button>
                            <button type="button" onClick={handleSaveGantiAtribut} className="px-5 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition">Simpan</button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterAreaLoper;