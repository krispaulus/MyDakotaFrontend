import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { Plus, Filter, Search, Copy, MapPin, Building2, ShieldCheck, Edit, Trash2, Eye, EyeOff, RotateCcw, RefreshCw } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import Swal from 'sweetalert2';
import { MENU_LIST } from '../constants/menuList';

const columns = [
  {
    header: 'Photo',
    render: (user) => {
      const rawPath = user.profileimage || user.profile_image || "";
      const BASE_URL = window.location.origin;

      let imgSrc = "";
      if (rawPath) {
        if (rawPath.startsWith('http')) {
          imgSrc = rawPath.replace('192.168.22.25:9090', window.location.host);
        } else {
          imgSrc = `${BASE_URL}/uploads/${rawPath}`;
        }
      }

      return (
        <div className="relative w-10 h-10">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${user.realname || user.username}&background=random&color=fff`;
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
              {user.realname?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </div>
      );
    }
  },
  {
    header: 'User Info',
    render: (user) => (
      <div className="flex flex-col">
        <span className="text-[14px] font-bold leading-tight">{user.username}</span>
        <span className="text-[12px] text-gray-500">{user.email || '-'}</span>
        <span className="text-[12px] text-gray-500">{user.mobilenumber || '-'}</span>
      </div>
    )
  },
  {
    header: 'Cabang',
    render: (user) => (
      <div className="text-sm max-w-[200px] truncate">
        <span className={user.nama_cabang === "ALL CABANG" ? "font-bold text-blue-600" : ""}>
          {user.nama_cabang}
        </span>
      </div>
    )
  },
  {
    header: 'Status',
    render: (user) => (
      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${(user.aktifyn === 'Y' || user.user_aktifyn === 'Y') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
        {(user.aktifyn === 'Y' || user.user_aktifyn === 'Y') ? 'Active' : 'InActive'}
      </span>
    )
  }
];

const UserManagement = () => {
  const { isDarkMode } = useDarkMode();

  // --- STATE MANAGEMENT ---
  const [users, setUsers] = useState([]);
  const [agens, setAgens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // 🌟 State Toggle Filter Buka/Tutup
  const [showFilter, setShowFilter] = useState(false);

  const [allAgens, setAllAgens] = useState([]);
  const [usernameError, setUsernameError] = useState("");

  const [searchEditCabang, setSearchEditCabang] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [originalUser, setOriginalUser] = useState(null);

  // Filter States
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

  // Role Access Modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoleUser, setSelectedRoleUser] = useState(null);
  const [rolePermissions, setRolePermissions] = useState({});

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [addUser, setAddUser] = useState({
    username: '',
    realname: '',
    mobilenumber: '',
    email: '',
    aktifyn: 'Y',
    gender: '',
    allcabang: 'N',
    userType: '',
    kode_cabang: [],
    profileimage: 'https://via.placeholder.com/150'
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchCabang, setSearchCabang] = useState("");

  const handleOpenRoleAccess = async (user) => {
    setSelectedRoleUser(user);
    setRolePermissions({});

    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/users/access/${user.username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setRolePermissions(response.data);
      }
    } catch (error) {
      console.error("Gagal mengambil data akses dari DB:", error);
    }

    setShowRoleModal(true);
  };

  const handleCheckboxChange = (menuId, accessType) => {
    setRolePermissions((prev) => {
      const newState = { ...prev };

      const updateRecursive = (menuList, targetId, status, isForceChild = false) => {
        for (const item of menuList) {
          if (item.id === targetId || isForceChild) {
            newState[item.id] = {
              ...(newState[item.id] || { view: false, create: false, edit: false, delete: false }),
              [accessType]: status
            };

            if (status && ['create', 'edit', 'delete'].includes(accessType)) {
              newState[item.id].view = true;
            }

            if (item.subMenus) {
              updateRecursive(item.subMenus, targetId, status, true);
            }

            if (!isForceChild) return true;
          }

          if (item.subMenus && !isForceChild) {
            if (updateRecursive(item.subMenus, targetId, status, false)) return true;
          }
        }
        return false;
      };

      const currentStatus = !!prev[menuId]?.[accessType];
      const nextStatus = !currentStatus;

      updateRecursive(MENU_LIST, menuId, nextStatus);

      return newState;
    });
  };

  const handleSaveRoleAccess = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const payload = {
        username: selectedRoleUser.username,
        permissions: rolePermissions
      };

      const response = await api.post('/users/update-access', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200 || response.status === 201) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Hak akses telah diperbarui di Database.',
          timer: 1500,
          showConfirmButton: false
        });
        setShowRoleModal(false);
        await fetchUsers();
      }
    } catch (error) {
      console.error("Gagal Simpan Role:", error);
      Swal.fire('Gagal!', 'Terjadi kesalahan saat menyimpan ke server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAgens = useMemo(() => {
    return agens.filter((agen) => {
      const namaCabang = (agen.Agen_Nama || agen.agen_nama || "").toLowerCase();
      const cari = (searchCabang || "").toLowerCase();
      return namaCabang.includes(cari);
    });
  }, [agens, searchCabang]);

  useEffect(() => {
    const rawData = localStorage.getItem('master_agens');
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        const finalData = parsed.data || parsed;
        if (Array.isArray(finalData)) {
          setAllAgens(finalData);
        }
      } catch (e) {
        console.error("ERROR PARSING JSON!", e);
      }
    }
  }, []);

  useEffect(() => {
    if (addUser.allcabang === "Y" || addUser.allcabang === "Ya") {
      const allCodes = agens.map(a => a.Agen_Kode || a.agen_kode);
      if (addUser.kode_cabang?.length !== allCodes.length) {
        setAddUser(prev => ({ ...prev, kode_cabang: allCodes }));
      }
    } else {
      if (addUser.kode_cabang?.length > 0) {
        setAddUser(prev => ({ ...prev, kode_cabang: [] }));
      }
    }
  }, [addUser.allcabang, agens]);

  const isAllSelected = addUser.allcabang === "Y" || addUser.allcabang === "Ya";
  const isAllSelectedEdit = editUser?.all_cabangyn === "Y";

  useEffect(() => {
    if (editUser?.all_cabangyn === "Y") {
      const allCodes = agens.map(a => a.Agen_Kode || a.agen_kode);
      if (editUser.kode_cabang?.length !== allCodes.length) {
        setEditUser(prev => ({
          ...prev,
          kode_cabang: allCodes
        }));
      }
    }
  }, [editUser?.all_cabangyn, agens]);

  const handleDelete = (username) => {
    if (!username) return;

    Swal.fire({
      title: 'WARNING',
      text: `Apakah kamu yakin akan delete ${username} ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff0000',
      cancelButtonColor: '#ffffff',
      confirmButtonText: 'DELETE',
      cancelButtonText: 'Back',
      reverseButtons: true,
      customClass: {
        cancelButton: 'border border-gray-300 text-black',
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setLoading(true);
          const token = localStorage.getItem('token');
          const cleanUsername = username.trim();

          const response = await api.delete(`/users/${cleanUsername}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.status === 200 || response.data?.status === 'success') {
            Swal.fire({
              title: 'SUKSES !!',
              text: `Data ${cleanUsername} berhasil terhapus !`,
              icon: 'success',
              confirmButtonText: 'OK',
              confirmButtonColor: '#10b981',
            });
            await fetchUsers();
          }
        } catch (err) {
          console.error("Gagal delete user:", err);
          const errMsg = err.response?.data?.message || "Gagal menghapus data dari server";
          Swal.fire({
            title: 'Error',
            text: errMsg,
            icon: 'error',
            confirmButtonColor: '#d33'
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resAgens, resUsers] = await Promise.all([
        api.get('/agens', { headers }),
        api.get('/users', { headers })
      ]);

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

  const handleAddNew = () => {
    setAddUser({
      username: '',
      realname: '',
      mobilenumber: '',
      email: '',
      aktifyn: 'Y',
      gender: '',
      userType: '',
      allcabang: 'N',
      kode_cabang: [],
      profileimage: 'https://via.placeholder.com/150'
    });
    setNewPassword("");
    setConfirmPassword("");
    setEditUser(null);
    setShowAddModal(true);
  };

  const checkUsernameAvailability = async (username) => {
    if (!username) return;

    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/users/check/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.exists) {
        setUsernameError("Username sudah digunakan, silahkan memasukkan username yang lain.");
      } else {
        setUsernameError("");
      }
    } catch (err) {
      console.error("Gagal cek username", err);
    }
  };

  const handleEditClick = (user) => {
    const cabangRaw = user.kode_cabang || "";
    const cabangArray = Array.isArray(cabangRaw)
      ? cabangRaw
      : (cabangRaw !== "" ? cabangRaw.split(',').map(s => s.trim()) : []);

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
    setOriginalUser(userData);
    setNewPassword("");
    setConfirmPassword("");

    setIsEditModalOpen(true);
    setShowAddModal(false);
  };

  const filteredEditAgens = useMemo(() => {
    return agens.filter((agen) => {
      const nama = (agen.Agen_Nama || agen.agen_nama || "").toLowerCase();
      return nama.includes(searchEditCabang.toLowerCase());
    });
  }, [agens, searchEditCabang]);

  const handleInitialValidation = () => {
    const target = isEditModalOpen ? editUser : addUser;
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

      const origUserType = (originalUser.usertype || "").toString().trim();
      const origAktifYN = (originalUser.aktifyn || "").toString().trim();
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

    setShowConfirmModal(true);
  };

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

  const buildUserPayload = (user, pt_id = '', password = '', permissions = {}) => {
    const username = user.username || user.Username || '';
    const realname = user.realname || user.real_name || user.RealName || '';
    const mobilenumber = user.mobilenumber || user.mobileNumber || user.MobileNumber || '';
    const email = user.email || user.Email || '';
    const gender = user.genderValue || user.gender || '';
    const usertype = user.userTypeValue || user.usertype || '';
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
      kode_cabang: kodecabang,
      pt_id: finalPtId,
      permissions: permissions
    };

    if (password) {
      payload.Password = password;
      payload.Passwordjwt = password;
    }

    return payload;
  };

  const handleFinalSubmit = async () => {
    const token = localStorage.getItem('token');
    const pt_id = localStorage.getItem('pt_ID') || localStorage.getItem('selected_pt') || 'C';
    const activeData = showAddModal ? addUser : editUser;
    const password = newPassword.trim() !== '' ? newPassword : '';

    const payload = buildUserPayload(activeData, pt_id, password, rolePermissions);

    try {
      setLoading(true);
      const url = showAddModal ? '/users/add' : '/users/update';
      const method = showAddModal ? 'post' : 'put';

      const response = await api[method](url, payload, {
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
      const errMsg = error.response?.data?.message || error.message || "Terjadi kesalahan pada server";
      Swal.fire({
        title: 'ERROR',
        text: "❌ Gagal: " + errMsg,
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
    const payload = buildUserPayload(activeData, pt_id, password, rolePermissions);

    try {
      setLoading(true);
      const response = await api.put('/users/update', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        setShowConfirmModal(false);
        setIsEditModalOpen(false);
        setShowSuccessModal(true);
        await fetchUsers();
      }
    } catch (error) {
      Swal.fire({
        title: 'UPDATE GAGAL',
        text: error.response?.data?.message || "Koneksi ke server terputus",
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    } finally {
      setLoading(false);
    }
  };

  const normalizedUsers = useMemo(() => {
    return users.map(user => {
      const rawCabang = user.kode_cabang || "";
      const kodeArray = Array.isArray(rawCabang)
        ? rawCabang
        : rawCabang.split(',').map(s => s.trim()).filter(s => s !== "");

      const namaArray = kodeArray.map(kode => {
        const found = agens.find(a => {
          const masterKode = (a.agen_kode || a.Agen_Kode || "").toString().trim();
          return masterKode === kode.toString().trim();
        });
        return found ? (found.agen_nama || found.Agen_Nama) : kode;
      });

      let displayCabang = "-";
      if (user.all_cabangyn === 'Y' || user.allcabang === 'Y') {
        displayCabang = "ALL CABANG";
      } else if (namaArray.length > 0) {
        displayCabang = namaArray.length <= 2
          ? namaArray.join(", ")
          : `${namaArray.slice(0, 2).join(", ")} ...`;
      }

      return {
        ...user,
        username: user.username || user.Username || '',
        realname: user.realname || user.real_name || user.RealName || '',
        profileimage: user.profileimage || user.profile_image || user.profileImage || '',
        nama_cabang: displayCabang,
        aktifyn: (user.user_aktifyn === 'Y' || user.aktifyn === 'Y') ? 'Y' : 'N'
      };
    });
  }, [users, agens]);

  const filteredUsers = useMemo(() => {
    return normalizedUsers.filter(user => {
      const uName = (user.username || "").toLowerCase();
      const rName = (user.realname || "").toLowerCase();
      const uEmail = (user.email || "").toLowerCase();
      const uMobile = (user.mobilenumber || "").toLowerCase();
      const sTerm = (searchTerm || "").toLowerCase();

      const matchesSearch = searchTerm === '' ||
        uName.includes(sTerm) ||
        rName.includes(sTerm);

      const matchesUsername = filterData.username === '' ||
        uName.includes((filterData.username || "").toLowerCase());

      const matchesRealName = filterData.realname === '' ||
        rName.includes((filterData.realname || "").toLowerCase());

      const matchesMobile = !filterData.mobilenumber ||
        uMobile.includes(filterData.mobilenumber.toLowerCase());

      const matchesEmail = filterData.email === '' ||
        uEmail.includes((filterData.email || "").toLowerCase());

      const matchesCabang = filterData.cabang === '' ||
        user.kode_cabang === filterData.cabang ||
        user.nama_cabang === filterData.cabang;

      const matchesStatus = filterData.useraktif === '' ||
        user.aktifyn === filterData.useraktif;

      return matchesSearch && matchesUsername && matchesRealName && matchesMobile && matchesEmail && matchesCabang && matchesStatus;
    });
  }, [normalizedUsers, searchTerm, filterData]);

  const handleResetFilter = () => {
    setFilterData({
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
  };

  const renderMenuRows = (menus, level = 0) => {
    return menus.map((menu) => (
      <React.Fragment key={menu.id}>
        <tr className={`${level === 0 ? 'font-bold bg-indigo-50/30' :
          level === 1 ? 'font-medium bg-gray-50/50' : ''
          } hover:bg-blue-50/50 transition-colors`}>

          <td className="p-3 border" style={{ paddingLeft: `${(level * 20) + 12}px` }}>
            <div className="flex items-center gap-2">
              {level > 0 && (
                <span className="text-gray-400">└─</span>
              )}
              <span className={level === 0 ? 'text-indigo-700' : 'text-gray-700'}>
                {menu.name}
              </span>
            </div>
          </td>

          {['view', 'create', 'edit', 'delete'].map((type) => (
            <td key={type} className="p-3 border text-center">
              <input
                type="checkbox"
                className="w-4 h-4 cursor-pointer accent-indigo-600"
                checked={rolePermissions[menu.id]?.[type] || false}
                onChange={() => handleCheckboxChange(menu.id, type)}
              />
            </td>
          ))}
        </tr>

        {menu.subMenus && renderMenuRows(menu.subMenus, level + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className={`space-y-4 min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'}`}>

      {/* 🌟 PANEL FILTER BERSYARAT (TOGGLE INLINE) */}
      {showFilter && (
        <form onSubmit={(e) => { e.preventDefault(); }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
          <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
            <Filter size={16} className="text-sky-600" />
            FILTER USER MANAGEMENT
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="font-bold text-slate-500 block mb-1">USERNAME</label>
              <input
                type="text"
                placeholder="Cari username..."
                value={filterData.username}
                onChange={(e) => setFilterData({ ...filterData, username: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">REAL NAME</label>
              <input
                type="text"
                placeholder="Cari nama lengkap..."
                value={filterData.realname}
                onChange={(e) => setFilterData({ ...filterData, realname: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">MOBILE NUMBER</label>
              <input
                type="text"
                placeholder="Cari nomor handphone..."
                value={filterData.mobilenumber}
                onChange={(e) => setFilterData({ ...filterData, mobilenumber: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">EMAIL</label>
              <input
                type="text"
                placeholder="Cari alamat email..."
                value={filterData.email}
                onChange={(e) => setFilterData({ ...filterData, email: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">STATUS USER</label>
              <select
                value={filterData.useraktif}
                onChange={(e) => setFilterData({ ...filterData, useraktif: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="">-- SEMUA STATUS --</option>
                <option value="Y">AKTIF</option>
                <option value="N">NON-AKTIF</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">CABANG</label>
              <select
                value={filterData.cabang}
                onChange={(e) => setFilterData({ ...filterData, cabang: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="">-- SEMUA CABANG --</option>
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

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw size={14} /> RESET
            </button>
            <button
              type="button"
              onClick={() => fetchUsers()}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> REFRESH DATA
            </button>
          </div>
        </form>
      )}

      {/* 🌟 Template Standar DataTableTemplate dengan onFilter */}
      <DataTableTemplate
        title="USER MANAGEMENT"
        columns={columns}
        data={filteredUsers}
        loading={loading}
        isDarkMode={isDarkMode}
        onEdit={handleEditClick}
        onAdd={handleAddNew}
        onDelete={(user) => handleDelete(user.username)}
        onFilter={() => setShowFilter(prev => !prev)}
        renderExtraActions={(user) => (
          <div className="flex gap-3 items-center">
            <button
              onClick={() => handleOpenRoleAccess(user)}
              className="text-slate-400 hover:text-indigo-500 transition-all active:scale-90"
              title="Role Access"
            >
              <ShieldCheck size={18} />
            </button>
            <button
              className="text-slate-400 hover:text-emerald-500 transition-all active:scale-90"
              title="Copy User"
            >
              <Copy size={18} />
            </button>
          </div>
        )}
      />

      {/* MODAL ADD USER */}
      {showAddModal && (
        <div className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${isDarkMode ? 'bg-black/70' : 'bg-black/50'}`}>
          <div className={`w-full max-w-[1116px] rounded-[30px] shadow-2xl flex flex-col overflow-hidden border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-8 py-4 border-b ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
              <h2 className={`text-lg font-bold font-['Inter'] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ADD USER INFO</h2>
            </div>

            <div className={`p-8 grid grid-cols-2 gap-x-12 gap-y-6 overflow-y-auto max-h-[80vh] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>
                  Username
                </label>
                <input
                  type="text"
                  className={`w-full p-2 border rounded-md outline-none transition-all ${usernameError
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500'
                    } ${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black'}`}
                  value={addUser?.username || ''}
                  onChange={(e) => setAddUser({ ...addUser, username: e.target.value })}
                  onBlur={(e) => checkUsernameAvailability(e.target.value)}
                  placeholder="Masukkan username..."
                />
                {usernameError && (
                  <p className="text-red-500 text-xs mt-1 font-bold">{usernameError}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Real Name</label>
                <input
                  type="text"
                  value={addUser?.realname || ''}
                  onChange={(e) => setAddUser({ ...addUser, realname: e.target.value })}
                  className={`w-full h-12 px-4 rounded-lg focus:ring-2 focus:ring-violet-950 outline-none transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                />
              </div>

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
                  className="absolute right-3 top-[32px] text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

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
                  className="absolute right-3 top-[32px] text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Password tidak cocok!</p>
                )}
              </div>

              <div className="space-y-2 relative">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Mobile Number</label>
                <input
                  type="text"
                  value={addUser?.mobilenumber || ''}
                  onChange={(e) => setAddUser({ ...addUser, mobilenumber: e.target.value })}
                  className={`w-full h-12 px-4 rounded-lg outline-none transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Email</label>
                <input
                  type="email"
                  value={addUser?.email || ''}
                  onChange={(e) => setAddUser({ ...addUser, email: e.target.value })}
                  className={`w-full h-12 px-4 rounded-lg outline-none transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>User Aktif</label>
                <select
                  value={addUser?.aktifyn || 'N'}
                  onChange={(e) => setAddUser({ ...addUser, aktifyn: e.target.value })}
                  className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                >
                  <option value="Y">Aktif</option>
                  <option value="N">Non-Aktif</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Gender</label>
                <select
                  value={addUser?.gender || ''}
                  onFocus={() => setIsOpen(false)}
                  onChange={(e) => setAddUser({ ...addUser, gender: e.target.value })}
                  className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                >
                  <option value="">Select option</option>
                  <option value="1">Laki-laki</option>
                  <option value="2">Perempuan</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>All Cabang</label>
                <select
                  value={addUser?.allcabang || 'N'}
                  onFocus={() => setIsOpen(false)}
                  onChange={(e) => setAddUser({ ...addUser, allcabang: e.target.value })}
                  className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                >
                  <option value="Y">Ya (Semua Cabang)</option>
                  <option value="N">Tidak (Hanya Cabang Tertentu)</option>
                </select>
              </div>

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

              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>
                  Cabang
                </label>

                <div className={`w-full flex justify-between items-center border rounded-md transition-all ${isAllSelected
                  ? 'bg-gray-200 border-gray-300 opacity-60'
                  : isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black cursor-pointer'
                  }`}
                  style={{
                    padding: '0.5rem',
                    minHeight: '50px',
                    pointerEvents: isAllSelected ? 'none' : 'auto'
                  }}
                  onClick={() => !isAllSelected && setIsOpen(!isOpen)}
                >
                  <span className={`truncate ${isAllSelected ? 'text-gray-500 font-bold' : ''}`}>
                    {isAllSelected
                      ? `${agens.length} Cabang Terpilih (ALL)`
                      : addUser.kode_cabang?.length > 0
                        ? `${addUser.kode_cabang.length} Cabang Terpilih`
                        : "Select Cabang"}
                  </span>
                  {!isAllSelected && (
                    <svg className={`w-4 h-4 text-gray-900 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>

                {isOpen && (
                  <div className={`mt-1 border rounded-md overflow-hidden animate-fadeIn ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}>
                    <div className={`p-2 border-b ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Cari nama cabang..."
                          className={`w-full py-1.5 px-3 text-xs rounded-md outline-none transition-all border ${isDarkMode
                            ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500'
                            : 'bg-white border-gray-300 text-black focus:border-blue-500'
                            }`}
                          value={searchCabang}
                          onChange={(e) => setSearchCabang(e.target.value)}
                        />
                      </div>
                    </div>

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

                    <div className="max-h-48 overflow-y-auto p-1">
                      {filteredAgens.map((agen) => {
                        const kode = agen.Agen_Kode || agen.agen_kode;
                        const nama = agen.Agen_Nama || agen.agen_nama;
                        const isChecked = addUser.kode_cabang?.includes(kode);

                        return (
                          <label key={kode} className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors duration-200 ${isDarkMode
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
                )}
              </div>

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

      {/* MODAL EDIT USER */}
      {isEditModalOpen && (
        <div className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${isDarkMode ? 'bg-black/70' : 'bg-black/50'}`}>
          <div className={`w-full max-w-[1116px] rounded-[30px] shadow-2xl flex flex-col overflow-hidden border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-8 py-4 border-b ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
              <h2 className={`text-lg font-bold font-['Inter'] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>EDIT USER </h2>
            </div>

            <div className={`p-8 grid grid-cols-2 gap-x-12 gap-y-6 overflow-y-auto max-h-[80vh] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Username</label>
                <input
                  type="text"
                  disabled
                  value={editUser?.username || ''}
                  className={`w-full h-12 px-4 rounded-lg outline-none cursor-not-allowed ${isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-stone-300 border-stone-300'}`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Real Name</label>
                <input
                  type="text"
                  value={editUser?.realname || ''}
                  onChange={(e) => setEditUser({ ...editUser, realname: e.target.value })}
                  className={`w-full h-12 px-4 rounded-lg focus:ring-2 focus:ring-violet-950 outline-none transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>New Password</label>
                <div className="relative">
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
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="relative mt-4">
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Verifikasi Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`w-full p-2 border rounded-md transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-black placeholder-gray-500'}`}
                    placeholder="********"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">Password tidak cocok!</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 relative">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Mobile Number</label>
                <input
                  type="text"
                  value={editUser?.mobilenumber || ''}
                  onChange={(e) => setEditUser({ ...editUser, mobilenumber: e.target.value })}
                  className={`w-full h-12 px-4 rounded-lg outline-none transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Email</label>
                <input
                  type="email"
                  value={editUser?.email || ''}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  className={`w-full h-12 px-4 rounded-lg outline-none transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>User Aktif</label>
                <select
                  value={editUser?.aktifyn || 'N'}
                  onChange={(e) => setEditUser({ ...editUser, aktifyn: e.target.value })}
                  className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                >
                  <option value="Y">Aktif</option>
                  <option value="N">Non-Aktif</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>Gender</label>
                <select
                  value={editUser?.gender !== undefined ? String(editUser.gender) : ''}
                  onChange={(e) => setEditUser({ ...editUser, gender: parseInt(e.target.value) })}
                  className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                >
                  <option value="">Select option</option>
                  <option value="1">Laki-laki</option>
                  <option value="2">Perempuan</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>All Cabang</label>
                <select
                  value={editUser?.all_cabangyn || 'N'}
                  onChange={(e) => setEditUser({ ...editUser, all_cabangyn: e.target.value })}
                  className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                >
                  <option value="Y">Ya (Semua Cabang)</option>
                  <option value="N">Tidak (Hanya Cabang Tertentu)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={`text-base font-['Poppins'] ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>User Type</label>
                <select
                  className={`w-full h-12 px-4 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-stone-300 text-black'}`}
                  value={editUser?.usertype || ''}
                  onChange={(e) => setEditUser({ ...editUser, usertype: e.target.value })}
                >
                  <option value="">Select option</option>
                  <option value="S">Super Admin</option>
                  <option value="A">Admin</option>
                  <option value="V">Supervisor</option>
                  <option value="U">User</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={`block text-sm font-medium font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Cabang
                </label>

                <div
                  className={`w-full flex justify-between items-center border rounded-md transition-all p-2 min-h-[50px] ${isAllSelectedEdit
                    ? 'bg-gray-200 border-gray-300 opacity-60 cursor-not-allowed'
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
                          className={`w-full py-1.5 px-3 text-xs rounded-md outline-none border ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
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
                            checked={editUser?.kode_cabang?.length === agens.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditUser({
                                  ...editUser,
                                  kode_cabang: agens.map(a => a.Agen_Kode || a.agen_kode)
                                });
                              } else {
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
                            <label key={kode} className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-blue-600' : 'hover:bg-blue-50'
                              } ${isChecked ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
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

      {/* MODAL KONFIRMASI */}
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
                      handleConfirmUpdate();
                    } else {
                      handleFinalSubmit();
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

      {/* MODAL SUKSES */}
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

      {/* MODAL Role Access ShieldCheck */}
      {showRoleModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm p-4">
          <div className={`w-full max-w-4xl rounded-3xl p-6 shadow-2xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Set Role Access: {selectedRoleUser?.username}</h2>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-500 hover:text-red-500 text-xl">✕</button>
            </div>

            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-sm text-left border-collapse">
                <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} sticky top-0 z-20 shadow-sm`}>
                  <tr>
                    <th className="p-4 border-b font-bold uppercase text-gray-600 bg-inherit min-w-[250px]">
                      Nama Menu
                    </th>
                    <th className="p-4 border-b font-bold uppercase text-gray-600 bg-inherit text-center w-24">
                      View
                    </th>
                    <th className="p-4 border-b font-bold uppercase text-gray-600 bg-inherit text-center w-24">
                      Create
                    </th>
                    <th className="p-4 border-b font-bold uppercase text-gray-600 bg-inherit text-center w-24">
                      Edit
                    </th>
                    <th className="p-4 border-b font-bold uppercase text-gray-600 bg-inherit text-center w-24">
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {renderMenuRows(MENU_LIST)}
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
                onClick={handleSaveRoleAccess}
                className="px-8 py-2 bg-indigo-900 text-white rounded-lg font-semibold hover:bg-indigo-800 shadow-md"
              >
                SAVE ACCESS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;