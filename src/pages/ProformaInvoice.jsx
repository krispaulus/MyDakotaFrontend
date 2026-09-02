import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    FileText,
    Printer,
    X,
    CheckCircle2,
    Plus,
    Calendar,
    Building,
    Search,
    RotateCcw,
    Trash2,
    Edit3,
    User
} from 'lucide-react';
import Swal from 'sweetalert2';

const ProformaInvoice = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [agens, setAgens] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [showFilter, setShowFilter] = useState(false);

    // Filter Form State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [filterCabang, setFilterCabang] = useState('ALL');
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterNoPI, setFilterNoPI] = useState('');
    const [filterNoBTT, setFilterNoBTT] = useState('');

    // Modal State
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedPI, setSelectedPI] = useState(null);
    const [bttItems, setBttItems] = useState([]);

    // Form State (Create & Edit)
    const [formData, setFormData] = useState({
        pih_id: '',
        cust_id: '',
        agen_id: '',
        tanggal: new Date().toISOString().split('T')[0],
        no_mobil: '',
        nm_sopir: '',
        no_do: '',
        tgl_pu: new Date().toISOString().split('T')[0],
        lokasi_pu: '',
        btt_input: ''
    });

    const toggleFilterPanel = () => setShowFilter(prev => !prev);

    const fetchData = async (useDateFilter = false) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const params = { pt_id: ptId };
            if (useDateFilter && startDate && endDate) {
                params.start_date = startDate;
                params.end_date = endDate;
            }
            if (filterCabang !== 'ALL') params.cabang = filterCabang;
            if (filterCustomer) params.customer = filterCustomer;
            if (filterNoPI) params.nopi = filterNoPI;
            if (filterNoBTT) params.nobtt = filterNoBTT;

            const res = await api.get('/piutang/proforma-invoice', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load proforma invoice:", err);
            Swal.fire('Error', 'Gagal memuat data Proforma Invoice', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const [resAgen, resCust] = await Promise.all([
                api.get(`/agens?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } })
                    .catch(() => ({ data: { data: [] } })),
                api.get(`/pelanggan?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } })
                    .catch(() => api.get(`/customers?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } }))
                    .catch(() => ({ data: { data: [] } }))
            ]);

            const agnList = resAgen.data?.data || [];
            const cstList = resCust.data?.data || [];
            setAgens(agnList);
            setCustomers(cstList);
            if (agnList.length > 0) setFormData(p => ({ ...p, agen_id: agnList[0].agen_id }));
            if (cstList.length > 0) setFormData(p => ({ ...p, cust_id: cstList[0].cust_id }));
        } catch (err) {
            console.error("Gagal load options:", err);
        }
    };

    useEffect(() => {
        fetchData();
        fetchOptions();
    }, []);

    const handleResetFilter = () => {
        const d = new Date();
        setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
        setEndDate(new Date().toISOString().split('T')[0]);
        setFilterCabang('ALL');
        setFilterCustomer('');
        setFilterNoPI('');
        setFilterNoBTT('');
        fetchData(false);
    };

    const handleOpenCreate = () => {
        setIsEditMode(false);
        setFormData({
            pih_id: '',
            cust_id: customers[0]?.cust_id || '',
            agen_id: agens[0]?.agen_id || '',
            tanggal: new Date().toISOString().split('T')[0],
            no_mobil: '',
            nm_sopir: '',
            no_do: '',
            tgl_pu: new Date().toISOString().split('T')[0],
            lokasi_pu: '',
            btt_input: ''
        });
        setIsFormModalOpen(true);
    };

    const handleOpenEdit = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get('/piutang/proforma-invoice/detail', {
                params: { pih_id: item.pih_id, pt_id: ptId },
                headers: { Authorization: `Bearer ${token}` }
            });

            const head = res.data?.data?.header || item;
            const items = res.data?.data?.items || [];
            const bttStr = items.map(b => b.btt_id).join('\n');

            setIsEditMode(true);
            setFormData({
                pih_id: head.pih_id,
                cust_id: head.pih_custid,
                agen_id: head.pih_agenid,
                tanggal: head.pih_tanggal_str,
                no_mobil: head.pih_nomobil || '',
                nm_sopir: head.pih_nmsopir || '',
                no_do: head.pih_nodo || '',
                tgl_pu: head.pih_tglpu_str !== '-' ? head.pih_tglpu_str : new Date().toISOString().split('T')[0],
                lokasi_pu: head.pih_lokasipu || '',
                btt_input: bttStr
            });
            setIsFormModalOpen(true);
        } catch (err) {
            console.error("Gagal load edit PI:", err);
            Swal.fire('Error', 'Gagal memuat data untuk diedit', 'error');
        }
    };

    const handleOpenDetail = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get('/piutang/proforma-invoice/detail', {
                params: { pih_id: item.pih_id, pt_id: ptId },
                headers: { Authorization: `Bearer ${token}` }
            });

            setSelectedPI(res.data?.data?.header || item);
            setBttItems(res.data?.data?.items || []);
            setIsDetailModalOpen(true);
        } catch (err) {
            console.error("Gagal load detail PI:", err);
            Swal.fire('Error', 'Gagal memuat rincian Proforma Invoice', 'error');
        }
    };

    const handleSaveForm = async () => {
        if (!formData.cust_id) {
            Swal.fire('Peringatan', 'Silakan pilih Customer/Pelanggan!', 'warning');
            return;
        }

        const bttArr = formData.btt_input.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        if (bttArr.length === 0) {
            Swal.fire('Peringatan', 'Masukkan minimal satu nomor resi BTT!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            if (isEditMode) {
                await api.post('/piutang/proforma-invoice/update', {
                    pt_id: ptId,
                    pih_id: formData.pih_id,
                    cust_id: formData.cust_id,
                    agen_id: formData.agen_id,
                    tanggal: formData.tanggal,
                    no_mobil: formData.no_mobil,
                    nm_sopir: formData.nm_sopir,
                    no_do: formData.no_do,
                    tgl_pu: formData.tgl_pu,
                    lokasi_pu: formData.lokasi_pu,
                    btt_ids: bttArr
                }, { headers: { Authorization: `Bearer ${token}` } });

                Swal.fire('Sukses', 'Proforma Invoice berhasil diperbarui', 'success');
            } else {
                await api.post('/piutang/proforma-invoice/create', {
                    pt_id: ptId,
                    cust_id: formData.cust_id,
                    agen_id: formData.agen_id,
                    tanggal: formData.tanggal,
                    no_mobil: formData.no_mobil,
                    nm_sopir: formData.nm_sopir,
                    no_do: formData.no_do,
                    tgl_pu: formData.tgl_pu,
                    lokasi_pu: formData.lokasi_pu,
                    btt_ids: bttArr
                }, { headers: { Authorization: `Bearer ${token}` } });

                Swal.fire('Sukses', 'Proforma Invoice baru berhasil dibuat', 'success');
            }

            setIsFormModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Gagal simpan proforma:", err);
            Swal.fire('Error', 'Gagal menyimpan Proforma Invoice', 'error');
        }
    };

    const handleCancelPI = async (pihID) => {
        const confirm = await Swal.fire({
            title: 'Hapus / Batalkan PI?',
            text: `Apakah Anda yakin ingin membatalkan Proforma Invoice ${pihID}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Batalkan!'
        });

        if (confirm.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const ptId = localStorage.getItem('pt_id') || 'C';
                await api.post(`/piutang/proforma-invoice/cancel?pih_id=${encodeURIComponent(pihID)}&pt_id=${ptId}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                Swal.fire('Berhasil', 'Proforma Invoice telah dinonaktifkan', 'success');
                setIsDetailModalOpen(false);
                fetchData();
            } catch (err) {
                console.error("Gagal batal PI:", err);
                Swal.fire('Error', 'Gagal membatalkan Proforma Invoice', 'error');
            }
        }
    };

    const columns = [
        {
            header: 'NO. PI',
            accessor: 'pih_id',
            render: (item) => (
                <button
                    type="button"
                    onClick={() => handleOpenDetail(item)}
                    className="font-mono font-black text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                    {item.pih_id}
                </button>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'pih_tanggal_str',
            render: (item) => <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-mono font-bold">{item.pih_tanggal_str || '-'}</span>
        },
        {
            header: 'CUSTOMER',
            accessor: 'cust_name',
            render: (item) => <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold">{item.cust_name || item.pih_custid || '-'}</span>
        },
        {
            header: 'NO. MOBIL',
            accessor: 'pih_nomobil',
            render: (item) => <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-mono font-bold">{item.pih_nomobil || '-'}</span>
        },
        {
            header: 'SOPIR',
            accessor: 'pih_nmsopir',
            render: (item) => <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold">{item.pih_nmsopir || '-'}</span>
        },
        {
            header: 'NO. DO',
            accessor: 'pih_nodo',
            render: (item) => <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-mono font-bold">{item.pih_nodo || '-'}</span>
        },
        {
            header: 'TGL PICKUP',
            accessor: 'pih_tglpu_str',
            render: (item) => <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-mono font-bold">{item.pih_tglpu_str || '-'}</span>
        },
        {
            header: 'LOKASI PICKUP',
            accessor: 'pih_lokasipu',
            render: (item) => <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold">{item.pih_lokasipu || '-'}</span>
        },
        {
            header: 'BTT',
            accessor: 'jbtt',
            render: (item) => <span className="font-mono font-black text-blue-600 dark:text-blue-400">{item.jbtt || 0}</span>
        },
        {
            header: 'STATUS',
            accessor: 'pih_aktifyn',
            render: (item) => (
                item.pih_aktifyn === 'N' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                        BATAL
                    </span>
                ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                        AKTIF
                    </span>
                )
            )
        }
    ];

    // Kolom Aksi Lengkap: Edit, Print/View, Hapus (Batal)
    const renderCustomActions = (item) => (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => handleOpenDetail(item)}
                className="text-blue-600 hover:text-blue-800 transition cursor-pointer p-1"
                title="Lihat / Cetak Proforma"
            >
                <FileText size={17} />
            </button>
            <button
                type="button"
                onClick={() => handleOpenEdit(item)}
                className="text-amber-500 hover:text-amber-700 transition cursor-pointer p-1"
                title="Edit Proforma Invoice"
            >
                <Edit3 size={17} />
            </button>
            {item.pih_aktifyn === 'Y' && (
                <button
                    type="button"
                    onClick={() => handleCancelPI(item.pih_id)}
                    className="text-rose-500 hover:text-rose-700 transition cursor-pointer p-1"
                    title="Batalkan / Nonaktifkan PI"
                >
                    <Trash2 size={17} />
                </button>
            )}
        </div>
    );

    const filterPanelContent = (
        <div className={`p-5 rounded-2xl border shadow-sm transition-all mb-4 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
                <div>
                    <label className={`block mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                        <Calendar size={13} /> DARI TANGGAL :
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                    />
                </div>
                <div>
                    <label className={`block mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                        <Calendar size={13} /> SAMPAI TANGGAL :
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                    />
                </div>
                <div>
                    <label className={`block mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                        <Building size={13} /> CABANG / AGEN :
                    </label>
                    <select
                        value={filterCabang}
                        onChange={(e) => setFilterCabang(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                    >
                        <option value="ALL">-- SEMUA CABANG --</option>
                        {agens.map((a) => (
                            <option key={a.agen_id} value={a.agen_nama}>{a.agen_nama}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={`block mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                        <User size={13} /> CUSTOMER :
                    </label>
                    <input
                        type="text"
                        placeholder="Ketik nama customer..."
                        value={filterCustomer}
                        onChange={(e) => setFilterCustomer(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl font-bold outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-gray-700">
                <button
                    type="button"
                    onClick={handleResetFilter}
                    className="px-4 py-2 border rounded-xl font-bold text-xs flex items-center gap-1.5 transition text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                    <RotateCcw size={14} /> Reset
                </button>
                <button
                    type="button"
                    onClick={() => fetchData(true)}
                    disabled={loading}
                    className="px-6 py-2 bg-[#2563eb] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                    <Search size={15} /> {loading ? 'MEMUAT...' : 'CARI DATA'}
                </button>
            </div>
        </div>
    );

    return (
        <div
            className="space-y-4"
            onClickCapture={(e) => {
                const target = e.target;
                if (target.closest('button') && target.closest('button').innerText?.includes('Filter')) {
                    toggleFilterPanel();
                }
            }}
        >
            {showFilter && filterPanelContent}

            <DataTableTemplate
                title="PROFORMA INVOICE"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleOpenCreate}
                onFilter={toggleFilterPanel}
                renderExtraActions={renderCustomActions}
            />

            {/* MODAL TAMBAH & EDIT PROFORMA INVOICE */}
            {isFormModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-2xl p-6 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] bg-white text-slate-900 border border-slate-300">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-300 mb-4">
                            <h3 className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
                                {isEditMode ? <Edit3 size={20} className="text-amber-600" /> : <Plus size={20} className="text-blue-600 stroke-[3]" />}
                                {isEditMode ? `Edit Proforma Invoice (${formData.pih_id})` : 'Tambah Proforma Invoice Baru'}
                            </h3>
                            <button onClick={() => setIsFormModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-600 hover:text-black">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-3.5 text-xs font-semibold overflow-y-auto p-1">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold mb-1 text-slate-800">CUSTOMER / PELANGGAN :</label>
                                    <select
                                        value={formData.cust_id}
                                        onChange={(e) => setFormData(p => ({ ...p, cust_id: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold outline-none bg-white text-slate-900 cursor-pointer"
                                    >
                                        {customers.map((c) => (
                                            <option key={c.cust_id} value={c.cust_id}>{c.cust_id} - {c.cust_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold mb-1 text-slate-800">CABANG PENERBIT :</label>
                                    <select
                                        value={formData.agen_id}
                                        onChange={(e) => setFormData(p => ({ ...p, agen_id: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold outline-none bg-white text-slate-900 cursor-pointer"
                                    >
                                        {agens.map((a) => (
                                            <option key={a.agen_id} value={a.agen_id}>{a.agen_nama}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold mb-1 text-slate-800">TANGGAL PI :</label>
                                    <input
                                        type="date"
                                        value={formData.tanggal}
                                        onChange={(e) => setFormData(p => ({ ...p, tanggal: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold font-mono outline-none bg-white text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold mb-1 text-slate-800">NO. MOBIL :</label>
                                    <input
                                        type="text"
                                        placeholder="B 1234 ABC"
                                        value={formData.no_mobil}
                                        onChange={(e) => setFormData(p => ({ ...p, no_mobil: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold font-mono outline-none bg-white uppercase text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold mb-1 text-slate-800">NAMA SOPIR :</label>
                                    <input
                                        type="text"
                                        placeholder="Nama sopir"
                                        value={formData.nm_sopir}
                                        onChange={(e) => setFormData(p => ({ ...p, nm_sopir: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold outline-none bg-white text-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold mb-1 text-slate-800">NO. DO / SURAT JALAN :</label>
                                    <input
                                        type="text"
                                        placeholder="DO-001/..."
                                        value={formData.no_do}
                                        onChange={(e) => setFormData(p => ({ ...p, no_do: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold font-mono outline-none bg-white uppercase text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold mb-1 text-slate-800">TANGGAL PICKUP :</label>
                                    <input
                                        type="date"
                                        value={formData.tgl_pu}
                                        onChange={(e) => setFormData(p => ({ ...p, tgl_pu: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold font-mono outline-none bg-white text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold mb-1 text-slate-800">LOKASI PICKUP :</label>
                                    <input
                                        type="text"
                                        placeholder="Gudang Jakarta..."
                                        value={formData.lokasi_pu}
                                        onChange={(e) => setFormData(p => ({ ...p, lokasi_pu: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold outline-none bg-white text-slate-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold mb-1 text-slate-800">DAFTAR NOMOR RESI BTT (Pisahkan dengan Enter atau Koma) :</label>
                                <textarea
                                    rows={4}
                                    placeholder="Contoh: 001202600001, 001202600002"
                                    value={formData.btt_input}
                                    onChange={(e) => setFormData(p => ({ ...p, btt_input: e.target.value }))}
                                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold outline-none bg-white text-slate-900"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-300 mt-4">
                            <button
                                type="button"
                                onClick={() => setIsFormModalOpen(false)}
                                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 text-xs cursor-pointer hover:bg-slate-100"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveForm}
                                className={`px-6 py-2 ${isEditMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer`}
                            >
                                <CheckCircle2 size={16} /> {isEditMode ? 'Simpan Perubahan' : 'Simpan Proforma'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL / CETAK PROFORMA INVOICE */}
            {isDetailModalOpen && selectedPI && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl p-6 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] bg-white text-slate-900 border border-slate-300">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-300 mb-4 print:hidden">
                            <h3 className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
                                <FileText size={20} className="text-blue-600" /> Lembar Proforma Invoice
                            </h3>
                            <div className="flex gap-2">
                                {selectedPI.pih_aktifyn === 'Y' && (
                                    <button
                                        type="button"
                                        onClick={() => handleCancelPI(selectedPI.pih_id)}
                                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                                    >
                                        <Trash2 size={15} /> Batalkan PI
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                                >
                                    <Printer size={15} /> Cetak PI
                                </button>
                                <button onClick={() => setIsDetailModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-600 hover:text-black">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 overflow-y-auto text-xs p-2 text-slate-900">
                            {/* Kop Surat */}
                            <div className="flex justify-between items-center border-b-2 border-black pb-3 gap-4">
                                <div className="flex items-center gap-3.5">
                                    <img
                                        src="/src/assets/new_logo 2.png"
                                        alt="Dakota Cargo"
                                        className="h-12 w-auto object-contain"
                                        onError={(e) => { e.target.src = '/src/assets/logo.png'; }}
                                    />
                                    <div>
                                        <div className="font-black text-sm uppercase tracking-wider text-slate-900">PT DAKOTA LOGISTIK INDONESIA</div>
                                        <div className="text-[11px] font-semibold text-slate-700">Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi - BEKASI KOTA</div>
                                        <div className="text-[11px] font-semibold text-slate-700">(021) 8603278 / (021) 86608589</div>
                                    </div>
                                </div>
                                <div className="text-right font-mono">
                                    <div className="text-base font-black uppercase tracking-widest text-slate-900">PROFORMA INVOICE</div>
                                    <div className="text-[12px] font-black text-blue-600">{selectedPI.pih_id}</div>
                                    <div className="text-[11px] font-bold text-slate-700">Tanggal: {selectedPI.pih_tanggal_str}</div>
                                </div>
                            </div>

                            {/* Info Pengiriman */}
                            <div className="border border-slate-300 p-3 rounded-xl bg-slate-50 grid grid-cols-2 gap-y-1.5 font-mono font-semibold">
                                <div><strong className="text-slate-600">CUSTOMER : </strong> <span className="font-black text-slate-900">{selectedPI.cust_name}</span></div>
                                <div><strong className="text-slate-600">NO. POLISI : </strong> <span className="font-bold text-slate-900">{selectedPI.pih_nomobil || '-'}</span></div>
                                <div><strong className="text-slate-600">CABANG : </strong> <span className="font-bold text-slate-900">{selectedPI.agen_nama}</span></div>
                                <div><strong className="text-slate-600">PENGEMUDI : </strong> <span className="font-bold text-slate-900">{selectedPI.pih_nmsopir || '-'}</span></div>
                                <div><strong className="text-slate-600">NO. SURAT JALAN : </strong> <span className="font-bold text-slate-900">{selectedPI.pih_nodo || '-'}</span></div>
                                <div><strong className="text-slate-600">LOKASI PICKUP : </strong> <span className="font-bold text-slate-900">{selectedPI.pih_lokasipu || '-'}</span></div>
                            </div>

                            {/* Rincian Resi */}
                            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 font-black text-[11px] uppercase">
                                        <th className="p-2.5">No. Resi BTT</th>
                                        <th className="p-2.5">Tujuan</th>
                                        <th className="p-2.5">Penerima</th>
                                        <th className="p-2.5 text-right">Ongkos Kirim</th>
                                        <th className="p-2.5 text-right">Biaya Penerus</th>
                                        <th className="p-2.5 text-right">Biaya Packing</th>
                                        <th className="p-2.5 text-right">Biaya Asuransi</th>
                                        <th className="p-2.5 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white font-mono text-slate-900 font-bold">
                                    {bttItems.map((b, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2.5 text-blue-600">{b.btt_id}</td>
                                            <td className="p-2.5 font-sans font-semibold">{b.tujuan}</td>
                                            <td className="p-2.5 font-sans font-semibold">{b.penerima}</td>
                                            <td className="p-2.5 text-right">Rp {Number(b.harga || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2.5 text-right">Rp {Number(b.biaya_penerus || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2.5 text-right">Rp {Number(b.biaya_packing || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2.5 text-right">Rp {Number(b.biaya_asuransi || 0).toLocaleString('id-ID')}</td>
                                            <td className="p-2.5 text-right text-emerald-700">
                                                Rp {Number(b.total_btt || 0).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))}
                                    {bttItems.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-4 text-center text-slate-500 font-semibold">Tidak ada rincian BTT yang terlampir</td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-100 font-black border-t border-slate-300 text-slate-900">
                                        <td colSpan={7} className="p-2.5 text-right">TOTAL TAGIHAN PROFORMA :</td>
                                        <td className="p-2.5 text-right font-mono text-emerald-700 text-sm font-black">
                                            Rp {bttItems.reduce((acc, curr) => acc + Number(curr.total_btt || 0), 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProformaInvoice;