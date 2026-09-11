import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, RefreshCw, Printer, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import dakotaLogo from '../assets/new_logo 2.png';

const LaporanHandlingBarangNaik = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Filter States
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [bypassTanggal, setBypassTanggal] = useState(true);
    const [pilKend, setPilKend] = useState('C');
    const [pilBrg, setPilBrg] = useState('0');
    const [chkKend, setChkKend] = useState(false);
    const [selectedNopol, setSelectedNopol] = useState('');
    const [nopolOptions, setNopolOptions] = useState([]);

    const [activeTab, setActiveTab] = useState('ALL');
    const [showFilter, setShowFilter] = useState(true);
    const [loading, setLoading] = useState(false);
    const [rawData, setRawData] = useState([]);

    const fetchNopolList = async (ptTarget) => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/laporan/handling/kendaraan?pt=${ptTarget}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = res.data?.data || [];
            setNopolOptions(list);
            if (list.length > 0) setSelectedNopol(list[0]);
        } catch (err) {
            console.error("Gagal load armada nopol:", err);
            setNopolOptions([]);
        }
    };

    useEffect(() => {
        fetchNopolList(pilKend);
    }, [pilKend]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                start_date: bypassTanggal ? '1990-01-01' : startDate,
                end_date: bypassTanggal ? '2099-12-31' : endDate,
                pilkend: pilKend,
                pilbrg: pilBrg,
                chkkend: chkKend ? 'true' : 'false',
                nomobil: chkKend ? selectedNopol : ''
            });

            const res = await api.get(`/laporan/handling/data?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setRawData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load laporan handling:", err);
            setRawData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredData = useMemo(() => {
        if (activeTab === 'ALL') return rawData;
        return rawData.filter(d => d.kategori === activeTab);
    }, [rawData, activeTab]);

    const totalKoli = useMemo(() => filteredData.reduce((acc, i) => acc + (i.jml_koli || 0), 0), [filteredData]);
    const totalBerat = useMemo(() => filteredData.reduce((acc, i) => acc + Math.max(i.berat_real || 0, i.berat_vol || 0), 0), [filteredData]);
    const totalNominal = useMemo(() => filteredData.reduce((acc, i) => acc + (i.nominal_btt || 0), 0), [filteredData]);
    const totalHandling = useMemo(() => filteredData.reduce((acc, i) => acc + (i.jasa_handling || 0), 0), [filteredData]);

    const columns = [
        {
            header: 'KATEGORI',
            accessor: 'kategori',
            render: (item) => item.kategori === 'NAIK_SP' ? (
                <span className="inline-flex items-center gap-1 font-black text-sky-900 bg-sky-100 border border-sky-300 px-2.5 py-1 rounded text-xs">
                    <ArrowUpRight size={13} /> NAIK SP
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded text-xs">
                    <ArrowDownLeft size={13} /> LOPER
                </span>
            )
        },
        {
            header: 'NO. CONSNOTE / BTT',
            accessor: 'no_btt',
            render: (item) => (
                <div className="space-y-0.5 text-slate-900">
                    <span className="font-mono font-black text-blue-700 block text-xs tracking-tight">
                        {item.no_btt || '-'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900 block">
                        TGL: {item.tgl_btt || '-'}
                    </span>
                </div>
            )
        },
        {
            header: 'MANIFEST / SP',
            accessor: 'no_manifest',
            render: (item) => (
                <div className="space-y-0.5 text-slate-900">
                    <span className="font-mono font-black text-slate-900 block text-xs">
                        {item.no_manifest || '-'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900 block">
                        {item.tgl_manifest || '-'}
                    </span>
                </div>
            )
        },
        {
            header: 'ARMADA / SUPIR',
            accessor: 'no_polisi',
            render: (item) => (
                <div className="space-y-0.5 text-slate-900">
                    <span className="font-mono font-black text-slate-900 block text-xs">
                        {item.no_polisi || '-'}
                    </span>
                    <span className="text-xs font-black uppercase text-slate-900 block">
                        {item.supir || '-'}
                    </span>
                </div>
            )
        },
        {
            header: 'RELASI KOTA',
            accessor: 'kota_asal',
            render: (item) => (
                <div className="text-xs font-black leading-relaxed text-slate-900">
                    <span className="text-slate-900">{item.kota_asal || '-'}</span>
                    <span className="text-blue-600 font-black mx-1.5">→</span>
                    <span className="text-blue-700 font-black">{item.tujuan_kota || '-'}</span>
                    <span className="block text-xs font-bold text-slate-800">{item.tujuan_propinsi || '-'}</span>
                </div>
            )
        },
        {
            header: 'KOLI / BERAT',
            accessor: 'berat_real',
            render: (item) => (
                <div className="font-mono text-right space-y-0.5 text-slate-900">
                    <span className="block font-black text-slate-900 text-xs">{item.jml_koli || 0} Koli</span>
                    <span className="text-xs font-black text-slate-900 block">{Math.max(item.berat_real || 0, item.berat_vol || 0).toFixed(1)} Kg</span>
                </div>
            )
        },
        {
            header: 'NOMINAL DI BTT (RP)',
            accessor: 'nominal_btt',
            render: (item) => (
                <span className="font-mono font-black text-slate-900 block text-right text-xs">
                    Rp {Math.round(item.nominal_btt || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'TARIF HANDLING',
            accessor: 'tarif_desc',
            render: (item) => (
                <span className="font-mono font-bold text-xs bg-slate-200 border border-slate-300 px-2.5 py-1 rounded text-slate-900 inline-block">
                    {item.tarif_desc || '-'}
                </span>
            )
        },
        {
            header: 'JASA HANDLING (RP)',
            accessor: 'jasa_handling',
            render: (item) => (
                <span className="font-mono font-black text-rose-700 block text-right text-xs">
                    Rp {Math.round(item.jasa_handling || 0).toLocaleString('id-ID')}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-5">
            {/* CSS PENGUNCI WARNA TEKS TABEL KE HITAM PEKAT */}
            <style>
                {`
                .custom-handling-table table th {
                    color: #0f172a !important;
                    font-weight: 900 !important;
                }
                .custom-handling-table table tbody td,
                .custom-handling-table table tbody td *,
                .custom-handling-table table tbody td span,
                .custom-handling-table table tbody td div {
                    color: #0f172a !important;
                    font-weight: 800 !important;
                }
                .custom-handling-table table tbody td span.text-blue-700 {
                    color: #1d4ed8 !important;
                }
                .custom-handling-table table tbody td span.text-rose-700 {
                    color: #be123c !important;
                }
                .custom-handling-table table tbody tr:hover td {
                    background-color: #f1f5f9 !important;
                }
                @media print {
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible; }
                    .print-container { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
                `}
            </style>

            {/* PANEL FILTER */}
            {showFilter && (
                <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-4 text-xs transition-all no-print">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-900 tracking-wider text-sm">
                        <Filter size={18} className="text-blue-600" />
                        FILTER LAPORAN HANDLING BARANG NAIK & TURUN TERLOPER
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="font-bold text-slate-900 block mb-1">TGL AWAL</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`w-full p-2.5 border rounded-lg font-bold text-xs outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-300' : 'bg-white text-slate-900 border-slate-400 focus:border-blue-600'}`}
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <label className="font-bold text-slate-900 block mb-1">TGL AKHIR</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full p-2.5 border rounded-lg font-bold text-xs outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-300' : 'bg-white text-slate-900 border-slate-400 focus:border-blue-600'}`}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-bold text-slate-900 block mb-1">ENTITAS KENDARAAN</label>
                            <div className="flex items-center gap-4 p-2 bg-slate-50 border border-slate-300 rounded-lg h-[40px] font-black text-slate-900">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="radio" name="pilkend" value="A" checked={pilKend === 'A'} onChange={() => setPilKend('A')} className="text-blue-600 w-4 h-4" />
                                    <span>DBS</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="radio" name="pilkend" value="B" checked={pilKend === 'B'} onChange={() => setPilKend('B')} className="text-blue-600 w-4 h-4" />
                                    <span>DLB</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="radio" name="pilkend" value="C" checked={pilKend === 'C'} onChange={() => setPilKend('C')} className="text-blue-600 w-4 h-4" />
                                    <span>DLI</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="font-bold text-slate-900 block mb-1">SEGMENTASI BARANG</label>
                            <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-300 rounded-lg h-[40px] font-black text-slate-900">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="pilbrg" value="0" checked={pilBrg === '0'} onChange={() => setPilBrg('0')} className="text-blue-600 w-4 h-4" />
                                    <span>SEMUA</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="pilbrg" value="1" checked={pilBrg === '1'} onChange={() => setPilBrg('1')} className="text-blue-600 w-4 h-4" />
                                    <span>DBS</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="pilbrg" value="2" checked={pilBrg === '2'} onChange={() => setPilBrg('2')} className="text-blue-600 w-4 h-4" />
                                    <span>DLB</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name="pilbrg" value="3" checked={pilBrg === '3'} onChange={() => setPilBrg('3')} className="text-blue-600 w-4 h-4" />
                                    <span>DLI</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-1">
                                <input
                                    type="checkbox"
                                    checked={chkKend}
                                    onChange={(e) => setChkKend(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                />
                                <span>KHUSUS NO. POLISI :</span>
                            </label>
                            <select
                                disabled={!chkKend}
                                value={selectedNopol}
                                onChange={(e) => setSelectedNopol(e.target.value)}
                                className={`w-full p-2.5 border rounded-lg font-black font-mono text-xs outline-none ${!chkKend
                                        ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                                        : 'bg-white border-slate-400 text-slate-900 focus:border-blue-600 cursor-pointer'
                                    }`}
                            >
                                {nopolOptions.map((nopol, idx) => (
                                    <option key={idx} value={nopol}>{nopol}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center md:col-span-4 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer font-black text-slate-900">
                                <input
                                    type="checkbox"
                                    checked={bypassTanggal}
                                    onChange={(e) => setBypassTanggal(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                />
                                <span>Tampilkan Semua Data Tanpa Batas Tanggal (Bypass Filter Tanggal)</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                        <div className="flex items-center gap-2 font-black">
                            <button
                                type="button"
                                onClick={() => setActiveTab('ALL')}
                                className={`px-4 py-2 rounded-xl text-xs transition cursor-pointer ${activeTab === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300'}`}
                            >
                                Semua Data ({rawData.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('NAIK_SP')}
                                className={`px-4 py-2 rounded-xl text-xs transition cursor-pointer ${activeTab === 'NAIK_SP' ? 'bg-blue-700 text-white shadow-sm' : 'bg-blue-50 text-blue-950 hover:bg-blue-100 border border-blue-200'}`}
                            >
                                Barang Naik SP ({rawData.filter(d => d.kategori === 'NAIK_SP').length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('TURUN_LOPER')}
                                className={`px-4 py-2 rounded-xl text-xs transition cursor-pointer ${activeTab === 'TURUN_LOPER' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100 border border-emerald-200'}`}
                            >
                                Turun Loper ({rawData.filter(d => d.kategori === 'TURUN_LOPER').length})
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-5 py-2.5 border border-slate-400 text-slate-900 hover:bg-slate-100 font-black rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer text-xs"
                            >
                                <Printer size={15} /> Cetak Laporan
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs"
                            >
                                <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> REFRESH DATA
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* RINGKASAN REKAPITULASI HANDLING (KPI CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL COLLY</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{totalKoli.toLocaleString('id-ID')} Koli</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL BERAT OPERASIONAL</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{totalBerat.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL NOMINAL DI BTT</span>
                    <span className="text-2xl font-black font-mono text-blue-700">Rp {Math.round(totalNominal).toLocaleString('id-ID')}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL JASA HANDLING</span>
                    <span className="text-2xl font-black font-mono text-rose-700">Rp {Math.round(totalHandling).toLocaleString('id-ID')}</span>
                </div>
            </div>

            {/* TABEL DATA UTAMA */}
            <div className="no-print custom-handling-table">
                <DataTableTemplate
                    title="LAPORAN HANDLING BARANG NAIK"
                    columns={columns}
                    data={filteredData}
                    loading={loading}
                    isDarkMode={false}
                    isAddDisabled={true}
                    hideAddButton={true}
                    onFilter={() => setShowFilter(prev => !prev)}
                />
            </div>

            {/* DOKUMEN CETAK KHUSUS */}
            <div className="hidden print:block print-container p-4 bg-white text-black font-sans text-xs">
                <div className="flex justify-between items-start border-b pb-3 mb-3">
                    <div className="flex items-center gap-3">
                        <img src={dakotaLogo} alt="Dakota Logo" className="h-12 w-auto object-contain" />
                        <div>
                            <h2 className="text-sm font-black uppercase text-black">PT. DAKOTA LOGISTIK INDONESIA</h2>
                            <p className="text-xs text-black">Jl. Wibawa Mukti II No.99, Jatiasih, Bekasi</p>
                        </div>
                    </div>
                    <div className="text-right font-mono">
                        <h3 className="text-sm font-black uppercase text-black">LAPORAN HANDLING BARANG NAIK</h3>
                        <p className="text-xs font-bold text-black">PERIODE: {startDate} s/d {endDate}</p>
                    </div>
                </div>

                <table className="w-full text-left border-collapse border border-black text-xs">
                    <thead>
                        <tr className="bg-slate-200 border-b border-black font-black uppercase">
                            <th className="p-1.5 border-r border-black">KAT</th>
                            <th className="p-1.5 border-r border-black">NO. BTT</th>
                            <th className="p-1.5 border-r border-black">MANIFEST/SP</th>
                            <th className="p-1.5 border-r border-black">NO. POLISI</th>
                            <th className="p-1.5 border-r border-black">KOTA ASAL</th>
                            <th className="p-1.5 border-r border-black">KOTA TUJUAN</th>
                            <th className="p-1.5 text-center border-r border-black">KOLI</th>
                            <th className="p-1.5 text-right border-r border-black">BERAT (KG)</th>
                            <th className="p-1.5 text-right border-r border-black">NOMINAL BTT</th>
                            <th className="p-1.5 border-r border-black">TARIF</th>
                            <th className="p-1.5 text-right">HANDLING</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black font-semibold">
                        {filteredData.map((row, idx) => (
                            <tr key={idx}>
                                <td className="p-1.5 border-r border-black font-black">{row.kategori === 'NAIK_SP' ? 'NAIK' : 'LOPER'}</td>
                                <td className="p-1.5 border-r border-black font-mono font-bold text-black">{row.no_btt}</td>
                                <td className="p-1.5 border-r border-black font-mono">{row.no_manifest || '-'}</td>
                                <td className="p-1.5 border-r border-black font-mono">{row.no_polisi || '-'}</td>
                                <td className="p-1.5 border-r border-black">{row.kota_asal}</td>
                                <td className="p-1.5 border-r border-black">{row.tujuan_kota}</td>
                                <td className="p-1.5 border-r border-black text-center font-mono">{row.jml_koli}</td>
                                <td className="p-1.5 border-r border-black text-right font-mono">{Math.max(row.berat_real, row.berat_vol).toFixed(1)}</td>
                                <td className="p-1.5 border-r border-black text-right font-mono">Rp {Math.round(row.nominal_btt).toLocaleString('id-ID')}</td>
                                <td className="p-1.5 border-r border-black font-mono text-[10px]">{row.tarif_desc}</td>
                                <td className="p-1.5 text-right font-mono font-black">Rp {Math.round(row.jasa_handling).toLocaleString('id-ID')}</td>
                            </tr>
                        ))}
                        <tr className="bg-slate-200 font-black border-t-2 border-black">
                            <td colSpan={6} className="p-2 text-right uppercase border-r border-black">GRAND TOTAL :</td>
                            <td className="p-2 text-center font-mono border-r border-black">{totalKoli.toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right font-mono border-r border-black">{totalBerat.toFixed(1)}</td>
                            <td className="p-2 text-right font-mono border-r border-black">Rp {Math.round(totalNominal).toLocaleString('id-ID')}</td>
                            <td className="p-2 border-r border-black"></td>
                            <td className="p-2 text-right font-mono text-rose-700">Rp {Math.round(totalHandling).toLocaleString('id-ID')}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LaporanHandlingBarangNaik;