import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Truck, RefreshCw, X as XIcon, MapPin, Calendar, FileText, User, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';

const HasilLoper = () => {
    const { isDarkMode } = useDarkMode();
    const [loperList, setLoperList] = useState([]);
    const [reasonList, setReasonList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const today = new Date().toISOString().split('T')[0];
    const [filterTgla, setFilterTgla] = useState('2017-01-01');
    const [filterTgle, setFilterTgle] = useState(today);
    const [filterNoBtt, setFilterNoBtt] = useState('');
    const [filterNoLoper, setFilterNoLoper] = useState('');
    const [filterKota, setFilterKota] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPengirim, setFilterPengirim] = useState('');
    const [chkTgl, setChkTgl] = useState(false);

    const [globalSearch, setGlobalSearch] = useState('');

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const nowDateTime = new Date().toISOString().slice(0, 16);
    const defaultForm = {
        bbl_eid: '',
        bbl_noloper: '',
        bbl_bttid: '',
        bbl_penerima: '',
        bbl_terimayn: 'Y',
        bbl_reasonid: 0,
        bbl_keterangan: '',
        bbl_tanggal: nowDateTime,
        bbl_latitude: '',
        bbl_longitude: ''
    };
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchLoperData();
        fetchReasonData();
    }, []);

    const fetchReasonData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/reason-list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReasonList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load master reason:", err);
        }
    };

    const fetchLoperData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/hasil-loper-list', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    no_btt: filterNoBtt,
                    no_loper: filterNoLoper,
                    kota: filterKota,
                    status: filterStatus,
                    pengirim: filterPengirim,
                    chktgl: chkTgl
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || [];
            setLoperList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat data Hasil Loper:", err);
            setLoperList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        bbl_latitude: position.coords.latitude.toString(),
                        bbl_longitude: position.coords.longitude.toString()
                    }));
                    Swal.fire('GPS Terdeteksi!', 'Koordinat lokasi berhasil dikunci.', 'success');
                },
                (error) => {
                    Swal.fire('GPS Gagal', 'Gagal mendeteksi lokasi otomatis.', 'warning');
                }
            );
        }
    };

    const handleAdd = () => {
        setIsEditMode(false);
        setFormData({
            ...defaultForm,
            bbl_tanggal: new Date().toISOString().slice(0, 16)
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            bbl_eid: item.bbl_eid || '',
            bbl_noloper: item.bbl_noloper !== '-' ? item.bbl_noloper : '',
            bbl_bttid: item.bbl_bttid || '',
            bbl_penerima: item.bbl_penerima !== '-' ? item.bbl_penerima : '',
            bbl_terimayn: item.bbl_terimayn || 'Y',
            bbl_reasonid: item.bbl_reasonid || 0,
            bbl_keterangan: item.reason_lokal !== '-' ? item.reason_lokal : '',
            bbl_tanggal: item.bbl_tanggal ? item.bbl_tanggal.replace(' ', 'T').slice(0, 16) : nowDateTime,
            bbl_latitude: item.bbl_latitude || '',
            bbl_longitude: item.bbl_longitude || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Hasil Loper?',
            text: `Apakah Anda yakin ingin menghapus transaksi ${item.bbl_eid}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/hasil-loper-delete', {
                        params: { bbl_eid: item.bbl_eid },
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Terhapus!', 'Data Hasil Loper berhasil dihapus.', 'success');
                    fetchLoperData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus record', 'error');
                }
            }
        });
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.bbl_bttid) {
            Swal.fire('Peringatan', 'Nomor BTT / Resi Wajib Diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/operasional/hasil-loper-update' : '/operasional/hasil-loper-create';
            const method = isEditMode ? api.put : api.post;

            await method(endpoint, {
                ...formData,
                bbl_reasonid: parseInt(formData.bbl_reasonid, 10) || 0
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', isEditMode ? 'Hasil Loper berhasil diperbarui.' : 'Hasil Loper berhasil direkam.', 'success');
            setIsModalOpen(false);
            fetchLoperData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data', 'error');
        }
    };

    const columns = [
        {
            header: 'NO. TRANSAKSI',
            accessor: 'bbl_eid',
            render: (i) => <span className="font-mono font-bold text-indigo-600">📋 {i.bbl_eid || '-'}</span>
        },
        {
            header: 'NO. LOPER',
            accessor: 'bbl_noloper',
            render: (i) => <span className="font-mono text-slate-700 font-semibold">{i.bbl_noloper || '-'}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'bbl_tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.bbl_tanggal || '-'}</span>
        },
        {
            header: 'NO. BTT',
            accessor: 'bbl_bttid',
            render: (i) => <span className="font-mono font-bold text-blue-700">{i.bbl_bttid || '-'}</span>
        },
        {
            header: 'SURAT JALAN',
            accessor: 'bttt_nosuratjalan',
            render: (i) => <span className="font-mono text-slate-600">{i.bttt_nosuratjalan || '-'}</span>
        },
        {
            header: 'ASAL KOTA',
            accessor: 'bttt_asalkota',
            render: (i) => <span className="font-semibold text-slate-800 uppercase">{i.bttt_asalkota || '-'}</span>
        },
        {
            header: 'PENGIRIM',
            accessor: 'bttt_asalname',
            render: (i) => <span className="font-semibold text-slate-700 uppercase">{i.bttt_asalname || '-'}</span>
        },
        {
            header: 'ALAMAT TUJUAN',
            accessor: 'bttt_tujuanalamat',
            render: (i) => <span className="text-slate-600 uppercase text-xs truncate max-w-[200px] block">{i.bttt_tujuanalamat || '-'}</span>
        },
        {
            header: 'KOTA TUJUAN',
            accessor: 'bttt_tujuankota',
            render: (i) => <span className="font-semibold text-slate-800 uppercase">{i.bttt_tujuankota || '-'}</span>
        },
        {
            header: 'COD (RP)',
            accessor: 'bttt_tagihtujuan',
            render: (i) => <span className="font-bold text-emerald-700">Rp {Number(i.bttt_tagihtujuan || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'STATUS',
            accessor: 'bbl_terimayn',
            render: (i) => (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${i.bbl_terimayn === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {i.statusterima} {i.bbl_terimayn !== 'Y' && i.reason_lokal !== '-' ? `(${i.reason_lokal})` : ''}
                </span>
            )
        },
        {
            header: 'PENERIMA',
            accessor: 'bbl_penerima',
            render: (i) => <span className="font-bold text-slate-900 uppercase">{i.bbl_penerima || '-'}</span>
        },
        {
            header: 'PETUGAS INPUT',
            accessor: 'bbl_updateid',
            render: (i) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-700 uppercase">{i.bbl_updateid}</span>
                    <span className="text-[10px] text-slate-400 font-mono">[{i.bbl_updatetime}]</span>
                </div>
            )
        }
    ];

    const filteredList = loperList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.bbl_eid && item.bbl_eid.toLowerCase().includes(q)) ||
            (item.bbl_bttid && item.bbl_bttid.toLowerCase().includes(q)) ||
            (item.bbl_penerima && item.bbl_penerima.toLowerCase().includes(q)) ||
            (item.bttt_asalname && item.bttt_asalname.toLowerCase().includes(q))
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

                    <div className="col-span-2">
                        <label className="block mb-1 text-slate-500 uppercase">NO. BTT / RESI</label>
                        <input
                            type="text"
                            placeholder="MASUKAN NO BTT..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterNoBtt}
                            onChange={e => setFilterNoBtt(e.target.value)}
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block mb-1 text-slate-500 uppercase">PENGIRIM</label>
                        <input
                            type="text"
                            placeholder="MASUKAN PENGIRIM..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterPengirim}
                            onChange={e => setFilterPengirim(e.target.value)}
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block mb-1 text-slate-500 uppercase">STATUS LOPER</label>
                        <select
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium bg-white"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="">-- SEMUA --</option>
                            <option value="Y">DITERIMA</option>
                            <option value="N">GAGAL</option>
                        </select>
                    </div>

                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">NO. LOPER</label>
                        <input
                            type="text"
                            placeholder="CARI NOMOR LOPER..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterNoLoper}
                            onChange={e => setFilterNoLoper(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={fetchLoperData}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md"
                    >
                        <RefreshCw size={15} /> REFRESH HASIL LOPER
                    </button>
                </div>
            </div>

            <DataTableTemplate
                title="HASIL LOPER (OPR_T_eBBL)"
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

            {/* MODAL INPUT BBL HIGH QUALITY */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 pt-6 pb-4 flex justify-between items-center border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-lg font-black text-slate-900 tracking-wide uppercase flex items-center gap-2">
                                <Truck size={22} className="text-blue-600" />
                                {isEditMode ? `EDIT HASIL LOPER: ${formData.bbl_eid}` : 'INPUT HASIL LOPER / PROOF OF DELIVERY (POD)'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-200/60 flex items-center justify-center hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer">
                                <XIcon size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitForm} className="p-8 space-y-4 text-xs font-semibold text-slate-700">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-bold uppercase flex items-center gap-1">
                                        <FileText size={14} className="text-blue-600" /> NO. BTT / RESI KARGO *
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600 transition-all font-mono font-bold uppercase bg-white text-blue-700"
                                        placeholder="Contoh: DEM0120260001"
                                        value={formData.bbl_bttid}
                                        onChange={e => setFormData({ ...formData, bbl_bttid: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-bold uppercase flex items-center gap-1">
                                        <Truck size={14} className="text-indigo-600" /> NO. SURAT TUGAS / LEMBAR LOPER
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-mono font-bold uppercase bg-white"
                                        placeholder="Contoh: LOP/2026/001"
                                        value={formData.bbl_noloper}
                                        onChange={e => setFormData({ ...formData, bbl_noloper: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-bold uppercase flex items-center gap-1">
                                        <Calendar size={14} className="text-amber-600" /> TANGGAL & WAKTU PENGANTARAN *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600 bg-white font-mono font-bold"
                                        value={formData.bbl_tanggal}
                                        onChange={e => setFormData({ ...formData, bbl_tanggal: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-bold uppercase flex items-center gap-1">
                                        <CheckCircle2 size={14} className="text-emerald-600" /> STATUS HASIL PENGANTARAN *
                                    </label>
                                    <select
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600 bg-white font-bold"
                                        value={formData.bbl_terimayn}
                                        onChange={e => setFormData({ ...formData, bbl_terimayn: e.target.value })}
                                    >
                                        <option value="Y">DITERIMA (BERHASIL TERANTAR)</option>
                                        <option value="N">GAGAL SERAH (UNDELIVERED)</option>
                                    </select>
                                </div>

                                {formData.bbl_terimayn === 'Y' ? (
                                    <div className="flex flex-col gap-1.5 col-span-2">
                                        <label className="text-slate-600 font-bold uppercase flex items-center gap-1">
                                            <User size={14} className="text-emerald-600" /> NAMA PENERIMA BARANG *
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600 uppercase bg-white font-bold text-slate-800"
                                            placeholder="Masukan nama orang yang menerima paket..."
                                            value={formData.bbl_penerima}
                                            onChange={e => setFormData({ ...formData, bbl_penerima: e.target.value.toUpperCase() })}
                                            required
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1.5 col-span-2">
                                        <label className="text-slate-600 font-bold uppercase flex items-center gap-1">
                                            <FileText size={14} className="text-rose-600" /> ALASAN KEGAGALAN *
                                        </label>
                                        <select
                                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600 bg-white font-bold text-rose-700"
                                            value={formData.bbl_reasonid}
                                            onChange={e => setFormData({ ...formData, bbl_reasonid: e.target.value })}
                                            required
                                        >
                                            <option value={0}>-- PILIH ALASAN GAGAL SERAH --</option>
                                            {reasonList.map((r) => (
                                                <option key={r.reason_id} value={r.reason_id}>{r.reason_lokal}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="flex flex-col gap-1.5 col-span-2">
                                    <label className="text-slate-600 font-bold uppercase">CATATAN / KETERANGAN TAMBAHAN</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600 uppercase bg-white"
                                        placeholder="Catatan tambahan lokasi, patokan, dll..."
                                        value={formData.bbl_keterangan}
                                        onChange={e => setFormData({ ...formData, bbl_keterangan: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={16} className="text-indigo-600" />
                                        <span className="text-[11px] font-bold text-slate-600">
                                            {formData.bbl_latitude && formData.bbl_longitude
                                                ? `GPS: ${formData.bbl_latitude}, ${formData.bbl_longitude}`
                                                : 'KOORDINAT LOKASI GPS BELUM DILOCK'}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGetLocation}
                                        className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-[10px] font-bold uppercase cursor-pointer"
                                    >
                                        📍 Lock Lokasi GPS
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-center items-center gap-4 pt-4 border-t border-slate-100 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-[150px] py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center text-xs"
                                >
                                    BATAL
                                </button>
                                <button
                                    type="submit"
                                    className="w-[150px] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center text-xs shadow-md"
                                >
                                    {isEditMode ? 'UPDATE BBL' : 'SIMPAN BBL'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HasilLoper;