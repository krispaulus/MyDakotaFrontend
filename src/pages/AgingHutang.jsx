import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, RotateCcw, Search, Building2, Users } from 'lucide-react';

const AgingHutang = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(true);

    const [agens, setAgens] = useState([]);
    const [vendors, setVendors] = useState([]);

    const todayStr = new Date().toISOString().split('T')[0];
    const firstDayMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [filterState, setFilterState] = useState({
        bypassTanggal: false,
        startDate: firstDayMonth,
        endDate: todayStr,
        cabangID: 'ALL',
        vendID: 'ALL'
    });

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const [resAgen, resVend] = await Promise.all([
                api.get(`/agens?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } })
                    .catch(() => ({ data: { data: [] } })),
                api.get(`/master/vendor?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } })
                    .catch(() => api.get(`/master/vendor/list?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } }))
                    .catch(() => ({ data: { data: [] } }))
            ]);

            setAgens(resAgen.data?.data || []);
            setVendors(resVend.data?.data || []);
        } catch (err) {
            console.error("Gagal load opsi filter:", err);
        }
    };

    const fetchAgingData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const params = {
                pt_id: ptId,
                bypass_tanggal: filterState.bypassTanggal ? '1' : '0',
                start_date: filterState.startDate,
                end_date: filterState.endDate,
                cabang_id: filterState.cabangID,
                vend_id: filterState.vendID
            };

            const res = await api.get('/hutang/aging-vendor/list', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data aging hutang:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchAgingData();
    }, []);

    const handleResetFilter = () => {
        setFilterState({
            bypassTanggal: false,
            startDate: firstDayMonth,
            endDate: todayStr,
            cabangID: 'ALL',
            vendID: 'ALL'
        });
    };

    // Kalkulasi Total Ringkasan
    const totals = useMemo(() => {
        return (data || []).reduce((acc, row) => {
            acc.dpp += Number(row.dpp || 0);
            acc.nilai += Number(row.nilai_total || 0);
            acc.aging0 += Number(row.aging_0 || 0);
            acc.aging30 += Number(row.aging_30 || 0);
            acc.aging60 += Number(row.aging_60 || 0);
            acc.aging90 += Number(row.aging_90 || 0);
            acc.aging180 += Number(row.aging_180 || 0);
            acc.aging360 += Number(row.aging_360 || 0);
            acc.terbayar += Number(row.total_terbayar || 0);
            acc.sisa += Number(row.sisa_hutang || 0);
            return acc;
        }, {
            dpp: 0, nilai: 0, aging0: 0, aging30: 0, aging60: 0,
            aging90: 0, aging180: 0, aging360: 0, terbayar: 0, sisa: 0
        });
    }, [data]);

    const columns = [
        {
            header: 'CABANG',
            accessor: 'agen_nama',
            render: (item) => (
                <span className="font-bold text-xs">
                    {item.agen_nama || '-'}
                </span>
            )
        },
        {
            header: 'VENDOR',
            accessor: 'vend_name',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-bold text-xs">{item.vend_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">{item.vend_id}</span>
                </div>
            )
        },
        {
            header: 'TGL. INV',
            accessor: 'tgl_invoice',
            render: (item) => (
                <span className="font-mono text-xs">{item.tgl_invoice || '-'}</span>
            )
        },
        {
            header: 'NO. INVOICE',
            accessor: 'invoice_id',
            render: (item) => (
                <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-xs">
                    {item.invoice_id}
                </span>
            )
        },
        {
            header: 'TGL. JT',
            accessor: 'tgl_jt',
            render: (item) => (
                <span className="font-mono text-xs text-rose-500 font-bold">{item.tgl_jt || '-'}</span>
            )
        },
        {
            header: 'TOTAL TAGIHAN',
            accessor: 'nilai_total',
            render: (item) => (
                <span className="font-mono font-bold text-xs">
                    Rp {Number(item.nilai_total || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'CURRENT (0)',
            accessor: 'aging_0',
            render: (item) => (
                <span className={`font-mono text-xs font-bold ${item.aging_0 > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {item.aging_0 > 0 ? `Rp ${Number(item.aging_0).toLocaleString('id-ID')}` : '0'}
                </span>
            )
        },
        {
            header: '1-30 HARI',
            accessor: 'aging_30',
            render: (item) => (
                <span className={`font-mono text-xs font-bold ${item.aging_30 > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                    {item.aging_30 > 0 ? `Rp ${Number(item.aging_30).toLocaleString('id-ID')}` : '0'}
                </span>
            )
        },
        {
            header: '31-60 HARI',
            accessor: 'aging_60',
            render: (item) => (
                <span className={`font-mono text-xs font-bold ${item.aging_60 > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`}>
                    {item.aging_60 > 0 ? `Rp ${Number(item.aging_60).toLocaleString('id-ID')}` : '0'}
                </span>
            )
        },
        {
            header: '>60 HARI',
            accessor: 'aging_90',
            render: (item) => {
                const over60 = Number(item.aging_90 || 0) + Number(item.aging_180 || 0) + Number(item.aging_360 || 0) + Number(item.aging_over_360 || 0);
                return (
                    <span className={`font-mono text-xs font-bold ${over60 > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                        {over60 > 0 ? `Rp ${over60.toLocaleString('id-ID')}` : '0'}
                    </span>
                );
            }
        },

        {
            header: 'UMUR',
            accessor: 'umur_aktual',
            render: (item) => (
                <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 px-2.5 py-1 rounded-md font-bold shadow-xs whitespace-nowrap">
                    {item.umur_aktual} Hari
                </span>
            )
        },
        {
            header: 'SISA HUTANG',
            accessor: 'sisa_hutang',
            render: (item) => (
                <span className="font-mono font-black text-xs text-rose-600 dark:text-rose-400">
                    Rp {Number(item.sisa_hutang || 0).toLocaleString('id-ID')}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-4">
            {/* PANEL FILTER ATAS */}
            {showFilter && (
                <div className={`p-5 rounded-2xl border shadow-sm transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}>
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-gray-700 mb-4">
                        <Filter size={18} className="text-blue-600" />
                        <h3 className="text-xs font-black uppercase tracking-wider">
                            Filter Parameter Laporan Aging Hutang
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
                        {/* 1. Filter Periode Tanggal */}
                        <div className="space-y-1.5 md:col-span-2">
                            <div className="flex justify-between items-center">
                                <span>PERIODE TRANSAKSI INVOICE</span>
                                <label className="flex items-center gap-1.5 text-[11px] font-normal cursor-pointer select-none text-blue-600">
                                    <input
                                        type="checkbox"
                                        checked={filterState.bypassTanggal}
                                        onChange={(e) => setFilterState(p => ({ ...p, bypassTanggal: e.target.checked }))}
                                        className="w-3.5 h-3.5 rounded cursor-pointer"
                                    />
                                    <span>Bypass Filter Tanggal</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    disabled={filterState.bypassTanggal}
                                    value={filterState.startDate}
                                    onChange={(e) => setFilterState(p => ({ ...p, startDate: e.target.value }))}
                                    className={`w-full p-2 border rounded-xl font-mono text-xs outline-none transition ${filterState.bypassTanggal
                                        ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : isDarkMode
                                            ? 'bg-gray-900 border-gray-600 text-white'
                                            : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                                        }`}
                                />
                                <input
                                    type="date"
                                    disabled={filterState.bypassTanggal}
                                    value={filterState.endDate}
                                    onChange={(e) => setFilterState(p => ({ ...p, endDate: e.target.value }))}
                                    className={`w-full p-2 border rounded-xl font-mono text-xs outline-none transition ${filterState.bypassTanggal
                                            ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                                            : isDarkMode
                                                ? 'bg-gray-900 border-gray-600 text-white'
                                                : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                                        }`}
                                />
                            </div>
                        </div>

                        {/* 2. Filter Cabang */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5">
                                <Building2 size={14} className="text-slate-400" />
                                <span>AGEN / CABANG</span>
                            </label>
                            <select
                                value={filterState.cabangID}
                                onChange={(e) => setFilterState(p => ({ ...p, cabangID: e.target.value }))}
                                className={`w-full p-2 border rounded-xl outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                            >
                                <option value="ALL">-- SEMUA CABANG --</option>
                                {agens.map(a => (
                                    <option key={a.agen_id} value={a.agen_id}>{a.agen_nama}</option>
                                ))}
                            </select>
                        </div>

                        {/* 3. Filter Vendor */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5">
                                <Users size={14} className="text-slate-400" />
                                <span>VENDOR REKANAN</span>
                            </label>
                            <select
                                value={filterState.vendID}
                                onChange={(e) => setFilterState(p => ({ ...p, vendID: e.target.value }))}
                                className={`w-full p-2 border rounded-xl outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                            >
                                <option value="ALL">-- SEMUA VENDOR --</option>
                                {vendors.map(v => (
                                    <option key={v.vend_id} value={v.vend_id}>{v.vend_name} [{v.vend_id}]</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tombol Terapkan & Reset */}
                    <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                            <RotateCcw size={14} /> Reset Filter
                        </button>
                        <button
                            type="button"
                            onClick={fetchAgingData}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                            <Search size={14} /> Proses Laporan
                        </button>
                    </div>
                </div>
            )}

            {/* KARTU SUMMARY TOTAL OUTSTANDING */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Tagihan</span>
                    <p className="text-sm font-black text-slate-800 dark:text-white font-mono mt-1">
                        Rp {totals.nilai.toLocaleString('id-ID')}
                    </p>
                </div>
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase">Current (0 Hari)</span>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                        Rp {totals.aging0.toLocaleString('id-ID')}
                    </p>
                </div>
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold text-amber-500 uppercase">1 - 30 Hari</span>
                    <p className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
                        Rp {totals.aging30.toLocaleString('id-ID')}
                    </p>
                </div>
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold text-orange-500 uppercase">31 - 60 Hari</span>
                    <p className="text-sm font-black text-orange-600 dark:text-orange-400 font-mono mt-1">
                        Rp {totals.aging60.toLocaleString('id-ID')}
                    </p>
                </div>
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold text-rose-500 uppercase">Sisa Hutang Outstanding</span>
                    <p className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
                        Rp {totals.sisa.toLocaleString('id-ID')}
                    </p>
                </div>
            </div>

            {/* TABEL DATA AGING */}
            <DataTableTemplate
                title="LAPORAN UMUR HUTANG USAHA (AGING VENDOR)"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                hideAddButton={true}
                hideActionColumn={true}
                onFilter={() => setShowFilter((prev) => !prev)}
            />
        </div>
    );
};

export default AgingHutang;