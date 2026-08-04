import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Swal from 'sweetalert2';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';

const SuratPengantarTurun = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [agens, setAgens] = useState([]); // Master dropdown agen asal

    // 🔍 STATE ADVANCED FILTER PARAMETER (Range Tahun 2017 Agar Data Lama Terserap)
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

    // =========================================================================
    // 🔄 FETCH MASTER DATA AGEN UNTUK DROPDOWN & HISTORY SP TURUN
    // =========================================================================
    useEffect(() => {
        fetchMasterAgen();
        fetchHistorySPTurun(); // Load histori otomatis saat halaman pertama kali dibuka
    }, []);

    const fetchMasterAgen = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/agens', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(res.data)) {
                setAgens(res.data);
            } else if (res.data?.data) {
                setAgens(res.data.data);
            }
        } catch (err) {
            console.error("Gagal memuat master agen:", err);
        }
    };

    // =========================================================================
    // 🔍 FETCH DATA HISTORY SP TURUN DENGAN FILTER
    // =========================================================================
    const fetchHistorySPTurun = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            // Tanggal dikirim default agar query $1 dan $2 di backend Golang tidak null
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
                const mappedData = resData.map((item, idx) => ({
                    ...item,
                    generated_id: idx + 1
                }));
                setData(mappedData);
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

    const handleScannerKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            fetchHistorySPTurun();
        }
    };

    // =========================================================================
    // 📌 DEFINISI KOLOM STRUKTUR DATA
    // =========================================================================
    const columns = [
        { header: 'No Urut', accessor: 'generated_id' },
        {
            header: 'NO. SP',
            accessor: 'sp_eid',
            render: (item) => <span className="font-black text-indigo-600 tracking-wider">📜 {item.sp_eid || '-'}</span>
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

    const handleEdit = (item) => console.log("Detail/Edit:", item);
    const handleDelete = (item) => console.log("Hapus Dokumen:", item);

    return (
        <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>

            {/* 🔍 PANEL FILTER SURAT PENGANTAR TURUN */}
            <div className={`p-6 rounded-2xl border shadow-xs text-xs font-semibold ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-slate-800'}`}>
                <div className="text-center mb-6">
                    <span className="bg-indigo-600 text-white px-6 py-2 font-black text-sm rounded-xl shadow-xs tracking-widest uppercase">
                        SURAT PENGANTAR TURUN ( SP TURUN )
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Baris 1: Filter Tanggal */}
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

                    {/* Baris 2: Filter Transit */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-500 font-bold">
                            <input type="checkbox" checked={filterParams.use_transit} onChange={e => setFilterParams({ ...filterParams, use_transit: e.target.checked })} className="rounded text-indigo-600" />
                            Transit
                        </label>
                        <div className="flex gap-4 p-2.5 items-center font-bold">
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

                    {/* Baris 4: Filter No. BTT */}
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
                            onKeyDown={handleScannerKeyPress}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-transparent outline-none disabled:opacity-40 uppercase font-bold tracking-wider" />
                    </div>

                    {/* Baris 5: Filter No. SP */}
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
                            onKeyDown={handleScannerKeyPress}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-transparent outline-none disabled:opacity-40 uppercase font-bold tracking-wider" />
                    </div>
                </div>

                <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
                    <button type="button" onClick={fetchHistorySPTurun} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer">
                        🚀 JALANKAN FILTER SP TURUN
                    </button>
                </div>
            </div>

            {/* 📊 TABEL HISTORY SP TURUN */}
            <DataTableTemplate
                title={`DAFTAR HISTORY SURAT PENGANTAR TURUN (${data.length} ITEMS)`}
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