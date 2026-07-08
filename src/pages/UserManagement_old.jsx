import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Plus, Filter, Search, Edit, Copy, ShieldCheck, Trash2 } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import Swal from 'sweetalert2';
import { Eye, EyeOff } from 'lucide-react';
import { MENU_LIST } from '../constants/menuList';


const UserManagement = () => {
  const [allAgens, setAllAgens] = useState([]);
  const [usernameError, setUsernameError] = useState("");
  const { isDarkMode } = useDarkMode();

  // --- 1. STATE MANAGEMENT (Dikelompokkan di paling atas) ---
  const [users, setUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);  
  const [searchEditCabang, setSearchEditCabang] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);   
  const [agens, setAgens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [originalUser, setOriginalUser] = useState(null);

  // --- Filter States ---
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterData, setFilterData] = useState({
    username: '',
    realname: '',
    mobilenumber: '',
    email: '',
    useraktif: '',
    gender: '',
    allcabang: '',
    usertype: '',
    cabang: ''
  });

  const handleOpenAddModal = () => {
    setAddUser({
      username: "",
      real_name: "",
      passwordjwt: "",
      kode_cabang: [], // HARUS ARRAY KOSONG
      pt_id: "A",
      // ...field lainnya
    });
    setShowAddModal(true);
  };

  // --- Role Access Modal ---
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoleUser, setSelectedRoleUser] = useState(null);

  const handleOpenRoleAccess = (user) => {
    setSelectedRoleUser(user);
    setRolePermissions({});
    setShowRoleModal(true);
  };
  const [rolePermissions, setRolePermissions] = useState({});

  const handleCheckboxChange = (menuId, accessType) => {
    setRolePermissions((prev) => ({
      ...prev,
      [menuId]: {
        ...prev[menuId],
        [accessType]: !prev[menuId]?.[accessType]
      }
    }));
  };

  // Fungsi untuk simpan data checkbox ke database (sementara log dulu biar gak error)
  const handleSaveRoleAccess = async () => {
    try {
      const payload = {
        username: selectedRoleUser?.username,
        permissions: rolePermissions
      };

      console.log("Data siap dikirim ke DB:", payload);
      
      // Nanti di sini tempat panggil API axios.post
      
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Hak akses telah diperbarui.',
        timer: 1500,
        showConfirmButton: false
      });
      
      setShowRoleModal(false);
    } catch (error) {
      console.error("Error saving role access:", error);
      Swal.fire('Gagal!', 'Terjadi kesalahan saat menyimpan.', 'error');
    }
  };

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Data States
  // const [editUser, setEditUser] = useState(null);
  const [addUser, setAddUser] = useState({
    username: '',
    realname: '',
    mobilenumber: '',
    email: '',
    aktifyn: 'Y',
    gender: '',
    kode_cabang: '',
    profileimage: 'https://via.placeholder.com/150'
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isOpen, setIsOpen] = useState(false);  
  const [searchCabang, setSearchCabang] = useState("");
  const filteredAgens = useMemo(() => {
      return agens.filter((agen) => {
        const namaCabang = (agen.Agen_Nama || agen.agen_nama || "").toLowerCase();
        const cari = (searchCabang || "").toLowerCase();
        return namaCabang.includes(cari);
      });
    }, [agens, searchCabang]);

  
    //Cabang 
useEffect(() => {
    const rawData = localStorage.getItem('master_agens');
    console.log("ISI MENTAH LOCALSTORAGE:", rawData ? "ADA" : "KOSONG");

    if (rawData) {
        try {
            const parsed = JSON.parse(rawData);
            // Paksa ambil arraynya
            const finalData = parsed.data || parsed;

            if (Array.isArray(finalData)) {
                console.log("DATA SIAP DI-SET KE STATE:", finalData.length);
                setAllAgens(finalData); // <--- PASTIKAN NAMA STATE INI BENAR
            } else {
                console.error("DATA BUKAN ARRAY!", finalData);
            }
        } catch (e) {
            console.error("ERROR PARSING JSON!", e);
        }
    }
}, []);


      useEffect(() => { 
        if (addUser.allcabang === "Y" || addUser.allcabang === "Ya") {
          const allCodes = agens.map(a => a.Agen_Kode || a.agen_kode);
          // HANYA UPDATE jika isinya belum sama (mencegah loop)
          if (addUser.kode_cabang?.length !== allCodes.length) {
            setAddUser(prev => ({ ...prev, kode_cabang: allCodes }));
          }
        } else {
          // HANYA UPDATE jika sebelumnya ada isinya
          if (addUser.kode_cabang?.length > 0) {
            setAddUser(prev => ({ ...prev, kode_cabang: [] }));
          }
        }
      }, [addUser.allcabang, agens]); // Hapus addUser dari dependency, sisakan field spesifiknya saja


      useEffect(() => {
          console.log("STATE ALLAGENS BERUBAH! Jumlah data:", allAgens.length);
          if (allAgens.length > 0) {
              console.log("Contoh data pertama:", allAgens[0]);
          }
      }, [allAgens]);

  //cabang end
  const isAllSelected = addUser.allcabang === "Y" || addUser.allcabang === "Ya";
  const isAllSelectedEdit = editUser?.all_cabangyn === "Y";

  // 2. Logic Otomatis Modal Edit 
  useEffect(() => {
    if (editUser?.all_cabangyn === "Y") {
      const allCodes = agens.map(a => a.Agen_Kode || a.agen_kode);
      
      // Sinkronkan list cabang jika belum full
      if (editUser.kode_cabang?.length !== allCodes.length) {
        setEditUser(prev => ({ 
          ...prev, 
          kode_cabang: allCodes 
        }));
      }
    }
    // Jangan lupa reset list kalau pindah ke "N" (Optional sesuai kebutuhan)
    else if (editUser?.all_cabangyn === "N" && editUser?.kode_cabang?.length === agens.length) {
        // Jika user manual ganti ke N setelah sebelumnya Y, kita kosongkan atau biarkan
        // Biasanya lebih aman dikosongkan agar user pilih ulang
    }
  }, [editUser?.all_cabangyn, agens]);


  // --- DELETE USER ---

  const handleDelete = (username) => {
    // 1. Tampilkan Pop Up Warning (Gambar 1)
    Swal.fire({
        title: 'WARNING',
        text: `apakah kamu yakin akan delete ${username} !`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff0000', // Warna merah untuk tombol DELETE
        cancelButtonColor: '#ffffff', // Warna putih
        confirmButtonText: 'DELETE',
        cancelButtonText: 'Back',
        reverseButtons: true, // Supaya Back di kiri, Delete di kanan
        customClass: {
            cancelButton: 'border border-gray-300 text-black', // Styling manual tombol Back
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // 2. Jika klik DELETE, panggil API Backend
            fetch(`http://localhost:8080/api/users/${username.trim()}`, {
                method: 'DELETE',
                headers: {
                    // Tambahkan ini supaya Backend tahu kamu admin yang sah
                    'Authorization': `Bearer ${localStorage.getItem('token')}`, 
                    'Content-Type': 'application/json'
                },
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    // 3. Tampilkan Pop Up Sukses (Gambar 2)
                    Swal.fire({
                        title: 'SUKSES !!',
                        text: `Data ${username} berhasil terhapus !`,
                        icon: 'success',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#10b981', // Warna hijau
                    });
                    
                    // Refresh data di table (panggil fungsi fetch users kamu)
                    fetchUsers(); 
                }
            })
            .catch(err => {
                Swal.fire('Error', 'Gagal menghapus data', 'error');
            });
        }
    });
};

  // --- end DELETE USER ---

  // --- 2. API / DATA FETCHING ---
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resAgens, resUsers] = await Promise.all([
        api.get('/agens', { headers }),
        api.get('/users', { headers })
      ]);

      console.log("Struktur data Agens:", resAgens.data);

      setAgens(resAgens.data?.data || resAgens.data || []);
      setUsers(resUsers.data?.data || resUsers.data || []);
    } catch (err) {
      console.error("Gagal load data awal:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Gagal ambil data user:", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // --- 3. EVENT HANDLERS ---

  // Fungsi untuk membuka modal tambah user
    const handleAddNew = () => {
      // Reset data input agar kosong saat buka modal baru
      setAddUser({
        username: '',
        real_name: '',
        mobilenumber: '',
        email: '',
        aktifyn: 'Y',
        gender: '',
        usertype: '',
        all_cabangyn: 'N',
        kode_cabang: [],
        profileimage: 'https://via.placeholder.com/150'
      });
      setNewPassword("");
      setConfirmPassword("");
      setEditUser(null);
      setShowAddModal(true);
    };

    // Fungsi untuk filter (jika kamu memanggilnya di tombol filter)
    const handleFilter = () => {
      setShowFilterModal(true);
    }; 

    const checkUsernameAvailability = async (username) => {
      if (!username) return;

      try {
        const token = localStorage.getItem('token');
        // Sesuaikan endpoint API backend kamu untuk pengecekan ini
        const res = await api.get(`/users/check/${username}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.exists) { // Asumsi backend mengembalikan { exists: true }
          setUsernameError("Username sudah digunakan, silahkan memasukkan username yang lain.");
        } else {
          setUsernameError("");
        }
      } catch (err) {
        console.error("Gagal cek username", err);
      }
    };
  
  
    const handleEditClick = (user) => {
      console.log("Status Edit sebelum set:", isEditModalOpen);
      console.log("Data User dari Database:", user);

      const cabangRaw = user.kode_cabang || "";
      const cabangArray = cabangRaw !== "" ? cabangRaw.split(',').map(s => s.trim()) : [];
      
      // Data yang akan ditampilkan dan diubah-ubah di input form
      const userData = {
        ...user,
        pt_id: user.PT_ID || user.pt_id || localStorage.getItem('pt_ID'),
        realname: user.realname || user.real_name || user.RealName,
        email: user.email || "",
        mobilenumber: user.mobilenumber || user.mobileNumber || "",
        aktifyn: user.user_aktifyn || user.aktifyn || 'N',
        gender: user.gender !== undefined ? Number(user.gender) : '',
        all_cabangyn: user.all_cabangyn || 'N',
        kode_cabang: cabangArray,
        usertype: user.usertype || user.UserType || user.user_type || ''
      };

      setEditUser(userData);
      
      // SIMPAN DATA ASLI DI SINI (Buat pembanding di isNoChange nanti)
      setOriginalUser(userData); 

      setNewPassword(""); // Reset password field saat buka edit
      setConfirmPassword(""); // Reset juga konfirmasinya biar sinkron
      
      setIsEditModalOpen(true);
      setShowAddModal(false);
    };

    //edit cabang

    useEffect(() => {
    // Pantau property allCabang milik editUser
    if (editUser?.allCabang === "Y") {
        const allCodes = agens.map(a => a.Agen_Kode || a.agen_kode);
        
        // Jika isinya belum full, kita full-kan
        if (editUser.kode_cabang?.length !== allCodes.length) {
          setEditUser(prev => ({ 
            ...prev, 
            kode_cabang: allCodes 
          }));
        }
      }
    }, [editUser?.allCabang, agens]);


  {/* Filter untuk modal edit */}
  const filteredEditAgens = useMemo(() => {
    return agens.filter((agen) => {
      const nama = (agen.Agen_Nama || agen.agen_nama || "").toLowerCase();
      return nama.includes(searchEditCabang.toLowerCase());
    });
  }, [agens, searchEditCabang]);
  //edit cabang end

  // Validasi sebelum memunculkan modal konfirmasi
  const handleInitialValidation = () => {
    console.log("Tombol Save diklik, mulai validasi...");
    const target = isEditModalOpen ? editUser : addUser;
    // 1. Ambil value dengan normalisasi
    const mobile = (target.MobileNumber || target.mobileNumber || target.mobilenumber || "").toString().trim();
    const realname = (target.realname || target.real_name || "").toString().trim();
    const email = (target.Email || target.email || "").toString().trim();
    const gender = (target.genderValue || target.gender || "").toString().trim();
    const cabang = (target.kode_cabang || target.Cabang || "").toString().trim();

    const usertype = (target.usertype || target.UserType || "").toString().trim();
    const aktifyn = (target.aktifyn || target.user_aktifyn || "").toString().trim();
    const all_cabangyn = (target.all_cabangyn || "").toString().trim();

    if (!realname) {
      showWarning("Real Name wajib diisi!");
      return;
    }

    if (!mobile) {  
      showWarning("Mobile Number wajib diisi!");
      return;
    }

    if (!isEditModalOpen && usernameError) {
      showWarning("Silahkan gunakan username lain!");
      return;
    }

    if (isEditModalOpen && originalUser) {
      const origMobile = (originalUser.MobileNumber || originalUser.mobileNumber || originalUser.mobilenumber || "").toString().trim();
      const origRealName = (originalUser.realname || originalUser.real_name || "").toString().trim();
      const origEmail = (originalUser.Email || originalUser.email || "").toString().trim();
      const origGender = (originalUser.genderValue || originalUser.gender || "").toString().trim();
      const origCabang = (originalUser.kode_cabang || originalUser.Cabang || "").toString().trim();

      const usertype = (target.usertype || "").toString().trim();
      const origUserType = (originalUser.usertype || "").toString().trim();

      const aktifyn = (target.aktifyn || "").toString().trim();
      const origAktifYN = (originalUser.aktifyn || "").toString().trim();

      const all_cabangyn = (target.all_cabangyn || "").toString().trim();
      const origAllCabangYN = (originalUser.all_cabangyn || "").toString().trim();

      const isNoChange = 
        realname === origRealName &&
        mobile === origMobile &&
        email === origEmail &&
        gender === origGender &&
        cabang === origCabang &&
        usertype === origUserType &&
        aktifyn === origAktifYN &&
        all_cabangyn === origAllCabangYN &&
        !newPassword;

      if (isNoChange) {
        console.log("Sistem mendeteksi tidak ada perubahan data sama sekali.");
        setIsEditModalOpen(false);
        return;
      }
    }

    if (!isEditModalOpen || (isEditModalOpen && newPassword.trim() !== "")) {
      if (!isEditModalOpen && !newPassword) {
        showWarning("Password wajib diisi untuk user baru!");
        return;
      }
      if (newPassword.length > 0 && newPassword.length < 6) {
        showWarning("Password minimal 6 karakter!");
        return;
      }
      if (newPassword !== confirmPassword) {
        showWarning("Konfirmasi Password tidak cocok!");
        return;
      }
    }

    console.log("Data valid, membuka modal konfirmasi...");
    setShowConfirmModal(true);
  };
  //end handleInitialValidation

  const showWarning = (msg) => {
    Swal.fire({
      title: 'WARNING',
      text: msg,
      icon: 'warning',
      confirmButtonText: 'Back',
      confirmButtonColor: '#ff2c2c',
      customClass: {
        popup: 'rounded-2xl',
        title: 'font-bold text-2xl'
      }
    });
  };


  const buildUserPayload = (user, pt_id = '', password = '') => {
      const username = user.username || user.Username || '';
      const realname = user.realname || user.real_name || user.RealName || '';
      const mobilenumber = user.mobilenumber || user.mobileNumber || user.MobileNumber || '';
      const email = user.email || user.Email || '';
      const gender = user.genderValue || user.gender || '';
      const usertype = user.userTypeValue || user.usertype || '';
      // const gender = user.gender !== undefined ? String(user.gender) : '';
      const aktifyn = user.aktifyn || 'N';
      const all_cabangyn = (user.all_cabangValue === "Ya (Semua Cabang)" || user.all_cabangyn === "Y") ? "Y" : "N";   
      const finalPtId = pt_id || user.pt_id || user.PT_ID || '';
      const kodecabang = Array.isArray(user.kode_cabang) ? user.kode_cabang : [];

      const payload = {
        Username: username,
        username: username,
        RealName: realname,
        real_name: realname,
        mobilenumber: mobilenumber,
        email: email,
        Gender: gender,
        gender: gender,
        User_aktifYN: aktifyn,
        aktifYN: aktifyn,
        all_cabangyn: all_cabangyn,      
        usertype: usertype,
        UserType: usertype,      
        kode_cabang: kodecabang, // Mengirim Array [ "JKT", "BDG" ]
        pt_id: finalPtId,
      };

      // Backend kamu mencari "Passwordjwt" untuk di-hash (Cek poin 6 di Go)
      if (password) {
        payload.Password = password;
        payload.Passwordjwt = password; 
      }

      console.log("PAYLOAD FINAL SIAP KIRIM:", payload);

      return payload;
    };

  const handleFinalSubmit = async () => {
    console.log("KLIK TOMBOL SAVE BERHASIL!");
    const token = localStorage.getItem('token');
    const pt_id = localStorage.getItem('pt_ID') || localStorage.getItem('selected_pt');
    const activeData = showAddModal ? addUser : editUser;
    const password = newPassword.trim() !== '' ? newPassword : '';

    const payload = buildUserPayload(activeData, pt_id, password);

    console.log("🚀 Payload yang dikirim ke API:", payload);

    try {
      setLoading(true);
      const url = showAddModal
        ? 'http://localhost:8080/api/users/add'
        : 'http://localhost:8080/api/users/update';
      const method = showAddModal ? 'post' : 'put';

      const response = await axios[method](url, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200 || response.status === 201) {
        setShowConfirmModal(false);
        setShowAddModal(false);
        setIsEditModalOpen(false);
        setShowSuccessModal(true);
        setNewPassword('');
        setConfirmPassword('');
        await fetchUsers();
      }
    } catch (error) {
      Swal.fire({
        title: 'ERROR',
        text: "❌ Gagal: " + (error.response?.data?.message || "Terjadi kesalahan"),
        icon: 'error',
        confirmButtonText: 'Back',
        confirmButtonColor: '#ff2c2c',
        customClass: {
          popup: 'rounded-2xl',
          title: 'font-bold text-2xl'
        }
      });
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpdate = async () => {
    const activeData = editUser; 
    const token = localStorage.getItem('token');
    const pt_id = localStorage.getItem('pt_ID') || localStorage.getItem('selected_pt');
    const password = newPassword.trim() !== '' ? newPassword : '';
    const payload = buildUserPayload(activeData, pt_id, password);
    console.log("🚀 Payload Edit yang dikirim ke Server:", payload);


    try {
        setLoading(true);
        const response = await axios.put('http://localhost:8080/api/users/update', payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 200) {
            setShowConfirmModal(false);
            setIsEditModalOpen(false); // Tutup modal edit
            setShowSuccessModal(true);
            await fetchUsers(); // Refresh tabel biar data terbaru muncul
        }
    } catch (error) {
        console.error("Gagal Update:", error);
        alert("❌ Error: " + (error.response?.data?.message || "Gagal simpan"));
    } finally {
        setLoading(false);
    }
  };

  // --- 4. DATA TRANSFORMATION & PAGINATION ---
  const normalizedUsers = useMemo(() => {
    return users.map(user => {
      const foundAgen = agens.find(a => a.Agen_Kode === user.kode_cabang);
        return {
          ...user,
          username: user.username || user.Username || '',
          realname: user.realname || user.real_name || user.RealName || '',
          // TAMBAHKAN INI: Pastikan property profileimage masuk ke objek baru
          profileimage: user.profileimage || user.profile_image || user.profileImage || '',
          nama_cabang: foundAgen ? foundAgen.Agen_Nama : (user.kode_cabang || 'Tanpa Cabang'),
          aktifyn: (user.user_aktifyn === 'Y' || user.aktifyn === 'Y') ? 'Y' : 'N'
        };
      });
  }, [users, agens]);


    // --- 5. SEARCH & PAGINATION LOGIC ---
  const lowerSearch = searchTerm.toLowerCase().trim();
  const filteredUsers = useMemo(() => {
    return normalizedUsers.filter(user => {
      // Search bar global (yang di pojok kanan atas)
      const uName = (user.username || "").toLowerCase();
      const rName = (user.realname || "").toLowerCase();
      const uEmail = (user.email || "").toLowerCase();      
      const sTerm = (searchTerm || "").toLowerCase();


      const matchesSearch = searchTerm === '' || 
        uName.includes(sTerm) || 
        rName.includes(sTerm);

      // Filter Detail dari Modal
      const matchesUsername = filterData.username === '' || 
        uName.includes((filterData.username || "").toLowerCase());
        
      const matchesRealName = filterData.realname === '' || 
        rName.includes((filterData.realname || "").toLowerCase());

      const matchesEmail = filterData.email === '' || 
        uEmail.includes((filterData.email || "").toLowerCase());

      const matchesCabang = filterData.cabang === '' || 
        user.kode_cabang === filterData.cabang ||
        user.nama_cabang === filterData.cabang;

      const matchesStatus = filterData.useraktif === '' || 
        user.aktifyn === filterData.useraktif;

      return matchesSearch && matchesUsername && matchesRealName && matchesEmail && matchesCabang && matchesStatus;
    });
  }, [normalizedUsers, searchTerm, filterData]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  const displayedCount = Math.min(startIndex + itemsPerPage, filteredUsers.length);

  return (
    <div className={`p-8 min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>
      {/* Tombol Add New & Filter */}
      <div className="mb-6 flex gap-4">
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
        >
          <Plus size={20} /> Add New
        </button>
        <button 
          onClick={handleFilter}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
        >
          <Filter size={20} /> Filter
        </button>
      </div>

      <div className={`rounded-2xl shadow-sm border overflow-hidden transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        {/* Header Tabel */}
        <div className="p-6 flex justify-between items-center">
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>USER MANAGEMENT</h2>
          <div className="relative w-80">
            <input 
              type="text"
              placeholder="Cari username..."
              className={`w-full pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-black placeholder-gray-600'}`}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className={`absolute right-3 top-2.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className={`text-sm uppercase font-semibold transition-colors ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-slate-600'}`}>
              <tr>
                <th className="px-6 py-4">Photo</th>
                <th className="px-6 py-4">User Info</th>
                <th className="px-6 py-4">Cabang</th>
                <th className="px-6 py-4 w-[150px]">All Cabang</th>
                <th className="px-6 py-4">Login Terakhir</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-gray-700' : 'divide-gray-50'}`}>
              {loading ? (
                <tr><td colSpan="6" className={`text-center py-10 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Memuat data...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="6" className={`text-center py-10 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Tidak ada data user.</td></tr>
              ) : (
                
                paginatedUsers.map((user, index) => (
                  <tr key={user.username || index} className={`border-b transition-colors ${isDarkMode ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-slate-50 border-gray-100'}`}>
                  <td className="px-6 py-4">
                    <div className="relative w-10 h-10">
                        {(user.profileimage || user.profile_image) && (user.profileimage || user.profile_image).trim() !== "" ? (
                          <img
                            src={(user.profileimage || user.profile_image).replace('localhost:8080')}
                            alt="Profile"
                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                            onError={(e) => {
                              e.target.onerror = null; 
                              e.target.src = `https://ui-avatars.com/api/?name=${user.realname || user.username}&background=random&color=fff`;
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                            {user.realname ? user.realname.charAt(0).toUpperCase() : (user.username ? user.username.charAt(0).toUpperCase() : 'U')}
                          </div>
                        )}
                      </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      {/* Username - Font 14 */}
                      <span className={`text-[14px] font-bold leading-tight ${isDarkMode ? 'text-gray-100' : 'text-slate-800'}`}>{user.username || '-'}</span>
                      {/* Email - Font 10 */}
                      <span className={`text-[12px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{user.email || '-'}</span>
                      {/* Mobile Number - Font 10 */}
                      <span className={`text-[12px] ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{user.mobilenumber || '-'}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-[300px]" title={user.kode_cabang}>
                      {/* LOGIKA JEDER: Cek dulu apakah dia All Cabang atau bukan */}
                      {user.all_cabangyn === 'Y' ? (
                        <span className="font-bold text-blue-600">ALL CABANG</span>
                      ) : (
                      (() => {
                              const rawCabang = user.kode_cabang || "";
                              const kodeArray = rawCabang.split(',').map(s => s.trim()).filter(s => s !== "");

                              if (kodeArray.length === 0) return "-";

                              // MAPPING PAKAI STATE allAgens
                              const namaArray = kodeArray.map(kode => {
                                // Gunakan == agar string "571" bisa ketemu dengan angka 571
                                const found = allAgens.find(a => {
                                    const masterKode = (a.agen_kode || a.Agen_Kode || a.Kode || "").toString().trim();
                                        return masterKode === kode.toString().trim();
                                  }); 
                                  console.log("Daftar Semua Agen:", allAgens);
                                  console.log("Kode yang dicari:", kodeArray);    
                                return found ? (found.agen_nama || found.Agen_Nama || found.Nama) : kode;
                              });

                              if (namaArray.length <= 2) {
                                return namaArray.join(", ");
                              }
                              return `${namaArray.slice(0, 2).join(", ")} ...`;
                            })()
                          )}
                    </div>
                  </td>
                  
                  {/* ALL CABANG (CENTERED) */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center w-full">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold transition-all ${
                        user.allcabang === 'Y' 
                          ? 'bg-green-50 text-green-600 border-green-200' 
                          : 'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.allcabang === 'Y' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {user.allcabang === 'Y' ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      {/* Baris Atas: Tanggal Login (Font 14) */}
                      <span className={`text-[14px] font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        {user.lastlogin}
                      </span>

                      {/* Baris Bawah: IP Address (Font 12) */}
                      <span className={`text-[12px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user.lastiplogin || "0.0.0.0"}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      user.user_aktifyn === 'Y' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {user.user_aktifyn === 'Y' ? 'Active' : 'InActive'}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      {/* <button className="text-slate-400 hover:text-blue-600" onClick={() => handleEditClick(user)}><Edit size={18} /></button> */}
                      <button className="text-slate-400 hover:text-blue-600" onClick={() => {
                            handleEditClick(user);
                            console.log("Data User dari Database:", user);
                          }}
                        ><Edit size={18} /></button>
                      <button className="text-slate-400 hover:text-blue-600" onClick={() => handleOpenRoleAccess(user)}><ShieldCheck size={18} /></button>
                      <button className="text-slate-400 hover:text-blue-600"><Copy size={18} /></button>
                      <button className="text-slate-400 hover:text-blue-600"><Trash2 className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer" onClick={() => handleDelete(user.username)} size={18} /></button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

        {/* 2. BAGIAN MODAL (Taruh di luar loop, sejajar dengan Tabel) */}


        {/* --- MODAL EDIT (POP UP) --- */}
                            
        {isEditModalOpen && (
          <div className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${isDarkMode ? 'bg-black/70' : 'bg-black/50'}`}>
              {/* Container Utama Modal */}
              <div className={`w-full max-w-[1116px] rounded-[30px] shadow-2xl flex flex-col overflow-hidden border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                
                {/* Header */}
                <div className={`px-8 py-4 border-b ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
                  <h2 className={`text-lg font-bold font-['Inter'] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>EDIT USER </h2>
                </div>

                {/* Body - Grid 2 Kolom */}
                <div className={`p-8 grid grid-cols-2 gap-x-12 gap-y-6 overflow-y-auto max-h-[80vh] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  
                  {/* Username (Read Only) */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Username</label>
                    <input 
                      type="text" 
                      disabled 
                      value={editUser?.username || ''} 
                      className={`w-full h-12 px-4 rounded-lg outline-none cursor-not-allowed ${isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-stone-300 border-stone-300'}`}
                    />
                  </div>

                  {/* Real Name */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Real Name</label>
                    <input 
                      type="text" 
                      value={editUser?.realname || ''}
                      onChange={(e) => setEditUser({...editUser, realname: e.target.value})}
                      className={`w-full h-12 px-4 rounded-lg focus:ring-2 focus:ring-violet-950 outline-none transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                    />
                  </div>

                  {/* New Password */}
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>New Password</label>
                        <div className="relative"> {/* Pembungkus harus Relative */}
                            <input 
                            type={showPassword ? "text" : "password"}
                            className={`w-full p-2 border rounded-md transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-black placeholder-gray-500'}`}
                            placeholder="********"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {showPassword ? (
                                <EyeOff size={20} /> // Icon mata coret
                              ) : (
                                <Eye size={20} />    // Icon mata terbuka
                              )}
                            </button>
                          </div>
                      </div>

                  {/* Verifikasi Password */}
                      <div className="relative mt-4">
                          <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Verifikasi Password</label>
                            <div className="relative"> {/* Pembungkus harus Relative */}
                              <input 
                                type={showConfirmPassword ? "text" : "password"}
                                className={`w-full p-2 border rounded-md transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-black placeholder-gray-500'}`}
                                placeholder="********"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                              />
                              {/* Notifikasi teks merah jika tidak sama saat mengetik */}
                              {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-red-500 text-xs mt-1">Password tidak cocok!</p>
                              )}

                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff size={20} /> // Icon mata coret
                                ) : (
                                  <Eye size={20} />    // Icon mata terbuka
                                )}
                              </button>
                          </div>
                      </div>

                  {/* Mobile Number */}
                  <div className="space-y-2 relative">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Mobile Number</label>
                    <input 
                      type="text" 
                      value={editUser?.mobilenumber || ''}
                      onChange={(e) => setEditUser({ ...editUser, mobilenumber: e.target.value })}
                      className={`w-full h-12 px-4 rounded-lg outline-none transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Email</label>
                    <input 
                      type="email" 
                      value={editUser?.email || ''}                                          
                      onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                      className={`w-full h-12 px-4 rounded-lg outline-none transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                    />
                  </div>

                  {/* User Aktif (Dropdown/Select) */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>User Aktif</label>
                      <select 
                        value={editUser?.aktifyn || 'N'}
                        onChange={(e) => {
                          console.log("Memilih User Aktif :", e.target.value);
                          setEditUser({...editUser, aktifyn: e.target.value})}}
                        className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                      >
                        <option value="Y" key="Y">Aktif</option>
                        <option value="N" key="N">Non-Aktif</option>
                      </select>
                  </div>

                  {/* Gender (Dropdown) */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Gender</label>
                        <select 
                          value={editUser?.gender !== undefined ? String(editUser.gender) : ''}
                          onChange={(e) => {
                            console.log("Memilih Gender:", e.target.value);
                            setEditUser({...editUser, gender: parseInt(e.target.value)})
                          }}
                          
                          className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                        >
                          <option value="" key="">
                            Select option
                          </option>
                          <option value="1" key="1">
                            Laki-laki
                          </option>
                          <option value="2" key="2">
                            Perempuan
                          </option>
                        </select>
                  </div>

                  {/* All Cabang */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>All Cabang</label>
                      <select 
                        value={editUser?.all_cabangyn || 'N'}
                        onChange={(e) => setEditUser({...editUser, all_cabangyn: e.target.value})}
                        className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                      >
                        <option value="Y" key="Y">
                          Ya (Semua Cabang)
                        </option>
                        <option value="N" key="N">
                          Tidak (Hanya Cabang Tertentu)
                        </option>
                      </select>
                  </div>

                  {/* User Type */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>User Type</label>
                      <select 
                        className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                        value={editUser?.usertype || ''}
                        onChange={(e) => {
                          console.log("Memilih User Type:", e.target.value);
                          setEditUser({ ...editUser, usertype: e.target.value })
                        }}
                      >
                        <option value="" key="">
                          Select option
                        </option>
                        <option value="S" key="S">
                          Super Admin
                        </option>
                        <option value="A" key="A">
                          Admin
                        </option>
                        <option value="V" key="V">
                          Supervisor
                        </option>                        
                        <option value="U" key="U">
                          User
                        </option>
                      </select>
                  </div>

                  {/* Cabang */}
                  {/* <div className="space-y-2">
                      <label className={`block text-sm font-medium font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Cabang</label>
                        <select
                          className={`w-full p-2 border rounded-md transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}`}
                          value={editUser?.kode_cabang ? editUser.kode_cabang.trim() : ""}
                          onChange={(e) => setEditUser({ ...editUser, kode_cabang: e.target.value })}
                        >
                          <option value="">Select Cabang</option>
                          {agens.map((agen) => (
                            <option key={agen.agen_id} value={agen.agen_nama ? agen.agen_nama.trim() : ""}>
                              {agen.agen_nama}
                            </option>
                          ))}
                        </select>
                  </div> */}

                  {/* Cabang */}
                  <div className="space-y-2">
                    <label className={`block text-sm font-medium font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Cabang
                    </label>
                    
                    <div 
                      className={`w-full flex justify-between items-center border rounded-md transition-all p-2 min-h-[50px] ${
                        isAllSelectedEdit 
                          ? 'bg-gray-200 border-gray-300 opacity-60 cursor-not-allowed' // Tampilan Terkunci
                          : isDarkMode ? 'bg-gray-700 border-gray-600 text-white cursor-pointer' : 'bg-white border-gray-300 text-black cursor-pointer'
                      }`}
                      style={{ pointerEvents: isAllSelectedEdit ? 'none' : 'auto' }}
                      onClick={() => !isAllSelectedEdit && setIsEditOpen(!isEditOpen)}
                    >
                      <span className="text-sm truncate">
                        {isAllSelectedEdit 
                          ? `${agens.length} Cabang Terpilih (ALL)` 
                          : `${editUser?.kode_cabang?.length || 0} Cabang Terpilih`}
                      </span>
                      
                      {/* Icon Panah: Hilang kalau terkunci */}
                      {!isAllSelectedEdit && (
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isEditOpen ? 'rotate-180' : ''}`} 
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>

                    {isEditOpen && !isAllSelectedEdit && (
                      <div className={`mt-1 border rounded-md overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <div className={`p-2 border-b ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Cari nama cabang..."
                              className={`w-full py-1.5 px-3 text-xs rounded-md outline-none border ${
                                isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                              }`}
                              value={searchEditCabang}
                              onChange={(e) => setSearchEditCabang(e.target.value)}
                            />
                          </div>

                          <div className="p-2 border-b border-gray-300 dark:border-gray-600">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 rounded"
                                // Cek apakah jumlah yang dipilih sama dengan total semua agen
                                checked={editUser?.kode_cabang?.length === agens.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Jika dicentang, masukkan SEMUA kode agen ke editUser
                                    setEditUser({ 
                                      ...editUser, 
                                      kode_cabang: agens.map(a => a.Agen_Kode || a.agen_kode) 
                                    });
                                  } else {
                                    // Jika dilepas, kosongkan array
                                    setEditUser({ ...editUser, kode_cabang: [] });
                                  }
                                }}
                              />
                              <span className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>
                                Select ALL Cabang (Edit Mode)
                              </span>
                            </label>
                          </div>
                          
                          <div className="max-h-48 overflow-y-auto mt-2 p-1">
                            {filteredEditAgens.map((agen) => {
                              const kode = agen.Agen_Kode || agen.agen_kode;
                              const nama = agen.Agen_Nama || agen.agen_nama;
                              const isChecked = editUser?.kode_cabang?.includes(kode);

                              return (
                                <label key={kode} className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors 
                                  ${isDarkMode ? 'hover:bg-blue-600' : 'hover:bg-blue-50'} 
                                  ${isChecked ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 rounded"
                                    checked={isChecked}
                                    onChange={() => {
                                      let updated = [...(editUser?.kode_cabang || [])];
                                      if (isChecked) {
                                        updated = updated.filter(item => item !== kode);
                                      } else {
                                        updated.push(kode);
                                      }
                                      setEditUser({ ...editUser, kode_cabang: updated });
                                    }}
                                  />
                                  <span className="text-sm font-medium uppercase">{nama}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                 
                  {/* Profile Image (Read Only / Display URL) */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Profile Image URL</label>
                        <input 
                          type="text" 
                          value={editUser?.profile_image || editUser?.profileimage || ""}
                          readOnly 
                          className={`w-full h-12 px-4 rounded-lg opacity-60 transition-colors border ${isDarkMode ? 'bg-gray-600 border-gray-600 text-gray-400' : 'bg-gray-100 border-stone-300 text-gray-600'}`}
                        />
                  </div>

                </div>

                {/* Footer / Buttons */}
                <div className={`p-8 flex justify-center gap-4 border-t ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'}`}>
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className={`w-32 h-10 border rounded-md text-xs font-['Inter'] transition-all ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-600' : 'border-slate-300 text-zinc-900 hover:bg-gray-50'}`}
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleInitialValidation}
                    className={`w-32 h-10 text-white rounded-md text-xs font-['Inter'] transition-all shadow-md ${isDarkMode ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-violet-950 hover:bg-violet-900'}`}
                  >
                    Save Change
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* --- MODAL KONFIRMASI --- */}
        {showConfirmModal && (
          <div className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60] ${isDarkMode ? 'bg-black/70' : 'bg-black/50'}`}>
            <div className={`w-[500px] rounded-[30px] overflow-hidden shadow-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`flex justify-between items-center px-6 py-4 border-b ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-200'}`}>
                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {showAddModal ? "Konfirmasi Tambah User" : "Konfirmasi Save Change"}
                </h3>
                <button onClick={() => setShowConfirmModal(false)} className={isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-black'}>✕</button>
              </div>
              <div className={`p-10 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                    {showAddModal 
                          ? "Apakah kamu yakin akan menambahkan user baru ini?" 
                          : "Apakah kamu yakin akan merubah data tersebut?"}
                </p>
                <div className="flex justify-center gap-4 mt-8">
                  <button 
                    onClick={() => setShowConfirmModal(false)}
                    className={`w-32 py-2 border rounded-lg font-semibold transition-all ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={() => {
                          if (isEditModalOpen) {
                            handleConfirmUpdate(); // Panggil fungsi UPDATE jika sedang edit
                          } else {
                            handleFinalSubmit();   // Panggil fungsi ADD jika sedang tambah baru
                          }
                        }}
                    className="w-32 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 shadow-lg shadow-emerald-200"
                  >
                    YES
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL SUKSES --- */}
        {showSuccessModal && (
          <div className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[70] ${isDarkMode ? 'bg-black/70' : 'bg-black/50'}`}>
            <div className={`w-[400px] rounded-[30px] p-8 text-center shadow-2xl relative border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <button onClick={() => setShowSuccessModal(false)} className={isDarkMode ? 'absolute right-6 top-6 text-gray-400 hover:text-white' : 'absolute right-6 top-6 text-gray-400 hover:text-black'}>✕</button>
              
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              
              <h2 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>SUKSES !!</h2>
              <p className={`mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Data kamu berhasil tersimpan</p>
              
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* --- MODAL Filter --- */}
        {showFilterModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-20">
            <div className={`w-full max-w-4xl rounded-3xl p-6 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
              <h2 className="mb-6 text-xl font-bold">Filter</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Username & Real Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">Username</label>
                  <input 
                    type="text"
                    className={`w-full p-2 border rounded-lg outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-transparent border-gray-600 text-white focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-black focus:border-blue-600'
                        }`}
                    value={filterData.username}
                    onChange={(e) => setFilterData({...filterData, username: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Real Name</label>
                  <input 
                    type="text"
                    className={`w-full p-2 border rounded-lg outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-transparent border-gray-600 text-white focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-black focus:border-blue-600'
                        }`}
                    value={filterData.realname}
                    onChange={(e) => setFilterData({...filterData, realname: e.target.value})}
                  />
                </div>

                {/* Mobile & Email */}
                <div>
                  <label className="block text-sm font-medium mb-1">Mobile Number</label>
                  <input 
                    type="text"
                    className={`w-full p-2 border rounded-lg outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-transparent border-gray-600 text-white focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-black focus:border-blue-600'
                        }`}
                    value={filterData.mobileNumber}
                    onChange={(e) => setFilterData({...filterData, mobileNumber: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input 
                    type="text"
                    className={`w-full p-2 border rounded-lg outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-transparent border-gray-600 text-white focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-black focus:border-blue-600'
                        }`}
                    value={filterData.email}
                    onChange={(e) => setFilterData({...filterData, email: e.target.value})}
                  />
                </div>

                {/* Status Aktif */}
                <div>
                  <label className="block text-sm font-medium mb-1">User Aktif</label>
                  <select 
                    className={`w-full p-2 border rounded-lg outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-transparent border-gray-600 text-white focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-black focus:border-blue-600'
                        }`}
                    value={filterData.userAktif}
                    onChange={(e) => setFilterData({...filterData, userAktif: e.target.value})}
                  >
                    <option value="">Select option</option>
                    <option value="Y">Aktif</option>
                    <option value="N">Tidak Aktif</option>
                  </select>
                </div>

                {/* Cabang */}
                <div>
                  <label className="block text-sm font-medium mb-1">Cabang</label>
                  <select 
                    className={`w-full p-2 border rounded-lg outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-transparent border-gray-600 text-white focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-black focus:border-blue-600'
                        }`}
                    value={filterData.cabang}
                    onChange={(e) => {
                              console.log("Cabang yang dipilih:", e.target.value);
                              setFilterData({ ...filterData, cabang: e.target.value });
                            }}
                  >
                    <option value="">Select option</option>
                        {agens.map((agen, index) => (
                          <option 
                              key={agen.Agen_Kode || agen.agen_kode || index} 
                              value={agen.Agen_Kode || agen.agen_kode}
                            >
                              {agen.Agen_Nama || agen.agen_nama}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-center gap-4">
                <button 
                  onClick={() => setShowFilterModal(false)}
                  className="px-8 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  CANCEL
                </button>
                <button 
                  onClick={() => setShowFilterModal(false)} // Filter otomatis jalan karena useMemo
                  className="px-8 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800"
                >
                  Filter
                </button>
                <button 
                  onClick={() => setFilterData({username:'', realname:'', mobilenumber:'', email:'', useraktif:'', gender:'', allcabang:'', usertype:'', cabang:''})}
                  className="px-8 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all shadow-md"
                >
                  Reset Filter
                </button>
              </div>
            </div>
          </div>
        )}  


        {/* MODAL ADD USER START */}
        {showAddModal && (
          <div className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${isDarkMode ? 'bg-black/70' : 'bg-black/50'}`}>
              {/* Container Utama Modal */}
              <div className={`w-full max-w-[1116px] rounded-[30px] shadow-2xl flex flex-col overflow-hidden border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                
                {/* Header */}
                <div className={`px-8 py-4 border-b ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
                  <h2 className={`text-lg font-bold font-['Inter'] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ADD USER INFO</h2>
                </div>

                {/* Body - Grid 2 Kolom */}
                <div className={`p-8 grid grid-cols-2 gap-x-12 gap-y-6 overflow-y-auto max-h-[80vh] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  
                  {/* Username */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>
                      Username
                    </label>
                    <input 
                      type="text" 
                      // TAMBAHKAN CLASSNAME DI BAWAH INI
                      className={`w-full p-2 border rounded-md outline-none transition-all ${
                        usernameError 
                          ? 'border-red-500 focus:ring-1 focus:ring-red-500' 
                          : 'border-gray-300 focus:border-blue-500'
                      } ${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black'}`}
                      value={addUser?.username || ''} 
                      onChange={(e) => setAddUser({...addUser, username: e.target.value})}
                      onBlur={(e) => checkUsernameAvailability(e.target.value)} 
                      placeholder="Masukkan username..."
                    />
                    {usernameError && (
                      <p className="text-red-500 text-xs mt-1 font-bold">{usernameError}</p>
                    )}
                  </div>

                  {/* Real Name */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Real Name</label>
                    <input 
                      type="text" 
                      value={addUser?.realname || ''}
                      onChange={(e) => setAddUser({...addUser, realname: e.target.value})}
                      className={`w-full h-12 px-4 rounded-lg focus:ring-2 focus:ring-violet-950 outline-none transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                    />
                  </div>

                  {/* New Password */}
                      <div className="relative">
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>New Password</label>
                          <input 
                          type={showPassword ? "text" : "password"}
                          className={`w-full p-2 border rounded-md transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-black placeholder-gray-500'}`}
                          placeholder="********"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-[32px] text-gray-500 hover:text-gray-700" // top disesuaikan karena ada label
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                      </div>

                  {/* Verifikasi Password */}
                      <div className="relative mt-4">
                          <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Verifikasi Password</label>
                          <input 
                            type={showConfirmPassword ? "text" : "password"}
                            className={`w-full p-2 border rounded-md transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-black placeholder-gray-500'}`}
                            placeholder="********"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-[32px] text-gray-500 hover:text-gray-700" // top disesuaikan karena ada label
                          >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                          {/* Notifikasi teks merah jika tidak sama saat mengetik */}
                          {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-red-500 text-xs mt-1">Password tidak cocok!</p>
                          )}
                      </div>

                  {/* Mobile Number */}
                  <div className="space-y-2 relative">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Mobile Number</label>
                    <input 
                      type="text" 
                      value={addUser?.MobileNumber || ''}
                      onChange={(e) => setAddUser({ ...addUser, MobileNumber: e.target.value })}
                      className={`w-full h-12 px-4 rounded-lg outline-none transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Email</label>
                    <input 
                      type="email" 
                      value={addUser?.Email || ''}                                          
                      onChange={(e) => setAddUser({ ...addUser, Email: e.target.value })}
                      className={`w-full h-12 px-4 rounded-lg outline-none transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                    />
                  </div>

                  {/* User Aktif (Dropdown/Select) */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>User Aktif</label>
                      <select 
                        value={addUser?.aktifYN || 'N'}
                        onChange={(e) => setAddUser({...addUser, aktifYN: e.target.value})}
                        className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                      >
                        <option value="Y">Aktif</option>
                        <option value="N">Non-Aktif</option>
                      </select>
                  </div>

                  {/* Gender (Dropdown) */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Gender</label>
                        <select 
                          value={addUser?.gender || ''}
                          onFocus={() => setIsOpen(false)}
                          onChange={(e) => setAddUser({...addUser, gender: e.target.value})}
                          className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                        >
                          <option value="">Select option</option>
                          <option value="1">Laki-laki</option>
                          <option value="2">Perempuan</option>
                        </select>
                  </div>

                  {/* All Cabang */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>All Cabang</label>
                      <select 
                        value={addUser?.allcabang || 'N'}
                        onFocus={() => setIsOpen(false)}
                        onChange={(e) => setAddUser({...addUser, allcabang: e.target.value})}
                        className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                      >
                        <option value="Y">Ya (Semua Cabang)</option>
                        <option value="N">Tidak (Hanya Cabang Tertentu)</option>
                      </select>
                  </div>

                  {/* User Type */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>User Type</label>
                      <select 
                        className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                        value={addUser?.userType || ''}
                        onFocus={() => setIsOpen(false)}
                        onChange={(e) => setAddUser({ ...addUser, userType: e.target.value })}
                      >
                        <option value="">Select option</option>
                        <option value="S">Super Admin</option>
                        <option value="A">Admin</option>
                        <option value="V">Supervisor</option>
                        <option value="U">User</option>
                      </select>
                  </div>

                  {/* Cabang */}
                  
                  <div className="space-y-2">
                      <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>
                        Cabang
                      </label>                     
                      
                      {/* TAMPILAN GAMBAR 1: Tombol pemicu */}
                      <div className={`w-full flex justify-between items-center border rounded-md transition-all ${
                          isAllSelected 
                            ? 'bg-gray-200 border-gray-300 opacity-60' // Warna abu-abu mati
                            : isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black cursor-pointer'
                            }`}
                            style={{ 
                              padding: '0.5rem', // Ini sama dengan p-2 di kodingan lama kamu
                              minHeight: '50px' ,  // Menjamin tinggi kotak sama dengan select standar
                              pointerEvents: isAllSelected ? 'none' : 'auto'
                            }}
                        //onClick={() => setIsOpen(!isOpen)} // Klik untuk toggle
                        onClick={() => !isAllSelected && setIsOpen(!isOpen)}
                      >
                        <span className={`truncate ${isAllSelected ? 'text-gray-500 font-bold' : ''}`}>
                            {isAllSelected 
                              ? `${agens.length} Cabang Terpilih (ALL)`
                              : addUser.kode_cabang?.length > 0 
                                  ? `${addUser.kode_cabang.length} Cabang Terpilih` 
                                  : "Select Cabang"}
                        </span>
                        {/* Icon Panah: Berubah arah saat terbuka */}
                        {!isAllSelected && (
                        <svg className={`w-4 h-4 text-gray-900 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                          )}
                      </div>

                      {/* TAMPILAN GAMBAR 2: Muncul saat isOpen === true */}
                      {isOpen && (
                        <>
                          <div className={`mt-1 border rounded-md overflow-hidden animate-fadeIn ${
                            isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'
                          }`}>

                          {/* KOLOM SEARCH (Versi Tipis Bro!) */}
                          <div className={`p-2 border-b ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Cari nama cabang..."
                                className={`w-full py-1.5 px-3 text-xs rounded-md outline-none transition-all border ${
                                  isDarkMode 
                                    ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500' 
                                    : 'bg-white border-gray-300 text-black focus:border-blue-500'
                                }`}
                                value={searchCabang}
                                onChange={(e) => setSearchCabang(e.target.value)}
                              />
                            </div>
                          </div>
                            
                            {/* Search atau Select All (Optional tapi membantu) */}
                            <div className="p-2 border-b border-gray-300 dark:border-gray-600">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-blue-600 rounded"
                                  checked={addUser.kode_cabang?.length === agens.length}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAddUser({ ...addUser, kode_cabang: agens.map(a => a.Agen_Kode || a.agen_kode) });
                                    } else {
                                      setAddUser({ ...addUser, kode_cabang: [] });
                                    }
                                  }}
                                />
                                <span className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Select ALL Cabang</span>
                              </label>
                            </div>                       

                            {/* List Scrollable */}
                            <div className="max-h-48 overflow-y-auto p-1">
                              {filteredAgens.map((agen) => {
                                const kode = agen.Agen_Kode || agen.agen_kode;
                                const nama = agen.Agen_Nama || agen.agen_nama;
                                const isChecked = addUser.kode_cabang?.includes(kode);

                                return (
                                  <label key={kode} className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors duration-200 
                                      ${isDarkMode 
                                        ? 'hover:bg-blue-600 hover:text-white text-gray-200' 
                                        : 'hover:bg-blue-600 hover:text-white text-gray-700'
                                      } ${isChecked ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                      >
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                      checked={isChecked}
                                      onChange={() => {
                                        let updated = [...(addUser.kode_cabang || [])];
                                        if (isChecked) {
                                          updated = updated.filter(item => item !== kode);
                                        } else {
                                          updated.push(kode);
                                        }
                                        setAddUser({ ...addUser, kode_cabang: updated });
                                      }}
                                    />
                                    <span className="text-sm font-medium uppercase whitespace-nowrap tracking-wide">{nama}</span>
                                  </label>
                                );
                              })}
                              {filteredAgens.length === 0 && (
                                <div className="p-4 text-center text-gray-500 text-xs italic">
                                  Cabang "{searchCabang}" tidak ditemukan
                                </div>
                              )}
                            </div>
                          </div>
                       </>
                      )}
                  </div>


                  {/* Profile Image (Read Only / Display URL) */}
                  <div className="space-y-2">
                    <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Profile Image URL</label>
                        <input 
                          type="text" 
                          value={addUser?.profileimage || ''} 
                          readOnly 
                          className={`w-full h-12 px-4 rounded-lg opacity-60 transition-colors border ${isDarkMode ? 'bg-gray-600 border-gray-600 text-gray-400' : 'bg-gray-100 border-stone-300 text-gray-600'}`}
                        />
                  </div>

                </div>

                {/* Footer / Buttons */}
                <div className={`p-8 flex justify-center gap-4 border-t ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'}`}>
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className={`w-32 h-10 border rounded-md text-xs font-['Inter'] transition-all ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-600' : 'border-slate-300 text-zinc-900 hover:bg-gray-50'}`}
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleInitialValidation}
                    className={`w-32 h-10 text-white rounded-md text-xs font-['Inter'] transition-all shadow-md ${isDarkMode ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-violet-950 hover:bg-violet-900'}`}
                  >
                    ADD USER
                  </button>
                </div>
              </div>
            </div>
        )}


        {/* MODAL Role Access */}
        {showRoleModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm p-4">
            <div className={`w-full max-w-4xl rounded-3xl p-6 shadow-2xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Set Role Access: {selectedRoleUser?.username}</h2>
                <button onClick={() => setShowRoleModal(false)} className="text-gray-500 hover:text-red-500 text-xl">✕</button>
              </div>

              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                    <tr>
                      <th className="p-3 border">Nama Menu</th>
                      <th className="p-3 border text-center">View</th>
                      <th className="p-3 border text-center">Create</th>
                      <th className="p-3 border text-center">Edit</th>
                      <th className="p-3 border text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Contoh baris menu - Nantinya ini di-map dari daftar menu kamu */}
                    
                      {MENU_LIST.map((menu) => (
                        <tr key={menu.id} className={isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                          <td className="p-3 border font-medium">{menu.name}</td>
                          
                          {['view', 'create', 'edit', 'delete'].map((type) => (
                            <td key={type} className="p-3 border text-center">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 cursor-pointer accent-indigo-600"
                                // Cek apakah di state nilainya true atau false
                                checked={rolePermissions[menu.id]?.[type] || false}
                                // Panggil fungsi handle saat di-klik
                                onChange={() => handleCheckboxChange(menu.id, type)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}

                    {/* Tambahkan menu lain sesuai spreadsheet */}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <button 
                  onClick={() => setShowRoleModal(false)}
                  className="px-8 py-2 border rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleSaveRoleAccess} // Tambahkan ini bro
                  className="px-8 py-2 bg-indigo-900 text-white rounded-lg font-semibold hover:bg-indigo-800 shadow-md"
                >
                  SAVE ACCESS
                </button>
              </div>
            </div>
          </div>
        )}
						

      {/* Pagination Footer */}
      <div className={`border-t p-6 rounded-b-2xl flex items-center justify-between transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        {/* Left: Entry Counter */}
        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
          Showing {filteredUsers.length === 0 ? 0 : startIndex + 1} to {displayedCount} of {filteredUsers.length} entries
        </div>
        
        {/* Center: Pagination Controls */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 border rounded-md text-sm transition-all ${isDarkMode ? 'border-gray-600 text-gray-400 hover:bg-gray-700 disabled:opacity-50' : 'border-gray-300 text-slate-600 hover:bg-gray-50 disabled:opacity-50'}`}
          >
            Prev
          </button>
          
          {(() => {
            const pages = [];
            const windowSize = 4; // Jumlah halaman yang ditampilkan
            let startPage = Math.max(1, currentPage - Math.floor(windowSize / 2));
            let endPage = Math.min(totalPages, startPage + windowSize - 1);
            
            // Sesuaikan jika di akhir
            if (endPage - startPage + 1 < windowSize) {
              startPage = Math.max(1, endPage - windowSize + 1);
            }
            
            // Render halaman dalam window
            for (let i = startPage; i <= endPage; i++) {
              pages.push(
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`px-3 py-1 border rounded-md text-sm transition ${
                    currentPage === i
                      ? (isDarkMode ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-slate-800 text-white border-slate-800')
                      : (isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-slate-600 hover:bg-gray-50')
                  }`}
                >
                  {i}
                </button>
              );
            }
            
            // Tambah ellipsis dan last page jika ada gap
            if (endPage < totalPages - 1) {
              pages.push(
                <span key="ellipsis-end" className={`px-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>...</span>
              );
              pages.push(
                <button
                  key={totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className={`px-3 py-1 border rounded-md text-sm transition ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-slate-600 hover:bg-gray-50'}`}
                >
                  {totalPages}
                </button>
              );
            }
            
            return pages;
          })()}
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 border rounded-md text-sm transition ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50' : 'border-gray-300 text-slate-600 hover:bg-gray-50 disabled:opacity-50'}`}
          >
            Next
          </button>
        </div>

        {/* Right: Go to Page */}
        <div className="flex items-center gap-2">
          <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Go to Page</label>
          <input
            type="number"
            min="1"
            max={totalPages}
            defaultValue={currentPage}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const page = Math.min(Math.max(1, parseInt(e.target.value)), totalPages);
                setCurrentPage(page);
              }
            }}
            className={`w-16 px-2 py-1 border rounded-md text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-slate-600 placeholder-gray-500'}`}
            placeholder="Go"
          />
        </div>
      </div>
      
    </div>
    
  );
};
export default UserManagement;