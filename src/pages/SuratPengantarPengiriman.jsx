import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Swal from 'sweetalert2';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    RefreshCw, Plus, Printer, Search, Edit3, Trash2,
    Truck, PackageCheck, X as XIcon, Save, ScanBarcode
} from 'lucide-react';
import dliLogo from '../assets/logoDLI.png';

const SuratPengantarPengiriman = () => {
    const { isDarkMode } = useDarkMode();
    const formatNamaAgen = (nama, id = '') => {
        const sanitized = String(nama || '')
            .replace(/[^\x20-\x7E]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const cleanNama = sanitized.toUpperCase();
        const cleanId = String(id || '').trim().toUpperCase();

        if (cleanNama === 'PUSAT DAKOTA' || cleanId === '001' || cleanId === 'PST001' || cleanId === '1') {
            return 'DLI PUSAT';
        }
        return sanitized || '-';
    };

    const [currentActiveAgen] = useState(() => {
        const rawAgen = localStorage.getItem('active_agen_nama') || localStorage.getItem('kode_cabang') || localStorage.getItem('active_agen_id') || 'DLI PUSAT';
        const rawId = localStorage.getItem('active_agen_id') || '';
        return formatNamaAgen(rawAgen, rawId);
    });

    const [loading, setLoading] = useState(false);
    const [spList, setSpList] = useState([]);
    const [fleet, setFleet] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [agens, setAgens] = useState([]);

    const now = new Date();
    const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const today = now.toISOString().split('T')[0];

    const [filterParams, setFilterParams] = useState({
        tanggal_awal: firstDayOfMonth,
        tanggal_akhir: today,
        no_mobil: '',
        agen_id: '',
        tujuan: '',
        no_sp: '',
        no_btt: '',
        transit: ''
    });

    // Modal Create SP (Langsung BTT / Dari Loading)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [manifestData, setManifestData] = useState([]);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [formData, setFormData] = useState({
        spt_tujuan_agen_nama: '',
        spt_transityn: 'N',
        spt_namasopir: '',
        spt_namasopir2: '',
        spt_nomobil: '',
        spt_surattugas: '',
        spt_boronganyn: 'N',
        spt_service: '1'
    });

    // Modal Edit SP & Scan Tambah/Hapus BTT (opr_t_sp_terima_e.asp)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editHeader, setEditHeader] = useState(null);
    const [editDetails, setEditDetails] = useState([]);
    const [editScanBtt, setEditScanBtt] = useState('');
    const [selectedRemoveBtts, setSelectedRemoveBtts] = useState([]);

    useEffect(() => {
        fetchMasterData();
        fetchSPList();
    }, []);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [resKend, resSopir, resAgens] = await Promise.all([
                api.get('/master/kendaraan', { headers }).catch(() => ({ data: [] })),
                api.get('/master/sopir', { headers }).catch(() => ({ data: [] })),
                api.get('/agens', { headers }).catch(() => ({ data: [] }))
            ]);

            setFleet(resKend.data?.data || resKend.data || []);
            setDrivers(resSopir.data?.data || resSopir.data || []);

            const rawAgens = resAgens.data?.data || resAgens.data || [];
            const seenNames = new Set();
            const uniqueAgens = [];

            (Array.isArray(rawAgens) ? rawAgens : []).forEach((a) => {
                const rawNama = String(a.agen_nama || '').trim();
                if (!rawNama || rawNama.toUpperCase().includes('XXX')) return;

                const cleanNama = formatNamaAgen(rawNama, a.agen_id).toUpperCase();
                if (!seenNames.has(cleanNama)) {
                    seenNames.add(cleanNama);
                    uniqueAgens.push({
                        ...a,
                        agen_nama: cleanNama
                    });
                }
            });

            uniqueAgens.sort((a, b) => {
                if (a.agen_nama === 'DLI PUSAT') return -1;
                if (b.agen_nama === 'DLI PUSAT') return 1;
                return a.agen_nama.localeCompare(b.agen_nama);
            });

            setAgens(uniqueAgens);
        } catch (err) {
            console.error('Gagal memuat master data:', err);
        }
    };

    // 1. Tarik Daftar Histori Surat Pengiriman (opr_t_sp_terima.asp)
    const fetchSPList = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/sp-terima', {
                params: filterParams,
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data?.data || res.data || [];
            setSpList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Gagal memuat Surat Pengiriman:', err);
            setSpList([]);
        } finally {
            setLoading(false);
        }
    };

    // 2. Tambah SP dari Proses Loading Barang (opr_t_sp_terima_f.asp / opr_t_sp_terima_a.asp)
    const handleOpenFromLoading = () => {
        Swal.fire({
            title: 'Tambah SP Dari Proses Loading',
            input: 'text',
            inputLabel: 'Masukkan Nomor Loading (LoadH_ID) atau Nomor Surat Tugas:',
            inputPlaceholder: 'Contoh: LC0012026110000038 atau 001JC2026...',
            showCancelButton: true,
            confirmButtonText: 'Tarik Data Loading',
            confirmButtonColor: '#2563eb',
            showLoaderOnConfirm: true,
            preConfirm: async (val) => {
                const cleanCode = String(val || '').trim().toUpperCase();
                if (!cleanCode) {
                    Swal.showValidationMessage('Nomor Loading / Surat Tugas wajib diisi!');
                    return false;
                }
                try {
                    const token = localStorage.getItem('token');
                    const resp = await api.get('/operasional/sp-terima/from-loading', {
                        params: { load_id: cleanCode },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    return resp.data;
                } catch (err) {
                    const msg = err.response?.data?.message || err.message || 'Data loading tidak ditemukan';
                    Swal.showValidationMessage(msg);
                    return false;
                }
            },
            allowOutsideClick: () => !Swal.isLoading()
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const hdr = result.value?.header || {};
                const btts = Array.isArray(result.value?.btts) ? result.value.btts : [];

                const s1 = String(hdr.sopir1 || '').trim().toUpperCase();
                const s2 = String(hdr.sopir2 || '').trim().toUpperCase();

                setFormData({
                    spt_tujuan_agen_nama: String(hdr.tujuan_agen_nama || '').trim().toUpperCase(),
                    spt_transityn: 'N',
                    spt_namasopir: s1,
                    spt_namasopir2: s2,
                    spt_nomobil: String(hdr.no_mobil || '').trim().toUpperCase(),
                    spt_surattugas: String(hdr.surat_tugas || hdr.load_id || '').trim().toUpperCase(),
                    spt_boronganyn: 'N',
                    spt_service: '1'
                });

                setManifestData(btts.map((b, i) => ({
                    no_urut: i + 1,
                    btt_id: b.btt_id,
                    no_sj: b.no_sj || '-',
                    tgl_btt: b.tgl_btt || '-',
                    pengirim: b.pengirim || '-',
                    penerima: b.penerima || '-',
                    alamat: b.alamat || '-',
                    kota: b.kota || '-',
                    telp: b.telp || '-',
                    koli: b.koli || 1,
                    berat: b.berat || 0,
                    scan_time: 'FROM LOADING',
                    status_muat: 'READY'
                })));

                setIsCreateModalOpen(true);

                if (btts.length === 0) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        title: `Header ${hdr.load_id} (${hdr.no_mobil}) ditarik, belum ada BTT di loading ini.`,
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            }
        });
    };

    // 3. Scan Tambah BTT pada Modal Buat SP Baru
    const handleAddBTT = async (e) => {
        if (e) e.preventDefault();
        const rawScan = barcodeInput.trim().toUpperCase();
        if (!rawScan) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Silakan ketik atau scan nomor BTT terlebih dahulu!',
                showConfirmButton: false,
                timer: 1800
            });
            return;
        }

        // Ambil 16 digit nomor BTT dasar jika yang discan adalah barcode koli 20 digit
        const cleanBTT = rawScan.slice(0, 16);

        if (manifestData.some(item => item.btt_id === cleanBTT)) {
            Swal.fire('Duplikasi BTT!', `Resi ${cleanBTT} sudah ada dalam daftar muatan.`, 'warning');
            setBarcodeInput('');
            return;
        }

        setManifestData(prev => [
            ...prev,
            {
                no_urut: prev.length + 1,
                btt_id: cleanBTT,
                scan_time: new Date().toLocaleTimeString(),
                status_muat: 'READY'
            }
        ]);
        setBarcodeInput('');
    };

    // 4. Simpan Penerbitan SP Baru (CreateSPNaikHandler)
    const handleSaveSPNaik = async () => {
        if (!formData.spt_tujuan_agen_nama || !formData.spt_nomobil || !formData.spt_namasopir) {
            Swal.fire('Belum Lengkap', 'Cabang Tujuan, Nomor Kendaraan, dan Sopir wajib diisi!', 'warning');
            return;
        }
        if (manifestData.length === 0) {
            Swal.fire('Manifest Kosong', 'Minimal scan 1 nomor resi BTT!', 'warning');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                spt_asal_agen_nama: currentActiveAgen,
                ...formData,
                spt_service: String(formData.spt_service || '1'),
                daftar_btt: manifestData.map(item => item.btt_id)
            };

            const res = await api.post('/operasional/sp-naik', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', `Surat Pengantar ${res.data?.spt_eid} berhasil diterbitkan!`, 'success');
            setIsCreateModalOpen(false);
            setManifestData([]);
            fetchSPList();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menerbitkan SP', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 5. Buka Modal Edit / Scan Tambah BTT ke SP Existing (opr_t_sp_terima_e.asp)
    const handleOpenEditSP = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/sp-terima/detail', {
                params: { sp_id: item.no_sp },
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditHeader(res.data?.header || {});
            setEditDetails(res.data?.details || []);
            setSelectedRemoveBtts([]);
            setEditScanBtt('');
            setIsEditModalOpen(true);
        } catch (err) {
            Swal.fire('Gagal', 'Tidak dapat memuat detail Surat Pengantar', 'error');
        }
    };

    const handleScanAddToExistingSP = async (e) => {
        e.preventDefault();
        if (!editScanBtt.trim() || !editHeader) return;
        try {
            const token = localStorage.getItem('token');
            const res = await api.put('/operasional/sp-terima/update', {
                no_sp: editHeader.no_sp,
                add_btt: editScanBtt.trim()
            }, { headers: { Authorization: `Bearer ${token}` } });

            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: res.data?.message, showConfirmButton: false, timer: 1800 });
            setEditScanBtt('');
            handleOpenEditSP({ no_sp: editHeader.no_sp });
            fetchSPList();
        } catch (err) {
            Swal.fire('Peringatan', err.response?.data?.message || 'Gagal menambah BTT', 'warning');
        }
    };

    const handleSaveEditSP = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await api.put('/operasional/sp-terima/update', {
                no_sp: editHeader.no_sp,
                tujuan_nama: editHeader.tujuan_nama,
                transit_yn: editHeader.transit_yn,
                nama_sopir: editHeader.nama_sopir,
                no_mobil: editHeader.no_mobil,
                surat_tugas: editHeader.surat_tugas,
                borongan_yn: editHeader.borongan_yn,
                remove_btts: selectedRemoveBtts
            }, { headers: { Authorization: `Bearer ${token}` } });

            Swal.fire('Tersimpan!', 'Perubahan Surat Pengantar berhasil disimpan.', 'success');
            setIsEditModalOpen(false);
            fetchSPList();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan perubahan', 'error');
        }
    };

    // 6. Non-Aktifkan SP (p-opr_t_sp_terima_h.asp)
    const handleDeleteSP = (item) => {
        Swal.fire({
            title: 'Non-Aktifkan Surat Pengantar?',
            text: `Nomor SP ${item.no_sp} akan dinonaktifkan.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Non-Aktifkan!'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/sp-terima/delete', {
                        params: { sp_id: item.no_sp },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Berhasil!', 'Surat Pengantar dinonaktifkan.', 'success');
                    fetchSPList();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus SP', 'error');
                }
            }
        });
    };

    // 7. Cetak Dokumen SP Individual (Desain Modern + Data Lengkap Sesuai Aplikasi Lawas)
    const handlePrintSingleSP = async (item) => {
        const targetNoSP = String(item?.no_sp || item?.spt_eid || '').trim();
        if (!targetNoSP) {
            Swal.fire('Gagal', 'Nomor SP tidak ditemukan', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/sp-terima/detail', {
                params: { sp_id: targetNoSP },
                headers: { Authorization: `Bearer ${token}` }
            });
            const hdr = res.data?.header || {};
            const items = Array.isArray(res.data?.details) ? res.data.details : [];

            const totalKoli = items.reduce((acc, r) => acc + Number(r.jumlah || 0), 0);
            const totalBerat = items.reduce((acc, r) => acc + Number(r.berat || 0), 0);
            const totalBiaya = items.reduce((acc, r) => acc + Number(r.biaya_kirim || 0), 0);

            const win = window.open('', '_blank', 'width=1080,height=780');
            if (!win) {
                Swal.fire('Pop-up Diblokir', 'Izinkan pop-up browser untuk mencetak dokumen SP.', 'warning');
                return;
            }

            win.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Surat Pengantar Pengiriman - ${targetNoSP}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; color: #000; }
                        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                        th, td { border: 1px solid #333; padding: 5px 6px; }
                        th { background: #004b84; color: #fff; font-size: 10px; text-transform: uppercase; }
                        tfoot td { font-weight: bold; background: #f1f5f9; }
                    </style>
                </head>
                <body onload="window.print()">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:10px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <img src="${dliLogo}" alt="Logo DLI" style="height:46px; object-fit:contain;" />
                            <div>
                                <div style="font-size:15px; font-weight:bold;">PT. DAKOTA LOGISTIK INDONESIA</div>
                                <div style="font-size:13px; font-weight:bold; color:#004b84; margin-top:2px;">SURAT PENGANTAR PENGIRIMAN (SP)</div>
                                <div style="margin-top:3px;">No. SP: <b>${hdr.no_sp || targetNoSP}</b> | Tanggal: <b>${hdr.tanggal || item.tanggal || '-'}</b></div>
                            </div>
                        </div>
                        <div style="text-align:right; line-height:1.5;">
                            <div>Asal: <b>${hdr.asal_nama || item.asal || '-'}</b> &rarr; Tujuan: <b>${hdr.tujuan_nama || item.tujuan || '-'}</b> ${hdr.transit_yn === 'Y' ? '(TRANSIT)' : ''}</div>
                            <div>No. Kendaraan: <b>${hdr.no_mobil || item.no_mobil || '-'}</b> | No. ST: <b>${hdr.surat_tugas || '-'}</b></div>
                            <div>Sopir / Pengemudi: <b>${hdr.nama_sopir || item.sopir || '-'}</b></div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th width="28">NO</th>
                                <th>BTT</th>
                                <th>SURAT JALAN (NO. OD CUSTOMER)</th>
                                <th>PEMBAYARAN</th>
                                <th>SERVICE</th>
                                <th>PENGIRIM</th>
                                <th>PENERIMA</th>
                                <th width="45">KOLI</th>
                                <th width="55">BERAT</th>
                                <th width="85">BIAYA KIRIM</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((r, i) => `
                                <tr>
                                    <td align="center">${i + 1}</td>
                                    <td><b>${r.btt_id || '-'}</b></td>
                                    <td>${r.no_sj || '-'}</td>
                                    <td align="center">${r.pembayaran || '-'}</td>
                                    <td align="center">${r.service_nama || 'Darat'}</td>
                                    <td>${r.pengirim || '-'}</td>
                                    <td>${r.penerima || '-'}</td>
                                    <td align="right">${Number(r.jumlah || 0).toLocaleString('id-ID')}</td>
                                    <td align="right">${Number(r.berat || 0).toLocaleString('id-ID')}</td>
                                    <td align="right">${Number(r.biaya_kirim || 0).toLocaleString('id-ID')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="7" align="right">TOTAL (${items.length} BTT) :</td>
                                <td align="right">${totalKoli.toLocaleString('id-ID')}</td>
                                <td align="right">${totalBerat.toLocaleString('id-ID')}</td>
                                <td align="right">${totalBiaya.toLocaleString('id-ID')}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="font-style:italic; font-size:10px; margin-top:8px;">
                        Menerangkan bahwa pengemudi dan checker telah melakukan serah terima barang, sudah menghitung serta memeriksa barang kiriman tsb. Kami menyatakan barang tersebut dalam keadaan BAIK, dan sesuai ketentuan untuk diserahterimakan.
                    </div>

                    <div style="display:flex; justify-content:space-between; margin-top:28px; text-align:center;">
                        <div style="width:23%;">
                            <div>Pembuat SP,</div>
                            <div style="margin-top:48px;">[ ___________________ ]</div>
                        </div>
                        <div style="width:23%;">
                            <div>Checker,</div>
                            <div style="margin-top:48px;">[ ___________________ ]</div>
                        </div>
                        <div style="width:26%;">
                            <div>Pengemudi,</div>
                            <div style="margin-top:48px;">[ ${hdr.nama_sopir || item.sopir || '___________________'} ]</div>
                        </div>
                        <div style="width:23%;">
                            <div>Diterima Oleh,</div>
                            <div style="margin-top:48px;">[ ___________________ ]</div>
                        </div>
                    </div>
                </body>
                </html>
            `);
            win.document.close();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyiapkan cetakan SP', 'error');
        }
    };

    const columns = [
        {
            header: 'NO. SP',
            accessor: 'no_sp',
            render: (i) => (
                <button
                    type="button"
                    onClick={() => handleOpenEditSP(i)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs rounded-lg cursor-pointer transition"
                >
                    {i.no_sp}
                </button>
            )
        },
        { header: 'TANGGAL', accessor: 'tanggal', render: (i) => <span className="font-mono text-xs">{i.tanggal}</span> },
        { header: 'CABANG ASAL', accessor: 'asal', render: (i) => <span className="font-bold">{i.asal}</span> },
        {
            header: 'CABANG TUJUAN',
            accessor: 'tujuan',
            render: (i) => (
                <span className="font-bold">
                    {i.tujuan} {i.spt_transityn === 'Y' && <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px]">(TRANSIT)</span>}
                </span>
            )
        },
        { header: 'NO. MOBIL', accessor: 'no_mobil', render: (i) => <span className="font-mono font-bold">{i.no_mobil}</span> },
        { header: 'SOPIR', accessor: 'sopir', render: (i) => <span className="uppercase font-semibold">{i.sopir}</span> },
        { header: 'BTT', accessor: 'jmlbtt', render: (i) => <span className="font-mono font-bold text-indigo-700">{i.jmlbtt}</span> },
        { header: 'COD', accessor: 'jmlcod', render: (i) => <span className="font-mono">{Number(i.jmlcod) > 0 ? `Rp ${Number(i.jmlcod).toLocaleString('id-ID')}` : '-'}</span> },
        {
            header: 'AKTIF',
            accessor: 'aktif',
            render: (i) => (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${i.aktif === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {i.aktif === 'Y' ? 'Ya' : 'Tidak'}
                </span>
            )
        },
        {
            header: 'ACTION',
            accessor: 'action',
            render: (item) => (
                <div className="flex items-center justify-center gap-1.5">
                    <button type="button" onClick={() => handleOpenEditSP(item)} title="Edit / Scan BTT SP" className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer">
                        <Edit3 size={15} />
                    </button>
                    <button type="button" onClick={() => handlePrintSingleSP(item)} title="Cetak Surat Pengiriman" className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg cursor-pointer">
                        <Printer size={15} />
                    </button>
                    {item.aktif === 'Y' && (
                        <button type="button" onClick={() => handleDeleteSP(item)} title="Non-Aktifkan SP" className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer">
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className={`p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
            {/* PANEL FILTER & TOOLBAR (Menyamakan opr_t_sp_terima.asp dengan Desain Modern) */}
            <div className="p-6 rounded-3xl border bg-white border-slate-200 shadow-xs space-y-4 text-xs font-bold text-slate-600">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-black uppercase tracking-wider text-indigo-700">
                        SURAT PENGANTAR - PENGIRIMAN (OPR_T_ESP_TERIMA)
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block mb-1 text-slate-500">DARI TANGGAL</label>
                        <input
                            type="date"
                            value={filterParams.tanggal_awal}
                            onChange={e => setFilterParams({ ...filterParams, tanggal_awal: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-xl"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-slate-500">SAMPAI TANGGAL</label>
                        <input
                            type="date"
                            value={filterParams.tanggal_akhir}
                            onChange={e => setFilterParams({ ...filterParams, tanggal_akhir: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-xl"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-slate-500">NO. MOBIL</label>
                        <input
                            type="text"
                            list="list-filter-nopol"
                            placeholder="-- SEMUA / KETIK NO. POLISI --"
                            value={filterParams.no_mobil}
                            onChange={e => setFilterParams({ ...filterParams, no_mobil: e.target.value.toUpperCase() })}
                            onKeyDown={e => e.key === 'Enter' && fetchSPList()}
                            className="w-full p-2.5 border border-slate-300 rounded-xl uppercase font-mono"
                        />
                        <datalist id="list-filter-nopol">
                            {fleet.map((f, i) => (
                                <option key={i} value={String(f.kend_id || f.nopol || '').trim()} />
                            ))}
                        </datalist>
                    </div>
                    <div>
                        <label className="block mb-1 text-slate-500">AGEN / CABANG ASAL</label>
                        <select
                            value={filterParams.agen_id}
                            onChange={e => setFilterParams({ ...filterParams, agen_id: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-xl bg-white uppercase"
                        >
                            <option value="">-- SEMUA CABANG ASAL --</option>
                            {agens.map((a, i) => (
                                <option key={i} value={a.agen_id}>
                                    {a.agen_nama}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block mb-1 text-slate-500">CABANG TUJUAN</label>
                        <select
                            value={filterParams.tujuan}
                            onChange={e => setFilterParams({ ...filterParams, tujuan: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-xl bg-white uppercase"
                        >
                            <option value="">-- SEMUA CABANG TUJUAN --</option>
                            {agens.map((a, i) => (
                                <option key={i} value={a.agen_id}>
                                    {a.agen_nama}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1 text-slate-500">NO. SP</label>
                        <input
                            type="text"
                            placeholder="Cari No. SP..."
                            value={filterParams.no_sp}
                            onChange={e => setFilterParams({ ...filterParams, no_sp: e.target.value.toUpperCase() })}
                            onKeyDown={e => e.key === 'Enter' && fetchSPList()}
                            className="w-full p-2.5 border border-slate-300 rounded-xl font-mono uppercase"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-slate-500">NO. BTT / RESI</label>
                        <input
                            type="text"
                            placeholder="Cari No. BTT..."
                            value={filterParams.no_btt}
                            onChange={e => setFilterParams({ ...filterParams, no_btt: e.target.value.toUpperCase() })}
                            onKeyDown={e => e.key === 'Enter' && fetchSPList()}
                            className="w-full p-2.5 border border-slate-300 rounded-xl font-mono uppercase"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-slate-500">STATUS TRANSIT</label>
                        <select
                            value={filterParams.transit}
                            onChange={e => setFilterParams({ ...filterParams, transit: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                        >
                            <option value="">-- SEMUA --</option>
                            <option value="Y">TRANSIT</option>
                            <option value="N">LANGSUNG</option>
                        </select>
                    </div>
                </div>

                {/* Toolbar Tombol Persis Fungsi ASP Lawas */}
                <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
                    <button type="button" onClick={fetchSPList} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 uppercase cursor-pointer shadow-xs">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> REFRESH
                    </button>
                    <button type="button" onClick={handleOpenFromLoading} className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl flex items-center gap-1.5 uppercase cursor-pointer shadow-xs">
                        <PackageCheck size={15} /> TAMBAH SP DARI PROSES LOADING
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setManifestData([]);
                            setIsCreateModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 uppercase cursor-pointer shadow-xs"
                    >
                        <Plus size={15} /> TAMBAH SP LANGSUNG DARI BTT
                    </button>
                </div>
            </div>

            {/* TABEL HASIL DATA SURAT PENGIRIMAN */}
            <DataTableTemplate
                title="HASIL DATA SURAT PENGIRIMAN"
                columns={columns}
                data={spList}
                loading={loading}
                isDarkMode={false}
                onAdd={() => {
                    setManifestData([]);
                    setIsCreateModalOpen(true);
                }}
            />

            {/* MODAL 1: PEMBUATAN SURAT PENGANTAR BARU (opr_t_sp_terima_a_BTT.asp / opr_t_sp_terima_f.asp) */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
                        <div className="px-6 py-4 bg-indigo-900 text-white flex justify-between items-center">
                            <h3 className="font-black text-sm uppercase flex items-center gap-2">
                                <Truck size={18} /> PEMBUATAN SURAT PENGANTAR PENGIRIMAN BARU
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full cursor-pointer">
                                <XIcon size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs font-bold text-slate-700 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block mb-1 text-slate-500">CABANG ASAL</label>
                                    <input type="text" readOnly value={currentActiveAgen} className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600">TUJUAN PENGIRIMAN *</label>
                                    <select value={formData.spt_tujuan_agen_nama} onChange={e => setFormData({ ...formData, spt_tujuan_agen_nama: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl bg-white">
                                        <option value="">-- PILIH CABANG TUJUAN --</option>
                                        {agens.map((a, idx) => (
                                            <option key={idx} value={a.agen_nama}>{a.agen_nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600">STATUS TRANSIT & LAYANAN</label>
                                    <div className="flex items-center gap-4 pt-2">
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input type="radio" checked={formData.spt_transityn === 'N'} onChange={() => setFormData({ ...formData, spt_transityn: 'N' })} /> LANGSUNG
                                        </label>
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input type="radio" checked={formData.spt_transityn === 'Y'} onChange={() => setFormData({ ...formData, spt_transityn: 'Y' })} /> TRANSIT
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block mb-1 text-slate-600">NO. KENDARAAN *</label>
                                    <select value={formData.spt_nomobil} onChange={e => setFormData({ ...formData, spt_nomobil: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono">
                                        <option value="">-- PILIH ARMADA --</option>
                                        {fleet.map((f, idx) => (
                                            <option key={idx} value={f.kend_id || f.nopol}>{f.kend_id || f.nopol}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600">NO. SURAT TUGAS</label>
                                    <input type="text" placeholder="Opsional..." value={formData.spt_surattugas} onChange={e => setFormData({ ...formData, spt_surattugas: e.target.value.toUpperCase() })} className="w-full p-2.5 border border-slate-300 rounded-xl font-mono uppercase" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600">STATUS GAJIAN</label>
                                    <div className="flex items-center gap-3 pt-2">
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input type="radio" checked={formData.spt_boronganyn === 'N'} onChange={() => setFormData({ ...formData, spt_boronganyn: 'N' })} /> GAJIAN
                                        </label>
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input type="radio" checked={formData.spt_boronganyn === 'Y'} onChange={() => setFormData({ ...formData, spt_boronganyn: 'Y' })} /> BORONGAN
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-slate-600">SOPIR / PENGEMUDI 1 *</label>
                                    <select
                                        value={formData.spt_namasopir}
                                        onChange={e => setFormData({ ...formData, spt_namasopir: e.target.value })}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl bg-white uppercase"
                                    >
                                        <option value="">-- PILIH SOPIR 1 --</option>
                                        {formData.spt_namasopir && !drivers.some(d => String(d.kry_nama || d.supir_nama || d.nama || '').trim().toUpperCase() === formData.spt_namasopir) && (
                                            <option value={formData.spt_namasopir}>{formData.spt_namasopir}</option>
                                        )}
                                        {drivers.map((d, idx) => {
                                            const nm = String(d.kry_nama || d.supir_nama || d.nama || '').trim().toUpperCase();
                                            return <option key={idx} value={nm}>{nm}</option>;
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600">SOPIR / PENGEMUDI 2 (OPSIONAL)</label>
                                    <select
                                        value={formData.spt_namasopir2}
                                        onChange={e => setFormData({ ...formData, spt_namasopir2: e.target.value })}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl bg-white uppercase"
                                    >
                                        <option value="">-- PILIH SOPIR 2 (JIKA ADA) --</option>
                                        {formData.spt_namasopir2 && !drivers.some(d => String(d.kry_nama || d.supir_nama || d.nama || '').trim().toUpperCase() === formData.spt_namasopir2) && (
                                            <option value={formData.spt_namasopir2}>{formData.spt_namasopir2}</option>
                                        )}
                                        {drivers.map((d, idx) => {
                                            const nm = String(d.kry_nama || d.supir_nama || d.nama || '').trim().toUpperCase();
                                            return <option key={idx} value={nm}>{nm}</option>;
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* Scan Barcode BTT */}
                            {/* Scan Barcode BTT */}
                            <div className="pt-3 border-t border-slate-200 flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block mb-1 text-indigo-700 uppercase">SCAN BARCODE / INPUT NOMOR BTT :</label>
                                    <input
                                        type="text"
                                        placeholder="Scan atau ketik nomor BTT lalu tekan Enter..."
                                        value={barcodeInput}
                                        onChange={e => setBarcodeInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddBTT(e)}
                                        className="w-full p-2.5 border-2 border-indigo-300 rounded-xl font-mono uppercase"
                                    />
                                </div>
                                <button type="button" onClick={handleAddBTT} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl uppercase cursor-pointer">
                                    + TAMBAH BTT
                                </button>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-100 text-slate-700">
                                        <tr>
                                            <th className="p-2.5 w-12">NO</th>
                                            <th className="p-2.5">NO. BTT</th>
                                            <th className="p-2.5">KETERANGAN</th>
                                            <th className="p-2.5 w-20 text-center">HAPUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {manifestData.length === 0 ? (
                                            <tr><td colSpan="4" className="p-4 text-center text-slate-400">Belum ada BTT yang dimasukkan</td></tr>
                                        ) : manifestData.map((row, i) => (
                                            <tr key={i}>
                                                <td className="p-2.5 font-mono">{i + 1}</td>
                                                <td className="p-2.5 font-mono font-bold">
                                                    <button
                                                        type="button"
                                                        onClick={() => Swal.fire({
                                                            title: `Detail Resi ${row.btt_id}`,
                                                            html: `
                                                                <div class="text-left text-xs space-y-1.5 bg-slate-50 p-3 rounded-xl border">
                                                                    <div><b>No. Surat Jalan:</b> ${row.no_sj || '-'}</div>
                                                                    <div><b>Tanggal BTT:</b> ${row.tgl_btt || '-'}</div>
                                                                    <div><b>Pengirim:</b> ${row.pengirim || '-'}</div>
                                                                    <div><b>Penerima:</b> ${row.penerima || '-'}</div>
                                                                    <div><b>Alamat:</b> ${row.alamat || '-'}</div>
                                                                    <div><b>Kota Tujuan:</b> ${row.kota || '-'}</div>
                                                                    <div><b>No. Telp:</b> ${row.telp || '-'}</div>
                                                                    <div><b>Jumlah / Berat:</b> ${row.koli || 1} Koli / ${row.berat || 0} Kg</div>
                                                                </div>
                                                            `,
                                                            confirmButtonText: 'Tutup'
                                                        })}
                                                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg underline cursor-pointer transition"
                                                    >
                                                        {row.btt_id}
                                                    </button>
                                                </td>
                                                <td className="p-2.5 text-slate-500">{row.penerima ? `${row.penerima} (${row.kota})` : row.scan_time}</td>
                                                <td className="p-2.5 text-center">
                                                    <button type="button" onClick={() => setManifestData(manifestData.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 border border-slate-300 rounded-xl uppercase cursor-pointer">BATAL</button>
                                <button type="button" onClick={handleSaveSPNaik} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 uppercase cursor-pointer">
                                    <Save size={15} /> SIMPAN & TERBITKAN SP ({manifestData.length} BTT)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: EDIT SP & SCAN BARCODE TAMBAH/HAPUS BTT (opr_t_sp_terima_e.asp) */}
            {isEditModalOpen && editHeader && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
                        <div className="px-6 py-4 bg-[#004b84] text-white flex justify-between items-center">
                            <h3 className="font-black text-sm uppercase">
                                EDIT SURAT PENGANTAR PENGIRIMAN : <span className="font-mono text-amber-300">{editHeader.no_sp}</span>
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full cursor-pointer">
                                <XIcon size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditSP} className="p-6 space-y-4 text-xs font-bold text-slate-700 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block mb-1 text-slate-500">NO. SURAT PENGANTAR</label>
                                    <input type="text" readOnly value={editHeader.no_sp} className="w-full p-2.5 bg-slate-100 border rounded-xl font-mono" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600">TUJUAN PENGIRIMAN</label>
                                    <select value={editHeader.tujuan_nama} onChange={e => setEditHeader({ ...editHeader, tujuan_nama: e.target.value })} className="w-full p-2.5 border rounded-xl bg-white">
                                        <option value={editHeader.tujuan_nama}>{editHeader.tujuan_nama}</option>
                                        {agens.map((a, i) => <option key={i} value={a.agen_nama}>{a.agen_nama}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600">NO. KENDARAAN</label>
                                    <input type="text" value={editHeader.no_mobil} onChange={e => setEditHeader({ ...editHeader, no_mobil: e.target.value.toUpperCase() })} className="w-full p-2.5 border rounded-xl font-mono uppercase" />
                                </div>
                                <div>
                                    <label className="block mb-1 text-slate-600">SOPIR / PENGEMUDI</label>
                                    <input type="text" value={editHeader.nama_sopir} onChange={e => setEditHeader({ ...editHeader, nama_sopir: e.target.value.toUpperCase() })} className="w-full p-2.5 border rounded-xl uppercase" />
                                </div>
                            </div>

                            {/* Barcode Scan Barang Naik/Transit */}
                            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex gap-2 items-center">
                                <ScanBarcode size={20} className="text-indigo-700" />
                                <input
                                    type="text"
                                    placeholder="Scan Barcode BTT untuk ditambahkan ke SP ini..."
                                    value={editScanBtt}
                                    onChange={e => setEditScanBtt(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleScanAddToExistingSP(e)}
                                    className="flex-1 p-2 bg-white border border-indigo-300 rounded-lg font-mono uppercase"
                                />
                                <button type="button" onClick={handleScanAddToExistingSP} className="px-4 py-2 bg-indigo-700 text-white rounded-lg uppercase cursor-pointer">
                                    SCAN TAMBAH
                                </button>
                            </div>

                            {/* Tabel Daftar BTT di dalam SP */}
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left border-collapse text-[11px]">
                                    <thead className="bg-slate-800 text-white">
                                        <tr>
                                            <th className="p-2">NO</th>
                                            <th className="p-2">NO. BTT</th>
                                            <th className="p-2">TGL BTT</th>
                                            <th className="p-2">PENGIRIM</th>
                                            <th className="p-2">PENERIMA</th>
                                            <th className="p-2">KOTA</th>
                                            <th className="p-2 text-right">JML</th>
                                            <th className="p-2 text-right">BERAT</th>
                                            <th className="p-2 text-center">HAPUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {editDetails.map((b, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-2 font-mono">{idx + 1}</td>
                                                <td className="p-2 font-mono font-bold text-blue-700">{b.btt_id}</td>
                                                <td className="p-2 font-mono">{b.tgl_btt}</td>
                                                <td className="p-2">{b.pengirim}</td>
                                                <td className="p-2">{b.penerima}</td>
                                                <td className="p-2">{b.kota}</td>
                                                <td className="p-2 text-right font-mono">{b.jumlah}</td>
                                                <td className="p-2 text-right font-mono">{b.berat}</td>
                                                <td className="p-2 text-center">
                                                    {!b.sudah_turun ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedRemoveBtts.includes(b.btt_id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedRemoveBtts([...selectedRemoveBtts, b.btt_id]);
                                                                else setSelectedRemoveBtts(selectedRemoveBtts.filter(id => id !== b.btt_id));
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] text-emerald-600 font-bold">TURUN</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <span className="text-slate-600">Total BTT Terdaftar: <b>{editDetails.length}</b></span>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => handlePrintSingleSP(editHeader)} className="px-4 py-2.5 bg-sky-600 text-white rounded-xl uppercase cursor-pointer">
                                        CETAK SURAT PENGIRIMAN
                                    </button>
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 border border-slate-300 rounded-xl uppercase cursor-pointer">
                                        KELUAR
                                    </button>
                                    <button type="submit" className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl uppercase cursor-pointer">
                                        SIMPAN PERUBAHAN
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuratPengantarPengiriman;