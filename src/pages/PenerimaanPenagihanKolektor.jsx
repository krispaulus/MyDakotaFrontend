import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Edit3, CheckSquare, Printer, X, CheckCircle2, FileText, Calendar, User, Search, RotateCcw } from 'lucide-react';
import Swal from 'sweetalert2';

const PenerimaanPenagihanKolektor = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);

    // Filter Form State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [filterKolektor, setFilterKolektor] = useState('');
    const [filterNoPenagihan, setFilterNoPenagihan] = useState('');
    const [filterNoInvoice, setFilterNoInvoice] = useState('');

    // Modal State
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isSelectDocModalOpen, setIsSelectDocModalOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [detailItems, setDetailItems] = useState([]);

    const toggleFilterPanel = () => setShowFilter(prev => !prev);

    const fetchData = async (useDateFilter = false) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const params = { pt_id: ptId };
            if (useDateFilter && startDate && endDate) {
                params.start_date = startDate;
                params.end_date = endDate;
            }
            if (filterKolektor) params.kolektor = filterKolektor;
            if (filterNoPenagihan) params.no_penagihan = filterNoPenagihan;
            if (filterNoInvoice) params.no_invoice = filterNoInvoice;

            const res = await api.get('/piutang/penerimaan-penagihan-kolektor', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load penerimaan penagihan:", err);
            Swal.fire('Error', 'Gagal memuat data penerimaan penagihan', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleResetFilter = () => {
        const d = new Date();
        setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
        setEndDate(new Date().toISOString().split('T')[0]);
        setFilterKolektor('');
        setFilterNoPenagihan('');
        setFilterNoInvoice('');
        fetchData(false);
    };

    // Buka Modal Pemilihan Dokumen Penagihan Aktif saat tombol Tambah diklik
    const handleOpenAdd = () => {
        const activeDocs = data.filter(d => d.arttih_batalyn !== 'Y');
        if (activeDocs.length === 1) {
            handleOpenConfirm(activeDocs[0]);
        } else if (activeDocs.length > 1) {
            setIsSelectDocModalOpen(true);
        } else {
            Swal.fire('Informasi', 'Tidak ada dokumen penagihan aktif yang siap diproses.', 'info');
        }
    };

    const handleOpenConfirm = async (item) => {
        try {
            setIsSelectDocModalOpen(false);
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get('/piutang/penerimaan-penagihan-kolektor/detail', {
                params: { id: item.arttih_id, pt_id: ptId },
                headers: { Authorization: `Bearer ${token}` }
            });

            setSelectedDoc(res.data?.data?.header || item);
            setDetailItems(res.data?.data?.details || []);
            setIsConfirmModalOpen(true);
        } catch (err) {
            console.error("Gagal detail penagihan:", err);
            Swal.fire('Error', 'Gagal memuat detail faktur penagihan', 'error');
        }
    };

    const handleToggleItemBayar = (index, status) => {
        setDetailItems(prev => {
            const updated = [...prev];
            updated[index].arttid_bayaryn = status;
            return updated;
        });
    };

    const handleNominalChange = (index, val) => {
        setDetailItems(prev => {
            const updated = [...prev];
            updated[index].arttid_bayarnominal = parseFloat(val) || 0;
            return updated;
        });
    };

    const handleKeteranganChange = (index, val) => {
        setDetailItems(prev => {
            const updated = [...prev];
            updated[index].arttid_keterangan = val;
            return updated;
        });
    };

    const handleSaveKonfirmasi = async () => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const payload = {
                no_penagihan: selectedDoc.arttih_id,
                items: detailItems.map(d => ({
                    invoice_id: d.arttid_artihid,
                    bayar_yn: d.arttid_bayaryn || 'N',
                    nominal: Number(d.arttid_bayarnominal || 0),
                    keterangan: d.arttid_keterangan || ''
                }))
            };

            await api.post('/piutang/penerimaan-penagihan-kolektor/konfirmasi', payload, {
                params: { pt_id: ptId },
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', 'Konfirmasi penerimaan penagihan kolektor berhasil disimpan', 'success');
            setIsConfirmModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Gagal konfirmasi penagihan:", err);
            Swal.fire('Error', 'Gagal menyimpan hasil penagihan', 'error');
        }
    };

    const columns = [
        {
            header: 'NO. PENAGIHAN',
            accessor: 'arttih_id',
            render: (item) => (
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {item.arttih_id}
                </span>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'arttih_tanggal_str',
            render: (item) => <span className="font-mono">{item.arttih_tanggal_str}</span>
        },
        {
            header: 'KOLEKTOR',
            accessor: 'kry_nama',
            render: (item) => <span className="font-bold">{item.kry_nama}</span>
        },
        {
            header: 'PROGRESS TAGIH',
            accessor: 'jumlah_invoice',
            render: (item) => (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                    {item.jumlah_terbayar || 0} / {item.jumlah_invoice || 0} Invoice
                </span>
            )
        },
        {
            header: 'TOTAL TAGIHAN',
            accessor: 'total_tagihan',
            render: (item) => (
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    Rp {Number(item.total_tagihan || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'TOTAL TERBAYAR',
            accessor: 'total_terbayar',
            render: (item) => (
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Rp {Number(item.total_terbayar || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'STATUS',
            accessor: 'arttih_batalyn',
            render: (item) => (
                item.arttih_batalyn === 'Y' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                        BATAL
                    </span>
                ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                        AKTIF
                    </span>
                )
            )
        }
    ];

    const renderCustomActions = (item) => (
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => handleOpenConfirm(item)}
                className="text-blue-500 hover:text-blue-700 transition cursor-pointer p-0.5"
                title="Konfirmasi Hasil Penagihan Kolektor"
            >
                <Edit3 size={17} />
            </button>
        </div>
    );

    const filterPanelContent = (
        <div className={`p-5 rounded-2xl border shadow-sm transition-all mb-4 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
                <div>
                    <label className={`block mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                        <Calendar size={13} /> DARI TANGGAL :
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                    />
                </div>
                <div>
                    <label className={`block mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                        <Calendar size={13} /> SAMPAI TANGGAL :
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                    />
                </div>
                <div>
                    <label className={`block mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                        <User size={13} /> NAMA KOLEKTOR :
                    </label>
                    <input
                        type="text"
                        placeholder="Ketik nama kolektor..."
                        value={filterKolektor}
                        onChange={(e) => setFilterKolektor(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl font-bold outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                    />
                </div>
                <div>
                    <label className={`block mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                        <FileText size={13} /> NO. PENAGIHAN :
                    </label>
                    <input
                        type="text"
                        placeholder="001/TAG/..."
                        value={filterNoPenagihan}
                        onChange={(e) => setFilterNoPenagihan(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-gray-700">
                <button
                    type="button"
                    onClick={handleResetFilter}
                    className="px-4 py-2 border rounded-xl font-bold text-xs flex items-center gap-1.5 transition text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                    <RotateCcw size={14} /> Reset
                </button>
                <button
                    type="button"
                    onClick={() => fetchData(true)}
                    disabled={loading}
                    className="px-6 py-2 bg-[#2563eb] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                    <Search size={15} /> {loading ? 'MEMUAT...' : 'CARI DATA'}
                </button>
            </div>
        </div>
    );

    return (
        <div
            className="space-y-4"
            onClickCapture={(e) => {
                const target = e.target;
                if (target.closest('button') && target.closest('button').innerText?.includes('Filter')) {
                    toggleFilterPanel();
                }
            }}
        >
            {showFilter && filterPanelContent}

            <DataTableTemplate
                title="PENERIMAAN PENAGIHAN KOLEKTOR"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleOpenAdd}
                onFilter={toggleFilterPanel}
                renderExtraActions={renderCustomActions}
            />

            {/* MODAL PILIH DOKUMEN PENAGIHAN UNTUK DISETOR */}
            {isSelectDocModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-2xl p-6 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] bg-white text-black border border-slate-300">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-300 mb-4">
                            <h3 className="text-base font-black uppercase text-black flex items-center gap-2 tracking-wide">
                                📋 PILIH DOKUMEN PENAGIHAN KOLEKTOR
                            </h3>
                            <button onClick={() => setIsSelectDocModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-black">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-2 overflow-y-auto max-h-96">
                            {data.filter(d => d.arttih_batalyn !== 'Y').map((doc) => (
                                <div
                                    key={doc.arttih_id}
                                    onClick={() => handleOpenConfirm(doc)}
                                    className="p-3.5 border border-slate-200 hover:border-blue-500 rounded-xl cursor-pointer transition hover:bg-blue-50/50 flex justify-between items-center"
                                >
                                    <div>
                                        <div className="font-mono font-bold text-blue-600">{doc.arttih_id}</div>
                                        <div className="text-xs text-slate-600 mt-0.5">
                                            Kolektor: <strong>{doc.kry_nama}</strong> | Tgl: {doc.arttih_tanggal_str}
                                        </div>
                                    </div>
                                    <div className="text-right font-mono">
                                        <div className="text-xs font-bold text-slate-800">
                                            {doc.jumlah_invoice} Invoice
                                        </div>
                                        <div className="text-xs text-emerald-600 font-bold">
                                            Rp {Number(doc.total_tagihan || 0).toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI PENERIMAAN HASIL TAGIH */}
            {isConfirmModalOpen && selectedDoc && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl p-6 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] bg-white text-black border border-slate-300">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-300 mb-4 print:hidden">
                            <h3 className="text-base font-black uppercase text-black flex items-center gap-2 tracking-wide">
                                <CheckSquare size={18} className="text-blue-600" /> KONFIRMASI HASIL PENAGIHAN KOLEKTOR
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-1.5 bg-[#0284c7] hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                                >
                                    <Printer size={15} /> Cetak Form
                                </button>
                                <button onClick={() => setIsConfirmModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-black hover:opacity-75">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 overflow-y-auto text-xs p-2 text-black">
                            <div className="border-b border-slate-300 pb-3 grid grid-cols-2 gap-y-1.5 font-mono">
                                <div>
                                    <strong className="text-slate-700">NO. MANIFEST : </strong>
                                    <span className="text-blue-600 font-bold ml-1">{selectedDoc.arttih_id}</span>
                                </div>
                                <div>
                                    <strong className="text-slate-700">TANGGAL PENUGASAN : </strong>
                                    <span className="font-bold text-black ml-1">
                                        {selectedDoc.arttih_tanggal ? new Date(selectedDoc.arttih_tanggal).toLocaleDateString('id-ID') : '-'}
                                    </span>
                                </div>
                                <div>
                                    <strong className="text-slate-700">PETUGAS KOLEKTOR : </strong>
                                    <span className="font-bold text-black ml-1">{selectedDoc.kry_nama}</span>
                                </div>
                                <div>
                                    <strong className="text-slate-700">STATUS MANIFEST : </strong>
                                    <span className="font-bold text-emerald-600 ml-1">AKTIF</span>
                                </div>
                            </div>

                            {/* Tabel Checklist Hasil Penagihan */}
                            <div className="space-y-2">
                                <div className="font-black uppercase tracking-wider text-[11px] text-black">
                                    CEKLIS STATUS PENAGIHAN FAKTUR INVOICE :
                                </div>
                                <div className="rounded-xl border border-slate-300 overflow-hidden">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-100 text-black border-b border-slate-300 font-black text-[11px] uppercase">
                                                <th className="p-2.5">No. Invoice</th>
                                                <th className="p-2.5">Customer</th>
                                                <th className="p-2.5 text-right">Nilai Tagihan</th>
                                                <th className="p-2.5 text-center w-36">Status Bayar</th>
                                                <th className="p-2.5 text-right w-36">Nominal Diterima</th>
                                                <th className="p-2.5">Keterangan / Alasan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white font-mono text-black font-semibold">
                                            {detailItems.map((d, idx) => (
                                                <tr key={idx} className={d.arttid_bayaryn === 'Y' ? 'bg-emerald-50/50' : ''}>
                                                    <td className="p-2.5 font-bold text-blue-600">{d.arttid_artihid}</td>
                                                    <td className="p-2.5 font-sans">{d.artih_custname}</td>
                                                    <td className="p-2.5 text-right">
                                                        Rp {Number(d.artih_total || 0).toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-50">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleItemBayar(idx, 'Y')}
                                                                className={`px-2.5 py-1 text-[10px] font-black rounded-md cursor-pointer transition ${d.arttid_bayaryn === 'Y' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-black'
                                                                    }`}
                                                            >
                                                                TERBAYAR
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleItemBayar(idx, 'N')}
                                                                className={`px-2.5 py-1 text-[10px] font-black rounded-md cursor-pointer transition ${d.arttid_bayaryn !== 'Y' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-black'
                                                                    }`}
                                                            >
                                                                PENDING
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-2.5 text-right">
                                                        <input
                                                            type="number"
                                                            disabled={d.arttid_bayaryn !== 'Y'}
                                                            value={d.arttid_bayarnominal || 0}
                                                            onChange={(e) => handleNominalChange(idx, e.target.value)}
                                                            className={`w-full p-1 border rounded text-right font-mono font-bold text-xs outline-none ${d.arttid_bayaryn === 'Y' ? 'border-emerald-400 bg-white text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-400'
                                                                }`}
                                                        />
                                                    </td>
                                                    <td className="p-2.5">
                                                        <input
                                                            type="text"
                                                            placeholder="Contoh: Janji bayar tgl 30..."
                                                            value={d.arttid_keterangan || ''}
                                                            onChange={(e) => handleKeteranganChange(idx, e.target.value)}
                                                            className="w-full p-1 border border-slate-300 rounded font-sans text-xs outline-none bg-white"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-100 font-black border-t border-slate-300 text-black">
                                                <td colSpan={4} className="p-2.5 text-right">TOTAL DITERIMA :</td>
                                                <td className="p-2.5 text-right font-mono text-emerald-700 text-sm font-black">
                                                    Rp {detailItems.reduce((acc, curr) => acc + (curr.arttid_bayaryn === 'Y' ? Number(curr.arttid_bayarnominal || 0) : 0), 0).toLocaleString('id-ID')}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-300 mt-4 print:hidden">
                            <button
                                type="button"
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 text-xs cursor-pointer"
                            >
                                Tutup
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveKonfirmasi}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                            >
                                <CheckCircle2 size={16} /> SIMPAN KONFIRMASI HASIL TAGIH
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PenerimaanPenagihanKolektor;