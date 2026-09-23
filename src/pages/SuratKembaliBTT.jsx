import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Swal from 'sweetalert2';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { Plus, Trash2, Save, X, RefreshCw, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const SuratKembaliBTT = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Toggle Filter: Default terbuka (true)
    const [showFilter, setShowFilter] = useState(true);

    // State Monitoring Pop-up
    const [monitorData, setMonitorData] = useState([]);
    const [monitorTitle, setMonitorTitle] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(1); // 1 = Belum Retur, 2 = Outstanding BDB

    // State Modal Form Tambah Pengembalian BTT
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [submittingCreate, setSubmittingCreate] = useState(false);
    const [agenList, setAgenList] = useState([]);
    const [formCreate, setFormCreate] = useState({
        kb_eid: '',
        kb_tujuanagenid: '',
        kb_bdbid: '',
        input_btt: '',
        list_btt: []
    });

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

            const res = await api.get(`/operasional/kembali-btt/history`, {
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

    const fetchAgens = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/agens', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAgenList(res.data?.data || res.data || []);
        } catch (err) {
            console.error('Gagal mengambil daftar agen:', err);
        }
    };

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
            const res = await api.get(`/operasional/kembali-btt/${endpoint}`, {
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
        fetchAgens();
    }, []);

    const handleScannerKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            fetchHistoryKembaliBTT();
        }
    };

    const handleOpenCreateModal = () => {
        const autoNo = `KB-${Date.now().toString().slice(-8)}`;
        setFormCreate({
            kb_eid: autoNo,
            kb_tujuanagenid: '',
            kb_bdbid: '',
            input_btt: '',
            list_btt: []
        });
        setShowCreateModal(true);
    };

    const handleAddBttToList = (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            e.preventDefault();
            const val = formCreate.input_btt.trim().toUpperCase();
            if (!val) return;
            if (formCreate.list_btt.includes(val)) {
                Swal.fire('Perhatian', 'Nomor BTT sudah ada di dalam list!', 'warning');
                return;
            }
            setFormCreate(prev => ({
                ...prev,
                list_btt: [val, ...prev.list_btt],
                input_btt: ''
            }));
        }
    };

    const handleRemoveBtt = (bttToRemove) => {
        setFormCreate(prev => ({
            ...prev,
            list_btt: prev.list_btt.filter(b => b !== bttToRemove)
        }));
    };

    const handleSubmitCreate = async (e) => {
        e.preventDefault();
        if (!formCreate.kb_eid.trim()) {
            Swal.fire('Perhatian', 'Nomor Pengembalian wajib diisi!', 'warning');
            return;
        }
        if (!formCreate.kb_tujuanagenid) {
            Swal.fire('Perhatian', 'Pilih cabang tujuan pengembalian!', 'warning');
            return;
        }
        if (formCreate.list_btt.length === 0) {
            Swal.fire('Perhatian', 'Masukkan minimal 1 Nomor BTT retur!', 'warning');
            return;
        }

        setSubmittingCreate(true);
        try {
            const token = localStorage.getItem('token');
            await api.post('/operasional/kembali-btt', {
                kb_eid: formCreate.kb_eid.trim(),
                kb_tujuanagenid: formCreate.kb_tujuanagenid,
                kb_bdbid: formCreate.kb_bdbid.trim(),
                list_btt_id: formCreate.list_btt
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Berhasil', 'Dokumen Pengembalian BTT berhasil dibuat!', 'success');
            setShowCreateModal(false);
            fetchHistoryKembaliBTT();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan pengembalian BTT', 'error');
        } finally {
            setSubmittingCreate(false);
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
            {/* KARTU FILTER PENCARIAN & KONTROL RETUR */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm text-xs font-semibold overflow-hidden">
                {/* Header Judul (Selalu Tampil) */}
                <div className="p-4 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="bg-blue-600 text-white px-4 py-1.5 font-black text-xs rounded shadow-sm tracking-widest uppercase">
                        PROSES RETUR GUDANG ( PENGEMBALIAN BTT )
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold">
                        {showFilter ? 'Form Filter Terbuka' : 'Form Filter Tertutup'}
                    </span>
                </div>

                {/* Badan Input Filter: Buka-Tutup Mengikuti Tombol Filter Tabel */}
                {showFilter && (
                    <div className="p-6 space-y-6 animate-in fade-in duration-200">
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

                        {/* Tombol Monitoring & Aksi */}
                        <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => handleOpenMonitor(1)} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold transition cursor-pointer">
                                    📊 BTT TERIMA BELUM DIAJUKAN RETUR
                                </button>
                                <button onClick={() => handleOpenMonitor(2)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold transition cursor-pointer">
                                    🚨 DAFTAR RETUR OUTSTANDING (BELUM BDB)
                                </button>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto">
                                <button onClick={handleOpenCreateModal} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow hover:bg-emerald-700 transition duration-150 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                                    <Plus size={16} /> Buat Surat Kembali
                                </button>
                                <button onClick={fetchHistoryKembaliBTT} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition duration-150 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Tarik Data
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* TABEL DATA: Tombol filter di sini langsung mengontrol buka/tutup form di atas */}
            <DataTableTemplate
                title="DAFTAR HISTORY BERKAS RETUR BARANG (PENGEMBALIAN BTT)"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={false}
                onAdd={handleOpenCreateModal}
                onTambah={handleOpenCreateModal}
                onFilter={() => setShowFilter(prev => !prev)}
                onToggleFilter={() => setShowFilter(prev => !prev)}
                isFilterOpen={showFilter}
            />

            {/* Modal Create Pengembalian BTT */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                        <div className="p-4 bg-emerald-600 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Plus size={18} />
                                <h3 className="text-sm font-black uppercase tracking-wider">Buat Surat Pengembalian BTT Baru</h3>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-white hover:text-emerald-200 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitCreate} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-bold">
                                <div>
                                    <label className="text-slate-600 uppercase block mb-1">No. Pengembalian : *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formCreate.kb_eid}
                                        onChange={e => setFormCreate({ ...formCreate, kb_eid: e.target.value.toUpperCase() })}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 font-mono text-blue-600 uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-600 uppercase block mb-1">Cabang Tujuan Retur : *</label>
                                    <select
                                        required
                                        value={formCreate.kb_tujuanagenid}
                                        onChange={e => setFormCreate({ ...formCreate, kb_tujuanagenid: e.target.value })}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 bg-white uppercase font-bold"
                                    >
                                        <option value="">-- PILIH CABANG TUJUAN --</option>
                                        {agenList.map((a, i) => (
                                            <option key={i} value={a.agen_id || a.Agen_ID}>
                                                {(a.agen_nama || a.Agen_Nama || '').toUpperCase()} ({a.agen_id || a.Agen_ID})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="font-bold">
                                <label className="text-slate-600 uppercase block mb-1">No. BDB Keuangan (Opsional) :</label>
                                <input
                                    type="text"
                                    placeholder="Kosongkan jika belum terbit BDB..."
                                    value={formCreate.kb_bdbid}
                                    onChange={e => setFormCreate({ ...formCreate, kb_bdbid: e.target.value.toUpperCase() })}
                                    className="w-full h-10 px-3 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 uppercase"
                                />
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                <label className="text-slate-700 font-black uppercase block">Tembak / Scan No. BTT Retur :</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ketik / scan nomor resi BTT lalu Enter..."
                                        value={formCreate.input_btt}
                                        onChange={e => setFormCreate({ ...formCreate, input_btt: e.target.value })}
                                        onKeyDown={handleAddBttToList}
                                        className="flex-1 h-10 px-3 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 font-mono font-bold uppercase"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddBttToList}
                                        className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer transition text-xs"
                                    >
                                        Tambah BTT
                                    </button>
                                </div>

                                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden max-h-40 overflow-y-auto mt-2">
                                    {formCreate.list_btt.length === 0 ? (
                                        <div className="p-4 text-center text-slate-400 italic">Belum ada BTT yang ditambahkan ke surat retur ini.</div>
                                    ) : (
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                                                <tr>
                                                    <th className="p-2">No</th>
                                                    <th className="p-2">Nomor Resi BTT</th>
                                                    <th className="p-2 text-center">Hapus</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {formCreate.list_btt.map((btt, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="p-2 font-bold text-slate-400">{idx + 1}</td>
                                                        <td className="p-2 font-mono font-bold text-blue-600">{btt}</td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveBtt(btt)}
                                                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg uppercase cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingCreate}
                                    className="px-6 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg shadow-md uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {submittingCreate ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    {submittingCreate ? 'Menyimpan...' : 'Simpan Surat Kembali'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Pop-up Monitoring */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-sm font-extrabold tracking-wide text-gray-800">{monitorTitle}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer">✕</button>
                        </div>

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

                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition text-xs uppercase tracking-wider cursor-pointer">
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