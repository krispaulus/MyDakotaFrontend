import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Search, CheckCircle2, Clock, X } from 'lucide-react';
import Swal from 'sweetalert2';

const LaporanLSBPV2 = () => {
    const { isDarkMode } = useDarkMode();
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States V2
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [filterTgla, setFilterTgla] = useState(firstDay);
    const [filterTgle, setFilterTgle] = useState(lastDay);
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterNobtt, setFilterNobtt] = useState('');
    const [filterNosj, setFilterNosj] = useState('');
    const [filterNosmu, setFilterNosmu] = useState('');
    const [filterService, setFilterService] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Modal Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        id: 0,
        cust_name: 'AA - ROBERT BOSCH - DB SCH',
        nodo: '',
        tanggal_handover: today.toISOString().split('T')[0],
        noskb: '',
        pickup_from: 'WH MARUNDA',
        keterangan: ''
    });

    // 1. FETCH DATA LAPORAN LSBP V2
    const fetchReport = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/laporan-lspb-v2/list', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    customer: filterCustomer,
                    nobtt: filterNobtt,
                    nosj: filterNosj,
                    nosmu: filterNosmu,
                    service: filterService,
                    status: filterStatus,
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data;
            setDataList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat Laporan LSBP V2:", err);
            setDataList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem saat memuat V2', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    // ➕ OPEN MODAL TAMBAH
    const handleAdd = () => {
        setIsEditMode(false);
        setFormData({
            id: 0,
            cust_name: 'AA - ROBERT BOSCH - DB SCH',
            nodo: '',
            tanggal_handover: new Date().toISOString().split('T')[0],
            noskb: '',
            pickup_from: 'WH MARUNDA',
            keterangan: ''
        });
        setIsModalOpen(true);
    };

    // 📝 OPEN MODAL EDIT
    const handleEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            id: item.id || 0,
            cust_name: item.cust_name || 'AA - ROBERT BOSCH - DB SCH',
            nodo: item.dn_od_sj || '',
            tanggal_handover: item.tanggal_handover ? item.tanggal_handover.split(' ')[0] : '',
            noskb: item.nomorbtt || item.no_skb || '',
            pickup_from: item.pickup_from || 'WH MARUNDA',
            keterangan: item.keterangan || ''
        });
        setIsModalOpen(true);
    };

    // 💾 SUBMIT SAVE / UPDATE
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nodo.trim()) {
            return Swal.fire('Peringatan', 'DN / OD / SJ Number wajib diisi!', 'warning');
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/operasional/laporan-lspb/save', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', `LSPB V2 Nomor ${formData.nodo} berhasil disimpan!`, 'success');
            setIsModalOpen(false);
            fetchReport();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data', 'error');
        }
    };

    // 🗑️ DELETE DATA LSBP V2
    const handleDelete = (item) => {
        const nodo = item.dn_od_sj;
        Swal.fire({
            title: 'Hapus Data LSBP V2?',
            text: `Apakah Anda yakin ingin menghapus data No. DN/OD/SJ: ${nodo}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/operasional/laporan-lspb/delete/${nodo}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Sukses', 'Data LSBP V2 berhasil dihapus', 'success');
                    fetchReport();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus data', 'error');
                }
            }
        });
    };

    // DEFINISI KOLOM TABEL V2
    const columns = [
        {
            header: 'DN / OD / SJ',
            accessor: 'dn_od_sj',
            render: (item) => <span className="font-mono font-bold text-indigo-600">{item.dn_od_sj || '-'}</span>
        },
        {
            header: 'NAMA CUSTOMER',
            accessor: 'cust_name',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.cust_name || '-'}</span>
        },
        {
            header: 'TGL HANDOVER',
            accessor: 'tanggal_handover',
            render: (item) => <span className="font-mono text-slate-600">{item.tanggal_handover || '-'}</span>
        },
        {
            header: 'NO. BTT',
            accessor: 'nomorbtt',
            render: (item) => <span className="font-mono font-bold text-slate-800">{item.nomorbtt || '-'}</span>
        },
        {
            header: 'KOTA TUJUAN',
            accessor: 'bttt_tujuan_kota',
            render: (item) => <span className="font-semibold text-slate-700 uppercase">{item.bttt_tujuan_kota || '-'}</span>
        },
        {
            header: 'SERVICE',
            accessor: 'serv_name',
            render: (item) => <span className="font-bold text-indigo-900 uppercase">{item.serv_name || '-'}</span>
        },
        {
            header: 'NO. MOBIL',
            accessor: 'no_mobil',
            render: (item) => <span className="font-mono font-bold text-slate-700 uppercase">{item.no_mobil || '-'}</span>
        },
        {
            header: 'JAM MASUK',
            accessor: 'jam_mobil_masuk',
            render: (item) => <span className="font-mono">{item.jam_mobil_masuk || '-'}</span>
        },
        {
            header: 'JAM KELUAR',
            accessor: 'jam_mobil_keluar',
            render: (item) => <span className="font-mono">{item.jam_mobil_keluar || '-'}</span>
        },
        {
            header: 'JAM TIBA',
            accessor: 'jam_mobil_tiba',
            render: (item) => <span className="font-mono">{item.jam_mobil_tiba || '-'}</span>
        },
        {
            header: 'KOLI',
            accessor: 'bttt_jml_unit',
            render: (item) => <span className="font-bold text-slate-800">{item.bttt_jml_unit}</span>
        },
        {
            header: 'BERAT',
            accessor: 'bttt_berat',
            render: (item) => <span className="font-bold text-indigo-700">{item.bttt_berat}</span>
        },
        {
            header: 'STATUS KIRIMAN',
            accessor: 'status_pengiriman',
            render: (item) => (
                item.tanggal_diterima ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full uppercase">
                        <CheckCircle2 size={12} /> DELIVERED
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full uppercase">
                        <Clock size={12} /> IN TRANSIT
                    </span>
                )
            )
        },
        {
            header: 'PENERIMA',
            accessor: 'nama_penerima',
            render: (item) => <span className="font-bold text-slate-700 uppercase">{item.nama_penerima || '-'}</span>
        },
    ];

    // Filter Client Search
    const filteredData = dataList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.dn_od_sj && item.dn_od_sj.toLowerCase().includes(q)) ||
            (item.cust_name && item.cust_name.toLowerCase().includes(q)) ||
            (item.nomorbtt && item.nomorbtt.toLowerCase().includes(q)) ||
            (item.bttt_tujuan_kota && item.bttt_tujuan_kota.toLowerCase().includes(q)) ||
            (item.no_mobil && item.no_mobil.toLowerCase().includes(q))
        );
    });

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS V2 */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">TGL HANDOVER AWAL</label>
                        <input
                            type="date"
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
                            value={filterTgla}
                            onChange={e => setFilterTgla(e.target.value)}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">TGL HANDOVER AKHIR</label>
                        <input
                            type="date"
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
                            value={filterTgle}
                            onChange={e => setFilterTgle(e.target.value)}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">NAMA CUSTOMER</label>
                        <input
                            type="text"
                            placeholder="CARI CUSTOMER..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none uppercase font-medium"
                            value={filterCustomer}
                            onChange={e => setFilterCustomer(e.target.value)}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">NO. DN / OD / SJ</label>
                        <input
                            type="text"
                            placeholder="NO. SURAT JALAN..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none uppercase font-medium"
                            value={filterNosj}
                            onChange={e => setFilterNosj(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">NO. BTT</label>
                        <input
                            type="text"
                            placeholder="NOMOR BTT..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none uppercase font-medium"
                            value={filterNobtt}
                            onChange={e => setFilterNobtt(e.target.value)}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">NO. SMU (UDARA)</label>
                        <input
                            type="text"
                            placeholder="NO. SMU..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none uppercase font-medium"
                            value={filterNosmu}
                            onChange={e => setFilterNosmu(e.target.value)}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">SERVICE</label>
                        <select
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none font-medium cursor-pointer"
                            value={filterService}
                            onChange={e => setFilterService(e.target.value)}
                        >
                            <option value="">SEMUA SERVICE</option>
                            <option value="1">DARAT</option>
                            <option value="2">LAUT</option>
                            <option value="3">UDARA</option>
                        </select>
                    </div>
                    <div className="col-span-3 flex items-end">
                        <button
                            onClick={fetchReport}
                            className="w-full h-[42px] bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition uppercase cursor-pointer"
                        >
                            <Search size={14} /> CARI V2 / REFRESH
                        </button>
                    </div>
                </div>
            </div>

            {/* TABLE TEMPLATE V2 */}
            <DataTableTemplate
                title="INFORMASI & LAPORAN LSBP V2"
                columns={columns}
                data={filteredData}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={handleAdd}
                onEdit={(item) => handleEdit(item)}
                onDelete={(item) => handleDelete(item)}
            />

            {/* MODAL INPUT / EDIT LSPB V2 */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden my-8">
                        <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
                            <h4 className="font-black text-sm uppercase tracking-wide">
                                {isEditMode ? `EDIT LSPB V2: ${formData.nodo}` : 'INPUT LSPB V2'}
                            </h4>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-slate-300 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block mb-1 text-slate-600 uppercase">NAMA CUSTOMER *</label>
                                <select
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white outline-none focus:border-indigo-600"
                                    value={formData.cust_name}
                                    onChange={e => setFormData({ ...formData, cust_name: e.target.value })}
                                >
                                    <option value="AA - ROBERT BOSCH - DB SCH">AA - ROBERT BOSCH - DB SCH</option>
                                    <option value="PT KIMIA FARMA / CUSTOMER">PT KIMIA FARMA / CUSTOMER</option>
                                    <option value="PT MERCK INDONESIA">PT MERCK INDONESIA</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">DN / OD / SJ NUMBER *</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={50}
                                        readOnly={isEditMode}
                                        className={`w-full p-2.5 border rounded-lg text-xs font-mono font-black ${isEditMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-amber-50 text-indigo-900 focus:border-indigo-600'}`}
                                        placeholder="50 CHARACTERS MAX..."
                                        value={formData.nodo}
                                        onChange={e => setFormData({ ...formData, nodo: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">TANGGAL HANDOVER</label>
                                    <input
                                        type="date"
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white outline-none focus:border-indigo-600"
                                        value={formData.tanggal_handover}
                                        onChange={e => setFormData({ ...formData, tanggal_handover: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">NOMOR BTT</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                                        placeholder="NOMOR BTT..."
                                        value={formData.noskb}
                                        onChange={e => setFormData({ ...formData, noskb: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600 uppercase">PICKUP FROM</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs uppercase"
                                        placeholder="LOKASI PICKUP..."
                                        value={formData.pickup_from}
                                        onChange={e => setFormData({ ...formData, pickup_from: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block mb-1 text-slate-600 uppercase">KETERANGAN</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs uppercase"
                                    placeholder="KETERANGAN..."
                                    value={formData.keterangan}
                                    onChange={e => setFormData({ ...formData, keterangan: e.target.value.toUpperCase() })}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 border text-slate-600 font-bold rounded-lg uppercase cursor-pointer hover:bg-slate-100"
                                >
                                    BATAL
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg uppercase shadow-md cursor-pointer"
                                >
                                    SIMPAN V2
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaporanLSBPV2;