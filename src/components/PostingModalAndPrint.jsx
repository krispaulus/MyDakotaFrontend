import React, { useState, useEffect } from 'react';
import { Search, Printer, X, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api/axios';

// ==========================================
// 1. MODAL POSTING (DENGAN SEARCH BANK & E-TOLL)
// ==========================================
export function PostingModal({ isOpen, onClose, onConfirm, transData }) {
    const [sumberDana, setSumberDana] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [bankList, setBankList] = useState([]);
    const [etollList, setEtollList] = useState([]);
    const [selectedBank, setSelectedBank] = useState(null);
    const [selectedEtoll, setSelectedEtoll] = useState(null);
    const [loadingSearch, setLoadingSearch] = useState(false);

    // Ambil Data Bank dari API
    const fetchBankData = async (query = '') => {
        try {
            setLoadingSearch(true);
            const res = await api.get(`/bank-data?search=${encodeURIComponent(query)}`);
            setBankList(res.data?.data || res.data || []);
        } catch (err) {
            // Fallback data demo jika endpoint belum siap
            setBankList([
                { code: 'A002011021', name: 'Bank Central Asia (CAB)' },
                { code: 'B006030066', name: 'Bank Central Asia (PST)' },
                { code: 'B006030067', name: 'Bank Mandiri' },
            ]);
        } finally {
            setLoadingSearch(false);
        }
    };

    // Ambil Data E-Toll dari API
    const fetchEtollData = async (query = '') => {
        try {
            setLoadingSearch(true);
            const res = await api.get(`/etoll-data?search=${encodeURIComponent(query)}`);
            setEtollList(res.data?.data || res.data || []);
        } catch (err) {
            setEtollList([
                { code: 'ET001', name: 'E-TOLL MANDIRI CABANG' },
                { code: 'ET002', name: 'E-TOLL BCA FLEET PST' },
            ]);
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleSelectRadio = (val) => {
        setSumberDana(val);
        setSearchQuery('');
        if (val === 'bank') fetchBankData('');
        if (val === 'etoll') fetchEtollData('');
    };

    const handleProceed = () => {
        if (!sumberDana) {
            alert('Silakan pilih sumber dana terlebih dahulu!');
            return;
        }
        if (sumberDana === 'bank' && !selectedBank) {
            alert('Silakan pilih akun Bank dari daftar dropdown!');
            return;
        }
        if (sumberDana === 'etoll' && !selectedEtoll) {
            alert('Silakan pilih akun E-TOLL dari daftar dropdown!');
            return;
        }

        onConfirm({
            sumberDana,
            bank: selectedBank,
            etoll: selectedEtoll
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Konfirmasi Posting</h3>
                        <p className="text-xs text-gray-500">Pilih Sumber Dana / Akun Pengeluaran Kas</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                    {/* Opsi Radio Sederhana */}
                    {[
                        { id: 'kas_ops_dk', label: 'Kas Ops DK', val: 'kas operasional dk' },
                        { id: 'kas_ops_lk', label: 'Kas Ops LK', val: 'kas operasional lk' },
                        { id: 'bca_fleet', label: 'BCA Fleet', val: 'bca fleet' },
                    ].map((item) => (
                        <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-blue-50/50 cursor-pointer transition">
                            <input
                                type="radio"
                                name="sumberDana"
                                value={item.val}
                                checked={sumberDana === item.val}
                                onChange={() => handleSelectRadio(item.val)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        </label>
                    ))}

                    {/* Opsi Radio BANK dengan Live Search & Dropdown */}
                    <div className={`p-3 rounded-xl border transition ${sumberDana === 'bank' ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'}`}>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="sumberDana"
                                value="bank"
                                checked={sumberDana === 'bank'}
                                onChange={() => handleSelectRadio('bank')}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-gray-800">BANK</span>
                        </label>

                        {selectedBank && (
                            <p className="text-xs text-blue-600 font-medium italic mt-2 ml-7">
                                ✓ {selectedBank.name} ({selectedBank.code})
                            </p>
                        )}

                        {sumberDana === 'bank' && (
                            <div className="mt-3 ml-7 space-y-2">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Cari nama bank atau kode..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            fetchBankData(e.target.value);
                                        }}
                                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-inner divide-y divide-gray-100 text-xs">
                                    {loadingSearch ? (
                                        <div className="p-3 text-center text-gray-400">Mencari bank...</div>
                                    ) : bankList.length > 0 ? (
                                        bankList.map((b) => (
                                            <div
                                                key={b.code}
                                                onClick={() => { setSelectedBank(b); }}
                                                className={`p-2.5 cursor-pointer hover:bg-blue-100 transition ${selectedBank?.code === b.code ? 'bg-blue-50 font-bold text-blue-700' : 'text-gray-700'}`}
                                            >
                                                <div>{b.name}</div>
                                                <div className="text-[10px] text-gray-400">Kode: {b.code}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-3 text-center text-gray-400">Bank tidak ditemukan</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Opsi Radio E-TOLL dengan Dropdown */}
                    <div className={`p-3 rounded-xl border transition ${sumberDana === 'etoll' ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'}`}>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="sumberDana"
                                value="etoll"
                                checked={sumberDana === 'etoll'}
                                onChange={() => handleSelectRadio('etoll')}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-gray-800">E-TOLL</span>
                        </label>

                        {selectedEtoll && (
                            <p className="text-xs text-blue-600 font-medium italic mt-2 ml-7">
                                ✓ {selectedEtoll.name} ({selectedEtoll.code})
                            </p>
                        )}

                        {sumberDana === 'etoll' && (
                            <div className="mt-3 ml-7 space-y-2">
                                <input
                                    type="text"
                                    placeholder="Cari E-Toll..."
                                    onChange={(e) => fetchEtollData(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 text-xs">
                                    {etollList.map((et) => (
                                        <div
                                            key={et.code}
                                            onClick={() => setSelectedEtoll(et)}
                                            className={`p-2.5 cursor-pointer hover:bg-blue-100 transition ${selectedEtoll?.code === et.code ? 'bg-blue-50 font-bold text-blue-700' : 'text-gray-700'}`}
                                        >
                                            <div>{et.name}</div>
                                            <div className="text-[10px] text-gray-400">Kode: {et.code}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 text-xs font-semibold rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 transition">
                        Batal
                    </button>
                    <button onClick={handleProceed} className="px-6 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition">
                        Posting Sekarang
                    </button>
                </div>
            </div>
        </div>
    );
}


// ==========================================
// 2. TEMPLATE CETAK VOUCHER KAS / JURNAL (PRINT VIEW)
// ==========================================
export function VoucherPrintView({ data, onClose }) {
    return (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-8 print:p-0">
            {/* Header Tombol Action (Hilang saat diprint) */}
            <div className="max-w-4xl mx-auto flex justify-between items-center mb-6 pb-4 border-b print:hidden">
                <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
                    ← Kembali
                </button>
                <button onClick={() => window.print()} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 shadow">
                    <Printer size={16} /> Cetak Voucher / Download PDF
                </button>
            </div>

            {/* Konten Kertas Voucher */}
            <div className="max-w-4xl mx-auto border border-gray-300 p-8 rounded-lg shadow-sm print:border-none print:shadow-none print:p-0 text-black font-sans">
                {/* Kop Surat */}
                <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                    <div>
                        <h2 className="font-bold text-base tracking-wider">DAKOTA LOGISTIK INDONESIA</h2>
                        <p className="text-xs">Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi</p>
                        <p className="text-xs">BEKASI KOTA</p>
                        <p className="text-xs">(021) 8603278 / (021) 86608589</p>
                    </div>
                    <div className="text-right">
                        <h1 className="font-black text-xl tracking-wide">DAKOTA</h1>
                        <p className="text-[10px] tracking-widest font-semibold text-red-600">LOGISTIK INDONESIA</p>
                    </div>
                </div>

                {/* Judul Voucher */}
                <div className="text-center my-6">
                    <h2 className="font-bold text-lg uppercase underline tracking-wider">
                        {data?.tipe === 'T' ? 'VOUCHER PENERIMAAN KAS' : 'VOUCHER PENGELUARAN KAS'}
                    </h2>
                </div>

                {/* Metadata Transaksi */}
                <div className="grid grid-cols-2 gap-4 text-xs mb-6 leading-relaxed">
                    <div>
                        <div className="flex"><span className="w-28 font-semibold">No. Transaksi</span><span>: {data?.noJurnal || data?.noTransaksi}</span></div>
                        <div className="flex"><span className="w-28 font-semibold">Tanggal</span><span>: {data?.tanggal}</span></div>
                        <div className="flex"><span className="w-28 font-semibold">Keterangan</span><span>: {data?.keterangan}</span></div>
                    </div>
                </div>

                {/* Tabel Debit & Kredit Jurnal */}
                <table className="w-full text-xs border-collapse border border-gray-300 mb-8">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            <th className="border border-gray-300 p-2 text-left w-24">Account</th>
                            <th className="border border-gray-300 p-2 text-center w-12">CC</th>
                            <th className="border border-gray-300 p-2 text-left">Keterangan</th>
                            <th className="border border-gray-300 p-2 text-right w-28">Debet</th>
                            <th className="border border-gray-300 p-2 text-right w-28">Kredit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Baris Kredit (Bank / Kas Sumber Dana) */}
                        <tr className="border-b border-gray-200">
                            <td className="p-2 border-r border-gray-300">{data?.kreditAccountCode || 'B006030066'}</td>
                            <td className="p-2 text-center border-r border-gray-300">1</td>
                            <td className="p-2 border-r border-gray-300 font-semibold">
                                {data?.kreditAccountName || 'BANK CENTRAL ASIA (PST)'} : {data?.keterangan}
                            </td>
                            <td className="p-2 text-right border-r border-gray-300">0.00</td>
                            <td className="p-2 text-right">{Number(data?.total || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td>
                        </tr>

                        {/* Baris Debit (Rincian Biaya / COA) */}
                        {data?.items?.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-200">
                                <td className="p-2 border-r border-gray-300">{item.kode || 'E101020050'}</td>
                                <td className="p-2 text-center border-r border-gray-300">1</td>
                                <td className="p-2 border-r border-gray-300 font-semibold">
                                    {item.nama || item.keterangan} : {item.keterangan}
                                </td>
                                <td className="p-2 text-right border-r border-gray-300">{Number(item.subtotal || item.hargaSatuan || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td>
                                <td className="p-2 text-right">0.00</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                            <td colSpan="3" className="p-2 text-right pr-4 border-r border-gray-300">TOTAL</td>
                            <td className="p-2 text-right border-r border-gray-300">{Number(data?.total || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right">{Number(data?.total || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Kolom Tanda Tangan */}
                <div className="grid grid-cols-3 gap-8 text-center text-xs mt-16 pt-6">
                    <div>
                        <p className="mb-20 font-semibold">Diterima</p>
                        <p className="font-bold underline">( Keuangan )</p>
                    </div>
                    <div>
                        <p className="mb-20 font-semibold">Disetujui</p>
                        <p className="font-bold underline">( Direksi )</p>
                    </div>
                    <div>
                        <p className="mb-20 font-semibold">Diketahui</p>
                        <p className="font-bold underline">( Akunting )</p>
                    </div>
                </div>
            </div>
        </div>
    );
}