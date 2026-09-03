import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    FileText,
    Printer,
    X,
    CheckCircle2,
    Calendar,
    Building,
    Search,
    RefreshCw,
    DollarSign,
    Filter,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowUpRight
} from 'lucide-react';
import Swal from 'sweetalert2';

const PenerimaanSetoranAgen = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [agens, setAgens] = useState([]);
    const [accounts, setAccounts] = useState([]);
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

    // Filter Form State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [filterAgen, setFilterAgen] = useState(isHoldingUser ? 'ALL' : currentActiveAgen.nama);
    const [filterTerbayar, setFilterTerbayar] = useState('ALL');
    const [filterPosting, setFilterPosting] = useState('ALL');
    const [filterNoClosing, setFilterNoClosing] = useState('');
    const [bypassTanggal, setBypassTanggal] = useState(false);

    // Sinkronisasi filter agen otomatis untuk cabang daerah
    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.nama) {
            setFilterAgen(currentActiveAgen.nama);
        }
    }, [isHoldingUser, currentActiveAgen.nama, agens]);

    // Modal State
    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedClosing, setSelectedClosing] = useState(null);
    const [bttList, setBttList] = useState([]);

    // Print Report Modal State
    const [printReportType, setPrintReportType] = useState(null);

    // Form Input Modal Proses
    const [inputTanggal, setInputTanggal] = useState(() => new Date().toISOString().split('T')[0]);
    const [inputCAID, setInputCAID] = useState('');
    const [inputNominal, setInputNominal] = useState(0);
    const [inputKeterangan, setInputKeterangan] = useState('');

    const fetchData = async (useDateFilter = true) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const params = { pt_id: ptId };
            if (!bypassTanggal && useDateFilter && startDate && endDate) {
                params.start_date = startDate;
                params.end_date = endDate;
            }
            const activeAgenTarget = !isHoldingUser ? currentActiveAgen.nama : filterAgen;
            if (activeAgenTarget && activeAgenTarget !== 'ALL') {
                params.agen_nama = activeAgenTarget;
            }
            if (filterTerbayar !== 'ALL') params.terbayar = filterTerbayar;
            if (filterPosting !== 'ALL') params.posting = filterPosting;
            if (filterNoClosing) params.no_closing = filterNoClosing;

            const res = await api.get('/piutang/penerimaan-setoran-agen', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load setoran agen:", err);
            Swal.fire('Error', 'Gagal memuat data penerimaan setoran agen', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const [resAgen, resAcc] = await Promise.all([
                api.get(`/agens?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
                api.get(`/akun/kas-bank-dropdown?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } }))
            ]);

            setAgens(resAgen.data?.data || []);
            const accList = resAcc.data?.data || [];
            setAccounts(accList);
            if (accList.length > 0) setInputCAID(accList[0].ca_id);
        } catch (err) {
            console.error("Gagal load options:", err);
        }
    };

    useEffect(() => {
        fetchData();
        fetchOptions();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchData(true);
    };

    const handleResetFilter = () => {
        const d = new Date();
        setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
        setEndDate(new Date().toISOString().split('T')[0]);
        setBypassTanggal(false);
        setFilterAgen(isHoldingUser ? 'ALL' : currentActiveAgen.nama);
        setFilterTerbayar('ALL');
        setFilterPosting('ALL');
        setFilterNoClosing('');
        fetchData(false);
    };

    const kpiSummary = useMemo(() => {
        const totalClosing = data.length;
        const totalNominal = data.reduce((acc, curr) => acc + Number(curr.jml_setoran || 0), 0);
        const totalTerbayar = data.filter(d => d.stt_bayar === 'Y').reduce((acc, curr) => acc + Number(curr.jml_setoran || 0), 0);
        const totalBelumTerbayar = totalNominal - totalTerbayar;
        const countBelumBayar = data.filter(d => d.stt_bayar !== 'Y').length;

        return { totalClosing, totalNominal, totalTerbayar, totalBelumTerbayar, countBelumBayar };
    }, [data]);

    const handleOpenProcess = (item) => {
        setSelectedClosing(item);
        setInputTanggal(new Date().toISOString().split('T')[0]);
        if (accounts.length > 0) setInputCAID(accounts[0].ca_id);
        setInputNominal(item.jml_setoran || 0);
        setInputKeterangan(`Penerimaan setoran closing BTT ${item.btth_id} - Agen ${item.agen_nama}`);
        setIsProcessModalOpen(true);
    };

    const handleSaveProcess = async () => {
        if (!inputCAID) {
            Swal.fire('Peringatan', 'Silakan pilih rekening akun kas/bank penerima!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            await api.post('/piutang/penerimaan-setoran-agen/proses', {
                pt_id: ptId,
                btth_id: selectedClosing.btth_id,
                agen_nama: selectedClosing.agen_nama,
                tanggal: inputTanggal,
                ca_id: inputCAID,
                nominal: parseFloat(inputNominal),
                keterangan: inputKeterangan
            }, { headers: { Authorization: `Bearer ${token}` } });

            Swal.fire('Sukses', 'Setoran agen berhasil diterima dan diproses', 'success');
            setIsProcessModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Gagal proses setoran:", err);
            Swal.fire('Error', 'Gagal memproses setoran agen', 'error');
        }
    };

    const handleOpenDetail = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get('/piutang/penerimaan-setoran-agen/detail', {
                params: { btth_id: item.btth_id, pt_id: ptId },
                headers: { Authorization: `Bearer ${token}` }
            });

            setSelectedClosing(res.data?.data?.header || item);
            setBttList(res.data?.data?.items || []);
            setIsDetailModalOpen(true);
        } catch (err) {
            console.error("Gagal detail setoran:", err);
            Swal.fire('Error', 'Gagal memuat rincian resi closing', 'error');
        }
    };

    const printDataset = useMemo(() => {
        if (printReportType === 'os') {
            return data.filter(d => d.stt_bayar !== 'Y');
        }
        return data;
    }, [data, printReportType]);

    const columns = [
        {
            header: 'NO. CLOSING',
            accessor: 'btth_id',
            render: (item) => (
                <button
                    type="button"
                    onClick={() => handleOpenDetail(item)}
                    className="font-mono font-bold text-sky-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                    {item.btth_id}
                    <ArrowUpRight size={13} />
                </button>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'btth_tanggal_str',
            render: (item) => <span className="font-mono text-slate-600">{item.btth_tanggal_str}</span>
        },
        {
            header: 'AGEN / CABANG',
            accessor: 'agen_nama',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.agen_nama}</span>
        },
        {
            header: 'KOMISI (%)',
            accessor: 'agen_komisikirim',
            render: (item) => <span className="font-mono font-bold text-slate-700">{Number(item.agen_komisikirim || 0)}%</span>
        },
        {
            header: 'JML. SETORAN (RP)',
            accessor: 'jml_setoran',
            render: (item) => <span className="font-mono font-black text-emerald-600">Rp {Number(item.jml_setoran || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'NO. PEMBAYARAN',
            accessor: 'no_pembayaran',
            render: (item) => item.no_pembayaran ? (
                <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded text-[11px] border border-sky-200">
                    {item.no_pembayaran}
                </span>
            ) : (
                <button
                    type="button"
                    onClick={() => handleOpenProcess(item)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] tracking-wider uppercase transition cursor-pointer shadow-xs"
                >
                    PROSES
                </button>
            )
        },
        {
            header: 'NO. JURNAL',
            accessor: 'no_jurnal',
            render: (item) => <span className="font-mono text-slate-600">{item.no_jurnal || '-'}</span>
        },
        {
            header: 'STATUS POSTING',
            accessor: 'posting_yn',
            render: (item) => item.posting_yn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> POSTED
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded text-[10px]">
                    <Clock size={12} /> DRAFT
                </span>
            )
        }
    ];

    return (
        <div className="space-y-5">
            {/* KPI STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Dokumen Closing</div>
                        <div className="text-xl font-black font-mono mt-1 text-slate-900">
                            {kpiSummary.totalClosing} <span className="text-xs font-sans font-bold text-slate-400">Berkas</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
                        <FileText size={20} />
                    </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Nilai Setoran</div>
                        <div className="text-xl font-black font-mono mt-1 text-slate-900">
                            Rp {kpiSummary.totalNominal.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                        <TrendingUp size={20} />
                    </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sudah Diterima (Lunas)</div>
                        <div className="text-xl font-black font-mono mt-1 text-emerald-600">
                            Rp {kpiSummary.totalTerbayar.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                        <CheckCircle size={20} />
                    </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Outstanding (Belum Bayar)</div>
                        <div className="text-xl font-black font-mono mt-1 text-rose-600">
                            Rp {kpiSummary.totalBelumTerbayar.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                        <Clock size={20} />
                    </div>
                </div>
            </div>

            {/* FILTER PANEL (TOGGLEABLE) */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER PENERIMAAN SETORAN AGEN
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">DARI TGL</label>
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
                                <label className="font-bold text-slate-500 block mb-1">SAMPAI TGL</label>
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

                        {/* Dropdown Agen dengan Logika Penguncian Cabang */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">AGEN / CABANG</label>
                            <select
                                value={!isHoldingUser && currentActiveAgen.nama ? currentActiveAgen.nama : filterAgen}
                                disabled={!isHoldingUser}
                                onChange={(e) => setFilterAgen(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser
                                        ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                                        : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'
                                    }`}
                                title={!isHoldingUser ? 'Filter agen terkunci sesuai lokasi login Anda' : 'Pilih agen'}
                            >
                                {isHoldingUser && (
                                    <option value="ALL">-- SEMUA AGEN --</option>
                                )}

                                {!isHoldingUser ? (
                                    <option value={currentActiveAgen.nama}>
                                        {currentActiveAgen.nama || 'CABANG AKTIF'}
                                    </option>
                                ) : (
                                    agens.map((a) => (
                                        <option key={a.agen_id} value={a.agen_nama}>{a.agen_nama}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS BAYAR</label>
                            <select
                                value={filterTerbayar}
                                onChange={(e) => setFilterTerbayar(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                            >
                                <option value="ALL">-- SEMUA STATUS --</option>
                                <option value="Y">TERBAYAR (LUNAS)</option>
                                <option value="N">BELUM TERBAYAR (OS)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. CLOSING</label>
                            <input
                                type="text"
                                placeholder="Cari nomor closing..."
                                value={filterNoClosing}
                                onChange={(e) => setFilterNoClosing(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS POSTING</label>
                            <select
                                value={filterPosting}
                                onChange={(e) => setFilterPosting(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                            >
                                <option value="ALL">-- SEMUA POSTING --</option>
                                <option value="Y">POSTED</option>
                                <option value="N">DRAFT</option>
                            </select>
                        </div>

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

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
                        {/* Tombol Cetak Rekap */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPrintReportType('tipe1')}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl uppercase transition flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                            >
                                <Printer size={14} /> Cetak Tipe 1
                            </button>
                            <button
                                type="button"
                                onClick={() => setPrintReportType('tipe2')}
                                className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl uppercase transition flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                            >
                                <Printer size={14} /> Cetak Tipe 2
                            </button>
                            <button
                                type="button"
                                onClick={() => setPrintReportType('os')}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase transition flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                            >
                                <AlertCircle size={14} /> OS Belum Bayar
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleResetFilter}
                                className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer text-xs"
                            >
                                RESET
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs"
                            >
                                <RefreshCw size={14} /> REFRESH DATA
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* TABEL DATA TABLE TEMPLATE */}
            <DataTableTemplate
                title="PENERIMAAN SETORAN AGEN"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                isAddDisabled={true}
                hideAddButton={true}
                hideActions={true}
                hideActionColumn={true}
                onFilter={() => setShowFilter(prev => !prev)}
            />

            {/* MODAL PROSES PENERIMAAN SETORAN */}
            {isProcessModalOpen && selectedClosing && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-lg p-6 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] bg-white text-slate-900 border border-slate-200">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
                            <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                                <DollarSign size={18} className="text-emerald-600" /> Proses Penerimaan Setoran Kasir
                            </h3>
                            <button onClick={() => setIsProcessModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-500 hover:text-black">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs font-semibold">
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono">
                                <div><strong className="text-slate-500">NO. CLOSING: </strong> <span className="text-sky-600 font-bold">{selectedClosing.btth_id}</span></div>
                                <div><strong className="text-slate-500">AGEN PENGIRIM: </strong> <span className="text-slate-800 font-bold">{selectedClosing.agen_nama}</span></div>
                                <div><strong className="text-slate-500">TOTAL NOMINAL: </strong> <span className="font-black text-rose-600 text-sm">Rp {Number(selectedClosing.jml_setoran || 0).toLocaleString('id-ID')}</span></div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold mb-1 text-slate-600">TGL PENERIMAAN:</label>
                                    <input
                                        type="date"
                                        value={inputTanggal}
                                        onChange={(e) => setInputTanggal(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg font-bold font-mono outline-none bg-white text-slate-800 focus:border-sky-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold mb-1 text-slate-600">AKUN KAS / BANK:</label>
                                    <select
                                        value={inputCAID}
                                        onChange={(e) => setInputCAID(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg font-bold outline-none bg-white text-slate-800 cursor-pointer focus:border-sky-500"
                                    >
                                        {accounts.map((a) => (
                                            <option key={a.ca_id} value={a.ca_id}>{a.ca_id} - {a.ca_nama}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold mb-1 text-slate-600">NOMINAL DITERIMA (RP):</label>
                                <input
                                    type="number"
                                    value={inputNominal}
                                    onChange={(e) => setInputNominal(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-rose-600 text-sm outline-none bg-white focus:border-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block font-bold mb-1 text-slate-600">KETERANGAN SETORAN:</label>
                                <textarea
                                    rows={2}
                                    value={inputKeterangan}
                                    onChange={(e) => setInputKeterangan(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg font-medium outline-none bg-white text-slate-800 focus:border-sky-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4">
                            <button
                                type="button"
                                onClick={() => setIsProcessModalOpen(false)}
                                className="px-5 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 text-xs cursor-pointer hover:bg-slate-100 uppercase"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveProcess}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer uppercase"
                            >
                                <CheckCircle2 size={16} /> Konfirmasi & Buat Kwitansi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL CLOSING RESI BTT */}
            {isDetailModalOpen && selectedClosing && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl p-6 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] bg-white text-slate-900 border border-slate-200">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4 print:hidden">
                            <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                                <FileText size={18} className="text-sky-600" /> Detail Laporan Closing Penjualan BTT Agen
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer uppercase"
                                >
                                    <Printer size={14} /> Cetak
                                </button>
                                <button onClick={() => setIsDetailModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-500 hover:text-black">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 overflow-y-auto text-xs p-1 text-slate-900">
                            <div className="border-b border-slate-200 pb-3 grid grid-cols-2 gap-y-1 font-mono font-bold">
                                <div><strong className="text-slate-500 font-sans">NO. CLOSING: </strong> <span className="font-bold text-sky-600">{selectedClosing.btth_id}</span></div>
                                <div><strong className="text-slate-500 font-sans">TANGGAL: </strong> {selectedClosing.btth_tanggal ? new Date(selectedClosing.btth_tanggal).toLocaleDateString('id-ID') : '-'}</div>
                                <div><strong className="text-slate-500 font-sans">AGEN: </strong> <span className="font-bold text-slate-800 uppercase">{selectedClosing.agen_nama}</span></div>
                                <div><strong className="text-slate-500 font-sans">KOMISI: </strong> {selectedClosing.agen_komisikirim || 0}%</div>
                                <div><strong className="text-slate-500 font-sans">BUKTI BAYAR: </strong> <span className="font-bold text-emerald-600">{selectedClosing.no_pembayaran || 'BELUM TERBAYAR'}</span></div>
                                <div><strong className="text-slate-500 font-sans">STATUS: </strong> {selectedClosing.posting_yn === 'Y' ? 'POSTED' : 'DRAFT'}</div>
                            </div>

                            <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px] uppercase">
                                        <th className="p-2.5">No. BTT / Resi</th>
                                        <th className="p-2.5">Penerima</th>
                                        <th className="p-2.5">Tujuan</th>
                                        <th className="p-2.5 text-right">Ongkir</th>
                                        <th className="p-2.5 text-right">Penerus</th>
                                        <th className="p-2.5 text-right">Packing</th>
                                        <th className="p-2.5 text-right">Asuransi</th>
                                        <th className="p-2.5 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white font-mono text-slate-800">
                                    {bttList.map((b, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-2.5 font-bold text-sky-700">{b.btt_id}</td>
                                            <td className="p-2.5 font-sans">{b.penerima}</td>
                                            <td className="p-2.5 font-sans">{b.tujuan}</td>
                                            <td className="p-2.5 text-right">Rp {Number(b.harga || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2.5 text-right">Rp {Number(b.biaya_penerus || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2.5 text-right">Rp {Number(b.biaya_packing || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2.5 text-right">Rp {Number(b.biaya_asuransi || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2.5 text-right font-bold text-rose-600">
                                                Rp {Number(b.total_btt || 0).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))}
                                    {bttList.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-4 text-center text-slate-400 font-semibold">Tidak ada rincian resi untuk closing ini</td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                                        <td colSpan={7} className="p-2.5 text-right uppercase">TOTAL SETORAN CLOSING:</td>
                                        <td className="p-2.5 text-right font-mono text-rose-600 text-sm font-black">
                                            Rp {bttList.reduce((acc, curr) => acc + Number(curr.total_btt || 0), 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CETAK LAPORAN (TIPE 1 / TIPE 2 / OS BELUM BAYAR) */}
            {printReportType && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-6xl p-6 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] bg-white text-black border border-slate-200">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4 print:hidden">
                            <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                                <Printer size={18} className="text-sky-600" />
                                {printReportType === 'tipe1' && 'Cetak Faktur Penagihan / Setoran Agen (Tipe 1)'}
                                {printReportType === 'tipe2' && 'Cetak Rekapitulasi Penerimaan Pembayaran (Tipe 2)'}
                                {printReportType === 'os' && 'Cetak Laporan Closing Agen Belum Terbayar (OS)'}
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer uppercase"
                                >
                                    <Printer size={14} /> Cetak Dokumen
                                </button>
                                <button onClick={() => setPrintReportType(null)} className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer text-slate-500 hover:text-black">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Lembar Dokumen Siap Cetak */}
                        <div className="space-y-4 overflow-y-auto text-xs p-3 text-black font-sans">
                            <div className="flex justify-between items-center border-b-2 border-black pb-3 gap-4">
                                <div className="flex items-center gap-3.5">
                                    <img
                                        src="/src/assets/new_logo 2.png"
                                        alt="Dakota Cargo Logo"
                                        className="h-12 w-auto object-contain"
                                        onError={(e) => { e.target.src = '/src/assets/logo.png'; }}
                                    />
                                    <div>
                                        <div className="font-black text-sm uppercase tracking-wider text-slate-900">PT DAKOTA LOGISTIK INDONESIA</div>
                                        <div className="text-[11px] font-semibold text-slate-700">Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi - BEKASI KOTA</div>
                                        <div className="text-[11px] font-semibold text-slate-700">(021) 8603278 / (021) 86608589</div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-base font-black uppercase tracking-widest text-slate-900 font-mono">
                                        {printReportType === 'tipe1' && 'FAKTUR PENAGIHAN SETORAN AGEN'}
                                        {printReportType === 'tipe2' && 'REKAPITULASI PENERIMAAN PEMBAYARAN'}
                                        {printReportType === 'os' && 'LAPORAN CLOSING AGENT BELUM TERBAYAR (OS)'}
                                    </div>
                                    <div className="text-[11px] font-bold font-mono text-slate-800 mt-0.5">
                                        Periode: {startDate} s/d {endDate}
                                    </div>
                                </div>
                            </div>

                            {/* TABEL CETAK TIPE 1 & OS */}
                            {(printReportType === 'tipe1' || printReportType === 'os') && (
                                <table className="w-full text-left border-collapse border border-slate-400 text-xs mt-2">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-400 font-bold text-[11px] uppercase">
                                            <th className="p-2 border-r border-slate-400">No. Closing</th>
                                            <th className="p-2 border-r border-slate-400">Tanggal</th>
                                            <th className="p-2 border-r border-slate-400">Agen / Cabang</th>
                                            <th className="p-2 text-center border-r border-slate-400">Komisi %</th>
                                            <th className="p-2 text-right">Total Setoran (Rp)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-300 font-mono font-medium">
                                        {printDataset.map((row, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2 border-r border-slate-300 font-bold text-sky-800">{row.btth_id}</td>
                                                <td className="p-2 border-r border-slate-300">{row.btth_tanggal_str}</td>
                                                <td className="p-2 border-r border-slate-300 font-sans font-bold uppercase">{row.agen_nama}</td>
                                                <td className="p-2 text-center border-r border-slate-300">{Number(row.agen_komisikirim || 0)}%</td>
                                                <td className="p-2 text-right font-bold text-rose-600">
                                                    Rp {Number(row.jml_setoran || 0).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 font-black border-t-2 border-slate-400 text-black">
                                            <td colSpan={4} className="p-2.5 text-right uppercase">TOTAL KESELURUHAN:</td>
                                            <td className="p-2.5 text-right font-mono text-sm font-black text-rose-600">
                                                Rp {printDataset.reduce((acc, curr) => acc + Number(curr.jml_setoran || 0), 0).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}

                            {/* TABEL CETAK TIPE 2 */}
                            {printReportType === 'tipe2' && (
                                <table className="w-full text-left border-collapse border border-slate-400 text-[11px] mt-2">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase text-center text-[10px]">
                                            <th className="p-2 border-r border-slate-400">No Receipt</th>
                                            <th className="p-2 border-r border-slate-400">No Jurnal</th>
                                            <th className="p-2 border-r border-slate-400">Tanggal</th>
                                            <th className="p-2 border-r border-slate-400">Agen / Cabang</th>
                                            <th className="p-2 border-r border-slate-400">No Closing</th>
                                            <th className="p-2 border-r border-slate-400 text-right">Total Nilai</th>
                                            <th className="p-2 border-r border-slate-400 text-center">Status Bayar</th>
                                            <th className="p-2 text-center">Posting</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-300 font-mono font-medium">
                                        {printDataset.map((row, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2 border-r border-slate-300 font-bold text-sky-800">{row.no_pembayaran || '-'}</td>
                                                <td className="p-2 border-r border-slate-300">{row.no_jurnal || '-'}</td>
                                                <td className="p-2 border-r border-slate-300">{row.btth_tanggal_str}</td>
                                                <td className="p-2 border-r border-slate-300 font-sans font-bold uppercase">{row.agen_nama}</td>
                                                <td className="p-2 border-r border-slate-300 font-bold">{row.btth_id}</td>
                                                <td className="p-2 text-right border-r border-slate-300 font-bold text-rose-600">
                                                    Rp {Number(row.jml_setoran || 0).toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-2 text-center border-r border-slate-300 font-sans text-[10px] font-bold">
                                                    {row.stt_bayar === 'Y' ? 'LUNAS' : 'PENDING'}
                                                </td>
                                                <td className="p-2 text-center font-sans text-[10px] font-bold">
                                                    {row.posting_yn === 'Y' ? 'POSTED' : 'DRAFT'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 font-black border-t-2 border-slate-400 text-black">
                                            <td colSpan={5} className="p-2.5 text-right uppercase">TOTAL REKAPITULASI:</td>
                                            <td className="p-2.5 text-right font-mono text-sm font-black text-rose-600">
                                                Rp {printDataset.reduce((acc, curr) => acc + Number(curr.jml_setoran || 0), 0).toLocaleString('id-ID')}
                                            </td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PenerimaanSetoranAgen;