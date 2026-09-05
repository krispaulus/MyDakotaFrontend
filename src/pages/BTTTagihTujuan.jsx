import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, CheckCircle2, XCircle, Printer, X, RefreshCw, Truck, Layers, CheckSquare, Square } from 'lucide-react';
import Swal from 'sweetalert2';
import dakotaLogo from '../assets/new_logo 2.png';

const BTTTagihTujuan = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // State Buka-Tutup Filter
    const [showFilter, setShowFilter] = useState(false);

    const [cabangList, setCabangList] = useState([]);
    const [custList, setCustList] = useState([]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // =========================================================================
    // HELPER: DETEKSI CABANG & STATUS HOLDING / PUSAT SECARA DINAMIS
    // =========================================================================
    function getActiveAgen() {
        const activeAgenId = localStorage.getItem('active_agen_id') || localStorage.getItem('agen_id') || '';
        const activeCabangId = localStorage.getItem('active_cabang_id') || localStorage.getItem('cabang_id') || '';
        const sessionCabangNama = localStorage.getItem('active_cabang_nama')
            || localStorage.getItem('cabang_nama')
            || localStorage.getItem('active_agen_nama')
            || '';

        if (sessionCabangNama) {
            return {
                id: activeCabangId || activeAgenId || '',
                nama: sessionCabangNama.toUpperCase()
            };
        }

        const found = cabangList.find(c => {
            const cId = String(c.agen_id || c.AgenID || '').trim().toLowerCase();
            const cKode = String(c.agen_kode || c.AgenKode || '').trim().toLowerCase();
            const cNama = String(c.agen_nama || c.AgenNama || '').trim().toLowerCase();
            const targetAgen = activeAgenId.trim().toLowerCase();
            const targetCabang = activeCabangId.trim().toLowerCase();

            return (
                (targetAgen && (cId === targetAgen || cKode === targetAgen || cNama.includes(targetAgen))) ||
                (targetCabang && (cId === targetCabang || cKode === targetCabang || cNama.includes(targetCabang)))
            );
        });

        if (found) {
            return {
                id: String(found.agen_id || found.AgenID),
                nama: String(found.agen_nama || found.AgenNama).toUpperCase()
            };
        }

        if (activeAgenId && activeAgenId.toUpperCase().includes('PUSAT')) {
            return { id: '001', nama: 'PUSAT DAKOTA' };
        }

        return {
            id: activeCabangId || activeAgenId || '',
            nama: activeAgenId ? `AGEN ${activeAgenId.toUpperCase()}` : ''
        };
    }

    const currentActiveAgen = getActiveAgen();
    const isHoldingUser =
        String(currentActiveAgen.nama || '').toUpperCase().includes('PUSAT') ||
        String(currentActiveAgen.nama || '').toUpperCase().includes('HOLDING') ||
        String(currentActiveAgen.id || '') === '001' ||
        String(localStorage.getItem('active_agen_id') || '').toUpperCase().includes('PUSAT') ||
        (!currentActiveAgen.id && !currentActiveAgen.nama);

    // Filter States
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [bypassTanggal, setBypassTanggal] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState(isHoldingUser ? '' : currentActiveAgen.id);
    const [selectedTerbayar, setSelectedTerbayar] = useState('');
    const [searchCustomer, setSearchCustomer] = useState('');
    const [searchBTT, setSearchBTT] = useState('');
    const [searchSuratJalan, setSearchSuratJalan] = useState('');

    // Sinkronisasi cabang otomatis untuk cabang daerah
    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setSelectedCabang(currentActiveAgen.id);
        }
    }, [isHoldingUser, currentActiveAgen.id, cabangList]);

    // Multi-Select Batch State
    const [selectedBttIds, setSelectedBttIds] = useState([]);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // Modal Edit State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBTT, setSelectedBTT] = useState(null);
    const [tagihCustID, setTagihCustID] = useState('');
    const [tagihCustName, setTagihCustName] = useState('');

    const printAreaRef = useRef(null);

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const [resCabang, resCust] = await Promise.all([
                api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/gl/customers?limit=1000', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setCabangList(resCabang.data?.data || []);
            setCustList(resCust.data?.data || []);
        } catch (err) {
            console.error('Gagal load opsi filter:', err);
        }
    };

    const fetchBTTList = async () => {
        setLoading(true);
        setSelectedBttIds([]);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            let url = `/piutang/btt-tagih-tujuan?pt_id=${ptId}&bypass_tanggal=${bypassTanggal}`;

            if (!bypassTanggal) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : selectedCabang;
            if (activeFilterCabang) url += `&tujuan_agen_id=${encodeURIComponent(activeFilterCabang)}`;
            if (selectedTerbayar) url += `&terbayar_yn=${selectedTerbayar}`;
            if (searchCustomer) url += `&customer_name=${encodeURIComponent(searchCustomer)}`;
            if (searchBTT) url += `&no_btt=${encodeURIComponent(searchBTT)}`;
            if (searchSuratJalan) url += `&no_surat_jalan=${encodeURIComponent(searchSuratJalan)}`;

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data?.data || []);
        } catch (err) {
            console.error('Gagal load data BTT Tagih Tujuan:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchBTTList();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchBTTList();
    };

    const handleResetFilter = () => {
        setStartDate(firstDay);
        setEndDate(today);
        setBypassTanggal(false);
        setSelectedCabang(isHoldingUser ? '' : currentActiveAgen.id);
        setSelectedTerbayar('');
        setSearchCustomer('');
        setSearchBTT('');
        setSearchSuratJalan('');
        fetchBTTList();
    };

    // Logika Checkbox Multi-Select
    const handleToggleSelectAll = () => {
        if (selectedBttIds.length === data.length) {
            setSelectedBttIds([]);
        } else {
            setSelectedBttIds(data.map(item => item.btt_turun_id));
        }
    };

    const handleToggleSelectRow = (id) => {
        setSelectedBttIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const terbilang = (angka) => {
        const bilangan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
        angka = Math.floor(Math.abs(angka));
        if (angka < 12) return bilangan[angka];
        if (angka < 20) return `${terbilang(angka - 10)} Belas`;
        if (angka < 100) return `${terbilang(Math.floor(angka / 10))} Puluh ${bilangan[angka % 10]}`.trim();
        if (angka < 200) return `Seratus ${terbilang(angka - 100)}`.trim();
        if (angka < 1000) return `${terbilang(Math.floor(angka / 100))} Ratus ${terbilang(angka % 100)}`.trim();
        if (angka < 2000) return `Seribu ${terbilang(angka - 1000)}`.trim();
        if (angka < 1000000) return `${terbilang(Math.floor(angka / 1000))} Ribu ${terbilang(angka % 1000)}`.trim();
        if (angka < 1000000000) return `${terbilang(Math.floor(angka / 1000000))} Juta ${terbilang(angka % 1000000)}`.trim();
        return `${terbilang(Math.floor(angka / 1000000000))} Miliar ${terbilang(angka % 1000000000)}`.trim();
    };

    const handleOpenEdit = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/piutang/btt-tagih-tujuan/detail/${encodeURIComponent(item.btt_turun_id)}?pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const btt = res.data?.data || item;
            if (btt.cb_yn === 'Y') {
                Swal.fire({ title: 'Peringatan', text: 'Transaksi BTT ini sudah di-closing buku kas.', icon: 'warning' });
                return;
            }
            if (btt.sudah_invoice) {
                Swal.fire({ title: 'Peringatan', text: 'BTT ini sudah dibuatkan Invoice penagihan.', icon: 'warning' });
                return;
            }

            setSelectedBTT(btt);
            setTagihCustID(btt.btt_turun_customer_id || '');
            setTagihCustName(btt.cust_tagih_name || '');
            setIsModalOpen(true);
        } catch (err) {
            Swal.fire({ title: 'Error', text: 'Gagal mengambil detail BTT.', icon: 'error' });
        }
    };

    const handleSaveTagih = async (e) => {
        e.preventDefault();
        if (!tagihCustID) {
            Swal.fire({ title: 'Validasi', text: 'Silakan pilih customer yang ditagihkan.', icon: 'warning' });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            await api.post(`/piutang/btt-tagih-tujuan/save?pt_id=${ptId}`, {
                btt_turun_id: selectedBTT.btt_turun_id,
                btt_turun_customer_id: tagihCustID
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                title: 'BERHASIL!',
                text: `BTT ${selectedBTT.btt_turun_id} berhasil ditagihkan ke customer terpilih.`,
                icon: 'success',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });

            setIsModalOpen(false);
            fetchBTTList();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Gagal menyimpan data penagihan BTT.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
    };

    const handlePrintMulti = () => {
        window.print();
    };

    const selectedItemsData = data.filter(item => selectedBttIds.includes(item.btt_turun_id));

    const columns = [
        {
            header: (
                <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="p-1 hover:text-sky-600 transition cursor-pointer"
                    title="Pilih Semua"
                >
                    {selectedBttIds.length > 0 && selectedBttIds.length === data.length ? (
                        <CheckSquare size={16} className="text-sky-600" />
                    ) : (
                        <Square size={16} className="text-slate-400" />
                    )}
                </button>
            ),
            accessor: 'select',
            render: (item) => (
                <input
                    type="checkbox"
                    checked={selectedBttIds.includes(item.btt_turun_id)}
                    onChange={() => handleToggleSelectRow(item.btt_turun_id)}
                    className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                />
            )
        },
        {
            header: 'NO. BTT',
            accessor: 'btt_turun_id',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.btt_turun_id}</span>
        },
        {
            header: 'TGL TURUN',
            accessor: 'btt_turun_tanggal',
            render: (item) => <span className="font-mono text-slate-600">{String(item.btt_turun_tanggal || '').split('T')[0]}</span>
        },
        {
            header: 'ASAL CABANG',
            accessor: 'asal_agen_nama',
            render: (item) => <span className="font-bold text-slate-700 uppercase">{item.asal_agen_nama}</span>
        },
        {
            header: 'DIBAYAR OLEH (CUSTOMER)',
            accessor: 'cust_tagih_name',
            render: (item) => <span className="font-bold text-sky-800">{item.cust_tagih_name || item.asal_cust_nama}</span>
        },
        {
            header: 'PENGIRIM / PENERIMA',
            accessor: 'asal_cust_nama',
            render: (item) => (
                <div>
                    <span className="font-semibold text-slate-800 block">P: {item.asal_cust_nama}</span>
                    <span className="text-[11px] text-slate-500 block">T: {item.tujuan_nama}</span>
                </div>
            )
        },
        {
            header: 'SURAT JALAN',
            accessor: 'no_surat_jalan',
            render: (item) => <span className="font-mono text-slate-600">{item.no_surat_jalan || '-'}</span>
        },
        {
            header: 'COLLY / BERAT',
            accessor: 'jml_unit',
            render: (item) => <span className="font-mono text-slate-700">{item.jml_unit} Koli / {item.berat} Kg</span>
        },
        {
            header: 'BIAYA TAGIH',
            accessor: 'total_tagih',
            render: (item) => <span className="font-mono font-black text-rose-600">Rp {Number(item.total_tagih || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'STATUS LUNAS',
            accessor: 'btt_turun_terbayar_yn',
            render: (item) => item.btt_turun_terbayar_yn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> LUNAS
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">
                    <XCircle size={12} /> BELUM
                </span>
            )
        }
    ];

    // Modal Batch Cetak Multi-Resi
    const modalMultiPrint = isPrintModalOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity" style={{ zIndex: 99999 }}>
            <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between no-print">
                    <div className="flex items-center gap-2 font-bold uppercase text-sm">
                        <Printer size={18} className="text-sky-400" />
                        PREVIEW CETAK {selectedItemsData.length} LEMBAR BTT
                    </div>
                    <button onClick={() => setIsPrintModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <div ref={printAreaRef} className="p-6 overflow-y-auto space-y-8 print-container text-black">
                    {selectedItemsData.map((item, idx) => (
                        <div key={idx} className="border-2 border-dashed border-slate-400 p-5 rounded-xl space-y-3 page-break-after">
                            <div className="flex justify-between items-center border-b pb-2 border-slate-300">
                                <div className="flex flex-col items-start gap-3">
                                    <img
                                        src={dakotaLogo}
                                        alt="Logo Dakota Cargo"
                                        className="h-8 w-auto object-contain"
                                    />
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                        BUKTI TANDA TERIMA (BTT TAGIH TUJUAN)
                                    </span>
                                </div>
                                <div className="text-right font-mono">
                                    <span className="text-xs text-slate-400 block font-bold">NO. RESI BTT</span>
                                    <span className="text-sm font-black text-sky-700">{item.btt_turun_id}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1">
                                    <div><span className="font-bold text-slate-500">PENGIRIM:</span> <span className="font-bold">{item.asal_cust_nama}</span> ({item.asal_agen_nama})</div>
                                    <div><span className="font-bold text-slate-500">PENERIMA:</span> <span className="font-bold">{item.tujuan_nama}</span></div>
                                    <div><span className="font-bold text-slate-500">NO. SJ:</span> <span className="font-mono">{item.no_surat_jalan || '-'}</span></div>
                                </div>
                                <div className="space-y-1">
                                    <div><span className="font-bold text-slate-500">DITAGIHKAN KEPADA:</span> <span className="font-black text-slate-900">{item.cust_tagih_name || item.asal_cust_nama}</span></div>
                                    <div><span className="font-bold text-slate-500">ISI MUATAN:</span> <span>{item.nama_barang || '-'}</span> ({item.jml_unit} Koli / {item.berat} Kg)</div>
                                    <div><span className="font-bold text-slate-500">BIAYA TAGIH:</span> <span className="font-mono font-black text-rose-600">Rp {Number(item.total_tagih || 0).toLocaleString('id-ID')}</span></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-4 bg-slate-100 border-t flex justify-between items-center no-print">
                    <span className="text-xs text-slate-500 font-bold">Total {selectedItemsData.length} Lembar Resi Terpilih</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsPrintModalOpen(false)}
                            className="px-5 py-2 bg-slate-400 hover:bg-slate-500 text-white font-bold rounded-xl text-xs uppercase cursor-pointer"
                        >
                            Tutup
                        </button>
                        <button
                            onClick={handlePrintMulti}
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs uppercase shadow-md flex items-center gap-1.5 cursor-pointer"
                        >
                            <Printer size={14} /> Cetak Semua ({selectedItemsData.length})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    // Modal Edit Customer Tertagih
    const modalElement = isModalOpen && selectedBTT ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity" style={{ zIndex: 99999 }}>
            <div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden transition-all transform ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                <div className="px-8 py-4 bg-slate-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black uppercase text-sm tracking-wider">
                        <Truck size={18} className="text-sky-400" />
                        PENETAPAN PENAGIHAN BTT TAGIH TUJUAN ({selectedBTT.btt_turun_id})
                    </div>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-300 hover:text-white cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveTagih} className="p-6 space-y-5 text-xs max-h-[85vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <span className="font-bold text-slate-700 block border-b pb-1 text-[11px] uppercase">INFORMASI PENGIRIM (ASAL)</span>
                            <div><span className="text-slate-400 font-bold block">PENGIRIM :</span> <span className="font-bold text-slate-800">{selectedBTT.asal_cust_nama} [{selectedBTT.asal_cust_id || '-'}]</span></div>
                            <div><span className="text-slate-400 font-bold block">ALAMAT :</span> <span className="text-slate-700">{selectedBTT.asal_alamat || '-'}</span></div>
                            <div><span className="text-slate-400 font-bold block">KOTA / TELEPON :</span> <span className="text-slate-800">{selectedBTT.asal_kota} / {selectedBTT.asal_telp || '-'}</span></div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <span className="font-bold text-slate-700 block border-b pb-1 text-[11px] uppercase">INFORMASI PENERIMA (TUJUAN)</span>
                            <div><span className="text-slate-400 font-bold block">PENERIMA :</span> <span className="font-bold text-slate-800">{selectedBTT.tujuan_nama}</span></div>
                            <div><span className="text-slate-400 font-bold block">ALAMAT TUJUAN :</span> <span className="text-slate-700">{selectedBTT.tujuan_alamat || '-'}</span></div>
                            <div><span className="text-slate-400 font-bold block">KOTA / KODEPOS :</span> <span className="text-slate-800">{selectedBTT.tujuan_kota} {selectedBTT.tujuan_kodepos ? `(${selectedBTT.tujuan_kodepos})` : ''}</span></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-sky-50/60 p-4 rounded-xl border border-sky-200">
                        <div>
                            <span className="text-sky-900 font-bold block mb-0.5">ISI KIRIMAN :</span>
                            <span className="font-bold text-slate-800">{selectedBTT.nama_barang || '-'}</span>
                        </div>
                        <div>
                            <span className="text-sky-900 font-bold block mb-0.5">COLLY / BERAT :</span>
                            <span className="font-mono font-bold text-slate-800">{selectedBTT.jml_unit} Koli / {selectedBTT.berat} Kg</span>
                        </div>
                        <div>
                            <span className="text-sky-900 font-bold block mb-0.5">NO. SURAT JALAN :</span>
                            <span className="font-mono font-bold text-sky-700">{selectedBTT.no_surat_jalan || '-'}</span>
                        </div>
                        <div>
                            <span className="text-sky-900 font-bold block mb-0.5">TOTAL TAGIHAN :</span>
                            <span className="font-mono font-black text-rose-600 text-sm">Rp {Number(selectedBTT.total_tagih || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="md:col-span-4 pt-2 border-t border-sky-200">
                            <span className="text-[11px] font-bold text-rose-700 italic block">
                                Terbilang: {terbilang(selectedBTT.total_tagih || 0)} Rupiah
                            </span>
                        </div>
                    </div>

                    <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                        <label className="font-black text-slate-800 block uppercase tracking-wider text-[11px]">
                            DITAGIHKAN KEPADA CUSTOMER (CABANG TUJUAN) :
                        </label>
                        <select
                            value={tagihCustID}
                            onChange={(e) => {
                                const val = e.target.value;
                                setTagihCustID(val);
                                const found = custList.find(c => c.cust_id === val);
                                setTagihCustName(found ? found.cust_name : '');
                            }}
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 outline-none focus:border-sky-500 shadow-xs"
                        >
                            <option value="">-- PILIH CUSTOMER PEMBAYAR DI TUJUAN --</option>
                            {custList.map((cust, i) => (
                                <option key={i} value={cust.cust_id}>{cust.cust_name} [{cust.cust_id}]</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-8 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition shadow-md uppercase cursor-pointer"
                        >
                            BATAL
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition shadow-md uppercase cursor-pointer"
                        >
                            SIMPAN PENETAPAN TAGIHAN
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-5">
            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible; }
                    .print-container { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                    .page-break-after { page-break-after: always; margin-bottom: 20px; }
                }
                `}
            </style>

            {/* Filter Panel */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all no-print">
                    <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                        <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                            <Filter size={16} className="text-sky-600" />
                            FILTER BTT PENGIRIMAN TAGIH TUJUAN
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AWAL</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AKHIR</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                                />
                            </div>
                        </div>

                        {/* Cabang Filter */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG TUJUAN</label>
                            <select
                                value={!isHoldingUser && currentActiveAgen.id ? currentActiveAgen.id : selectedCabang}
                                disabled={!isHoldingUser}
                                onChange={(e) => setSelectedCabang(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser
                                    ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'
                                    }`}
                                title={!isHoldingUser ? "Filter cabang terkunci sesuai lokasi login Anda" : "Pilih cabang tujuan"}
                            >
                                {isHoldingUser && (
                                    <option value="">-- SEMUA CABANG TUJUAN --</option>
                                )}

                                {!isHoldingUser ? (
                                    <option value={currentActiveAgen.id}>
                                        {currentActiveAgen.nama || 'CABANG AKTIF'}
                                    </option>
                                ) : (
                                    cabangList.map((c, i) => (
                                        <option key={i} value={c.agen_id || c.AgenID}>{c.agen_nama || c.AgenNama}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS PEMBAYARAN</label>
                            <select
                                value={selectedTerbayar}
                                onChange={(e) => setSelectedTerbayar(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA STATUS --</option>
                                <option value="Y">Lunas (Terbayar)</option>
                                <option value="N">Belum Lunas (Piutang)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CUSTOMER</label>
                            <input
                                type="text"
                                placeholder="Cari customer / pengirim..."
                                value={searchCustomer}
                                onChange={(e) => setSearchCustomer(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. BTT</label>
                            <input
                                type="text"
                                placeholder="Nomor resi BTT..."
                                value={searchBTT}
                                onChange={(e) => setSearchBTT(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. SURAT JALAN</label>
                            <input
                                type="text"
                                placeholder="Nomor surat jalan..."
                                value={searchSuratJalan}
                                onChange={(e) => setSearchSuratJalan(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 mt-5">
                                <input
                                    type="checkbox"
                                    checked={bypassTanggal}
                                    onChange={(e) => setBypassTanggal(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded"
                                />
                                Bypass Filter Tanggal
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 flex-wrap">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer text-xs"
                        >
                            <Printer size={14} /> Cetak Grid
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (selectedBttIds.length === 0) {
                                    Swal.fire({
                                        title: 'Pilih Resi Terlebih Dahulu',
                                        text: 'Silakan centang kotak (checkbox) pada resi BTT yang ingin dicetak di tabel bawah.',
                                        icon: 'info'
                                    });
                                    return;
                                }
                                setIsPrintModalOpen(true);
                            }}
                            className={`px-4 py-2 font-bold rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer text-xs shadow-xs ${selectedBttIds.length > 0
                                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                }`}
                        >
                            <Layers size={14} className={selectedBttIds.length > 0 ? "text-sky-400" : "text-slate-500"} />
                            CETAK BTT LEBIH DARI 1 LEMBAR {selectedBttIds.length > 0 ? `(${selectedBttIds.length})` : ''}
                        </button>

                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer text-xs"
                        >
                            RESET
                        </button>

                        <button
                            type="submit"
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs"
                        >
                            <RefreshCw size={14} /> REFRESH DATA
                        </button>
                    </div>
                </form>
            )}

            {/* Floating Action Bar jika ada BTT yang dicentang */}
            {selectedBttIds.length > 0 && (
                <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center justify-between animate-fade-in no-print">
                    <div className="flex items-center gap-3 text-xs font-bold">
                        <Layers className="text-sky-400" size={18} />
                        <span>{selectedBttIds.length} BTT Dipilih untuk Cetak Multi-Resi</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedBttIds([])}
                            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsPrintModalOpen(true)}
                            className="px-5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer uppercase"
                        >
                            <Printer size={14} /> Cetak Batch ({selectedBttIds.length})
                        </button>
                    </div>
                </div>
            )}

            {/* Tabel List BTT Tagih Tujuan */}
            <DataTableTemplate
                title="BTT PENGIRIMAN TAGIH TUJUAN"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                isAddDisabled={true}
                hideAddButton={true}
                onFilter={() => setShowFilter(prev => !prev)}
                onEdit={handleOpenEdit}
            />

            {modalElement && ReactDOM.createPortal(modalElement, document.body)}
            {modalMultiPrint && ReactDOM.createPortal(modalMultiPrint, document.body)}
        </div>
    );
};

export default BTTTagihTujuan;