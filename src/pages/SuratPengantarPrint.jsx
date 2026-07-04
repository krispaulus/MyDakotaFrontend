import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

const SuratPengantarPrint = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [printData, setPrintData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrintDetail = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`http://localhost:8080/api/operasional/sp-terima/print-detail/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPrintData(res.data);
            } catch (err) {
                console.error("Gagal memuat data cetakan:", err);
                Swal.fire('ERROR', 'Gagal memuat template cetak Surat Pengantaran', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchPrintDetail();
    }, [id]);

    const handlePrint = () => {
        window.print(); // Memicu dialog cetak bawaan browser murni
    };

    if (loading) return <div className="p-6 text-center font-bold text-sm text-blue-600 animate-pulse">Memuat Dokumen Cetakan Manifest...</div>;
    if (!printData || !printData.header) return <div className="p-6 text-center text-red-500 font-bold">Data Manifest Tidak Valid / Tidak Ditemukan!</div>;

    const { header, items } = printData;

    // Hitung akumulasi total footer untuk manifest
    const totalKoli = items.reduce((sum, item) => sum + (item.koli || 0), 0);
    const totalBerat = items.reduce((sum, item) => sum + Number(item.berat_tertinggi || 0), 0);
    const totalBiaya = items.reduce((sum, item) => {
        // Aturan Bisnis: Jika pembayaran TUNAI, lakukan pembulatan ke ribuan terdekat
        if (item.tipe_pembayaran === 'TUNAI') {
            return sum + (Math.round(Number(item.biaya_kirim || 0) / 1000) * 1000);
        }
        return sum + Number(item.biaya_kirim || 0);
    }, 0);

    return (
        <div className="p-4 max-w-[800px] mx-auto bg-white font-mono text-xs text-slate-900 selection:bg-transparent">

            {/* 🛠️ CONTROLLER PANEL: Otomatis HILANG saat kertas di-print murni */}
            <div className="print:hidden mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-blue-600 text-white rounded-lg font-bold">🖨️</span>
                    <div>
                        <p className="text-sm font-bold text-blue-900">Spesifikasi Dokumen Manifest Siap Cetak</p>
                        <p className="text-[11px] text-blue-700 opacity-90">Gunakan printer standar logistik untuk mencetak manifest Surat Pengantar ini.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 font-bold rounded-lg transition uppercase tracking-wider text-[11px]">
                        Kembali
                    </button>
                    <button onClick={handlePrint} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition uppercase tracking-wider text-[11px]">
                        Print Now
                    </button>
                </div>
            </div>

            {/* =========================================================================
                📄 STRUKTUR NOTA MANIFEST: REPLIKA ULTRA AKURAT VERSI POSTGRESQL MODERN
                ========================================================================= */}
            <div className="border border-gray-300 p-6 rounded-lg relative overflow-hidden">

                {/* 🌟 WATERMARK MULTI-SERVICE: UDARA (Otomatis menyala transparan) */}
                {(header.spt_service === "3" || header.spt_service === "6") && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] select-none z-0">
                        <h1 className="text-9xl font-black tracking-[30px] rotate-12 text-slate-900">UDARA</h1>
                    </div>
                )}

                {/* HEADER NOTA: Logo Afiliasi & Info Kontak Agen Asal */}
                <div className="grid grid-cols-3 gap-4 items-start border-b border-gray-200 pb-4 z-10 relative">
                    <div className="space-y-1">
                        <div className="font-black text-sm text-blue-600 tracking-wider">DAKOTA CARGO</div>
                        <p className="text-[10px] leading-relaxed text-gray-500 uppercase">
                            {header.asal_agen}<br />
                            {header.asal_alamat}<br />
                            {header.asal_kota}
                        </p>
                    </div>

                    <div className="text-center border border-dashed border-gray-400 p-2 rounded bg-gray-50">
                        <div className="font-extrabold text-[11px] uppercase tracking-widest text-gray-700">Surat Pengantar Pengiriman</div>
                        <div className="mt-1 text-sm font-black text-indigo-600 tracking-wider font-sans">{header.spt_eid}</div>
                    </div>

                    <div className="text-right space-y-1 text-[10px]">
                        <div><b>Rute Asal :</b> <span className="font-bold uppercase text-gray-800">{header.asal_kota}</span></div>
                        <div><b>Rute Tujuan :</b> <span className="font-bold uppercase text-blue-600">{header.tujuan_kota}</span></div>
                        {header.spt_transityn === 'Y' && <span className="inline-block bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded text-[9px] uppercase">TRANSIT</span>}
                    </div>
                </div>

                {/* DETIL TRACKING MANIFEST: Sopir, Armada, Tanggal Manifest */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 text-[10px] border-b border-gray-200 bg-gray-50/50 px-2 z-10 relative">
                    <div>
                        <span className="text-gray-400 uppercase font-semibold">Tanggal SP:</span>
                        <p className="font-bold text-gray-800">{header.tanggal_sp}</p>
                    </div>
                    <div>
                        <span className="text-gray-400 uppercase font-semibold">Pengemudi / Sopir:</span>
                        <p className="font-bold text-gray-800 uppercase">{header.sopir_nama}</p>
                    </div>
                    <div>
                        <span className="text-gray-400 uppercase font-semibold">No. Polisi Armada:</span>
                        <p className="font-bold text-blue-600 uppercase tracking-wide">{header.no_mobil}</p>
                    </div>
                    <div>
                        <span className="text-gray-400 uppercase font-semibold">No. Surat Tugas:</span>
                        <p className="font-bold text-gray-800">{header.spt_surattugas || '-'}</p>
                    </div>
                </div>

                {/* TABEL DATA DETAIL BARIS BARANG (Koli, Berat, COD) */}
                <div className="py-4 z-10 relative">
                    <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                            <tr className="border-b-2 border-gray-300 font-bold text-gray-700 uppercase bg-gray-100">
                                <th className="p-2 text-center w-[5%]">No</th>
                                <th className="p-2 w-[25%]">No. BTT / Resi</th>
                                <th className="p-2 w-[15%]">Pembayaran</th>
                                <th className="p-2 w-[12%]">Layanan</th>
                                <th className="p-2 w-[23%]">Penerima & Kota</th>
                                <th className="p-2 text-center w-[8%]">Koli</th>
                                <th className="p-2 text-right w-[12%]">Berat (Kg)</th>
                                <th className="p-2 text-right w-[15%]">Biaya Kirim</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 font-medium text-gray-700">
                            {items.map((item, idx) => {
                                // Hitung pembulatan khusus tipe tunai logistik
                                const finalBiaya = item.tipe_pembayaran === 'TUNAI'
                                    ? Math.round(Number(item.biaya_kirim || 0) / 1000) * 1000
                                    : Number(item.biaya_kirim || 0);

                                return (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="p-2 text-center text-gray-400 font-bold">{idx + 1}</td>
                                        <td className="p-2 font-bold">
                                            <div>{item.btt_id}</div>
                                            {Number(item.nilai_cod) > 0 && (
                                                <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.2 rounded font-extrabold tracking-wide">
                                                    💸 COD: Rp {Number(item.nilai_cod).toLocaleString('id-ID')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-2 font-semibold text-gray-500">{item.tipe_pembayaran}</td>
                                        <td className="p-2">{item.jenis_layanan}</td>
                                        <td className="p-2">
                                            <div className="font-bold text-gray-800 uppercase truncate max-w-[150px]">{item.nama_penerima}</div>
                                            <div className="text-[9px] text-gray-400 uppercase font-bold">{item.kota_penerima}</div>
                                        </td>
                                        <td className="p-2 text-center font-bold text-gray-900">{item.koli}</td>
                                        <td className="p-2 text-right font-semibold">{Number(item.berat_tertinggi).toLocaleString('id-ID')}</td>
                                        <td className="p-2 text-right font-bold text-gray-900">Rp {finalBiaya.toLocaleString('id-ID')}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {/* AKUMULASI TOTAL FOOTER MANIFEST */}
                        <tfoot>
                            <tr className="border-t-2 border-gray-300 font-black text-gray-900 bg-gray-50">
                                <td colSpan="5" className="p-2 text-right uppercase tracking-wider font-black">Total Manifest Muat :</td>
                                <td className="p-2 text-center text-blue-600 text-[11px] font-black">{totalKoli} Koli</td>
                                <td className="p-2 text-right text-[11px] font-black">{totalBerat.toLocaleString('id-ID')} Kg</td>
                                <td className="p-2 text-right text-indigo-600 text-[11px] font-black">Rp {totalBiaya.toLocaleString('id-ID')}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* KETENTUAN HUKUM SERAH TERIMA MANIFEST */}
                <div className="mt-2 text-[9px] text-gray-400 italic leading-relaxed border-t border-gray-100 pt-3 z-10 relative">
                    Menerangkan bahwa pengemudi dan checker telah melakukan serah terima barang, sudah menghitung serta memeriksa barang kiriman tsb. <br />
                    Kami menyatakan barang tersebut dalam keadaan BAIK, dan sesuai ketentuan untuk diserahterimakan.
                </div>

                {/* TANDA TANGAN SERAH TERIMA FISIK */}
                <div className="grid grid-cols-4 gap-4 pt-10 text-center text-[10px] uppercase font-bold text-gray-600 z-10 relative">
                    <div className="space-y-12">
                        <p>Pembuat SP</p>
                        <p className="font-extrabold text-gray-900 underline">👑 SYSTEM API</p>
                    </div>
                    <div className="space-y-12">
                        <p>Checker Gudang</p>
                        <p className="text-gray-300 tracking-widest">___________</p>
                    </div>
                    <div className="space-y-12">
                        <p>Pengemudi / Kurir</p>
                        <p className="font-bold text-gray-800 underline">{header.sopir_nama}</p>
                    </div>
                    <div className="space-y-12">
                        <p>Diterima Oleh</p>
                        <p className="text-gray-300 tracking-widest">___________</p>
                    </div>
                </div>

            </div>

            {/* INJEKSI STYLE PRINT CSS UNTUK MENYULAP HALAMAN MENJADI STERIL DAN ANTI CACHE HALAMAN GELAP */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body {
                        background: white !important;
                        color: black !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    #paper {
                        width: 100% !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                }
            `}} />

        </div>
    );
};

export default SuratPengantarPrint;