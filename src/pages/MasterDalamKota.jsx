import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { MapPin, Plus, Trash2, X, Search, CheckSquare, Square, Filter, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

const MasterDalamKota = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // State Filter Panel
    const [showFilter, setShowFilter] = useState(false);
    const [filterKeyword, setFilterKeyword] = useState('');

    // State Modal Add
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form State
    const [selectedAgen, setSelectedAgen] = useState(null);
    const [agenQuery, setAgenQuery] = useState('');
    const [agenSuggests, setAgenSuggests] = useState([]);

    const [useCustomer, setUseCustomer] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerQuery, setCustomerQuery] = useState('');
    const [customerSuggests, setCustomerSuggests] = useState([]);

    const [kotaQuery, setKotaQuery] = useState('');
    const [kotaSuggests, setKotaSuggests] = useState([]);
    const [selectedKotas, setSelectedKotas] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = '/mkt/dalam-kota/list?';
            if (filterKeyword.trim()) {
                url += `search=${encodeURIComponent(filterKeyword.trim())}`;
            }
            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data?.data || []);
        } catch (err) {
            console.error('Gagal mengambil data master dalam kota:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Suggest Handlers
    const handleSearchAgen = async (val) => {
        setAgenQuery(val);
        setSelectedAgen(null);
        if (val.trim().length < 2) {
            setAgenSuggests([]);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/mkt/dalam-kota/suggest?type=agen&q=${encodeURIComponent(val)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAgenSuggests(res.data?.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSearchCustomer = async (val) => {
        setCustomerQuery(val);
        setSelectedCustomer(null);
        if (val.trim().length < 2) {
            setCustomerSuggests([]);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/mkt/dalam-kota/suggest?type=customer&q=${encodeURIComponent(val)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomerSuggests(res.data?.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSearchKota = async (val) => {
        setKotaQuery(val);
        if (val.trim().length < 2) {
            setKotaSuggests([]);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/mkt/dalam-kota/suggest?type=kota&q=${encodeURIComponent(val)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setKotaSuggests(res.data?.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const addKotaItem = (kota) => {
        if (!selectedKotas.includes(kota)) {
            setSelectedKotas([...selectedKotas, kota]);
        }
        setKotaQuery('');
        setKotaSuggests([]);
    };

    const removeKotaItem = (kota) => {
        setSelectedKotas(selectedKotas.filter(k => k !== kota));
    };

    const handleOpenAddModal = () => {
        setSelectedAgen(null);
        setAgenQuery('');
        setAgenSuggests([]);
        setUseCustomer(false);
        setSelectedCustomer(null);
        setCustomerQuery('');
        setCustomerSuggests([]);
        setKotaQuery('');
        setKotaSuggests([]);
        setSelectedKotas([]);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedAgen) {
            Swal.fire({ title: 'Agen Belum Dipilih', text: 'Ketik dan pilih salah satu Agen/Cabang dari daftar saran.', icon: 'warning' });
            return;
        }
        if (selectedKotas.length === 0) {
            Swal.fire({ title: 'Kota Belum Dipilih', text: 'Cari dan pilih minimal satu kota/kabupaten.', icon: 'warning' });
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                agen_id: selectedAgen.agen_id,
                cust_id: useCustomer && selectedCustomer ? selectedCustomer.cust_id : '',
                kota_list: selectedKotas
            };

            const res = await api.post('/mkt/dalam-kota/save', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({ title: 'Berhasil', text: res.data?.message || 'Data berhasil disimpan.', icon: 'success' });
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            Swal.fire({ title: 'Gagal', text: err.response?.data?.message || 'Terjadi kesalahan saat menyimpan.', icon: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Kota Ini?',
            text: `Yakin ingin menghapus ${item.kotakabupaten} dari daftar dalam kota untuk ${item.agen_nama}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/mkt/dalam-kota/delete/${item.area_id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire({ title: 'Terhapus', text: 'Kota berhasil dihapus.', icon: 'success' });
                    fetchData();
                } catch (err) {
                    Swal.fire({ title: 'Gagal', text: 'Gagal menghapus data.', icon: 'error' });
                }
            }
        });
    };

    const columns = [
        {
            header: 'CABANG / AGEN',
            accessor: 'agen_nama',
            render: (item) => (
                <span className="font-bold text-slate-800 uppercase text-xs">
                    {item.agen_nama}
                </span>
            )
        },
        {
            header: 'BERLAKU UNTUK CUSTOMER',
            accessor: 'cust_name',
            render: (item) => item.cust_id ? (
                <div>
                    <span className="font-bold text-sky-700 block text-xs uppercase">{item.cust_name}</span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">{item.cust_id}</span>
                </div>
            ) : (
                <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[11px] font-bold inline-block border border-slate-200">
                    SEMUA CUSTOMER (GLOBAL)
                </span>
            )
        },
        {
            header: 'KOTA / KABUPATEN JANGKAUAN',
            accessor: 'kotakabupaten',
            render: (item) => (
                <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-rose-500 shrink-0" />
                    <span className="font-mono font-bold text-slate-900 text-xs">
                        {item.kotakabupaten}
                    </span>
                </div>
            )
        },
        {
            header: 'AKSI',
            accessor: 'action',
            render: (item) => (
                <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Hapus Pemetaan Kota"
                >
                    <Trash2 size={17} />
                </button>
            )
        }
    ];

    const modalAdd = isModalOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/70" style={{ zIndex: 99999 }}>
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <MapPin size={18} className="text-sky-600" />
                        TAMBAH MASTER DALAM KOTA
                    </h3>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
                    {/* Agen Input & Suggest */}
                    <div className="space-y-1 relative">
                        <label className="font-bold text-slate-600 block">Agen / Cabang <span className="text-rose-500">*</span></label>
                        <input
                            type="text"
                            required
                            placeholder="Ketik minimal 2 huruf nama cabang (misal: JAKARTA, BEKASI)..."
                            value={selectedAgen ? `${selectedAgen.agen_nama} (ID: ${selectedAgen.agen_id})` : agenQuery}
                            onChange={(e) => handleSearchAgen(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg font-bold outline-none focus:border-sky-500 uppercase bg-white text-slate-900"
                        />
                        {agenSuggests.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                                {agenSuggests.map((ag, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setSelectedAgen(ag);
                                            setAgenSuggests([]);
                                        }}
                                        className="p-2 hover:bg-sky-50 cursor-pointer font-bold text-slate-800 border-b border-slate-100 text-xs flex justify-between"
                                    >
                                        <span>{ag.agen_nama}</span>
                                        <span className="text-slate-400 font-mono text-[10px]">ID: {ag.agen_id}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Customer Checkbox & Suggest */}
                    <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={useCustomer}
                                onChange={(e) => {
                                    setUseCustomer(e.target.checked);
                                    if (!e.target.checked) {
                                        setSelectedCustomer(null);
                                        setCustomerQuery('');
                                    }
                                }}
                                className="w-4 h-4 rounded text-sky-600"
                            />
                            Gunakan Khusus Customer Tertentu (Jika tidak dicentang, berlaku untuk semua customer)
                        </label>

                        {useCustomer && (
                            <div className="relative pt-1">
                                <input
                                    type="text"
                                    placeholder="Ketik minimal 2 huruf nama customer..."
                                    value={selectedCustomer ? `${selectedCustomer.cust_name} (${selectedCustomer.cust_id})` : customerQuery}
                                    onChange={(e) => handleSearchCustomer(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg font-bold outline-none focus:border-sky-500 uppercase bg-white text-slate-900"
                                />
                                {customerSuggests.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                                        {customerSuggests.map((c, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedCustomer(c);
                                                    setCustomerSuggests([]);
                                                }}
                                                className="p-2 hover:bg-sky-50 cursor-pointer font-bold text-slate-800 border-b border-slate-100 text-xs flex justify-between"
                                            >
                                                <span>{c.cust_name}</span>
                                                <span className="text-slate-400 font-mono text-[10px]">{c.cust_id}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Search & Tag Kota */}
                    <div className="space-y-1 relative">
                        <label className="font-bold text-slate-600 block">Cari & Pilih Kota / Kabupaten <span className="text-rose-500">*</span></label>
                        <input
                            type="text"
                            placeholder="Ketik nama kota (misal: SEMARANG, TANGERANG, DEPOK)..."
                            value={kotaQuery}
                            onChange={(e) => handleSearchKota(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg font-bold outline-none focus:border-sky-500 uppercase bg-white text-slate-900"
                        />
                        {kotaSuggests.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                                {kotaSuggests.map((kt, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => addKotaItem(kt)}
                                        className="p-2 hover:bg-sky-50 cursor-pointer font-bold text-slate-800 border-b border-slate-100 text-xs"
                                    >
                                        + {kt}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* List Kota Terpilih */}
                    <div className="space-y-1">
                        <label className="font-bold text-slate-600 block">Daftar Kota yang Akan Disimpan ({selectedKotas.length}):</label>
                        <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 min-h-[90px] flex flex-wrap gap-2 items-start">
                            {selectedKotas.length === 0 ? (
                                <span className="text-slate-400 italic text-xs">Belum ada kota yang dipilih. Silakan cari kota di atas.</span>
                            ) : (
                                selectedKotas.map((kt, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 text-sky-800 border border-sky-300 rounded-lg font-bold text-xs">
                                        <MapPin size={12} /> {kt}
                                        <button
                                            type="button"
                                            onClick={() => removeKotaItem(kt)}
                                            className="text-rose-500 hover:text-rose-700 ml-1 font-black cursor-pointer"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl text-xs uppercase cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs uppercase shadow-md cursor-pointer"
                        >
                            {saving ? 'Menyimpan...' : 'Simpan Master Dalam Kota'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-5 master-dalam-kota-wrapper">
            <style>
                {`
                .master-dalam-kota-wrapper table tbody tr td {
                    color: #0f172a !important;
                    font-weight: 600 !important;
                }
                `}
            </style>

            {/* Panel Filter */}
            {showFilter && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER PENCARIAN
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="font-bold text-slate-600 block mb-1">CARI CABANG, CUSTOMER, ATAU KOTA</label>
                            <input
                                type="text"
                                placeholder="Ketik kata kunci pencarian..."
                                value={filterKeyword}
                                onChange={e => setFilterKeyword(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 bg-white"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => {
                                setFilterKeyword('');
                                setTimeout(fetchData, 50);
                            }}
                            className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-xs uppercase"
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            onClick={fetchData}
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5"
                        >
                            <RefreshCw size={14} /> Terapkan Filter
                        </button>
                    </div>
                </div>
            )}

            <DataTableTemplate
                title="MASTER DALAM KOTA (CITY COURIER MAPPING)"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleOpenAddModal}
                onFilter={() => setShowFilter(prev => !prev)}
            />

            {modalAdd && ReactDOM.createPortal(modalAdd, document.body)}
        </div>
    );
};

export default MasterDalamKota;