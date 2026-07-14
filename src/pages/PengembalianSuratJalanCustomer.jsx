import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, FileText, User, Layers, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import TambahPengembalianSuratJalan from './TambahPengembalianSuratJalan';

const PengembalianSuratJalanCustomer = ({ isDarkMode = false }) => {
    const navigate = useNavigate();

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

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [filter, setFilter] = useState({
        tgl_awal: defaultTanggal.awal,
        tgl_akhir: defaultTanggal.akhir,
        customer_name: '',
        document_id: '',
        no_sj: ''
    });

    const fetchDataPengembalian = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/marketing/kembali-sj', {
                params: filter,
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data && response.data.status === "success") {
                setDataList(response.data.data || []);
            } else {
                setDataList([]);
            }
        } catch (err) {
            console.error("Gagal memuat list pengembalian SJ:", err);
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDataPengembalian();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilter(prev => ({ ...prev, [name]: value }));
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchDataPengembalian();
    };

    const handleResetFilter = () => {
        setFilter({
            tgl_awal: defaultTanggal.awal,
            tgl_akhir: defaultTanggal.akhir,
            customer_name: '',
            document_id: '',
            no_sj: ''
        });
    };

    const columns = [
        {
            header: 'No. Dokumen',
            accessor: 'mkt_t_kembalisj_id',
            render: (item) => <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{item.mkt_t_kembalisj_id}</span>
        },
        {
            header: 'Tanggal Transaksi',
            accessor: 'mkt_t_kembalisj_tanggal',
            render: (item) => <span className="font-medium">{new Date(item.mkt_t_kembalisj_tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        },
        {
            header: 'Cust ID',
            accessor: 'mkt_t_kembalisj_custid',
            render: (item) => <span className="badge bg-slate-100 text-slate-700 p-1.5 rounded-md text-xs font-mono font-bold">[{item.mkt_t_kembalisj_custid}]</span>
        },
        {
            header: 'Nama Customer',
            accessor: 'cust_name',
            render: (item) => <span className="font-bold text-slate-800 uppercase tracking-wide text-xs">{item.cust_name || 'UMUM / CASH'}</span>
        },
        {
            header: 'Keterangan Memo',
            accessor: 'mkt_t_kembalisj_keterangan',
            render: (item) => <span className="text-gray-500 italic text-xs">{item.mkt_t_kembalisj_keterangan || '---'}</span>
        },
        {
            header: 'Petugas Penerima',
            accessor: 'mkt_t_kembalisj_diterima',
            render: (item) => <span className="font-semibold text-teal-700 flex items-center gap-1 text-xs"><User size={12} /> {item.mkt_t_kembalisj_diterima || 'ADMIN'}</span>
        }
    ];

    return (
        <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-[#f8fafc] text-slate-800'}`}>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
                    <FileText size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-wide uppercase">Pengembalian Surat Jalan Customer</h1>
                    <p className="text-xs text-gray-400">Monitoring histori serah terima berkas surat jalan logistik kargo</p>
                </div>
            </div>

            <form onSubmit={handleSearchSubmit} className={`p-6 rounded-2xl border mb-6 shadow-sm transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end text-xs font-bold">
                    <div>
                        <label className="text-slate-500 uppercase block mb-1.5"><Calendar size={12} className="inline mr-1" /> Dari Tanggal</label>
                        <input type="date" name="tgl_awal" value={filter.tgl_awal} onChange={handleInputChange} className="w-full h-11 px-3 border border-slate-200 rounded-xl font-bold text-indigo-600 outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="text-slate-500 uppercase block mb-1.5"><Calendar size={12} className="inline mr-1" /> Sampai Tanggal</label>
                        <input type="date" name="tgl_akhir" value={filter.tgl_akhir} onChange={handleInputChange} className="w-full h-11 px-3 border border-slate-200 rounded-xl font-bold text-indigo-600 outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="text-slate-500 uppercase block mb-1.5"><User size={12} className="inline mr-1" /> Nama Customer</label>
                        <input type="text" name="customer_name" value={filter.customer_name} onChange={handleInputChange} placeholder="Ketik PT / Toko..." className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 uppercase" />
                    </div>
                    <div>
                        <label className="text-slate-500 uppercase block mb-1.5"><FileText size={12} className="inline mr-1" /> No. Pengembalian</label>
                        <input type="text" name="document_id" value={filter.document_id} onChange={handleInputChange} placeholder="KMB/xxxx/xx" className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 uppercase" />
                    </div>
                    <div>
                        <label className="text-slate-500 uppercase block mb-1.5"><Layers size={12} className="inline mr-1" /> No. Surat Jalan / Resi</label>
                        <input type="text" name="no_sj" value={filter.no_sj} onChange={handleInputChange} placeholder="DK 1301533..." className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 uppercase" />
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
                    title="Pengembalian SURAT JALAN"
                    columns={columns}
                    data={Array.isArray(dataList) ? dataList : []}
                    loading={loading}
                    // 👑 ON ADD: Sekarang menyalakan pop-up modal bray!
                    onAdd={() => setIsFormOpen(true)}
                    onEdit={() => setIsFormOpen(true)}
                    onDelete={() => { }}
                />
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#f8fafc] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-100 p-2 animate-in zoom-in-95 duration-200">
                        <TambahPengembalianSuratJalan
                            isDarkMode={isDarkMode}
                            onClose={() => {
                                setIsFormOpen(false); // Fungsi menutup pop-up
                                fetchDataPengembalian(); // Auto refresh data tabel master
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PengembalianSuratJalanCustomer;