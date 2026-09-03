import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Cpu,
    Calendar,
    Building,
    RotateCcw,
    Play,
    FileText,
    X,
    Printer,
    ArrowUpRight,
    DollarSign,
    Receipt,
    ListFilter,
    Filter
} from 'lucide-react';
import Swal from 'sweetalert2';

const ProsesPiutang = () => {
    const { isDarkMode } = useDarkMode();
    const [agens, setAgens] = useState([]);
    const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'history'
    const [showFilter, setShowFilter] = useState(true);

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

        const found = agens.find(c => {
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

    // Parameter Form State
    const [selectedAgen, setSelectedAgen] = useState(isHoldingUser ? 'ALL' : currentActiveAgen.id);
    const [selectedBulan, setSelectedBulan] = useState(() => {
        const m = new Date().getMonth() + 1;
        return String(m).padStart(2, '0');
    });
    const [selectedTahun, setSelectedTahun] = useState(() => String(new Date().getFullYear()));

    // Sinkronisasi otomatis cabang daerah
    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setSelectedAgen(currentActiveAgen.id);
        }
    }, [isHoldingUser, currentActiveAgen.id, agens]);

    // Preview Data State
    const [previewData, setPreviewData] = useState([]);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // History Data State
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Processing State
    const [isExecuting, setIsExecuting] = useState(false);

    // Drilldown Detail State
    const [selectedDetailCust, setSelectedDetailCust] = useState(null);
    const [custDetailData, setCustDetailData] = useState({ invoices: [], receipts: [] });
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const fetchAgens = async () => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/agens?pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAgens(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load agen:", err);
        }
    };

    const fetchPreviewData = async () => {
        setLoadingPreview(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const targetAgen = !isHoldingUser ? currentActiveAgen.id : selectedAgen;

            const res = await api.get('/piutang/proses-piutang/preview', {
                params: {
                    pt_id: ptId,
                    agen_id: targetAgen,
                    bulan: selectedBulan,
                    tahun: selectedTahun
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setPreviewData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load preview piutang:", err);
        } finally {
            setLoadingPreview(false);
        }
    };

    const fetchHistoryData = async () => {
        setLoadingHistory(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const targetAgen = !isHoldingUser ? currentActiveAgen.id : selectedAgen;

            const res = await api.get('/piutang/proses-piutang/histori', {
                params: {
                    pt_id: ptId,
                    agen_id: targetAgen,
                    tahun: selectedTahun
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistoryData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load histori saldo:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchAgens();
    }, []);

    useEffect(() => {
        if (selectedTahun) {
            fetchPreviewData();
            fetchHistoryData();
        }
    }, [selectedAgen, selectedBulan, selectedTahun, isHoldingUser, currentActiveAgen.id]);

    const handleExecuteProses = async () => {
        const confirm = await Swal.fire({
            title: 'Jalankan Proses Piutang?',
            html: `Apakah Anda yakin ingin mengeksekusi rekalkulasi saldo piutang periode <b>Bulan ${selectedBulan} / ${selectedTahun}</b> untuk <b>${previewData.length} customer</b>?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            confirmButtonText: 'Ya, Jalankan Proses!',
            cancelButtonText: 'Batal'
        });

        if (confirm.isConfirmed) {
            setIsExecuting(true);
            try {
                const token = localStorage.getItem('token');
                const ptId = localStorage.getItem('pt_id') || 'C';
                const targetAgen = !isHoldingUser ? currentActiveAgen.id : selectedAgen;

                const res = await api.post('/piutang/proses-piutang/eksekusi', {
                    pt_id: ptId,
                    agen_id: targetAgen,
                    bulan: selectedBulan,
                    tahun: selectedTahun
                }, { headers: { Authorization: `Bearer ${token}` } });

                Swal.fire('Sukses', res.data?.message || 'Proses piutang berhasil dieksekusi', 'success');
                fetchPreviewData();
                fetchHistoryData();
                setActiveTab('history');
            } catch (err) {
                console.error("Gagal eksekusi piutang:", err);
                Swal.fire('Error', 'Gagal memproses saldo piutang', 'error');
            } finally {
                setIsExecuting(false);
            }
        }
    };

    const handleOpenCustDetail = async (cust) => {
        setSelectedDetailCust(cust);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get('/piutang/proses-piutang/detail-customer', {
                params: {
                    pt_id: ptId,
                    cust_id: cust.cust_id || cust.sa_custid,
                    bulan: selectedBulan,
                    tahun: selectedTahun
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustDetailData(res.data?.data || { invoices: [], receipts: [] });
            setIsDetailModalOpen(true);
        } catch (err) {
            console.error("Gagal load rincian customer:", err);
        }
    };

    // 1. Kolom Pratinjau Data
    const previewColumns = [
        {
            header: 'CUSTOMER / PELANGGAN',
            accessor: 'cust_name',
            render: (item) => (
                <div className="font-bold flex flex-col">
                    <button
                        type="button"
                        onClick={() => handleOpenCustDetail(item)}
                        className="text-left hover:underline text-sky-600 font-bold flex items-center gap-1 cursor-pointer"
                    >
                        {item.cust_name}
                        <ArrowUpRight size={13} />
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono font-normal">{item.cust_id}</span>
                </div>
            )
        },
        {
            header: 'SALDO AWAL',
            accessor: 'saldo_awal',
            render: (item) => (
                <span className="font-mono font-bold text-slate-700">
                    Rp {Number(item.saldo_awal || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'TAGIHAN INVOICE (+)',
            accessor: 'total_invoice',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-mono font-bold text-sky-600">
                        Rp {Number(item.total_invoice || 0).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.count_invoice || 0} Faktur Invoice</span>
                </div>
            )
        },
        {
            header: 'PEMBAYARAN KASIR (-)',
            accessor: 'total_bayar',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-mono font-bold text-emerald-600">
                        Rp {Number(item.total_bayar || 0).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.count_bayar || 0} Bukti Kuitansi</span>
                </div>
            )
        },
        {
            header: 'ESTIMASI SALDO AKHIR',
            accessor: 'estimasi_akhir',
            render: (item) => (
                <span className="font-mono font-black text-rose-600 text-sm">
                    Rp {Number(item.estimasi_akhir || 0).toLocaleString('id-ID')}
                </span>
            )
        }
    ];

    // 2. Kolom Histori Saldo Tahunan
    const historyColumns = [
        {
            header: 'CUSTOMER',
            accessor: 'cust_name',
            render: (item) => (
                <div className="font-bold flex flex-col">
                    <button
                        type="button"
                        onClick={() => handleOpenCustDetail(item)}
                        className="text-left hover:underline text-sky-600 font-bold flex items-center gap-1 cursor-pointer"
                    >
                        {item.cust_name}
                        <ArrowUpRight size={13} />
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono font-normal">{item.sa_custid}</span>
                </div>
            )
        },
        {
            header: 'SALDO AWAL',
            accessor: 'sa_awal',
            render: (item) => <span className="font-mono font-bold text-slate-700">Rp {Number(item.sa_awal || 0).toLocaleString('id-ID')}</span>
        },
        { header: 'JAN', accessor: 'sa_bln01', render: (item) => <span className="font-mono font-bold">Rp {Number(item.sa_bln01 || 0).toLocaleString('id-ID')}</span> },
        { header: 'FEB', accessor: 'sa_bln02', render: (item) => <span className="font-mono font-bold">Rp {Number(item.sa_bln02 || 0).toLocaleString('id-ID')}</span> },
        { header: 'MAR', accessor: 'sa_bln03', render: (item) => <span className="font-mono font-bold">Rp {Number(item.sa_bln03 || 0).toLocaleString('id-ID')}</span> },
        { header: 'APR', accessor: 'sa_bln04', render: (item) => <span className="font-mono font-bold">Rp {Number(item.sa_bln04 || 0).toLocaleString('id-ID')}</span> },
        { header: 'MEI', accessor: 'sa_bln05', render: (item) => <span className="font-mono font-bold">Rp {Number(item.sa_bln05 || 0).toLocaleString('id-ID')}</span> },
        { header: 'JUN', accessor: 'sa_bln06', render: (item) => <span className="font-mono font-bold">Rp {Number(item.sa_bln06 || 0).toLocaleString('id-ID')}</span> },
        { header: 'JUL', accessor: 'sa_bln07', render: (item) => <span className="font-mono font-bold">Rp {Number(item.sa_bln07 || 0).toLocaleString('id-ID')}</span> },
        { header: 'AGU', accessor: 'sa_bln08', render: (item) => <span className="font-mono font-bold">Rp {Number(item.sa_bln08 || 0).toLocaleString('id-ID')}</span> },
        { header: 'SEP', accessor: 'sa_bln09', render: (item) => <span className="font-mono font-bold">Rp {Number(item.sa_bln09 || 0).toLocaleString('id-ID')}</span> },
        { header: 'OKT', accessor: 'sa_bln10', render: (item) => <span className="font-mono font-bold">Rp {Number(item.sa_bln10 || 0).toLocaleString('id-ID')}</span> },
        { header: 'NOP', accessor: 'sa_bln11', render: (item) => <span className="font-mono font-bold">Rp {Number(item.sa_bln11 || 0).toLocaleString('id-ID')}</span> },
        { header: 'DES', accessor: 'sa_bln12', render: (item) => <span className="font-mono font-bold">Rp {Number(item.sa_bln12 || 0).toLocaleString('id-ID')}</span> }
    ];

    const currentYear = new Date().getFullYear();
    const startYear = 2017;
    const yearOptions = useMemo(() => {
        const list = [];
        for (let y = currentYear; y >= startYear; y--) {
            list.push(String(y));
        }
        return list;
    }, [currentYear]);

    return (
        <div className="space-y-4">
            {/* PANEL PARAMETER PROSES (TOGGLEABLE) */}
            {showFilter && (
                <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Cpu size={16} className="text-sky-600" />
                        PARAMETER EKSEKUSI PROSES PIUTANG BULANAN
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-bold">
                        <div>
                            <label className="block mb-1 text-slate-500">CABANG / AGEN :</label>
                            <select
                                value={!isHoldingUser && currentActiveAgen.id ? currentActiveAgen.id : selectedAgen}
                                disabled={!isHoldingUser}
                                onChange={(e) => setSelectedAgen(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser
                                        ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                                        : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'
                                    }`}
                                title={!isHoldingUser ? 'Cabang terkunci sesuai lokasi login Anda' : 'Pilih cabang / agen'}
                            >
                                {isHoldingUser && (
                                    <option value="ALL">-- SEMUA CABANG / AGEN --</option>
                                )}

                                {!isHoldingUser ? (
                                    <option value={currentActiveAgen.id}>
                                        {currentActiveAgen.nama || 'CABANG AKTIF'}
                                    </option>
                                ) : (
                                    agens.map((a) => (
                                        <option key={a.agen_id} value={a.agen_id}>{a.agen_nama}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1 text-slate-500">PERIODE BULAN :</label>
                            <select
                                value={selectedBulan}
                                onChange={(e) => setSelectedBulan(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold font-mono outline-none cursor-pointer bg-white text-slate-800 focus:border-sky-500"
                            >
                                <option value="01">01 - JANUARI</option>
                                <option value="02">02 - FEBRUARI</option>
                                <option value="03">03 - MARET</option>
                                <option value="04">04 - APRIL</option>
                                <option value="05">05 - MEI</option>
                                <option value="06">06 - JUNI</option>
                                <option value="07">07 - JULI</option>
                                <option value="08">08 - AGUSTUS</option>
                                <option value="09">09 - SEPTEMBER</option>
                                <option value="10">10 - OKTOBER</option>
                                <option value="11">11 - NOVEMBER</option>
                                <option value="12">12 - DESEMBER</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1 text-slate-500">TAHUN :</label>
                            <select
                                value={selectedTahun}
                                onChange={(e) => setSelectedTahun(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold font-mono outline-none cursor-pointer bg-white text-slate-800 focus:border-sky-500"
                            >
                                {yearOptions.map((thn) => (
                                    <option key={thn} value={thn}>{thn}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 flex-wrap gap-2">
                        {/* TAB SWITCHER */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('preview')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${activeTab === 'preview'
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                <ListFilter size={14} className="inline mr-1.5" /> Pratinjau Data ({selectedBulan}/{selectedTahun})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('history')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${activeTab === 'history'
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                <FileText size={14} className="inline mr-1.5" /> Histori Saldo ({selectedTahun})
                            </button>
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => { fetchPreviewData(); fetchHistoryData(); }}
                                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                                <RotateCcw size={14} /> Refresh Data
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteProses}
                                disabled={isExecuting}
                                className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-md cursor-pointer disabled:opacity-50 uppercase"
                            >
                                <Play size={14} className="fill-white" /> {isExecuting ? 'Memproses...' : 'Jalankan Proses Piutang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 1: PRATINJAU DATA SEBELUM DIPROSES */}
            {activeTab === 'preview' && (
                <div>
                    <DataTableTemplate
                        title={`DATA PRATINJAU PIUTANG YANG AKAN DIPROSES (PERIODE ${selectedBulan}/${selectedTahun})`}
                        columns={previewColumns}
                        data={previewData}
                        loading={loadingPreview}
                        isDarkMode={isDarkMode}
                        isAddDisabled={true}
                        hideAddButton={true}
                        hideActions={true}
                        hideActionColumn={true}
                        onFilter={() => setShowFilter(prev => !prev)}
                    />
                </div>
            )}

            {/* TAB 2: HISTORI SALDO TAHUNAN */}
            {activeTab === 'history' && (
                <div>
                    <DataTableTemplate
                        title={`HISTORI SALDO PIUTANG PER BULAN TAHUN ${selectedTahun}`}
                        columns={historyColumns}
                        data={historyData}
                        loading={loadingHistory}
                        isDarkMode={isDarkMode}
                        isAddDisabled={true}
                        hideAddButton={true}
                        hideActions={true}
                        hideActionColumn={true}
                        onFilter={() => setShowFilter(prev => !prev)}
                    />
                </div>
            )}

            {/* MODAL DRILLDOWN RINCIAN INVOICE & PEMBAYARAN PER CUSTOMER */}
            {isDetailModalOpen && selectedDetailCust && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl p-6 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] bg-white text-slate-900 border border-slate-200">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                                    <Receipt size={18} className="text-sky-600" />
                                    Rincian Mutasi Piutang Customer
                                </h3>
                                <div className="text-xs font-bold text-slate-500 font-mono mt-0.5">
                                    {selectedDetailCust.cust_name || selectedDetailCust.sa_custid} (Periode {selectedBulan}/{selectedTahun})
                                </div>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-400 hover:text-slate-700">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-5 overflow-y-auto text-xs p-1 text-slate-900">
                            {/* TABEL 1: INVOICE PENAMBAH TAGIHAN */}
                            <div>
                                <div className="text-xs font-black uppercase text-sky-700 mb-2 flex items-center gap-1.5">
                                    <FileText size={15} /> Daftar Tagihan Invoice Bulan Ini (+)
                                </div>
                                <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase">
                                            <th className="p-2">No. Invoice</th>
                                            <th className="p-2">Tanggal</th>
                                            <th className="p-2">Keterangan</th>
                                            <th className="p-2 text-right">Nilai Tagihan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white font-mono font-medium">
                                        {custDetailData.invoices.map((inv, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-2 font-bold text-sky-700">{inv.invoice_no}</td>
                                                <td className="p-2">{inv.tanggal}</td>
                                                <td className="p-2 font-sans">{inv.keterangan}</td>
                                                <td className="p-2 text-right font-bold text-rose-600">Rp {Number(inv.total || 0).toLocaleString('id-ID')}</td>
                                            </tr>
                                        ))}
                                        {custDetailData.invoices.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-4 text-center text-slate-400">Tidak ada tagihan invoice pada bulan ini</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* TABEL 2: PEMBAYARAN KUITANSI PENGURANG PIUTANG */}
                            <div>
                                <div className="text-xs font-black uppercase text-emerald-700 mb-2 flex items-center gap-1.5">
                                    <DollarSign size={15} /> Daftar Pembayaran / Kuitansi Kasir (-)
                                </div>
                                <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase">
                                            <th className="p-2">No. Receipt / Kuitansi</th>
                                            <th className="p-2">Tanggal</th>
                                            <th className="p-2">Akun Kas / Bank</th>
                                            <th className="p-2 text-right">Nominal Bayar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white font-mono font-medium">
                                        {custDetailData.receipts.map((rec, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-2 font-bold text-emerald-700">{rec.receipt_no}</td>
                                                <td className="p-2">{rec.tanggal}</td>
                                                <td className="p-2">{rec.akun_kas}</td>
                                                <td className="p-2 text-right font-bold text-emerald-600">Rp {Number(rec.nilai_bayar || 0).toLocaleString('id-ID')}</td>
                                            </tr>
                                        ))}
                                        {custDetailData.receipts.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-4 text-center text-slate-400">Tidak ada pembayaran pada bulan ini</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProsesPiutang;