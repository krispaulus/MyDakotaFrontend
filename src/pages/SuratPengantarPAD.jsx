import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Search, Truck, QrCode } from 'lucide-react';
import Swal from 'sweetalert2';

const SuratPengantarPAD = () => {
    const { isDarkMode } = useDarkMode();

    // 🏢 Multi-Tenant Agen Lock
    const [currentActiveAgen] = useState(() => {
        return localStorage.getItem('active_agen_nama') ||
            localStorage.getItem('kode_cabang') ||
            'PUSAT DAKOTA';
    });

    // 📊 State Data & Filter
    const [loading, setLoading] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [tableData, setTableData] = useState([]); // Data yang tampil di DataTable
    const [inputBarcode, setInputBarcode] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Range tanggal default dari 2017 agar data lama langsung terserap
    const [filterData, setFilterData] = useState({
        dariTanggal: new Date().toISOString().split('T')[0],
        sampaiTanggal: new Date().toISOString().split('T')[0],
        noSP: '',
        noBTT: '',
        ekspedisiLain: ''
    });

    const [configPAD, setConfigPAD] = useState({
        vendorEkspedisi: '',
        noResiVendor: '',
        driverVendor: ''
    });

    // 🔄 Fetch Master Vendor & Auto Fetch Data Histori SP PAD Pertama Kali
    useEffect(() => {
        fetchVendors();
        fetchHistorySPPAD();
    }, []);

    const fetchVendors = async () => {
        try {
            const token = localStorage.getItem('token');
            // 💡 Sesuaikan endpoint dengan route main.go: /master/vendor/list
            const res = await api.get('/master/vendor/list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dataVendor = res.data?.data || res.data || [];
            if (Array.isArray(dataVendor) && dataVendor.length > 0) {
                setVendors(dataVendor);
            } else {
                // Fallback jika DB master vendor masih kosong
                setVendors([
                    { id: 'DBS', vendor_nama: 'DBS LOGISTIK' },
                    { id: 'JNE', vendor_nama: 'JNE LOGISTIK' },
                    { id: 'TIKI', vendor_nama: 'TIKI LOGISTIK' },
                    { id: 'INDONESIA_CARGO', vendor_nama: 'PT. INDONESIA CARGO REKANAN' }
                ]);
            }
        } catch (err) {
            console.error("Fetch vendor error, menggunakan fallback list:", err);
            setVendors([
                { id: 'DBS', vendor_nama: 'DBS LOGISTIK' },
                { id: 'JNE', vendor_nama: 'JNE LOGISTIK' },
                { id: 'TIKI', vendor_nama: 'TIKI LOGISTIK' },
                { id: 'INDONESIA_CARGO', vendor_nama: 'PT. INDONESIA CARGO REKANAN' }
            ]);
        }
    };

    // 🔍 Fungsi Tarik Data Histori SP PAD dari Backend Golang
    const fetchHistorySPPAD = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/sp-pad', {
                params: {
                    noSP: filterData.noSP,
                    noBTT: filterData.noBTT,
                    ekspedisiLain: filterData.ekspedisiLain
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const resData = res.data?.data || res.data || [];
            if (Array.isArray(resData)) {
                setTableData(resData);
                if (e) {
                    Swal.fire('BERHASIL', `Ditemukan ${resData.length} data Surat Pengantar PAD`, 'success');
                }
            } else {
                setTableData([]);
            }
        } catch (err) {
            console.error("Gagal narik data SP PAD:", err);
            setTableData([]);
            if (e) {
                Swal.fire('INFO', 'Data tidak ditemukan dengan kriteria filter tersebut', 'info');
            }
        } finally {
            setLoading(false);
        }
    };

    // 🛒 Scan Muat Barang
    const handleScanMuat = (e) => {
        if (e) e.preventDefault();
        const cleanBTT = inputBarcode.trim().toUpperCase();
        if (!cleanBTT) return;

        const newItem = {
            no_sp_pad: 'DRAFT_BARU',
            tanggal_sp: new Date().toLocaleDateString('id-ID'),
            cabang_asal: currentActiveAgen,
            vendor_expedisi_lain: configPAD.vendorEkspedisi || 'VENDOR LUAR',
            status_aktif: 'DRAFT MUAT',
            noBtt: cleanBTT
        };

        setTableData([newItem, ...tableData]);
        setInputBarcode('');
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Resi ${cleanBTT} Masuk ke Draft Muat`,
            showConfirmButton: false,
            timer: 1500
        });
    };

    // 🗑️ Delete Row Table
    const handleDeleteRow = (item) => {
        const filtered = tableData.filter(i => (i.no_sp_pad || i.noBtt) !== (item.no_sp_pad || item.noBtt));
        setTableData(filtered);
    };

    // 💾 Simpan SP PAD Final
    const handleSaveSPPAD = async () => {
        if (!configPAD.vendorEkspedisi || !configPAD.noResiVendor) {
            Swal.fire('PERINGATAN', 'Pilih Vendor Ekspedisi dan No. Resi Luar terlebih dahulu!', 'warning');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                spp_asal_agen: currentActiveAgen,
                spp_expedisilain: configPAD.vendorEkspedisi,
                spp_noresi_vendor: configPAD.noResiVendor,
                spp_sopir: configPAD.driverVendor,
                daftar_btt: tableData.map(i => i.noBtt).filter(Boolean)
            };

            const res = await api.post('/operasional/sp-pad', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                Swal.fire('BERHASIL', `Surat Pengantar PAD ${res.data.no_sp || ''} Berhasil Terbit!`, 'success');
                fetchHistorySPPAD();
            }
        } catch (err) {
            Swal.fire('GAGAL', err.response?.data?.message || 'Gagal menyimpan Surat Pengantar PAD', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 📌 Definisi Kolom DataTableTemplate
    const columns = [
        {
            header: 'NO. SP PAD',
            accessor: 'no_sp_pad',
            render: (i) => <span className="font-mono font-black text-indigo-700">📜 {i.no_sp_pad || i.noBtt || '-'}</span>
        },
        {
            header: 'TANGGAL SP',
            accessor: 'tanggal_sp',
            render: (i) => <span className="font-bold text-slate-800">{i.tanggal_sp || i.waktuMuat || '-'}</span>
        },
        {
            header: 'CABANG ASAL',
            accessor: 'cabang_asal',
            render: (i) => <span className="font-bold text-slate-700 uppercase">{i.cabang_asal || currentActiveAgen}</span>
        },
        {
            header: 'VENDOR / EKSPEDISI LAIN',
            accessor: 'vendor_expedisi_lain',
            render: (i) => <span className="font-black text-emerald-800 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{i.vendor_expedisi_lain || i.vendor || '-'}</span>
        },
        {
            header: 'STATUS',
            accessor: 'status_aktif',
            render: (i) => (
                <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase border ${i.status_aktif === 'Aktif' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                    {i.status_aktif || i.status || 'Aktif'}
                </span>
            )
        }
    ];

    // Filter Search Global di Table
    const filteredTableData = tableData.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.no_sp_pad && item.no_sp_pad.toLowerCase().includes(q)) ||
            (item.vendor_expedisi_lain && item.vendor_expedisi_lain.toLowerCase().includes(q)) ||
            (item.cabang_asal && item.cabang_asal.toLowerCase().includes(q))
        );
    });

    return (
        <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>

            {/* Title Page Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                    <h1 className="text-base font-black uppercase tracking-wider text-indigo-600">
                        SURAT PENGANTAR - SP PAD (EKSPEDISI LAIN)
                    </h1>
                    <p className="text-[11px] text-gray-400 font-medium">
                        Modul pelimpahan pengiriman kargo internal DAKOTA Cargo kepada Vendor / Ekspedisi Rekanan Pihak Ketiga.
                    </p>
                </div>
            </div>

            {/* 🔍 PANEL 1: FILTER & PENCARIAN DOKUMEN OPERASIONAL */}
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 text-indigo-600 font-black tracking-wider border-b border-slate-100 pb-2 text-xs">
                    <Search size={16} />
                    <span>PANEL FILTER & PENCARIAN DOKUMEN OPERASIONAL</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">DARI TANGGAL</label>
                        <input type="date" value={filterData.dariTanggal} onChange={e => setFilterData({ ...filterData, dariTanggal: e.target.value })} className="w-full mt-1 p-2 border rounded-lg bg-transparent text-xs" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">SAMPAI TANGGAL</label>
                        <input type="date" value={filterData.sampaiTanggal} onChange={e => setFilterData({ ...filterData, sampaiTanggal: e.target.value })} className="w-full mt-1 p-2 border rounded-lg bg-transparent text-xs" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">NO. SP NAIK</label>
                        <input type="text" placeholder="Cari No SP..." value={filterData.noSP} onChange={e => setFilterData({ ...filterData, noSP: e.target.value })} className="w-full mt-1 p-2 border rounded-lg bg-transparent text-xs uppercase" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">NO. BTT / RESI</label>
                        <input type="text" placeholder="Cari No BTT..." value={filterData.noBTT} onChange={e => setFilterData({ ...filterData, noBTT: e.target.value })} className="w-full mt-1 p-2 border rounded-lg bg-transparent text-xs uppercase" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">EKSPEDISI LAIN</label>
                        <input type="text" placeholder="Cari Vendor..." value={filterData.ekspedisiLain} onChange={e => setFilterData({ ...filterData, ekspedisiLain: e.target.value })} className="w-full mt-1 p-2 border rounded-lg bg-transparent text-xs uppercase" />
                    </div>
                </div>
                <div className="flex justify-end">
                    <button type="button" onClick={fetchHistorySPPAD} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer">
                        🚀 JALANKAN FILTER DATA
                    </button>
                </div>
            </div>

            {/* 🚚 PANEL 2: KONFIGURASI PEMBERANGKATAN TRANSAKSI VENDOR (SP PAD) */}
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 text-indigo-600 font-black tracking-wider border-b border-slate-100 pb-2 text-xs">
                    <Truck size={16} />
                    <span>KONFIGURASI PEMBERANGKATAN VIA VENDOR REKANAN (PAD)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 border border-slate-300 rounded-xl text-xs">
                    <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase">LOKET AGEN DLI ASAL</label>
                        <input
                            type="text"
                            value={currentActiveAgen}
                            readOnly
                            className="w-full mt-1 p-2.5 border border-slate-300 rounded-lg bg-slate-100 font-black text-slate-900 uppercase outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase">PILIH VENDOR EKSPEDISI *</label>
                        <select
                            value={configPAD.vendorEkspedisi}
                            onChange={e => setConfigPAD({ ...configPAD, vendorEkspedisi: e.target.value })}
                            className="w-full mt-1 p-2.5 border border-slate-300 rounded-lg bg-white font-black text-slate-900 outline-none focus:border-indigo-600 cursor-pointer"
                        >
                            <option value="" className="text-slate-500 font-normal">-- PILIH EKSPEDISI LAIN --</option>
                            {vendors && vendors.map((v, idx) => {
                                // Extrak string nama vendor dari field DB 'vend_name'
                                const vendorName = (typeof v === 'object' && v !== null)
                                    ? (v.vend_name || v.vendor_nama || v.nama || v.id || `VENDOR #${idx + 1}`)
                                    : String(v);

                                return (
                                    <option key={idx} value={vendorName} className="text-slate-900 font-bold">
                                        {vendorName}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase">NO RESI / MANIFEST LUAR *</label>
                        <input
                            type="text"
                            placeholder="MASUKKAN RESI VENDOR LUAR..."
                            value={configPAD.noResiVendor}
                            onChange={e => setConfigPAD({ ...configPAD, noResiVendor: e.target.value.toUpperCase() })}
                            className="w-full mt-1 p-2.5 border border-slate-300 rounded-lg bg-white font-black text-slate-900 uppercase placeholder-slate-400 outline-none focus:border-indigo-600"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase">NAMA SOPIR / KONTAK VENDOR</label>
                        <input
                            type="text"
                            placeholder="MASUKKAN NAMA KONTAK VENDOR..."
                            value={configPAD.driverVendor}
                            onChange={e => setConfigPAD({ ...configPAD, driverVendor: e.target.value.toUpperCase() })}
                            className="w-full mt-1 p-2.5 border border-slate-300 rounded-lg bg-white font-black text-slate-900 uppercase placeholder-slate-400 outline-none focus:border-indigo-600"
                        />
                    </div>
                </div>

                {/* BARCODE SCANNER MUAT BARANG */}
                <form onSubmit={handleScanMuat} className="pt-2 space-y-1">
                    <label className="text-indigo-600 uppercase font-black text-xs flex items-center gap-1.5">
                        <QrCode size={15} /> ENTRY BARCODE SCANNER MUAT BARANG EKSPEDISI LAIN
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Ketik nomor resi koli lalu tekan Enter..."
                            value={inputBarcode}
                            onChange={(e) => setInputBarcode(e.target.value)}
                            className="w-full p-3 border border-slate-300 focus:border-indigo-600 rounded-xl bg-white outline-none uppercase font-mono font-black text-xs tracking-widest text-slate-900 placeholder-slate-400"
                        />
                        <button type="submit" className="px-6 py-3 bg-indigo-950 hover:bg-indigo-900 active:scale-98 text-white font-black rounded-xl shadow-xs uppercase tracking-wider text-xs cursor-pointer transition">
                            SCAN MUAT
                        </button>
                    </div>
                </form>
            </div>

            {/* 📊 PANEL 3: DATATABLE TEMPLATE KONSISTEN */}
            <DataTableTemplate
                title={`DATALIST SURAT PENGANTAR PAD (${filteredTableData.length} ITEMS)`}
                columns={columns}
                data={filteredTableData}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={handleSaveSPPAD}
                onDelete={handleDeleteRow}
            />

        </div>
    );
};

export default SuratPengantarPAD;