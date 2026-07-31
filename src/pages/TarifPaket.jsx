import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Package, Search, Plus, Trash2, Edit3, Layers, Eye, RefreshCw, X } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from "../context/DarkModeContext";
import Swal from 'sweetalert2';

const TarifPaket = () => {
    const { isDarkMode } = useDarkMode();
    const [agenList, setAgenList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const [filterAgenNama, setFilterAgenNama] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Modal List Detail State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedAgen, setSelectedAgen] = useState(null);
    const [detailTarifList, setDetailTarifList] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Modal Form State (Tambah / Edit Rute Paket Area)
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [routeForm, setRouteForm] = useState({
        id: 0,
        area_agenid: '',
        tujuan_kecamatan: '',
        tujuan_kabupaten: '',
        tujuan_propinsi: '',
        hand_darat: 0,
        hand_laut: 0,
        hand_udara: 0,
        hand_daratkurir: 0,
        hand_lautkurir: 0,
        hand_udarakurir: 0,
        pickup_agenid: '',
        penerusyn: 'N',
        kgmin: 0,
        hrgpenerus: 0,
        leadtime: '',
        prosentasebykirimyn: 'N'
    });

    // 1. FETCH RINGKASAN AGEN ASAL & JUMLAH RUTE PAKET
    const fetchTarifPaketSummary = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const activeAgen = localStorage.getItem('active_agen_id') || localStorage.getItem('active_agen_nama') || 'ALL';

            const res = await api.get('/master/tarif-paket/list', {
                params: {
                    agen_nama: filterAgenNama,
                    agen_id: activeAgen
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data;
            if (Array.isArray(data)) {
                setAgenList(data);
            } else {
                setAgenList([]);
            }
        } catch (err) {
            console.error("Gagal memuat summary tarif paket:", err);
            setAgenList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTarifPaketSummary();
    }, []);

    // 2. FETCH DETAIL RUTE TARIF PAKET PER AGEN ASAL
    const fetchDetailTarifPaket = async (agenId) => {
        setLoadingDetail(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/master/tarif-paket/detail/${agenId}`, {
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
            console.error("Gagal memuat detail rute tarif paket:", err);
            setDetailTarifList([]);
            return [];
        } finally {
            setLoadingDetail(false);
        }
    };

    // 🎯 OPEN MODAL DETAIL KELOLA RUTE AGEN
    const handleOpenDetailModal = (item) => {
        setSelectedAgen(item);
        setIsDetailModalOpen(true);
        fetchDetailTarifPaket(item.agen_id);
    };

    // ✏️ EDIT LANGSUNG DARI PENIL TABEL LUAR
    const handleEditDirect = async (agenItem) => {
        setSelectedAgen(agenItem);
        const routes = await fetchDetailTarifPaket(agenItem.agen_id);

        if (routes && routes.length > 0) {
            const r = routes[0];
            setRouteForm({
                id: r.id || 0,
                area_agenid: r.area_agenid || agenItem.agen_id,
                tujuan_kecamatan: r.tujuan_kecamatan || '',
                tujuan_kabupaten: r.tujuan_kabupaten || '',
                tujuan_propinsi: r.tujuan_propinsi || '',
                hand_darat: r.hand_darat || 0,
                hand_laut: r.hand_laut || 0,
                hand_udara: r.hand_udara || 0,
                hand_daratkurir: r.hand_daratkurir || 0,
                hand_lautkurir: r.hand_lautkurir || 0,
                hand_udarakurir: r.hand_udarakurir || 0,
                pickup_agenid: r.pickup_agenid || '',
                penerusyn: r.penerusyn || 'N',
                kgmin: r.kgmin || 0,
                hrgpenerus: r.hrgpenerus || 0,
                leadtime: r.leadtime || '',
                prosentasebykirimyn: r.prosentasebykirimyn || 'N'
            });
        } else {
            setRouteForm({
                id: 0,
                area_agenid: agenItem.agen_id,
                tujuan_kecamatan: '',
                tujuan_kabupaten: '',
                tujuan_propinsi: '',
                hand_darat: 0,
                hand_laut: 0,
                hand_udara: 0,
                hand_daratkurir: 0,
                hand_lautkurir: 0,
                hand_udarakurir: 0,
                pickup_agenid: '',
                penerusyn: 'N',
                kgmin: 0,
                hrgpenerus: 0,
                leadtime: '',
                prosentasebykirimyn: 'N'
            });
        }
        setIsFormModalOpen(true);
    };

    // ➕ OPEN FORM TAMBAH RUTE BARU
    const handleOpenFormAdd = (defaultAgenID = '') => {
        setRouteForm({
            id: 0,
            area_agenid: defaultAgenID || '',
            tujuan_kecamatan: '',
            tujuan_kabupaten: '',
            tujuan_propinsi: '',
            hand_darat: 0,
            hand_laut: 0,
            hand_udara: 0,
            hand_daratkurir: 0,
            hand_lautkurir: 0,
            hand_udarakurir: 0,
            pickup_agenid: '',
            penerusyn: 'N',
            kgmin: 0,
            hrgpenerus: 0,
            leadtime: '',
            prosentasebykirimyn: 'N'
        });
        setIsFormModalOpen(true);
    };

    // 💾 SUBMIT SAVE RUTE TARIF PAKET
    const handleSaveSubmit = async (e) => {
        e.preventDefault();
        if (!routeForm.area_agenid.trim()) {
            return Swal.fire('Peringatan', 'Kode Agen Asal Wajib Diisi!', 'warning');
        }
        if (!routeForm.tujuan_propinsi.trim() || !routeForm.tujuan_kabupaten.trim()) {
            return Swal.fire('Peringatan', 'Propinsi dan Kabupaten Tujuan Wajib Diisi!', 'warning');
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/master/tarif-paket/save', routeForm, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses', 'Data tarif paket area berhasil disimpan!', 'success');
            setIsFormModalOpen(false);

            if (selectedAgen?.agen_id) {
                fetchDetailTarifPaket(selectedAgen.agen_id);
            }
            fetchTarifPaketSummary();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan tarif paket area', 'error');
        }
    };

    // 🗑️ DELETE SATUAN RUTE TARIF PAKET
    const handleDeleteSingleRoute = (routeId) => {
        Swal.fire({
            title: 'Hapus Rute Tarif Paket?',
            text: 'Data rute tarif paket ini akan dihapus dari sistem!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus Rute!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.post('/master/tarif-paket/delete', { id: routeId }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Sukses', 'Rute tarif paket berhasil dihapus', 'success');
                    if (selectedAgen?.agen_id) {
                        fetchDetailTarifPaket(selectedAgen.agen_id);
                    }
                    fetchTarifPaketSummary();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus rute tarif paket', 'error');
                }
            }
        });
    };

    // 🗑️ DELETE SELURUH RUTE TARIF PAKET MILIK AGEN
    const handleDeleteAllAgenTarif = (item) => {
        if (item.jml === 0) {
            return Swal.fire('Informasi', 'Agen ini belum memiliki rute tarif paket terdaftar.', 'info');
        }

        Swal.fire({
            title: 'Hapus Seluruh Rute Tarif Paket?',
            text: `Apakah Anda yakin ingin menghapus SELURUH (${item.jml} rute) tarif paket milik agen ${item.agen_nama}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus Semua!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.post('/master/tarif-paket/delete', { area_agenid: item.agen_id }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Sukses', 'Seluruh rute tarif paket agen berhasil dihapus', 'success');
                    fetchTarifPaketSummary();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus rute tarif paket agen', 'error');
                }
            }
        });
    };

    // Filter Local Client Search Table
    const filteredAgen = agenList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.agen_id && item.agen_id.toLowerCase().includes(q)) ||
            (item.agen_nama && item.agen_nama.toLowerCase().includes(q)) ||
            (item.agen_kota && item.agen_kota.toLowerCase().includes(q))
        );
    });

    // DEFINISI KOLOM TABEL UTAMA
    const columns = [
        {
            header: 'KODE AGEN',
            accessor: 'agen_id',
            render: (item) => (
                <span
                    className="font-bold text-indigo-600 hover:underline cursor-pointer font-mono"
                    onClick={() => handleEditDirect(item)}
                >
                    {item.agen_id}
                </span>
            )
        },
        {
            header: 'NAMA AGEN',
            accessor: 'agen_nama',
            render: (item) => (
                <div>
                    <span className="font-bold text-slate-800 text-sm block">{item.agen_nama}</span>
                    <span className="text-xs text-slate-400 block">{item.agen_alamat || '-'}</span>
                </div>
            )
        },
        { header: 'KOTA', accessor: 'agen_kota', render: (item) => item.agen_kota || '-' },
        { header: 'TELEPON', accessor: 'agen_phone1', render: (item) => item.agen_phone1 || '-' },
        {
            header: 'JUMLAH RUTE TERDAFTAR',
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
                    onClick={() => handleOpenDetailModal(item)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                >
                    <Eye size={14} /> Atur Rute
                </button>
            )
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            {/* Header Menu */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <Package size={20} className="text-indigo-600" /> Master Tarif Paket / Reguler (eArea)
                </h3>
            </div>

            {/* FILTER PANEL */}
            <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 grid grid-cols-12 gap-4 items-end text-xs font-bold text-slate-600">
                <div className="col-span-9">
                    <label className="block mb-1 text-slate-500 uppercase">CARI NAMA AGEN ASAL</label>
                    <input
                        type="text"
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 bg-white outline-none uppercase"
                        placeholder="Ketik Nama Agen Asal..."
                        value={filterAgenNama}
                        onChange={e => setFilterAgenNama(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchTarifPaketSummary()}
                    />
                </div>

                <div className="col-span-3">
                    <button
                        onClick={fetchTarifPaketSummary}
                        className="w-full h-[42px] bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition uppercase cursor-pointer"
                    >
                        <Search size={14} /> CARI / REFRESH
                    </button>
                </div>
            </div>

            {/* TABEL DATA TEMPLATE */}
            <DataTableTemplate
                title="MASTER TARIF PAKET"
                columns={columns}
                data={filteredAgen}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={() => handleOpenFormAdd('')}
                onEdit={(item) => handleEditDirect(item)}
                onDelete={(item) => handleDeleteAllAgenTarif(item)}
            />

            {/* ============================================================== */}
            {/* 🟢 MODAL FORM INPUT/EDIT RUTE TARIF PAKET AREA                 */}
            {/* ============================================================== */}
            {isFormModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 overflow-y-auto">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border flex flex-col my-8 overflow-hidden">
                        <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
                            <h4 className="font-bold text-sm uppercase">
                                {routeForm.id > 0 ? 'EDIT RUTE TARIF PAKET' : 'TAMBAH RUTE TARIF PAKET BARU'}
                            </h4>
                            <button onClick={() => setIsFormModalOpen(false)} className="text-white hover:text-slate-300"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSaveSubmit} className="p-5 space-y-4 text-xs font-bold text-slate-700">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block mb-1">KODE AGEN ASAL *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 border rounded uppercase bg-amber-50 font-black text-sm text-indigo-900"
                                        placeholder="Contoh: JKS001"
                                        value={routeForm.area_agenid}
                                        onChange={e => setRouteForm({ ...routeForm, area_agenid: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1">AGEN PICKUP ID</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded uppercase"
                                        placeholder="Contoh: JKS001"
                                        value={routeForm.pickup_agenid}
                                        onChange={e => setRouteForm({ ...routeForm, pickup_agenid: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            </div>

                            {/* WILAYAH TUJUAN */}
                            <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
                                <span className="text-indigo-900 font-black block border-b pb-1">WILAYAH TUJUAN</span>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block mb-1">PROPINSI *</label>
                                        <input type="text" required className="w-full p-2 border rounded uppercase" placeholder="JAWA BARAT" value={routeForm.tujuan_propinsi} onChange={e => setRouteForm({ ...routeForm, tujuan_propinsi: e.target.value.toUpperCase() })} />
                                    </div>
                                    <div>
                                        <label className="block mb-1">KABUPATEN/KOTA *</label>
                                        <input type="text" required className="w-full p-2 border rounded uppercase" placeholder="BEKASI" value={routeForm.tujuan_kabupaten} onChange={e => setRouteForm({ ...routeForm, tujuan_kabupaten: e.target.value.toUpperCase() })} />
                                    </div>
                                    <div>
                                        <label className="block mb-1">KECAMATAN</label>
                                        <input type="text" className="w-full p-2 border rounded uppercase" placeholder="CIKARANG" value={routeForm.tujuan_kecamatan} onChange={e => setRouteForm({ ...routeForm, tujuan_kecamatan: e.target.value.toUpperCase() })} />
                                    </div>
                                </div>
                            </div>

                            {/* HANDLING DOKUMEN/CARGO STANDARD */}
                            <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
                                <span className="text-amber-800 font-black block border-b pb-1">BIAYA HANDLING REGULER (RP)</span>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block mb-1 text-amber-700">HANDLING DARAT</label>
                                        <input type="number" min="0" className="w-full p-2 border rounded font-bold" value={routeForm.hand_darat} onChange={e => setRouteForm({ ...routeForm, hand_darat: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-blue-700">HANDLING LAUT</label>
                                        <input type="number" min="0" className="w-full p-2 border rounded font-bold" value={routeForm.hand_laut} onChange={e => setRouteForm({ ...routeForm, hand_laut: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-cyan-700">HANDLING UDARA</label>
                                        <input type="number" min="0" className="w-full p-2 border rounded font-bold" value={routeForm.hand_udara} onChange={e => setRouteForm({ ...routeForm, hand_udara: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                            </div>

                            {/* HANDLING KURIR */}
                            <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
                                <span className="text-emerald-800 font-black block border-b pb-1">BIAYA HANDLING KURIR (RP)</span>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block mb-1">KURIR DARAT</label>
                                        <input type="number" min="0" className="w-full p-2 border rounded font-bold" value={routeForm.hand_daratkurir} onChange={e => setRouteForm({ ...routeForm, hand_daratkurir: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                        <label className="block mb-1">KURIR LAUT</label>
                                        <input type="number" min="0" className="w-full p-2 border rounded font-bold" value={routeForm.hand_lautkurir} onChange={e => setRouteForm({ ...routeForm, hand_lautkurir: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                        <label className="block mb-1">KURIR UDARA</label>
                                        <input type="number" min="0" className="w-full p-2 border rounded font-bold" value={routeForm.hand_udarakurir} onChange={e => setRouteForm({ ...routeForm, hand_udarakurir: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                            </div>

                            {/* PENERUS & LEAD TIME */}
                            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border rounded-xl">
                                <div>
                                    <label className="block mb-1">MINIMAL KG (MIN KG)</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold" value={routeForm.kgmin} onChange={e => setRouteForm({ ...routeForm, kgmin: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block mb-1">HARGA PENERUS (RP)</label>
                                    <input type="number" min="0" className="w-full p-2 border rounded font-bold text-rose-700" value={routeForm.hrgpenerus} onChange={e => setRouteForm({ ...routeForm, hrgpenerus: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block mb-1">LEAD TIME (HARI)</label>
                                    <input type="text" className="w-full p-2 border rounded font-bold uppercase" placeholder="2-3 HARI" value={routeForm.leadtime} onChange={e => setRouteForm({ ...routeForm, leadtime: e.target.value.toUpperCase() })} />
                                </div>
                            </div>

                            {/* CHECKBOX FLAGS */}
                            <div className="flex items-center gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer font-bold">
                                    <input type="checkbox" checked={routeForm.penerusyn === 'Y'} onChange={e => setRouteForm({ ...routeForm, penerusyn: e.target.checked ? 'Y' : 'N' })} className="w-4 h-4 text-indigo-600 rounded" />
                                    PENERUS AKTIF (Y/N)
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer font-bold">
                                    <input type="checkbox" checked={routeForm.prosentasebykirimyn === 'Y'} onChange={e => setRouteForm({ ...routeForm, prosentasebykirimyn: e.target.checked ? 'Y' : 'N' })} className="w-4 h-4 text-indigo-600 rounded" />
                                    PERSENTASE BIAYA KIRIM (Y/N)
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                                <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-5 py-2 border text-slate-600 font-bold rounded-lg uppercase">BATAL</button>
                                <button type="submit" className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg uppercase shadow-md">SIMPAN DATA</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* 🟢 MODAL DETAIL DAFTAR RUTE TARIF PAKET AGEN                  */}
            {/* ============================================================== */}
            {isDetailModalOpen && selectedAgen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border flex flex-col my-8 overflow-hidden">
                        <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-base flex items-center gap-2">
                                    <Layers size={18} className="text-amber-400" />
                                    DAFTAR RUTE TARIF PAKET: {selectedAgen.agen_nama}
                                </h3>
                                <p className="text-xs text-slate-300 font-mono">KODE AGEN: {selectedAgen.agen_id}</p>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} className="p-1 hover:bg-slate-700 rounded-full text-slate-300 hover:text-white transition"><X size={20} /></button>
                        </div>

                        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                            <button
                                onClick={() => handleOpenFormAdd(selectedAgen.agen_id)}
                                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition uppercase shadow-md cursor-pointer"
                            >
                                <Plus size={16} /> TAMBAH RUTE TARIF PAKET
                            </button>
                            <span className="text-xs font-bold text-slate-500">
                                Total {detailTarifList.length} Rute Terdaftar
                            </span>
                        </div>

                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {loadingDetail ? (
                                <div className="text-center py-8 text-slate-400 font-bold flex items-center justify-center gap-2">
                                    <RefreshCw className="animate-spin" size={18} /> Memuat Detail Rute...
                                </div>
                            ) : detailTarifList.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 font-bold bg-slate-50 rounded-xl border border-dashed">
                                    Belum ada Rute Tarif Paket untuk Agen ini.
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs border-collapse border border-slate-200">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-700 uppercase font-black border-b">
                                            <th className="p-2.5 border-r">WILAYAH TUJUAN</th>
                                            <th className="p-2.5 border-r text-right">HANDLING (DARAT/LAUT/UDARA)</th>
                                            <th className="p-2.5 border-r text-right">KURIR (D/L/U)</th>
                                            <th className="p-2.5 border-r text-right">PENERUS (RP)</th>
                                            <th className="p-2.5 border-r text-center">LEAD TIME</th>
                                            <th className="p-2.5 text-center">AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-slate-800 font-medium">
                                        {detailTarifList.map((rute, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition">
                                                <td className="p-2.5 border-r font-bold text-indigo-700">
                                                    {rute.tujuan_propinsi} ➔ {rute.tujuan_kabupaten} ({rute.tujuan_kecamatan || '-'})
                                                </td>
                                                <td className="p-2.5 border-r text-right font-bold text-amber-700">
                                                    D: Rp {Number(rute.hand_darat).toLocaleString('id-ID')} | L: Rp {Number(rute.hand_laut).toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-2.5 border-r text-right font-bold text-emerald-700">
                                                    D: Rp {Number(rute.hand_daratkurir).toLocaleString('id-ID')} | L: Rp {Number(rute.hand_lautkurir).toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-2.5 border-r text-right font-bold text-rose-700">
                                                    Rp {Number(rute.hrgpenerus).toLocaleString('id-ID')} ({rute.penerusyn === 'Y' ? 'Aktif' : 'Non'})
                                                </td>
                                                <td className="p-2.5 border-r text-center font-bold">{rute.leadtime || '-'}</td>
                                                <td className="p-2.5 text-center flex items-center justify-center gap-1">
                                                    <button onClick={() => { setIsDetailModalOpen(false); handleOpenFormAdd(selectedAgen.agen_id); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit Rute Ini"><Edit3 size={15} /></button>
                                                    <button onClick={() => handleDeleteSingleRoute(rute.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" title="Hapus Rute Ini"><Trash2 size={15} /></button>
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

export default TarifPaket;