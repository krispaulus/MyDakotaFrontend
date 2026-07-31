import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { FileText, RefreshCw, X as XIcon, Plus, Trash2, Truck } from 'lucide-react';
import Swal from 'sweetalert2';

const SuratTugas = () => {
    const { isDarkMode } = useDarkMode();
    const [stList, setStList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const today = new Date().toISOString().split('T')[0];
    const [filterTgla, setFilterTgla] = useState('2020-01-01');
    const [filterTgle, setFilterTgle] = useState(today);
    const [filterNoSt, setFilterNoSt] = useState('');
    const [filterNoMobil, setFilterNoMobil] = useState('');
    const [filterSopir, setFilterSopir] = useState('');
    const [chkTgl, setChkTgl] = useState(false);

    const [globalSearch, setGlobalSearch] = useState('');

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const defaultForm = {
        sjh_id: '',
        sjh_tanggal: today + ' 08:00:00',
        sjh_tanggalkembali: today + ' 18:00:00',
        sjh_kendid: '',
        sjh_sopir1_nip: '',
        sjh_sopir2_nip: '',
        sjh_assid: 'AS001',
        sjh_trayekid: '',
        sjh_startagenid: '1',
        sjh_endagenid: '1',
        sjh_keterangan: 'Pengiriman Kargo Reguler',
        nominal_um: 0
    };
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchSuratTugasData();
    }, []);

    const fetchSuratTugasData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/surattugas-list', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    no_st: filterNoSt,
                    no_mobil: filterNoMobil,
                    sopir_nama: filterSopir,
                    chktgl: chkTgl
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || [];
            setStList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat data Surat Tugas:", err);
            setStList([]);
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
            sjh_id: item.sjh_id || '',
            sjh_tanggal: item.sjh_tanggal || today + ' 08:00:00',
            sjh_tanggalkembali: item.sjh_tanggalkembali || today + ' 18:00:00',
            sjh_kendid: item.sjh_kendid || '',
            sjh_sopir1_nip: item.sjh_sopir1_nip !== '-' ? item.sjh_sopir1_nip : '',
            sjh_sopir2_nip: item.sjh_sopir2_nip !== '-' ? item.sjh_sopir2_nip : '',
            sjh_assid: item.sjh_assid !== '-' ? item.sjh_assid : 'AS001',
            sjh_trayekid: '',
            sjh_startagenid: '1',
            sjh_endagenid: '1',
            sjh_keterangan: item.sjh_keterangan !== '-' ? item.sjh_keterangan : '',
            nominal_um: item.nominal_um || 0
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Surat Tugas?',
            text: `Apakah Anda yakin ingin menghapus nomor Surat Tugas ${item.sjh_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/surattugas-delete', {
                        params: { sjh_id: item.sjh_id },
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Terhapus!', 'Surat Tugas berhasil dihapus.', 'success');
                    fetchSuratTugasData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus record', 'error');
                }
            }
        });
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.sjh_id || !formData.sjh_kendid) {
            Swal.fire('Peringatan', 'No. Surat Tugas dan No. Kendaraan Wajib Diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/operasional/surattugas-update' : '/operasional/surattugas-create';
            const method = isEditMode ? api.put : api.post;

            await method(endpoint, {
                ...formData,
                nominal_um: parseFloat(formData.nominal_um) || 0
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', isEditMode ? 'Surat Tugas berhasil diperbarui.' : 'Surat Tugas berhasil direkam.', 'success');
            setIsModalOpen(false);
            fetchSuratTugasData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data', 'error');
        }
    };

    const columns = [
        {
            header: 'NO. SURAT TUGAS',
            accessor: 'sjh_id',
            render: (i) => <span className="font-mono font-bold text-indigo-700">🚚 {i.sjh_id || '-'}</span>
        },
        {
            header: 'TANGGAL BERANGKAT',
            accessor: 'sjh_tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.sjh_tanggal || '-'}</span>
        },
        {
            header: 'NO. MOBIL',
            accessor: 'sjh_kendid',
            render: (i) => <span className="font-bold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{i.sjh_kendid || '-'}</span>
        },
        {
            header: 'SOPIR 1',
            accessor: 'nmsopir1',
            render: (i) => <span className="font-semibold text-slate-800 uppercase">{i.nmsopir1 || i.sjh_sopir1_nip || '-'}</span>
        },
        {
            header: 'SOPIR 2',
            accessor: 'nmsopir2',
            render: (i) => <span className="font-medium text-slate-600 uppercase">{i.nmsopir2 || i.sjh_sopir2_nip || '-'}</span>
        },
        {
            header: 'ASSIGNMENT',
            accessor: 'ass_nama',
            render: (i) => <span className="font-semibold text-indigo-900 uppercase">{i.ass_nama || '-'}</span>
        },
        {
            header: 'UANG MUKA (RP)',
            accessor: 'nominal_um',
            render: (i) => <span className="font-bold text-emerald-700">Rp {Number(i.nominal_um || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'STATUS',
            accessor: 'sjh_completeyn',
            render: (i) => (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${i.sjh_completeyn === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {i.sjh_completeyn === 'Y' ? 'SELESAI' : 'BERJALAN'}
                </span>
            )
        }
    ];

    const filteredList = stList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.sjh_id && item.sjh_id.toLowerCase().includes(q)) ||
            (item.sjh_kendid && item.sjh_kendid.toLowerCase().includes(q)) ||
            (item.nmsopir1 && item.nmsopir1.toLowerCase().includes(q))
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
                        <label className="block mb-1 text-slate-500 uppercase">NO. SURAT TUGAS</label>
                        <input
                            type="text"
                            placeholder="NO. SURAT TUGAS..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterNoSt}
                            onChange={e => setFilterNoSt(e.target.value)}
                        />
                    </div>

                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">NO. MOBIL / KENDARAAN</label>
                        <input
                            type="text"
                            placeholder="PLAT NOMOR..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterNoMobil}
                            onChange={e => setFilterNoMobil(e.target.value)}
                        />
                    </div>

                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">NAMA / NIP SOPIR</label>
                        <input
                            type="text"
                            placeholder="NAMA SOPIR..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterSopir}
                            onChange={e => setFilterSopir(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={fetchSuratTugasData}
                        className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md"
                    >
                        <RefreshCw size={15} /> REFRESH SURAT TUGAS
                    </button>
                </div>
            </div>

            <DataTableTemplate
                title="SURAT TUGAS / SURAT JALAN SUPIR (OPR_T_eSuratJalan)"
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
                                <Truck size={20} className="text-indigo-600" />
                                {isEditMode ? `EDIT SURAT TUGAS: ${formData.sjh_id}` : 'ADD SURAT TUGAS INFO'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer">
                                <XIcon size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitForm} className="p-8 space-y-6 text-sm font-medium text-slate-700">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NO. SURAT TUGAS / SURAT JALAN</label>
                                    <input
                                        type="text"
                                        disabled={isEditMode}
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all font-mono uppercase bg-white disabled:bg-slate-100"
                                        placeholder="Contoh: ST/2026/07/001"
                                        value={formData.sjh_id}
                                        onChange={e => setFormData({ ...formData, sjh_id: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NO. KENDARAAN / PLAT MOBIL</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all uppercase bg-white font-mono"
                                        placeholder="Contoh: B 9123 UXT"
                                        value={formData.sjh_kendid}
                                        onChange={e => setFormData({ ...formData, sjh_kendid: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">PENGEMUDI / SOPIR 1 (NIP)</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white font-mono uppercase"
                                        placeholder="NIP Sopir 1..."
                                        value={formData.sjh_sopir1_nip}
                                        onChange={e => setFormData({ ...formData, sjh_sopir1_nip: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">PENGEMUDI / SOPIR 2 (NIP - OPSIONAL)</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white font-mono uppercase"
                                        placeholder="NIP Sopir 2..."
                                        value={formData.sjh_sopir2_nip}
                                        onChange={e => setFormData({ ...formData, sjh_sopir2_nip: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">ASSIGNMENT / TUGAS OPERASIONAL</label>
                                    <select
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white cursor-pointer"
                                        value={formData.sjh_assid}
                                        onChange={e => setFormData({ ...formData, sjh_assid: e.target.value })}
                                    >
                                        <option value="AS001">PENGIRIMAN REGULER LINTAS</option>
                                        <option value="AS002">PENGIRIMAN EKSPRES PRIORITAS</option>
                                        <option value="AS003">LANGGANAN KHUSUS / CHARTER</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">UANG MUKA BIAYA OPERASIONAL (RP)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white font-mono"
                                        placeholder="Nominal Uang Muka..."
                                        value={formData.nominal_um}
                                        onChange={e => setFormData({ ...formData, nominal_um: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 col-span-2">
                                    <label className="text-slate-600 font-semibold">KETERANGAN TUGAS</label>
                                    <textarea
                                        rows={2}
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white resize-none"
                                        placeholder="Keterangan rincian tugas..."
                                        value={formData.sjh_keterangan}
                                        onChange={e => setFormData({ ...formData, sjh_keterangan: e.target.value })}
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
                                    {isEditMode ? 'UPDATE ST' : 'ADD ST'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuratTugas;