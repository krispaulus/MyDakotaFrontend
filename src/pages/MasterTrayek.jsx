import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Route, Search, Plus, MapPin, DollarSign, Fuel, Info, Trash2, Edit3 } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

export default function MasterTrayek() {
    const [trayekList, setTrayekList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchName, setSearchName] = useState('');

    // Modal Manager
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState('header'); // Tabs: header, rute, bplk, voucher

    // MASTER PAYLOAD STATE
    const [headerForm, setHeaderForm] = useState({
        trh_id: '', trh_name: '', trh_jns_kend: '', trh_tarif_b: 0, trh_tarif_p: 0,
        trh_bbm_ratio: 0, trh_bbm_jatah: 0, trh_total_km: 0
    });
    const [ruteList, setRuteList] = useState([]);
    const [bplkList, setBplkList] = useState([]);
    const [voucherList, setVoucherList] = useState([]);

    // Temporary State Inputs untuk Add-Row item bray
    const [tmpRute, setTmpRute] = useState({ trd_agen_id: '', trd_urut: 1, trd_status: 'B', trd_jenis: 'U', trd_km: 0, trd_et: 0 });
    const [tmpBplk, setTmpBplk] = useState({ tri_bplk_id: '', tri_nominal: 0, tri_um_yn: 'Y', tri_bplk_sub_id: '' });
    const [tmpVoucher, setTmpVoucher] = useState({ trv_spbu: '', trv_bplk_id: 'MB005', trv_liter: 0, trv_harga: 6800 });

    const fetchTrayek = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/master/trayek?nama=${searchName}`, { headers: { Authorization: `Bearer ${token}` } });
            setTrayekList(res.data?.data || []);
        } catch (err) {
            Swal.fire('Gagal', 'Gagal memuat master rute', 'error');
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchTrayek(); }, []);

    const handleOpenCreate = () => {
        setIsEditMode(false);
        setHeaderForm({ trh_id: '', trh_name: '', trh_jns_kend: '', trh_tarif_b: 0, trh_tarif_p: 0, trh_bbm_ratio: 0, trh_bbm_jatah: 0, trh_total_km: 0 });
        setRuteList([]); setBplkList([]); setVoucherList([]);
        setActiveTab('header'); setIsFormModalOpen(true);
    };

    const handleOpenEdit = async (item) => {
        setIsEditMode(true);
        setHeaderForm(item);
        setActiveTab('header');
        setIsFormModalOpen(true);

        // Ambil data sub detail eksisting dari database bray
        try {
            const token = localStorage.getItem('token');
            const [resRute, resBplk, resVoucher] = await Promise.all([
                api.get(`/master/trayek/detail/rute/${item.trh_id}`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get(`/master/trayek/detail/bplk/${item.trh_id}`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get(`/master/trayek/detail/voucher/${item.trh_id}`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setRuteList(resRute.data?.data || []);
            setBplkList(resBplk.data?.data || []);
            setVoucherList(resVoucher.data?.data || []);
        } catch (err) { console.error(err); }
    };

    const handleSaveAll = async () => {
        if (!headerForm.trh_name) return Swal.fire('Peringatan', 'Nama jalur wajib diisi bray!', 'warning');
        try {
            const token = localStorage.getItem('token');
            const fullPayload = { header: headerForm, rute: ruteList, bplk: bplkList, voucher: voucherList };
            await api.post('/master/trayek/save-full', fullPayload, { headers: { Authorization: `Bearer ${token}` } });
            Swal.fire('Sukses', 'Bundling data trayek berhasil disimpan!', 'success');
            setIsFormModalOpen(false);
            fetchTrayek();
        } catch (err) { Swal.fire('Gagal', 'Gagal menyimpan konfigurasi rute', 'error'); }
    };

    const columnsTrayek = [
        { header: 'KODE TRAYEK', accessor: 'trh_id', render: (i) => <span className="font-mono font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => handleOpenEdit(i)}>{i.trh_id}</span> },
        { header: 'NAMA JALUR TRAYEK', accessor: 'trh_name', render: (i) => <span className="font-bold text-slate-700">{i.trh_name}</span> },
        { header: 'TOTAL KM', accessor: 'trh_total_km', render: (i) => <span className="font-mono">{i.trh_total_km} KM</span> },
        { header: 'JATAH SOLAR', accessor: 'trh_bbm_jatah', render: (i) => <span className="font-mono text-emerald-700 font-bold">{i.trh_bbm_jatah} LITE</span> }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <Route size={20} className="text-indigo-600" /> Pengaturan Jalur Trayek & Biaya Manifes
                </h3>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 grid grid-cols-4 gap-4 items-end text-xs font-bold text-slate-600">
                <div className="col-span-3">
                    <label className="block mb-1 text-slate-500">CARI JALUR / KOTA</label>
                    <input type="text" className="w-full p-2.5 border rounded-lg text-sm uppercase outline-none bg-white" placeholder="Contoh: JAKARTA - SURABAYA..." value={searchName} onChange={e => setSearchName(e.target.value)} />
                </div>
                <button onClick={fetchTrayek} className="py-2.5 bg-indigo-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 h-[42px]">
                    <Search size={14} /> REFRESH
                </button>
            </div>

            <DataTableTemplate
                title="Daftar Master Trayek Distribusi" columns={columnsTrayek} data={trayekList} loading={loading} isDarkMode={false}
                onAdd={handleOpenCreate} onEdit={handleOpenEdit} onDelete={() => { }}
            />

            {/* FORM MODAL MULTIPLEXING (TAMBAH & EDIT) */}
            {isFormModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-4xl p-6 bg-white rounded-2xl shadow-2xl flex flex-col my-4 border border-slate-200">
                        <div className="text-center border-b pb-2 mb-4">
                            <span className="px-4 py-1 border border-dashed border-indigo-400 text-indigo-700 font-bold text-sm rounded uppercase">
                                {isEditMode ? `MODUL EDIT TRAYEK OPERASIONAL: ${headerForm.trh_id}` : 'MODUL INPUT DATA JALUR TRAYEK BARU'}
                            </span>
                        </div>

                        {/* NAV TAB LAYOUT FORM */}
                        <div className="flex border-b border-slate-200 mb-4 text-xs font-black uppercase tracking-wide">
                            <button onClick={() => setActiveTab('header')} className={`px-4 py-2 border-b-2 ${activeTab === 'header' ? 'border-indigo-600 text-indigo-600 bg-slate-50' : 'border-transparent text-slate-500'}`}>1. Info Induk</button>
                            <button onClick={() => setActiveTab('rute')} className={`px-4 py-2 border-b-2 ${activeTab === 'rute' ? 'border-indigo-600 text-indigo-600 bg-slate-50' : 'border-transparent text-slate-500'}`}>2. Rute Singgah ({ruteList.length})</button>
                            <button onClick={() => setActiveTab('bplk')} className={`px-4 py-2 border-b-2 ${activeTab === 'bplk' ? 'border-emerald-600 text-emerald-600 bg-slate-50' : 'border-transparent text-slate-500'}`}>3. Biaya Jalan ({bplkList.length})</button>
                            <button onClick={() => setActiveTab('voucher')} className={`px-4 py-2 border-b-2 ${activeTab === 'voucher' ? 'border-amber-600 text-amber-600 bg-slate-50' : 'border-transparent text-slate-500'}`}>4. SPBU Voucher ({voucherList.length})</button>
                        </div>

                        <div className="min-h-[320px] max-h-[400px] overflow-y-auto border p-4 rounded-xl bg-slate-50/50 text-xs font-bold text-slate-700">

                            {/* TAB 1: FORM INDUK */}
                            {activeTab === 'header' && (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label>NAMA JALUR TRAYEK</label>
                                        <input type="text" className="w-full p-2 border rounded text-sm uppercase font-normal mt-1" value={headerForm.trh_name} onChange={e => setHeaderForm({ ...headerForm, trh_name: e.target.value.toUpperCase() })} />
                                    </div>
                                    <div>
                                        <label>JENIS ARMADA KENDARAAN</label>
                                        <input type="text" className="w-full p-2 border rounded text-sm uppercase font-normal mt-1" placeholder="Contoh: TRONTON / FUSO" value={headerForm.trh_jns_kend || ''} onChange={e => setHeaderForm({ ...headerForm, trh_jns_kend: e.target.value.toUpperCase() })} />
                                    </div>
                                    <div><label>TOTAL KM TRAYEK</label><input type="number" className="w-full p-2 border rounded font-normal mt-1 text-sm" value={headerForm.trh_total_km} onChange={e => setHeaderForm({ ...headerForm, trh_total_km: parseFloat(e.target.value) || 0 })} /></div>
                                    <div><label>RASIO BBM SOLAR (KM/LITER)</label><input type="number" className="w-full p-2 border rounded font-normal mt-1 text-sm" value={headerForm.trh_bbm_ratio} onChange={e => setHeaderForm({ ...headerForm, trh_bbm_ratio: parseFloat(e.target.value) || 0 })} /></div>
                                    <div><label>JATAH TOTAL SOLAR (LITER)</label><input type="number" className="w-full p-2 border rounded font-normal mt-1 text-sm" value={headerForm.trh_bbm_jatah} onChange={e => setHeaderForm({ ...headerForm, trh_bbm_jatah: parseFloat(e.target.value) || 0 })} /></div>
                                    <div><label>TARIF RUTE BERANGKAT (Rp)</label><input type="number" className="w-full p-2 border rounded font-normal mt-1 text-sm text-blue-700" value={headerForm.trh_tarif_b} onChange={e => setHeaderForm({ ...headerForm, trh_tarif_b: parseFloat(e.target.value) || 0 })} /></div>
                                    <div><label>TARIF RUTE PULANG (Rp)</label><input type="number" className="w-full p-2 border rounded font-normal mt-1 text-sm text-purple-700" value={headerForm.trh_tarif_p} onChange={e => setHeaderForm({ ...headerForm, trh_tarif_p: parseFloat(e.target.value) || 0 })} /></div>
                                </div>
                            )}

                            {/* TAB 2: MANAJEMEN DETAIL RUTE */}
                            {activeTab === 'rute' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-6 gap-2 bg-white p-3 border rounded-lg items-end">
                                        <div><label>KODE AGEN</label><input type="text" className="w-full p-1.5 border rounded uppercase text-xs" value={tmpRute.trd_agen_id} onChange={e => setTmpRute({ ...tmpRute, trd_agen_id: e.target.value })} /></div>
                                        <div><label>NO URUT</label><input type="number" className="w-full p-1.5 border rounded text-xs" value={tmpRute.trd_urut} onChange={e => setTmpRute({ ...tmpRute, trd_urut: parseInt(e.target.value) || 1 })} /></div>
                                        <div><label>ZONA</label><select className="w-full p-1.5 border rounded text-xs" value={tmpRute.trd_status} onChange={e => setTmpRute({ ...tmpRute, trd_status: e.target.value })}><option value="B">BERANGKAT</option><option value="P">PULANG</option></select></div>
                                        <div><label>JALUR</label><select className="w-full p-1.5 border rounded text-xs" value={tmpRute.trd_jenis} onChange={e => setTmpRute({ ...tmpRute, trd_jenis: e.target.value })}><option value="U">UTAMA</option><option value="C">CADANGAN</option></select></div>
                                        <div><label>KM</label><input type="number" className="w-full p-1.5 border rounded text-xs" value={tmpRute.trd_km} onChange={e => setTmpRute({ ...tmpRute, trd_km: parseFloat(e.target.value) || 0 })} /></div>
                                        <button type="button" onClick={() => { if (!tmpRute.trd_agen_id) return; setRuteList([...ruteList, tmpRute]); setTmpRute({ ...tmpRute, trd_agen_id: '', trd_urut: tmpRute.trd_urut + 1 }); }} className="p-2 bg-indigo-900 text-white rounded font-bold uppercase text-[10px]">Add Row</button>
                                    </div>
                                    <table className="w-full border text-left bg-white text-[11px]">
                                        <thead className="bg-slate-100"><tr><th className="p-2 text-center">URUT</th><th className="p-2">KODE AGEN</th><th className="p-2 text-center">ZONA</th><th className="p-2 text-center">JALUR</th><th className="p-2 text-right">KM</th><th className="p-2 text-center">AKSI</th></tr></thead>
                                        <tbody>
                                            {ruteList.map((r, idx) => (
                                                <tr key={idx} className="border-t">
                                                    <td className="p-2 text-center font-mono">{r.trd_urut}</td><td className="p-2 font-bold">{r.trd_agen_id}</td>
                                                    <td className="p-2 text-center">{r.trd_status === 'B' ? 'BERANGKAT' : 'PULANG'}</td><td className="p-2 text-center">{r.trd_jenis === 'U' ? 'UTAMA' : 'CADANGAN'}</td>
                                                    <td className="p-2 text-right font-mono">{r.trd_km} KM</td>
                                                    <td className="p-2 text-center"><button type="button" onClick={() => setRuteList(ruteList.filter((_, i) => i !== idx))} className="text-red-600"><Trash2 size={14} /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* TAB 3: MANAJEMEN KOMPONEN BIAYA */}
                            {activeTab === 'bplk' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-4 gap-2 bg-white p-3 border rounded-lg items-end">
                                        <div><label>KODE BIAYA (BPLK)</label><input type="text" className="w-full p-1.5 border rounded text-xs uppercase" placeholder="Contoh: MB001" value={tmpBplk.tri_bplk_id} onChange={e => setTmpBplk({ ...tmpBplk, tri_bplk_id: e.target.value.toUpperCase() })} /></div>
                                        <div><label>NOMINAL ALOKASI (Rp)</label><input type="number" className="w-full p-1.5 border rounded text-xs" value={tmpBplk.tri_nominal} onChange={e => setTmpBplk({ ...tmpBplk, tri_nominal: parseFloat(e.target.value) || 0 })} /></div>
                                        <div><label>UANG MUKA?</label><select className="w-full p-1.5 border rounded text-xs" value={tmpBplk.tri_um_yn} onChange={e => setTmpBplk({ ...tmpBplk, tri_um_yn: e.target.value })}><option value="Y">YA (UM)</option><option value="N">TIDAK</option></select></div>
                                        <button type="button" onClick={() => { if (!tmpBplk.tri_bplk_id) return; setBplkList([...bplkList, tmpBplk]); setTmpBplk({ tri_bplk_id: '', tri_nominal: 0, tri_um_yn: 'Y', tri_bplk_sub_id: '' }); }} className="p-2 bg-emerald-700 text-white rounded font-bold uppercase text-[10px]">Add Biaya</button>
                                    </div>
                                    <table className="w-full border text-left bg-white text-[11px]">
                                        <thead className="bg-emerald-50"><tr><th className="p-2">KODE BIAYA</th><th className="p-2 text-center">UANG MUKA</th><th className="p-2 text-right">NOMINAL</th><th className="p-2 text-center">AKSI</th></tr></thead>
                                        <tbody>
                                            {bplkList.map((b, idx) => (
                                                <tr key={idx} className="border-t">
                                                    <td className="p-2 font-mono font-bold text-emerald-800">{b.tri_bplk_id}</td><td className="p-2 text-center">{b.tri_um_yn === 'Y' ? 'UANG MUKA' : 'BIAYA AKHIR'}</td>
                                                    <td className="p-2 text-right font-mono font-bold">Rp {Number(b.tri_nominal).toLocaleString()}</td>
                                                    <td className="p-2 text-center"><button type="button" onClick={() => setBplkList(bplkList.filter((_, i) => i !== idx))} className="text-red-600"><Trash2 size={14} /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* TAB 4: PAIRING SPBU VOUCHER */}
                            {activeTab === 'voucher' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-4 gap-2 bg-white p-3 border rounded-lg items-end">
                                        <div className="col-span-2"><label>NAMA REST AREA / LOKASI SPBU MITRA</label><input type="text" className="w-full p-1.5 border rounded text-xs uppercase" placeholder="Contoh: SPBU KM 19" value={tmpVoucher.trv_spbu} onChange={e => setTmpVoucher({ ...tmpVoucher, trv_spbu: e.target.value.toUpperCase() })} /></div>
                                        <div><label>ALOKASI SOLAR (LITER)</label><input type="number" className="w-full p-1.5 border rounded text-xs" value={tmpVoucher.trv_liter} onChange={e => setTmpVoucher({ ...tmpVoucher, trv_liter: parseFloat(e.target.value) || 0 })} /></div>
                                        <button type="button" onClick={() => { if (!tmpVoucher.trv_spbu) return; setVoucherList([...voucherList, tmpVoucher]); setTmpVoucher({ ...tmpVoucher, trv_spbu: '', trv_liter: 0 }); }} className="p-2 bg-amber-600 text-white rounded font-bold uppercase text-[10px]">Pairing SPBU</button>
                                    </div>
                                    <table className="w-full border text-left bg-white text-[11px]">
                                        <thead className="bg-amber-50"><tr><th className="p-2">NAMA SPBU</th><th className="p-2 text-center">KODE ALOKASI</th><th className="p-2 text-right">KUOTA SOLAR</th><th className="p-2 text-center">AKSI</th></tr></thead>
                                        <tbody>
                                            {voucherList.map((v, idx) => (
                                                <tr key={idx} className="border-t">
                                                    <td className="p-2 font-bold uppercase">{v.trv_spbu}</td><td className="p-2 text-center font-mono">{v.trv_bplk_id}</td>
                                                    <td className="p-2 text-right font-mono font-bold text-emerald-700">{v.trv_liter} LITER</td>
                                                    <td className="p-2 text-center"><button type="button" onClick={() => setVoucherList(voucherList.filter((_, i) => i !== idx))} className="text-red-600"><Trash2 size={14} /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                        </div>

                        {/* Footer Action Modal */}
                        <div className="flex justify-between items-center pt-4 border-t mt-4">
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1"><Info size={12} /> Seluruh perubahan sub-array akan dikunci setelah menekan SIMPAN BUNDLING bray.</span>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-5 py-2 border text-slate-600 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 uppercase">CANCEL</button>
                                <button type="button" onClick={handleSaveAll} className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-xs uppercase shadow-md">SIMPAN BUNDLING</button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}