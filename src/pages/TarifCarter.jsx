import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, Truck, DollarSign, Trash2, CheckCircle2, Plus, Info, X } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

export default function TarifCarter() {
    const [indexData, setResultIndex] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchAgen, setSearchAgen] = useState('');
    const [allActiveAgen, setAllActiveAgen] = useState([]); // Penampung database master agen bray
    const [filterSearchModal, setFilterSearchModal] = useState(''); // Untuk filter live search di modal

    const fetchAllActiveAgen = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/master/active-agen-list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllActiveAgen(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load database master agen:", err);
        }
    };

    useEffect(() => {
        fetchIndex();
        fetchAllActiveAgen(); // Jalankan pas halaman pertama kali dibuka bray bray!
    }, []);

    // Modal Control States
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false); // Modal Baru untuk Tambah Agen Asal bray!
    const [selectedAgen, setSelectedAgen] = useState(null);
    const [kendJenis, setKendJenis] = useState('K0005');
    const [matrixTarif, setMatrixTarif] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);

    // Form Tambah Baru (Agen Asal)
    const [newAgenForm, setNewAgenForm] = useState({ agen_id: '', agen_nama: '', agen_kota: '' });

    // Temp Form State untuk tambah wilayah tujuan masal
    const [inputPropinsi, setInputPropinsi] = useState('');
    const [inputKabupatenRaw, setInputKabupatenRaw] = useState('');

    const opsiKendaraan = [
        { id: 'K0001', nama: 'ENGKEL (CDE)' },
        { id: 'K0002', nama: 'COLT DIESEL (CDD)' },
        { id: 'K0004', nama: 'FUSO ENGKEL' },
        { id: 'K0005', nama: 'FUSO LONG' },
        { id: 'K0006', nama: 'TRONTON' },
        { id: 'K0013', nama: 'WINGBOX' }
    ];

    const fetchIndex = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/master/tarif-carter?agen_nama=${searchAgen}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResultIndex(res.data?.data || []);
        } catch (err) {
            Swal.fire('Gagal', 'Gagal memuat indeks tarif', 'error');
        } finally { setLoading(false); }
    };

    const fetchMatrixDetail = async (agenId, jenis) => {
        setDetailLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/master/tarif-carter/detail?agen_id=${agenId}&kend_jenis=${jenis}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMatrixTarif(res.data?.data || []);
        } catch (err) { console.error(err); }
        finally { setDetailLoading(false); }
    };

    useEffect(() => { fetchIndex(); }, []);

    const handleTriggerDetail = (agen) => {
        // Mapping field dari indeks agar seragam bray
        const mappedAgen = {
            agen_id: agen.id || agen.agen_id,
            agen_nama: agen.name || agen.agen_nama,
            agen_kota: agen.city || agen.agen_kota,
            agen_alamat: agen.address || agen.agen_alamat
        };
        setSelectedAgen(mappedAgen);
        setIsDetailOpen(true);
        setInputPropinsi(''); setInputKabupatenRaw('');
        fetchMatrixDetail(mappedAgen.agen_id, kendJenis);
    };

    const handleJenisKendaraanChange = (e) => {
        const newJenis = e.target.value;
        setKendJenis(newJenis);
        if (selectedAgen) { fetchMatrixDetail(selectedAgen.agen_id, newJenis); }
    };

    // ➕ TRIGGER TOMBOL "+ TAMBAH" UTAMA
    const handleOpenAddModal = () => {
        setNewAgenForm({ agen_id: '', agen_nama: '', agen_kota: '' });
        setIsAddModalOpen(true);
    };

    // 🚀 PROSES SUBMIT MEMBUAT AGEN ASAL BARU DI MATRIX
    const handleAddAgenSubmit = (e) => {
        e.preventDefault();
        if (!newAgenForm.agen_id || !newAgenForm.agen_nama) {
            return Swal.fire('Peringatan', 'Kode dan Nama Agen wajib diisi bray!', 'warning');
        }
        setIsAddModalOpen(false);
        // Langsung lempar ke panel detail rute menggunakan agen baru ini bray!
        handleTriggerDetail(newAgenForm);
    };

    // ➕ PROSES TAMBAH BANYAK WILAYAH SEKALIGUS (MASS ADD)
    const handleAddMassal = async (e) => {
        e.preventDefault();
        if (!inputPropinsi || !inputKabupatenRaw) {
            return Swal.fire('Peringatan', 'Mohon isi Provinsi dan Kota Tujuan bray!', 'warning');
        }

        const arrayKota = inputKabupatenRaw.split(',').map(k => k.trim()).filter(k => k !== '');

        try {
            const token = localStorage.getItem('token');
            const payload = {
                agenid_asal: selectedAgen.agen_id,
                kend_jenis: kendJenis,
                tujuan_propinsi: inputPropinsi.toUpperCase(),
                tujuan_kabupaten: arrayKota.map(k => k.toUpperCase())
            };

            await api.post('/master/tarif-carter/mass-add', payload, { headers: { Authorization: `Bearer ${token}` } });
            Swal.fire('Sukses', 'Rute wilayah tujuan baru berhasil ditambahkan bray!', 'success');
            setInputPropinsi(''); setInputKabupatenRaw('');
            fetchMatrixDetail(selectedAgen.agen_id, kendJenis);
            fetchIndex();
        } catch (err) {
            Swal.fire('Gagal', 'Gagal menyuntikkan rute baru', 'error');
        }
    };

    // 📝 INLINE EDIT VALUE UPDATER
    const handleInlineUpdate = async (id, field, value, idx) => {
        try {
            const token = localStorage.getItem('token');
            const currentItem = matrixTarif[idx];
            let hargaPayload = currentItem.harga_pokok;
            let ketPayload = currentItem.keterangan;

            if (field === 'harga_pokok') hargaPayload = parseFloat(value) || 0;
            if (field === 'keterangan') ketPayload = value;

            await api.put(`/master/tarif-carter/inline-update`, {
                id: id, harga_pokok: hargaPayload, keterangan: ketPayload
            }, { headers: { Authorization: `Bearer ${token}` } });

            const Toast = Swal.mixin({ toast: true, position: 'bottom-end', showConfirmButton: false, timer: 1200 });
            Toast.fire({ icon: 'success', title: 'Data tersinkron otomatis!' });
        } catch (err) { console.error(err); }
    };

    const handleLocalValueChange = (idx, field, value) => {
        const updatedMatrix = [...matrixTarif];
        updatedMatrix[idx][field] = value;
        setMatrixTarif(updatedMatrix);
    };

    // 🗑️ PROSES DELETE ITEM TARIF
    const handleDeleteItem = async (id) => {
        Swal.fire({
            title: 'Hapus Jalur Rute?',
            text: "Matriks tarif tujuan ini akan didelete permanen bray!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Delete!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete(`/master/tarif-carter/item/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                    Swal.fire('Sukses', 'Jalur carter resmi dibersihkan!', 'success');
                    fetchMatrixDetail(selectedAgen.agen_id, kendJenis);
                    fetchIndex();
                } catch (err) { Swal.fire('Gagal', 'Gagal menghapus rute', 'error'); }
            }
        });
    };

    const columnsIndex = [
        { header: 'KODE', accessor: 'agen_id', render: (i) => <span className="font-mono font-bold text-indigo-600 cursor-pointer hover:underline" onClick={() => handleTriggerDetail(i)}>{i.agen_id}</span> },
        { header: 'NAMA AGEN / CABANG ASAL', accessor: 'agen_nama', render: (i) => <span className="font-bold text-slate-700">{i.agen_nama}</span> },
        { header: 'KOTA POOL', accessor: 'agen_kota', render: (i) => <span className="font-semibold">{i.agen_kota}</span> },
        {
            header: 'JUMLAH HARGA TERDAFTAR',
            accessor: 'jml',
            render: (i) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-black ${i.jml > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    📊 {i.jml} RUTE AKTIF
                </span>
            )
        }
    ];

    return (
        <div className="min-h-screen p-4 space-y-4 bg-slate-50 text-slate-800">
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2 uppercase">
                    <DollarSign size={20} className="text-emerald-600" /> Billing Engine: Master Tarif Carter Sewa Truk
                </h3>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 grid grid-cols-4 gap-4 items-end text-xs font-bold text-slate-600">
                <div className="col-span-3">
                    <label className="block mb-1 text-slate-500">CARI POOL CABANG ASAL</label>
                    <input type="text" className="w-full p-2.5 border rounded-lg text-sm bg-white uppercase outline-none" placeholder="Masukkan nama cabang..." value={searchAgen} onChange={e => setSearchAgen(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchIndex()} />
                </div>
                <button onClick={fetchIndex} className="py-2.5 bg-emerald-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 h-[42px]">
                    <Search size={14} /> REFRESH
                </button>
            </div>

            {/* KUNCI SAKTI SUDAH DIPASANG DI ONADD BRAY! */}
            <DataTableTemplate
                title="Daftar Kontrol Area Distribusi Carter (MKT_M_eHarga_Charter)" columns={columnsIndex} data={indexData} loading={loading} isDarkMode={false}
                onAdd={handleOpenAddModal} onEdit={handleTriggerDetail} onDelete={() => { }}
            />

            {/* MODAL AUTO-FILL PILIH POOL INISIASI ASAL BERDASARKAN DATABASE KASTA TERTINGGI */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl border border-slate-200 text-xs font-bold text-slate-700 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center border-b pb-2 mb-3">
                            <span className="text-sm font-black text-indigo-900 uppercase">Pilih Pool Inisiasi Asal</span>
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                        </div>

                        {/* INPUT LIVE SEARCH CABANG */}
                        <div className="mb-3">
                            <label className="block mb-1 text-slate-500">CARI NAMA CABANG / AGEN DARI DATABASE</label>
                            <input type="text" placeholder="Ketik nama cabang (Contoh: AMBON...)" className="w-full p-2 border border-indigo-200 rounded text-xs uppercase font-normal outline-none" value={filterSearchModal} onChange={e => setFilterSearchModal(e.target.value)} />
                        </div>

                        {/* LIST DATA AGEN BERDASARKAN FILTER SEARCH */}
                        <div className="flex-1 overflow-y-auto border rounded-lg divide-y bg-slate-50 mb-4 max-h-[220px]">
                            {allActiveAgen
                                .filter(a => a.agen_nama.toLowerCase().includes(filterSearchModal.toLowerCase()) || a.agen_id.toLowerCase().includes(filterSearchModal.toLowerCase()))
                                .map((agen) => (
                                    <div
                                        key={agen.agen_id}
                                        onClick={() => {
                                            // AUTO FILL SAKTI DI DETIK INI JUGA BRAY!
                                            setNewAgenForm({
                                                agen_id: agen.agen_id,
                                                agen_nama: agen.agen_nama,
                                                agen_kota: agen.agen_kota
                                            });
                                        }}
                                        className={`p-2.5 cursor-pointer transition-colors text-left flex justify-between items-center ${newAgenForm.agen_id === agen.agen_id ? 'bg-indigo-100 text-indigo-900 font-black' : 'hover:bg-white text-slate-700'}`}
                                    >
                                        <div>
                                            <div className="font-bold text-xs uppercase">{agen.agen_nama}</div>
                                            <div className="text-[10px] font-mono text-slate-400">KOTA: {agen.agen_kota || '-'}</div>
                                        </div>
                                        <span className="font-mono text-[11px] bg-slate-200/80 px-1.5 py-0.5 rounded font-bold text-slate-600">{agen.agen_id}</span>
                                    </div>
                                ))
                            }
                        </div>

                        {/* REVIEW PREVIEW DARI FORM AUTO FILL */}
                        <form onSubmit={handleAddAgenSubmit} className="space-y-3 pt-2 border-t border-slate-100">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                    <label className="block text-slate-400 text-[10px]">KODE AGEN</label>
                                    <input type="text" readOnly className="w-full p-2 border bg-slate-100 rounded font-mono text-center text-slate-700 outline-none" value={newAgenForm.agen_id} placeholder="-" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-slate-400 text-[10px]">KOTA POOL ASAL</label>
                                    <input type="text" readOnly className="w-full p-2 border bg-slate-100 rounded text-slate-700 outline-none" value={newAgenForm.agen_kota || ''} placeholder="-" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-400 text-[10px]">NAMA CABANG TERPILIH</label>
                                <input type="text" readOnly className="w-full p-2 border bg-slate-100 rounded text-slate-700 outline-none" value={newAgenForm.agen_nama} placeholder="Silakan pilih cabang di atas bray..." />
                            </div>

                            <button type="submit" disabled={!newAgenForm.agen_id} className={`w-full py-2.5 font-black rounded uppercase transition mt-2 shadow-sm ${newAgenForm.agen_id ? 'bg-indigo-900 hover:bg-indigo-950 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                                Buka Matriks & Konfigurasi Tarif
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MATRIX BUNDLING MODAL (FORM TAMBAH + EDIT INLINE + DELETE BARIS) */}
            {isDetailOpen && selectedAgen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="w-full max-w-4xl p-6 bg-white rounded-2xl shadow-2xl flex flex-col my-4 border border-slate-200">

                        {/* Header Info */}
                        <div className="border-b pb-3 mb-4 flex items-center justify-between text-xs font-bold text-slate-500">
                            <div>
                                <h4 className="text-sm font-black text-slate-800 uppercase">MATRIKS EDIT TARIF: {selectedAgen.agen_nama}</h4>
                                <span className="font-mono text-[11px] block text-slate-400">ID Agen: {selectedAgen.agen_id} | Kota Pool: {selectedAgen.agen_kota || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-slate-700 flex items-center gap-1"><Truck size={14} className="text-indigo-600" /> ARMADA TRUK:</label>
                                <select className="p-2 border rounded-lg bg-slate-50 font-black text-xs text-indigo-900 outline-none cursor-pointer" value={kendJenis} onChange={handleJenisKendaraanChange}>
                                    {opsiKendaraan.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* FORMULIR BUNDLING TAMBAH WILAYAH TUJUAN BARU (MASS ADD) */}
                        <form onSubmit={handleAddMassal} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl mb-4 grid grid-cols-12 gap-3 items-end text-xs font-bold text-slate-700">
                            <div className="col-span-3">
                                <label className="block mb-1 uppercase text-indigo-900">PROVINSI TUJUAN</label>
                                <input type="text" required placeholder="Contoh: JAWA BARAT" className="w-full p-2 border rounded bg-white text-xs uppercase font-normal outline-none focus:border-indigo-500" value={inputPropinsi} onChange={e => setInputPropinsi(e.target.value)} />
                            </div>
                            <div className="col-span-7">
                                <label className="block mb-1 uppercase text-indigo-900">KOTA / KABUPATEN TUJUAN (Pisah dengan tanda koma untuk banyak kota)</label>
                                <input type="text" required placeholder="Contoh: BEKASI, BOGOR, DEPOK" className="w-full p-2 border rounded bg-white text-xs uppercase font-normal outline-none focus:border-indigo-500" value={inputKabupatenRaw} onChange={e => setInputKabupatenRaw(e.target.value)} />
                            </div>
                            <button type="submit" className="col-span-2 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-black rounded text-[11px] uppercase flex items-center justify-center gap-1 h-[34px] shadow-sm">
                                <Plus size={14} /> Tambah Rute
                            </button>
                        </form>

                        {/* LIST MATRIX TABLE */}
                        <div className="flex-1 min-h-[250px] max-h-[350px] overflow-y-auto border rounded-xl bg-slate-50 p-2">
                            {detailLoading ? (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400 font-medium text-xs uppercase tracking-wider">Loading data...</div>
                            ) : (
                                <table className="w-full text-left text-xs border-collapse bg-white">
                                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0 text-[10px] border-b shadow-xs">
                                        <tr>
                                            <th className="p-2.5">PROVINSI</th>
                                            <th className="p-2.5">KOTA / KABUPATEN TUJUAN</th>
                                            <th className="p-2.5 text-right w-[180px]">HARGA CARTER (Rp)</th>
                                            <th className="p-2.5 w-[250px]">KETERANGAN LOGISTIK</th>
                                            <th className="p-2.5 text-center w-[50px]">HAPUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                                        {matrixTarif.length === 0 ? (
                                            <tr><td colSpan={5} className="text-center p-8 text-rose-500 bg-rose-50/20 font-black uppercase">⚠️ Belum Ada Rute yang Terdaftar bray!</td></tr>
                                        ) : matrixTarif.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50">
                                                <td className="p-2.5 text-slate-500 uppercase">{item.tujuan_propinsi}</td>
                                                <td className="p-2.5 font-black text-slate-900 uppercase">{item.tujuan_kabupaten}</td>
                                                <td className="p-2 text-right">
                                                    <div className="flex items-center justify-end bg-amber-50/50 border border-amber-200 focus-within:border-emerald-500 focus-within:bg-white rounded px-2 py-0.5">
                                                        <span className="text-slate-400 text-[10px] mr-1">Rp</span>
                                                        <input type="number" className="w-full bg-transparent text-right font-mono font-bold text-emerald-800 outline-none text-xs" value={item.harga_pokok} onChange={(e) => handleLocalValueChange(idx, 'harga_pokok', e.target.value)} onBlur={(e) => handleInlineUpdate(item.id, 'harga_pokok', e.target.value, idx)} />
                                                    </div>
                                                </td>
                                                <td className="p-2">
                                                    <input type="text" className="w-full p-1 border rounded text-xs text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none" placeholder="Memo..." value={item.keterangan || ''} onChange={(e) => handleLocalValueChange(idx, 'keterangan', e.target.value)} onBlur={(e) => handleInlineUpdate(item.id, 'keterangan', e.target.value, idx)} />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button type="button" onClick={() => handleDeleteItem(item.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><Trash2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-between items-center pt-4 border-t mt-4">
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1"><Info size={12} /> Penambahan & hapus rute langsung memodifikasi GORM database se-Nusantara bray.</span>
                            <button type="button" onClick={() => { setIsDetailOpen(false); fetchIndex(); }} className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg text-xs uppercase tracking-wider">
                                SELESAI
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}