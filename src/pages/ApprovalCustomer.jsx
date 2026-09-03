import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, CheckCircle2, XCircle, CreditCard, X, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

const ApprovalCustomer = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [cabangList, setCabangList] = useState([]);
    const [kotaList, setKotaList] = useState([]);
    const [loading, setLoading] = useState(false);

    // State Buka-Tutup Filter (default tertutup seperti halaman lain)
    const [showFilter, setShowFilter] = useState(false);

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

    // Filter State
    const [selectedCabang, setSelectedCabang] = useState(isHoldingUser ? '' : currentActiveAgen.id);
    const [selectedAktif, setSelectedAktif] = useState('Y');
    const [selectedApprove, setSelectedApprove] = useState('N');
    const [searchNama, setSearchNama] = useState('');

    // Sinkronisasi filter cabang untuk akun cabang daerah
    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setSelectedCabang(currentActiveAgen.id);
        }
    }, [isHoldingUser, currentActiveAgen.id, cabangList]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const [formApproval, setFormApproval] = useState({
        cust_id: '',
        cust_name: '',
        cust_alamat1: '',
        cust_kotaid: '',
        kota_name: '',
        cust_telp1: '',
        cust_contact_person: '',
        cust_approve_yn: 'Y',
        cabang_id: '1',
        counter_id: '1',
        kdbca: '01058',
        cust_kredit_yn: 'N',
        cust_kredit_limit: 0,
        cust_kredit_aktif: 0,
        cust_virtual_acc: ''
    });

    const fetchDropdownOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const [resCabang, resKota] = await Promise.all([
                api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/marketing/cities', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } }))
            ]);
            setCabangList(resCabang.data?.data || []);
            setKotaList(resKota.data?.data || []);
        } catch (err) {
            console.error('Gagal load opsi dropdown:', err);
        }
    };

    const fetchCustomerList = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            let url = `/piutang/approval-customer?pt_id=${ptId}&aktif_yn=${selectedAktif}&approve_yn=${selectedApprove}`;

            const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : selectedCabang;
            if (activeFilterCabang) url += `&agen_nama=${encodeURIComponent(activeFilterCabang)}`;
            if (searchNama) url += `&cust_name=${encodeURIComponent(searchNama)}`;

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data?.data || []);
        } catch (err) {
            console.error('Gagal load antrean approval customer:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDropdownOptions();
        fetchCustomerList();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchCustomerList();
    };

    const handleResetFilter = () => {
        setSelectedCabang(isHoldingUser ? '' : currentActiveAgen.id);
        setSelectedAktif('Y');
        setSelectedApprove('N');
        setSearchNama('');
        fetchCustomerList();
    };

    const extract3Digit = (val) => {
        const digits = String(val || '').replace(/\D/g, '');
        if (digits.length > 0) {
            return digits.slice(-3).padStart(3, '0');
        }
        return '001';
    };

    const calculateVA = (custId, cbg, ctr) => {
        const cleanCust = String(custId || '').replace(/\D/g, '');
        const ekor = cleanCust.length >= 4 ? cleanCust.slice(-4) : cleanCust.padStart(4, '0');
        const cbg3 = extract3Digit(cbg);
        const ctr3 = extract3Digit(ctr);
        return `01058${cbg3}${ctr3}${ekor}`;
    };

    const handleOpenEdit = async (item) => {
        try {
            setIsEditMode(true);
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/piutang/approval-customer/detail/${encodeURIComponent(item.cust_id)}?pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const cust = res.data?.data || item;
            const cbgCode = cust.cabang_id || cust.cust_agenid || '1';
            const ctrCode = cust.counter_id || cust.cust_agenid || '1';
            const calculatedVA = cust.cust_virtual_acc && cust.cust_virtual_acc.length === 15
                ? cust.cust_virtual_acc
                : calculateVA(cust.cust_id, cbgCode, ctrCode);

            setFormApproval({
                cust_id: cust.cust_id,
                cust_name: cust.cust_name,
                cust_alamat1: cust.cust_alamat1 || '',
                cust_kotaid: cust.cust_kotaid || '',
                kota_name: cust.kota_name || '',
                cust_telp1: cust.cust_telp1 || '',
                cust_contact_person: cust.cust_contact_person || '',
                cust_approve_yn: cust.cust_approve_yn || 'Y',
                cabang_id: cbgCode,
                counter_id: ctrCode,
                kdbca: '01058',
                cust_kredit_yn: cust.cust_kredit_yn || 'N',
                cust_kredit_limit: cust.cust_kredit_limit || 0,
                cust_kredit_aktif: cust.cust_kredit_aktif || 0,
                cust_virtual_acc: calculatedVA
            });

            setIsModalOpen(true);
        } catch (err) {
            Swal.fire({
                title: 'Error',
                text: 'Gagal mengambil detail customer.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
    };

    const handleDeleteCustomer = (item) => {
        Swal.fire({
            title: 'Nonaktifkan Customer?',
            text: `Apakah Anda yakin ingin menonaktifkan customer ${item.cust_name} (${item.cust_id})?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Nonaktifkan!',
            cancelButtonText: 'Batal',
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const ptId = localStorage.getItem('pt_id') || 'C';
                    await api.delete(`/piutang/approval-customer/${encodeURIComponent(item.cust_id)}?pt_id=${ptId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire({
                        title: 'Berhasil!',
                        text: `Customer ${item.cust_id} berhasil dinonaktifkan.`,
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });

                    fetchCustomerList();
                } catch (err) {
                    Swal.fire({
                        title: 'Gagal!',
                        text: err.response?.data?.message || 'Gagal menonaktifkan customer.',
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

    const handleCabangOrCounterChange = (newCbg, newCtr, currentCustId) => {
        const finalVA = calculateVA(currentCustId || formApproval.cust_id, newCbg, newCtr);
        setFormApproval(prev => ({
            ...prev,
            cabang_id: newCbg,
            counter_id: newCtr,
            cust_virtual_acc: finalVA
        }));
    };

    const handleSaveApproval = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            await api.post(`/piutang/approval-customer/save?pt_id=${ptId}`, formApproval, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                title: 'BERHASIL!',
                text: `Data Customer ${formApproval.cust_id} berhasil disimpan dan diperbarui.`,
                icon: 'success',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });

            setIsModalOpen(false);
            fetchCustomerList();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Gagal menyimpan approval customer.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
    };

    const columns = [
        {
            header: 'KODE CUSTOMER',
            accessor: 'cust_id',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.cust_id}</span>
        },
        {
            header: 'NAMA CUSTOMER',
            accessor: 'cust_name',
            render: (item) => <span className="font-bold text-slate-800">{item.cust_name}</span>
        },
        {
            header: 'KOTA / CABANG',
            accessor: 'kota_name',
            render: (item) => (
                <div>
                    <span className="font-semibold text-slate-700">{item.kota_name}</span>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">{item.agen_nama}</span>
                </div>
            )
        },
        {
            header: 'TELEPON / HP',
            accessor: 'cust_telp1',
            render: (item) => <span className="font-mono text-slate-600">{item.cust_telp1 || item.cust_telp2 || '-'}</span>
        },
        {
            header: 'CONTACT PERSON',
            accessor: 'cust_contact_person',
            render: (item) => <span className="text-slate-700 font-medium">{item.cust_contact_person || '-'}</span>
        },
        {
            header: 'STATUS APPROVAL',
            accessor: 'cust_approve_yn',
            render: (item) => item.cust_approve_yn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> APPROVED
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded text-[10px]">
                    <XCircle size={12} /> PENDING
                </span>
            )
        }
    ];

    const modalElement = isModalOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity" style={{ zIndex: 99999 }}>
            <div className={`w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden transition-all transform ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-base font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <CreditCard className="text-sky-600" size={20} />
                        {isEditMode ? `VERIFIKASI & APPROVAL CUSTOMER (${formApproval.cust_id})` : 'TAMBAH PENDAFTARAN CUSTOMER BARU'}
                    </h2>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveApproval} className="p-8 space-y-6 text-xs max-h-[85vh] overflow-y-auto">
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="font-bold text-slate-700 uppercase tracking-wider">DATA PROFIL CUSTOMER</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <span className="font-bold text-slate-400 block mb-1">KODE CUSTOMER :</span>
                                <span className="font-mono font-bold text-sky-700 text-sm">{formApproval.cust_id}</span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="font-bold text-slate-400 block mb-1">NAMA CUSTOMER :</span>
                                <span className="font-bold text-slate-800 text-sm">{formApproval.cust_name}</span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="font-bold text-slate-400 block mb-1">ALAMAT :</span>
                                <span className="text-slate-700 font-medium">{formApproval.cust_alamat1 || '-'}</span>
                            </div>
                            <div>
                                <span className="font-bold text-slate-400 block mb-1">KOTA :</span>
                                <span className="text-slate-800 font-bold">{formApproval.kota_name || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
                        <div className="font-bold text-slate-700 uppercase tracking-wider">PENGATURAN STATUS & VIRTUAL ACCOUNT</div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">STATUS APPROVE :</label>
                                <div className="flex items-center gap-4 pt-1">
                                    <label className="flex items-center gap-1.5 font-bold cursor-pointer text-emerald-700">
                                        <input
                                            type="radio"
                                            name="approvYN"
                                            value="Y"
                                            checked={formApproval.cust_approve_yn === 'Y'}
                                            onChange={(e) => setFormApproval({ ...formApproval, cust_approve_yn: e.target.value })}
                                            className="w-4 h-4 text-emerald-600"
                                        /> Ya (Setujui)
                                    </label>
                                    <label className="flex items-center gap-1.5 font-bold cursor-pointer text-rose-700">
                                        <input
                                            type="radio"
                                            name="approvYN"
                                            value="N"
                                            checked={formApproval.cust_approve_yn === 'N'}
                                            onChange={(e) => setFormApproval({ ...formApproval, cust_approve_yn: e.target.value })}
                                            className="w-4 h-4 text-rose-600"
                                        /> Tidak (Pending)
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">CABANG (VA) :</label>
                                <select
                                    value={formApproval.cabang_id}
                                    onChange={(e) => handleCabangOrCounterChange(e.target.value, formApproval.counter_id)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-sky-500"
                                >
                                    {cabangList.map((c, i) => (
                                        <option key={i} value={c.agen_id || c.AgenID}>{c.agen_nama || c.AgenNama} [{c.agen_id || c.AgenID}]</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">COUNTER (VA) :</label>
                                <select
                                    value={formApproval.counter_id}
                                    onChange={(e) => handleCabangOrCounterChange(formApproval.cabang_id, e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-sky-500"
                                >
                                    {cabangList.map((c, i) => (
                                        <option key={i} value={c.agen_id || c.AgenID}>{c.agen_nama || c.AgenNama} [{c.agen_id || c.AgenID}]</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-3 bg-sky-50/60 p-4 rounded-xl border border-sky-200">
                                <label className="font-bold text-sky-900 block mb-1">KODE VIRTUAL ACCOUNT BCA GENERATED :</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={formApproval.cust_virtual_acc}
                                    className="w-full px-3.5 py-2.5 border border-sky-300 rounded-lg bg-white font-mono font-black text-sky-800 text-base tracking-widest outline-none"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Struktur (15 Digit): 01058 (BCA) + {extract3Digit(formApproval.cabang_id)} (Cabang) + {extract3Digit(formApproval.counter_id)} (Counter) + {formApproval.cust_id.replace(/\D/g, '').slice(-4).padStart(4, '0')} (ID Cust)
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
                        <div className="font-bold text-slate-700 uppercase tracking-wider">FASILITAS KREDIT & PLAFON PIUTANG</div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">FASILITAS KREDIT :</label>
                                <div className="flex items-center gap-4 pt-1">
                                    <label className="flex items-center gap-1.5 font-bold cursor-pointer text-slate-700">
                                        <input
                                            type="radio"
                                            name="kreditYN"
                                            value="Y"
                                            checked={formApproval.cust_kredit_yn === 'Y'}
                                            onChange={(e) => setFormApproval({ ...formApproval, cust_kredit_yn: e.target.value })}
                                            className="w-4 h-4 text-sky-600"
                                        /> Ya (Beri Kredit)
                                    </label>
                                    <label className="flex items-center gap-1.5 font-bold cursor-pointer text-slate-700">
                                        <input
                                            type="radio"
                                            name="kreditYN"
                                            value="N"
                                            checked={formApproval.cust_kredit_yn === 'N'}
                                            onChange={(e) => setFormApproval({ ...formApproval, cust_kredit_yn: e.target.value })}
                                            className="w-4 h-4 text-sky-600"
                                        /> Tidak (Cash Only)
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">LIMIT KREDIT (RP) :</label>
                                <input
                                    type="number"
                                    disabled={formApproval.cust_kredit_yn !== 'Y'}
                                    value={formApproval.cust_kredit_limit}
                                    onChange={(e) => setFormApproval({ ...formApproval, cust_kredit_limit: parseFloat(e.target.value) || 0 })}
                                    className={`w-full px-3 py-2 border rounded-lg font-mono font-bold text-right outline-none ${formApproval.cust_kredit_yn === 'Y' ? 'bg-white text-slate-800 border-slate-300 focus:border-sky-500' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1.5">KREDIT AKTIF (RP) :</label>
                                <input
                                    type="number"
                                    disabled={formApproval.cust_kredit_yn !== 'Y'}
                                    value={formApproval.cust_kredit_aktif}
                                    onChange={(e) => setFormApproval({ ...formApproval, cust_kredit_aktif: parseFloat(e.target.value) || 0 })}
                                    className={`w-full px-3 py-2 border rounded-lg font-mono font-bold text-right outline-none ${formApproval.cust_kredit_yn === 'Y' ? 'bg-white text-slate-800 border-slate-300 focus:border-sky-500' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
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
                            SIMPAN APPROVAL
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-5">
            {/* Panel Filter (Buka/Tutup dengan animasi kondisional) */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER APPROVAL CUSTOMER
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">AGEN / CABANG</label>
                            <select
                                value={!isHoldingUser && currentActiveAgen.id ? currentActiveAgen.id : selectedCabang}
                                disabled={!isHoldingUser}
                                onChange={(e) => setSelectedCabang(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser
                                        ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                                        : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'
                                    }`}
                                title={!isHoldingUser ? 'Filter cabang terkunci sesuai lokasi login Anda' : 'Pilih cabang untuk monitoring'}
                            >
                                {isHoldingUser && (
                                    <option value="">-- SEMUA CABANG (ALL) --</option>
                                )}

                                {!isHoldingUser ? (
                                    <option value={currentActiveAgen.id}>
                                        {currentActiveAgen.nama || 'CABANG AKTIF'}
                                    </option>
                                ) : (
                                    cabangList.map((c, i) => (
                                        <option key={i} value={c.agen_nama || c.AgenNama}>{c.agen_nama || c.AgenNama}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS APPROVAL</label>
                            <select
                                value={selectedApprove}
                                onChange={(e) => setSelectedApprove(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="N">Belum Approve (Pending)</option>
                                <option value="Y">Sudah Approve (Approved)</option>
                                <option value="">-- SEMUA STATUS --</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS AKTIF</label>
                            <select
                                value={selectedAktif}
                                onChange={(e) => setSelectedAktif(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="Y">Aktif (Ya)</option>
                                <option value="N">Tidak Aktif</option>
                                <option value="">-- SEMUA --</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NAMA CUSTOMER</label>
                            <input
                                type="text"
                                placeholder="Cari nama customer..."
                                value={searchNama}
                                onChange={(e) => setSearchNama(e.target.value)}
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
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw size={14} /> REFRESH DATA
                        </button>
                    </div>
                </form>
            )}

            {/* Tabel List Antrean Approval dengan onFilter toggle */}
            <DataTableTemplate
                title="DAFTAR ANTREAN APPROVAL CUSTOMER"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                isAddDisabled={true}
                onFilter={() => setShowFilter(prev => !prev)}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteCustomer}
            />

            {modalElement && ReactDOM.createPortal(modalElement, document.body)}
        </div>
    );
};

export default ApprovalCustomer;