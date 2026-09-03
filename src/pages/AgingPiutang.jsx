import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, Printer, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

const AgingPiutang = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [cabangList, setCabangList] = useState([]);
    const [custList, setCustList] = useState([]);
    const [agingData, setAgingData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);

    // =========================================================================
    // HELPER: DETEKSI CABANG & STATUS HOLDING / PUSAT SECARA DINAMIS
    // =========================================================================
    function getActiveAgen() {
        const activeAgenId = localStorage.getItem('active_agen_id') || localStorage.getItem('agen_id') || '';
        const activeCabangId = localStorage.getItem('active_cabang_id') || localStorage.getItem('cabang_id') || '';
        const sessionCabangNama = localStorage.getItem('active_cabang_nama')
            || localStorage.getItem('cabang_nama')
            || localStorage.getItem('active_agen_nama')
            || '';

        if (sessionCabangNama) {
            return {
                id: activeCabangId || activeAgenId || '',
                nama: sessionCabangNama.toUpperCase()
            };
        }

        const found = cabangList.find(c => {
            const cId = String(c.agen_id || c.AgenID || '').trim().toLowerCase();
            const cKode = String(c.agen_kode || c.AgenKode || '').trim().toLowerCase();
            const cNama = String(c.agen_nama || c.AgenNama || '').trim().toLowerCase();
            const targetAgen = activeAgenId.trim().toLowerCase();
            const targetCabang = activeCabangId.trim().toLowerCase();

            return (
                (targetAgen && (cId === targetAgen || cKode === targetAgen || cNama.includes(targetAgen))) ||
                (targetCabang && (cId === targetCabang || cKode === targetCabang || cNama.includes(targetCabang)))
            );
        });

        if (found) {
            return {
                id: String(found.agen_id || found.AgenID),
                nama: String(found.agen_nama || found.AgenNama).toUpperCase()
            };
        }

        if (activeAgenId && activeAgenId.toUpperCase().includes('PUSAT')) {
            return { id: '001', nama: 'PUSAT DAKOTA' };
        }

        return {
            id: activeCabangId || activeAgenId || '',
            nama: activeAgenId ? `AGEN ${activeAgenId.toUpperCase()}` : ''
        };
    }

    const currentActiveAgen = getActiveAgen();
    const isHoldingUser =
        String(currentActiveAgen.nama || '').toUpperCase().includes('PUSAT') ||
        String(currentActiveAgen.nama || '').toUpperCase().includes('HOLDING') ||
        String(currentActiveAgen.id || '') === '001' ||
        String(localStorage.getItem('active_agen_id') || '').toUpperCase().includes('PUSAT') ||
        (!currentActiveAgen.id && !currentActiveAgen.nama);

    // Filter States
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [bypassTanggal, setBypassTanggal] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState(isHoldingUser ? '' : currentActiveAgen.id);
    const [selectedCust, setSelectedCust] = useState('');

    const [summary, setSummary] = useState({
        total_current: 0,
        total_31_60: 0,
        total_61_90: 0,
        total_over_90: 0,
        grand_total: 0
    });

    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setSelectedCabang(currentActiveAgen.id);
        }
    }, [isHoldingUser, currentActiveAgen.id, cabangList]);

    const fetchOptions = async () => {
        const token = localStorage.getItem('token');
        try {
            const [resCabang, resCust] = await Promise.all([
                api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/gl/customers?limit=1000', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setCabangList(resCabang.data?.data || []);
            setCustList(resCust.data?.data || []);
        } catch (err) {
            console.error('Gagal load opsi filter:', err);
        }
    };

    const fetchAgingData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            let url = `/piutang/aging?pt_id=${ptId}&bypass_tanggal=${bypassTanggal}`;

            if (!bypassTanggal) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : selectedCabang;
            if (activeFilterCabang) url += `&cabang_id=${encodeURIComponent(activeFilterCabang)}`;
            if (selectedCust) url += `&cust_id=${encodeURIComponent(selectedCust)}`;

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setAgingData(res.data?.data || []);
            setSummary(res.data?.summary || {});
        } catch (err) {
            console.error('Gagal mengambil data aging piutang:', err);
            Swal.fire({ title: 'Error', text: 'Gagal mengambil data aging piutang.', icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchAgingData();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchAgingData();
    };

    const handleResetFilter = () => {
        setStartDate(firstDay);
        setEndDate(today);
        setBypassTanggal(false);
        setSelectedCabang(isHoldingUser ? '' : currentActiveAgen.id);
        setSelectedCust('');
        fetchAgingData();
    };

    const columns = [
        {
            header: 'CUSTOMER',
            accessor: 'cust_name',
            render: (item) => <span className="font-bold text-slate-800">{item.cust_name}</span>
        },
        {
            header: 'CABANG',
            accessor: 'cabang_nama',
            render: (item) => <span className="font-semibold uppercase text-slate-600">{item.cabang_nama}</span>
        },
        {
            header: 'NO. INVOICE',
            accessor: 'no_invoice',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.no_invoice}</span>
        },
        {
            header: 'TGL. INVOICE',
            accessor: 'tgl_invoice',
            render: (item) => <span className="font-mono text-slate-600">{item.tgl_invoice}</span>
        },
        {
            header: 'TOTAL TAGIHAN (RP)',
            accessor: 'total_tagihan',
            render: (item) => <span className="font-mono font-bold text-slate-800">Rp {Number(item.total_tagihan || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: '0 – 30 HARI',
            accessor: 'bucket_current',
            render: (item) => <span className="font-mono text-emerald-600 font-semibold">{item.bucket_current ? `Rp ${Number(item.bucket_current).toLocaleString('id-ID')}` : '-'}</span>
        },
        {
            header: '31 – 60 HARI',
            accessor: 'bucket_31_60',
            render: (item) => <span className="font-mono text-sky-600 font-semibold">{item.bucket_31_60 ? `Rp ${Number(item.bucket_31_60).toLocaleString('id-ID')}` : '-'}</span>
        },
        {
            header: '61 – 90 HARI',
            accessor: 'bucket_61_90',
            render: (item) => <span className="font-mono text-amber-600 font-semibold">{item.bucket_61_90 ? `Rp ${Number(item.bucket_61_90).toLocaleString('id-ID')}` : '-'}</span>
        },
        {
            header: '> 90 HARI',
            accessor: 'bucket_over_90',
            render: (item) => <span className="font-mono font-bold text-rose-600">{item.bucket_over_90 ? `Rp ${Number(item.bucket_over_90).toLocaleString('id-ID')}` : '-'}</span>
        },
        {
            header: 'SISA PIUTANG (RP)',
            accessor: 'sisa_piutang',
            render: (item) => <span className="font-mono font-black text-slate-900">Rp {Number(item.sisa_piutang || 0).toLocaleString('id-ID')}</span>
        }
    ];

    return (
        <div className="space-y-5">
            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
                `}
            </style>

            {/* Panel Filter (Kondisional Buka/Tutup) */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all no-print">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER LAPORAN AGING PIUTANG
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Tanggal */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AWAL</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'
                                        }`}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AKHIR</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'
                                        }`}
                                />
                            </div>
                        </div>

                        {/* Cabang Filter */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG</label>
                            <select
                                value={!isHoldingUser && currentActiveAgen.id ? currentActiveAgen.id : selectedCabang}
                                disabled={!isHoldingUser}
                                onChange={(e) => setSelectedCabang(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser
                                        ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                                        : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'
                                    }`}
                                title={!isHoldingUser ? 'Filter cabang terkunci sesuai lokasi login Anda' : 'Pilih cabang untuk monitoring'}
                            >
                                {isHoldingUser && (
                                    <option value="">-- SEMUA CABANG --</option>
                                )}

                                {!isHoldingUser ? (
                                    <option value={currentActiveAgen.id}>
                                        {currentActiveAgen.nama || 'CABANG AKTIF'}
                                    </option>
                                ) : (
                                    cabangList.map((c, i) => (
                                        <option key={i} value={c.agen_id || c.AgenID}>
                                            {c.agen_nama || c.AgenNama}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* Customer Filter */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CUSTOMER</label>
                            <select
                                value={selectedCust}
                                onChange={(e) => setSelectedCust(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                            >
                                <option value="">-- SEMUA CUSTOMER --</option>
                                {custList.map((cust, i) => (
                                    <option key={i} value={cust.cust_id}>
                                        {cust.cust_name} [{cust.cust_id}]
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Bypass Checkbox */}
                        <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 mt-5">
                                <input
                                    type="checkbox"
                                    checked={bypassTanggal}
                                    onChange={(e) => setBypassTanggal(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded"
                                />
                                Bypass Filter Tanggal
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer"
                        >
                            <Printer size={14} /> Cetak Laporan
                        </button>
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer"
                        >
                            RESET
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw size={14} /> REFRESH DATA
                        </button>
                    </div>
                </form>
            )}

            {/* Aging Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs font-sans no-print">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-xs">
                    <span className="text-emerald-700 font-bold block mb-1">0 – 30 HARI (CURRENT)</span>
                    <span className="text-base font-black font-mono text-emerald-800">Rp {Number(summary.total_current || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl shadow-xs">
                    <span className="text-sky-700 font-bold block mb-1">31 – 60 HARI</span>
                    <span className="text-base font-black font-mono text-sky-800">Rp {Number(summary.total_31_60 || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-xs">
                    <span className="text-amber-700 font-bold block mb-1">61 – 90 HARI</span>
                    <span className="text-base font-black font-mono text-amber-800">Rp {Number(summary.total_61_90 || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl shadow-xs">
                    <span className="text-rose-700 font-bold block mb-1">&gt; 90 HARI (OVERDUE)</span>
                    <span className="text-base font-black font-mono text-rose-800">Rp {Number(summary.total_over_90 || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-sky-700 border border-sky-800 text-white p-4 rounded-xl shadow-md">
                    <span className="text-sky-100 font-bold block mb-1">TOTAL OUTSTANDING</span>
                    <span className="text-base font-black font-mono text-white">Rp {Number(summary.grand_total || 0).toLocaleString('id-ID')}</span>
                </div>
            </div>

            {/* Tabel Detail Aging dengan DataTableTemplate */}
            <div className="print-area">
                <DataTableTemplate
                    title="RINCIAN AGING PIUTANG PER CUSTOMER"
                    columns={columns}
                    data={agingData}
                    loading={loading}
                    isDarkMode={isDarkMode}
                    isAddDisabled={true}
                    hideAddButton={true}
                    hideActions={true}
                    hideActionColumn={true}
                    onFilter={() => setShowFilter(prev => !prev)}
                />
            </div>
        </div>
    );
};

export default AgingPiutang;