import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Barcode,
    Search,
    CheckCircle2,
    History,
    RotateCcw,
    AlertTriangle,
    FileText,
    Building,
    User,
    MapPin,
    Package,
    Save
} from 'lucide-react';
import Swal from 'sweetalert2';

const RevisiBTTAPL = () => {
    const { isDarkMode } = useDarkMode();
    const inputRef = useRef(null);

    // Search & BTT Detail State
    const [noBTT, setNoBTT] = useState('');
    const [bttDetail, setBttDetail] = useState(null);
    const [loadingSearch, setLoadingSearch] = useState(false);

    // Form Edit State
    const [formData, setFormData] = useState({
        harga_baru: 0,
        penerus_baru: 0,
        alasan: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // History Table State
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get('/piutang/revisi-btt/history', {
                params: { pt_id: ptId },
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistoryData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load riwayat revisi:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSearchBTT = async (e) => {
        if (e) e.preventDefault();
        const trimmed = noBTT.trim();
        if (!trimmed) {
            Swal.fire('Peringatan', 'Masukkan nomor BTT atau scan barcode!', 'warning');
            return;
        }

        setLoadingSearch(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get('/piutang/revisi-btt/search', {
                params: { pt_id: ptId, nobtt: trimmed },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data;
            setBttDetail(data);
            setFormData({
                harga_baru: data.harga_pokok || 0,
                penerus_baru: data.biaya_penerus || 0,
                alasan: ''
            });

            if (data.is_invoiced) {
                Swal.fire({
                    title: 'Perhatian!',
                    html: `Nomor BTT <b>${trimmed}</b> sudah masuk dalam Invoice <b>${data.invoice_no}</b>.<br/>Koreksi harga tetap dapat dilakukan namun disarankan memeriksa ulang tagihan invoice terkait.`,
                    icon: 'info'
                });
            }
        } catch (err) {
            console.error("Gagal cari BTT:", err);
            setBttDetail(null);
            Swal.fire('Tidak Ditemukan', `Nomor BTT ${trimmed} tidak ditemukan di database`, 'error');
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleReset = () => {
        setNoBTT('');
        setBttDetail(null);
        setFormData({ harga_baru: 0, penerus_baru: 0, alasan: '' });
        if (inputRef.current) inputRef.current.focus();
    };

    const handleSubmitRevisi = async () => {
        if (!bttDetail) return;
        if (!formData.alasan.trim()) {
            Swal.fire('Peringatan', 'Silakan isi alasan revisi harga!', 'warning');
            return;
        }

        const confirm = await Swal.fire({
            title: 'Simpan Revisi Harga BTT?',
            html: `Apakah Anda yakin ingin memperbarui tarif resi <b>${bttDetail.btt_id}</b>?<br/>Harga Baru: <b>Rp ${Number(formData.harga_baru).toLocaleString('id-ID')}</b>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            confirmButtonText: 'Ya, Simpan Revisi!'
        });

        if (confirm.isConfirmed) {
            setIsSaving(true);
            try {
                const token = localStorage.getItem('token');
                const ptId = localStorage.getItem('pt_id') || 'C';

                await api.post('/piutang/revisi-btt/submit', {
                    pt_id: ptId,
                    btt_id: bttDetail.btt_id,
                    cust_id: bttDetail.cust_id,
                    harga_lama: bttDetail.harga_pokok,
                    harga_baru: Number(formData.harga_baru),
                    penerus_lama: bttDetail.biaya_penerus,
                    penerus_baru: Number(formData.penerus_baru),
                    packing_lama: bttDetail.biaya_packing,
                    packing_baru: bttDetail.biaya_packing,
                    asuransi_lama: bttDetail.biaya_asuransi,
                    asuransi_baru: bttDetail.biaya_asuransi,
                    alasan: formData.alasan
                }, { headers: { Authorization: `Bearer ${token}` } });

                Swal.fire('Sukses', 'Tarif Resi BTT berhasil diperbarui', 'success');
                handleReset();
                fetchHistory();
            } catch (err) {
                console.error("Gagal simpan revisi:", err);
                Swal.fire('Error', 'Gagal menyimpan revisi tarif BTT', 'error');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const historyColumns = [
        {
            header: 'NO. BTT',
            accessor: 'btt_id',
            render: (item) => <span className="font-mono font-black text-blue-600 dark:text-blue-400">{item.btt_id}</span>
        },
        {
            header: 'TANGGAL REVISI',
            accessor: 'tanggal_str',
            render: (item) => <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-mono font-bold">{item.tanggal_str}</span>
        },
        {
            header: 'CUSTOMER',
            accessor: 'cust_name',
            render: (item) => (
                <div style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold">
                    {item.cust_name}
                    <span className="text-[10px] text-slate-500 font-mono block">{item.cust_id}</span>
                </div>
            )
        },
        {
            header: 'ONGKIR LAMA',
            accessor: 'harga_lama',
            render: (item) => <span className="font-mono text-slate-500 line-through">Rp {Number(item.harga_lama || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'ONGKIR BARU',
            accessor: 'harga_baru',
            render: (item) => <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">Rp {Number(item.harga_baru || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'PENERUS BARU',
            accessor: 'penerus_baru',
            render: (item) => <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-mono font-bold">Rp {Number(item.penerus_baru || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'ALASAN REVISI',
            accessor: 'alasan',
            render: (item) => <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold">{item.alasan}</span>
        },
        {
            header: 'USER',
            accessor: 'user_update',
            render: (item) => <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-gray-200">{item.user_update}</span>
        }
    ];

    const hitungTotalBaru = () => {
        if (!bttDetail) return 0;
        return Number(formData.harga_baru || 0) + Number(formData.penerus_baru || 0) + Number(bttDetail.biaya_packing || 0) + Number(bttDetail.biaya_asuransi || 0);
    };

    return (
        <div className="space-y-4">

            {/* PANEL SCAN / SEARCH NO. BTT */}
            <div className={`p-6 rounded-2xl border shadow-sm transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}>
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-gray-700 mb-4">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                        <Barcode size={20} className="stroke-[2.5]" />
                    </div>
                    <div>
                        <h2 className="text-base font-black uppercase tracking-tight">
                            Revisi Tarif / Harga BTT Pelanggan Kontrak (APL)
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-gray-400 font-semibold">
                            Koreksi harga ongkos kirim dan biaya penerus resi sebelum penagihan invoice.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSearchBTT} className="flex flex-col md:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Ketikkan Nomor Resi BTT atau Scan Barcode Scanner..."
                            value={noBTT}
                            onChange={(e) => setNoBTT(e.target.value.toUpperCase())}
                            className={`w-full p-3 pl-11 border-2 rounded-xl font-mono font-bold text-sm tracking-wide outline-none transition uppercase ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                                }`}
                        />
                        <Barcode className="absolute left-3.5 top-3.5 text-slate-400" size={20} />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            type="submit"
                            disabled={loadingSearch}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50 flex-1 md:flex-initial"
                        >
                            <Search size={16} /> {loadingSearch ? 'MENCARI...' : 'CARI RESI BTT'}
                        </button>
                        {bttDetail && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-4 py-3 border border-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer"
                            >
                                <RotateCcw size={15} /> Reset
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* FORM REVISI RESI TERPILIH */}
            {bttDetail && (
                <div className={`p-6 rounded-2xl border-2 border-blue-500 shadow-md transition-all ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-900'
                    }`}>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-gray-700 mb-4">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-mono font-black border border-blue-200">
                                {bttDetail.btt_id}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-500">
                                Tanggal: {bttDetail.tanggal}
                            </span>
                        </div>
                        {bttDetail.is_invoiced && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 flex items-center gap-1">
                                <AlertTriangle size={14} /> Terdaftar di Invoice: {bttDetail.invoiceNo}
                            </span>
                        )}
                    </div>

                    {/* Informasi Pengiriman */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-xs font-bold mb-5">
                        <div>
                            <span className="text-slate-500 text-[11px] block">CUSTOMER PENGIRIM :</span>
                            <span className="text-slate-900 dark:text-white font-black">{bttDetail.cust_name}</span>
                            <span className="text-slate-500 font-mono text-[10px] block">{bttDetail.cust_id}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 text-[11px] block">AGEN ASAL :</span>
                            <span className="text-slate-900 dark:text-white">{bttDetail.agen_asal}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 text-[11px] block">PENERIMA / TUJUAN :</span>
                            <span className="text-slate-900 dark:text-white">{bttDetail.penerima}</span>
                            <span className="text-slate-500 text-[10px] block">{bttDetail.tujuan}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 text-[11px] block">BERAT ASLI / VOLUME :</span>
                            <span className="font-mono text-blue-600 dark:text-blue-400 font-black">
                                {bttDetail.berat_asli} KG / {bttDetail.berat_volume} M³
                            </span>
                        </div>
                    </div>

                    {/* Input Revisi Harga */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-bold">
                        <div>
                            <label className="block mb-1 text-slate-700 dark:text-gray-300">
                                ONGKOS KIRIM / HARGA POKOK (RP) :
                            </label>
                            <input
                                type="number"
                                value={formData.harga_baru}
                                onChange={(e) => setFormData(p => ({ ...p, harga_baru: e.target.value }))}
                                className={`w-full p-2.5 border-2 rounded-xl font-mono font-black text-sm outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                                    }`}
                            />
                            <span className="text-[10px] text-slate-500 mt-1 block">
                                Nominal Lama: Rp {Number(bttDetail.harga_pokok).toLocaleString('id-ID')}
                            </span>
                        </div>

                        <div>
                            <label className="block mb-1 text-slate-700 dark:text-gray-300">
                                BIAYA PENERUS / TRANSIT (RP) :
                            </label>
                            <input
                                type="number"
                                value={formData.penerus_baru}
                                onChange={(e) => setFormData(p => ({ ...p, penerus_baru: e.target.value }))}
                                className={`w-full p-2.5 border-2 rounded-xl font-mono font-black text-sm outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                                    }`}
                            />
                            <span className="text-[10px] text-slate-500 mt-1 block">
                                Nominal Lama: Rp {Number(bttDetail.biaya_penerus).toLocaleString('id-ID')}
                            </span>
                        </div>

                        <div>
                            <label className="block mb-1 text-slate-700 dark:text-gray-300">
                                TOTAL SETELAH REVISI :
                            </label>
                            <div className="p-2.5 rounded-xl font-mono font-black text-base bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-300">
                                Rp {hitungTotalBaru().toLocaleString('id-ID')}
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1 block">
                                (Termasuk Packing: Rp {Number(bttDetail.biaya_packing).toLocaleString('id-ID')} & Asuransi: Rp {Number(bttDetail.biaya_asuransi).toLocaleString('id-ID')})
                            </span>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block mb-1 text-xs font-bold text-slate-700 dark:text-gray-300">
                            ALASAN KOREKSI / REVISI HARGA :
                        </label>
                        <input
                            type="text"
                            placeholder="Contoh: Kesalahan input berat volume / penyesuaian tarif kontrak..."
                            value={formData.alasan}
                            onChange={(e) => setFormData(p => ({ ...p, alasan: e.target.value }))}
                            className={`w-full p-2.5 border rounded-xl font-bold text-xs outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 mt-5 border-t border-slate-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmitRevisi}
                            disabled={isSaving}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            <Save size={15} /> {isSaving ? 'MENYIMPAN...' : 'SIMPAN REVISI HARGA'}
                        </button>
                    </div>
                </div>
            )}

            {/* TABEL RIWAYAT AUDIT LOG REVISI HARGA */}
            <div className="[&>div>div:first-child]:hidden">
                <DataTableTemplate
                    title="RIWAYAT AUDIT REVISI TARIF BTT APL"
                    columns={historyColumns}
                    data={historyData}
                    loading={loadingHistory}
                    isDarkMode={isDarkMode}
                />
            </div>
        </div>
    );
};

export default RevisiBTTAPL;