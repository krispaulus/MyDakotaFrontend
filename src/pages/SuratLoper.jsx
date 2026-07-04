import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';

const SuratLoper = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // 📑 1. STATE ADVANCED FILTER PARAMETER (Sesuai Standar Loper Dakota)
    const [filterParams, setFilterParams] = useState({
        use_tanggal: true,
        tanggal_awal: new Date().toISOString().split('T')[0],
        tanggal_akhir: new Date().toISOString().split('T')[0],
        use_no_loper: false,
        no_loper: '',
        use_no_mobil: false,
        no_mobil: '',
        use_sopir: false,
        sopir: '',
        use_no_btt: false,
        no_btt: ''
    });

    // =========================================================================
    // ⚙️ 2. FETCH DATA HISTORY LOPER DARI BACKEND GOLANG
    // =========================================================================
    const fetchHistoryLoper = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            // Siapkan dynamic query params untuk dikirim ke backend Golang
            const queryParams = {};
            if (filterParams.use_tanggal) {
                queryParams.tgl_awal = filterParams.tanggal_awal;
                queryParams.tgl_akhir = filterParams.tanggal_akhir;
            }
            if (filterParams.use_no_loper) queryParams.no_loper = filterParams.no_loper;
            if (filterParams.use_no_mobil) queryParams.no_mobil = filterParams.no_mobil;
            if (filterParams.use_sopir) queryParams.sopir = filterParams.sopir;
            if (filterParams.use_no_btt) queryParams.no_btt = filterParams.no_btt;

            const res = await axios.get(`http://localhost:8080/api/operasional/loper/history`, {
                params: queryParams,
                headers: { Authorization: `Bearer ${token}` }
            });

            // Mapping dengan generated_id urut untuk template tabel
            const mappedData = (res.data || []).map((item, idx) => ({
                ...item,
                generated_id: idx + 1
            }));
            setData(mappedData);
        } catch (err) {
            console.error("Gagal menarik history Loper:", err);
            Swal.fire('ERROR', 'Gagal memuat histori data loper dari server database', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Pemicu awal data history saat halaman pertama kali dibuka
    useEffect(() => {
        fetchHistoryLoper();
    }, []);

    // =========================================================================
    // 🚀 EVENT SCANNER LISTENER: Otomatis Tembak tanpa Klik Mouse!
    // =========================================================================
    const handleScannerKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            fetchHistoryLoper(); // Laser scanner otomatis memicu submit!
        }
    };

    // =========================================================================
    // 📊 3. DEFINISI KOLOM STRUKTUR DATA (No. Loper | Tanggal | Sopir | COD | dll)
    // =========================================================================
    const columns = [
        { header: 'No Urut', accessor: 'generated_id' },
        {
            header: 'NO. LOPER',
            accessor: 'loper_eid',
            render: (item) => <span className="font-black text-blue-600 tracking-wider">{item.loper_eid}</span>
        },
        { header: 'TANGGAL LOPER', accessor: 'loper_tanggal' },
        { header: 'NO. MOBIL', accessor: 'loper_nomobil' },
        { header: 'SOPIR KURIR', accessor: 'sopir_nama' },
        { header: 'KERANI', accessor: 'kerani_nama' },
        {
            header: 'JUMLAH BTT',
            accessor: 'jumlah_btt',
            render: (item) => <span className="font-bold text-gray-700">{item.jumlah_btt} Dokumen</span>
        },
        {
            header: 'TOTAL CASH COD',
            accessor: 'total_cod',
            render: (item) => (
                <span className={`font-extrabold ${item.total_cod > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {item.total_cod > 0 ? `Rp ${Number(item.total_cod).toLocaleString('id-ID')}` : 'Rp 0'}
                </span>
            )
        },
        {
            header: 'STATUS',
            accessor: 'loper_aktifyn',
            render: (item) => (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.loper_aktifyn === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {item.loper_aktifyn === 'Y' ? 'AKTIF' : 'BATAL'}
                </span>
            )
        },
    ];

    const handleEdit = (item) => console.log("Detail/Edit Loper:", item);
    const handleDelete = (item) => console.log("Batal/Hapus Loper:", item);

    return (
        <div className="space-y-6 text-slate-800">

            {/* 💙 BLUE THEME FILTER PANEL DAKOTA (ANTI HITAM kotor) */}
            <div className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm text-xs font-semibold">

                {/* HEAD BADGE JUDUL BIRU TERANG */}
                <div className="text-center mb-6">
                    <span className="bg-blue-600 text-white px-6 py-2 font-black text-sm rounded shadow-sm tracking-widest uppercase">
                        MANIFES PENGANTARAN LOKAL ( SURAT LOPER )
                    </span>
                </div>

                {/* NOTIFIKASI INFORMASI ADEM (BIRU PASTELL) */}
                <div className="mb-6 flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl shadow-sm">
                    <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium tracking-wide">
                        Gunakan filter atau langsung scan barcode No. Loper / No. BTT untuk melacak data manifest last-mile delivery.
                    </p>
                </div>

                {/* GRID FORM FILTERS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Filter Tanggal */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-400">
                            <input type="checkbox" checked={filterParams.use_tanggal} onChange={e => setFilterParams({ ...filterParams, use_tanggal: e.target.checked })} className="rounded text-blue-600 focus:ring-0" />
                            Tanggal Kirim
                        </label>
                        <div className="flex gap-2 items-center">
                            <input type="date" value={filterParams.tanggal_awal} disabled={!filterParams.use_tanggal} onChange={e => setFilterParams({ ...filterParams, tanggal_awal: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40" />
                            <span className="text-gray-400 font-bold">s/d</span>
                            <input type="date" value={filterParams.tanggal_akhir} disabled={!filterParams.use_tanggal} onChange={e => setFilterParams({ ...filterParams, tanggal_akhir: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40" />
                        </div>
                    </div>

                    {/* Scan No Loper */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-400">
                            <input type="checkbox" checked={filterParams.use_no_loper} onChange={e => setFilterParams({ ...filterParams, use_no_loper: e.target.checked })} className="rounded text-blue-600 focus:ring-0" />
                            Scan No. Loper
                        </label>
                        <input type="text" placeholder="Tembak Barcode Loper..." value={filterParams.no_loper} disabled={!filterParams.use_no_loper} onChange={e => setFilterParams({ ...filterParams, no_loper: e.target.value })} onKeyDown={handleScannerKeyPress} className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40 uppercase font-bold tracking-wider text-blue-600 focus:border-blue-500" />
                    </div>

                    {/* Scan No BTT */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-400">
                            <input type="checkbox" checked={filterParams.use_no_btt} onChange={e => setFilterParams({ ...filterParams, use_no_btt: e.target.checked })} className="rounded text-blue-600 focus:ring-0" />
                            Scan No. BTT (Resi)
                        </label>
                        <input type="text" placeholder="Tembak Barcode Resi..." value={filterParams.no_btt} disabled={!filterParams.use_no_btt} onChange={e => setFilterParams({ ...filterParams, no_btt: e.target.value })} onKeyDown={handleScannerKeyPress} className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40 uppercase font-bold tracking-wider text-blue-600 focus:border-blue-500" />
                    </div>

                    {/* Filter No Mobil */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-400">
                            <input type="checkbox" checked={filterParams.use_no_mobil} onChange={e => setFilterParams({ ...filterParams, use_no_mobil: e.target.checked })} className="rounded text-blue-600 focus:ring-0" />
                            No. Polisi Mobil
                        </label>
                        <input type="text" placeholder="Contoh: B9460KCE..." value={filterParams.no_mobil} disabled={!filterParams.use_no_mobil} onChange={e => setFilterParams({ ...filterParams, no_mobil: e.target.value })} onKeyDown={handleScannerKeyPress} className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40 uppercase font-bold tracking-wider" />
                    </div>

                    {/* Filter Nama Sopir */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-400">
                            <input type="checkbox" checked={filterParams.use_sopir} onChange={e => setFilterParams({ ...filterParams, use_sopir: e.target.checked })} className="rounded text-blue-600 focus:ring-0" />
                            Nama Sopir / Kurir
                        </label>
                        <input type="text" placeholder="Ketik nama kurir..." value={filterParams.sopir} disabled={!filterParams.use_sopir} onChange={e => setFilterParams({ ...filterParams, sopir: e.target.value })} onKeyDown={handleScannerKeyPress} className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40 font-bold" />
                    </div>

                    {/* Tombol Manual Trigger */}
                    <div className="flex items-end justify-end">
                        <button onClick={fetchHistoryLoper} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition duration-150 uppercase tracking-wider w-full md:w-auto">
                            Tarik Data
                        </button>
                    </div>
                </div>
            </div>

            {/* 📊 INTERFACES TABEL UTAMANYA */}
            <DataTableTemplate
                title="DAFTAR DATA MANIFES LAST-MILE DELIVERY (SURAT LOPER)"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={false} // Dikunci terang benderang bray!
                onEdit={handleEdit}
                onDelete={handleDelete}
            />
        </div>
    );
};

export default SuratLoper;