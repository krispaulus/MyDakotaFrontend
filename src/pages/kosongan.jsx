import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../../context/DarkModeContext';

const MasterTarifEkonomis = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchTarif = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Kita tarik 200-500 data saja biar pagination template kamu tetap enak dipakai
            const res = await api.get(`/tarif/ekonomis`, {
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