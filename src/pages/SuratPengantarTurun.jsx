import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';

const SuratPengantarTurun = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [agens, setAgens] = useState([]); // Master dropdown agen asal

    // 🔍 1. STATE ADVANCED FILTER PARAMETER (Sesuai Gambar Acuan)
    const [filterParams, setFilterParams] = useState({
        use_tanggal: true,
        tanggal_awal: new Date().toISOString().split('T')[0],
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

    // =========================================================================
    // 🔄 FETCH MASTER DATA AGEN UNTUK DROPDOWN
    // =========================================================================
    useEffect(() => {
        const fetchMasterAgen = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:8080/api/agens', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (Array.isArray(res.data)) {
                    setAgens(res.data);
                }
            } catch (err) {
                console.error("Gagal memuat master agen:", err);
            }
        };
        fetchMasterAgen();
        fetchHistorySPTurun(); // Tarif/history awal saat dimuat
    }, []);

    // =========================================================================
    // 🔎 FETCH DATA HISTORY SP TURUN DENGAN FILTER
    // =========================================================================
    const fetchHistorySPTurun = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            // Siapkan dynamic query params untuk dikirim ke backend
            const queryParams = {};
            if (filterParams.use_tanggal) {
                queryParams.tgl_awal = filterParams.tanggal_awal;
                queryParams.tgl_akhir = filterParams.tanggal_akhir;
            }
            if (filterParams.use_transit) queryParams.transit = filterParams.transit_yn;
            if (filterParams.use_agen_asal) queryParams.asal_id = filterParams.agen_asal_id;
            if (filterParams.use_no_btt) queryParams.no_btt = filterParams.no_btt;
            if (filterParams.use_no_sp) queryParams.no_sp = filterParams.no_sp;

            const res = await axios.get(`http://localhost:8080/api/operasional/sp-turun/history`, {
                params: queryParams,
                headers: { Authorization: `Bearer ${token}` }
            });

            // Pastikan data di-mapping dengan generated_id urut untuk DataTableTemplate
            const mappedData = (res.data || []).map((item, idx) => ({
                ...item,
                generated_id: idx + 1
            }));
            setData(mappedData);
        } catch (err) {
            console.error("Gagal menarik history SP Turun:", err);
            Swal.fire('ERROR', 'Gagal memuat histori data dari server database', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleScannerKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            fetchHistorySPTurun();
        }
    };

    // =========================================================================
    // 📊 DEFINISI KOLOM STRUKTUR DATA (Sesuai Grid Biru Gambar Acuan)
    // =========================================================================
    const columns = [
        { header: 'No Urut', accessor: 'generated_id' },
        {
            header: 'NO. SP',
            accessor: 'sp_eid',
            render: (item) => <span className="font-black text-indigo-600 tracking-wider">{item.sp_eid}</span>
        },
        { header: 'TANGGAL', accessor: 'sp_tanggal' },
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
            render: (item) => <span className="font-bold text-slate-700 dark:text-gray-200">{item.jumlah_btt} Koli</span>
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

    // Handler Aksi Template
    const handleAdd = () => {
        // Arahkan ke form input scan SP Turun baru yang kita buat sebelumnya
        window.location.href = '/operasional/surat-pengantar-turun';
    };

    const handleEdit = (item) => console.log("Detail/Edit:", item);
    const handleDelete = (item) => console.log("Hapus Dokumen:", item);

    return (
        <div className="space-y-6">

            {/* 🛠️ FILTER PANEL DAKOTA: Replika Sempurna Gambar Acuan */}
            <div className={`p-6 rounded border shadow-sm text-xs font-semibold ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-slate-800'}`}>
                <div className="text-center mb-6">
                    <span className="bg-blue-600 text-white px-6 py-1.5 font-black text-sm rounded shadow-sm tracking-widest uppercase">
                        SURAT PENGANTAR TURUN ( SP TURUN )
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Baris 1: Filter Tanggal */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-400">
                            <input type="checkbox" checked={filterParams.use_tanggal} onChange={e => setFilterParams({ ...filterParams, use_tanggal: e.target.checked })} className="rounded text-indigo-600 focus:ring-0" />
                            Tanggal
                        </label>
                        <div className="flex gap-2 items-center">
                            <input type="date" value={filterParams.tanggal_awal} disabled={!filterParams.use_tanggal} onChange={e => setFilterParams({ ...filterParams, tanggal_awal: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40" />
                            <span className="text-gray-400 font-bold">SAMPAI</span>
                            <input type="date" value={filterParams.tanggal_akhir} disabled={!filterParams.use_tanggal} onChange={e => setFilterParams({ ...filterParams, tanggal_akhir: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40" />
                        </div>
                    </div>

                    {/* Baris 2: Filter Transit */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-400">
                            <input type="checkbox" checked={filterParams.use_transit} onChange={e => setFilterParams({ ...filterParams, use_transit: e.target.checked })} className="rounded text-indigo-600 focus:ring-0" />
                            Transit
                        </label>
                        <div className="flex gap-4 p-2.5 items-center">
                            <label className="flex items-center gap-1.5 cursor-pointer disabled:opacity-40">
                                <input type="radio" name="transit_yn" value="Y" checked={filterParams.transit_yn === 'Y'} disabled={!filterParams.use_transit} onChange={e => setFilterParams({ ...filterParams, transit_yn: e.target.value })} /> Ya
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer disabled:opacity-40">
                                <input type="radio" name="transit_yn" value="N" checked={filterParams.transit_yn === 'N'} disabled={!filterParams.use_transit} onChange={e => setFilterParams({ ...filterParams, transit_yn: e.target.value })} /> Tidak
                            </label>
                        </div>
                    </div>

                    {/* Baris 3: Filter Cabang/Agen Asal */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-400">
                            <input type="checkbox" checked={filterParams.use_agen_asal} onChange={e => setFilterParams({ ...filterParams, use_agen_asal: e.target.checked })} className="rounded text-indigo-600 focus:ring-0" />
                            Cabang/Agen Asal
                        </label>
                        <select value={filterParams.agen_asal_id} disabled={!filterParams.use_agen_asal} onChange={e => setFilterParams({ ...filterParams, agen_asal_id: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none font-bold uppercase disabled:opacity-40">
                            <option value="">-- PILIH AGEN ASAL --</option>
                            {agens.map((item, idx) => (
                                <option key={idx} value={item.agen_id}>{item.agen_nama}</option>
                            ))}
                        </select>
                    </div>

                    {/* Baris 4: Filter No. BTT */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-400">
                            <input type="checkbox" checked={filterParams.use_no_btt} onChange={e => setFilterParams({ ...filterParams, use_no_btt: e.target.checked })} className="rounded text-indigo-600 focus:ring-0" />
                            No. BTT
                        </label>
                        <input
                            type="text"
                            placeholder="Masukkan Nomor BTT..."
                            value={filterParams.no_btt}
                            disabled={!filterParams.use_no_btt}
                            onChange={e => setFilterParams({ ...filterParams, no_btt: e.target.value })}
                            onKeyDown={handleScannerKeyPress}
                            className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40 uppercase font-bold tracking-wider" />
                    </div>

                    {/* Baris 5: Filter No. SP */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-400">
                            <input type="checkbox" checked={filterParams.use_no_sp} onChange={e => setFilterParams({ ...filterParams, use_no_sp: e.target.checked })} className="rounded text-indigo-600 focus:ring-0" />
                            No. SP
                        </label>
                        <input
                            type="text"
                            placeholder="Masukkan Nomor SP..."
                            value={filterParams.no_sp}
                            disabled={!filterParams.use_no_sp}
                            onChange={e => setFilterParams({ ...filterParams, no_sp: e.target.value })}
                            onKeyDown={handleScannerKeyPress}
                            className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40 uppercase font-bold tracking-wider" />
                    </div>
                </div>

            </div>

            {/* 📊 TABEL HISTORY: DIKEMAS MENGGUNAKAN DATATABLETEMPLATE */}
            <DataTableTemplate
                title="DAFTAR HISTORY SURAT PENGANTAR TURUN (SP TURUN)"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />
        </div>
    );
};

export default SuratPengantarTurun;