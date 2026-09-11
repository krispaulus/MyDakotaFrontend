import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, RefreshCw, Printer, Search, Store } from 'lucide-react';
import dakotaLogo from '../assets/new_logo 2.png';

const LaporanBTTCounter = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Checkbox Master Filter
    const [chkTanggal, setChkTanggal] = useState(false); // default false agar data dump lama langsung keluar
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);

    const [chkCabang, setChkCabang] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState('');
    const [cabangOptions, setCabangOptions] = useState([]);

    const [chkService, setChkService] = useState(false);
    const [selectedService, setSelectedService] = useState('1'); // 1: Darat, 2: Laut, 3: Udara

    const [chkCustomer, setChkCustomer] = useState(false);
    const [customerText, setCustomerText] = useState('');

    const [chkTujuan, setChkTujuan] = useState(false);
    const [selectedTujuan, setSelectedTujuan] = useState('');
    const [kotaOptions, setKotaOptions] = useState([]);

    const [chkPosting, setChkPosting] = useState(false);
    const [postingVal, setPostingVal] = useState('Y');

    const [chkKirim, setChkKirim] = useState(false);
    const [kirimVal, setKirimVal] = useState('Y');

    const [chkNoBTT, setChkNoBTT] = useState(false);
    const [noBTTText, setNoBTTText] = useState('');

    const [chkNoSMU, setChkNoSMU] = useState(false);
    const [noSMUText, setNoSMUText] = useState('');

    const [chkAgen, setChkAgen] = useState(false);
    const [agenVal, setAgenVal] = useState('Y');

    const [chkBayar, setChkBayar] = useState(false);
    const [bayarVal, setBayarVal] = useState('Y');

    const [chkPembayaran, setChkPembayaran] = useState(false);
    const [pembayaranVal, setPembayaranVal] = useState('1'); // 1: Tunai, 2: Kredit, 3: Tagih

    const [chkNoSJ, setChkNoSJ] = useState(false);
    const [noSJText, setNoSJText] = useState('');

    // State View Data
    const [showFilter, setShowFilter] = useState(true);
    const [loading, setLoading] = useState(false);
    const [dataList, setDataList] = useState([]);

    // Load Dropdown Options
    useEffect(() => {
        const loadCombos = async () => {
            try {
                const token = localStorage.getItem('token');
                const [resCabang, resKota] = await Promise.all([
                    api.get('/laporan/btt-counter/combo-cabang', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/laporan/btt-counter/combo-kota', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                const cList = resCabang.data?.data || [];
                const kList = resKota.data?.data || [];
                setCabangOptions(cList);
                setKotaOptions(kList);
                if (cList.length > 0) setSelectedCabang(cList[0]);
                if (kList.length > 0) setSelectedTujuan(kList[0]);
            } catch (err) {
                console.error("Gagal load combo filter counter:", err);
            }
        };
        loadCombos();
    }, []);

    // Fetch Data Laporan
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                chktanggal: chkTanggal ? 'true' : 'false',
                start_date: startDate,
                end_date: endDate,
                chkcabang: chkCabang ? 'true' : 'false',
                cabang: chkCabang ? selectedCabang : '',
                chkservice: chkService ? 'true' : 'false',
                service: chkService ? selectedService : '',
                chkcustomer: chkCustomer ? 'true' : 'false',
                customer: chkCustomer ? customerText : '',
                chktujuan: chkTujuan ? 'true' : 'false',
                tujuan: chkTujuan ? selectedTujuan : '',
                chkposting: chkPosting ? 'true' : 'false',
                posting: chkPosting ? postingVal : '',
                chkkirim: chkKirim ? 'true' : 'false',
                kirim: chkKirim ? kirimVal : '',
                chknobtt: chkNoBTT ? 'true' : 'false',
                nobtt: chkNoBTT ? noBTTText : '',
                chknosmu: chkNoSMU ? 'true' : 'false',
                nosmu: chkNoSMU ? noSMUText : '',
                chkagen: chkAgen ? 'true' : 'false',
                agen: chkAgen ? agenVal : '',
                chkbayar: chkBayar ? 'true' : 'false',
                bayar: chkBayar ? bayarVal : '',
                chkpembayaran: chkPembayaran ? 'true' : 'false',
                pembayaran: chkPembayaran ? pembayaranVal : '',
                chknosj: chkNoSJ ? 'true' : 'false',
                nosj: chkNoSJ ? noSJText : ''
            });

            const res = await api.get(`/laporan/btt-counter/data?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDataList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load laporan BTT counter:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // KPI Summary
    const totalUnit = useMemo(() => dataList.reduce((acc, i) => acc + (i.bttt_jmlunit > 0 ? i.bttt_jmlunit : 1), 0), [dataList]);
    const totalBerat = useMemo(() => dataList.reduce((acc, i) => acc + (i.bttt_berat || 0), 0), [dataList]);
    const totalUkuran = useMemo(() => dataList.reduce((acc, i) => acc + (i.bttt_ukuran || 0), 0), [dataList]);
    const totalCOD = useMemo(() => dataList.reduce((acc, i) => acc + (i.bttt_tagihtujuan || 0), 0), [dataList]);

    const columns = [
        {
            header: 'NO. BTT',
            accessor: 'bttt_id',
            render: (item) => (
                <span className="font-mono font-black text-blue-700 block text-[13.5px] tracking-tight whitespace-nowrap">
                    {item.bttt_id}
                </span>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'bttt_tanggal',
            render: (item) => (
                <span className="font-mono font-black text-black block text-[13px] whitespace-nowrap">
                    {item.bttt_tanggal || '-'}
                </span>
            )
        },
        {
            header: 'SERVICE',
            accessor: 'servisjd',
            render: (item) => (
                <span className="inline-block px-2.5 py-1 font-black text-xs rounded bg-slate-200 border border-slate-400 text-black whitespace-nowrap">
                    {item.servisjd || 'Darat'}
                </span>
            )
        },
        {
            header: 'CABANG / AGEN',
            accessor: 'agen_nama',
            render: (item) => (
                <div className="text-[13px] leading-tight min-w-[120px]">
                    <span className="font-black text-black block">{item.agen_nama || '-'}</span>
                    {item.cabang_induk && item.cabang_induk !== item.agen_nama && (
                        <span className="text-[11px] text-slate-700 font-bold block">Induk: {item.cabang_induk}</span>
                    )}
                </div>
            )
        },
        {
            header: 'PENGIRIM',
            accessor: 'bttt_asalname',
            render: (item) => {
                const namaAsal = (item.bttt_asalname || '').trim();
                const namaCust = (item.cust_name || '').trim();
                const isDuplikat = namaAsal.toUpperCase() === namaCust.toUpperCase();

                return (
                    <div className="text-[13px] leading-snug min-w-[180px]">
                        <span className="font-black text-black block">
                            {namaAsal && namaAsal !== '-' ? namaAsal : (namaCust || '-')}
                        </span>
                        {!isDuplikat && namaCust && namaAsal && namaAsal !== '-' && (
                            <span className="block text-[11px] text-blue-700 font-extrabold">({namaCust})</span>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'PENERIMA',
            accessor: 'bttt_tujuannama',
            render: (item) => (
                <span className="text-[13px] font-black text-black block min-w-[140px]">
                    {item.bttt_tujuannama || '-'}
                </span>
            )
        },
        {
            header: 'BAYAR',
            accessor: 'jnbayar',
            render: (item) => (
                <span className={`inline-block px-2.5 py-0.5 rounded font-black text-xs whitespace-nowrap ${item.jnbayar === 'Tunai'
                    ? 'bg-emerald-200 text-emerald-950 border border-emerald-400'
                    : item.jnbayar === 'Kredit'
                        ? 'bg-amber-200 text-amber-950 border border-amber-400'
                        : 'bg-rose-200 text-rose-950 border border-rose-400'
                    }`}>
                    {item.jnbayar || 'Tunai'}
                </span>
            )
        },
        {
            header: 'NAMA BARANG',
            accessor: 'bttt_namabarang',
            render: (item) => (
                <span className="text-[13px] font-bold text-black block min-w-[120px]">
                    {item.bttt_namabarang || '-'}
                </span>
            )
        },
        {
            header: 'SURAT JALAN',
            accessor: 'bttt_nosuratjalan',
            render: (item) => (
                <span className="font-mono text-[13px] font-bold text-black block whitespace-nowrap">
                    {item.bttt_nosuratjalan || '-'}
                </span>
            )
        },
        {
            header: 'COLLY',
            accessor: 'bttt_jmlunit',
            render: (item) => (
                <span className="font-mono text-[13.5px] font-black text-right block text-black">
                    {item.bttt_jmlunit > 0 ? item.bttt_jmlunit : 1}
                </span>
            )
        },
        {
            header: 'BERAT (KG)',
            accessor: 'bttt_berat',
            render: (item) => (
                <span className="font-mono text-[13.5px] font-black text-right block text-black">
                    {Number(item.bttt_berat || 0).toFixed(1)}
                </span>
            )
        },
        {
            header: 'VOLUME',
            accessor: 'bttt_ukuran',
            render: (item) => (
                <span className="font-mono text-[13.5px] font-black text-right block text-black">
                    {Number(item.bttt_ukuran || 0).toFixed(1)}
                </span>
            )
        },
        {
            header: 'COD / TAGIH (RP)',
            accessor: 'bttt_tagihtujuan',
            render: (item) => (
                <span className="font-mono text-[13.5px] font-black text-right block text-rose-700 whitespace-nowrap">
                    {item.bttt_tagihtujuan > 0 ? `Rp ${Math.round(item.bttt_tagihtujuan).toLocaleString('id-ID')}` : '-'}
                </span>
            )
        },
        {
            header: 'AKTIF',
            accessor: 'aktifjd',
            render: (item) => (
                <span className={`inline-block px-2 py-0.5 rounded font-black text-xs whitespace-nowrap ${item.aktifjd === 'Ya' ? 'text-emerald-950 bg-emerald-200 border border-emerald-300' : 'text-slate-500 bg-slate-200'}`}>
                    {item.aktifjd || 'Ya'}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-5">
            <style>
                {`
                /* MEMPERBESAR TEKS 10% DAN MENEBALKAN ISI TABEL */
                .custom-btt-counter-table table th {
                    color: #000000 !important;
                    font-size: 13px !important;
                    font-weight: 900 !important;
                    background-color: #f8fafc !important;
                    padding-top: 12px !important;
                    padding-bottom: 12px !important;
                }
                .custom-btt-counter-table table tbody td {
                    color: #000000 !important;
                    font-size: 13.5px !important; /* Diperbesar 10% */
                    font-weight: 800 !important; /* Super tebal & jelas */
                    padding-top: 10px !important;
                    padding-bottom: 10px !important;
                }
                .custom-btt-counter-table table tbody td * {
                    color: #000000 !important;
                    font-weight: 800 !important;
                }
                .custom-btt-counter-table table tbody td span.text-blue-700 {
                    color: #1d4ed8 !important;
                }
                .custom-btt-counter-table table tbody td span.text-rose-700 {
                    color: #be123c !important;
                }
                .custom-btt-counter-table table tbody tr:hover td {
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

            {/* PANEL FILTER MULTI-KRITERIA */}
            {showFilter && (
                <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-4 text-xs transition-all no-print">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-900 tracking-wider text-sm">
                        <Store size={18} className="text-blue-600" />
                        PENYARINGAN DATA HASIL PENJUALAN BTT COUNTER / AGEN
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* BARIS 1 */}
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-1">
                                <input type="checkbox" checked={chkTanggal} onChange={(e) => setChkTanggal(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                <span>TANGGAL BTT :</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <input type="date" disabled={!chkTanggal} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`w-full p-2 border rounded-lg font-bold text-xs outline-none ${!chkTanggal ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'}`} />
                                <span className="font-bold text-slate-400">s/d</span>
                                <input type="date" disabled={!chkTanggal} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`w-full p-2 border rounded-lg font-bold text-xs outline-none ${!chkTanggal ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'}`} />
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-1">
                                <input type="checkbox" checked={chkCabang} onChange={(e) => setChkCabang(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                <span>CABANG / AGEN :</span>
                            </label>
                            <select disabled={!chkCabang} value={selectedCabang} onChange={(e) => setSelectedCabang(e.target.value)} className={`w-full p-2 border rounded-lg font-bold text-xs outline-none ${!chkCabang ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 cursor-pointer'}`}>
                                {cabangOptions.map((cb, idx) => (<option key={idx} value={cb}>{cb}</option>))}
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-1">
                                <input type="checkbox" checked={chkService} onChange={(e) => setChkService(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                <span>SERVICE :</span>
                            </label>
                            <select disabled={!chkService} value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className={`w-full p-2 border rounded-lg font-bold text-xs outline-none ${!chkService ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 cursor-pointer'}`}>
                                <option value="1">Darat</option>
                                <option value="2">Laut</option>
                                <option value="3">Udara</option>
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-1">
                                <input type="checkbox" checked={chkTujuan} onChange={(e) => setChkTujuan(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                <span>KOTA TUJUAN :</span>
                            </label>
                            <select disabled={!chkTujuan} value={selectedTujuan} onChange={(e) => setSelectedTujuan(e.target.value)} className={`w-full p-2 border rounded-lg font-bold text-xs outline-none ${!chkTujuan ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 cursor-pointer'}`}>
                                {kotaOptions.map((kt, idx) => (<option key={idx} value={kt}>{kt}</option>))}
                            </select>
                        </div>

                        {/* BARIS 2 */}
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-1">
                                <input type="checkbox" checked={chkCustomer} onChange={(e) => setChkCustomer(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                <span>NAMA CUSTOMER :</span>
                            </label>
                            <input type="text" disabled={!chkCustomer} placeholder="Ketik nama customer..." value={customerText} onChange={(e) => setCustomerText(e.target.value)} className={`w-full p-2 border rounded-lg font-bold text-xs outline-none ${!chkCustomer ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'}`} />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-1">
                                <input type="checkbox" checked={chkNoBTT} onChange={(e) => setChkNoBTT(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                <span>NOMOR BTT :</span>
                            </label>
                            <input type="text" disabled={!chkNoBTT} placeholder="Nomor resi BTT..." value={noBTTText} onChange={(e) => setNoBTTText(e.target.value)} className={`w-full p-2 border rounded-lg font-mono font-bold text-xs outline-none ${!chkNoBTT ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'}`} />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-1">
                                <input type="checkbox" checked={chkPembayaran} onChange={(e) => setChkPembayaran(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                <span>JENIS PEMBAYARAN :</span>
                            </label>
                            <select disabled={!chkPembayaran} value={pembayaranVal} onChange={(e) => setPembayaranVal(e.target.value)} className={`w-full p-2 border rounded-lg font-bold text-xs outline-none ${!chkPembayaran ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 cursor-pointer'}`}>
                                <option value="1">Tunai</option>
                                <option value="2">Kredit</option>
                                <option value="3">Tagih</option>
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 mb-1">
                                <input type="checkbox" checked={chkNoSJ} onChange={(e) => setChkNoSJ(e.target.checked)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                <span>NO. SURAT JALAN :</span>
                            </label>
                            <input type="text" disabled={!chkNoSJ} placeholder="No Surat Jalan..." value={noSJText} onChange={(e) => setNoSJText(e.target.value)} className={`w-full p-2 border rounded-lg font-bold text-xs outline-none ${!chkNoSJ ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'}`} />
                        </div>

                        {/* BARIS 3: FLAG STATUS */}
                        <div className="md:col-span-4 flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={chkPosting} onChange={(e) => setChkPosting(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                <span className="font-bold text-slate-800">POSTING:</span>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" disabled={!chkPosting} name="posting" value="Y" checked={postingVal === 'Y'} onChange={() => setPostingVal('Y')} /> Ya</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" disabled={!chkPosting} name="posting" value="N" checked={postingVal === 'N'} onChange={() => setPostingVal('N')} /> Tidak</label>
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={chkKirim} onChange={(e) => setChkKirim(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                <span className="font-bold text-slate-800">KIRIM:</span>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" disabled={!chkKirim} name="kirim" value="Y" checked={kirimVal === 'Y'} onChange={() => setKirimVal('Y')} /> Ya</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" disabled={!chkKirim} name="kirim" value="N" checked={kirimVal === 'N'} onChange={() => setKirimVal('N')} /> Tidak</label>
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={chkBayar} onChange={(e) => setChkBayar(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                <span className="font-bold text-slate-800">BAYAR:</span>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" disabled={!chkBayar} name="bayar" value="Y" checked={bayarVal === 'Y'} onChange={() => setBayarVal('Y')} /> Ya</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" disabled={!chkBayar} name="bayar" value="N" checked={bayarVal === 'N'} onChange={() => setBayarVal('N')} /> Tidak</label>
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={chkAgen} onChange={(e) => setChkAgen(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                <span className="font-bold text-slate-800">AGEN:</span>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" disabled={!chkAgen} name="agen" value="Y" checked={agenVal === 'Y'} onChange={() => setAgenVal('Y')} /> Ya</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" disabled={!chkAgen} name="agen" value="N" checked={agenVal === 'N'} onChange={() => setAgenVal('N')} /> Tidak</label>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                        <span className="font-bold text-slate-700">Total Record Ditemukan: {dataList.length} Resi</span>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => window.print()} className="px-5 py-2 border border-slate-400 text-slate-900 hover:bg-slate-100 font-black rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer text-xs">
                                <Printer size={15} /> Cetak Laporan
                            </button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs">
                                <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> REFRESH DATA
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* RINGKASAN REKAPITULASI (KPI CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL COLLY</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{totalUnit.toLocaleString('id-ID')} Koli</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL BERAT</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{totalBerat.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL VOLUME</span>
                    <span className="text-2xl font-black font-mono text-slate-900">{totalUkuran.toLocaleString('id-ID', { maximumFractionDigits: 1 })} M³</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-1">TOTAL COD / TAGIH TUJUAN</span>
                    <span className="text-2xl font-black font-mono text-rose-700">Rp {Math.round(totalCOD).toLocaleString('id-ID')}</span>
                </div>
            </div>

            {/* TABEL DATA UTAMA */}
            <div className="no-print custom-btt-counter-table">
                <DataTableTemplate
                    title="LAPORAN HASIL PENJUALAN BTT COUNTER / AGEN"
                    columns={columns}
                    data={dataList}
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
                        <h3 className="text-sm font-black uppercase text-black">LAPORAN BTT COUNTER / AGEN</h3>
                        <p className="text-xs font-bold text-black">PERIODE: {startDate} s/d {endDate}</p>
                    </div>
                </div>

                <table className="w-full text-left border-collapse border border-black text-xs">
                    <thead>
                        <tr className="bg-slate-200 border-b border-black font-black uppercase">
                            <th className="p-1 border-r border-black">NO. BTT</th>
                            <th className="p-1 border-r border-black">TANGGAL</th>
                            <th className="p-1 border-r border-black">SERVIS</th>
                            <th className="p-1 border-r border-black">CABANG</th>
                            <th className="p-1 border-r border-black">PENGIRIM</th>
                            <th className="p-1 border-r border-black">PENERIMA</th>
                            <th className="p-1 border-r border-black">BAYAR</th>
                            <th className="p-1 text-center border-r border-black">COLLY</th>
                            <th className="p-1 text-right border-r border-black">BERAT</th>
                            <th className="p-1 text-right border-r border-black">VOLUME</th>
                            <th className="p-1 text-right">TAGIH (COD)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black font-semibold">
                        {dataList.map((row, idx) => (
                            <tr key={idx}>
                                <td className="p-1 border-r border-black font-mono">{row.bttt_id}</td>
                                <td className="p-1 border-r border-black">{row.bttt_tanggal}</td>
                                <td className="p-1 border-r border-black">{row.servisjd}</td>
                                <td className="p-1 border-r border-black">{row.agen_nama}</td>
                                <td className="p-1 border-r border-black">{row.bttt_asalname}</td>
                                <td className="p-1 border-r border-black">{row.bttt_tujuannama}</td>
                                <td className="p-1 border-r border-black">{row.jnbayar}</td>
                                <td className="p-1 border-r border-black text-center font-mono">{row.bttt_jmlunit}</td>
                                <td className="p-1 border-r border-black text-right font-mono">{row.bttt_berat.toFixed(1)}</td>
                                <td className="p-1 border-r border-black text-right font-mono">{row.bttt_ukuran.toFixed(1)}</td>
                                <td className="p-1 text-right font-mono font-bold text-rose-700">
                                    {row.bttt_tagihtujuan > 0 ? `Rp ${Math.round(row.bttt_tagihtujuan).toLocaleString('id-ID')}` : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LaporanBTTCounter;