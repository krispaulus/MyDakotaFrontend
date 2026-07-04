import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Plus, Search, FileText, CheckCircle, XCircle, RefreshCw, Layers } from 'lucide-react';

const MarketingBDB = () => {
    // State Utama
    const [bdbList, setBdbList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // State Form Input Data BDB Baru[cite: 16]
    const [formData, setFormData] = useState({
        BDB_NamaPengirim: '',
        BDB_AsalName: '',
        BDB_AsalTelp: '',
        BDB_TujuanAgenID: '',
        BDB_TujuanNama: '',
        BDB_Up: '',
        BDB_NamaBarang: '',
        BDB_JmlUnit: 1,
        BDB_JmlPck: 1,
        BDB_Berat: 0,
        BDB_Beratvol: 0,
        BDB_Ukuran: '',
        BDB_Service: '1', // 1=Darat, 2=Laut, 3=Udara
        BDB_Ket: ''
    });

    // Fetch History Data BDB (Fitur Lihat Data)
    const fetchBDBHistory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:8080/api/marketing/bdb/list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBdbList(res.data || []);
        } catch (err) {
            console.error("Gagal load history BDB:", err);
            // Dummy data jika API backend belum lu pasang bray (biar layout tidak blank)
            setBdbList([
                { BDB_ID: 'BDB0107260001', BDB_Tanggal: '2026-07-01', BDB_NamaPengirim: 'INTERNAL DAKOTA PUSAT', BDB_TujuanNama: 'CABANG BANDUNG', BDB_JmlUnit: 5, BDB_Berat: 45, BDB_PostingYN: 'Y', BDB_Service: '1' },
                { BDB_ID: 'BDB0107260002', BDB_Tanggal: '2026-07-02', BDB_NamaPengirim: 'SAMPLE MARKETING VENDOR', BDB_TujuanNama: 'AGEN BEKASI', BDB_JmlUnit: 2, BDB_Berat: 12, BDB_PostingYN: 'N', BDB_Service: '3' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBDBHistory();
    }, []);

    // Handle Submit Tambah Data BDB
    const handleSubmitBDB = async (e) => {
        e.preventDefault();

        // Aturan Bisnis: Ambil berat tertinggi antara Berat Aktual vs Berat Volume
        const beratFinal = Math.max(Number(formData.BDB_Berat), Number(formData.BDB_Beratvol));
        if (beratFinal <= 0) {
            return Swal.fire('Peringatan', 'Berat kargo atau berat volume wajib diisi!', 'warning');
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:8080/api/marketing/bdb/create', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('BERHASIL', 'Pengiriman Bebas Biaya (BDB) Berhasil Didaftarkan!', 'success');
            setShowAddModal(false);
            // Reset Form
            setFormData({
                BDB_NamaPengirim: '', BDB_AsalName: '', BDB_AsalTelp: '', BDB_TujuanAgenID: '',
                BDB_TujuanNama: '', BDB_Up: '', BDB_NamaBarang: '', BDB_JmlUnit: 1, BDB_JmlPck: 1,
                BDB_Berat: 0, BDB_Beratvol: 0, BDB_Ukuran: '', BDB_Service: '1', BDB_Ket: ''
            });
            fetchBDBHistory();
        } catch (err) {
            console.error("Gagal save BDB:", err);
            Swal.fire('ERROR', 'Gagal memproses pembuatan resi BDB', 'error');
        }
    };

    return (

        <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-xs font-semibold text-slate-700 antialiased">


            {/* HEADER UTAMA */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="text-blue-600" size={20} /> Bebas Dari Biaya (BDB) - Pengiriman
                    </h1>
                    <p className="text-[11px] text-gray-500 font-medium tracking-normal font-sans">
                        Portal pencatatan dan monitoring resi khusus kargo internal / promosi gratis tanpa beban biaya kirim.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchBDBHistory} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition text-gray-700 flex items-center justify-center">
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition uppercase tracking-wider flex items-center gap-2 text-[10px]">
                        <Plus size={14} /> Tambah Data BDB Baru
                    </button>
                </div>
            </div>

            {/* TABEL HISTORY (FITUR LIHAT DATA) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-blue-600 font-black tracking-wider">
                    <Search size={16} />
                    <span className="font-sans text-[20px] text-gray-500 font-medium tracking-normal">DAFTAR HISTORY TRANSAKSI RESI BDB ACTIVE</span>
                </div>

                <table className="w-full text-left border-collapse text-[14px]">
                    <thead>
                        <tr className="border-b-2 border-gray-300 font-bold text-gray-600 uppercase bg-gray-50">
                            <th className="p-3 text-center">No</th>
                            <th className="p-3">Nomor BDB ID</th>
                            <th className="p-3">Tanggal</th>
                            <th className="p-3">Nama Pengirim</th>
                            <th className="p-3">Tujuan Pengiriman</th>
                            <th className="p-3 text-center">Layanan</th>
                            <th className="p-3 text-center">Koli</th>
                            <th className="p-3 text-center">Status Jurnal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-700 font-medium">
                        {loading ? (
                            <tr><td colSpan={8} className="p-6 text-center text-blue-600 animate-pulse">Menarik data dari server...</td></tr>
                        ) : bdbList.length === 0 ? (
                            <tr><td colSpan={8} className="p-6 text-center text-gray-400 italic">Belum ada history transaksi BDB terdaftar.</td></tr>
                        ) : (
                            bdbList.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50/80">
                                    <td className="p-3 text-center text-gray-400 font-bold">{index + 1}</td>
                                    <td className="p-3 font-bold text-blue-600 tracking-wider">{item.BDB_ID}</td>
                                    <td className="p-3 text-gray-500">{item.BDB_Tanggal}</td>
                                    <td className="p-3 uppercase">{item.BDB_NamaPengirim}</td>
                                    <td className="p-3 uppercase">{item.BDB_TujuanNama}</td>
                                    <td className="p-3 text-center font-bold">
                                        {item.BDB_Service === '1' ? 'DARAT' : item.BDB_Service === '2' ? 'LAUT' : 'UDARA'}
                                    </td>
                                    <td className="p-3 text-center font-black text-slate-900">{item.BDB_JmlUnit}</td>
                                    <td className="p-3 text-center">
                                        {item.BDB_PostingYN === 'Y' ? (
                                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border border-green-200 flex items-center justify-center gap-1 mx-auto w-24">
                                                <CheckCircle size={10} /> POSTED
                                            </span>
                                        ) : (
                                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border border-amber-200 flex items-center justify-center gap-1 mx-auto w-24">
                                                <XCircle size={10} /> WAITING
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* =========================================================================
                🏙️ MODAL TRANSAKSI FORM POP-UP TAMBAH DATA BDB BARU
                ========================================================================= */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-6 flex flex-col relative max-h-[90vh] overflow-y-auto">

                        <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-sm">✕</button>

                        <div className="text-center mb-5 border-b border-gray-100 pb-3">
                            <span className="bg-blue-600 text-white px-5 py-1.5 font-black text-xs rounded shadow-sm tracking-widest uppercase">
                                FORM ENTRY MUTASI RESI BDB BARU
                            </span>
                        </div>

                        <form onSubmit={handleSubmitBDB} className="space-y-4 text-xs font-semibold text-slate-700">

                            {/* SECTION A: DATA PENGIRIM */}
                            <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Nama Pengirim BDB *</label>
                                    <input type="text" required value={formData.BDB_NamaPengirim} onChange={(e) => setFormData({ ...formData, BDB_NamaPengirim: e.target.value })} placeholder="Internal/Nama Client..." className="p-2 border border-gray-300 rounded-md uppercase" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Asal Perusahaan / Divisi</label>
                                    <input type="text" value={formData.BDB_AsalName} onChange={(e) => setFormData({ ...formData, BDB_AsalName: e.target.value })} placeholder="Contoh: Corcom/MKT..." className="p-2 border border-gray-300 rounded-md uppercase" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">No. Telepon Pengirim</label>
                                    <input type="text" value={formData.BDB_AsalTelp} onChange={(e) => setFormData({ ...formData, BDB_AsalTelp: e.target.value })} placeholder="Nomor HP/Ext..." className="p-2 border border-gray-300 rounded-md" />
                                </div>
                            </div>

                            {/* SECTION B: DATA PENERIMA & LAYANAN */}
                            <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">ID Agen Tujuan *</label>
                                    <input type="text" required value={formData.BDB_TujuanAgenID} onChange={(e) => setFormData({ ...formData, BDB_TujuanAgenID: e.target.value })} placeholder="Kode Agen..." className="p-2 border border-gray-300 rounded-md uppercase" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Nama Penerima / Lokasi Tujuan *</label>
                                    <input type="text" required value={formData.BDB_TujuanNama} onChange={(e) => setFormData({ ...formData, BDB_TujuanNama: e.target.value })} placeholder="Nama Cabang/Tujuan..." className="p-2 border border-gray-300 rounded-md uppercase" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Person Dituju (UP)</label>
                                    <input type="text" value={formData.BDB_Up} onChange={(e) => setFormData({ ...formData, BDB_Up: e.target.value })} placeholder="Nama Staff UP..." className="p-2 border border-gray-300 rounded-md uppercase" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Moda Layanan (Service) *</label>
                                    <select value={formData.BDB_Service} onChange={(e) => setFormData({ ...formData, BDB_Service: e.target.value })} className="p-2 border border-gray-300 rounded-md bg-white">
                                        <option value="1">DARAT</option>
                                        <option value="2">LAUT</option>
                                        <option value="3">UDARA</option>
                                    </select>
                                </div>
                            </div>

                            {/* SECTION C: SPESIFIKASI BARANG */}
                            <div className="p-4 border border-gray-200 rounded-xl grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Nama Barang *</label>
                                    <input type="text" required value={formData.BDB_NamaBarang} onChange={(e) => setFormData({ ...formData, BDB_NamaBarang: e.target.value })} placeholder="Isi kargo..." className="p-2 border border-gray-300 rounded-md uppercase" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Jumlah Koli (Unit)</label>
                                    <input type="number" min={1} value={formData.BDB_JmlUnit} onChange={(e) => setFormData({ ...formData, BDB_JmlUnit: Number(e.target.value) })} className="p-2 border border-gray-300 rounded-md font-bold" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Berat Aktual (Kg)</label>
                                    <input type="number" step="any" value={formData.BDB_Berat} onChange={(e) => setFormData({ ...formData, BDB_Berat: Number(e.target.value) })} className="p-2 border border-gray-300 rounded-md font-bold" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Berat Volume (Kg)</label>
                                    <input type="number" step="any" value={formData.BDB_Beratvol} onChange={(e) => setFormData({ ...formData, BDB_Beratvol: Number(e.target.value) })} className="p-2 border border-gray-300 rounded-md font-bold" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-400 text-[10px] uppercase">Dimensi Ukuran (PxLxT)</label>
                                    <input type="text" value={formData.BDB_Ukuran} onChange={(e) => setFormData({ ...formData, BDB_Ukuran: e.target.value })} placeholder="Contoh: 40x40x50" className="p-2 border border-gray-300 rounded-md" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-gray-400 text-[10px] uppercase">Keterangan / Alasan BDB</label>
                                <textarea rows={2} value={formData.BDB_Ket} onChange={(e) => setFormData({ ...formData, BDB_Ket: e.target.value })} placeholder="Tulis alasan kargo ini dibebaskan biaya..." className="p-2 border border-gray-300 rounded-md resize-none font-sans" />
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setShowAddModal(false)} className="w-1/3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition uppercase tracking-wider text-[10px]">
                                    Batal
                                </button>
                                <button type="submit" className="w-2/3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition uppercase tracking-wider text-[10px]">
                                    Simpan Transaksi BDB
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MarketingBDB;