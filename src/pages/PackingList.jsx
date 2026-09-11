import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Filter, RefreshCw, Printer, UploadCloud, ArrowRightCircle,
    CheckCircle2, AlertCircle, X, Layers, Scale, DollarSign, Package
} from 'lucide-react';

const PackingList = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Filter State
    const [useTanggal, setUseTanggal] = useState(false);
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [custOptions, setCustOptions] = useState([]);
    const [cabangOptions, setCabangOptions] = useState([]);

    // Data State
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(true);

    // Modal State
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [printDetail, setPrintDetail] = useState(null);

    // Form State: Proses BTT
    const [formData, setFormData] = useState({
        pli_id: '',
        tanggal: today,
        asal_cust_id: '',
        asal_name: '',
        asal_alamat: '',
        asal_kota: '',
        asal_telp: '',
        tujuan_agen_id: '',
        tujuan_nama: '',
        tujuan_alamat: '',
        tujuan_kota: '',
        tujuan_telp: '',
        isi_barang: 'BARANG PAKET / DUS',
        no_sj: '',
        colly: 1,
        berat: 1,
        volume: 0,
        service: 'R',
        pembayaran: '1', // 1: Tunai, 2: Kredit, 3: Tagih
        biaya_kirim: 0,
        biaya_penerus: 0
    });

    // Form State: Upload CSV
    const [csvFile, setCsvFile] = useState(null);
    const [uploadCustId, setUploadCustId] = useState('');
    const [uploadCustName, setUploadCustName] = useState('');
    const [uploadLoading, setUploadLoading] = useState(false);

    // Load Opsi Master
    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const token = localStorage.getItem('token');
                const [resCust, resCabang] = await Promise.all([
                    api.get('/marketing/monitoring-btt/combo-customer', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/laporan/btt-counter/combo-cabang', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setCustOptions(resCust.data?.data || []);
                setCabangOptions(resCabang.data?.data || []);
            } catch (err) {
                console.error("Gagal memuat master opsi:", err);
            }
        };
        fetchMasters();
    }, []);

    // Load Antrean Packing List
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                use_tanggal: useTanggal ? 'true' : 'false',
                start_date: startDate,
                end_date: endDate,
                cust_id: selectedCustomer
            });

            const res = await api.get(`/marketing/packing-list/data?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDataList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load packing list:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // KPI Ringkasan
    const totalColly = useMemo(() => dataList.reduce((acc, i) => acc + (Number(i.colly) || 0), 0), [dataList]);
    const totalBerat = useMemo(() => dataList.reduce((acc, i) => acc + (Number(i.berat) || 0), 0), [dataList]);
    const totalNilai = useMemo(() => dataList.reduce((acc, i) => acc + (Number(i.nilaibarang) || 0), 0), [dataList]);

    // Buka Modal Konversi BTT
    const handleOpenProcess = (item) => {
        setSelectedItem(item);
        setFormData({
            pli_id: item.pli_id,
            tanggal: today,
            asal_cust_id: item.pli_asalcustid || '',
            asal_name: item.cust_name || item.pli_asalname || '',
            asal_alamat: item.pli_tujuanalamat || '',
            asal_kota: '',
            asal_telp: '',
            tujuan_agen_id: '',
            tujuan_nama: item.pli_tujuannama || '',
            tujuan_alamat: item.pli_tujuanalamat || '',
            tujuan_kota: item.pli_tujuankota || '',
            tujuan_telp: '',
            isi_barang: 'BARANG PAKET',
            no_sj: item.pli_id,
            colly: item.colly || 1,
            berat: item.berat || 1,
            volume: item.beratvol || 0,
            service: 'R',
            pembayaran: '1',
            biaya_kirim: 0,
            biaya_penerus: 0
        });
        setShowProcessModal(true);
    };

    // Eksekusi Konversi BTT
    const handleSubmitProcess = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/marketing/packing-list/process-btt', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Sukses! Resi BTT berhasil diterbitkan: ${res.data?.btt_id}`);
            setShowProcessModal(false);
            fetchData();
        } catch (err) {
            alert(`Gagal konversi BTT: ${err.response?.data?.error || err.message}`);
        }
    };

    // Eksekusi Unggah CSV
    const handleUploadCSV = async (e) => {
        e.preventDefault();
        if (!csvFile || !uploadCustId) {
            alert("Harap pilih Customer dan berkas CSV!");
            return;
        }

        const dataUpload = new FormData();
        dataUpload.append('file', csvFile);
        dataUpload.append('cust_id', uploadCustId);
        dataUpload.append('cust_name', uploadCustName);

        setUploadLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/marketing/packing-list/upload-csv', dataUpload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert(res.data?.message || "Unggah berkas CSV berhasil!");
            setShowUploadModal(false);
            setCsvFile(null);
            fetchData();
        } catch (err) {
            alert(`Gagal unggah CSV: ${err.response?.data?.error || err.message}`);
        } finally {
            setUploadLoading(false);
        }
    };

    // Cetak Slip Detail Packing List
    const handlePrintSlip = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/marketing/packing-list/detail/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPrintDetail(res.data);
            setTimeout(() => {
                window.print();
            }, 300);
        } catch (err) {
            alert("Gagal memuat rincian slip untuk dicetak");
        }
    };

    const columns = [
        {
            header: 'AGEN.ID',
            accessor: 'pli_id',
            render: (item) => <span className="font-mono font-bold text-slate-600">{item.pli_id ? item.pli_id.substring(0, 3) : '-'}</span>
        },
        {
            header: 'NO. PACKING',
            accessor: 'pli_id',
            render: (item) => (
                <button
                    type="button"
                    onClick={() => handlePrintSlip(item.pli_id)}
                    className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-mono font-black text-xs rounded transition cursor-pointer"
                    title="Klik untuk cetak slip packing"
                >
                    {item.pli_id ? item.pli_id.slice(-8) : item.pli_id}
                </button>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'pli_tanggal',
            render: (item) => <span className="font-mono font-bold text-black whitespace-nowrap">{item.pli_tanggal}</span>
        },
        {
            header: 'CUSTOMER PENGIRIM',
            accessor: 'cust_name',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-black text-black">{item.cust_name}</span>
                    {item.pli_asalcustid && <span className="text-[10px] font-mono text-slate-500">{item.pli_asalcustid}</span>}
                </div>
            )
        },
        {
            header: 'KOTA TUJUAN',
            accessor: 'pli_tujuankota',
            render: (item) => <span className="font-bold text-black">{item.pli_tujuankota}</span>
        },
        {
            header: 'PENERIMA',
            accessor: 'pli_tujuannama',
            render: (item) => <span className="font-bold text-slate-800">{item.pli_tujuannama}</span>
        },
        {
            header: 'COLLY',
            accessor: 'colly',
            render: (item) => <span className="font-mono font-black text-right block">{item.colly || 1} Pcs</span>
        },
        {
            header: 'BERAT',
            accessor: 'berat',
            render: (item) => <span className="font-mono font-bold text-right block">{item.berat} Kg</span>
        },
        {
            header: 'VOLUME',
            accessor: 'beratvol',
            render: (item) => <span className="font-mono font-bold text-right block">{item.beratvol} m³</span>
        },
        {
            header: 'NILAI BARANG',
            accessor: 'nilaibarang',
            render: (item) => <span className="font-mono font-bold text-right block">Rp {Math.round(item.nilaibarang || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'STATUS / PROSES',
            accessor: 'pli_bttid',
            render: (item) => (
                <button
                    type="button"
                    onClick={() => handleOpenProcess(item)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-lg shadow uppercase transition flex items-center gap-1 cursor-pointer"
                >
                    <ArrowRightCircle size={13} /> PROSES BTT
                </button>
            )
        }
    ];

    return (
        <div className="space-y-5">
            {/* AREA FILTER */}
            {showFilter && (
                <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-4 text-xs no-print">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 font-black uppercase text-slate-900 tracking-wider text-sm">
                            <Filter size={16} className="text-blue-600" />
                            <span>FILTER ANTREAN PACKING LIST</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowUploadModal(true)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl uppercase transition flex items-center gap-1.5 cursor-pointer text-xs"
                            >
                                <UploadCloud size={14} /> UPLOAD CSV
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="flex items-center gap-2 font-bold text-slate-900 mb-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useTanggal}
                                    onChange={(e) => setUseTanggal(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span>PERIODE TANGGAL :</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    disabled={!useTanggal}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold text-xs ${!useTanggal ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-900'}`}
                                />
                                <span className="font-bold text-slate-400">s/d</span>
                                <input
                                    type="date"
                                    disabled={!useTanggal}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold text-xs ${!useTanggal ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-900'}`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-bold text-slate-900 mb-1 block">CUSTOMER PENGIRIM :</label>
                            <select
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 focus:border-blue-600 cursor-pointer"
                            >
                                <option value="">-- SEMUA CUSTOMER --</option>
                                {custOptions.map((c, idx) => (<option key={idx} value={c}>{c}</option>))}
                            </select>
                        </div>

                        <div className="flex items-end justify-end gap-2">
                            <button type="button" onClick={() => window.print()} className="px-5 py-2 border border-slate-400 text-slate-900 hover:bg-slate-100 font-black rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer text-xs">
                                <Printer size={15} /> CETAK LAPORAN
                            </button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs">
                                <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> REFRESH DATA
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* KPI STATISTIK PACKING LIST */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL ANTREAN DOKUMEN</span>
                    <span className="text-2xl font-black font-mono text-blue-700">{dataList.length} Berkas</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL COLLY / KOLI</span>
                    <span className="text-2xl font-black font-mono text-emerald-700">{totalColly.toLocaleString('id-ID')} Pcs</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL BERAT FISIK</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{totalBerat.toFixed(1)} Kg</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL NILAI BARANG</span>
                    <span className="text-2xl font-black font-mono text-purple-700">Rp {Math.round(totalNilai).toLocaleString('id-ID')}</span>
                </div>
            </div>

            {/* TABEL DATA PACKING LIST */}
            <div className="no-print">
                <DataTableTemplate
                    title="ANTREAN PACKING LIST BELUM DIPROSES BTT"
                    columns={columns}
                    data={dataList}
                    loading={loading}
                    isDarkMode={isDarkMode}
                    isAddDisabled={true}
                    hideAddButton={true}
                    onFilter={() => setShowFilter(prev => !prev)}
                />
            </div>

            {/* MODAL PROSES PACKING LIST KE BTT */}
            {showProcessModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto no-print">
                    <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-300 shadow-2xl p-6 space-y-5 my-8">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div className="flex items-center gap-2">
                                <Package className="text-blue-600" size={20} />
                                <h3 className="font-black text-base text-slate-900 uppercase tracking-wider">
                                    PROSES PACKING LIST KE BTT RESMI ({formData.pli_id})
                                </h3>
                            </div>
                            <button onClick={() => setShowProcessModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitProcess} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div>
                                    <label className="font-black text-slate-800 block mb-1">TANGGAL TRANSAKSI</label>
                                    <input
                                        type="date"
                                        value={formData.tanggal}
                                        onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-black text-slate-800 block mb-1">CUSTOMER PENGIRIM</label>
                                    <input
                                        type="text"
                                        value={formData.asal_name}
                                        onChange={(e) => setFormData({ ...formData, asal_name: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-black text-slate-800 block mb-1">NO. SURAT JALAN</label>
                                    <input
                                        type="text"
                                        value={formData.no_sj}
                                        onChange={(e) => setFormData({ ...formData, no_sj: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div>
                                    <label className="font-black text-slate-800 block mb-1">CABANG / AGEN PENERIMA (*)</label>
                                    <select
                                        value={formData.tujuan_agen_id}
                                        onChange={(e) => setFormData({ ...formData, tujuan_agen_id: e.target.value })}
                                        className="w-full p-2 border border-blue-400 rounded-lg bg-white font-bold text-slate-900"
                                        required
                                    >
                                        <option value="">-- PILIH CABANG TUJUAN --</option>
                                        {cabangOptions.map((cb, idx) => (
                                            <option key={idx} value={cb}>{cb}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="font-black text-slate-800 block mb-1">NAMA PENERIMA</label>
                                    <input
                                        type="text"
                                        value={formData.tujuan_nama}
                                        onChange={(e) => setFormData({ ...formData, tujuan_nama: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-black text-slate-800 block mb-1">KOTA TUJUAN</label>
                                    <input
                                        type="text"
                                        value={formData.tujuan_kota}
                                        onChange={(e) => setFormData({ ...formData, tujuan_kota: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div>
                                    <label className="font-black text-slate-800 block mb-1">JUMLAH COLLY</label>
                                    <input
                                        type="number"
                                        value={formData.colly}
                                        onChange={(e) => setFormData({ ...formData, colly: parseInt(e.target.value) || 1 })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-black text-slate-800 block mb-1">BERAT TOTAL (KG)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.berat}
                                        onChange={(e) => setFormData({ ...formData, berat: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-black text-slate-800 block mb-1">METODE BAYAR</label>
                                    <select
                                        value={formData.pembayaran}
                                        onChange={(e) => setFormData({ ...formData, pembayaran: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                                    >
                                        <option value="1">TUNAI</option>
                                        <option value="2">KREDIT</option>
                                        <option value="3">TAGIH TUJUAN</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-black text-slate-800 block mb-1">LAYANAN SERVICE</label>
                                    <select
                                        value={formData.service}
                                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                                    >
                                        <option value="R">REGULER</option>
                                        <option value="O">ONS (ONE NIGHT SERVICE)</option>
                                        <option value="S">SAMEDAY</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div>
                                    <label className="font-black text-slate-800 block mb-1">BIAYA KIRIM (RP)</label>
                                    <input
                                        type="number"
                                        value={formData.biaya_kirim}
                                        onChange={(e) => setFormData({ ...formData, biaya_kirim: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-black font-mono text-emerald-700 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-black text-slate-800 block mb-1">BIAYA PENERUS / LAIN-LAIN (RP)</label>
                                    <input
                                        type="number"
                                        value={formData.biaya_penerus}
                                        onChange={(e) => setFormData({ ...formData, biaya_penerus: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold font-mono"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setShowProcessModal(false)}
                                    className="px-5 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 uppercase"
                                >
                                    BATAL
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg uppercase transition flex items-center gap-1.5"
                                >
                                    <CheckCircle2 size={16} /> KONFIRMASI TERBITKAN BTT
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL UPLOAD CSV */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm no-print">
                    <div className="bg-white w-full max-w-md rounded-2xl border border-slate-300 shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <h3 className="font-black text-sm text-slate-900 uppercase">UNGGAH BERKAS CSV PACKING LIST</h3>
                            <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUploadCSV} className="space-y-4 text-xs">
                            <div>
                                <label className="font-black text-slate-800 block mb-1">PILIH CUSTOMER :</label>
                                <select
                                    value={uploadCustId}
                                    onChange={(e) => {
                                        setUploadCustId(e.target.value);
                                        setUploadCustName(e.target.options[e.target.selectedIndex].text);
                                    }}
                                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                                    required
                                >
                                    <option value="">-- Pilih Customer --</option>
                                    {custOptions.map((c, idx) => (
                                        <option key={idx} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-black text-slate-800 block mb-1">BERKAS CSV :</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setCsvFile(e.target.files[0])}
                                    className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold"
                                    required
                                />
                                <span className="text-[10px] text-slate-500 block mt-1">
                                    Urutan format kolom: NoSJ, Penerima, Alamat, KotaTujuan, NamaBarang, Koli, Berat, Nilai
                                </span>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(false)}
                                    className="px-4 py-2 border border-slate-300 font-bold rounded-xl hover:bg-slate-100 uppercase"
                                >
                                    BATAL
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadLoading}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl uppercase transition flex items-center gap-1.5"
                                >
                                    <UploadCloud size={14} /> {uploadLoading ? 'MENGUNGGAH...' : 'UNGGAH'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AREA TEMPLATE PRINT SLIP PACKING LIST */}
            {printDetail && (
                <div className="hidden print:block p-8 text-black bg-white font-sans text-xs">
                    <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                        <div>
                            <h1 className="text-xl font-black uppercase">DAKOTA LOGISTIK INDONESIA</h1>
                            <p className="font-semibold">Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi</p>
                            <p className="font-semibold">Packing List Barang Kiriman Pelanggan</p>
                        </div>
                        <div className="text-right">
                            <div className="border-2 border-black p-2 font-mono text-lg font-black inline-block">
                                {printDetail.header?.pli_id}
                            </div>
                            <p className="text-[10px] mt-1 font-mono">Tgl: {printDetail.header?.pli_tanggal}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border border-black p-3 mb-4">
                        <div>
                            <h4 className="font-black border-b border-black pb-1 mb-1">PENGIRIM:</h4>
                            <p className="font-bold">{printDetail.header?.cust_name}</p>
                            <p>{printDetail.header?.pli_asalalamat || '-'}</p>
                        </div>
                        <div>
                            <h4 className="font-black border-b border-black pb-1 mb-1">PENERIMA:</h4>
                            <p className="font-bold">{printDetail.header?.pli_tujuannama}</p>
                            <p>{printDetail.header?.pli_tujuanalamat || '-'}</p>
                            <p className="font-bold">Kota: {printDetail.header?.pli_tujuankota}</p>
                        </div>
                    </div>

                    <table className="w-full border-collapse border border-black text-center mb-6">
                        <thead>
                            <tr className="bg-slate-200">
                                <th className="border border-black p-1">No</th>
                                <th className="border border-black p-1">Nama Barang</th>
                                <th className="border border-black p-1">Jenis Kemasan</th>
                                <th className="border border-black p-1">Koli</th>
                                <th className="border border-black p-1">Berat (Kg)</th>
                                <th className="border border-black p-1">Volume (m³)</th>
                                <th className="border border-black p-1">Nilai Barang</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printDetail.details?.map((d, idx) => (
                                <tr key={idx}>
                                    <td className="border border-black p-1">{idx + 1}</td>
                                    <td className="border border-black p-1 text-left">{d.pli_namabarang}</td>
                                    <td className="border border-black p-1">{d.namakemasan}</td>
                                    <td className="border border-black p-1 font-mono font-bold">{d.pli_jmlkemasan}</td>
                                    <td className="border border-black p-1 font-mono">{d.pli_beratasli}</td>
                                    <td className="border border-black p-1 font-mono">{d.pli_volume}</td>
                                    <td className="border border-black p-1 font-mono text-right">Rp {Math.round(d.pli_nilaibarang || 0).toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="grid grid-cols-3 text-center pt-8">
                        <div>
                            <p>Petugas Loket,</p>
                            <div className="h-16"></div>
                            <p className="font-bold border-t border-black inline-block px-4">( ................................ )</p>
                        </div>
                        <div></div>
                        <div>
                            <p>Customer Pengirim,</p>
                            <div className="h-16"></div>
                            <p className="font-bold border-t border-black inline-block px-4">( ................................ )</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackingList;