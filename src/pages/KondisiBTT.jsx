import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, CheckCircle2, XCircle, Search, RefreshCw, Printer, Truck, FileCheck, DollarSign } from 'lucide-react';
import Swal from 'sweetalert2';

const KondisiBTT = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [bypassTanggal, setBypassTanggal] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState('');
    const [bttKembali, setBttKembali] = useState('');
    const [selectedPIC, setSelectedPIC] = useState('');
    const [searchCustomer, setSearchCustomer] = useState('');
    const [sudahInvoice, setSudahInvoice] = useState('');
    const [statusBayar, setStatusBayar] = useState('');
    const [metodeBayar, setMetodeBayar] = useState('');
    const [tglPelunasan, setTglPelunasan] = useState('');
    const [showBTT, setShowBTT] = useState(true);
    const [showOrderJemput, setShowOrderJemput] = useState(true);

    const [cabangList, setCabangList] = useState([]);
    const [picList, setPicList] = useState([]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const [resCabang, resPIC] = await Promise.all([
                api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/piutang/kondisi-btt/options', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setCabangList(resCabang.data?.data || []);
            setPicList(resPIC.data?.pic_list || []);
        } catch (err) {
            console.error("Gagal load opsi filter:", err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            let url = `/piutang/kondisi-btt?pt_id=${ptId}&bypass_tanggal=${bypassTanggal}&show_btt=${showBTT}&show_oj=${showOrderJemput}`;

            if (!bypassTanggal) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            if (selectedCabang) url += `&cabang_asal=${encodeURIComponent(selectedCabang)}`;
            if (bttKembali) url += `&btt_kembali=${encodeURIComponent(bttKembali)}`;
            if (selectedPIC) url += `&pic=${encodeURIComponent(selectedPIC)}`;
            if (searchCustomer) url += `&customer=${encodeURIComponent(searchCustomer)}`;
            if (sudahInvoice) url += `&sudah_invoice=${encodeURIComponent(sudahInvoice)}`;
            if (statusBayar) url += `&bayar=${encodeURIComponent(statusBayar)}`;
            if (metodeBayar) url += `&pembayaran=${encodeURIComponent(metodeBayar)}`;
            if (tglPelunasan) url += `&tgl_pelunasan=${encodeURIComponent(tglPelunasan)}`;

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load data kondisi BTT:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchData();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchData();
    };

    const handleResetFilter = () => {
        setStartDate(firstDay);
        setEndDate(today);
        setBypassTanggal(false);
        setSelectedCabang('');
        setBttKembali('');
        setSelectedPIC('');
        setSearchCustomer('');
        setSudahInvoice('');
        setStatusBayar('');
        setMetodeBayar('');
        setTglPelunasan('');
        setShowBTT(true);
        setShowOrderJemput(true);
        fetchData();
    };

    const columns = [
        {
            header: 'NO. DOKUMEN',
            accessor: 'no_dokumen',
            render: (item) => (
                <div>
                    <span className="font-mono font-bold text-sky-600 block">{item.no_dokumen}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.tipe_dokumen}</span>
                </div>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'tgl_dokumen',
            render: (item) => <span className="font-mono text-slate-600">{String(item.tgl_dokumen || '').split('T')[0]}</span>
        },
        {
            header: 'PELANGGAN / PENGIRIM',
            accessor: 'cust_name',
            render: (item) => (
                <div>
                    <span className="font-bold text-slate-800 block">{item.cust_name}</span>
                    <span className="text-[11px] text-slate-500">Tujuan: {item.penerima} ({item.kota_tujuan})</span>
                </div>
            )
        },
        {
            header: 'PIC MARKETING',
            accessor: 'pic',
            render: (item) => <span className="font-bold text-slate-700 uppercase">{item.pic || '-'}</span>
        },
        {
            header: 'KOLI / BERAT',
            accessor: 'koli',
            render: (item) => <span className="font-mono text-slate-700">{item.koli} Koli / {item.berat} Kg</span>
        },
        {
            header: 'TOTAL BIAYA',
            accessor: 'total_biaya',
            render: (item) => <span className="font-mono font-black text-rose-600">Rp {Number(item.total_biaya || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'METODE',
            accessor: 'metode_bayar',
            render: (item) => <span className="font-bold text-sky-800 uppercase text-[10px] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">{item.metode_bayar}</span>
        },
        {
            header: 'BTT KEMBALI',
            accessor: 'btt_kembali_yn',
            render: (item) => item.btt_kembali_yn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> KEMBALI
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">
                    <XCircle size={12} /> BELUM
                </span>
            )
        },
        {
            header: 'STATUS INVOICE',
            accessor: 'sudah_invoice_yn',
            render: (item) => item.sudah_invoice_yn === 'Y' ? (
                <div>
                    <span className="font-bold text-emerald-600 block text-[10px]">FAKTUR</span>
                    <span className="font-mono text-[9px] text-slate-500">{item.no_invoice}</span>
                </div>
            ) : (
                <span className="font-bold text-slate-400 text-[10px]">UNBILLED</span>
            )
        },
        {
            header: 'LUNAS',
            accessor: 'terbayar_yn',
            render: (item) => item.terbayar_yn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> LUNAS
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">
                    <XCircle size={12} /> BELUM
                </span>
            )
        }
    ];

    return (
        <div className="space-y-5">
            {/* Filter Panel */}
            <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                    <Filter size={16} className="text-sky-600" />
                    FILTER KONDISI BTT & ORDER JEMPUT
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="font-bold text-slate-500 block mb-1">TGL AWAL</label>
                            <input
                                type="date"
                                disabled={bypassTanggal}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="font-bold text-slate-500 block mb-1">TGL AKHIR</label>
                            <input
                                type="date"
                                disabled={bypassTanggal}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">CABANG ASAL</label>
                        <select
                            value={selectedCabang}
                            onChange={(e) => setSelectedCabang(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA CABANG ASAL --</option>
                            {cabangList.map((c, i) => (
                                <option key={i} value={c.agen_id || c.AgenID}>{c.agen_nama || c.AgenNama}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">BTT TELAH KEMBALI</label>
                        <select
                            value={bttKembali}
                            onChange={(e) => setBttKembali(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA STATUS FISIK --</option>
                            <option value="Y">Sudah Kembali (POD)</option>
                            <option value="N">Belum Kembali</option>
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">PIC MARKETING</label>
                        <select
                            value={selectedPIC}
                            onChange={(e) => setSelectedPIC(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA PIC --</option>
                            {picList.map((pic, i) => (
                                <option key={i} value={pic}>{pic}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">CUSTOMER</label>
                        <input
                            type="text"
                            placeholder="Cari customer / pengirim..."
                            value={searchCustomer}
                            onChange={(e) => setSearchCustomer(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        />
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">STATUS FAKTUR INVOICE</label>
                        <select
                            value={sudahInvoice}
                            onChange={(e) => setSudahInvoice(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA STATUS FAKTUR --</option>
                            <option value="Y">Sudah Dibuatkan Invoice</option>
                            <option value="N">Belum Difakturkan (Unbilled)</option>
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">STATUS BAYAR</label>
                        <select
                            value={statusBayar}
                            onChange={(e) => setStatusBayar(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA STATUS LUNAS --</option>
                            <option value="Y">Sudah Lunas</option>
                            <option value="N">Belum Lunas</option>
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">METODE PEMBAYARAN</label>
                        <select
                            value={metodeBayar}
                            onChange={(e) => setMetodeBayar(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA METODE --</option>
                            <option value="TUNAI">TUNAI</option>
                            <option value="KREDIT">KREDIT</option>
                            <option value="TAGIH TURUN">TAGIH TURUN (COD)</option>
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">TGL PELUNASAN</label>
                        <input
                            type="date"
                            value={tglPelunasan}
                            onChange={(e) => setTglPelunasan(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        />
                    </div>

                    <div className="flex items-center gap-4 mt-5">
                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                            <input
                                type="checkbox"
                                checked={showBTT}
                                onChange={(e) => setShowBTT(e.target.checked)}
                                className="w-4 h-4 text-sky-600 rounded"
                            />
                            BTT
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                            <input
                                type="checkbox"
                                checked={showOrderJemput}
                                onChange={(e) => setShowOrderJemput(e.target.checked)}
                                className="w-4 h-4 text-sky-600 rounded"
                            />
                            Order Jemput
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                            <input
                                type="checkbox"
                                checked={bypassTanggal}
                                onChange={(e) => setBypassTanggal(e.target.checked)}
                                className="w-4 h-4 text-sky-600 rounded"
                            />
                            Bypass Tgl
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

            {/* Tabel List Monitoring */}
            <DataTableTemplate
                title="KONDISI BTT DAN ORDER JEMPUT"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                isAddDisabled={true}
                hideAddButton={true}
                hideActions={true}
                hideActionColumn={true}
                onEdit={(item) => {
                    Swal.fire({
                        title: `Detail Resi ${item.no_dokumen}`,
                        html: `
                            <div style="text-align: left; font-size: 12px; line-height: 1.8;">
                                <p><strong>Pelanggan:</strong> ${item.cust_name} (${item.cust_id || '-'})</p>
                                <p><strong>Penerima:</strong> ${item.penerima} - ${item.kota_tujuan}</p>
                                <p><strong>Muatan:</strong> ${item.koli} Koli / ${item.berat} Kg</p>
                                <p><strong>Total Biaya:</strong> Rp ${Number(item.total_biaya || 0).toLocaleString('id-ID')}</p>
                                <p><strong>Metode Bayar:</strong> ${item.metode_bayar}</p>
                                <p><strong>Status Invoice:</strong> ${item.no_invoice !== '-' ? item.no_invoice : 'Belum dibuatkan faktur'}</p>
                                <p><strong>Status Lunas:</strong> ${item.terbayar_yn === 'Y' ? 'Sudah Lunas' : 'Belum Lunas'}</p>
                            </div>
                        `,
                        icon: 'info',
                        confirmButtonText: 'Tutup'
                    });
                }}
                onDelete={null}
            />
        </div>
    );
};

export default KondisiBTT;