import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';

const SuratPengantarTurun = () => {
    const { isDarkMode } = useDarkMode();

    // 🏢 DOM Sniffer State untuk Mengunci Agen Penerima secara Live
    const [currentActiveAgen, setCurrentActiveAgen] = useState('');
    const [loading, setLoading] = useState(false);

    // ─── STATE FASE 1: SCAN & PREVIEW ───
    const [inputSPEID, setInputSPEID] = useState('');
    const [spHeaderPreview, setSpHeaderPreview] = useState(null);
    const [spDetailsPreview, setSpDetailsPreview] = useState([]);
    const [isManifesOpen, setIsManifesOpen] = useState(false);

    // ─── STATE FASE 2: MANIFEST DATA FOR TABLE ───
    const [manifestRows, setManifestRows] = useState([]);
    const debounceTimeouts = useRef({});

    // =========================================================================
    // 🔍 LIVE DOM SNIFFER: Deteksi Loket Cabang Aktif Saat Ini
    // =========================================================================
    useEffect(() => {
        const interval = setInterval(() => {
            let detectedAgen = '';
            const navElements = document.querySelectorAll('button, select, span, div');
            for (let el of navElements) {
                if (el.innerText && el.innerText.includes('AGEN') && !el.innerText.includes('LOKET')) {
                    detectedAgen = el.innerText.trim();
                    break;
                }
            }
            if (!detectedAgen) {
                detectedAgen = localStorage.getItem('active_agen_nama') || '';
            }
            if (detectedAgen && detectedAgen !== currentActiveAgen) {
                setCurrentActiveAgen(detectedAgen);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [currentActiveAgen]);

    // =========================================================================
    // ⚡ AJAX PREVIEW: Terpicu Otomatis Saat Mencapai >= 15 Karakter
    // =========================================================================
    useEffect(() => {
        const cleanSP = inputSPEID.trim().toUpperCase();
        if (cleanSP.length >= 15 && !isManifesOpen) {
            const delayDebounce = setTimeout(async () => {
                setLoading(true);
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`http://localhost:8080/api/operasional/sp-turun/preview`, {
                        params: { sp_id: cleanSP },
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (res.data.status === 'success') {
                        setSpHeaderPreview(res.data.header);
                        setSpDetailsPreview(res.data.details || []);

                        // Deteksi Otomatis Proteksi Larangan SP PAD dari PT yang Sama
                        const spPTCode = cleanSP.charAt(1);
                        const myPTCode = localStorage.getItem('selected_pt') || 'A';
                        if (cleanSP.startsWith('P') && spPTCode === myPTCode) {
                            Swal.fire('HAK AKSES DITOLAK', 'Aturan Dokumen PAD: Tidak bisa memproses SP PAD yang diterbitkan oleh PT Anda sendiri!', 'error');
                            resetFase1();
                        }
                    }
                } catch (err) {
                    console.error("Gagal memuat preview SP:", err);
                    setSpHeaderPreview(null);
                    setSpDetailsPreview([]);
                } finally {
                    setLoading(false);
                }
            }, 300);
            return () => clearTimeout(delayDebounce);
        } else if (cleanSP.length < 15) {
            setSpHeaderPreview(null);
            setSpDetailsPreview([]);
        }
    }, [inputSPEID]);

    const resetFase1 = () => {
        setInputSPEID('');
        setSpHeaderPreview(null);
        setSpDetailsPreview([]);
        setIsManifesOpen(false);
        setManifestRows([]);
    };

    // =========================================================================
    // 📥 INITIAL SAVE: Eksekusi Buka Manifes Bongkar ke Database
    // =========================================================================
    const handleOpenManifesBongkar = async () => {
        if (!spHeaderPreview || spDetailsPreview.length === 0) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                sp_eid: spHeaderPreview.spt_eid,
                sp_agenid: parseInt(localStorage.getItem('active_agen_id')) || 99, // 🎯 FIX: Menggunakan parseInt resmi JS
                spt_transityn: spHeaderPreview.spt_transityn || 'N',
                daftar_btt: spDetailsPreview.map(item => item.btt_id)
            };

            const res = await axios.post('http://localhost:8080/api/operasional/sp-turun/initial', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status === 'success') {
                const initialRows = spDetailsPreview.map((item, idx) => ({
                    generated_id: idx + 1,
                    btt_id: item.btt_id,
                    sp_jmlterima: 0,
                    sp_keterangan: '',
                    status_save: 'WAITING'
                }));
                setManifestRows(initialRows);
                setIsManifesOpen(true);
                Swal.fire('MANIFES DIBUKA', 'Silakan lakukan penghitungan fisik koli muatan!', 'success');
            }
        } catch (err) {
            Swal.fire('GAGAL MEMBUKA', err.response?.data?.message || 'Koneksi terputus', 'error');
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // ⚡ REAL-TIME AUTOSAVE INTERCEPTOR (Debounced per 800ms)
    // =========================================================================
    const triggerRowAutoSave = (bttID, jmlTerima, keterangan) => {
        if (debounceTimeouts.current[bttID]) {
            clearTimeout(debounceTimeouts.current[bttID]);
        }

        setManifestRows(prev => prev.map(row => row.btt_id === bttID ? { ...row, status_save: 'SAVING...' } : row));

        debounceTimeouts.current[bttID] = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const payload = {
                    sp_eid: spHeaderPreview.spt_eid,
                    sp_bttid: bttID,
                    sp_jmlterima: parseInt(jmlTerima) || 0, // 🎯 FIX: Menggunakan parseInt resmi JS
                    sp_keterangan: keterangan || ''
                };

                await axios.post('http://localhost:8080/api/operasional/sp-turun/autosave', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setManifestRows(prev => prev.map(row => row.btt_id === bttID ? { ...row, status_save: 'SYNCED ✓' } : row));
            } catch (err) {
                setManifestRows(prev => prev.map(row => row.btt_id === bttID ? { ...row, status_save: 'ERROR ✗' } : row));
            }
        }, 800);
    };

    const handleInputChange = (bttID, field, value) => {
        setManifestRows(prev => prev.map(row => {
            if (row.btt_id === bttID) {
                const updatedRow = { ...row, [field]: value };
                triggerRowAutoSave(bttID, field === 'sp_jmlterima' ? value : row.sp_jmlterima, field === 'sp_keterangan' ? value : row.sp_keterangan);
                return updatedRow;
            }
            return row;
        }));
    };

    // =========================================================================
    // 📊 DEFINISI KOLOM SESUAI TEMPLATE
    // =========================================================================
    const columns = [
        { header: 'No Urut', accessor: 'generated_id' },
        {
            header: 'Nomor BTT / Resi Kargo',
            accessor: 'btt_id',
            render: (item) => <span className="font-black tracking-wider text-indigo-600">{item.btt_id}</span>
        },
        {
            header: 'Jml Diterima (Koli)',
            accessor: 'sp_jmlterima',
            render: (item) => (
                <input
                    type="number"
                    min="0"
                    value={item.sp_jmlterima}
                    onChange={e => handleInputChange(item.btt_id, 'sp_jmlterima', e.target.value)}
                    className="p-1 border border-indigo-300 rounded text-center w-24 font-bold bg-transparent dark:text-white"
                />
            )
        },
        {
            header: 'Catatan Kondisi Barang',
            accessor: 'sp_keterangan',
            render: (item) => (
                <input
                    type="text"
                    placeholder="Contoh: Koli aman / basah / pecah..."
                    value={item.sp_keterangan}
                    onChange={e => handleInputChange(item.btt_id, 'sp_keterangan', e.target.value)}
                    className="p-1 border border-gray-300 rounded w-full max-w-xs bg-transparent text-sm dark:text-white"
                />
            )
        },
        {
            header: 'Status Sync',
            accessor: 'status_save',
            render: (item) => (
                <span className={`px-2 py-1 rounded text-xs font-bold ${item.status_save === 'SYNCED ✓' ? 'bg-green-100 text-green-600' :
                        item.status_save === 'SAVING...' ? 'bg-amber-100 text-amber-600 animate-pulse' :
                            item.status_save === 'ERROR ✗' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {item.status_save}
                </span>
            )
        },
    ];

    // 🎯 FIX STRING: Memotong pemisahan baris string kelas CSS agar terhindar dari ralat unterminated string
    const previewBoxClass = "mt-4 p-4 border border-dashed border-indigo-300 rounded bg-indigo-50/5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200";

    return (
        <div className="space-y-6">
            {/* PANEL ATAS: SCAN & CONTROL BAR */}
            <div className={`p-6 rounded border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-slate-800'}`}>
                <h2 className="text-md font-bold uppercase tracking-wider text-indigo-500 mb-4">📥 Input & Scan Surat Pengantar Turun</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div>
                        <label className="text-xs font-bold text-gray-400">CABANG PENERIMA</label>
                        <input type="text" readOnly value={currentActiveAgen} className={`w-full mt-1 p-2 rounded font-bold border-none outline-none cursor-not-allowed ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-slate-100 text-slate-700'}`} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-indigo-500 tracking-wider">MASUKKAN NOMOR SP NAIK / SCAN BARCODE SP *</label>
                        <div className="flex gap-2 mt-1">
                            <input
                                type="text"
                                placeholder="Ketik/Scan nomor SP (Contoh: SDBS...)"
                                value={inputSPEID}
                                disabled={isManifesOpen}
                                onChange={e => setInputSPEID(e.target.value)}
                                className="w-full p-2 border border-indigo-400 rounded font-bold uppercase bg-transparent text-indigo-600 outline-none"
                            />
                            {isManifesOpen && (
                                <button type="button" onClick={resetFase1} className="p-2 px-4 bg-red-600 text-white font-bold rounded text-xs uppercase">Reset</button>
                            )}
                        </div>
                    </div>
                </div>

                {/* AJAX IN-LINE PREVIEW */}
                {spHeaderPreview && !isManifesOpen && (
                    <div className={previewBoxClass}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs flex-1">
                            <div><span className="text-gray-400">No. SP:</span> <strong className="block mt-0.5">{spHeaderPreview.spt_eid}</strong></div>
                            <div><span className="text-gray-400">Armada Nopol:</span> <strong className="block mt-0.5">{spHeaderPreview.spt_nomobil || '-'}</strong></div>
                            <div><span className="text-gray-400">Driver Sopir:</span> <strong className="block mt-0.5">{spHeaderPreview.spt_namasopir || '-'}</strong></div>
                            <div><span className="text-gray-400">Tipe Rute:</span> <strong className="block mt-0.5">{spHeaderPreview.spt_transityn === 'Y' ? '🚚 TRANSIT' : '🚀 LANGSUNG'}</strong></div>
                        </div>
                        <button type="button" onClick={handleOpenManifesBongkar} className="p-2 px-5 bg-green-600 text-white font-bold rounded text-xs uppercase shadow hover:bg-green-700">
                            🔓 Buka Manifes Bongkar ({spDetailsPreview.length} BTT)
                        </button>
                    </div>
                )}
            </div>

            {/* PANEL UTAMA: WRAPPED DATATABLETEMPLATE */}
            {isManifesOpen && (
                <DataTableTemplate
                    title="PENCATATAN MANIFEST SP TURUN BONGKAR ONLINE"
                    columns={columns}
                    data={manifestRows}
                    loading={loading}
                    isDarkMode={isDarkMode}
                />
            )}
        </div>
    );
};

export default SuratPengantarTurun;