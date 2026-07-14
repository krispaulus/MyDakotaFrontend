import React, { useState, useEffect } from 'react';
import { Search, Calendar, FileText, Layers, RefreshCw, Box, Printer, Edit3 } from 'lucide-react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
// 👑 KUNCI 1: Import form modal tambah kasta tertinggi bray!
import TambahProsesPacking from './TambahProsesPacking';

const ProsesPacking = ({ isDarkMode = false }) => {

    const getTanggalBawaan = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const lastDay = String(new Date(y, d.getMonth() + 1, 0).getDate()).padStart(2, '0');
        return { awal: `${y}-${m}-01`, akhir: `${y}-${m}-${lastDay}` };
    };

    const defaultTanggal = getTanggalBawaan();

    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);

    // 👑 KUNCI 2: State resmi penjaga pintu gerbang pop-up modal packing terdaftar aman!
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [filter, setFilter] = useState({
        tgl_awal: defaultTanggal.awal,
        tgl_akhir: defaultTanggal.akhir,
        no_pck: '',
        no_btt: ''
    });

    const fetchDataPacking = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/marketing/proses-packing', {
                params: filter,
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data && response.data.status === "success") {
                setDataList(response.data.data || []);
            } else {
                setDataList([]);
            }
        } catch (err) {
            console.error("Gagal memuat list proses packing:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDataPacking();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilter(prev => ({ ...prev, [name]: value }));
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchDataPacking();
    };

    const handleResetFilter = () => {
        setFilter({
            tgl_awal: defaultTanggal.awal,
            tgl_akhir: defaultTanggal.akhir,
            no_pck: '',
            no_btt: ''
        });
    };

    const columns = [
        {
            header: 'No. BTT / Resi',
            accessor: 'bttt_id',
            render: (item) => <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 text-xs">{item.bttt_id}</span>
        },
        {
            header: 'No. Packing',
            accessor: 'pck_id',
            render: (item) => <span className="font-mono font-bold text-slate-700 text-xs">{item.pck_id}</span>
        },
        {
            header: 'Cabang Asal',
            accessor: 'agen_nama',
            render: (item) => <span className="font-semibold text-slate-600 text-xs uppercase">{item.agen_nama}</span>
        },
        {
            header: 'Pengirim',
            accessor: 'bttt_asal_name',
            render: (item) => <span className="font-bold text-slate-800 text-xs uppercase">{item.bttt_asal_name}</span>
        },
        {
            header: 'Penerima',
            accessor: 'bttt_tujuan_nama',
            render: (item) => <span className="font-medium text-slate-700 text-xs uppercase">{item.bttt_tujuan_nama}</span>
        },
        {
            header: 'Kota Tujuan',
            accessor: 'bttt_tujuan_kota',
            render: (item) => <span className="badge bg-slate-100 text-slate-700 p-1.5 rounded-md text-xs font-bold uppercase">{item.bttt_tujuan_kota}</span>
        },
        {
            header: 'Isi Kiriman',
            accessor: 'pck_isikiriman',
            render: (item) => <span className="text-gray-500 italic text-xs">{item.pck_isikiriman || '---'}</span>
        },
        {
            header: 'Jml Asli',
            accessor: 'pck_jumlah',
            render: (item) => <span className="font-bold text-slate-900 text-xs">{item.pck_jumlah?.toLocaleString('id-ID')}</span>
        },
        {
            header: 'Jml Packing',
            accessor: 'pck_menjadi',
            render: (item) => <span className="font-bold text-emerald-600 text-xs">{item.pck_menjadi?.toLocaleString('id-ID')}</span>
        },
        {
            header: 'Approve',
            accessor: 'appjd',
            render: (item) => (
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${item.appjd === 'Ya' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {item.appjd}
                </span>
            )
        },
        {
            header: 'Aksi',
            accessor: 'actions',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => window.open(`pck_t_packing_proses_print.asp?b=${item.pck_id}`, '_blank')}
                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all border border-blue-100"
                        title="Print Manifes Packing"
                    >
                        <Printer size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => window.open(`pck_t_packing_proses_e.asp?b=${item.pck_id}`, '_self')}
                        className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-all border border-amber-100"
                        title="Edit Manifes Packing"
                    >
                        <Edit3 size={14} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-[#f8fafc] text-slate-800'}`}>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white rounded-xl shadow-md">
                    <Box size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-wide uppercase text-slate-900">Proses Packing Barang Kargo</h1>
                    <p className="text-xs text-slate-400 font-medium">Monitoring data bundling fisik barang kiriman logistik</p>
                </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="p-6 rounded-2xl border mb-6 shadow-sm bg-white border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs font-bold">
                    <div>
                        <label className="text-slate-500 uppercase block mb-1.5"><Calendar size={12} className="inline mr-1" /> Dari Tanggal</label>
                        <input type="date" name="tgl_awal" value={filter.tgl_awal} onChange={handleInputChange} className="w-full h-11 px-3 border border-slate-200 rounded-xl font-bold text-indigo-600 outline-none focus:border-indigo-500 transition-all" />
                    </div>
                    <div>
                        <label className="text-slate-500 uppercase block mb-1.5"><Calendar size={12} className="inline mr-1" /> Sampai Tanggal</label>
                        <input type="date" name="tgl_akhir" value={filter.tgl_akhir} onChange={handleInputChange} className="w-full h-11 px-3 border border-slate-200 rounded-xl font-bold text-indigo-600 outline-none focus:border-indigo-500 transition-all" />
                    </div>
                    <div>
                        <label className="text-slate-500 uppercase block mb-1.5"><Box size={12} className="inline mr-1" /> No. Packing</label>
                        <input type="text" name="no_pck" value={filter.no_pck} onChange={handleInputChange} placeholder="Ketik No. Packing..." className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all uppercase" />
                    </div>
                    <div>
                        <label className="text-slate-500 uppercase block mb-1.5"><FileText size={12} className="inline mr-1" /> No. BTT / Resi</label>
                        <input type="text" name="no_btt" value={filter.no_btt} onChange={handleInputChange} placeholder="Ketik No. BTT / Resi..." className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all uppercase" />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4 border-t pt-4 border-slate-100">
                    <button type="button" onClick={handleResetFilter} className="px-5 h-11 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 text-slate-600 transition-all text-xs">Clear Filter</button>
                    <button type="submit" disabled={loading} className="px-6 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center gap-2">
                        {loading ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
                        {loading ? 'Memuat...' : 'Cari Data'}
                    </button>
                </div>
            </form>

            <div className="p-4 rounded-3xl border shadow-sm bg-white border-slate-100">
                <DataTableTemplate
                    title="PROSES PACKING BARANG"
                    columns={columns}
                    data={Array.isArray(dataList) ? dataList : []}
                    loading={loading}
                    // 👑 MENGAKTIFKAN PEMICU MODAL YANG VALID TANPA TYPO BRAY!
                    onAdd={() => setIsFormOpen(true)}
                />
            </div>

            {/* ========================================================================= */}
            {/* 👑 POP-UP MODAL SELEKSI ANTRIAN NO BTT PACKING DAKOTA CARGO */}
            {/* ========================================================================= */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[#f8fafc] rounded-2xl w-full max-w-lg shadow-2xl relative border border-slate-100 p-2">
                        <TambahProsesPacking
                            isDarkMode={isDarkMode}
                            onClose={() => {
                                setIsFormOpen(false); // Fungsi menutup modal bray
                                fetchDataPacking(); // Segarkan isi tabel data master
                            }}
                        />
                    </div>
                </div>
            )}

        </div>
    );
};

export default ProsesPacking;