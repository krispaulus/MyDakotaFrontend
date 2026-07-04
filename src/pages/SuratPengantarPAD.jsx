import React, { useState, useEffect } from 'react';
import { Truck, Search, QrCode } from 'lucide-react';
import Swal from 'sweetalert2';

const SuratPengantarPAD = () => {
    // State Filter Atas
    const [filterData, setFilterData] = useState({
        dariTanggal: new Date().toISOString().split('T')[0],
        sampaiTanggal: new Date().toISOString().split('T')[0],
        noSP: '',
        noBTT: '',
        noSuratTugas: ''
    });

    // State Konfigurasi Muat Vendor / Ekspedisi Lain
    const [configPAD, setConfigPAD] = useState({
        vendorEkspedisi: '',
        noResiVendor: '',
        keteranganTransit: '',
        driverVendor: ''
    });

    const [inputBarcode, setInputBarcode] = useState('');
    const [manifestItems, setManifestItems] = useState([]);

    const handleScanMuat = (e) => {
        if (e) e.preventDefault();
        if (!inputBarcode.trim()) return;

        // Simulasi validasi scan muat barang logistik
        const newItem = {
            no: manifestItems.length + 1,
            noBtt: inputBarcode.trim().toUpperCase(),
            waktuMuat: new Date().toLocaleString('id-ID'),
            status: 'MUAT VENDOR'
        };

        setManifestItems([newItem, ...manifestItems]);
        setInputBarcode('');
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `BZZZTT! ${newItem.noBtt} Berhasil Dimuat ke Vendor`,
            showConfirmButton: false,
            timer: 1500
        });
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-xs font-semibold text-slate-700 font-mono">

            {/* Title Page Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                    <h1 className="text-base font-black text-slate-900 uppercase tracking-wider">
                        Surat Pengantar - SP PAD (Ekspedisi Lain)
                    </h1>
                    <p className="text-[11px] text-gray-500 font-medium">
                        Modul pelimpahan pengiriman kargo internal DAKOTA Cargo kepada Vendor / Ekspedisi Rekanan Pihak Ketiga.
                    </p>
                </div>
            </div>

            {/* 🔍 PANEL 1: FILTER & PENCARIAN DOKUMEN OPERASIONAL */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-blue-600 font-black tracking-wider border-b border-gray-100 pb-2">
                    <Search size={16} />
                    <span>PANEL FILTER & PENCARIAN DOKUMEN OPERASIONAL</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-gray-400 text-[10px] uppercase">Dari Tanggal</label>
                        <input type="date" value={filterData.dariTanggal} onChange={(e) => setFilterData({ ...filterData, dariTanggal: e.target.value })} className="p-2 border border-gray-300 rounded-lg text-slate-800" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-gray-400 text-[10px] uppercase">Sampai Tanggal</label>
                        <input type="date" value={filterData.sampaiTanggal} onChange={(e) => setFilterData({ ...filterData, sampaiTanggal: e.target.value })} className="p-2 border border-gray-300 rounded-lg text-slate-800" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-gray-400 text-[10px] uppercase">No. SP Naik</label>
                        <input type="text" placeholder="Cari No SP..." className="p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-gray-400 text-[10px] uppercase">No. BTT / Resi</label>
                        <input type="text" placeholder="Cari No BTT..." className="p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-gray-400 text-[10px] uppercase">No. Loading / Surat Tugas</label>
                        <input type="text" placeholder="Cari Surat Tugas..." className="p-2 border border-gray-300 rounded-lg" />
                    </div>
                </div>
                <div className="flex justify-end">
                    <button className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition uppercase tracking-wider text-[10px]">
                        🚀 Jalankan Filter Data
                    </button>
                </div>
            </div>

            {/* 🚚 PANEL 2: KONFIGURASI PEMBERANGKATAN TRANSAKSI VENDOR (SP PAD) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 font-black tracking-wider border-b border-gray-100 pb-2">
                    <Truck size={16} />
                    <span>🫱‍🫲 KONFIGURASI PEMBERANGKATAN VIA VENDOR REKANAN (PAD)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 border border-dashed border-gray-200 rounded-xl">
                    <div className="flex flex-col gap-1">
                        <label className="text-gray-400 text-[10px] uppercase">Loket Agen DBS Asal</label>
                        <input type="text" value="PUSAT DAKOTA (AUTODETECT)" disabled className="p-2 border border-gray-300 rounded-lg bg-gray-100 font-bold uppercase text-gray-500" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-gray-400 text-[10px] uppercase">Pilih Vendor Ekspedisi *</label>
                        <select className="p-2 border border-gray-300 rounded-lg bg-white text-slate-800">
                            <option value="">-- PILIH EKSPEDISI LAIN --</option>
                            <option value="JNE">JNE LOGISTIK</option>
                            <option value="TIKI">TIKI LOGISTIK</option>
                            <option value="INDONESIA_CARGO">PT. INDONESIA CARGO REKANAN</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-gray-400 text-[10px] uppercase">No Polisi / No Resi Ekspedisi Luar *</label>
                        <input type="text" placeholder="Masukkan resi/manifest luar..." className="p-2 border border-gray-300 rounded-lg uppercase" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-gray-400 text-[10px] uppercase">Nama Sopir / Agen Penerima *</label>
                        <input type="text" placeholder="Masukkan nama kontak vendor..." className="p-2 border border-gray-300 rounded-lg uppercase" />
                    </div>
                </div>

                {/* BARCODE SCANNER BARANG PAD */}
                <form onSubmit={handleScanMuat} className="pt-2 space-y-1">
                    <label className="text-blue-600 uppercase font-black text-[11px] flex items-center gap-1">
                        <QrCode size={14} /> ENTRY BARCODE SCANNER MUAT BARANG EKSPEDISI LAIN
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Ketik nomor resi koli lalu tekan Enter untuk melimpahkan barang..."
                            value={inputBarcode}
                            onChange={(e) => setInputBarcode(e.target.value)}
                            className="w-full p-3 border border-indigo-300 rounded-xl bg-transparent outline-none uppercase font-black text-sm tracking-widest text-indigo-600 focus:border-indigo-500 shadow-inner"
                        />
                        <button type="submit" className="px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow uppercase tracking-wider text-[11px]">
                            Scan Muat
                        </button>
                    </div>
                </form>
            </div>

            {/* 📊 PANEL 3: DATALIST ITEMS MANIFEST */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="font-black text-slate-800 uppercase tracking-wider">
                    Datalist Manifest Muatan Vendor PAD ({manifestItems.length} Items)
                </div>
                <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                        <tr className="border-b-2 border-gray-300 font-bold text-gray-600 uppercase bg-gray-50">
                            <th className="p-3 text-center w-[10%]">No</th>
                            <th className="p-3 w-[40%]">Nomor BTT / Resi Kargo</th>
                            <th className="p-3 w-[30%]">Waktu Pelimpahan Muat</th>
                            <th className="p-3 text-center w-[20%]">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-700 font-medium">
                        {manifestItems.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-6 text-center text-gray-400 italic">
                                    Belum ada resi kargo yang dialihkan/dimuat ke dalam manifest vendor rekanan ini.
                                </td>
                            </tr>
                        ) : (
                            manifestItems.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50/80">
                                    <td className="p-3 text-center text-gray-400 font-bold">{item.no}</td>
                                    <td className="p-3 font-bold text-slate-900 tracking-wider">{item.noBtt}</td>
                                    <td className="p-3 text-gray-500">{item.waktuMuat}</td>
                                    <td className="p-3 text-center">
                                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wide border border-amber-200">
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default SuratPengantarPAD;