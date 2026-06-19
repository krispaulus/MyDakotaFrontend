import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { MapPin, Building2, ShieldCheck, Edit, Trash2 } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';

const MasterAgen = () => {
    const { isDarkMode } = useDarkMode();
    const [agens, setAgens] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- State untuk Modal (Tambah/Edit) ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    useEffect(() => {
        fetchAgens();
    }, []);

    const fetchAgens = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:8080/api/agens', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAgens(res.data.data);
        } catch (err) {
            console.error("Gagal load agen:", err);
            Swal.fire('Error', 'Gagal mengambil data agen', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Definisi Kolom untuk Template ---
    const columns = [
        { 
            header: 'Kode', 
            accessor: 'agen_kode',
            render: (item) => <span className="font-mono font-bold text-blue-600">{item.agen_kode}</span>
        },
        { 
            header: 'Nama Agen', 
            render: (item) => (
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-blue-50'}`}>
                        <Building2 className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="font-semibold">{item.agen_nama}</span>
                </div>
            )
        },
        { 
            header: 'Wilayah / Kota', 
            render: (item) => (
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-400" />
                    <span>{item.agen_kota}</span>
                </div>
            )
        },
        { 
            header: 'Status', 
            render: (item) => (
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    item.agen_aktifyn === 'Y' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                    {item.agen_aktifyn === 'Y' ? 'Aktif' : 'Non-Aktif'}
                </span>
            )
        }
    ];

    // --- Action Handlers ---
    const handleAdd = () => {
        setEditData(null);
        setIsModalOpen(true);
        // Nanti panggil Modal Add di sini
    };

    const handleEdit = (item) => {
        setEditData(item);
        setIsModalOpen(true);
        // Nanti panggil Modal Edit di sini
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: `Hapus ${item.agen_nama}?`,
            text: "Data tidak bisa dikembalikan!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Hapus!'
        }).then((result) => {
            if (result.isConfirmed) {
                // Logika Delete API di sini
                Swal.fire('Deleted!', 'Agen berhasil dihapus.', 'success');
            }
        });
    };

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
            <DataTableTemplate 
                title="Master Agen"
                columns={columns}
                data={agens}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {/* Modal Tambah/Edit akan kita letakkan di bawah sini nanti */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className={`p-6 rounded-xl shadow-2xl w-96 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                        <h3 className="text-lg font-bold mb-4">{editData ? 'Edit Agen' : 'Tambah Agen Baru'}</h3>
                        <p className="text-sm text-gray-500 mb-4 text-italic">Form input sedang kita siapkan...</p>
                        <button onClick={() => setIsModalOpen(false)} className="w-full bg-blue-600 text-white py-2 rounded-lg">Tutup</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterAgen;