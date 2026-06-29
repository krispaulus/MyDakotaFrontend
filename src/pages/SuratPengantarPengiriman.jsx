import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';

const SuratPengantarPengiriman = () => {
    const { isDarkMode } = useDarkMode();

    // 🏢 Multi-Tenant Dynamic Agen Asal Lock
    const [currentActiveAgen, setCurrentActiveAgen] = useState(() => {
        const liveAgenNama = localStorage.getItem('active_agen_nama');
        const liveAgenId = localStorage.getItem('active_agen_id');
        const liveKodeCabang = localStorage.getItem('kode_cabang') || localStorage.getItem('profile_kode_cabang');

        if (liveAgenNama || liveAgenId || liveKodeCabang) {
            return liveAgenNama || liveAgenId || liveKodeCabang;
        }

        // Emergency Fallback: Ambil paksa teks dari header dropdown yang tertulis di layar
        if (document.body && document.body.innerText.includes('AGEN')) {
            const match = document.body.innerText.match(/[A-Z\s]+AGEN/);
            if (match) return match[0].trim();
        }

        return '';
    });

    // 📊 State Management Data Dropdown & Loading
    const [loading, setLoading] = useState(false);
    const [fleet, setFleet] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [agens, setAgens] = useState([]);

    // 📝 State Rincian Data Manifest yang di-scan (Bentuk Array Object untuk DataTableTemplate)
    const [manifestData, setManifestData] = useState([]);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [filterParams, setFilterParams] = useState({
        tanggal_awal: new Date().toISOString().split('T')[0], // Default tanggal hari ini
        tanggal_akhir: new Date().toISOString().split('T')[0],
        no_sp: '',
        no_btt: '',
        no_loading: '',
        no_surat_tugas: ''
    });

    // State Form Manifest Header
    const [formData, setFormData] = useState({
        spt_tujuan_agen_nama: '',
        spt_transityn: 'N',
        spt_namasopir: '',
        spt_nomobil: '',
        spt_surattugas: '',
        spt_boronganyn: 'N',
        spt_service: 1
    });

    // =========================================================================
    // 🔍 ULTIMATE DOM SNIFFER: Pemantau Dropdown Navigasi Global
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
    // 🔄 FETCH MASTER DATA DROPDOWN
    // =========================================================================
    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const token = localStorage.getItem('token');
                const resFleet = await axios.get('http://localhost:8080/api/operasional/fleet-drivers', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (resFleet.data.status === 'success') {
                    setFleet(resFleet.data.fleet || []);
                    setDrivers(resFleet.data.drivers || []);
                }
                const resAgens = await axios.get('http://localhost:8080/api/agens', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (Array.isArray(resAgens.data)) {
                    setAgens(resAgens.data);
                }
            } catch (error) {
                console.error("Gagal sinkronisasi data master:", error);
            }
        };
        fetchMasterData();
    }, [currentActiveAgen]);

    // =========================================================================
    // 🔍 TRIGGER SEARCH: Tarik Data Histori Manifes Dokumen Berdasarkan Filter
    // =========================================================================
    const handleSearchHistory = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:8080/api/operasional/pool-btt', {
                params: {
                    agen_id: currentActiveAgen,
                    ...filterParams
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status === 'success' && Array.isArray(response.data.data)) {
                // Konversi format response backend ke baris manifest DataTableTemplate
                const mappedData = response.data.data.map((item, idx) => ({
                    no_urut: idx + 1,
                    btt_id: item.btt_id,
                    scan_time: item.btt_tanggal || '-',
                    status_muat: 'POSTED'
                }));
                setManifestData(mappedData);
                Swal.fire('PENCARIAN SELESAI', `Berhasil menemukan ${mappedData.length} manifes data resi!`, 'success');
            }
        } catch (error) {
            console.error("Gagal menarik histori manifest:", error);
            Swal.fire('PENCARIAN KOSONG', 'Tidak ada data manifes yang cocok dengan parameter filter.', 'info');
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // 🛒 SCANNER HANDLER
    // =========================================================================
    const handleAddBTT = (e) => {
        e.preventDefault();
        const cleanBTT = barcodeInput.trim().toUpperCase();
        if (!cleanBTT) return;

        const isDuplicate = manifestData.some(item => item.btt_id === cleanBTT);
        if (isDuplicate) {
            Swal.fire('DUPLIKASI BTT!', `Resi ${cleanBTT} sudah ada di muatan!`, 'warning');
            setBarcodeInput('');
            return;
        }

        const newRow = {
            no_urut: manifestData.length + 1,
            btt_id: cleanBTT,
            scan_time: new Date().toLocaleTimeString(),
            status_muat: 'READY'
        };

        setManifestData([...manifestData, newRow]);
        setBarcodeInput('');
    };

    const handleDeleteRow = (item) => {
        const filtered = manifestData.filter(row => row.btt_id !== item.btt_id);
        const reordered = filtered.map((row, idx) => ({ ...row, no_urut: idx + 1 }));
        setManifestData(reordered);
    };

    const handleSaveSPNaik = async () => {
        if (!formData.spt_tujuan_agen_nama || !formData.spt_nomobil || !formData.spt_namasopir) {
            Swal.fire('BELUM LENGKAP', 'Wajib melengkapi data Cabang Tujuan, Armada, dan Sopir!', 'warning');
            return;
        }
        if (manifestData.length === 0) {
            Swal.fire('MANIFEST KOSONG', 'Minimal scan 1 nomor resi BTT!', 'error');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                spt_asal_agen_nama: currentActiveAgen,
                spt_tujuan_agen_nama: formData.spt_tujuan_agen_nama,
                spt_transityn: formData.spt_transityn,
                spt_namasopir: formData.spt_namasopir,
                spt_nomobil: formData.spt_nomobil,
                spt_surattugas: formData.spt_surattugas,
                spt_boronganyn: formData.spt_boronganyn,
                spt_service: parseInt(formData.spt_service),
                daftar_btt: manifestData.map(item => item.btt_id)
            };

            const response = await axios.post('http://localhost:8080/api/operasional/sp-naik', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status === 'success') {
                Swal.fire('SUKSES!', `Surat Pengantar Nomor ${response.data.spt_eid} Berhasil Terbit!`, 'success');
                setManifestData([]);
            }
        } catch (err) {
            Swal.fire('TRANSAKSI GAGAL', err.response?.data?.message || 'Server error', 'error');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { header: 'No', accessor: 'no_urut' },
        {
            header: 'Nomor BTT / Resi Kargo',
            accessor: 'btt_id',
            render: (item) => <span className="font-black tracking-widest text-indigo-600">{item.btt_id}</span>
        },
        { header: 'Waktu Muat / Tanggal', accessor: 'scan_time' },
        {
            header: 'Status',
            accessor: 'status_muat',
            render: (item) => (
                <span className={`px-3 py-1 rounded-full text-xs font-black ${item.status_muat === 'READY' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {item.status_muat}
                </span>
            )
        },
    ];

    return (
        <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>

            {/* 🛠️ PANEL FILTER PARAMETER ADVANCED PENCARIAN (Poin 1 - 5) */}
            <div className={`p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                <h2 className="text-md font-bold uppercase tracking-wider text-indigo-500 mb-4">🔍 Panel Filter & Pencarian Dokumen Operasional</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400">DARI TANGGAL</label>
                        <input type="date" value={filterParams.tanggal_awal} onChange={e => setFilterParams({ ...filterParams, tanggal_awal: e.target.value })} className="w-full mt-1 p-2 border rounded-lg bg-transparent" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400">SAMPAI TANGGAL</label>
                        <input type="date" value={filterParams.tanggal_akhir} onChange={e => setFilterParams({ ...filterParams, tanggal_akhir: e.target.value })} className="w-full mt-1 p-2 border rounded-lg bg-transparent" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400">NO. SP NAIK</label>
                        <input type="text" placeholder="Cari No SP..." value={filterParams.no_sp} onChange={e => setFilterParams({ ...filterParams, no_sp: e.target.value })} className="w-full mt-1 p-2 border rounded-lg bg-transparent" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400">NO. BTT / RESI</label>
                        <input type="text" placeholder="Cari No BTT..." value={filterParams.no_btt} onChange={e => setFilterParams({ ...filterParams, no_btt: e.target.value })} className="w-full mt-1 p-2 border rounded-lg bg-transparent" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400">NO. LOADING / SURAT TUGAS</label>
                        <input type="text" placeholder="Cari Surat Tugas..." value={filterParams.no_surat_tugas} onChange={e => setFilterParams({ ...filterParams, no_surat_tugas: e.target.value, no_loading: e.target.value })} className="w-full mt-1 p-2 border rounded-lg bg-transparent" />
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <button type="button" onClick={handleSearchHistory} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 uppercase tracking-wider shadow-sm">
                        🔎 Jalankan Filter Data
                    </button>
                </div>
            </div>

            {/* FORM CONFIG MANIFEST ARMADA */}
            <div className={`p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                <h2 className="text-md font-bold uppercase tracking-wider text-indigo-500 mb-4">🚛 Konfigurasi Pemberangkat Truk Logistik</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400">LOKET AGEN ASAL</label>
                        <input type="text" readOnly value={currentActiveAgen} className={`w-full mt-1 p-2.5 rounded-lg font-bold border-none outline-none ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-slate-100 text-slate-700'}`} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400">CABANG TUJUAN *</label>
                        <select required value={formData.spt_tujuan_agen_nama} onChange={e => setFormData({ ...formData, spt_tujuan_agen_nama: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg bg-transparent">
                            <option value="">-- PILIH TUJUAN --</option>
                            {agens.map((item, idx) => (
                                <option key={idx} value={item.agen_nama}>{item.agen_nama}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400">NO POLISI KENDARAAN *</label>
                        <select required value={formData.spt_nomobil} onChange={e => setFormData({ ...formData, spt_nomobil: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg bg-transparent">
                            <option value="">-- PILIH ARMADA --</option>
                            {fleet.map((item, idx) => (
                                <option key={idx} value={item.nopol}>{item.nopol} ({item.kend_merk})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400">PENGEMUDI / SOPIR *</label>
                        <select required value={formData.spt_namasopir} onChange={e => setFormData({ ...formData, spt_namasopir: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg bg-transparent">
                            <option value="">-- PILIH DRIVER --</option>
                            {drivers.map((item, idx) => (
                                <option key={idx} value={item.nama}>{item.nama}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-gray-700 flex items-end gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Entry Barcode Scanner Muat Barang</label>
                        <input type="text" placeholder="Ketik nomor resi lalu tekan Enter..." value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddBTT(e)} className="w-full mt-1 p-3 border border-indigo-300 dark:border-indigo-500 rounded-xl font-black tracking-widest text-indigo-600 bg-indigo-50/10 outline-none" />
                    </div>
                    <button type="button" onClick={handleAddBTT} className="p-3.5 px-6 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 uppercase">Scan Muat</button>
                </div>
            </div>

            {/* DATATABLE DATA TEMPLATE */}
            <div className="relative">
                <DataTableTemplate
                    title={`DATALIST MANIFEST MUATAN ARMADA (${manifestData.length} ITEMS)`}
                    columns={columns}
                    data={manifestData}
                    loading={loading}
                    isDarkMode={isDarkMode}
                    onAdd={handleSaveSPNaik}
                    onDelete={handleDeleteRow}
                />
            </div>
        </div>
    );
};

export default SuratPengantarPengiriman;