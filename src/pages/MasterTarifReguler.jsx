import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Plus, Filter, Search, Copy, MapPin, Building2, ShieldCheck, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from "../context/DarkModeContext";
import Swal from 'sweetalert2';
import { MENU_LIST } from '../constants/menuList';


const MasterTarifReguler = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchTarif = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/tarif/reguler`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (err) {
            console.error("Gagal tarik data reguler:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTarif(); }, []);

    const columns = [
        { header: 'Generated ID', accessor: 'generated_id' },
        { header: 'Asal Kota', accessor: 'asal_kota' },
        { header: 'Tujuan (Kec)', accessor: 'tujuan_kecamatan' },
        { 
            header: 'Min (KG)', 
            accessor: 'minimal_kg',
            render: (item) => <span className="font-bold text-indigo-600">{item.minimal_kg} KG</span>
        },
        { 
            header: 'Harga Pokok', 
            accessor: 'harga_pokok',
            render: (item) => `Rp ${item.harga_pokok.toLocaleString()}` 
        },
        { 
            header: 'Estimasi', 
            accessor: 'estimasi_hari',
            render: (item) => <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold">{item.estimasi_hari} Hari</span>
        },
    ];

    return (
        <DataTableTemplate 
            title="TARIF PAKET UMUM (REGULER)"
            columns={columns}
            data={data}
            loading={loading}
            isDarkMode={isDarkMode}
            onAdd={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
        />
    );
};

export default MasterTarifReguler;