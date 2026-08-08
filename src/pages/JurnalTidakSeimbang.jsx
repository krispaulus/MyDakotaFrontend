import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Search, Scale, RefreshCw, FileSpreadsheet, Download } from 'lucide-react';
import Swal from 'sweetalert2';

const JurnalTidakSeimbang = () => {
    const { isDarkMode } = useDarkMode();

    // 📊 State Data
    const [loading, setLoading] = useState(false);
    const [jurnalList, setJurnalList] = useState([]);
    const [globalSearch, setGlobalSearch] = useState('');

    // 🔍 State Filter
    const todayStr = new Date().toISOString().split('T')[0];
    const [filterParams, setFilterParams] = useState({
        useTanggal: true,
        tanggalStart: todayStr,
        tanggalEnd: todayStr,
        useNoJurnal: false,
        noJurnal: ''
    });

    useEffect(() => {
        fetchJurnalTidakSeimbang();
    }, []);

    // 🔄 Fetch Data Jurnal Tidak Seimbang
    const fetchJurnalTidakSeimbang = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {};

            if (filterParams.useTanggal) {
                params.tanggalStart = filterParams.tanggalStart;
                params.tanggalEnd = filterParams.tanggalEnd;
            }
            if (filterParams.useNoJurnal && filterParams.noJurnal) {
                params.noJurnal = filterParams.noJurnal.trim();
            }

            const res = await api.get('/gl/jurnal-tidak-seimbang', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            let rawData = [];
            if (Array.isArray(res.data)) {
                rawData = res.data;
            } else if (res.data && Array.isArray(res.data.data)) {
                rawData = res.data.data;
            }

            setJurnalList(rawData);

            if (e) {
                Swal.fire({
                    title: 'BERHASIL',
                    text: `Ditemukan ${rawData.length} jurnal tidak seimbang`,
                    icon: 'success',
                    confirmButtonColor: '#2563eb'
                });
            }
        } catch (err) {
            console.error("Gagal narik Jurnal Tidak Seimbang:", err);
            setJurnalList([]);
        } finally {
            setLoading(false);
        }
    };

    // 📥 Handler Download CSV
    const handleDownloadCSV = (type) => {
        const jenisLabel = type === 'coa' ? 'Jurnal + COA' : 'Jurnal + Selisih';
        Swal.fire({
            title: 'MEMPROSES DOWNLOAD',
            text: `Sedang mengunduh file CSV ${jenisLabel}...`,
            icon: 'info',
            timer: 2000,
            showConfirmButton: false
        });
        // Logika download CSV dapat disesuaikan dengan endpoint export backend
    };

    // 📌 Definisi Kolom Tabel (Replika gl_t_jurnal_unbalanced.asp)
    const columns = [
        {
            header: 'NO. JURNAL',
            accessor: 'no_jurnal',
            render: (i) => <span className="font-mono font-black text-blue-700 tracking-wider">📑 {i.no_jurnal || '-'}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'tanggal',
            render: (i) => <span className="font-bold text-slate-800">{i.tanggal || '-'}</span>
        },
        {
            header: 'TYPE',
            accessor: 'tipe',
            render: (i) => <span className="font-bold text-slate-700 border border-slate-200 bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase">{i.tipe || '-'}</span>
        },
        {
            header: 'KETERANGAN',
            accessor: 'keterangan',
            render: (i) => <span className="text-slate-600 text-[11px] font-medium">{i.keterangan || '-'}</span>
        },
        {
            header: 'STATUS',
            accessor: 'status',
            render: (i) => (
                i.status === 'BATAL' ? (
                    <span className="px-2 py-0.5 rounded font-black text-[10px] uppercase bg-rose-100 text-rose-800 border border-rose-200">
                        BATAL
                    </span>
                ) : <span className="text-slate-400">-</span>
            )
        },
        {
            header: 'POSTING',
            accessor: 'posting',
            render: (i) => (
                i.posting === 'POSTING' ? (
                    <span className="px-2 py-0.5 rounded font-black text-[10px] uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        POSTING
                    </span>
                ) : <span className="text-slate-400">DRAFT</span>
            )
        },
        {
            header: 'DEBET',
            accessor: 'debet',
            render: (i) => <span className="font-bold text-blue-700">Rp {(Number(i.debet) || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'KREDIT',
            accessor: 'kredit',
            render: (i) => <span className="font-bold text-slate-800">Rp {(Number(i.kredit) || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'SELISIH',
            accessor: 'selisih',
            render: (i) => {
                const diff = Number(i.selisih) || 0;
                return (
                    <span className={`font-black ${diff !== 0 ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200' : 'text-slate-500'}`}>
                        Rp {diff.toLocaleString('id-ID')}
                    </span>
                );
            }
        }
    ];

    // Filter Search Global
    const filteredData = jurnalList.filter(i => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            String(i.no_jurnal || '').toLowerCase().includes(q) ||
            String(i.keterangan || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>

            {/* Header Page - Warna Tema Biru Elegan */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                    <h1 className="text-base font-black uppercase tracking-wider text-blue-600 flex items-center gap-2">
                        <Scale size={20} /> DAFTAR JURNAL TIDAK SEIMBANG
                    </h1>
                    <p className="text-[11px] text-gray-400 font-medium">
                        Modul audit dan kontrol kualitas transaksi akuntansi untuk mendeteksi ketidakseimbangan nominal Debit & Kredit.
                    </p>
                </div>
            </div>

            {/* 🔍 PANEL FILTER REPLIKA ASP LAWAS */}
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 text-blue-600 font-black tracking-wider border-b border-slate-100 pb-2 text-xs">
                    <Search size={16} />
                    <span>PANEL FILTER AUDIT JURNAL</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                    {/* Filter No Jurnal */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 uppercase">
                            <input
                                type="checkbox"
                                checked={filterParams.useNoJurnal}
                                onChange={e => setFilterParams({ ...filterParams, useNoJurnal: e.target.checked })}
                                className="rounded text-blue-600 cursor-pointer"
                            />
                            No. Jurnal
                        </label>
                        <input
                            type="text"
                            placeholder="Masukkan No Jurnal..."
                            value={filterParams.noJurnal}
                            disabled={!filterParams.useNoJurnal}
                            onChange={e => setFilterParams({ ...filterParams, noJurnal: e.target.value.toUpperCase() })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 uppercase disabled:opacity-40 outline-none"
                        />
                    </div>

                    {/* Filter Tanggal Start */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 uppercase">
                            <input
                                type="checkbox"
                                checked={filterParams.useTanggal}
                                onChange={e => setFilterParams({ ...filterParams, useTanggal: e.target.checked })}
                                className="rounded text-blue-600 cursor-pointer"
                            />
                            Tanggal Awal
                        </label>
                        <input
                            type="date"
                            value={filterParams.tanggalStart}
                            disabled={!filterParams.useTanggal}
                            onChange={e => setFilterParams({ ...filterParams, tanggalStart: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 disabled:opacity-40 outline-none"
                        />
                    </div>

                    {/* Filter Tanggal End */}
                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 uppercase block pt-0.5">
                            Sampai Tanggal
                        </label>
                        <input
                            type="date"
                            value={filterParams.tanggalEnd}
                            disabled={!filterParams.useTanggal}
                            onChange={e => setFilterParams({ ...filterParams, tanggalEnd: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 disabled:opacity-40 outline-none"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                        {/* Tombol Refresh (Hijau / Blue) */}
                        <button
                            type="button"
                            onClick={fetchJurnalTidakSeimbang}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition"
                        >
                            <RefreshCw size={14} /> REFRESH
                        </button>

                        {/* Tombol Download CSV Jurnal + COA (Sesuai Gambar 2) */}
                        <button
                            type="button"
                            onClick={() => handleDownloadCSV('coa')}
                            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition"
                        >
                            <FileSpreadsheet size={14} /> DOWNLOAD CSV JURNAL + COA
                        </button>

                        {/* Tombol Download CSV Jurnal + Selisih (Sesuai Gambar 2) */}
                        <button
                            type="button"
                            onClick={() => handleDownloadCSV('selisih')}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition"
                        >
                            <Download size={14} /> DOWNLOAD CSV JURNAL + SELISIH
                        </button>
                    </div>

                    {/* Tombol Keluar (Rose Red) */}
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition"
                    >
                        KELUAR
                    </button>
                </div>
            </div>

            {/* 📋 DATATABLE JURNAL TIDAK SEIMBANG */}
            <DataTableTemplate
                title={`DATALIST JURNAL TIDAK SEIMBANG (${filteredData.length} ITEMS)`}
                columns={columns}
                data={filteredData}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
            />

        </div>
    );
};

export default JurnalTidakSeimbang;