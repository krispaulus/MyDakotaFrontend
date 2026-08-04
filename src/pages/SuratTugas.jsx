import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { RefreshCw, X as XIcon, Truck, Save, LogOut } from 'lucide-react';
import Swal from 'sweetalert2';

const SuratTugas = () => {
    const { isDarkMode } = useDarkMode();
    const [stList, setStList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Master Dropdown List States
    const [kendaraanList, setKendaraanList] = useState([]);
    const [sopirList, setSopirList] = useState([]);
    const [agenList, setAgenList] = useState([]);
    const [tugasList, setTugasList] = useState([]);

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

    // Default Form Data Sesuai Aplikasi Lawas
    const defaultForm = {
        sjh_id: '',
        tgl_berangkat: today,
        jam_berangkat: '11:00:00',
        tgl_kembali: today,
        jam_kembali: '12:00:00',
        by_loading: 'Tidak', // 'Ya' / 'Tidak'
        sjh_kendid: '',
        sjh_sopir1_nip: '',
        sjh_sopir2_nip: '',
        sjh_startagenid: '',
        sjh_endagenid: '',
        sjh_assid: '',
        nominal_um: 0,
        sjh_keterangan: ''
    };
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchMasterData();
        fetchSuratTugasData();
    }, []);

    // Fetch Master Data (Kendaraan, Sopir, Agen, Assignment)
    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Panggil endpoint /sopir-list dan /sopir/list sebagai fallback
            const [resKend, resSopir, resAgen, resTugas] = await Promise.all([
                api.get('/master/kendaraan', { headers }).catch(() => ({ data: [] })),
                api.get('/sopir-list', { headers }).catch(() => api.get('/sopir/list', { headers })).catch(() => ({ data: [] })),
                api.get('/agens', { headers }).catch(() => ({ data: [] })),
                api.get('/master/assignment', { headers }).catch(() => ({ data: [] }))
            ]);

            const kends = resKend.data?.data || resKend.data || [];
            const sopirs = resSopir.data?.data || resSopir.data || [];
            const agens = resAgen.data?.data || resAgen.data || [];
            const tugas = resTugas.data?.data || resTugas.data || [];

            setKendaraanList(Array.isArray(kends) ? kends : []);
            setSopirList(Array.isArray(sopirs) ? sopirs : []);
            setAgenList(Array.isArray(agens) ? agens : []);
            setTugasList(Array.isArray(tugas) ? tugas : []);
        } catch (err) {
            console.error("Gagal memuat master data:", err);
        }
    };

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
        const tglBerangkat = item.sjh_tanggal ? item.sjh_tanggal.split(' ')[0] : today;
        const jamBerangkat = item.sjh_tanggal && item.sjh_tanggal.includes(' ') ? item.sjh_tanggal.split(' ')[1] : '11:00:00';
        const tglKembali = item.sjh_tanggalkembali ? item.sjh_tanggalkembali.split(' ')[0] : today;
        const jamKembali = item.sjh_tanggalkembali && item.sjh_tanggalkembali.includes(' ') ? item.sjh_tanggalkembali.split(' ')[1] : '12:00:00';

        setFormData({
            sjh_id: item.sjh_id || '',
            tgl_berangkat: tglBerangkat,
            jam_berangkat: jamBerangkat,
            tgl_kembali: tglKembali,
            jam_kembali: jamKembali,
            by_loading: item.sjh_byloading || 'Tidak',
            sjh_kendid: item.sjh_kendid || '',
            sjh_sopir1_nip: item.sjh_sopir1_nip !== '-' ? item.sjh_sopir1_nip : '',
            sjh_sopir2_nip: item.sjh_sopir2_nip !== '-' ? item.sjh_sopir2_nip : '',
            sjh_startagenid: item.sjh_startagenid || '',
            sjh_endagenid: item.sjh_endagenid || '',
            sjh_assid: item.sjh_assid !== '-' ? item.sjh_assid : '',
            nominal_um: item.nominal_um || 0,
            sjh_keterangan: item.sjh_keterangan !== '-' ? item.sjh_keterangan : ''
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
        if (!formData.sjh_kendid) {
            Swal.fire('Peringatan', 'Nomor Kendaraan wajib dipilih!', 'warning');
            return;
        }

        const fullTglBerangkat = `${formData.tgl_berangkat} ${formData.jam_berangkat}`;
        const fullTglKembali = `${formData.tgl_kembali} ${formData.jam_kembali}`;

        const payload = {
            ...formData,
            sjh_tanggal: fullTglBerangkat,
            sjh_tanggalkembali: fullTglKembali,
            nominal_um: parseFloat(formData.nominal_um) || 0
        };

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/operasional/surattugas-update' : '/operasional/surattugas-create';
            const method = isEditMode ? api.put : api.post;

            await method(endpoint, payload, {
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

            {/* ========================================================================= */}
            {/* 📝 MODAL POP-UP PEMBUATAN SURAT TUGAS PRESISI SAMA APLIKASI LAWAS        */}
            {/* ========================================================================= */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 max-h-[92vh]">

                        {/* Header Modal */}
                        <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md">
                                    <Truck size={22} />
                                </div>
                                <h2 className="text-lg font-black text-emerald-700 tracking-wide uppercase">
                                    PEMBUATAN SURAT TUGAS
                                </h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition font-bold cursor-pointer">
                                <XIcon size={18} />
                            </button>
                        </div>

                        {/* Form Body Layout Sesuai Aplikasi Lawas */}
                        <form onSubmit={handleSubmitForm} className="p-8 space-y-5 text-xs font-bold text-slate-700 overflow-y-auto flex-1">

                            {/* Baris 1: Tanggal Berangkat, Jam Berangkat, By Loading */}
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">TANGGAL BERANGKAT :</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-emerald-50/50 font-medium"
                                        value={formData.tgl_berangkat}
                                        onChange={e => setFormData({ ...formData, tgl_berangkat: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">JAM BERANGKAT :</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-mono bg-white"
                                        placeholder="HH:MM:SS (contoh: 11:00:00)"
                                        value={formData.jam_berangkat}
                                        onChange={e => setFormData({ ...formData, jam_berangkat: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">BY LOADING :</label>
                                    <div className="flex items-center gap-6 pt-2.5 font-bold">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="by_loading"
                                                value="Ya"
                                                checked={formData.by_loading === 'Ya'}
                                                onChange={e => setFormData({ ...formData, by_loading: e.target.value })}
                                                className="w-4 h-4 text-emerald-600 cursor-pointer"
                                            />
                                            <span>Ya</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="by_loading"
                                                value="Tidak"
                                                checked={formData.by_loading === 'Tidak'}
                                                onChange={e => setFormData({ ...formData, by_loading: e.target.value })}
                                                className="w-4 h-4 text-emerald-600 cursor-pointer"
                                            />
                                            <span>Tidak</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Baris 2: Tanggal Kembali, Jam Kembali */}
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">TANGGAL KEMBALI :</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white font-medium"
                                        value={formData.tgl_kembali}
                                        onChange={e => setFormData({ ...formData, tgl_kembali: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">JAM KEMBALI :</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-mono bg-white"
                                        placeholder="HH:MM:SS (contoh: 12:00:00)"
                                        value={formData.jam_kembali}
                                        onChange={e => setFormData({ ...formData, jam_kembali: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Baris 3: Nomor Kendaraan, Pengemudi 1, Pengemudi 2 */}
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">NOMOR KENDARAAN :</label>
                                    <select
                                        className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white cursor-pointer uppercase font-bold text-slate-800"
                                        value={formData.sjh_kendid}
                                        onChange={e => setFormData({ ...formData, sjh_kendid: e.target.value })}
                                        required
                                    >
                                        <option value="">-- PILIH ARMADA --</option>
                                        {kendaraanList.map((k, i) => (
                                            <option key={i} value={k.kend_id || k.kend_identid}>{k.kend_identid || k.kend_id}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* PENGEMUDI 1 */}
                                <div className="col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">PENGEMUDI 1 :</label>
                                    <select
                                        className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white cursor-pointer uppercase text-xs font-bold text-slate-800"
                                        value={formData.sjh_sopir1_nip}
                                        onChange={e => setFormData({ ...formData, sjh_sopir1_nip: e.target.value })}
                                        disabled={formData.by_loading === 'Ya'}
                                    >
                                        <option value="">-- PILIH PENGEMUDI 1 --</option>
                                        {formData.by_loading === 'Ya' ? (
                                            <option value="">DAFTAR NAMA PENGEMUDI 1 DIKOSONGKAN TERLEBIH DAHULU</option>
                                        ) : (
                                            sopirList.map((s, i) => (
                                                <option key={i} value={s.kry_nip}>
                                                    {s.kry_nama} [{s.kry_nip}]
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                {/* PENGEMUDI 2 */}
                                <div className="col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">PENGEMUDI 2 :</label>
                                    <select
                                        className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white cursor-pointer uppercase text-xs font-bold text-slate-800"
                                        value={formData.sjh_sopir2_nip}
                                        onChange={e => setFormData({ ...formData, sjh_sopir2_nip: e.target.value })}
                                        disabled={formData.by_loading === 'Ya'}
                                    >
                                        <option value="">-- PILIH PENGEMUDI 2 (OPSIONAL) --</option>
                                        {formData.by_loading === 'Ya' ? (
                                            <option value="">DAFTAR NAMA PENGEMUDI 2 DIKOSONGKAN TERLEBIH DAHULU</option>
                                        ) : (
                                            sopirList.map((s, i) => (
                                                <option key={i} value={s.kry_nip}>
                                                    {s.kry_nama} [{s.kry_nip}]
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            </div>

                            {/* Baris 4: Berangkat Dari, Pulang Ke, Tugas */}
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">BERANGKAT DARI :</label>
                                    <select
                                        className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white cursor-pointer uppercase"
                                        value={formData.sjh_startagenid}
                                        onChange={e => setFormData({ ...formData, sjh_startagenid: e.target.value })}
                                    >
                                        <option value="">-- PILIH AGEN ASAL --</option>
                                        {agenList.map((a, i) => (
                                            <option key={i} value={a.agen_id}>{a.agen_nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">PULANG KE :</label>
                                    <select
                                        className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white cursor-pointer uppercase"
                                        value={formData.sjh_endagenid}
                                        onChange={e => setFormData({ ...formData, sjh_endagenid: e.target.value })}
                                    >
                                        <option value="">-- PILIH AGEN TUJUAN --</option>
                                        {agenList.map((a, i) => (
                                            <option key={i} value={a.agen_id}>{a.agen_nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-4">
                                    <label className="block mb-1 text-slate-600 uppercase">TUGAS :</label>
                                    <select
                                        className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white cursor-pointer uppercase font-bold text-indigo-900"
                                        value={formData.sjh_assid}
                                        onChange={e => setFormData({ ...formData, sjh_assid: e.target.value })}
                                    >
                                        <option value="">-- PILIH TUGAS --</option>
                                        {tugasList.length > 0 ? (
                                            tugasList.map((t, i) => (
                                                <option key={i} value={t.ass_id}>{t.ass_nama}</option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="AS001">PENGIRIMAN REGULER LINTAS</option>
                                                <option value="AS002">PENGIRIMAN EKSPRES PRIORITAS</option>
                                                <option value="AS003">LANGGANAN KHUSUS / CHARTER</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            {/* Baris 5: Uang Muka Biaya Operasional */}
                            <div>
                                <label className="block mb-1 text-slate-600 uppercase">UANG MUKA BIAYA OPERASIONAL :</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white font-mono font-bold text-emerald-800 text-sm"
                                    placeholder="Masukkan Uang Muka Biaya Operasional"
                                    value={formData.nominal_um}
                                    onChange={e => setFormData({ ...formData, nominal_um: e.target.value })}
                                />
                            </div>

                            {/* Baris 6: Keterangan */}
                            <div>
                                <label className="block mb-1 text-slate-600 uppercase">KETERANGAN :</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white font-medium"
                                    placeholder="Masukkan Keterangan"
                                    value={formData.sjh_keterangan}
                                    onChange={e => setFormData({ ...formData, sjh_keterangan: e.target.value })}
                                />
                            </div>

                            {/* Button Actions Footer Standard Aplikasi Baru (Persis Gambar 2) */}
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
                                    {isEditMode ? 'UPDATE ST' : 'ADD SURAT TUGAS'}
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