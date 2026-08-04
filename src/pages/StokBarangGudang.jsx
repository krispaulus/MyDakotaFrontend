import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Search, Boxes, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

const StokBarangGudang = () => {
    const { isDarkMode } = useDarkMode();

    // 📊 State Data
    const [loading, setLoading] = useState(false);
    const [stokList, setStokList] = useState([]);
    const [globalSearch, setGlobalSearch] = useState('');

    // 🔍 State Filter
    const [filterParams, setFilterParams] = useState({
        useNoBTT: false,
        noBTT: '',
        useTransit: false,
        transitYN: 'Y'
    });

    useEffect(() => {
        fetchStokGudang();
    }, []);

    // 🔄 Fetch Data Stok
    const fetchStokGudang = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {};

            if (filterParams.useNoBTT && filterParams.noBTT) {
                params.noBTT = filterParams.noBTT.trim().replace(/\s+/g, '');
            }
            if (filterParams.useTransit) {
                params.transitYN = filterParams.transitYN;
            }

            const res = await api.get('/operasional/stok-gudang', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("📦 DATA STOK MASUK DARI BACKEND:", res.data);

            let rawData = [];
            if (Array.isArray(res.data)) {
                rawData = res.data;
            } else if (res.data && Array.isArray(res.data.data)) {
                rawData = res.data.data;
            }

            setStokList(rawData);

            if (e) {
                Swal.fire('BERHASIL', `Ditemukan ${rawData.length} item stok di gudang`, 'success');
            }
        } catch (err) {
            console.error("Gagal narik stok gudang:", err);
            setStokList([]);
        } finally {
            setLoading(false);
        }
    };

    // 🧮 Hitung Totals Rekapitulasi (Tahan Banting terhadap null/string)
    const totalColly = stokList.reduce((acc, i) => acc + (Number(i.colly) || 0), 0);
    const totalBerat = stokList.reduce((acc, i) => acc + (Number(i.berat_kg) || 0), 0);
    const totalVolume = stokList.reduce((acc, i) => acc + (Number(i.volume_kg) || 0), 0);
    const totalTunai = stokList.reduce((acc, i) => acc + (Number(i.biaya_tunai) || 0), 0);
    const totalCOD = stokList.reduce((acc, i) => acc + (Number(i.biaya_tagih_cod) || 0), 0);

    // 📌 Definisi Kolom Tabel (Fix Penomoran NO)
    const columns = [
        {
            header: 'NO',
            accessor: 'no_urut',
            render: (_, item, idx) => {
                // Tahan banting mengambil indeks iterasi
                const indexNumber = typeof idx === 'number' ? idx + 1 : (typeof item === 'number' ? item + 1 : 1);
                return <span className="font-bold text-slate-500">{indexNumber}</span>;
            }
        },
        {
            header: 'NO. BTT / RESI',
            accessor: 'no_btt',
            render: (i) => <span className="font-mono font-black text-indigo-700 tracking-wider">📦 {i.no_btt || '-'}</span>
        },
        {
            header: 'TGL. TURUN',
            accessor: 'tgl_turun',
            render: (i) => <span className="font-bold text-slate-800">{i.tgl_turun || '-'}</span>
        },
        {
            header: 'CABANG ASAL',
            accessor: 'asal_agen',
            render: (i) => <span className="font-bold text-slate-700 uppercase">{i.asal_agen || '-'}</span>
        },
        {
            header: 'COLLY',
            accessor: 'colly',
            render: (i) => <span className="font-black text-blue-700">{(Number(i.colly) || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'BERAT (KG)',
            accessor: 'berat_kg',
            render: (i) => <span className="font-bold text-slate-800">{(Number(i.berat_kg) || 0).toLocaleString('id-ID')} KG</span>
        },
        {
            header: 'VOLUME (KG)',
            accessor: 'volume_kg',
            render: (i) => <span className="font-bold text-slate-600">{(Number(i.volume_kg) || 0).toLocaleString('id-ID')} m³</span>
        },
        {
            header: 'TUNAI / KREDIT',
            accessor: 'biaya_tunai',
            render: (i) => <span className="font-bold text-emerald-700">Rp {(Number(i.biaya_tunai) || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'TAGIH / COD',
            accessor: 'biaya_tagih_cod',
            render: (i) => <span className="font-bold text-amber-700">Rp {(Number(i.biaya_tagih_cod) || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'TRANSIT',
            accessor: 'is_transit',
            render: (i) => {
                const val = i.is_transit || 'TIDAK';
                return (
                    <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase border ${val === 'YA' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {val}
                    </span>
                );
            }
        },
        {
            header: 'KETERANGAN',
            accessor: 'keterangan',
            render: (i) => <span className="text-slate-500 italic text-[11px]">{i.keterangan || '-'}</span>
        }
    ];

    // Filter Search Global
    const filteredData = stokList.filter(i => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        const btt = String(i.no_btt || '').toLowerCase();
        const agen = String(i.asal_agen || '').toLowerCase();
        return btt.includes(q) || agen.includes(q);
    });

    return (
        <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>

            {/* Header Page */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                    <h1 className="text-base font-black uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                        <Boxes size={20} /> STOK BARANG GUDANG
                    </h1>
                    <p className="text-[11px] text-gray-400 font-medium">
                        Modul kontrol inventory kargo fisik yang saat ini tersimpan di gudang operasional cabang.
                    </p>
                </div>
            </div>

            {/* 🔍 PANEL FILTER & PENCARIAN */}
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 text-indigo-600 font-black tracking-wider border-b border-slate-100 pb-2 text-xs">
                    <Search size={16} />
                    <span>PANEL FILTER STOK BARANG GUDANG</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    {/* Filter No BTT */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 uppercase">
                            <input
                                type="checkbox"
                                checked={filterParams.useNoBTT}
                                onChange={e => setFilterParams({ ...filterParams, useNoBTT: e.target.checked })}
                                className="rounded text-indigo-600 cursor-pointer"
                            />
                            No. BTT / Resi
                        </label>
                        <input
                            type="text"
                            placeholder="Masukkan Nomor BTT..."
                            value={filterParams.noBTT}
                            disabled={!filterParams.useNoBTT}
                            onChange={e => setFilterParams({ ...filterParams, noBTT: e.target.value.toUpperCase() })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 uppercase disabled:opacity-40 outline-none"
                        />
                    </div>

                    {/* Filter Transit */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 uppercase">
                            <input
                                type="checkbox"
                                checked={filterParams.useTransit}
                                onChange={e => setFilterParams({ ...filterParams, useTransit: e.target.checked })}
                                className="rounded text-indigo-600 cursor-pointer"
                            />
                            Barang Transit
                        </label>
                        <div className="flex gap-4 p-2 font-bold text-slate-800">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="transitYN"
                                    value="Y"
                                    disabled={!filterParams.useTransit}
                                    checked={filterParams.transitYN === 'Y'}
                                    onChange={e => setFilterParams({ ...filterParams, transitYN: e.target.value })}
                                /> Ya (Barang Singgah)
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="transitYN"
                                    value="N"
                                    disabled={!filterParams.useTransit}
                                    checked={filterParams.transitYN === 'N'}
                                    onChange={e => setFilterParams({ ...filterParams, transitYN: e.target.value })}
                                /> Tidak (Tujuan Akhir)
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={fetchStokGudang}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition"
                    >
                        <RefreshCw size={14} /> REFRESH DATA STOK
                    </button>
                </div>
            </div>

            {/* 📊 SUMMARY TOTALS REKAPITULASI GUDANG */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">TOTAL COLLY</div>
                    <div className="text-base font-black text-indigo-600 mt-0.5">{totalColly.toLocaleString('id-ID')} Unit</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">TOTAL BERAT (KG)</div>
                    <div className="text-base font-black text-slate-800 mt-0.5">{totalBerat.toLocaleString('id-ID')} KG</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">TOTAL VOLUME</div>
                    <div className="text-base font-black text-slate-700 mt-0.5">{totalVolume.toLocaleString('id-ID')} m³</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">TOTAL TUNAI/KREDIT</div>
                    <div className="text-base font-black text-emerald-700 mt-0.5">Rp {totalTunai.toLocaleString('id-ID')}</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">TOTAL TAGIH / COD</div>
                    <div className="text-base font-black text-amber-700 mt-0.5">Rp {totalCOD.toLocaleString('id-ID')}</div>
                </div>
            </div>

            {/* 📋 DATATABLE STOK GUDANG */}
            <DataTableTemplate
                title={`DATALIST STOK BARANG GUDANG (${filteredData.length} ITEMS)`}
                columns={columns}
                data={filteredData}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
            />

        </div>
    );
};

export default StokBarangGudang;