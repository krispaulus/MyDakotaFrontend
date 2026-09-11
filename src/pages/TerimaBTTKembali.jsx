import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, Search, RefreshCw, Printer, Plus, Trash2, X, CheckCircle2, XCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const TerimaBTTKembali = () => {
    const { isDarkMode } = useDarkMode();
    const today = new Date().toISOString().split('T')[0];

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Opsi Filter
    const [kotaList, setKotaList] = useState([]);
    const [custList, setCustList] = useState([]);

    // Filter States
    const [useTanggal, setUseTanggal] = useState(true);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [noBTT, setNoBTT] = useState('');
    const [pembayaran, setPembayaran] = useState('0');
    const [selectedKota, setSelectedKota] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState('');

    // Form Tambah
    const [formBTTID, setFormBTTID] = useState('');
    const [formTglKembali, setFormTglKembali] = useState(today);

    const activeAgenId = localStorage.getItem('active_agen_id') || localStorage.getItem('agen_id') || '001';

    const fetchDropdowns = async () => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const [resKota, resCust] = await Promise.all([
                api.get(`/terima-btt/combo-kota?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/gl/customers?limit=1000', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setKotaList(resKota.data?.data || []);
            setCustList(resCust.data?.data || []);
        } catch (err) {
            console.error("Gagal load opsi filter:", err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            let url = `/terima-btt/data?pt_id=${ptId}&use_tanggal=${useTanggal}&start_date=${startDate}&end_date=${endDate}&agen_id=${activeAgenId}`;
            if (noBTT) url += `&no_btt=${encodeURIComponent(noBTT)}`;
            if (pembayaran !== '0') url += `&pembayaran=${pembayaran}`;
            if (selectedKota) url += `&kota=${encodeURIComponent(selectedKota)}`;
            if (selectedCustomer) url += `&customer=${encodeURIComponent(selectedCustomer)}`;

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load data terima BTT:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDropdowns();
        fetchData();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formBTTID.trim()) {
            Swal.fire('Peringatan', 'Nomor BTT wajib diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const payload = {
                btt_id: formBTTID.trim(),
                tgl_kembali: formTglKembali,
                agen_id: activeAgenId
            };

            await api.post(`/terima-btt/save?pt_id=${ptId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Berhasil!', 'Bukti BTT kembali berhasil disimpan.', 'success');
            setIsAddModalOpen(false);
            setFormBTTID('');
            fetchData();
        } catch (err) {
            Swal.fire('Gagal!', err.response?.data?.error || 'Gagal menyimpan data.', 'error');
        }
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Nonaktifkan Bukti Terima?',
            text: `Nomor BTT ${item.tb_bttid} akan ditandai non-aktif.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Nonaktifkan',
            cancelButtonText: 'Batal'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const ptId = localStorage.getItem('pt_id') || 'C';

                    await api.delete(`/terima-btt/${encodeURIComponent(item.tb_bttid)}?pt_id=${ptId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Berhasil!', 'Data BTT berhasil dinonaktifkan.', 'success');
                    fetchData();
                } catch (err) {
                    Swal.fire('Gagal!', err.response?.data?.error || 'Gagal menghapus.', 'error');
                }
            }
        });
    };

    const columns = [
        {
            header: 'NO. BTT',
            accessor: 'tb_bttid',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.tb_bttid}</span>
        },
        {
            header: 'TGL. KEMBALI',
            accessor: 'tb_tglkembali',
            render: (item) => <span className="font-mono text-slate-700">{item.tb_tglkembali}</span>
        },
        {
            header: 'TGL. BTT',
            accessor: 'bttt_tanggal',
            render: (item) => <span className="font-mono text-slate-500">{item.bttt_tanggal}</span>
        },
        {
            header: 'CUSTOMER / PENGIRIM',
            accessor: 'cust_name',
            render: (item) => <span className="font-bold text-slate-800">{item.cust_name}</span>
        },
        {
            header: 'KOTA TUJUAN',
            accessor: 'bttt_tujuankota',
            render: (item) => <span>{item.bttt_tujuankota}</span>
        },
        {
            header: 'PEMBAYARAN',
            accessor: 'bttt_pembayaran',
            render: (item) => {
                const val = String(item.bttt_pembayaran || '1').trim();
                if (val === '1' || val.toUpperCase() === 'TUNAI') return <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">TUNAI</span>;
                if (val === '2' || val.toUpperCase() === 'KREDIT') return <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded text-[10px] border border-sky-200">KREDIT</span>;
                return <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] border border-amber-200">TAGIH TUJUAN</span>;
            }
        },
        {
            header: 'TOTAL HARGA (RP)',
            accessor: 'total_harga',
            render: (item) => <span className="font-mono font-bold text-rose-600">Rp {Number(item.total_harga || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'NO. SURAT JALAN',
            accessor: 'bttt_nosuratjalan',
            render: (item) => <span className="font-mono text-slate-600">{item.bttt_nosuratjalan || '-'}</span>
        },
        {
            header: 'STATUS',
            accessor: 'tb_aktifyn',
            render: (item) => item.tb_aktifyn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> AKTIF
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">
                    <XCircle size={12} /> NON-AKTIF
                </span>
            )
        }
    ];

    const addModal = isAddModalOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs transition-opacity" style={{ zIndex: 1000 }}>
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-slate-800'}`}>
                <div className="px-6 py-3.5 bg-blue-600 text-white flex items-center justify-between">
                    <span className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                        <Plus size={18} /> CATAT PENERIMAAN BTT KEMBALI
                    </span>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer"><X size={20} /></button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
                    <div>
                        <label className="font-bold text-slate-600 block mb-1">TANGGAL KEMBALI :</label>
                        <input
                            type="date"
                            value={formTglKembali}
                            onChange={(e) => setFormTglKembali(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="font-bold text-slate-600 block mb-1">NOMOR RESI BTT :</label>
                        <input
                            type="text"
                            placeholder="Ketik atau scan nomor resi BTT..."
                            value={formBTTID}
                            onChange={(e) => setFormBTTID(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl uppercase transition cursor-pointer"
                        >
                            BATAL
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl uppercase transition cursor-pointer shadow-md"
                        >
                            SIMPAN
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            if (isMounted) {
                await fetchDropdowns().catch(console.error);
                await fetchData().catch(console.error);
            }
        };

        init();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="space-y-5">
            {showFilter && (
                <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER PENERIMAAN BTT KEMBALI
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AWAL</label>
                                <input
                                    type="date"
                                    disabled={!useTanggal}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${!useTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300'}`}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AKHIR</label>
                                <input
                                    type="date"
                                    disabled={!useTanggal}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${!useTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300'}`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. BTT</label>
                            <input
                                type="text"
                                placeholder="Nomor BTT..."
                                value={noBTT}
                                onChange={(e) => setNoBTT(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">PEMBAYARAN</label>
                            <select
                                value={pembayaran}
                                onChange={(e) => setPembayaran(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none"
                            >
                                <option value="0">-- SEMUA PEMBAYARAN --</option>
                                <option value="1">Tunai</option>
                                <option value="2">Kredit</option>
                                <option value="3">Tagih Tujuan</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">KOTA TUJUAN</label>
                            <select
                                value={selectedKota}
                                onChange={(e) => setSelectedKota(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none"
                            >
                                <option value="">-- SEMUA KOTA --</option>
                                {kotaList.map((k, idx) => (
                                    <option key={idx} value={k.kota_name}>{k.kota_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-500 block mb-1">PENGIRIM / CUSTOMER</label>
                            <select
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none"
                            >
                                <option value="">-- SEMUA CUSTOMER --</option>
                                {custList.map((c, idx) => (
                                    <option key={idx} value={c.cust_name}>{c.cust_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 mt-5">
                                <input
                                    type="checkbox"
                                    checked={useTanggal}
                                    onChange={(e) => setUseTanggal(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded"
                                />
                                Aktifkan Filter Tanggal
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer"
                        >
                            <Printer size={14} /> Cetak Grid
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw size={14} /> REFRESH DATA
                        </button>
                    </div>
                </form>
            )}

            <DataTableTemplate
                title="PENERIMAAN BTT KEMBALI"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onFilter={() => setShowFilter(prev => !prev)}
                onAdd={() => setIsAddModalOpen(true)}
                onDelete={handleDelete}
            />

            {addModal && ReactDOM.createPortal(addModal, document.body)}
        </div>
    );
};

export default TerimaBTTKembali;