import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Fuel, RefreshCw, X as XIcon, Plus, Trash2, Fuel as FuelIcon } from 'lucide-react';
import Swal from 'sweetalert2';

const PengisianBBM = () => {
    const { isDarkMode } = useDarkMode();
    const [bbmList, setBbmList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const today = new Date().toISOString().split('T')[0];
    const [filterTgla, setFilterTgla] = useState('2020-01-01');
    const [filterTgle, setFilterTgle] = useState(today);
    const [filterAgen, setFilterAgen] = useState('');
    const [filterNoMobil, setFilterNoMobil] = useState('');
    const [chkTgl, setChkTgl] = useState(false);

    const [globalSearch, setGlobalSearch] = useState('');

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const defaultForm = {
        bbm_id: '',
        bbm_kendid: '',
        bbm_km: 0,
        bbm_isi: 0,
        bbm_harga: 0,
        bbm_jenis: 'SOLAR',
        bbm_voucherid: '',
        bbm_lokasipengisian: '',
        bbm_nipsopir1: '',
        bbm_agenid: '1'
    };
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchIsiBbmData();
    }, []);

    const fetchIsiBbmData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/isibbm-list', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    agen_nama: filterAgen,
                    no_mobil: filterNoMobil,
                    chktgl: chkTgl
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || [];
            setBbmList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat data Pengisian BBM:", err);
            setBbmList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setIsEditMode(false);
        setFormData(defaultForm);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            bbm_id: item.bbm_id || '',
            bbm_kendid: item.bbm_kendid || '',
            bbm_km: item.bbm_km || 0,
            bbm_isi: item.bbm_isi || 0,
            bbm_harga: item.bbm_harga || 0,
            bbm_jenis: item.bbm_jenis !== '-' ? item.bbm_jenis : 'SOLAR',
            bbm_voucherid: item.bbm_voucherid !== '-' ? item.bbm_voucherid : '',
            bbm_lokasipengisian: item.bbm_lokasipengisian !== '-' ? item.bbm_lokasipengisian : '',
            bbm_nipsopir1: '',
            bbm_agenid: '1'
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Transaksi BBM?',
            text: `Apakah Anda yakin ingin menghapus nomor transaksi BBM ${item.bbm_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/isibbm-delete', {
                        params: { bbm_id: item.bbm_id },
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Terhapus!', 'Data pengisian BBM berhasil dihapus.', 'success');
                    fetchIsiBbmData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus record', 'error');
                }
            }
        });
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.bbm_id || !formData.bbm_kendid) {
            Swal.fire('Peringatan', 'No. Isi dan No. Kendaraan Wajib Diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/operasional/isibbm-update' : '/operasional/isibbm-create';
            const method = isEditMode ? api.put : api.post;

            await method(endpoint, {
                ...formData,
                bbm_km: parseFloat(formData.bbm_km) || 0,
                bbm_isi: parseFloat(formData.bbm_isi) || 0,
                bbm_harga: parseFloat(formData.bbm_harga) || 0
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', isEditMode ? 'Data pengisian BBM berhasil diperbarui.' : 'Data pengisian BBM berhasil direkam.', 'success');
            setIsModalOpen(false);
            fetchIsiBbmData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data', 'error');
        }
    };

    const columns = [
        {
            header: 'No. ISI',
            accessor: 'bbm_id',
            render: (i) => <span className="font-mono font-bold text-indigo-700">⛽ {i.bbm_id || '-'}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'bbm_date',
            render: (i) => <span className="font-mono text-slate-600">{i.bbm_date || '-'}</span>
        },
        {
            header: 'NO. KENDARAAN',
            accessor: 'bbm_kendid',
            render: (i) => <span className="font-bold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{i.bbm_kendid || '-'}</span>
        },
        {
            header: 'KM ODOMETER',
            accessor: 'bbm_km',
            render: (i) => <span className="font-mono text-slate-700 font-semibold">{Number(i.bbm_km).toLocaleString('id-ID')} KM</span>
        },
        {
            header: 'ISI (LITER)',
            accessor: 'bbm_isi',
            render: (i) => <span className="font-bold text-emerald-700">{Number(i.bbm_isi).toLocaleString('id-ID', { minimumFractionDigits: 2 })} L</span>
        },
        {
            header: 'HARGA (RP)',
            accessor: 'bbm_harga',
            render: (i) => <span className="font-bold text-slate-800">Rp {Number(i.bbm_harga).toLocaleString('id-ID')}</span>
        },
        {
            header: 'VOUCHER ID',
            accessor: 'bbm_voucherid',
            render: (i) => <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{i.bbm_voucherid !== '' ? i.bbm_voucherid : '-'}</span>
        },
        {
            header: 'AKTIF',
            accessor: 'bbm_aktifyn',
            render: (i) => (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${i.bbm_aktifyn === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {i.bbm_aktifyn === 'Y' ? 'YA' : 'TIDAK'}
                </span>
            )
        }
    ];

    const filteredList = bbmList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.bbm_id && item.bbm_id.toLowerCase().includes(q)) ||
            (item.bbm_kendid && item.bbm_kendid.toLowerCase().includes(q)) ||
            (item.bbm_voucherid && item.bbm_voucherid.toLowerCase().includes(q))
        );
    });

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkTgl"
                                checked={chkTgl}
                                onChange={e => setChkTgl(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="chkTgl" className="text-slate-600 uppercase cursor-pointer">FILTER PERIODE TANGGAL</label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                disabled={!chkTgl}
                                className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium ${!chkTgl ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                                value={filterTgla}
                                onChange={e => setFilterTgla(e.target.value)}
                            />
                            <input
                                type="date"
                                disabled={!chkTgl}
                                className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium ${!chkTgl ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                                value={filterTgle}
                                onChange={e => setFilterTgle(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">CABANG / AGEN</label>
                        <input
                            type="text"
                            placeholder="NAMA AGEN CABANG..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterAgen}
                            onChange={e => setFilterAgen(e.target.value)}
                        />
                    </div>

                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">NO. KENDARAAN / MOBIL</label>
                        <input
                            type="text"
                            placeholder="PLAT NOMOR..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterNoMobil}
                            onChange={e => setFilterNoMobil(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={fetchIsiBbmData}
                        className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md"
                    >
                        <RefreshCw size={15} /> REFRESH PENGISIAN BBM
                    </button>
                </div>
            </div>

            <DataTableTemplate
                title="PENGISIAN BBM ARMADA (OPR_T_IsiBBM)"
                columns={columns}
                data={filteredList}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 pt-8 pb-4 flex justify-between items-center border-b border-slate-100">
                            <h2 className="text-xl font-bold font-['Inter'] text-slate-900 tracking-wide uppercase flex items-center gap-2">
                                <FuelIcon size={20} className="text-indigo-600" />
                                {isEditMode ? `EDIT PENGISIAN BBM: ${formData.bbm_id}` : 'ADD PENGISIAN BBM INFO'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer">
                                <XIcon size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitForm} className="p-8 space-y-6 text-sm font-medium text-slate-700">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NO. TRANSAKSI PENGISIAN BBM</label>
                                    <input
                                        type="text"
                                        disabled={isEditMode}
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all font-mono uppercase bg-white disabled:bg-slate-100"
                                        placeholder="Contoh: BBM/2026/07/001"
                                        value={formData.bbm_id}
                                        onChange={e => setFormData({ ...formData, bbm_id: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NO. KENDARAAN / PLAT MOBIL</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all uppercase bg-white font-mono"
                                        placeholder="Contoh: B 9123 UXT"
                                        value={formData.bbm_kendid}
                                        onChange={e => setFormData({ ...formData, bbm_kendid: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">ODOMETER KILOMETER (KM)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white font-mono"
                                        placeholder="KM Odometer..."
                                        value={formData.bbm_km}
                                        onChange={e => setFormData({ ...formData, bbm_km: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">JUMLAH ISI (LITER)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white font-mono"
                                        placeholder="Jumlah Liter..."
                                        value={formData.bbm_isi}
                                        onChange={e => setFormData({ ...formData, bbm_isi: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">TOTAL HARGA (RP)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white font-mono"
                                        placeholder="Total Biaya..."
                                        value={formData.bbm_harga}
                                        onChange={e => setFormData({ ...formData, bbm_harga: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">JENIS BBM</label>
                                    <select
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white cursor-pointer"
                                        value={formData.bbm_jenis}
                                        onChange={e => setFormData({ ...formData, bbm_jenis: e.target.value })}
                                    >
                                        <option value="SOLAR">SOLAR</option>
                                        <option value="DEXLITE">DEXLITE</option>
                                        <option value="PERTAMINA DEX">PERTAMINA DEX</option>
                                        <option value="PERTALITE">PERTALITE</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NO. VOUCHER BBM (OPSIONAL)</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white font-mono uppercase"
                                        placeholder="VCH-00129..."
                                        value={formData.bbm_voucherid}
                                        onChange={e => setFormData({ ...formData, bbm_voucherid: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">LOKASI SPBU / PENGISIAN</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white"
                                        placeholder="Lokasi SPBU..."
                                        value={formData.bbm_lokasipengisian}
                                        onChange={e => setFormData({ ...formData, bbm_lokasipengisian: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center items-center gap-4 pt-6 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-[160px] py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center text-xs"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    className="w-[160px] py-3 bg-[#1e1b4b] hover:opacity-90 active:scale-98 text-white font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center text-xs shadow-md"
                                >
                                    {isEditMode ? 'UPDATE BBM' : 'ADD BBM'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PengisianBBM;