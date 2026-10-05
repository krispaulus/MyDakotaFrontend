import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../api/axios';

const SettingOperasional = () => {
    const [allowPusat, setAllowPusat] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadSetting = async () => {
        setLoading(true);
        try {
            // 🎯 Tambahkan huruf 's' -> /settings/operasional
            const res = await api.get('/settings/operasional');
            if (res.data && res.data.status === 'success') {
                setAllowPusat(Boolean(res.data.allow_pusat_create_btt));
                localStorage.setItem('allow_pusat_create_btt', res.data.allow_pusat_create_btt ? 'Y' : 'N');
            }
        } catch (err) {
            console.error('Gagal memuat setting:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSetting();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // 🎯 Tambahkan huruf 's' -> /settings/operasional
            const res = await api.post('/settings/operasional', {
                allow_pusat_create_btt: allowPusat
            });

            if (res.data && res.data.status === 'success') {
                localStorage.setItem('allow_pusat_create_btt', allowPusat ? 'Y' : 'N');
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Disimpan',
                    text: 'Pengaturan izin input BTT Pusat Dakota berhasil diubah!',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menyimpan',
                text: err.response?.data?.message || 'Terjadi kesalahan sistem'
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header Bersih dan Kontras */}
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <div className="p-2.5 bg-sky-100 text-[#004b84] rounded-xl font-bold">
                    <Settings size={22} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-[#004b84] tracking-tight">
                        PENGATURAN OPERASIONAL & ATURAN SISTEM
                    </h1>
                    <p className="text-xs text-slate-500">
                        Kelola kebijakan akses dan pembatasan operasional cabang maupun kantor pusat.
                    </p>
                </div>
            </div>

            {/* Card Opsi Setting Berlatar Putih Solid */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="font-bold text-slate-800 text-sm">
                            Izin Penerbitan BTT oleh Kantor Pusat (Holding)
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                            Jika <b>Aktif</b>, pengguna dengan lokasi aktif <b>PUSAT DAKOTA (HOLDING)</b> dapat membuat dan menerbitkan BTT baru secara langsung. Jika <b>Nonaktif</b>, sistem akan mengunci tombol tambah dan mewajibkan transaksi dilakukan melalui Agen/Cabang Operasiona.
                        </p>
                    </div>

                    {/* Switch Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={allowPusat}
                            onChange={(e) => setAllowPusat(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-[#004b84] hover:bg-[#003863] text-white font-bold rounded-xl text-xs uppercase flex items-center gap-2 shadow-xs transition cursor-pointer"
                    >
                        <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingOperasional;