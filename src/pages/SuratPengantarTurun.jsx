import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import Swal from 'sweetalert2';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { CheckCircle2, ArrowLeft, QrCode, AlertCircle } from 'lucide-react';

const SuratPengantarTurun = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [agens, setAgens] = useState([]);

    // Mode Halaman: 'list' | 'input' (Image 3 & 4) | 'edit' (Image 5)
    const [viewMode, setViewMode] = useState('list');

    // State Filter List
    const [filterParams, setFilterParams] = useState({
        use_tanggal: true,
        tanggal_awal: '2017-01-01',
        tanggal_akhir: new Date().toISOString().split('T')[0],
        use_transit: false,
        transit_yn: 'Y',
        use_agen_asal: false,
        agen_asal_id: '',
        use_no_btt: false,
        no_btt: '',
        use_no_sp: false,
        no_sp: ''
    });

    // State Form Input Data SP Turun (Image 3 & 4)
    const [tglSpTurun, setTglSpTurun] = useState(new Date().toISOString().split('T')[0]);
    const [inputNoSp, setInputNoSp] = useState('');
    const [inputNoSpPad, setInputNoSpPad] = useState('');
    const [submittingSp, setSubmittingSp] = useState(false);
    const noSpInputRef = useRef(null);

    // State Edit / Validasi Detail SP Turun (Image 5 & ASP Lawas)
    const [editHeader, setEditHeader] = useState(null);
    const [editItems, setEditItems] = useState([]);
    const [alertJmlMsg, setAlertJmlMsg] = useState('');
    const [savingRowBtt, setSavingRowBtt] = useState('');

    useEffect(() => {
        fetchMasterAgen();
        fetchHistorySPTurun();
    }, []);

    const fetchMasterAgen = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/agens', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAgens(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error("Gagal memuat master agen:", err);
        }
    };

    const fetchHistorySPTurun = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const queryParams = {
                tgl_awal: filterParams.use_tanggal ? filterParams.tanggal_awal : '2017-01-01',
                tgl_akhir: filterParams.use_tanggal ? filterParams.tanggal_akhir : new Date().toISOString().split('T')[0]
            };

            if (filterParams.use_transit) queryParams.transit = filterParams.transit_yn;
            if (filterParams.use_agen_asal && filterParams.agen_asal_id) queryParams.asal_id = filterParams.agen_asal_id;
            if (filterParams.use_no_btt && filterParams.no_btt) queryParams.no_btt = filterParams.no_btt;
            if (filterParams.use_no_sp && filterParams.no_sp) queryParams.no_sp = filterParams.no_sp;

            const res = await api.get(`/operasional/sp-turun/history`, {
                params: queryParams,
                headers: { Authorization: `Bearer ${token}` }
            });

            const resData = res.data?.data || res.data || [];
            if (Array.isArray(resData)) {
                setData(resData.map((item, idx) => ({ ...item, generated_id: idx + 1 })));
            } else {
                setData([]);
            }
        } catch (err) {
            console.error("Gagal menarik history SP Turun:", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // ➕ BUKA FORM INPUT DATA SP TURUN (IMAGE 3)
    // =========================================================================
    const handleOpenInputSPTurun = () => {
        setTglSpTurun(new Date().toISOString().split('T')[0]);
        setInputNoSp('');
        setInputNoSpPad('');
        setViewMode('input');
        setTimeout(() => {
            if (noSpInputRef.current) noSpInputRef.current.focus();
        }, 150);
    };

    // =========================================================================
    // 🚀 PROSES SCAN / ENTER NOMOR SP ATAU SP PAD (IMAGE 4 -> IMAGE 5)
    // =========================================================================
    const handleProcessScanSP = async (rawNomorSP) => {
        const cleanSpID = (rawNomorSP || '').trim().toUpperCase();
        if (!cleanSpID || submittingSp) return;

        setSubmittingSp(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Cek detail SP Naik dari cluster database asal (DLI / DLB / DBS)
            const detailRes = await api.get(`/operasional/sp-turun/detail-sp-naik`, {
                params: { sp_id: cleanSpID },
                headers
            });

            const headerSP = detailRes.data?.header;
            const detailsBTT = detailRes.data?.details || [];

            if (!headerSP || detailsBTT.length === 0) {
                Swal.fire('Perhatian', `Tidak ada resi BTT aktif yang dapat diproses pada SP ${cleanSpID}.`, 'warning');
                setSubmittingSp(false);
                return;
            }

            // 2. Simpan inisialisasi SP Turun ke database lokal cabang penerima
            const activeAgenId = parseInt(localStorage.getItem('active_agen_id') || '1', 10) || 1;
            const daftarBttIds = detailsBTT.map(d => d.btt_id);

            await api.post(`/operasional/sp-turun/save-initial`, {
                sp_eid: cleanSpID,
                sp_agenid: activeAgenId,
                spt_transityn: headerSP.spt_transityn || 'N',
                daftar_btt: daftarBttIds
            }, { headers });

            // 3. Langsung buka halaman Edit / Validasi Detail SP Turun (Image 5)
            await loadEditSPTurunDetail(cleanSpID);
        } catch (err) {
            Swal.fire(
                'SP Tidak Ditemukan',
                err.response?.data?.message || `Nomor SP / SP PAD [${cleanSpID}] tidak ditemukan atau belum diproses.`,
                'error'
            );
        } finally {
            setSubmittingSp(false);
        }
    };

    // =========================================================================
    // 📋 LOAD DETAIL EDIT SP TURUN (IMAGE 5 & ASP LAWAS)
    // =========================================================================
    const loadEditSPTurunDetail = async (spEid) => {
        setLoading(true);
        setAlertJmlMsg('');
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/operasional/sp-turun/detail`, {
                params: { sp_eid: spEid },
                headers: { Authorization: `Bearer ${token}` }
            });

            setEditHeader(res.data?.header || { no_sp: spEid });
            setEditItems(res.data?.items || []);
            setViewMode('edit');
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal memuat detail SP Turun', 'error');
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // ⚡ REALTIME AUTOSAVE JUMLAH DITERIMA & KETERANGAN PER BARIS (ASP ubahJml & ubahKet)
    // =========================================================================
    const handleRowChange = async (idx, field, value) => {
        const updated = [...editItems];
        const row = { ...updated[idx] };

        if (field === 'jml_diterima') {
            const numVal = value === '' ? 0 : parseInt(value, 10) || 0;
            if (numVal > row.jml_berangkat) {
                setAlertJmlMsg(`Jumlah Terima (${numVal}) pada BTT ${row.no_btt} tidak bisa melebihi Jumlah Berangkat (${row.jml_berangkat})!`);
                return;
            }
            setAlertJmlMsg('');
            row.jml_diterima = numVal;
        } else if (field === 'keterangan') {
            row.keterangan = value;
        }

        updated[idx] = row;
        setEditItems(updated);

        // Kirim autosave ke backend
        setSavingRowBtt(row.no_btt);
        try {
            const token = localStorage.getItem('token');
            await api.put(`/operasional/sp-turun/autosave-row`, {
                sp_eid: editHeader.no_sp,
                sp_bttid: row.no_btt,
                sp_jmlterima: row.jml_diterima,
                sp_keterangan: row.keterangan
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Gagal autosave baris SP Turun:", err);
        } finally {
            setSavingRowBtt('');
        }
    };

    // =========================================================================
    // 🗑️ HAPUS / NON-AKTIFKAN SP TURUN
    // =========================================================================
    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus SP Turun?',
            text: `Non-aktifkan data SP Turun ${item.sp_eid}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/operasional/sp-turun/delete`, {
                        params: { sp_eid: item.sp_eid },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Terhapus', `SP Turun ${item.sp_eid} berhasil dihapus.`, 'success');
                    fetchHistorySPTurun();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus SP Turun', 'error');
                }
            }
        });
    };

    const columns = [
        { header: 'No Urut', accessor: 'generated_id' },
        {
            header: 'NO. SP',
            accessor: 'sp_eid',
            render: (item) => (
                <button
                    type="button"
                    onClick={() => loadEditSPTurunDetail(item.sp_eid)}
                    className="font-black text-indigo-600 hover:underline tracking-wider cursor-pointer"
                >
                    📜 {item.sp_eid || '-'}
                </button>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'sp_tanggal',
            render: (item) => <span className="font-bold text-slate-700">{item.sp_tanggal || '-'}</span>
        },
        { header: 'CABANG ASAL', accessor: 'cabang_asal_nama' },
        {
            header: 'TRANSIT',
            accessor: 'spt_transityn',
            render: (item) => (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.spt_transityn === 'Y' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                    {item.spt_transityn === 'Y' ? 'YA' : 'TIDAK'}
                </span>
            )
        },
        { header: 'CABANG TUJUAN', accessor: 'cabang_tujuan_nama' },
        {
            header: 'JUMLAH BTT',
            accessor: 'jumlah_btt',
            render: (item) => <span className="font-black text-indigo-700">{item.jumlah_btt || 0} Resi</span>
        },
        {
            header: 'AKTIF',
            accessor: 'sp_aktifyn',
            render: (item) => (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.sp_aktifyn === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {item.sp_aktifyn === 'Y' ? 'AKTIF' : 'NON-AKTIF'}
                </span>
            )
        },
    ];

    // =========================================================================
    // VIEW 2: INPUT DATA SP TURUN (IMAGE 3 & IMAGE 4)
    // =========================================================================
    if (viewMode === 'input') {
        return (
            <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
                <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                    <div className="text-center border-b border-slate-100 pb-4">
                        <h1 className="text-lg font-black text-emerald-700 uppercase tracking-wide">
                            Input Data SP Turun
                        </h1>
                        <p className="text-xs font-bold text-emerald-600 mt-1">
                            HANYA BDB DI DALAM SP YANG AKAN DIPROSES
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        <div>
                            <label className="block font-black text-slate-700 uppercase mb-1.5">
                                TANGGAL SP TURUN :
                            </label>
                            <input
                                type="date"
                                value={tglSpTurun}
                                onChange={(e) => setTglSpTurun(e.target.value)}
                                className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 bg-slate-50"
                            />
                        </div>

                        <div>
                            <label className="block font-black text-slate-700 uppercase mb-1.5">
                                MASUKKAN NOMOR SP (DLI) :
                            </label>
                            <div className="flex gap-2">
                                <input
                                    ref={noSpInputRef}
                                    type="text"
                                    placeholder="Contoh: SC0011120260004"
                                    value={inputNoSp}
                                    disabled={submittingSp}
                                    onChange={(e) => setInputNoSp(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleProcessScanSP(inputNoSp);
                                        }
                                    }}
                                    className="w-full p-2.5 bg-sky-50 border-2 border-sky-400 rounded-xl font-mono font-black text-slate-900 uppercase outline-none focus:border-indigo-600"
                                />
                                <button
                                    type="button"
                                    disabled={submittingSp || !inputNoSp.trim()}
                                    onClick={() => handleProcessScanSP(inputNoSp)}
                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl uppercase cursor-pointer disabled:opacity-50"
                                >
                                    OK
                                </button>
                            </div>
                            <span className="text-[10px] italic text-slate-400 mt-1 block">
                                *Ketikkan Nomor SP kemudian Tekan ENTER, atau Gunakan Barcode Scanner
                            </span>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block font-black text-slate-700 uppercase mb-1.5">
                                MASUKKAN NOMOR SP PAD DARI DLB ATAU DBS :
                            </label>
                            <div className="flex gap-2 max-w-md">
                                <input
                                    type="text"
                                    placeholder="Contoh: LC0011120260004"
                                    value={inputNoSpPad}
                                    disabled={submittingSp}
                                    onChange={(e) => setInputNoSpPad(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleProcessScanSP(inputNoSpPad);
                                        }
                                    }}
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-black text-slate-900 uppercase outline-none focus:border-indigo-600"
                                />
                                <button
                                    type="button"
                                    disabled={submittingSp || !inputNoSpPad.trim()}
                                    onClick={() => handleProcessScanSP(inputNoSpPad)}
                                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl uppercase cursor-pointer disabled:opacity-50"
                                >
                                    OK
                                </button>
                            </div>
                            <span className="text-[10px] italic text-slate-400 mt-1 block">
                                *Ketikkan Nomor SP-PAD dari DLB/DBS kemudian Tekan ENTER, atau Gunakan Barcode Scanner
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase cursor-pointer"
                        >
                            BATAL
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // VIEW 3: EDIT & VALIDASI JUMLAH KOLI SP TURUN (IMAGE 5 & ASP LAWAS)
    // =========================================================================
    if (viewMode === 'edit' && editHeader) {
        return (
            <div className={`p-6 space-y-5 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
                <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <button
                            type="button"
                            onClick={() => {
                                setViewMode('list');
                                fetchHistorySPTurun();
                            }}
                            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
                        >
                            <ArrowLeft size={16} /> Kembali ke Daftar
                        </button>
                        <h1 className="text-base font-black text-emerald-700 uppercase">
                            Edit / Validasi Data SP Turun
                        </h1>
                        <div className="w-24"></div>
                    </div>

                    {/* DETAIL SURAT PENGIRIMAN TURUN */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="text-[11px] font-black text-sky-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                            DETAIL SURAT PENGIRIMAN TURUN
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-bold">
                            <div>
                                <span className="text-[10px] text-slate-400 block">NOMOR SP :</span>
                                <span className="font-mono text-indigo-700 text-sm">{editHeader.no_sp}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 block">CABANG PENGIRIM :</span>
                                <span className="text-slate-800 uppercase">{editHeader.cabang_pengirim}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 block">TANGGAL PEMBERANGKATAN :</span>
                                <span className="text-slate-800">{editHeader.tgl_berangkat}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 block">TUJUAN PENGIRIMAN :</span>
                                <span className="text-slate-800 uppercase">{editHeader.tujuan_pengiriman}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 block">STATUS TRANSIT :</span>
                                <span className="text-slate-800">{editHeader.status_transit === 'Y' ? 'Transit' : 'Langsung'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 block">SUPIR / PENGEMUDI :</span>
                                <span className="text-slate-800 uppercase">{editHeader.sopir}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 block">NOMOR KENDARAAN :</span>
                                <span className="font-mono text-slate-800">{editHeader.no_kendaraan}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 block">SURAT TUGAS :</span>
                                <span className="font-mono text-slate-800">{editHeader.surat_tugas}</span>
                            </div>
                        </div>
                    </div>

                    {alertJmlMsg && (
                        <div className="p-3 bg-rose-50 border border-rose-300 text-rose-700 rounded-xl font-bold flex items-center gap-2">
                            <AlertCircle size={16} /> {alertJmlMsg}
                        </div>
                    )}

                    {/* TABEL RESI DI DALAM SP */}
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-[#004b84] text-white uppercase font-bold text-[11px]">
                                <tr>
                                    <th className="py-2.5 px-3 text-center">NO</th>
                                    <th className="py-2.5 px-3">NOMOR BTT</th>
                                    <th className="py-2.5 px-3">TANGGAL BTT</th>
                                    <th className="py-2.5 px-3">PENGIRIM</th>
                                    <th className="py-2.5 px-3">PENERIMA</th>
                                    <th className="py-2.5 px-3 text-center">JML ASLI</th>
                                    <th className="py-2.5 px-3 text-center">JML BERANGKAT</th>
                                    <th className="py-2.5 px-3 text-center w-32">JML DITERIMA</th>
                                    <th className="py-2.5 px-3 w-56">KETERANGAN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-semibold">
                                {editItems.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="py-2 px-3 text-center">{idx + 1}</td>
                                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">{row.no_btt}</td>
                                        <td className="py-2 px-3">{row.tgl_btt}</td>
                                        <td className="py-2 px-3 uppercase">{row.pengirim}</td>
                                        <td className="py-2 px-3 uppercase">{row.penerima}</td>
                                        <td className="py-2 px-3 text-center font-bold">{row.jml_asli}</td>
                                        <td className="py-2 px-3 text-center font-bold text-sky-700">{row.jml_berangkat}</td>
                                        <td className="py-2 px-3 text-center">
                                            <input
                                                type="number"
                                                min={0}
                                                max={row.jml_berangkat}
                                                value={row.jml_diterima}
                                                onChange={(e) => handleRowChange(idx, 'jml_diterima', e.target.value)}
                                                className="w-24 p-1.5 border border-slate-300 rounded-lg text-center font-black text-slate-900 focus:border-emerald-600 outline-none"
                                            />
                                        </td>
                                        <td className="py-2 px-3">
                                            <input
                                                type="text"
                                                value={row.keterangan}
                                                placeholder="Catatan kondisi barang..."
                                                onChange={(e) => handleRowChange(idx, 'keterangan', e.target.value)}
                                                className="w-full p-1.5 border border-slate-300 rounded-lg font-medium text-slate-800 focus:border-emerald-600 outline-none"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                            <span className="font-black text-slate-700 uppercase">JUMLAH BTT/RESI DIDALAM SP =</span>
                            <span className="px-4 py-1.5 bg-slate-100 border border-slate-300 rounded-lg font-black text-sm">
                                {editItems.length}
                            </span>
                            {savingRowBtt && (
                                <span className="text-[11px] text-emerald-600 font-bold animate-pulse">
                                    Menyimpan perubahan {savingRowBtt}...
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'SP Turun Selesai!',
                                    text: `Data penerimaan barang untuk SP ${editHeader.no_sp} telah tersimpan.`,
                                    timer: 1600,
                                    showConfirmButton: false
                                }).then(() => {
                                    setViewMode('list');
                                    fetchHistorySPTurun();
                                });
                            }}
                            className="px-8 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
                        >
                            <CheckCircle2 size={16} /> SELESAI
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // VIEW 1: DAFTAR HISTORY SP TURUN (IMAGE 1 & IMAGE 2)
    // =========================================================================
    return (
        <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
            {/* PANEL FILTER */}
            <div className={`p-6 rounded-2xl border shadow-xs text-xs font-semibold ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-slate-800'}`}>
                <div className="text-center mb-6">
                    <span className="bg-indigo-600 text-white px-6 py-2 font-black text-sm rounded-xl shadow-xs tracking-widest uppercase">
                        SURAT PENGANTAR TURUN ( SP TURUN )
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-500 font-bold">
                            <input type="checkbox" checked={filterParams.use_tanggal} onChange={e => setFilterParams({ ...filterParams, use_tanggal: e.target.checked })} className="rounded text-indigo-600" />
                            Tanggal
                        </label>
                        <div className="flex gap-2 items-center">
                            <input type="date" value={filterParams.tanggal_awal} disabled={!filterParams.use_tanggal} onChange={e => setFilterParams({ ...filterParams, tanggal_awal: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg bg-transparent outline-none disabled:opacity-40 font-bold" />
                            <span className="text-gray-400 font-bold text-[10px]">SAMPAI</span>
                            <input type="date" value={filterParams.tanggal_akhir} disabled={!filterParams.use_tanggal} onChange={e => setFilterParams({ ...filterParams, tanggal_akhir: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg bg-transparent outline-none disabled:opacity-40 font-bold" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-500 font-bold">
                            <input type="checkbox" checked={filterParams.use_transit} onChange={e => setFilterParams({ ...filterParams, use_transit: e.target.checked })} className="rounded text-indigo-600" />
                            Transit
                        </label>
                        <div className="flex gap-4 p-2.5 items-center font-bold">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="radio" name="transit_yn" value="Y" checked={filterParams.transit_yn === 'Y'} disabled={!filterParams.use_transit} onChange={e => setFilterParams({ ...filterParams, transit_yn: e.target.value })} /> Ya
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="radio" name="transit_yn" value="N" checked={filterParams.transit_yn === 'N'} disabled={!filterParams.use_transit} onChange={e => setFilterParams({ ...filterParams, transit_yn: e.target.value })} /> Tidak
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-500 font-bold">
                            <input type="checkbox" checked={filterParams.use_agen_asal} onChange={e => setFilterParams({ ...filterParams, use_agen_asal: e.target.checked })} className="rounded text-indigo-600" />
                            Cabang/Agen Asal
                        </label>
                        <select value={filterParams.agen_asal_id} disabled={!filterParams.use_agen_asal} onChange={e => setFilterParams({ ...filterParams, agen_asal_id: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg bg-transparent outline-none font-bold uppercase disabled:opacity-40">
                            <option value="">-- PILIH AGEN ASAL --</option>
                            {agens.map((item, idx) => (
                                <option key={idx} value={item.agen_id || item.Agen_ID}>{item.agen_nama || item.Agen_Nama}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-500 font-bold">
                            <input type="checkbox" checked={filterParams.use_no_btt} onChange={e => setFilterParams({ ...filterParams, use_no_btt: e.target.checked })} className="rounded text-indigo-600" />
                            No. BTT
                        </label>
                        <input
                            type="text"
                            placeholder="Masukkan Nomor BTT..."
                            value={filterParams.no_btt}
                            disabled={!filterParams.use_no_btt}
                            onChange={e => setFilterParams({ ...filterParams, no_btt: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchHistorySPTurun(); } }}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-transparent outline-none disabled:opacity-40 uppercase font-bold tracking-wider"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-500 font-bold">
                            <input type="checkbox" checked={filterParams.use_no_sp} onChange={e => setFilterParams({ ...filterParams, use_no_sp: e.target.checked })} className="rounded text-indigo-600" />
                            No. SP
                        </label>
                        <input
                            type="text"
                            placeholder="Masukkan Nomor SP..."
                            value={filterParams.no_sp}
                            disabled={!filterParams.use_no_sp}
                            onChange={e => setFilterParams({ ...filterParams, no_sp: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchHistorySPTurun(); } }}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-transparent outline-none disabled:opacity-40 uppercase font-bold tracking-wider"
                        />
                    </div>
                </div>

                <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
                    <button type="button" onClick={fetchHistorySPTurun} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer">
                        🚀 JALANKAN FILTER SP TURUN
                    </button>
                </div>
            </div>

            {/* TABEL HISTORY SP TURUN */}
            <DataTableTemplate
                title={`DAFTAR HISTORY SURAT PENGANTAR TURUN (${data.length} ITEMS)`}
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleOpenInputSPTurun}
                onEdit={(item) => loadEditSPTurunDetail(item.sp_eid)}
                onDelete={handleDelete}
            />
        </div>
    );
};

export default SuratPengantarTurun;