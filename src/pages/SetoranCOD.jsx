import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, Printer, X, Plus, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

const SetoranCOD = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [cabangList, setCabangList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [selectedCabang, setSelectedCabang] = useState('');
    const [searchPenyetor, setSearchPenyetor] = useState('');
    const [searchNoBTT, setSearchNoBTT] = useState('');
    const [searchNoCOD, setSearchNoCOD] = useState('');
    const [isFilterActive, setIsFilterActive] = useState(false);

    // Modal Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        cod_id: '',
        cod_cbid: '',
        cod_tanggal: today,
        cod_penyetor: '',
        details: [{ codd_bttid: '', codd_nilai: 0 }]
    });

    const fetchCabangList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/gl/agen-ca?stt=2', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = res.data?.data || [];
            setCabangList(list);
            if (list.length > 0 && !formData.cod_cbid) {
                setFormData(prev => ({ ...prev, cod_cbid: list[0].agen_id || list[0].agen_nama }));
            }
        } catch (err) {
            console.error("Gagal load cabang options:", err);
        }
    };

    const fetchSetoranCODData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let queryParams = `/gl/setoran-cod?limit=500`;

            if (isFilterActive) {
                if (startDate && endDate) queryParams += `&start_date=${startDate}&end_date=${endDate}`;
                if (searchPenyetor) queryParams += `&penyetor=${searchPenyetor}`;
                if (searchNoBTT) queryParams += `&no_btt=${searchNoBTT}`;
                if (searchNoCOD) queryParams += `&no_cod=${searchNoCOD}`;
            }

            const res = await api.get(queryParams, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data Setoran COD:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCabangList();
    }, []);

    useEffect(() => {
        fetchSetoranCODData();
    }, [isFilterActive]);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        setIsFilterActive(true);
        fetchSetoranCODData();
    };

    const handleResetFilter = () => {
        setStartDate(today);
        setEndDate(today);
        setSelectedCabang('');
        setSearchPenyetor('');
        setSearchNoBTT('');
        setSearchNoCOD('');
        setIsFilterActive(false);
    };

    const handleAdd = () => {
        setIsEditMode(false);
        setFormData({
            cod_id: '',
            cod_cbid: cabangList.length > 0 ? (cabangList[0].agen_id || cabangList[0].agen_nama) : '',
            cod_tanggal: today,
            cod_penyetor: '',
            details: [{ codd_bttid: '', codd_nilai: 0 }]
        });
        setIsModalOpen(true);
    };

    const handleEdit = async (item) => {
        setIsEditMode(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/gl/setoran-cod/detail/${item.cod_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const rawDetails = res.data?.details || [];

            // 🌟 Memastikan mapping key codd_bttid terambil dengan aman
            const formattedDetails = rawDetails.map(d => ({
                codd_bttid: d.codd_bttid || d.CODD_BTTID || '',
                codd_nilai: d.codd_nilai !== undefined ? d.codd_nilai : (d.CODD_Nilai || 0)
            }));

            setFormData({
                cod_id: item.cod_id,
                cod_cbid: item.cod_cbid || (cabangList.length > 0 ? (cabangList[0].agen_id || cabangList[0].agen_nama) : ''),
                cod_tanggal: item.cod_tanggal || today,
                cod_penyetor: item.cod_penyetor !== '-' ? item.cod_penyetor : '',
                details: formattedDetails.length > 0 ? formattedDetails : [{ codd_bttid: '', codd_nilai: 0 }]
            });
            setIsModalOpen(true);
        } catch (err) {
            console.error("Gagal load detail COD:", err);
        }
    };

    const handleAddDetailRow = () => {
        setFormData({
            ...formData,
            details: [...formData.details, { codd_bttid: '', codd_nilai: 0 }]
        });
    };

    const handleRemoveDetailRow = (index) => {
        if (formData.details.length <= 1) return;
        const newDetails = [...formData.details];
        newDetails.splice(index, 1);
        setFormData({ ...formData, details: newDetails });
    };

    const handleDetailChange = (index, field, value) => {
        const newDetails = [...formData.details];
        newDetails[index][field] = value;
        setFormData({ ...formData, details: newDetails });
    };

    const handleSaveForm = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                details: formData.details.map(d => ({
                    codd_bttid: stringsTrim(d.codd_bttid),
                    codd_nilai: parseFloat(d.codd_nilai) || 0
                }))
            };

            if (isEditMode) {
                await api.put('/gl/setoran-cod/update', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await api.post('/gl/setoran-cod/create', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            Swal.fire({
                title: 'BERHASIL!',
                text: isEditMode ? 'Setoran COD Berhasil Diperbarui.' : 'Setoran COD Berhasil Disimpan.',
                icon: 'success',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });

            setIsModalOpen(false);
            fetchSetoranCODData();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Gagal menyimpan transaksi.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
    };

    const stringsTrim = (str) => (str ? String(str).trim() : '');

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Batalkan Setoran COD?',
            text: `Apakah Anda yakin ingin membatalkan Setoran COD No ${item.cod_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Batalkan!',
            cancelButtonText: 'Batal',
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/gl/setoran-cod/${item.cod_id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire({
                        title: 'TERHAPUS!',
                        text: 'Setoran COD berhasil dibatalkan.',
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                    fetchSetoranCODData();
                } catch (err) {
                    Swal.fire({
                        title: 'GAGAL!',
                        text: err.response?.data?.message || 'Gagal membatalkan transaksi.',
                        icon: 'error',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                }
            }
        });
    };

    const handlePrint = (item) => {
        Swal.fire({
            title: 'PRINT SETORAN COD',
            text: `Mencetak bukti setoran COD No ${item.cod_id}...`,
            icon: 'info',
            confirmButtonColor: '#0284c7',
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        });
    };

    const formatDate = (dateString) => {
        if (!dateString || dateString === '-') return '-';
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateString;
    };

    const calculateGrandTotal = () => {
        return formData.details.reduce((sum, item) => sum + (parseFloat(item.codd_nilai) || 0), 0);
    };

    const columns = [
        {
            header: 'NO. SETORAN',
            accessor: 'cod_id',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.cod_id}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'cod_tanggal',
            render: (item) => <span className="font-mono text-slate-800">{formatDate(item.cod_tanggal)}</span>
        },
        {
            header: 'PENYETOR (LOPER/KURIR)',
            accessor: 'cod_penyetor',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.cod_penyetor}</span>
        },
        {
            header: 'JUMLAH BTT',
            accessor: 'jumlah_btt',
            render: (item) => <span className="font-mono font-bold text-amber-600">{item.jumlah_btt || 0} BTT</span>
        },
        {
            header: 'TOTAL SETORAN (RP)',
            accessor: 'total_nilai',
            render: (item) => <span className="font-mono font-bold text-emerald-600">Rp {(item.total_nilai || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'PEMBUAT',
            accessor: 'cod_updateid',
            render: (item) => <span className="text-slate-600 font-mono">{item.cod_updateid}</span>
        },
        {
            header: 'STATUS',
            accessor: 'cod_aktifyn',
            render: (item) => item.cod_aktifyn === 'N' ? (
                <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">BATAL</span>
            ) : (
                <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">AKTIF</span>
            )
        },
        {
            header: 'PRINT',
            accessor: 'print_action',
            render: (item) => (
                <button
                    onClick={() => handlePrint(item)}
                    className="p-1.5 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-100 transition cursor-pointer flex items-center gap-1 mx-auto font-bold text-xs"
                >
                    <Printer size={14} /> Print
                </button>
            )
        }
    ];

    // Modal Popup Template
    const modalElement = isModalOpen ? (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            style={{ zIndex: 99999 }}
        >
            <div className={`w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden transition-all transform ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-base font-black uppercase tracking-wider text-slate-800">
                        {isEditMode ? `EDIT SETORAN COD (${formData.cod_id})` : 'ADD SETORAN COD INFO'}
                    </h2>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveForm} className="p-8 space-y-5 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Kode Cabang */}
                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">Kode Cabang</label>
                            <select
                                required
                                value={formData.cod_cbid}
                                onChange={(e) => setFormData({ ...formData, cod_cbid: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800 uppercase outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            >
                                <option value="">-- Pilih Kode Cabang --</option>
                                {cabangList.map((cabang, idx) => {
                                    const idVal = cabang.agen_id ? String(cabang.agen_id) : '1';
                                    return (
                                        <option key={idx} value={idVal}>
                                            {cabang.agen_nama} ({idVal})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Tanggal Setoran */}
                        <div>
                            <label className="font-bold text-slate-700 block mb-1.5">Tanggal Setoran</label>
                            <input
                                type="date"
                                required
                                value={formData.cod_tanggal}
                                onChange={(e) => setFormData({ ...formData, cod_tanggal: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            />
                        </div>

                        {/* Nama Penyetor */}
                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-700 block mb-1.5">Nama Penyetor (Kurir / Loper)</label>
                            <input
                                type="text"
                                required
                                placeholder="Contoh: BUDI SANTOSO (LOPER)"
                                value={formData.cod_penyetor}
                                onChange={(e) => setFormData({ ...formData, cod_penyetor: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800 uppercase outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                            />
                        </div>
                    </div>

                    {/* Rincian Detail BTT */}
                    <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <label className="font-black text-slate-700 uppercase tracking-wider">
                                RINCIAN BTT SETORAN COD ({formData.details.length} BTT)
                            </label>
                            <button
                                type="button"
                                onClick={handleAddDetailRow}
                                className="px-3 py-1.5 bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 font-bold rounded-lg transition flex items-center gap-1 cursor-pointer text-xs"
                            >
                                <Plus size={14} /> Tambah Row BTT
                            </button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {formData.details.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                    <span className="font-mono font-bold text-slate-400 w-6 text-center">{idx + 1}.</span>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            required
                                            placeholder="Nomor BTT / STT"
                                            value={item.codd_bttid}
                                            onChange={(e) => handleDetailChange(idx, 'codd_bttid', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-white outline-none focus:border-indigo-600"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            required
                                            placeholder="Nominal COD (Rp)"
                                            value={item.codd_nilai}
                                            onChange={(e) => handleDetailChange(idx, 'codd_nilai', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-emerald-600 bg-white outline-none focus:border-indigo-600"
                                        />
                                    </div>
                                    {formData.details.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveDetailRow(idx)}
                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Total Summary */}
                        <div className="flex justify-end pt-3">
                            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase block">GRAND TOTAL SETORAN COD</span>
                                <span className="text-lg font-black font-mono text-emerald-600">
                                    Rp {calculateGrandTotal().toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-8 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition uppercase cursor-pointer"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg transition shadow-md uppercase cursor-pointer"
                        >
                            {isEditMode ? 'UPDATE SETORAN' : 'SAVE SETORAN'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-4">
            {/* Filter Panel */}
            <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                    <Filter size={16} className="text-sky-600" />
                    FILTER SETORAN COD
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="font-bold text-slate-500 block mb-1">TGL MULAI</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="font-bold text-slate-500 block mb-1">TGL SAMPAI</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">PENYETOR (LOPER/KURIR)</label>
                        <input
                            type="text"
                            placeholder="Cari Penyetor..."
                            value={searchPenyetor}
                            onChange={(e) => setSearchPenyetor(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        />
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">NO. BTT / STT</label>
                        <input
                            type="text"
                            placeholder="Cari No BTT..."
                            value={searchNoBTT}
                            onChange={(e) => setSearchNoBTT(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        />
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">NO. SETORAN COD</label>
                        <input
                            type="text"
                            placeholder="Cari No COD..."
                            value={searchNoCOD}
                            onChange={(e) => setSearchNoCOD(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={handleResetFilter}
                        className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer"
                    >
                        RESET
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer"
                    >
                        TAMPILKAN SETORAN
                    </button>
                </div>
            </form>

            <DataTableTemplate
                title="SETORAN COD"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {modalElement && ReactDOM.createPortal(modalElement, document.body)}
        </div>
    );
};

export default SetoranCOD;