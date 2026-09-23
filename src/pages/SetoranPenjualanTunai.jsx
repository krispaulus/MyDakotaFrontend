import React, { useState, useEffect } from 'react';
import { Search, Calendar, FileText, Building2, Layers, RefreshCw, Printer, Trash2, X, PlusCircle, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

export default function SetoranPenjualanTunai({ isDarkMode = false }) {
    const getTanggalBawaan = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const lastDay = String(new Date(y, d.getMonth() + 1, 0).getDate()).padStart(2, '0');
        return { awal: `${y}-${m}-01`, akhir: `${y}-${m}-${lastDay}` };
    };

    const defaultTanggal = getTanggalBawaan();

    const [dataList, setDataList] = useState([]);
    const [cabangOptions, setCabangOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);

    // Filter Form
    const [filter, setFilter] = useState({
        tgl_awal: defaultTanggal.awal,
        tgl_akhir: defaultTanggal.akhir,
        no_setor: '',
        cabang: '',
        no_lap: '',
        no_btt: ''
    });

    // Modal Tambah Setoran
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [formInput, setFormInput] = useState({
        tanggal: new Date().toISOString().split('T')[0],
        agen_id: '',
        btth_id: '',
        jumlah: '',
        keterangan: ''
    });
    const [lphOptions, setLphOptions] = useState([]);
    const [loadingLPH, setLoadingLPH] = useState(false);
    const [saving, setSaving] = useState(false);

    // Ambil opsi cabang
    useEffect(() => {
        const fetchCabang = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await api.get('/master/active-agen-list', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCabangOptions(res.data?.data || []);
            } catch (err) {
                console.error("Gagal memuat list cabang:", err);
            }
        };
        fetchCabang();
        fetchSetoran();
    }, []);

    const fetchSetoran = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/marketing/setoran-tunai', {
                params: filter,
                headers: { Authorization: `Bearer ${token}` }
            });
            setDataList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal mengambil data setoran tunai:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilter(prev => ({ ...prev, [name]: value }));
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchSetoran();
    };

    const handleResetFilter = () => {
        setFilter({
            tgl_awal: defaultTanggal.awal,
            tgl_akhir: defaultTanggal.akhir,
            no_setor: '',
            cabang: '',
            no_lap: '',
            no_btt: ''
        });
    };

    // Ambil LPH saat memilih cabang di form tambah
    const handleCabangFormChange = async (agenId) => {
        setFormInput(prev => ({ ...prev, agen_id: agenId, btth_id: '', jumlah: '' }));
        if (!agenId) {
            setLphOptions([]);
            return;
        }
        setLoadingLPH(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/marketing/setoran-tunai/available-lph?agen_id=${agenId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLphOptions(res.data?.data || []);
        } catch (err) {
            console.error("Gagal memuat LPH:", err);
            setLphOptions([]);
        } finally {
            setLoadingLPH(false);
        }
    };

    // Saat memilih LPH, otomatis isi nominal setoran
    const handleLPHChange = (noLPH) => {
        const chosen = lphOptions.find(item => item.no_lph === noLPH);
        setFormInput(prev => ({
            ...prev,
            btth_id: noLPH,
            jumlah: chosen ? chosen.total_tunai : ''
        }));
    };

    // Submit simpan setoran
    const handleSaveSetoran = async (e) => {
        e.preventDefault();
        if (!formInput.agen_id || !formInput.btth_id || !formInput.jumlah) {
            Swal.fire("Perhatian", "Lengkapi seluruh isian form!", "warning");
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/marketing/setoran-tunai', {
                ...formInput,
                jumlah: parseFloat(formInput.jumlah)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                icon: 'success',
                title: 'Berhasil Disimpan!',
                text: res.data?.message || 'Setoran Penjualan Tunai berhasil dibuat.',
                confirmButtonColor: '#10b981'
            });
            setIsAddOpen(false);
            setFormInput({
                tanggal: new Date().toISOString().split('T')[0],
                agen_id: '',
                btth_id: '',
                jumlah: '',
                keterangan: ''
            });
            fetchSetoran();
        } catch (err) {
            Swal.fire("Gagal", err.response?.data?.message || "Gagal menyimpan setoran", "error");
        } finally {
            setSaving(false);
        }
    };

    // Batalkan / Hapus setoran
    const handleDelete = (item) => {
        Swal.fire({
            title: "Batalkan Setoran Tunai?",
            text: `Yakin ingin membatalkan Kode Setoran: ${item.st_id}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            confirmButtonText: "Ya, Batalkan!",
            cancelButtonText: "Tutup"
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/marketing/setoran-tunai/${item.st_id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire("Sukses", "Setoran berhasil dibatalkan", "success");
                    fetchSetoran();
                } catch (err) {
                    Swal.fire("Gagal", err.response?.data?.message || "Gagal membatalkan", "error");
                }
            }
        });
    };

    // 7 Kolom sesuai sistem lawas (KODE SETORAN, TANGGAL, CABANG, KODE LAP. PENJUALAN, JUMLAH SETORAN, APPROVE, AKTIF)
    const columns = [
        {
            header: 'KODE SETORAN',
            accessor: 'st_id',
            render: (item) => (
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {item.st_id}
                </span>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'st_tanggal',
            render: (item) => (
                <span className="font-medium text-slate-700">
                    {item.st_tanggal ? new Date(item.st_tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                </span>
            )
        },
        {
            header: 'CABANG',
            accessor: 'agen_nama',
            render: (item) => <span className="font-bold text-slate-800 uppercase text-xs">{item.agen_nama}</span>
        },
        {
            header: 'KODE LAP. PENJUALAN',
            accessor: 'st_btthid',
            render: (item) => <span className="font-mono text-slate-600 text-xs">{item.st_btthid}</span>
        },
        {
            header: 'JUMLAH SETORAN',
            accessor: 'st_jumlah',
            render: (item) => (
                <span className="font-mono font-bold text-emerald-700 text-xs">
                    Rp {Number(item.st_jumlah || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'APPROVE',
            accessor: 'st_approveyn',
            render: (item) => (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${item.st_approveyn === 'Y'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-amber-100 text-amber-700 border border-amber-300'
                    }`}>
                    {item.st_approveyn === 'Y' ? 'Ya' : 'Belum'}
                </span>
            )
        },
        {
            header: 'AKTIF',
            accessor: 'st_aktifyn',
            render: (item) => (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${item.st_aktifyn === 'Y'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-rose-100 text-rose-700 border border-rose-300'
                    }`}>
                    {item.st_aktifyn === 'Y' ? 'Ya' : 'Tidak'}
                </span>
            )
        }
    ];

    return (
        <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-[#f8fafc] text-slate-800'}`}>
            {/* Header Judul */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md">
                    <Layers size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-wide uppercase">Setoran Penjualan Tunai</h1>
                    <p className="text-xs text-gray-400">Monitoring kas masuk hasil penjualan tunai harian cabang & kasir</p>
                </div>
            </div>

            {/* Panel Filter Sesuai Sistem Lawas */}
            {showFilter && (
                <form onSubmit={handleSearchSubmit} className={`p-6 rounded-2xl border mb-6 shadow-sm transition-all animate-in fade-in duration-200 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end text-xs font-bold">
                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5"><Calendar size={12} className="inline mr-1" /> Tanggal Start</label>
                            <input type="date" name="tgl_awal" value={filter.tgl_awal} onChange={handleInputChange} className="w-full h-11 px-3 border border-slate-200 rounded-xl font-bold text-emerald-600 outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5"><Calendar size={12} className="inline mr-1" /> Tanggal End</label>
                            <input type="date" name="tgl_akhir" value={filter.tgl_akhir} onChange={handleInputChange} className="w-full h-11 px-3 border border-slate-200 rounded-xl font-bold text-emerald-600 outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5"><FileText size={12} className="inline mr-1" /> Kode Setoran</label>
                            <input type="text" name="no_setor" value={filter.no_setor} onChange={handleInputChange} placeholder="STxxxxx..." className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 uppercase" />
                        </div>
                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5"><Building2 size={12} className="inline mr-1" /> Cabang / Agen</label>
                            <select name="cabang" value={filter.cabang} onChange={handleInputChange} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-semibold bg-white uppercase text-slate-700">
                                <option value="">-- SEMUA CABANG --</option>
                                {cabangOptions.map((c, idx) => (
                                    <option key={idx} value={c.agen_nama || c.Agen_Nama}>
                                        {(c.agen_nama || c.Agen_Nama || '').toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5"><FileText size={12} className="inline mr-1" /> Kode Lap. Penjualan</label>
                            <input type="text" name="no_lap" value={filter.no_lap} onChange={handleInputChange} placeholder="LPHxxxxx..." className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 uppercase" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 border-t pt-4 border-slate-100">
                        <button type="button" onClick={handleResetFilter} className="px-5 h-11 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 text-slate-600 transition-all text-xs cursor-pointer">Clear Filter</button>
                        <button type="submit" disabled={loading} className="px-6 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center gap-2 cursor-pointer">
                            {loading ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
                            {loading ? 'Memuat...' : 'Cari Data'}
                        </button>
                    </div>
                </form>
            )}

            {/* Tabel Template */}
            <div className="p-4 rounded-3xl border shadow-sm bg-white border-slate-100">
                <DataTableTemplate
                    title="SETORAN PENJUALAN TUNAI"
                    columns={columns}
                    data={Array.isArray(dataList) ? dataList : []}
                    loading={loading}
                    onAdd={() => setIsAddOpen(true)}
                    onEdit={(item) => Swal.fire("Info", `Edit Setoran: ${item.st_id}`, "info")}
                    onDelete={handleDelete}
                    onFilter={() => setShowFilter(prev => !prev)}
                />
            </div>

            {/* Modal Tambah Setoran */}
            {isAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="p-4 bg-emerald-600 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2 font-bold text-sm uppercase">
                                <PlusCircle size={18} />
                                <span>Tambah Setoran Penjualan Tunai</span>
                            </div>
                            <button type="button" onClick={() => setIsAddOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSetoran} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Tanggal Setor</label>
                                    <input
                                        type="date"
                                        required
                                        value={formInput.tanggal}
                                        onChange={(e) => setFormInput(prev => ({ ...prev, tanggal: e.target.value }))}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl font-bold outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Pilih Cabang / Agen</label>
                                    <select
                                        required
                                        value={formInput.agen_id}
                                        onChange={(e) => handleCabangFormChange(e.target.value)}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl font-bold outline-none focus:border-emerald-500 bg-white"
                                    >
                                        <option value="">-- Pilih Cabang --</option>
                                        {cabangOptions.map((c, idx) => (
                                            <option key={idx} value={c.agen_id || c.Agen_ID}>
                                                {(c.agen_nama || c.Agen_Nama || '').toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">Pilih Laporan Penjualan Harian (LPH)</label>
                                <select
                                    required
                                    disabled={!formInput.agen_id || loadingLPH}
                                    value={formInput.btth_id}
                                    onChange={(e) => handleLPHChange(e.target.value)}
                                    className="w-full h-10 px-3 border border-slate-200 rounded-xl font-bold outline-none focus:border-emerald-500 bg-white disabled:bg-slate-100"
                                >
                                    <option value="">
                                        {loadingLPH ? "Memuat LPH..." : "-- Pilih LPH Yang Akan Disetor --"}
                                    </option>
                                    {lphOptions.map((lph, idx) => (
                                        <option key={idx} value={lph.no_lph}>
                                            {lph.no_lph} - (Rp {Number(lph.total_tunai).toLocaleString('id-ID')} | {lph.jumlah_btt} BTT)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">Jumlah Setoran (Rp)</label>
                                <input
                                    type="number"
                                    required
                                    placeholder="0"
                                    value={formInput.jumlah}
                                    onChange={(e) => setFormInput(prev => ({ ...prev, jumlah: e.target.value }))}
                                    className="w-full h-10 px-3 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700 outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">Keterangan / Catatan</label>
                                <input
                                    type="text"
                                    placeholder="Keterangan setoran tunai..."
                                    value={formInput.keterangan}
                                    onChange={(e) => setFormInput(prev => ({ ...prev, keterangan: e.target.value }))}
                                    className="w-full h-10 px-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsAddOpen(false)} className="px-5 h-10 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 text-slate-600 cursor-pointer">
                                    Batal
                                </button>
                                <button type="submit" disabled={saving} className="px-6 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2">
                                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    {saving ? "Menyimpan..." : "Simpan Setoran"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}