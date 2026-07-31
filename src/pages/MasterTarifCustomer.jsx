import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { DollarSign, Search, Plus, Trash2, Edit3, Eye, RefreshCw, X } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from "../context/DarkModeContext";
import Swal from 'sweetalert2';

const MasterTarifCustomer = () => {
    const { isDarkMode } = useDarkMode();
    const [customerList, setCustomerList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const [filterCustomerName, setFilterCustomerName] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Modal List Rute State (Untuk tombol Atur Harga / Detail)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedCust, setSelectedCust] = useState(null);
    const [detailTarifList, setDetailTarifList] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Modal Form Input (Gambar 1)
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [routeForm, setRouteForm] = useState({
        id: 0,
        customerid: '',
        kota_asal: '',
        kota_tujuan: '',
        kabupaten: '',
        harga_darat: 0,
        harga_laut: 0,
        harga_udara: 0,
        harga_volume: 0,
        harga_kubikasi: 0,
        min_kg: 0,
        jenis_harga: 0
    });

    // 1. FETCH RINGKASAN CUSTOMER
    const fetchCustomerTarifSummary = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const activeAgen = localStorage.getItem('active_agen_id') || localStorage.getItem('active_agen_nama') || 'ALL';

            const res = await api.get('/master/tarif-customer/list', {
                params: {
                    customer_name: filterCustomerName,
                    agen_id: activeAgen
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data;
            if (Array.isArray(data)) {
                setCustomerList(data);
            } else {
                setCustomerList([]);
            }
        } catch (err) {
            console.error("Gagal memuat ringkasan tarif customer:", err);
            setCustomerList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomerTarifSummary();
    }, []);

    // 2. FETCH DETAIL RUTE TARIF
    const fetchDetailTarif = async (custId) => {
        setLoadingDetail(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/master/tarif-customer/detail/${custId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data;
            if (Array.isArray(data)) {
                setDetailTarifList(data);
                return data;
            } else {
                setDetailTarifList([]);
                return [];
            }
        } catch (err) {
            console.error("Gagal memuat detail rute tarif:", err);
            setDetailTarifList([]);
            return [];
        } finally {
            setLoadingDetail(false);
        }
    };

    // 🎯 FUNGSI UTAMA EDIT (PENIL TABEL): BUKA FORM GAMBAR 1 LANGSUNG!
    const handleEditDirect = async (custItem) => {
        setSelectedCust(custItem);
        // Cek data rute yang ada untuk customer ini
        const routes = await fetchDetailTarif(custItem.cust_id);

        if (routes && routes.length > 0) {
            // Jika sudah ada rute, isi form dengan rute pertama untuk di-edit
            const routeItem = routes[0];
            setRouteForm({
                id: routeItem.id || 0,
                customerid: routeItem.customerid || custItem.cust_id,
                kota_asal: routeItem.kota_asal || '',
                kota_tujuan: routeItem.kota_tujuan || '',
                kabupaten: routeItem.kabupaten || '',
                harga_darat: routeItem.harga_darat || 0,
                harga_laut: routeItem.harga_laut || 0,
                harga_udara: routeItem.harga_udara || 0,
                harga_volume: routeItem.harga_volume || 0,
                harga_kubikasi: routeItem.harga_kubikasi || 0,
                min_kg: routeItem.min_kg || 0,
                jenis_harga: routeItem.jenis_harga || 0
            });
        } else {
            // Jika belum ada rute, buka form kosong dengan Customer ID terisi
            setRouteForm({
                id: 0,
                customerid: custItem.cust_id,
                kota_asal: '',
                kota_tujuan: '',
                kabupaten: '',
                harga_darat: 0,
                harga_laut: 0,
                harga_udara: 0,
                harga_volume: 0,
                harga_kubikasi: 0,
                min_kg: 0,
                jenis_harga: 0
            });
        }
        setIsFormModalOpen(true); // 🟢 MEMBUKA FORM GAMBAR 1!
    };

    // ➕ TRIGGER FORM TAMBAH MANUAL (TOMBOL ATAS)
    const handleOpenFormRouteAdd = (defaultCustID = '') => {
        setRouteForm({
            id: 0,
            customerid: defaultCustID || '',
            kota_asal: '',
            kota_tujuan: '',
            kabupaten: '',
            harga_darat: 0,
            harga_laut: 0,
            harga_udara: 0,
            harga_volume: 0,
            harga_kubikasi: 0,
            min_kg: 0,
            jenis_harga: 0
        });
        setIsFormModalOpen(true); // 🟢 MEMBUKA FORM GAMBAR 1!
    };

    // 💾 SUBMIT SIMPAN/UPDATE RUTE TARIF
    const handleSaveRouteSubmit = async (e) => {
        e.preventDefault();
        if (!routeForm.customerid) {
            return Swal.fire('Peringatan', 'Customer ID Wajib Diisi!', 'warning');
        }
        if (!routeForm.kota_asal || !routeForm.kota_tujuan) {
            return Swal.fire('Peringatan', 'Kota Asal dan Kota Tujuan Wajib Diisi!', 'warning');
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/master/tarif-customer/save', routeForm, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', 'Tarif khusus customer berhasil disimpan!', 'success');
            setIsFormModalOpen(false);

            if (selectedCust?.cust_id) {
                fetchDetailTarif(selectedCust.cust_id);
            }
            fetchCustomerTarifSummary();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan tarif customer', 'error');
        }
    };

    // 🗑️ HAPUS SELURUH TARIF CUSTOMER
    const handleDeleteAllCustomerTarif = (item) => {
        if (item.jml === 0) {
            return Swal.fire('Informasi', 'Customer ini belum memiliki tarif khusus.', 'info');
        }

        Swal.fire({
            title: 'Hapus Seluruh Tarif Khusus?',
            text: `Apakah Anda yakin ingin menghapus SELURUH (${item.jml} rute) tarif khusus milik customer ${item.cust_name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus Semua!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.post('/master/tarif-customer/delete', { customer_id: item.cust_id }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Sukses', 'Seluruh tarif khusus customer berhasil dihapus', 'success');
                    fetchCustomerTarifSummary();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus tarif customer', 'error');
                }
            }
        });
    };

    // Filter Client Search
    const filteredCustomers = customerList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.cust_id && item.cust_id.toLowerCase().includes(q)) ||
            (item.cust_name && item.cust_name.toLowerCase().includes(q)) ||
            (item.cust_telp1 && item.cust_telp1.toLowerCase().includes(q))
        );
    });

    const columns = [
        {
            header: 'KODE CUSTOMER',
            accessor: 'cust_id',
            render: (item) => (
                <span
                    className="font-bold text-indigo-600 hover:underline cursor-pointer font-mono"
                    onClick={() => handleEditDirect(item)}
                >
                    {item.cust_id}
                </span>
            )
        },
        {
            header: 'NAMA CUSTOMER',
            accessor: 'cust_name',
            render: (item) => (
                <div>
                    <span className="font-bold text-slate-800 text-sm block">{item.cust_name}</span>
                    <span className="text-xs text-slate-400 block">{item.cust_alamat1 || '-'}</span>
                </div>
            )
        },
        { header: 'ALAMAT', accessor: 'cust_alamat1', render: (item) => item.cust_alamat1 || '-' },
        { header: 'TELEPON', accessor: 'cust_telp1', render: (item) => item.cust_telp1 || '-' },
        {
            header: 'JUMLAH TARIF KHUSUS',
            accessor: 'jml',
            render: (item) => (
                <span className={`px-3 py-1 text-xs font-black rounded-full ${item.jml > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.jml} RUTE
                </span>
            )
        },
        {
            header: 'AKSI KELOLA',
            accessor: 'action',
            render: (item) => (
                <button
                    onClick={() => {
                        setSelectedCust(item);
                        setIsDetailModalOpen(true);
                        fetchDetailTarif(item.cust_id);
                    }}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                >
                    <Eye size={14} /> Atur Harga
                </button>
            )
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Menu */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <DollarSign size={20} className="text-indigo-600" /> Master Harga / Tarif Customer
                </h3>
            </div>

            {/* FILTER PANEL */}
            <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 grid grid-cols-12 gap-4 items-end text-xs font-bold text-slate-600">
                <div className="col-span-9">
                    <label className="block mb-1 text-slate-500 uppercase">CARI NAMA CUSTOMER</label>
                    <input
                        type="text"
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 bg-white outline-none"
                        placeholder="Ketik Nama Customer..."
                        value={filterCustomerName}
                        onChange={e => setFilterCustomerName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchCustomerTarifSummary()}
                    />
                </div>

                <div className="col-span-3">
                    <button
                        onClick={fetchCustomerTarifSummary}
                        className="w-full h-[42px] bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition uppercase"
                    >
                        <Search size={14} /> CARI / REFRESH
                    </button>
                </div>
            </div>

            {/* TABEL UTAMA */}
            <DataTableTemplate
                title="MASTER HARGA CUSTOMER"
                columns={columns}
                data={filteredCustomers}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={() => handleOpenFormRouteAdd('')} // 👈 Tambah membuka Form Gambar 1
                onEdit={(item) => handleEditDirect(item)} // 🟢 EDIT SEKARANG LANGSUNG BUKA FORM GAMBAR 1!
                onDelete={(item) => handleDeleteAllCustomerTarif(item)} // 👈 Delete Hapus Seluruh Tarif
            />

            {/* ============================================================== */}
            {/* 🟢 MODAL FORM INPUT RUTE TARIF KHUSUS (GAMBAR 1)              */}
            {/* ============================================================== */}
            {isFormModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border flex flex-col my-8 overflow-hidden">
                        <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
                            <h4 className="font-bold text-sm uppercase">
                                {routeForm.id > 0 ? 'EDIT RUTE TARIF KHUSUS' : 'TAMBAH RUTE TARIF KHUSUS'}
                            </h4>
                            <button onClick={() => setIsFormModalOpen(false)} className="text-white hover:text-slate-300"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSaveRouteSubmit} className="p-5 space-y-3 text-xs font-bold text-slate-700">
                            <div>
                                <label className="block mb-1">CUSTOMER ID *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2 border rounded uppercase bg-amber-50 font-black text-sm"
                                    placeholder="Contoh: 0010000154"
                                    value={routeForm.customerid}
                                    onChange={e => setRouteForm({ ...routeForm, customerid: e.target.value.toUpperCase() })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">KOTA ASAL *</label>
                                    <input type="text" required className="w-full p-2 border rounded uppercase" placeholder="CONTOH: BEKASI" value={routeForm.kota_asal} onChange={e => setRouteForm({ ...routeForm, kota_asal: e.target.value.toUpperCase() })} />
                                </div>
                                <div>
                                    <label className="block mb-1">KOTA TUJUAN *</label>
                                    <input type="text" required className="w-full p-2 border rounded uppercase" placeholder="CONTOH: SURABAYA" value={routeForm.kota_tujuan} onChange={e => setRouteForm({ ...routeForm, kota_tujuan: e.target.value.toUpperCase() })} />
                                </div>
                            </div>

                            <div>
                                <label className="block mb-1">KABUPATEN</label>
                                <input type="text" className="w-full p-2 border rounded uppercase" placeholder="CONTOH: KAB SIDOARJO" value={routeForm.kabupaten} onChange={e => setRouteForm({ ...routeForm, kabupaten: e.target.value.toUpperCase() })} />
                            </div>

                            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border">
                                <div>
                                    <label className="block mb-1 text-amber-700">DARAT (RP)</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold" value={routeForm.harga_darat} onChange={e => setRouteForm({ ...routeForm, harga_darat: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block mb-1 text-blue-700">LAUT (RP)</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold" value={routeForm.harga_laut} onChange={e => setRouteForm({ ...routeForm, harga_laut: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block mb-1 text-cyan-700">UDARA (RP)</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold" value={routeForm.harga_udara} onChange={e => setRouteForm({ ...routeForm, harga_udara: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border">
                                <div>
                                    <label className="block mb-1 text-purple-700">HARGA VOLUME (RP)</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold" value={routeForm.harga_volume} onChange={e => setRouteForm({ ...routeForm, harga_volume: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block mb-1 text-emerald-700">KUBIKASI (M3) (RP)</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold" value={routeForm.harga_kubikasi} onChange={e => setRouteForm({ ...routeForm, harga_kubikasi: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-700">MINIMAL KG</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold" value={routeForm.min_kg} onChange={e => setRouteForm({ ...routeForm, min_kg: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                                <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-5 py-2 border text-slate-600 font-bold rounded-lg uppercase">BATAL</button>
                                <button type="submit" className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg uppercase shadow-md">SIMPAN TARIF</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* 🟢 MODAL DETAIL DAFTAR TARIF KHUSUS (TOMBOL ATUR HARGA)        */}
            {/* ============================================================== */}
            {isDetailModalOpen && selectedCust && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border flex flex-col my-8 overflow-hidden">
                        <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-base flex items-center gap-2">
                                    DAFTAR TARIF KHUSUS: {selectedCust.cust_name}
                                </h3>
                                <p className="text-xs text-slate-300 font-mono">CUSTOMER ID: {selectedCust.cust_id}</p>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} className="p-1 hover:bg-slate-700 rounded-full text-slate-300 hover:text-white transition"><X size={20} /></button>
                        </div>

                        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                            <button
                                onClick={() => handleOpenFormRouteAdd(selectedCust.cust_id)}
                                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition uppercase shadow-md cursor-pointer"
                            >
                                <Plus size={16} /> TAMBAH RUTE TARIF KHUSUS
                            </button>
                            <span className="text-xs font-bold text-slate-500">
                                Total {detailTarifList.length} Rute Khusus Terdaftar
                            </span>
                        </div>

                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {loadingDetail ? (
                                <div className="text-center py-8 text-slate-400 font-bold flex items-center justify-center gap-2">
                                    <RefreshCw className="animate-spin" size={18} /> Memuat Rute Tarif...
                                </div>
                            ) : detailTarifList.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 font-bold bg-slate-50 rounded-xl border border-dashed">
                                    Belum ada Rute Tarif Khusus untuk Customer ini.
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs border-collapse border border-slate-200">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-700 uppercase font-black border-b">
                                            <th className="p-2.5 border-r">RUTE (ASAL ➔ TUJUAN)</th>
                                            <th className="p-2.5 border-r">KABUPATEN</th>
                                            <th className="p-2.5 border-r text-right">DARAT (RP)</th>
                                            <th className="p-2.5 border-r text-right">LAUT (RP)</th>
                                            <th className="p-2.5 border-r text-right">UDARA (RP)</th>
                                            <th className="p-2.5 border-r text-right">VOLUME / KUBIKASI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-slate-800 font-medium">
                                        {detailTarifList.map((rute, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition">
                                                <td className="p-2.5 border-r font-bold text-indigo-700">
                                                    {rute.kota_asal} ➔ {rute.kota_tujuan}
                                                </td>
                                                <td className="p-2.5 border-r">{rute.kabupaten || '-'}</td>
                                                <td className="p-2.5 border-r text-right font-bold text-amber-700">
                                                    Rp {Number(rute.harga_darat).toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-2.5 border-r text-right font-bold text-blue-700">
                                                    Rp {Number(rute.harga_laut).toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-2.5 border-r text-right font-bold text-cyan-700">
                                                    Rp {Number(rute.harga_udara).toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-2.5 border-r text-right">
                                                    <span className="block text-slate-600">Vol: Rp {Number(rute.harga_volume).toLocaleString('id-ID')}</span>
                                                    <span className="block text-xs text-slate-400">M3: Rp {Number(rute.harga_kubikasi).toLocaleString('id-ID')}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-4 border-t bg-slate-50 flex justify-end">
                            <button onClick={() => setIsDetailModalOpen(false)} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg text-xs uppercase">TUTUP</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterTarifCustomer;