import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Search, Fuel, RefreshCw, LogOut, Plus } from 'lucide-react';
import Swal from 'sweetalert2';

const VoucherBBM = () => {
    const { isDarkMode } = useDarkMode();

    // 📊 State Data
    const [loading, setLoading] = useState(false);
    const [voucherList, setVoucherList] = useState([]);
    const [globalSearch, setGlobalSearch] = useState('');

    // 🔍 State Filter Tanggal
    const todayStr = new Date().toISOString().split('T')[0];
    const [filterParams, setFilterParams] = useState({
        useTanggal: true,
        tanggalStart: todayStr,
        tanggalEnd: todayStr
    });

    useEffect(() => {
        fetchVoucherBBM();
    }, []);

    // 🔄 Fetch Data Voucher BBM
    const fetchVoucherBBM = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {};

            if (filterParams.useTanggal) {
                params.tanggalStart = filterParams.tanggalStart;
                params.tanggalEnd = filterParams.tanggalEnd;
            }

            const res = await api.get('/operasional/voucher-bbm', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            let rawData = [];
            if (Array.isArray(res.data)) {
                rawData = res.data;
            } else if (res.data && Array.isArray(res.data.data)) {
                rawData = res.data.data;
            }

            setVoucherList(rawData);

            if (e) {
                Swal.fire('BERHASIL', `Ditemukan ${rawData.length} voucher BBM`, 'success');
            }
        } catch (err) {
            console.error("Gagal narik Voucher BBM:", err);
            setVoucherList([]);
        } finally {
            setLoading(false);
        }
    };

    // 🧮 Hitung Rekapitulasi Total Liter & Total Rp
    const totalLiter = voucherList.reduce((acc, i) => acc + (Number(i.liter) || 0), 0);
    const totalHarga = voucherList.reduce((acc, i) => acc + (Number(i.harga) || 0), 0);

    // 📌 Definisi Kolom Tabel (Sesuai Tampilan ASP Lawas)
    const columns = [
        {
            header: 'NO. VOUCHER',
            accessor: 'no_voucher',
            render: (i) => <span className="font-mono font-black text-indigo-700 tracking-wider">🎟️ {i.no_voucher || '-'}</span>
        },
        {
            header: 'CABANG',
            accessor: 'cabang',
            render: (i) => <span className="font-bold text-slate-700 uppercase">{i.cabang || '-'}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'tanggal',
            render: (i) => <span className="font-bold text-slate-800">{i.tanggal || '-'}</span>
        },
        {
            header: 'NO. KEND',
            accessor: 'no_kend',
            render: (i) => <span className="font-mono font-bold text-slate-900 uppercase">{i.no_kend || '-'}</span>
        },
        {
            header: 'DRIVER',
            accessor: 'driver',
            render: (i) => <span className="font-bold text-slate-800">{i.driver || '-'}</span>
        },
        {
            header: 'KETERANGAN',
            accessor: 'keterangan',
            render: (i) => <span className="text-slate-500 italic text-[11px]">{i.keterangan || '-'}</span>
        },
        {
            header: 'NO. ST',
            accessor: 'no_st',
            render: (i) => <span className="font-mono text-slate-600">{i.no_st || '-'}</span>
        },
        {
            header: 'JNS BBM',
            accessor: 'jns_bbm',
            render: (i) => <span className="font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">{i.jns_bbm || '-'}</span>
        },
        {
            header: 'LITER',
            accessor: 'liter',
            render: (i) => <span className="font-black text-blue-700">{(Number(i.liter) || 0).toLocaleString('id-ID')} L</span>
        },
        {
            header: 'HARGA',
            accessor: 'harga',
            render: (i) => <span className="font-bold text-emerald-700">Rp {(Number(i.harga) || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'AKTIF',
            accessor: 'aktif',
            render: (i) => (
                <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase border ${i.aktif === 'Ya' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                    {i.aktif || 'Tidak'}
                </span>
            )
        }
    ];

    // Filter Search Global
    const filteredData = voucherList.filter(i => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            String(i.no_voucher || '').toLowerCase().includes(q) ||
            String(i.no_kend || '').toLowerCase().includes(q) ||
            String(i.driver || '').toLowerCase().includes(q) ||
            String(i.cabang || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>

            {/* Header Page */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                    <h1 className="text-base font-black uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                        <Fuel size={20} /> VOUCHER BBM
                    </h1>
                    <p className="text-[11px] text-gray-400 font-medium">
                        Modul pengelolaan dan rekapitulasi pengeluaran voucher bahan bakar kendaraan operasional.
                    </p>
                </div>
            </div>

            {/* 🔍 PANEL FILTER REPLIKA ASP LAWAS */}
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 text-indigo-600 font-black tracking-wider border-b border-slate-100 pb-2 text-xs">
                    <Search size={16} />
                    <span>PANEL FILTER VOUCHER BBM</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    {/* Filter Tanggal Start */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 uppercase">
                            <input
                                type="checkbox"
                                checked={filterParams.useTanggal}
                                onChange={e => setFilterParams({ ...filterParams, useTanggal: e.target.checked })}
                                className="rounded text-indigo-600 cursor-pointer"
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

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={fetchVoucherBBM}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition"
                        >
                            <RefreshCw size={14} /> REFRESH
                        </button>
                        <button
                            type="button"
                            onClick={() => Swal.fire('INFO', 'Form Tambah Voucher BBM dapat diintegrasikan disini', 'info')}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition"
                        >
                            <Plus size={14} /> TAMBAH
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition"
                    >
                        <LogOut size={14} /> KELUAR
                    </button>
                </div>
            </div>

            {/* 📊 SUMMARY TOTALS REKAPITULASI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center">
                    <div className="text-xs font-bold text-slate-400 uppercase">TOTAL LITER BBM</div>
                    <div className="text-lg font-black text-indigo-600">{totalLiter.toLocaleString('id-ID')} Liter</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center">
                    <div className="text-xs font-bold text-slate-400 uppercase">TOTAL BIAYA BBM (RP)</div>
                    <div className="text-lg font-black text-emerald-600">Rp {totalHarga.toLocaleString('id-ID')}</div>
                </div>
            </div>

            {/* 📋 DATATABLE VOUCHER BBM */}
            <DataTableTemplate
                title={`DATALIST VOUCHER BBM (${filteredData.length} ITEMS)`}
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

export default VoucherBBM;