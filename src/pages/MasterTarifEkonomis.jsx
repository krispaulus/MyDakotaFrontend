import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Plus, Filter, Search, Copy, MapPin, Building2, ShieldCheck, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';
import { MENU_LIST } from '../constants/menuList';
import { useDarkMode } from "../context/DarkModeContext";

const MasterTarifEkonomis = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchTarif = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Kita tarik 200-500 data saja biar pagination template kamu tetap enak dipakai
            const res = await axios.get(`http://localhost:8080/api/tarif/ekonomis`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (err) {
            console.error("Gagal tarik data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTarif();
    }, []);

    // Definisi Kolom sesuai Template
    const columns = [
        { header: 'Generated ID', accessor: 'generated_id' },
        { header: 'Asal Kota', accessor: 'asal_kota' },
        { header: 'Tujuan (Kec)', accessor: 'tujuan_kecamatan' },
        { 
            header: 'Min (KG)', 
            accessor: 'minimal_kg',
            render: (item) => <span className="font-bold text-blue-600">{item.minimal_kg} KG</span>
        },
        { 
            header: 'Harga Pokok', 
            accessor: 'harga_pokok',
            render: (item) => `Rp ${item.harga_pokok.toLocaleString()}` 
        },
        { 
            header: 'Estimasi', 
            accessor: 'estimasi_hari',
            render: (item) => <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-xs font-bold">{item.estimasi_hari} Hari</span>
        },
    ];

    const handleAdd = () => console.log("Tambah Data");
    const handleEdit = (item) => console.log("Edit:", item);
    const handleDelete = (item) => console.log("Delete:", item);

    return (
        <DataTableTemplate 
            title="MASTER TARIF EKONOMIS"
            columns={columns}
            data={data}
            loading={loading}
            isDarkMode={isDarkMode}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
        />
    );
};

export default MasterTarifEkonomis;