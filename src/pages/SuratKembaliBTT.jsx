import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import DataTableTemplate from '../components/organisms/DataTableTemplate';

const SuratKembaliBTT = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // State tambahan untuk fungsi monitoring pop-up data
    const [monitorData, setMonitorData] = useState([]);
    const [monitorTitle, setMonitorTitle] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(1); // 1 = Belum Retur, 2 = Outstanding BDB

    const hariIni = new Date().toISOString().split('T')[0];
    const [filterParams, setFilterParams] = useState({
        use_tanggal: true,
        tanggal_awal: hariIni,
        tanggal_akhir: hariIni,
        use_no_kembali: false,
        no_kembali: '',
        use_no_btt: false,
        no_btt: ''
    });

    const fetchHistoryKembaliBTT = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const queryParams = {};
            if (filterParams.use_tanggal) {
                queryParams.tgl_awal = filterParams.tanggal_awal;
                queryParams.tgl_akhir = filterParams.tanggal_akhir;
            }
            if (filterParams.use_no_kembali) queryParams.no_kembali = filterParams.no_kembali;
            if (filterParams.use_no_btt) queryParams.no_btt = filterParams.no_btt;

            const res = await axios.get(`http://localhost:8080/api/operasional/kembali-btt/history`, {
                params: queryParams,
                headers: { Authorization: `Bearer ${token}` }
            });

            const mappedData = (res.data || []).map((item, idx) => ({ ...item, generated_id: idx + 1 }));
            setData(mappedData);
        } catch (err) {
            Swal.fire('ERROR', 'Gagal memuat data retur dari server', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ⚡ AJAK HANDLER UNTUK MODAL MONITORING REAL-TIME
    const handleOpenMonitor = async (type) => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const endpoint = type === 1
            ? 'monitor-belum-kembali'
            : 'monitor-outstanding-bdb';

        setMonitorTitle(type === 1
            ? '📊 DAFTAR BTT YANG SUDAH TERIMA TAPI BELUM DIAJUKAN RETUR'
            : '🚨 DAFTAR DOKUMEN RETUR YANG OUTSTANDING (BELUM TERBIT BDB)'
        );
        setModalType(type);

        try {
            const res = await axios.get(`http://localhost:8080/api/operasional/kembali-btt/${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMonitorData(res.data || []);
            setShowModal(true);
        } catch (err) {
            Swal.fire('ERROR', 'Gagal memuat data monitoring kontrol', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistoryKembaliBTT();
    }, []);

    const handleScannerKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            fetchHistoryKembaliBTT();
        }
    };

    const columns = [
        { header: 'No Urut', accessor: 'generated_id' },
        { header: 'NO. PENGEMBALIAN', accessor: 'kb_eid', render: (item) => <span className="font-black text-blue-600 tracking-wider">{item.kb_eid}</span> },
        { header: 'TANGGAL RETUR', accessor: 'kb_tanggal' },
        { header: 'CABANG TUJUAN KEMBALI', accessor: 'agen_nama_tujuan' },
        { header: 'PETUGAS PEMBUAT', accessor: 'kb_updateid' },
        { header: 'JUMLAH BTT RETUR', accessor: 'jumlah_btt_retur', render: (item) => <span className="font-bold text-gray-700">{item.jumlah_btt_retur} Koli</span> },
        {
            header: 'NO. BDB (KEUANGAN)',
            accessor: 'kb_bdbid',
            render: (item) => (
                <span className={`font-extrabold tracking-wider ${item.kb_bdbid ? 'text-emerald-600' : 'text-amber-600 animate-pulse'}`}>
                    {item.kb_bdbid ? item.kb_bdbid : '⚠️ OUTSTANDING (BELUM BDB)'}
                </span>
            )
        },
        { header: 'STATUS', accessor: 'kb_aktifyn', render: (item) => <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.kb_aktifyn === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{item.kb_aktifyn === 'Y' ? 'AKTIF' : 'BATAL'}</span> },
    ];

    return (
        <div className="space-y-6 text-slate-800">
            <div className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm text-xs font-semibold">
                <div className="text-center mb-6">
                    <span className="bg-blue-600 text-white px-6 py-2 font-black text-sm rounded shadow-sm tracking-widest uppercase">
                        PROSES RETUR GUDANG ( PENGEMBALIAN BTT )
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-400">
                            <input type="checkbox" checked={filterParams.use_tanggal} onChange={e => setFilterParams({ ...filterParams, use_tanggal: e.target.checked })} className="rounded text-blue-600 focus:ring-0" />
                            Tanggal Retur
                        </label>
                        <div className="flex gap-2 items-center">
                            <input type="date" value={filterParams.tanggal_awal} disabled={!filterParams.use_tanggal} onChange={e => setFilterParams({ ...filterParams, tanggal_awal: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40 text-blue-600 font-bold" />
                            <span className="text-gray-400 font-bold">s/d</span>
                            <input type="date" value={filterParams.tanggal_akhir} disabled={!filterParams.use_tanggal} onChange={e => setFilterParams({ ...filterParams, tanggal_akhir: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40 text-blue-600 font-bold" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-400">
                            <input type="checkbox" checked={filterParams.use_no_kembali} onChange={e => setFilterParams({ ...filterParams, use_no_kembali: e.target.checked })} className="rounded text-blue-600 focus:ring-0" />
                            Scan No. Pengembalian
                        </label>
                        <input type="text" placeholder="Tembak Barcode Dokumen..." value={filterParams.no_kembali} disabled={!filterParams.use_no_kembali} onChange={e => setFilterParams({ ...filterParams, no_kembali: e.target.value })} onKeyDown={handleScannerKeyPress} className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40 uppercase font-bold tracking-wider text-blue-600 focus:border-blue-500" />
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer uppercase tracking-wider text-slate-400">
                            <input type="checkbox" checked={filterParams.use_no_btt} onChange={e => setFilterParams({ ...filterParams, use_no_btt: e.target.checked })} className="rounded text-blue-600 focus:ring-0" />
                            Scan No. BTT (Resi Gagal)
                        </label>
                        <input type="text" placeholder="Tembak Barcode Resi..." value={filterParams.no_btt} disabled={!filterParams.use_no_btt} onChange={e => setFilterParams({ ...filterParams, no_btt: e.target.value })} onKeyDown={handleScannerKeyPress} className="w-full p-2 border border-gray-300 rounded bg-transparent outline-none disabled:opacity-40 uppercase font-bold tracking-wider text-blue-600 focus:border-blue-500" />
                    </div>
                </div>

                {/* 🎯 LINK AKTIF MONITORING SISTEM TERGANTI */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleOpenMonitor(1)} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold transition">
                            📊 BTT TERIMA BELUM DIAJUKAN RETUR
                        </button>
                        <button onClick={() => handleOpenMonitor(2)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold transition">
                            🚨 DAFTAR RETUR OUTSTANDING (BELUM BDB)
                        </button>
                    </div>
                    <button onClick={fetchHistoryKembaliBTT} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition duration-150 uppercase tracking-wider w-full md:w-auto">
                        Tarik Data
                    </button>
                </div>
            </div>

            <DataTableTemplate title="DAFTAR HISTORY BERKAS RETUR BARANG (PENGEMBALIAN BTT)" columns={columns} data={data} loading={loading} isDarkMode={false} />

            {/* =========================================================================
                🏙️ MODAL POP-UP MONITORING: GRID THEME LIGHT TRANSPARENT HIGH QUALITY
                ========================================================================= */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
                        {/* Header Modal */}
                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-sm font-extrabold tracking-wide text-gray-800">{monitorTitle}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
                        </div>

                        {/* Body / Data Grid Modal */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {monitorData.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 font-medium text-sm">✓ Seluruh data bersih, tidak ada transaksi outstanding!</div>
                            ) : (
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-blue-50/70 text-blue-900 font-bold border-b border-blue-100 uppercase tracking-wider">
                                            <th className="p-3">No</th>
                                            {modalType === 1 ? (
                                                <>
                                                    <th className="p-3">No. BTT (Resi)</th>
                                                    <th className="p-3">Tanggal Terima</th>
                                                    <th className="p-3">Manifes Asal (SP)</th>
                                                    <th className="p-3">Keterangan Bongkar</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="p-3">No. Pengembalian</th>
                                                    <th className="p-3">Tanggal Retur</th>
                                                    <th className="p-3">Cabang Tujuan</th>
                                                    <th className="p-3">Petugas Pembuat</th>
                                                    <th className="p-3 text-center">Jumlah Koli</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-600">
                                        {monitorData.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="p-3 font-bold text-gray-400">{idx + 1}</td>
                                                {modalType === 1 ? (
                                                    <>
                                                        <td className="p-3 font-extrabold text-blue-600">{item.btt_id}</td>
                                                        <td className="p-3">{item.tanggal_terima}</td>
                                                        <td className="p-3 font-semibold">{item.no_sp}</td>
                                                        <td className="p-3 text-gray-400 italic">{item.keterangan_bongkar}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-3 font-extrabold text-red-600">{item.no_pengembalian}</td>
                                                        <td className="p-3">{item.tanggal_retur}</td>
                                                        <td className="p-3 font-semibold">{item.agen_tujuan_nama}</td>
                                                        <td className="p-3">{item.pembuat}</td>
                                                        <td className="p-3 text-center font-bold text-gray-800">{item.jumlah_btt} Koli</td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer Modal */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition text-xs uppercase tracking-wider">
                                Tutup Berkas
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuratKembaliBTT;