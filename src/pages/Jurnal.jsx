import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, Printer, X, Plus, Trash2, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import logoDakota from '../assets/new_logo 2.png';

const Jurnal = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [cabangList, setCabangList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [selectedCabang, setSelectedCabang] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [searchNoJurnal, setSearchNoJurnal] = useState('');
    const [isFilterActive, setIsFilterActive] = useState(false);

    // Modal Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        tjurh_no: '',
        tjurh_tanggal: today,
        tjurh_type: 'M',
        tjurh_keterangan: '',
        tjurh_cbid: '1'
    });

    // Detail List & Input Baris
    const [details, setDetails] = useState([]);
    const [entryRow, setEntryRow] = useState({
        tjurd_acccode: '',
        ca_name: '',
        tjurd_agenid: '1',
        agen_nama: '',
        tjurd_keterangan: '',
        tjurd_debet: 0,
        tjurd_kredit: 0
    });

    // Autocomplete COA
    const [coaList, setCoaList] = useState([]);
    const [showCoaDropdown, setShowCoaDropdown] = useState(false);
    const [coaKeyword, setCoaKeyword] = useState('');

    const [isPrintOpen, setIsPrintOpen] = useState(false);
    const [printData, setPrintData] = useState(null);

    const fetchCabangList = async () => {
        try {
            const token = localStorage.getItem('token');
            let res = await api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } });
            let list = res.data?.data || [];
            if (list.length === 0) {
                res = await api.get('/agens?limit=1000', { headers: { Authorization: `Bearer ${token}` } });
                list = res.data?.data || res.data || [];
            }
            setCabangList(list);
        } catch (err) {
            console.error("Gagal load cabang options:", err);
        }
    };

    const fetchJurnalData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let queryParams = `/gl/jurnal?limit=500`;

            if (isFilterActive) {
                if (startDate && endDate) queryParams += `&start_date=${startDate}&end_date=${endDate}`;
                if (selectedCabang) queryParams += `&cabang_nama=${selectedCabang}`;
                if (selectedType) queryParams += `&tipe_jurnal=${selectedType}`;
                if (searchNoJurnal) queryParams += `&no_jurnal=${searchNoJurnal}`;
            }

            const res = await api.get(queryParams, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data Jurnal:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCabangList();
    }, []);

    useEffect(() => {
        fetchJurnalData();
    }, [isFilterActive]);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        setIsFilterActive(true);
        fetchJurnalData();
    };

    const handleResetFilter = () => {
        setStartDate(firstDay);
        setEndDate(today);
        setSelectedCabang('');
        setSelectedType('');
        setSearchNoJurnal('');
        setIsFilterActive(false);
    };

    // Autocomplete COA
    const handleSearchCOA = async (q) => {
        setCoaKeyword(q);
        if (!q.trim()) {
            setCoaList([]);
            setShowCoaDropdown(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/gl/chart-accounts?q=${encodeURIComponent(q)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dataCOA = res.data?.data || [];
            setCoaList(dataCOA);
            setShowCoaDropdown(dataCOA.length > 0);
        } catch (err) {
            console.error("Gagal search COA:", err);
            setShowCoaDropdown(false);
        }
    };

    const handleSelectCOA = (coa) => {
        setEntryRow((prev) => ({
            ...prev,
            tjurd_acccode: coa.ca_id,
            ca_name: coa.ca_name,
            tjurd_keterangan: prev.tjurd_keterangan || formData.tjurh_keterangan || coa.ca_name
        }));
        setCoaKeyword(`${coa.ca_id} - ${coa.ca_name}`);
        setShowCoaDropdown(false);
    };

    // Tambah Baris Detail
    const handleAddRow = (e) => {
        if (e) e.preventDefault();

        if (!entryRow.tjurd_acccode) {
            Swal.fire({
                title: 'Peringatan',
                text: 'Pilih kode perkiraan (COA) terlebih dahulu!',
                icon: 'warning',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
            return;
        }

        const debet = parseFloat(entryRow.tjurd_debet) || 0;
        const kredit = parseFloat(entryRow.tjurd_kredit) || 0;

        if (debet <= 0 && kredit <= 0) {
            Swal.fire({
                title: 'Peringatan',
                text: 'Isi nominal Debet atau Kredit lebih dari 0!',
                icon: 'warning',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
            return;
        }

        const selectedCab = cabangList.find(c => String(c.agen_id || c.AgenID) === String(entryRow.tjurd_agenid));
        const newDetail = {
            ...entryRow,
            agen_nama: selectedCab ? (selectedCab.agen_nama || selectedCab.AgenNama) : 'DLI PUSAT',
            tjurd_debet: debet,
            tjurd_kredit: kredit
        };

        setDetails((prevDetails) => [...prevDetails, newDetail]);

        // Reset Entry
        setCoaKeyword('');
        setEntryRow({
            tjurd_acccode: '',
            ca_name: '',
            tjurd_agenid: formData.tjurh_cbid || '1',
            agen_nama: '',
            tjurd_keterangan: formData.tjurh_keterangan || '',
            tjurd_debet: 0,
            tjurd_kredit: 0
        });
    };

    const handleDeleteRow = (index) => {
        setDetails(details.filter((_, idx) => idx !== index));
    };

    // Buka Modal Tambah
    const handleAdd = () => {
        setIsEditMode(false);
        setFormData({
            tjurh_no: '',
            tjurh_tanggal: today,
            tjurh_type: 'M',
            tjurh_keterangan: '',
            tjurh_cbid: '1'
        });
        setDetails([]);
        setCoaKeyword('');
        setEntryRow({
            tjurd_acccode: '',
            ca_name: '',
            tjurd_agenid: '1',
            agen_nama: '',
            tjurd_keterangan: '',
            tjurd_debet: 0,
            tjurd_kredit: 0
        });
        setIsModalOpen(true);
    };

    // Buka Modal Edit
    const handleEdit = async (item) => {
        setIsEditMode(true);
        const ptId = localStorage.getItem('pt_id') || localStorage.getItem('selected_pt') || 'C';

        setFormData({
            tjurh_no: item.tjurh_no,
            tjurh_tanggal: item.tjurh_tanggal || today,
            tjurh_type: item.tjurh_type || 'M',
            tjurh_keterangan: item.tjurh_keterangan !== '-' ? item.tjurh_keterangan : '',
            tjurh_cbid: '1'
        });

        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/gl/jurnal/detail/${encodeURIComponent(item.tjurh_no)}?pt_id=${encodeURIComponent(ptId)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDetails(res.data?.details || []);
        } catch (err) {
            console.error("Gagal load detail jurnal:", err);
            setDetails([]);
        }

        setCoaKeyword('');
        setEntryRow({
            tjurd_acccode: '',
            ca_name: '',
            tjurd_agenid: '1',
            agen_nama: '',
            tjurd_keterangan: item.tjurh_keterangan !== '-' ? item.tjurh_keterangan : '',
            tjurd_debet: 0,
            tjurd_kredit: 0
        });
        setIsModalOpen(true);
    };

    // Hitung Total Debet, Kredit & Selisih
    const totalDebet = details.reduce((acc, curr) => acc + (parseFloat(curr.tjurd_debet) || 0), 0);
    const totalKredit = details.reduce((acc, curr) => acc + (parseFloat(curr.tjurd_kredit) || 0), 0);
    const selisih = Math.abs(totalDebet - totalKredit);

    // Simpan Jurnal
    const handleSaveForm = async (e) => {
        e.preventDefault();

        if (details.length === 0) {
            Swal.fire({
                title: 'Peringatan',
                text: 'Tambahkan rincian jurnal terlebih dahulu!',
                icon: 'warning',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
            return;
        }

        if (selisih !== 0) {
            Swal.fire({
                title: 'Jurnal Tidak Seimbang!',
                text: `Total Debet (Rp ${totalDebet.toLocaleString('id-ID')}) dan Total Kredit (Rp ${totalKredit.toLocaleString('id-ID')}) harus sama (Selisih: Rp ${selisih.toLocaleString('id-ID')}).`,
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const payload = {
                ...formData,
                details
            };

            const endpoint = isEditMode ? '/gl/jurnal/update' : '/gl/jurnal/create';
            await api.post(endpoint, payload, { headers });

            Swal.fire({
                title: 'BERHASIL!',
                text: `Data Jurnal berhasil ${isEditMode ? 'diperbarui' : 'ditambahkan'}.`,
                icon: 'success',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });

            setIsModalOpen(false);
            fetchJurnalData();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Gagal menyimpan jurnal.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Batalkan Jurnal?',
            text: `Apakah Anda yakin ingin membatalkan/void jurnal ${item.tjurh_no}?`,
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
                    await api.delete(`/gl/jurnal/${encodeURIComponent(item.tjurh_no)}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire({
                        title: 'TERHAPUS!',
                        text: 'Jurnal berhasil dibatalkan.',
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                    fetchJurnalData();
                } catch (err) {
                    Swal.fire({
                        title: 'GAGAL!',
                        text: err.response?.data?.message || 'Gagal membatalkan jurnal.',
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

    const formatDate = (dateString) => {
        if (!dateString || dateString === '-') return '-';
        const parts = dateString.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateString;
    };

    const columns = [
        {
            header: 'NO. JURNAL',
            accessor: 'tjurh_no',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.tjurh_no}</span>
        },
        {
            header: 'CABANG',
            accessor: 'agen_nama',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.agen_nama}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'tjurh_tanggal',
            render: (item) => <span className="font-mono text-slate-800">{formatDate(item.tjurh_tanggal)}</span>
        },
        {
            header: 'TYPE',
            accessor: 'tjurh_type',
            render: (item) => {
                const typeMap = { B: 'Pembelian', J: 'Penjualan', T: 'Terima Kas', K: 'Keluar Kas', M: 'Memorial' };
                return (
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {typeMap[item.tjurh_type] || item.tjurh_type}
                    </span>
                );
            }
        },
        {
            header: 'KETERANGAN',
            accessor: 'tjurh_keterangan',
            render: (item) => <span className="text-slate-600">{item.tjurh_keterangan}</span>
        },
        {
            header: 'STATUS',
            accessor: 'tjurh_deleteyn',
            render: (item) => item.tjurh_deleteyn === 'Y' ? (
                <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">BATAL</span>
            ) : (
                <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">AKTIF</span>
            )
        },
        {
            header: 'POSTING',
            accessor: 'tjurh_postyn',
            render: (item) => item.tjurh_postyn === 'Y' ? (
                <span className="font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-[10px]">POSTING</span>
            ) : (
                <span className="font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">UNPOSTED</span>
            )
        },
        {
            header: 'TOTAL (RP)',
            accessor: 'total_amount',
            render: (item) => <span className="font-mono font-bold text-emerald-600">Rp {(item.total_amount || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'PRINT',
            accessor: 'print_action',
            render: (item) => (
                <div className="flex items-center justify-center gap-1">
                    <button
                        onClick={() => handlePrint(item, 'A4')}
                        className="px-2 py-1 bg-sky-50 text-sky-600 border border-sky-200 rounded-md hover:bg-sky-100 transition cursor-pointer font-bold text-[10px] flex items-center gap-1"
                    >
                        <Printer size={12} /> A4
                    </button>
                    <button
                        onClick={() => handlePrint(item, 'Letter')}
                        className="px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-100 transition cursor-pointer font-bold text-[10px] flex items-center gap-1"
                    >
                        <Printer size={12} /> Letter
                    </button>
                </div>
            )
        }
    ];

    // MODAL FORM POPUP
    const modalElement = isModalOpen ? (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            style={{ zIndex: 99999 }}
        >
            <div className={`w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden transition-all transform ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                {/* Header Modal */}
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-base font-black uppercase tracking-wider text-slate-800">
                        {isEditMode ? `EDIT DATA JURNAL (${formData.tjurh_no})` : 'TAMBAH DATA JURNAL'}
                    </h2>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSaveForm} className="p-8 space-y-6 text-xs max-h-[85vh] overflow-y-auto">
                    {/* Header Info Jurnal */}
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                        <div className="font-bold uppercase tracking-wider text-slate-600">INFORMASI JURNAL</div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {isEditMode && (
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">NO. JURNAL :</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={formData.tjurh_no}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 font-bold text-slate-700 font-mono"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">CABANG :</label>
                                <select
                                    value={formData.tjurh_cbid}
                                    onChange={(e) => setFormData({ ...formData, tjurh_cbid: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-indigo-600"
                                >
                                    <option value="1">DLI PUSAT</option>
                                    {cabangList.map((cabang, idx) => (
                                        <option key={idx} value={cabang.agen_id || cabang.AgenID}>
                                            {cabang.agen_nama || cabang.AgenNama}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">TANGGAL :</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.tjurh_tanggal}
                                    onChange={(e) => setFormData({ ...formData, tjurh_tanggal: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">TYPE JURNAL :</label>
                                <select
                                    required
                                    value={formData.tjurh_type}
                                    onChange={(e) => setFormData({ ...formData, tjurh_type: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-indigo-600"
                                >
                                    <option value="M">Memorial (M)</option>
                                    <option value="K">Keluar Kas (K)</option>
                                    <option value="T">Terima Kas (T)</option>
                                    <option value="B">Pembelian (B)</option>
                                    <option value="J">Penjualan (J)</option>
                                </select>
                            </div>

                            <div className="md:col-span-4">
                                <label className="font-bold text-slate-700 block mb-1">KETERANGAN :</label>
                                <input
                                    type="text"
                                    placeholder="Masukkan keterangan header jurnal..."
                                    value={formData.tjurh_keterangan}
                                    onChange={(e) => setFormData({ ...formData, tjurh_keterangan: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-indigo-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tabel Rincian Jurnal */}
                    <div className="space-y-3">
                        <div className="font-bold uppercase tracking-wider text-slate-700">RINCIAN JURNAL</div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                            <table className="w-full text-left">
                                <thead className="bg-slate-800 text-white font-bold">
                                    <tr>
                                        <th className="p-2.5">KODE PERKIRAAN</th>
                                        <th className="p-2.5">CABANG / AGEN</th>
                                        <th className="p-2.5">KETERANGAN</th>
                                        <th className="p-2.5 text-right">DEBET (RP)</th>
                                        <th className="p-2.5 text-right">KREDIT (RP)</th>
                                        <th className="p-2.5 text-center">AKSI</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {details.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-2.5">
                                                <span className="font-mono font-bold text-sky-700">{item.tjurd_acccode}</span>
                                                <span className="block text-slate-500 font-medium text-[11px]">{item.ca_name}</span>
                                            </td>
                                            <td className="p-2.5 font-bold text-slate-700 uppercase">{item.agen_nama || 'DLI PUSAT'}</td>
                                            <td className="p-2.5 text-slate-800">{item.tjurd_keterangan}</td>
                                            <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                                                {parseFloat(item.tjurd_debet || 0).toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                                                {parseFloat(item.tjurd_kredit || 0).toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-2.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRow(idx)}
                                                    className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {details.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-4 text-center text-slate-400 font-medium">
                                                Belum ada rincian baris jurnal. Tambahkan di bawah.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-slate-100 font-black border-t border-slate-200">
                                    <tr>
                                        <td colSpan={3} className="p-2.5 text-right uppercase">TOTAL :</td>
                                        <td className="p-2.5 text-right font-mono text-emerald-700 text-sm">
                                            Rp {totalDebet.toLocaleString('id-ID')}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-emerald-700 text-sm">
                                            Rp {totalKredit.toLocaleString('id-ID')}
                                        </td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td colSpan={3} className="p-2 text-right uppercase text-slate-500">SELISIH :</td>
                                        <td colSpan={2} className={`p-2 text-center font-mono font-black ${selisih === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            Rp {selisih.toLocaleString('id-ID')} {selisih === 0 ? '(BALANCE)' : '(UNBALANCED)'}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Form Input Baris Rincian Baru */}
                        <div className="p-4 bg-sky-50/50 border border-sky-200 rounded-xl space-y-3">
                            <div className="font-bold text-sky-900 text-xs">TAMBAH BARIS RINCIAN:</div>
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                {/* Autocomplete COA */}
                                <div className="md:col-span-2 relative">
                                    <label className="font-bold text-slate-700 block mb-1">KODE PERKIRAAN (COA):</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Ketik nama / kode akun..."
                                            value={coaKeyword}
                                            onChange={(e) => handleSearchCOA(e.target.value)}
                                            onFocus={() => {
                                                if (coaKeyword) handleSearchCOA(coaKeyword);
                                            }}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-sky-500"
                                        />
                                        <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
                                    </div>

                                    {/* Dropdown COA */}
                                    {showCoaDropdown && coaList.length > 0 && (
                                        <div
                                            className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-y-auto divide-y divide-slate-100 max-h-48"
                                            style={{ zIndex: 9999999 }}
                                        >
                                            {coaList.map((coa, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => handleSelectCOA(coa)}
                                                    className="p-2.5 hover:bg-sky-50 cursor-pointer flex items-center justify-between text-xs transition"
                                                >
                                                    <span className="font-bold text-slate-800">{coa.ca_name}</span>
                                                    <span className="font-mono text-sky-600 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-100">{coa.ca_id}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">CABANG / AGEN :</label>
                                    <select
                                        value={entryRow.tjurd_agenid}
                                        onChange={(e) => setEntryRow({ ...entryRow, tjurd_agenid: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-sky-500"
                                    >
                                        <option value="1">DLI PUSAT</option>
                                        {cabangList.map((cabang, idx) => (
                                            <option key={idx} value={cabang.agen_id || cabang.AgenID}>
                                                {cabang.agen_nama || cabang.AgenNama}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">KETERANGAN :</label>
                                    <input
                                        type="text"
                                        placeholder="Keterangan baris..."
                                        value={entryRow.tjurd_keterangan}
                                        onChange={(e) => setEntryRow({ ...entryRow, tjurd_keterangan: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 outline-none focus:border-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">DEBET (RP):</label>
                                    <input
                                        type="number"
                                        value={entryRow.tjurd_debet}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            setEntryRow((prev) => ({ ...prev, tjurd_debet: val, tjurd_kredit: 0 }));
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800 outline-none focus:border-sky-500 text-right"
                                    />
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">KREDIT (RP):</label>
                                    <input
                                        type="number"
                                        value={entryRow.tjurd_kredit}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            setEntryRow((prev) => ({ ...prev, tjurd_kredit: val, tjurd_debet: 0 }));
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800 outline-none focus:border-sky-500 text-right"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={handleAddRow}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Plus size={14} /> Tambah Baris
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tombol Simpan / Keluar */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-8 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition shadow-md uppercase cursor-pointer"
                        >
                            KELUAR
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg transition shadow-md uppercase cursor-pointer"
                        >
                            {isEditMode ? 'SIMPAN PERUBAHAN JURNAL' : 'SIMPAN JURNAL'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    // Print Voucher Handler Murni Dinamis dari Database
    const handlePrint = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || localStorage.getItem('selected_pt') || 'C';

            const res = await api.get(`/gl/jurnal/detail/${encodeURIComponent(item.tjurh_no)}?pt_id=${encodeURIComponent(ptId)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const jDetails = res.data?.details || [];

            // Validasi: jika tidak ada rincian baris di database, hentikan proses cetak
            if (jDetails.length === 0) {
                Swal.fire({
                    title: 'Rincian Kosong',
                    text: `Jurnal ${item.tjurh_no} belum memiliki rincian transaksi di database.`,
                    icon: 'warning',
                    didOpen: () => {
                        const container = document.querySelector('.swal2-container');
                        if (container) container.style.zIndex = '9999999';
                    }
                });
                return;
            }

            // Pisahkan baris Debet & Kredit murni dari data database
            const creditRows = jDetails.filter(d => Number(d.tjurd_kredit) > 0);
            const debitRows = jDetails.filter(d => Number(d.tjurd_debet) > 0);

            // Tentukan akun lawan/sumber dana utama
            const mainCredit = creditRows[0] || {};
            const lawanCode = mainCredit.tjurd_acccode || '-';
            const lawanName = mainCredit.ca_name || '-';

            // Petakan rincian baris transaksi (Debet)
            const details = debitRows.map(d => ({
                code: d.tjurd_acccode,
                nama: d.ca_name,
                keterangan: d.tjurd_keterangan,
                nominal: Number(d.tjurd_debet) || 0
            }));

            // Hitung total nilai transaksi
            const totalAmount = item.total_amount ||
                debitRows.reduce((sum, d) => sum + Number(d.tjurd_debet || 0), 0) ||
                creditRows.reduce((sum, d) => sum + Number(d.tjurd_kredit || 0), 0);

            setPrintData({
                noTrans: item.tjurh_no,
                tanggal: formatDate(item.tjurh_tanggal),
                keterangan: item.tjurh_keterangan,
                tipe: item.tjurh_type,
                total: totalAmount,
                lawanCode,
                lawanName,
                details
            });
            setIsPrintOpen(true);
        } catch (err) {
            console.error("Gagal load print voucher:", err);
            Swal.fire({
                title: 'GAGAL PRINT',
                text: 'Tidak dapat memuat data rincian jurnal untuk dicetak.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
    };

    return (
        <div className="space-y-4">
            {/* Filter Panel */}
            <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                    <Filter size={16} className="text-sky-600" />
                    FILTER JURNAL KEUANGAN
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
                        <label className="font-bold text-slate-500 block mb-1">CABANG / AGEN</label>
                        <select
                            value={selectedCabang}
                            onChange={(e) => setSelectedCabang(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA CABANG --</option>
                            {cabangList.map((cabang, idx) => (
                                <option key={idx} value={cabang.agen_nama || cabang.AgenNama}>
                                    {cabang.agen_nama || cabang.AgenNama}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">TIPE JURNAL</label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                        >
                            <option value="">-- SEMUA TIPE --</option>
                            <option value="B">Pembelian (B)</option>
                            <option value="J">Penjualan (J)</option>
                            <option value="T">Terima Kas (T)</option>
                            <option value="K">Keluar Kas (K)</option>
                            <option value="M">Memorial (M)</option>
                        </select>
                    </div>

                    <div>
                        <label className="font-bold text-slate-500 block mb-1">CARI NO. JURNAL</label>
                        <input
                            type="text"
                            placeholder="Ketik Nomor Jurnal..."
                            value={searchNoJurnal}
                            onChange={(e) => setSearchNoJurnal(e.target.value)}
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
                        TAMPILKAN JURNAL
                    </button>
                </div>
            </form>

            <DataTableTemplate
                title="JURNAL KEUANGAN GENERAL LEDGER"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {modalElement && ReactDOM.createPortal(modalElement, document.body)}
            {/* MODAL PRINT VOUCHER */}
            {isPrintOpen && printData && ReactDOM.createPortal(
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity" style={{ zIndex: 999999 }}>
                    <div className="w-full max-w-4xl bg-white text-slate-800 rounded-2xl shadow-2xl overflow-hidden p-8 space-y-6">
                        <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                            <button
                                type="button"
                                onClick={() => setIsPrintOpen(false)}
                                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition text-xs"
                            >
                                ← Tutup
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow transition text-xs flex items-center gap-1.5"
                            >
                                <Printer size={14} /> Print Voucher
                            </button>
                        </div>

                        {/* Layout Voucher Sesuai Gambar */}
                        <div className="border border-slate-300 rounded-xl p-8 space-y-6 bg-white text-xs">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-black text-sm tracking-wider text-slate-900">DAKOTA LOGISTIK INDONESIA</div>
                                    <div className="text-slate-600">Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi</div>
                                    <div className="text-slate-600">BEKASI KOTA</div>
                                    <div className="text-slate-600">(021) 8603278 / (021) 86608589</div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <img
                                        src={logoDakota}
                                        alt="Dakota Cargo"
                                        className="h-10 w-auto object-contain"
                                    />
                                </div>

                            </div>

                            <div className="text-center">
                                <span className="font-black text-sm uppercase underline tracking-wider text-slate-900">
                                    VOUCHER PENGELUARAN KAS
                                </span>
                            </div>

                            <div className="space-y-1">
                                <div className="flex"><span className="w-28 font-bold">No. Transaksi</span><span>: {printData.noTrans}</span></div>
                                <div className="flex"><span className="w-28 font-bold">Tanggal</span><span>: {printData.tanggal}</span></div>
                                <div className="flex"><span className="w-28 font-bold">Keterangan</span><span>: {printData.keterangan}</span></div>
                            </div>

                            <table className="w-full border-collapse border border-slate-400 text-left">
                                <thead className="bg-slate-100 font-bold border-b border-slate-400">
                                    <tr>
                                        <th className="p-2 border border-slate-400">Account</th>
                                        <th className="p-2 border border-slate-400 text-center">CC</th>
                                        <th className="p-2 border border-slate-400">Keterangan</th>
                                        <th className="p-2 border border-slate-400 text-right">Debet</th>
                                        <th className="p-2 border border-slate-400 text-right">Kredit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Baris Kredit (Sumber Bank/Kas) */}
                                    <tr>
                                        <td className="p-2 border border-slate-400 font-mono">{printData.lawanCode}</td>
                                        <td className="p-2 border border-slate-400 text-center">1</td>
                                        <td className="p-2 border border-slate-400 font-bold">{printData.lawanName} : {printData.keterangan}</td>
                                        <td className="p-2 border border-slate-400 text-right font-mono">0.00</td>
                                        <td className="p-2 border border-slate-400 text-right font-mono">{printData.total.toLocaleString('id-ID')},00</td>
                                    </tr>
                                    {/* Baris Debet (Rincian Biaya/Uang Muka) */}
                                    {printData.details.map((d, i) => (
                                        <tr key={i}>
                                            <td className="p-2 border border-slate-400 font-mono">{d.code}</td>
                                            <td className="p-2 border border-slate-400 text-center">1</td>
                                            <td className="p-2 border border-slate-400 font-bold">{d.nama} : {d.keterangan}</td>
                                            <td className="p-2 border border-slate-400 text-right font-mono">{Number(d.nominal).toLocaleString('id-ID')},00</td>
                                            <td className="p-2 border border-slate-400 text-right font-mono">0.00</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="font-black bg-slate-50 border-t border-slate-400">
                                    <tr>
                                        <td colSpan={3} className="p-2 text-right uppercase border border-slate-400">TOTAL</td>
                                        <td className="p-2 text-right border border-slate-400 font-mono">{printData.total.toLocaleString('id-ID')},00</td>
                                        <td className="p-2 text-right border border-slate-400 font-mono">{printData.total.toLocaleString('id-ID')},00</td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* Tanda Tangan */}
                            <div className="grid grid-cols-3 text-center pt-8 font-bold">
                                <div>
                                    <div className="mb-14">Diterima</div>
                                    <div className="underline">( Keuangan )</div>
                                </div>
                                <div>
                                    <div className="mb-14">Disetujui</div>
                                    <div className="underline">( Direksi )</div>
                                </div>
                                <div>
                                    <div className="mb-14">Diketahui</div>
                                    <div className="underline">( Akunting )</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Jurnal;