import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Search, Scale, RefreshCw, FileSpreadsheet, Download, RotateCcw } from 'lucide-react';
import Swal from 'sweetalert2';

const JurnalTidakSeimbang = () => {
    const { isDarkMode } = useDarkMode();

    // 📊 State Data
    const [loading, setLoading] = useState(false);
    const [jurnalList, setJurnalList] = useState([]);
    const [cabangList, setCabangList] = useState([]);
    const [globalSearch, setGlobalSearch] = useState('');

    // 🏢 Helper Identifikasi Cabang / Holding Aktif
    function getActiveAgen() {
        const activeAgenId = localStorage.getItem('active_agen_id') || localStorage.getItem('agen_id') || '';
        const activeCabangId = localStorage.getItem('active_cabang_id') || localStorage.getItem('cabang_id') || '';
        const sessionCabangNama = localStorage.getItem('active_cabang_nama')
            || localStorage.getItem('cabang_nama')
            || localStorage.getItem('active_agen_nama')
            || '';

        if (sessionCabangNama) {
            return {
                id: activeCabangId || activeAgenId || '001',
                nama: sessionCabangNama.toUpperCase()
            };
        }

        const found = cabangList.find(c => {
            const cId = String(c.agen_id || c.AgenID || '').trim().toLowerCase();
            const cKode = String(c.agen_kode || c.AgenKode || '').trim().toLowerCase();
            const cNama = String(c.agen_nama || c.AgenNama || '').trim().toLowerCase();
            return (
                (activeAgenId && (cId === activeAgenId.toLowerCase() || cKode === activeAgenId.toLowerCase() || cNama.includes(activeAgenId.toLowerCase()))) ||
                (activeCabangId && (cId === activeCabangId.toLowerCase() || cKode === activeCabangId.toLowerCase() || cNama.includes(activeCabangId.toLowerCase())))
            );
        });

        if (found) {
            return {
                id: String(found.agen_id || found.AgenID),
                nama: String(found.agen_nama || found.AgenNama).toUpperCase()
            };
        }

        return { id: '001', nama: 'DLI PUSAT' };
    }

    const currentActiveAgen = getActiveAgen();
    const isHoldingUser =
        String(currentActiveAgen.nama || '').toUpperCase().includes('PUSAT') ||
        String(currentActiveAgen.nama || '').toUpperCase().includes('HOLDING') ||
        String(currentActiveAgen.id || '') === '001' ||
        (!currentActiveAgen.id && !currentActiveAgen.nama);

    // 🔍 State Filter Modern (Tanpa Checkbox)
    const [showFilter, setShowFilter] = useState(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const [filterParams, setFilterParams] = useState({
        cabangId: isHoldingUser ? '' : currentActiveAgen.id,
        tanggalStart: todayStr,
        tanggalEnd: todayStr,
        noJurnal: ''
    });

    // 🏢 Fetch Daftar Cabang
    const fetchCabangOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const resCabang = await api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } });
            setCabangList(resCabang.data?.data || []);
        } catch (err) {
            console.error("Gagal memuat opsi cabang:", err);
        }
    };

    useEffect(() => {
        fetchCabangOptions();
    }, []);

    // Sinkronisasi filter cabang awal
    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setFilterParams(prev => ({ ...prev, cabangId: currentActiveAgen.id }));
        }
    }, [isHoldingUser, currentActiveAgen.id, cabangList]);

    useEffect(() => {
        fetchJurnalTidakSeimbang();
    }, []);

    // 🔄 Fetch Data Jurnal Tidak Seimbang
    const fetchJurnalTidakSeimbang = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const params = { pt_id: ptId };

            const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : filterParams.cabangId;
            if (activeFilterCabang) {
                params.cabang_id = activeFilterCabang;
                params.agen_id = activeFilterCabang;
            }
            if (filterParams.tanggalStart) {
                params.tanggalStart = filterParams.tanggalStart;
            }
            if (filterParams.tanggalEnd) {
                params.tanggalEnd = filterParams.tanggalEnd;
            }
            if (filterParams.noJurnal.trim()) {
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
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            console.error("Gagal mengambil data jurnal tidak seimbang:", err);
            setJurnalList([]);
        } finally {
            setLoading(false);
        }
    };

    const handleResetFilter = () => {
        const defaultFilter = {
            cabangId: isHoldingUser ? '' : currentActiveAgen.id,
            tanggalStart: todayStr,
            tanggalEnd: todayStr,
            noJurnal: ''
        };
        setFilterParams(defaultFilter);

        const token = localStorage.getItem('token');
        const ptId = localStorage.getItem('pt_id') || 'C';
        setLoading(true);
        api.get('/gl/jurnal-tidak-seimbang', {
            params: {
                pt_id: ptId,
                cabang_id: defaultFilter.cabangId || undefined,
                agen_id: defaultFilter.cabangId || undefined,
                tanggalStart: defaultFilter.tanggalStart,
                tanggalEnd: defaultFilter.tanggalEnd
            },
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setJurnalList(list);
        }).finally(() => setLoading(false));
    };

    // 📥 Handler Download CSV
    const handleDownloadCSV = async (type) => {
        const jenisLabel = type === 'coa' ? 'Jurnal + COA' : 'Jurnal + Selisih';

        try {
            Swal.fire({
                title: 'MEMPROSES DOWNLOAD',
                text: `Sedang menyiapkan file CSV ${jenisLabel}...`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const params = { type, pt_id: ptId };

            const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : filterParams.cabangId;
            if (activeFilterCabang) {
                params.cabang_id = activeFilterCabang;
                params.agen_id = activeFilterCabang;
            }
            if (filterParams.tanggalStart) params.tanggalStart = filterParams.tanggalStart;
            if (filterParams.tanggalEnd) params.tanggalEnd = filterParams.tanggalEnd;
            if (filterParams.noJurnal.trim()) params.noJurnal = filterParams.noJurnal.trim();

            const response = await api.get('/gl/jurnal-tidak-seimbang/export-csv', {
                params,
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `JURNAL_UNBALANCED_${type.toUpperCase()}_${filterParams.tanggalStart || 'ALL'}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            Swal.fire({
                title: 'BERHASIL',
                text: `File CSV ${jenisLabel} berhasil diunduh.`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (err) {
            console.error("Gagal export CSV:", err);
            Swal.fire({
                title: 'GAGAL DOWNLOAD',
                text: err.response?.data?.message || 'Terjadi kesalahan saat mengunduh file CSV.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        }
    };

    // 📌 Kolom Tabel
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

            {/* Header Halaman */}
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

            {/* 🔍 PANEL FILTER (MODERN TANPA CHECKBOX & TANPA TOMBOL KELUAR) */}
            {showFilter && (
                <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2 text-blue-600 font-black tracking-wider border-b border-slate-100 pb-2 text-xs">
                        <Search size={16} />
                        <span>PANEL FILTER AUDIT JURNAL</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
                        {/* 1. Filter Cabang / Agen */}
                        <div className="space-y-1.5">
                            <label className="block font-bold text-slate-600 uppercase">
                                Cabang / Agen / Counter
                            </label>
                            <select
                                value={!isHoldingUser && currentActiveAgen.id ? currentActiveAgen.id : filterParams.cabangId}
                                disabled={!isHoldingUser}
                                onChange={(e) => setFilterParams({ ...filterParams, cabangId: e.target.value })}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold outline-none transition cursor-pointer ${!isHoldingUser ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-300 text-slate-900 focus:border-blue-500'
                                    }`}
                            >
                                {isHoldingUser && <option value="">-- SEMUA CABANG (ALL) --</option>}
                                {!isHoldingUser ? (
                                    <option value={currentActiveAgen.id}>{currentActiveAgen.nama}</option>
                                ) : (
                                    cabangList.map((c, i) => (
                                        <option key={i} value={c.agen_id || c.AgenID}>
                                            {c.agen_nama || c.AgenNama}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* 2. Filter No Jurnal */}
                        <div className="space-y-1.5">
                            <label className="block font-bold text-slate-600 uppercase">
                                No. Jurnal
                            </label>
                            <input
                                type="text"
                                placeholder="Cari No Jurnal (Opsional)..."
                                value={filterParams.noJurnal}
                                onChange={e => setFilterParams({ ...filterParams, noJurnal: e.target.value.toUpperCase() })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 uppercase outline-none focus:border-blue-500 transition"
                            />
                        </div>

                        {/* 3. Filter Tanggal Mulai */}
                        <div className="space-y-1.5">
                            <label className="block font-bold text-slate-600 uppercase">
                                Tanggal Awal
                            </label>
                            <input
                                type="date"
                                value={filterParams.tanggalStart}
                                onChange={e => setFilterParams({ ...filterParams, tanggalStart: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-blue-500 transition cursor-pointer"
                            />
                        </div>

                        {/* 4. Filter Tanggal Selesai */}
                        <div className="space-y-1.5">
                            <label className="block font-bold text-slate-600 uppercase">
                                Sampai Tanggal
                            </label>
                            <input
                                type="date"
                                value={filterParams.tanggalEnd}
                                onChange={e => setFilterParams({ ...filterParams, tanggalEnd: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-blue-500 transition cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Tombol Aksi Filter */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={fetchJurnalTidakSeimbang}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> REFRESH
                            </button>

                            <button
                                type="button"
                                onClick={handleResetFilter}
                                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 active:scale-98 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2 transition"
                            >
                                <RotateCcw size={14} /> RESET
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDownloadCSV('coa')}
                                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition"
                            >
                                <FileSpreadsheet size={14} /> DOWNLOAD CSV JURNAL + COA
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDownloadCSV('selisih')}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition"
                            >
                                <Download size={14} /> DOWNLOAD CSV JURNAL + SELISIH
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 📋 DATATABLE */}
            <DataTableTemplate
                title={`DATALIST JURNAL TIDAK SEIMBANG (${filteredData.length} ITEMS)`}
                columns={columns}
                data={filteredData}
                loading={loading}
                isDarkMode={isDarkMode}
                hideAddButton={true}
                onFilter={() => setShowFilter(prev => !prev)}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
            />

        </div>
    );
};

export default JurnalTidakSeimbang;