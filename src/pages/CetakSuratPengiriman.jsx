import React, { useState, useRef } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Search, Printer, LogOut, X as XIcon } from 'lucide-react';
import Swal from 'sweetalert2';

const CetakSuratPengiriman = () => {
    const { isDarkMode } = useDarkMode();
    const [noSpInput, setNoSpInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [spHeader, setSpHeader] = useState(null);
    const [spDetails, setSpDetails] = useState([]);
    const [globalSearch, setGlobalSearch] = useState('');
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const inputRef = useRef(null);

    // Function Fetch Data SP dari Backend & Otomatis Buka Pop-Up
    const fetchSuratPengiriman = async (e) => {
        if (e) e.preventDefault();
        if (!noSpInput.trim()) {
            Swal.fire('Peringatan', 'Masukkan Nomor SP terlebih dahulu!', 'warning');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/sp-terima-print', {
                params: { nobtt: noSpInput.trim().toUpperCase() },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.data) {
                setSpHeader(res.data.data.header || null);
                setSpDetails(res.data.data.details || []);

                // 🚀 LANGSUNG OTOMATIS BUKAKAN POP-UP CETAK SAAT DATA DITEMUKAN!
                setIsPrintModalOpen(true);
            } else {
                setSpHeader(null);
                setSpDetails([]);
                Swal.fire('Kosong', 'Data Surat Pengiriman tidak ditemukan', 'info');
            }
        } catch (err) {
            console.error(err);
            setSpHeader(null);
            setSpDetails([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Nomor SP tidak ditemukan di database', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Definisi Kolom untuk DataTableTemplate di Halaman Utama
    const columns = [
        {
            header: 'NO. BTT / RESI',
            accessor: 'no_btt',
            render: (i) => <span className="font-mono font-bold text-indigo-700">📦 {i.no_btt || '-'}</span>
        },
        {
            header: 'NAMA PENERIMA',
            accessor: 'nama_penerima',
            render: (i) => <span className="font-semibold text-slate-800 uppercase">{i.nama_penerima || '-'}</span>
        },
        {
            header: 'KOTA TUJUAN',
            accessor: 'kota_tujuan',
            render: (i) => <span className="font-bold text-emerald-800 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{i.kota_tujuan || '-'}</span>
        },
        {
            header: 'KETERANGAN',
            accessor: 'keterangan',
            render: (i) => <span className="text-slate-600 font-medium">{i.keterangan || '-'}</span>
        }
    ];

    // Filter Global Search
    const filteredDetails = spDetails.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.no_btt && item.no_btt.toLowerCase().includes(q)) ||
            (item.nama_penerima && item.nama_penerima.toLowerCase().includes(q)) ||
            (item.kota_tujuan && item.kota_tujuan.toLowerCase().includes(q))
        );
    });

    const handlePrintBrowser = () => {
        window.print();
    };

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER SCANNER / INPUT NO SP ATAS */}
            <div className="p-5 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 print:hidden">
                <form onSubmit={fetchSuratPengiriman} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-8">
                        <label className="block mb-1 text-xs font-bold text-slate-600 uppercase">
                            MASUKKAN NOMOR SP / SURAT PENGANTAR :
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Ketikkan Nomor SP atau Scan Barcode di sini..."
                            className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-indigo-600 font-mono font-bold text-slate-800 uppercase text-xs bg-white"
                            value={noSpInput}
                            onChange={(e) => setNoSpInput(e.target.value.toUpperCase())}
                            autoFocus
                        />
                        <span className="text-[10px] text-slate-400 font-medium italic mt-1 block">
                            * ketikkan nomor SP atau gunakan barcode scanner
                        </span>
                    </div>

                    <div className="col-span-4 flex gap-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-indigo-950 hover:bg-indigo-900 active:scale-98 text-white font-black rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase text-xs"
                        >
                            <Search size={15} /> {loading ? 'SEARCHING...' : 'CARI SP'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsPrintModalOpen(true)}
                            disabled={!spHeader}
                            className={`flex-1 py-3 font-black rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase text-xs text-white ${!spHeader ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'}`}
                        >
                            <Printer size={15} /> CETAK SP
                        </button>
                    </div>
                </form>

                {/* RINGKASAN HEADER SP */}
                {spHeader && (
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-4 gap-4 text-xs font-bold text-slate-700 bg-slate-50 p-3 rounded-xl">
                        <div><span className="text-slate-400 block uppercase text-[10px]">NO SP:</span> <span className="text-indigo-900 font-mono font-black">{spHeader.no_sp}</span></div>
                        <div><span className="text-slate-400 block uppercase text-[10px]">TANGGAL:</span> {spHeader.tgl_sp}</div>
                        <div><span className="text-slate-400 block uppercase text-[10px]">NO. MOBIL / SOPIR:</span> {spHeader.no_mobil} / {spHeader.nama_sopir}</div>
                        <div><span className="text-slate-400 block uppercase text-[10px]">RUTE AGEN:</span> {spHeader.agen_asal} ➔ {spHeader.agen_tujuan}</div>
                    </div>
                )}
            </div>

            {/* TABLE TEMPLATE UTAMA */}
            <div className="print:hidden">
                <DataTableTemplate
                    title="RINCIAN BARANG SURAT PENGIRIMAN (OPR_T_eSP_Terima)"
                    columns={columns}
                    data={filteredDetails}
                    loading={loading}
                    isDarkMode={isDarkMode}
                    searchValue={globalSearch}
                    onSearchChange={(e) => setGlobalSearch(e.target.value)}
                />
            </div>

            {/* ========================================================================= */}
            {/* 🖨️ POP-UP MODAL PREVIEW & CETAK SURAT PENGIRIMAN                         */}
            {/* ========================================================================= */}
            {isPrintModalOpen && spHeader && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 max-h-[95vh]">

                        {/* Modal Header Actions (Tutup & Tombol Print) */}
                        <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center print:hidden">
                            <h2 className="text-sm font-black text-slate-800 tracking-wide uppercase flex items-center gap-2">
                                <Printer size={18} className="text-indigo-600" /> HASIL PENCARIAN & PREVIEW SURAT PENGIRIMAN
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrintBrowser}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer active:scale-95 uppercase tracking-wide"
                                >
                                    <Printer size={15} /> CETAK SP SEKARANG
                                </button>
                                <button
                                    onClick={() => setIsPrintModalOpen(false)}
                                    className="w-9 h-9 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition font-bold cursor-pointer"
                                >
                                    <XIcon size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Printable Area Content */}
                        <div className="p-8 space-y-6 text-slate-900 font-mono text-xs overflow-y-auto flex-1 print:p-0 print:overflow-visible">

                            {/* Kop Surat */}
                            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                                <div>
                                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">DAKOTA LOGISTIK INDONESIA</h1>
                                    <p className="text-[11px] font-bold text-slate-600">SURAT PENGANTAR / SURAT PENGIRIMAN KARGO</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-lg font-black text-indigo-950">{spHeader.no_sp}</h2>
                                    <p className="text-[11px] font-bold">TGL: {spHeader.tgl_sp}</p>
                                </div>
                            </div>

                            {/* Info Header Hasil Pencarian */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-bold print:bg-transparent print:p-0 print:border-none">
                                <div>
                                    <p className="mb-1"><span className="text-slate-500">NO. KENDARAAN:</span> {spHeader.no_mobil}</p>
                                    <p><span className="text-slate-500">NAMA SOPIR:</span> {spHeader.nama_sopir}</p>
                                </div>
                                <div>
                                    <p className="mb-1"><span className="text-slate-500">CABANG ASAL:</span> {spHeader.agen_asal}</p>
                                    <p><span className="text-slate-500">CABANG TUJUAN:</span> {spHeader.agen_tujuan}</p>
                                </div>
                            </div>

                            {/* Tabel Printable Hasil Pencarian */}
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b-2 border-slate-900 bg-slate-100 print:bg-transparent">
                                        <th className="py-2.5 px-2 border border-slate-400 font-black text-center w-12">NO</th>
                                        <th className="py-2.5 px-3 border border-slate-400 font-black">NO. BTT / RESI</th>
                                        <th className="py-2.5 px-3 border border-slate-400 font-black">PENERIMA</th>
                                        <th className="py-2.5 px-3 border border-slate-400 font-black">KOTA TUJUAN</th>
                                        <th className="py-2.5 px-3 border border-slate-400 font-black">KETERANGAN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {spDetails.length > 0 ? (
                                        spDetails.map((item, idx) => (
                                            <tr key={idx} className="border-b border-slate-300">
                                                <td className="py-2 px-2 border border-slate-300 text-center font-bold">{idx + 1}</td>
                                                <td className="py-2 px-3 border border-slate-300 font-bold">{item.no_btt}</td>
                                                <td className="py-2 px-3 border border-slate-300 uppercase">{item.nama_penerima}</td>
                                                <td className="py-2 px-3 border border-slate-300 uppercase">{item.kota_tujuan}</td>
                                                <td className="py-2 px-3 border border-slate-300 uppercase">{item.keterangan}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-4 font-bold text-slate-500 border border-slate-300">
                                                Tidak ada rincian BTT untuk Surat Pengiriman ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Tanda Tangan Footer */}
                            <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs font-bold uppercase">
                                <div>
                                    <p className="mb-14">PETUGAS MUAT</p>
                                    <p className="border-t border-slate-900 pt-1">( ................................ )</p>
                                </div>
                                <div>
                                    <p className="mb-14">PENGEMUDI / SOPIR</p>
                                    <p className="border-t border-slate-900 pt-1">{spHeader.nama_sopir}</p>
                                </div>
                                <div>
                                    <p className="mb-14">PETUGAS TUJUAN</p>
                                    <p className="border-t border-slate-900 pt-1">( ................................ )</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CetakSuratPengiriman;