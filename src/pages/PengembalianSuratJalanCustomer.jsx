import React, { useState, useEffect } from 'react';
import { Search, Calendar, FileText, User, Layers, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import TambahPengembalianSuratJalan from './TambahPengembalianSuratJalan';

const PengembalianSuratJalanCustomer = ({ isDarkMode = false }) => {
    const getTanggalBawaan = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const lastDay = String(new Date(y, d.getMonth() + 1, 0).getDate()).padStart(2, '0');
        return { awal: `${y}-${m}-01`, akhir: `${y}-${m}-${lastDay}` };
    };

    const defaultTanggal = getTanggalBawaan();

    const [dataList, setDataList] = useState([]);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [filter, setFilter] = useState({
        tgl_awal: defaultTanggal.awal,
        tgl_akhir: defaultTanggal.akhir,
        customer_name: '',
        document_id: '',
        no_sj: ''
    });

    // Ambil daftar customer untuk dropdown filter
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await api.get('/customer', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data && response.data.status === "success") {
                    setCustomerOptions(response.data.data || []);
                }
            } catch (err) {
                console.error("Gagal memuat opsi customer:", err);
            }
        };
        fetchCustomers();
    }, []);

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

    // 8 Kolom persis sistem lawas ASP
    const columns = [
        {
            header: 'NO. PENGEMBALIAN',
            accessor: 'mkt_t_kembalisj_id',
            render: (item) => (
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {item.mkt_t_kembalisj_id}
                </span>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'mkt_t_kembalisj_tanggal',
            render: (item) => (
                <span className="font-medium text-slate-700">
                    {item.mkt_t_kembalisj_tanggal
                        ? new Date(item.mkt_t_kembalisj_tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : '-'}
                </span>
            )
        },
        {
            header: 'CUSTOMER/PELANGGAN',
            accessor: 'cust_name',
            render: (item) => (
                <span className="font-bold text-slate-800 uppercase text-xs">
                    {item.cust_name || 'UMUM / CASH'}
                </span>
            )
        },
        {
            header: 'KETERANGAN',
            accessor: 'mkt_t_kembalisj_keterangan',
            render: (item) => (
                <span className="text-slate-600 text-xs">
                    {item.mkt_t_kembalisj_keterangan || '-'}
                </span>
            )
        },
        {
            header: 'DIBUAT OLEH',
            accessor: 'mkt_t_kembalisj_updateid',
            render: (item) => (
                <span className="font-semibold text-slate-700 uppercase text-xs">
                    {item.mkt_t_kembalisj_updateid || '-'}
                </span>
            )
        },
        {
            header: 'DITERIMA OLEH',
            accessor: 'mkt_t_kembalisj_diterima',
            render: (item) => (
                <span className="font-semibold text-teal-700 uppercase text-xs">
                    {item.mkt_t_kembalisj_diterima || '-'}
                </span>
            )
        },
        {
            header: 'TANGGAL DITERIMA',
            accessor: 'mkt_t_kembalisj_tanggalditerima',
            render: (item) => (
                <span className="text-slate-600 text-xs">
                    {item.mkt_t_kembalisj_tanggalditerima
                        ? new Date(item.mkt_t_kembalisj_tanggalditerima).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : '-'}
                </span>
            )
        },
        {
            header: 'AKTIF',
            accessor: 'mkt_t_kembalisj_aktifyn',
            render: (item) => {
                const isAktif = item.mkt_t_kembalisj_aktifyn === 'Y';
                return (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isAktif
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-rose-100 text-rose-700 border border-rose-300'
                        }`}>
                        {isAktif ? 'Ya' : 'Tidak'}
                    </span>
                );
            }
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

            {/* Panel Filter */}
            {showFilter && (
                <form onSubmit={handleSearchSubmit} className={`p-6 rounded-2xl border mb-6 shadow-sm transition-all animate-in fade-in duration-200 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-100'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end text-xs font-bold">
                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5"><Calendar size={12} className="inline mr-1" /> Dari Tanggal</label>
                            <input type="date" name="tgl_awal" value={filter.tgl_awal} onChange={handleInputChange} className="w-full h-11 px-3 border border-slate-200 rounded-xl font-bold text-indigo-600 outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5"><Calendar size={12} className="inline mr-1" /> Sampai Tanggal</label>
                            <input type="date" name="tgl_akhir" value={filter.tgl_akhir} onChange={handleInputChange} className="w-full h-11 px-3 border border-slate-200 rounded-xl font-bold text-indigo-600 outline-none focus:border-indigo-500" />
                        </div>

                        {/* Dropdown Customer seperti sistem lawas */}
                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5"><User size={12} className="inline mr-1" /> Nama Customer</label>
                            <select
                                name="customer_name"
                                value={filter.customer_name}
                                onChange={handleInputChange}
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold bg-white uppercase text-slate-700"
                            >
                                <option value="">-- SEMUA CUSTOMER --</option>
                                {customerOptions.map((cust) => (
                                    <option key={cust.cust_id} value={cust.cust_name}>
                                        {cust.cust_name.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5"><FileText size={12} className="inline mr-1" /> No. Pengembalian</label>
                            <input type="text" name="document_id" value={filter.document_id} onChange={handleInputChange} placeholder="No Pengembalian..." className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 uppercase" />
                        </div>
                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5"><Layers size={12} className="inline mr-1" /> No. Surat Jalan / Resi</label>
                            <input type="text" name="no_sj" value={filter.no_sj} onChange={handleInputChange} placeholder="No SJ..." className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 uppercase" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 border-t pt-4 border-slate-100">
                        <button type="button" onClick={handleResetFilter} className="px-5 h-11 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 text-slate-600 transition-all text-xs cursor-pointer">Clear Filter</button>
                        <button type="submit" disabled={loading} className="px-6 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center gap-2 cursor-pointer">
                            {loading ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
                            {loading ? 'Memuat...' : 'Cari Data'}
                        </button>
                    </div>
                </form>
            )}

            <div className="p-4 rounded-3xl border shadow-sm bg-white border-slate-100">
                <DataTableTemplate
                    title="PENGEMBALIAN SURAT JALAN CUSTOMER"
                    columns={columns}
                    data={Array.isArray(dataList) ? dataList : []}
                    loading={loading}
                    onAdd={() => setIsFormOpen(true)}
                    onEdit={() => setIsFormOpen(true)}
                    onDelete={() => { }}
                    onFilter={() => setShowFilter(prev => !prev)}
                />
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#f8fafc] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-100 p-2 animate-in zoom-in-95 duration-200">
                        <TambahPengembalianSuratJalan
                            isDarkMode={isDarkMode}
                            onClose={() => {
                                setIsFormOpen(false);
                                fetchDataPengembalian();
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PengembalianSuratJalanCustomer;