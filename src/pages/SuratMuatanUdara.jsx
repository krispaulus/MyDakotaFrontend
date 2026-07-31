import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Plane, RefreshCw, X as XIcon } from 'lucide-react';
import Swal from 'sweetalert2';

const SuratMuatanUdara = () => {
    const { isDarkMode } = useDarkMode();
    const [smuList, setSmuList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const today = new Date().toISOString().split('T')[0];
    const [filterTgla, setFilterTgla] = useState('2020-01-01');
    const [filterTgle, setFilterTgle] = useState(today);
    const [filterNoSmu, setFilterNoSmu] = useState('');
    const [filterDari, setFilterDari] = useState('');
    const [filterTujuan, setFilterTujuan] = useState('');
    const [chkTgl, setChkTgl] = useState(false);

    const [globalSearch, setGlobalSearch] = useState('');

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const defaultForm = {
        smu_no: '',
        smu_dari: 'CGK',
        smu_tujuan: 'SUB',
        smu_kepada: 'PT JNE CARGO AIR',
        smu_maskapai: 'GARUDA INDONESIA',
        smu_nomorpenerbangan: 'GA-312',
        smu_colly: 0,
        smu_berat: 0,
        smu_harga: 0
    };
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchSmuData();
    }, []);

    const fetchSmuData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/smu-list', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    no_smu: filterNoSmu,
                    dari: filterDari,
                    tujuan: filterTujuan,
                    chktgl: chkTgl
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || [];
            setSmuList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat data SMU:", err);
            setSmuList([]);
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
            smu_no: item.smu_no || '',
            smu_dari: item.smu_dari || 'CGK',
            smu_tujuan: item.smu_tujuan || 'SUB',
            smu_kepada: item.smu_kepada !== '-' ? item.smu_kepada : '',
            smu_maskapai: item.smu_maskapai !== '-' ? item.smu_maskapai : '',
            smu_nomorpenerbangan: item.smu_nomorpenerbangan !== '-' ? item.smu_nomorpenerbangan : '',
            smu_colly: item.smu_colly || 0,
            smu_berat: item.smu_berat || 0,
            smu_harga: item.smu_harga || 0
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Surat Muatan Udara?',
            text: `Apakah Anda yakin ingin menghapus nomor SMU ${item.smu_no}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/smu-delete', {
                        params: { smu_no: item.smu_no },
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Terhapus!', 'Surat Muatan Udara berhasil dihapus.', 'success');
                    fetchSmuData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus record', 'error');
                }
            }
        });
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.smu_no || !formData.smu_dari || !formData.smu_tujuan) {
            Swal.fire('Peringatan', 'No. SMU, Bandara Asal & Tujuan Wajib Diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/operasional/smu-update' : '/operasional/smu-create';
            const method = isEditMode ? api.put : api.post;

            await method(endpoint, {
                ...formData,
                smu_colly: parseInt(formData.smu_colly, 10) || 0,
                smu_berat: parseFloat(formData.smu_berat) || 0,
                smu_harga: parseFloat(formData.smu_harga) || 0
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', isEditMode ? 'SMU berhasil diperbarui.' : 'SMU berhasil direkam.', 'success');
            setIsModalOpen(false);
            fetchSmuData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data', 'error');
        }
    };

    const columns = [
        {
            header: 'NO. SMU',
            accessor: 'smu_no',
            render: (i) => <span className="font-mono font-bold text-sky-700">✈️ {i.smu_no || '-'}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'smu_tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.smu_tanggal || '-'}</span>
        },
        {
            header: 'BANDARA KIRIM',
            accessor: 'bandara_dari',
            render: (i) => <span className="font-bold text-slate-800 uppercase">{i.bandara_dari} ({i.smu_dari})</span>
        },
        {
            header: 'BANDARA TUJUAN',
            accessor: 'bandara_tujuan',
            render: (i) => <span className="font-bold text-slate-800 uppercase">{i.bandara_tujuan} ({i.smu_tujuan})</span>
        },
        {
            header: 'EXP PENERUS',
            accessor: 'smu_kepada',
            render: (i) => <span className="font-semibold text-slate-700 uppercase">{i.smu_kepada || '-'}</span>
        },
        {
            header: 'FLIGHT CODE',
            accessor: 'smu_nomorpenerbangan',
            render: (i) => <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{i.smu_nomorpenerbangan || '-'}</span>
        },
        {
            header: 'COLLY',
            accessor: 'smu_colly',
            render: (i) => <span className="font-bold text-emerald-700">{Number(i.smu_colly).toLocaleString('id-ID')}</span>
        },
        {
            header: 'BERAT (KG)',
            accessor: 'smu_berat',
            render: (i) => <span className="font-bold text-slate-900">{Number(i.smu_berat).toLocaleString('id-ID', { minimumFractionDigits: 2 })} KG</span>
        },
        {
            header: 'PEMBUAT',
            accessor: 'smu_updateid',
            render: (i) => <span className="font-semibold text-slate-600 uppercase">{i.smu_updateid || '-'}</span>
        },
        {
            header: 'AKTIF',
            accessor: 'smu_aktifyn',
            render: (i) => (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${i.smu_aktifyn === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {i.smu_aktifyn === 'Y' ? 'Ya' : 'Tidak'}
                </span>
            )
        }
    ];

    const filteredList = smuList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.smu_no && item.smu_no.toLowerCase().includes(q)) ||
            (item.smu_nomorpenerbangan && item.smu_nomorpenerbangan.toLowerCase().includes(q)) ||
            (item.smu_kepada && item.smu_kepada.toLowerCase().includes(q))
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
                        <label className="block mb-1 text-slate-500 uppercase">NO. SMU UDARA</label>
                        <input
                            type="text"
                            placeholder="NO. SMU..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterNoSmu}
                            onChange={e => setFilterNoSmu(e.target.value)}
                        />
                    </div>

                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">DARI (BANDARA ASAL)</label>
                        <input
                            type="text"
                            placeholder="KOTA / KODE BANDARA ASAL..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterDari}
                            onChange={e => setFilterDari(e.target.value)}
                        />
                    </div>

                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">TUJUAN (BANDARA DESTINASI)</label>
                        <input
                            type="text"
                            placeholder="KOTA / KODE BANDARA TUJUAN..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterTujuan}
                            onChange={e => setFilterTujuan(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={fetchSmuData}
                        className="px-5 py-2.5 bg-sky-900 hover:bg-sky-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md"
                    >
                        <RefreshCw size={15} /> REFRESH SMU UDARA
                    </button>
                </div>
            </div>

            <DataTableTemplate
                title="SURAT MUATAN UDARA (OPR_T_SuratMuatanUdara)"
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
                                <Plane size={20} className="text-sky-600" />
                                {isEditMode ? `EDIT SMU UDARA: ${formData.smu_no}` : 'ADD SURAT MUATAN UDARA INFO'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer">
                                <XIcon size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitForm} className="p-8 space-y-6 text-sm font-medium text-slate-700">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NO. SURAT MUATAN UDARA (SMU)</label>
                                    <input
                                        type="text"
                                        disabled={isEditMode}
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-sky-600 transition-all font-mono uppercase bg-white disabled:bg-slate-100"
                                        placeholder="Contoh: SMU/2026/07/001"
                                        value={formData.smu_no}
                                        onChange={e => setFormData({ ...formData, smu_no: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">KODE BANDARA ASAL (DARI)</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-sky-600 transition-all uppercase bg-white font-mono"
                                        placeholder="Contoh: CGK"
                                        value={formData.smu_dari}
                                        onChange={e => setFormData({ ...formData, smu_dari: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">KODE BANDARA TUJUAN</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-sky-600 transition-all uppercase bg-white font-mono"
                                        placeholder="Contoh: SUB"
                                        value={formData.smu_tujuan}
                                        onChange={e => setFormData({ ...formData, smu_tujuan: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">EXPEDISI PENERUS / VENDOR</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-sky-600 bg-white uppercase"
                                        placeholder="Contoh: PT JNE CARGO AIR"
                                        value={formData.smu_kepada}
                                        onChange={e => setFormData({ ...formData, smu_kepada: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NAMA MASKAPAI / AIRLINE</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-sky-600 bg-white uppercase"
                                        placeholder="GARUDA INDONESIA / LION AIR..."
                                        value={formData.smu_maskapai}
                                        onChange={e => setFormData({ ...formData, smu_maskapai: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">FLIGHT CODE / NO. PENERBANGAN</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-sky-600 bg-white font-mono uppercase"
                                        placeholder="GA-312..."
                                        value={formData.smu_nomorpenerbangan}
                                        onChange={e => setFormData({ ...formData, smu_nomorpenerbangan: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">JUMLAH COLLY</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-sky-600 bg-white font-mono"
                                        placeholder="Jumlah koli..."
                                        value={formData.smu_colly}
                                        onChange={e => setFormData({ ...formData, smu_colly: e.target.value })}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">TOTAL BERAT (KG)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-sky-600 bg-white font-mono"
                                        placeholder="Berat dalam KG..."
                                        value={formData.smu_berat}
                                        onChange={e => setFormData({ ...formData, smu_berat: e.target.value })}
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
                                    className="w-[160px] py-3 bg-[#0284c7] hover:opacity-90 active:scale-98 text-white font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center text-xs shadow-md"
                                >
                                    {isEditMode ? 'UPDATE SMU' : 'ADD SMU'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuratMuatanUdara;