import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, RefreshCw, RotateCcw, X, Plus, Search, MapPin, Printer, Eye, Building2, User } from 'lucide-react';
import Swal from 'sweetalert2';
import logoDakota from '../assets/new_logo 2.png';

const MasterDalamKota = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // State Filter Panel
    const [showFilter, setShowFilter] = useState(false);
    const [filterForm, setFilterForm] = useState({
        cust_id: '',
        cust_name: '',
        kota: '',
        provinsi: '',
        kecamatan: '',
        kelurahan: '',
        aktif_yn: ''
    });

    // State Modal Add
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
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

    // State Quick View & Print Preview
    const [viewItem, setViewItem] = useState(null);
    const [isPrintOpen, setIsPrintOpen] = useState(false);
    const [printRows, setPrintRows] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let params = new URLSearchParams();
            if (filterForm.cust_id) params.append('cust_id', filterForm.cust_id);
            if (filterForm.cust_name) params.append('cust_name', filterForm.cust_name);
            if (filterForm.kota) params.append('kota', filterForm.kota);
            if (filterForm.provinsi) params.append('provinsi', filterForm.provinsi);
            if (filterForm.kecamatan) params.append('kecamatan', filterForm.kecamatan);
            if (filterForm.kelurahan) params.append('kelurahan', filterForm.kelurahan);
            if (filterForm.aktif_yn) params.append('aktif_yn', filterForm.aktif_yn);

            const res = await api.get(`/mkt/dalam-kota/list?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error('Gagal mengambil data master dalam kota:', err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleResetFilter = () => {
        setFilterForm({
            cust_id: '',
            cust_name: '',
            kota: '',
            provinsi: '',
            kecamatan: '',
            kelurahan: '',
            aktif_yn: ''
        });
        const token = localStorage.getItem('token');
        setLoading(true);
        api.get('/mkt/dalam-kota/list', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setData(res.data?.data || []))
            .finally(() => setLoading(false));
    };

    // Auto-suggest Modal Handlers
    const handleSearchAgen = async (val) => {
        setAgenQuery(val);
        setSelectedAgen(null);
        if (val.trim().length < 2) return setAgenSuggests([]);
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
        if (val.trim().length < 2) return setCustomerSuggests([]);
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
        if (val.trim().length < 2) return setKotaSuggests([]);
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
            Swal.fire({ title: 'Agen Belum Dipilih', text: 'Pilih salah satu Agen/Cabang.', icon: 'warning' });
            return;
        }
        if (selectedKotas.length === 0) {
            Swal.fire({ title: 'Kota Belum Dipilih', text: 'Pilih minimal satu kota/kabupaten.', icon: 'warning' });
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                agen_id: String(selectedAgen.agen_id),
                cust_id: useCustomer && selectedCustomer ? String(selectedCustomer.cust_id) : '',
                kota_list: selectedKotas
            };

            const res = await api.post('/mkt/dalam-kota/save', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({ title: 'Berhasil', text: res.data?.message || 'Data berhasil disimpan.', icon: 'success' });
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            Swal.fire({ title: 'Gagal', text: err.response?.data?.message || 'Terjadi kesalahan.', icon: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Print Dokumen Trigger
    const handleTriggerPrint = (rowsToPrint = null) => {
        const rows = rowsToPrint ? [rowsToPrint] : data;
        if (!rows || rows.length === 0) {
            return Swal.fire('Data Kosong', 'Tidak ada data customer untuk dicetak.', 'warning');
        }
        setPrintRows(rows);
        setIsPrintOpen(true);
    };

    // 🌟 Kolom Tabel Master Customer Dalam Kota
    const columns = [
        {
            header: 'ID CUSTOMER',
            accessor: 'cust_id',
            render: (item) => (
                <button
                    type="button"
                    onClick={() => setViewItem(item)}
                    className="font-mono font-bold text-sky-600 hover:text-sky-800 hover:underline cursor-pointer flex items-center gap-1 text-xs"
                    title="Klik untuk melihat detail customer"
                >
                    <Eye size={13} className="text-slate-400" />
                    {item.cust_id}
                </button>
            )
        },
        {
            header: 'NAMA CUSTOMER',
            accessor: 'cust_name',
            render: (item) => <span className="font-bold text-slate-800 uppercase text-xs">{item.cust_name}</span>
        },
        {
            header: 'PROVINSI',
            accessor: 'provinsi',
            render: (item) => <span className="text-slate-600 uppercase text-xs">{item.provinsi || '-'}</span>
        },
        {
            header: 'KOTA / KABUPATEN',
            accessor: 'kotakabupaten',
            render: (item) => <span className="font-bold text-slate-700 uppercase text-xs">{item.kotakabupaten || '-'}</span>
        },
        {
            header: 'KECAMATAN',
            accessor: 'kecamatan',
            render: (item) => <span className="text-slate-600 uppercase text-xs">{item.kecamatan || '-'}</span>
        },
        {
            header: 'KELURAHAN',
            accessor: 'kelurahan',
            render: (item) => <span className="text-slate-600 uppercase text-xs">{item.kelurahan || '-'}</span>
        },
        {
            header: 'STATUS',
            accessor: 'cust_aktifyn',
            render: (item) => item.cust_aktifyn === 'Y' ? (
                <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">AKTIF</span>
            ) : (
                <span className="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">TIDAK</span>
            )
        }
    ];

    // MODAL TAMBAH (BATCH SAVE)
    const modalAdd = isModalOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/70" style={{ zIndex: 99999 }}>
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
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

                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
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
                            Gunakan Khusus Customer Tertentu (Jika tidak dicentang, berlaku untuk semua)
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

                    <div className="space-y-1">
                        <label className="font-bold text-slate-600 block">Daftar Kota yang Akan Disimpan ({selectedKotas.length}):</label>
                        <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 min-h-[80px] flex flex-wrap gap-2 items-start">
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

    // 🌟 MODAL QUICK VIEW DETAIL CUSTOMER
    const modalView = viewItem ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/70" style={{ zIndex: 999999 }}>
            <div className="w-full max-w-lg bg-white text-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <User size={16} className="text-sky-600" />
                        DETAIL CUSTOMER DALAM KOTA
                    </h3>
                    <button
                        type="button"
                        onClick={() => setViewItem(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-3 text-xs">
                    <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1">
                        <span className="text-slate-400 font-bold block text-[10px] uppercase">ID CUSTOMER</span>
                        <span className="font-mono font-bold text-sky-700 text-sm">{viewItem.cust_id}</span>
                        <span className="font-black text-slate-900 block text-sm uppercase">{viewItem.cust_name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                            <span className="text-slate-400 font-bold block text-[10px]">KOTA / KABUPATEN</span>
                            <span className="font-bold text-slate-800 uppercase">{viewItem.kotakabupaten || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-bold block text-[10px]">PROVINSI</span>
                            <span className="font-bold text-slate-800 uppercase">{viewItem.provinsi || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-bold block text-[10px]">KECAMATAN</span>
                            <span className="text-slate-800 uppercase font-medium">{viewItem.kecamatan || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-bold block text-[10px]">KELURAHAN</span>
                            <span className="text-slate-800 uppercase font-medium">{viewItem.kelurahan || '-'}</span>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-slate-500 font-bold">Status Keaktifan:</span>
                        {viewItem.cust_aktifyn === 'Y' ? (
                            <span className="bg-emerald-100 text-emerald-800 px-3 py-0.5 rounded-full font-black text-[10px]">AKTIF</span>
                        ) : (
                            <span className="bg-rose-100 text-rose-800 px-3 py-0.5 rounded-full font-black text-[10px]">NON-AKTIF</span>
                        )}
                    </div>
                </div>

                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            const item = viewItem;
                            setViewItem(null);
                            handleTriggerPrint(item);
                        }}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 shadow"
                    >
                        <Printer size={13} /> Cetak Lembar Ini
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewItem(null)}
                        className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs uppercase hover:bg-slate-100"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    // 🌟 MODAL CETAK SESUAI FORMAT mkt_t_masterdalamkota_print.asp
    const modalPrint = isPrintOpen ? (
        <div className="fixed inset-0 z-[9999999] bg-white overflow-y-auto p-8 print:p-0">
            <div className="max-w-4xl mx-auto flex justify-between items-center mb-6 pb-4 border-b border-slate-200 print:hidden">
                <button
                    type="button"
                    onClick={() => setIsPrintOpen(false)}
                    className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                    ← Tutup
                </button>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-5 py-2 text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow flex items-center gap-2"
                >
                    <Printer size={15} /> Cetak Halaman
                </button>
            </div>

            <div className="max-w-4xl mx-auto border border-slate-300 p-8 rounded-xl shadow-xs print:border-none print:shadow-none print:p-0 text-black font-sans text-xs">
                {/* Header Cetak sesuai ASP Lawas */}
                <div className="flex items-center gap-6 border-b-2 border-black pb-4 mb-4">
                    <div className="shrink-0">
                        <img
                            src={logoDakota}
                            alt="Dakota Cargo"
                            className="h-12 w-auto object-contain"
                        />
                    </div>
                    <div className="border-l-2 border-slate-300 pl-4">
                        <h2 className="font-black text-sm tracking-wider uppercase">DAKOTA LOGISTIK INDONESIA</h2>
                        <p className="text-[11px] text-slate-600">Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi</p>
                        <p className="text-[11px] text-slate-600">BEKASI KOTA</p>
                        <p className="text-[11px] text-slate-600">(021) 8603278 / (021) 86608589</p>
                    </div>
                </div>

                <div className="text-center my-4">
                    <h2 className="font-black text-sm uppercase underline tracking-wider">
                        DAFTAR MASTER CUSTOMER DALAM KOTA
                    </h2>
                </div>

                <table className="w-full border-collapse border border-black text-left text-[11px]">
                    <thead>
                        <tr className="bg-slate-100 font-bold border-b border-black">
                            <th className="border border-black p-2 text-center w-10">No</th>
                            <th className="border border-black p-2 w-24">ID Customer</th>
                            <th className="border border-black p-2">Nama Customer</th>
                            <th className="border border-black p-2">Provinsi</th>
                            <th className="border border-black p-2">Kota / Kabupaten</th>
                            <th className="border border-black p-2">Kecamatan / Kelurahan</th>
                            <th className="border border-black p-2 text-center w-16">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {printRows.map((row, idx) => (
                            <tr key={idx} className="border-b border-slate-300">
                                <td className="border border-black p-2 text-center">{idx + 1}</td>
                                <td className="border border-black p-2 font-mono font-bold">{row.cust_id}</td>
                                <td className="border border-black p-2 font-bold uppercase">{row.cust_name}</td>
                                <td className="border border-black p-2 uppercase">{row.provinsi || '-'}</td>
                                <td className="border border-black p-2 uppercase font-semibold">{row.kotakabupaten || '-'}</td>
                                <td className="border border-black p-2 uppercase">{row.kecamatan || row.kelurahan || '-'}</td>
                                <td className="border border-black p-2 text-center font-bold">
                                    {row.cust_aktifyn === 'Y' ? 'AKTIF' : 'TIDAK'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-between items-center mt-8 pt-4 text-[10px] text-slate-500">
                    <span>Dicetak oleh: {localStorage.getItem('username') || 'Staff'}</span>
                    <span>Tanggal Cetak: {new Date().toLocaleString('id-ID')}</span>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-4">
            {/* Form Filter Sesuai Gambar 1 */}
            {showFilter && (
                <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER PENCARIAN MASTER CUSTOMER DALAM KOTA
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">ID CUSTOMER</label>
                            <input
                                type="text"
                                placeholder="Masukkan ID Customer..."
                                value={filterForm.cust_id}
                                onChange={(e) => setFilterForm({ ...filterForm, cust_id: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NAMA CUSTOMER</label>
                            <input
                                type="text"
                                placeholder="Masukkan Nama Customer..."
                                value={filterForm.cust_name}
                                onChange={(e) => setFilterForm({ ...filterForm, cust_name: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">KOTA / KABUPATEN</label>
                            <input
                                type="text"
                                placeholder="Masukkan Kota / Kabupaten..."
                                value={filterForm.kota}
                                onChange={(e) => setFilterForm({ ...filterForm, kota: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">PROVINSI</label>
                            <input
                                type="text"
                                placeholder="Masukkan Provinsi..."
                                value={filterForm.provinsi}
                                onChange={(e) => setFilterForm({ ...filterForm, provinsi: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">KECAMATAN</label>
                            <input
                                type="text"
                                placeholder="Masukkan Kecamatan..."
                                value={filterForm.kecamatan}
                                onChange={(e) => setFilterForm({ ...filterForm, kecamatan: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">KELURAHAN</label>
                            <input
                                type="text"
                                placeholder="Masukkan Kelurahan..."
                                value={filterForm.kelurahan}
                                onChange={(e) => setFilterForm({ ...filterForm, kelurahan: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS CUSTOMER</label>
                            <select
                                value={filterForm.aktif_yn}
                                onChange={(e) => setFilterForm({ ...filterForm, aktif_yn: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
                            >
                                <option value="">-- SEMUA STATUS --</option>
                                <option value="Y">AKTIF</option>
                                <option value="N">TIDAK AKTIF</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer flex items-center gap-1.5"
                        >
                            <RotateCcw size={14} /> RESET
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw size={14} /> TAMPILKAN DATA
                        </button>
                    </div>
                </form>
            )}

            {/* Tabel Data Template */}
            <DataTableTemplate
                title="DAFTAR MASTER CUSTOMER DALAM KOTA"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleOpenAddModal}
                onFilter={() => setShowFilter(prev => !prev)}
                renderExtraActions={() => (
                    <button
                        type="button"
                        onClick={() => handleTriggerPrint(null)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition text-xs flex items-center gap-1 cursor-pointer border border-slate-200"
                        title="Cetak Seluruh Hasil Filter"
                    >
                        <Printer size={14} className="text-sky-600" /> Cetak
                    </button>
                )}
            />

            {modalAdd && ReactDOM.createPortal(modalAdd, document.body)}
            {modalView && ReactDOM.createPortal(modalView, document.body)}
            {modalPrint && ReactDOM.createPortal(modalPrint, document.body)}
        </div>
    );
};

export default MasterDalamKota;