import React, { useState, useEffect } from 'react';
import { Send, Camera } from 'lucide-react';
import axios from 'axios';
import { useDarkMode } from '../context/DarkModeContext';

function AccountPage() {
  // --- GLOBAL DARK MODE CONTEXT ---
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // --- STATE MANAGEMENT ---
  const [formData, setFormData] = useState({
    realname: '', nickname: '', mobilenumber: '', gender: 1, kode_cabang: '', email: '', profileimage: '', usertype: ''
  });
  const [originalData, setOriginalData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [passData, setPassData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  
  // State untuk Modal Status
  const [statusModal, setStatusModal] = useState({ show: false, type: 'success', message: '' });
  
  // State untuk Upload Foto
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // --- API FUNCTIONS ---
  useEffect(() => { 
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      let cabangArray = [];
      if (data.cabangs) {
          cabangArray = data.cabangs; // Asumsi backend kirim array string nama cabang
      } else if (data.kode_cabang) {
          cabangArray = data.kode_cabang.split(',').map(s => s.trim());
      }

      const mappedData = {
        realname: data.realname || '',
        nickname: data.nickname || '',
        mobilenumber: data.mobilenumber || '',
        gender: data.gender || 1,
        kode_cabang: cabangArray,
        all_cabangyn: data.all_cabangyn || 'N',
        email: data.email || '',
        profileimage: data.profileimage || '',
        usertype: data.usertype || data.UserType || data.userType || data.user_type || ''
      };
      setFormData(mappedData);
      setOriginalData(mappedData);
      setImagePreview(data.profileimage); // Set pratinjau awal dari DB
    } catch (error) {
      console.error("Gagal fetch profile:", error);
    }
  };

  const formatCabangDisplay = () => {
    const list = formData.kode_cabang;
    const isAll = formData.all_cabangyn === 'Y';

    if (isAll) return "PUSAT DAKOTA (ALL ACCESS)";
    if (!list || list.length === 0) return "Tidak ada cabang";
    
    // Jika lebih dari 3 cabang
    if (Array.isArray(list) && list.length > 3) {
      return `${list.slice(0, 3).join(", ")} ... (+${list.length - 3} lainnya)`;
    }
    
    // Jika list adalah array, join dengan koma
    return Array.isArray(list) ? list.join(", ") : list;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Gunakan FormData agar bisa kirim File
      const multipartData = new FormData();
      multipartData.append('realname', formData.realname);
      multipartData.append('nickname', formData.nickname);
      multipartData.append('mobilenumber', formData.mobilenumber);
      multipartData.append('gender', formData.gender);
      multipartData.append('kode_cabang', formData.kode_cabang);
      
      if (selectedFile) {
        multipartData.append('profileimage', selectedFile);
      }

      // Ambil PTID dari local storage untuk query string parameter Go
      const ptID = localStorage.getItem('selected_pt') || 'A';      

      const response = await axios.put(`http://localhost:8080/api/profile/update?pt_id=${ptID}`, multipartData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data' 
        }
      });


      const updatedUser = response.data.data;

      if (updatedUser && updatedUser.profileimage) {
        // 🌟 KUNCI EMAS 1: TIMPA MEMORI LOCAL STORAGE AGAR SIDEBAR & HEADER IKUT BERUBAH!
        localStorage.setItem('profile_image', updatedUser.profileimage);
      }

        setFormData({ ...formData, profileimage: updatedUser.profileimage });
        setOriginalData({ ...formData, profileimage: updatedUser.profileimage });
        setSelectedFile(null);
        setIsEditing(false);

      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("profileUpdated"));

      setStatusModal({
        show: true,
        type: 'success',
        message: 'Profile dan foto kamu berhasil tersimpan'
      });


    } catch (error) {
      console.error("Gagal update profile foto:", error);
      setStatusModal({
        show: true,
        type: 'warning',
        message: 'Gagal memperbarui profil atau foto'
      });
    } finally {
      setLoading(false);
    }

  };

  // --- HANDLERS ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'gender' ? parseInt(value) : value });
  };

  const handleCancel = () => {
    setFormData(originalData);
    setImagePreview(originalData.profileimage);
    setSelectedFile(null);
    setIsEditing(false);
    setStatusModal({ show: true, type: 'warning', message: 'Perubahan dibatalkan' });
  };

  const handleToggleDarkMode = () => {
    toggleDarkMode();
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      setStatusModal({ show: true, type: 'warning', message: 'Konfirmasi password tidak sesuai!' });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      
      // Trim whitespace dari password
      const oldPasswordTrimmed = passData.oldPassword.trim();
      const newPasswordTrimmed = passData.newPassword.trim();
      
      console.log("Sending password change request with:", {
        oldPasswordLength: oldPasswordTrimmed.length,
        newPasswordLength: newPasswordTrimmed.length
      });
      
      const response = await axios.post('http://localhost:8080/api/profile/change-password', 
        { 
          oldPassword: oldPasswordTrimmed, 
          newPassword: newPasswordTrimmed 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Success response:", response.data);
      // Success
      setStatusModal({ show: true, type: 'success', message: 'Password berhasil diperbarui!' });
      setShowPassModal(false);
      setPassData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error("=== PASSWORD CHANGE ERROR ===");
      console.error("Status:", error.response?.status);
      console.error("Full Response:", error.response?.data);
      console.error("Error Message:", error.message);
      
      let errorMessage = "Gagal ganti password";
      const errorData = error.response?.data;
      
      // Get error message dari berbagai kemungkinan format
      const errorText = (errorData?.error || errorData?.message || '').toLowerCase();
      
      // Jika error text mengandung kata "lama" atau "old", berarti old password salah
      if (errorText.includes('lama') || errorText.includes('old')) {
        errorMessage = "Password lama kamu tidak sesuai!";
      } else if (errorData?.error || errorData?.message) {
        // Jika ada error message lain, gunakan itu
        errorMessage = errorData.error || errorData.message;
      }
      
      setStatusModal({ 
        show: true, 
        type: 'warning', 
        message: errorMessage
      });
    }
  };


  const renderCabangBadges = () => {
    let list = formData.kode_cabang || [];
    const isAll = formData.all_cabangyn === 'Y';

    if (isAll) {
        return (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                PUSAT DAKOTA (ALL ACCESS)
            </span>
        );
    }

    if (typeof list === 'string') {
        list = list.split(',').map(s => s.trim());
    }

    if (!list || list.length === 0) return <span className="text-gray-400">Tidak ada cabang</span>;

        return (
            <div className="flex flex-wrap gap-2">
                {list.map((nama, index) => (
                    <span 
                        key={index}
                        className={`px-3 py-1 rounded-md text-xs font-medium border transition-all
                            ${isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-gray-200' 
                                : 'bg-white border-gray-200 text-gray-700 shadow-sm'}`}
                    >
                        {nama}
                    </span>
                ))}
            </div>
        );
    };  

  return (
    <div className={`flex justify-start items-start w-full min-h-screen p-4 pt-10 font-['Poppins'] transition-colors ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className={`w-full max-w-[1116px] min-h-[606px] p-8 rounded-[10px] shadow-sm flex flex-col items-start relative transition-colors ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        
        {/* HEADER SECTION */}
        <div className="w-full flex justify-between items-start mb-11">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <input 
                type="file" 
                id="profileImageInput"
                accept="image/*"
                onChange={handleFileChange}
                disabled={!isEditing}
                className="hidden"
              />
              <label 
                htmlFor="profileImageInput" 
                className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-md overflow-hidden ${isEditing ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
              >
                <img 
                  className="w-full h-full object-cover" 
                  src={imagePreview || "https://placehold.co/100x100"} 
                  alt="Profile" 
                />
                {isEditing && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center transition-opacity">
                    <Camera className="text-white" size={24} />
                    <span className="text-white text-[10px] font-bold">UBAH</span>
                  </div>
                )}
              </label>
            </div>
            <div className="text-left">
              <div className={`text-xl font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>{formData.nickname || 'User'}</div>
              <div className={`text-base font-normal ${isDarkMode ? 'text-gray-400' : 'opacity-50 text-black'}`}>{formData.email || 'email@dakota.com'}</div>
            </div>
          </div>

          <button onClick={() => setShowPassModal(true)} className="flex items-center gap-2 group text-indigo-600">
            <span className="text-3xl">🔐</span>
            <span className="text-xl font-semibold group-hover:underline">Change Password</span>
          </button>
        </div>

        {/* FORM SECTION */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 text-left">
          <div className="flex flex-col gap-2">
            <label className={`text-base ${isDarkMode ? 'text-gray-300' : 'opacity-80 text-black'}`}>Full Name</label>
            <input name="realname" value={formData.realname} onChange={handleChange} disabled={!isEditing} 
              className={`w-full h-12 px-4 rounded-lg border outline-none transition-all ${isEditing ? (isDarkMode ? 'bg-gray-700 border-blue-400 ring-2 ring-blue-900' : 'bg-white border-blue-200 ring-2 ring-blue-50') : (isDarkMode ? 'bg-gray-600 border-transparent opacity-70' : 'bg-stone-50 border-transparent opacity-60')} ${isDarkMode ? 'text-white' : 'text-black'}`} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={`text-base ${isDarkMode ? 'text-gray-300' : 'opacity-80 text-black'}`}>Nick Name</label>
            <input name="nickname" value={formData.nickname} onChange={handleChange} disabled={!isEditing}
              className={`w-full h-12 px-4 rounded-lg border outline-none transition-all ${isEditing ? (isDarkMode ? 'bg-gray-700 border-blue-400 ring-2 ring-blue-900' : 'bg-white border-blue-200 ring-2 ring-blue-50') : (isDarkMode ? 'bg-gray-600 border-transparent opacity-70' : 'bg-stone-50 border-transparent opacity-60')} ${isDarkMode ? 'text-white' : 'text-black'}`} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={`text-base ${isDarkMode ? 'text-gray-300' : 'opacity-80 text-black'}`}>Mobile Number</label>
            <input name="mobilenumber" value={formData.mobilenumber} onChange={handleChange} disabled={!isEditing}
              className={`w-full h-12 px-4 rounded-lg border outline-none transition-all ${isEditing ? (isDarkMode ? 'bg-gray-700 border-blue-400 ring-2 ring-blue-900' : 'bg-white border-blue-200 ring-2 ring-blue-50') : (isDarkMode ? 'bg-gray-600 border-transparent opacity-70' : 'bg-stone-50 border-transparent opacity-60')} ${isDarkMode ? 'text-white' : 'text-black'}`} />
          </div>
          <div className="flex flex-col gap-2">
            <label className={`text-base ${isDarkMode ? 'text-gray-300' : 'opacity-80 text-black'}`}>Gender</label>
            <select name="gender" value={formData.gender} onChange={handleChange} disabled={!isEditing}
              className={`w-full h-12 px-4 rounded-lg border outline-none transition-all ${isEditing ? (isDarkMode ? 'bg-gray-700 border-blue-400 ring-2 ring-blue-900' : 'bg-white border-blue-200 ring-2 ring-blue-50') : (isDarkMode ? 'bg-gray-600 border-transparent opacity-70' : 'bg-stone-50 border-transparent opacity-60')} ${isDarkMode ? 'text-white' : 'text-black'}`}>
              <option value={1}>Laki-Laki</option>
              <option value={2}>Perempuan</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className={`text-base ${isDarkMode ? 'text-gray-300' : 'opacity-80 text-black'}`}>Cabang Terdaftar</label>
            {/* Box Container untuk List Cabang */}
              <div className={`w-full min-h-[50px] p-4 rounded-lg border transition-all ${
                  isDarkMode 
                      ? 'bg-gray-800/50 border-gray-700' 
                      : 'bg-gray-50 border-gray-200'
              }`}>
                  {renderCabangBadges()}
              </div>
              
              <p className="text-[10px] text-gray-500 italic mt-1">
                  * Daftar cabang yang dapat Anda akses untuk operasional.
              </p>
           
            </div>
          
          {/* Dark/Light Mode Toggle */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className={`text-base ${isDarkMode ? 'text-gray-300' : 'opacity-80 text-black'}`}>Mode: Dark or Light</label>
            <div className="flex items-center gap-4">
              <button
                onClick={handleToggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDarkMode ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDarkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-black opacity-80'}`}>
                {isDarkMode ? '🌙 Dark' : '☀️ Light'}
              </span>
            </div>
          </div>
        </div>

        {/* BUTTON ACTIONS */}
        <div className="mt-14 flex gap-4">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="px-12 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 font-medium font-['Inter']">
              Edit
            </button>
          ) : (
            <>
              <button onClick={handleCancel} className="px-8 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium">
                Cancel
              </button>
              <button onClick={handleSave} disabled={loading} className="px-8 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 flex items-center gap-2 font-medium disabled:bg-blue-300">
                <Send size={18} /> {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>

        {/* MODALS (Status & Password) - Sama seperti sebelumnya */}
        {/* --- MODAL STATUS (SUKSES / WARNING) --- */}
        {statusModal.show && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            {statusModal.type === 'success' ? (
              // MODAL SUKSES - Design Asli
              <div className={`rounded-[30px] p-10 flex flex-col items-center max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <button 
                  onClick={() => setStatusModal({ ...statusModal, show: false })}
                  className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="text-2xl font-bold">×</span>
                </button>

                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg bg-green-500 shadow-green-100">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold mb-2 uppercase tracking-wide">SUKSES !!</h2>
                <p className={`text-center mb-8 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} text-lg`}>
                  {statusModal.message}
                </p>

                <button
                  onClick={() => setStatusModal({ ...statusModal, show: false })}
                  className="w-full py-4 rounded-xl text-white font-bold text-lg transition-all active:scale-95 shadow-md bg-green-500 hover:bg-green-600"
                >
                  OK
                </button>
              </div>
            ) : (
              // MODAL WARNING - Design Baru dari Figma
              <div className={`w-96 p-8 relative rounded-2xl shadow-[0px_20px_40px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                
                {/* Tombol Close X */}
                <button 
                  onClick={() => setStatusModal({ ...statusModal, show: false })}
                  className="absolute top-4 right-4 w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center hover:bg-neutral-300 transition-colors"
                >
                  <span className="text-black text-sm font-bold">×</span>
                </button>

                {/* Red Circle Background */}
                <div className="flex flex-col items-center gap-8">
                  <div className="w-24 h-24 bg-red-600 rounded-full shadow-lg shadow-red-400/50 flex items-center justify-center">
                    {/* Exclamation Mark - Red bars inside circle */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-1.5 h-6 bg-white rounded-sm"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  </div>

                  {/* Text Section */}
                  <div className="flex flex-col items-center gap-4">
                    <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>WARNING</h2>
                    <p className={`text-base text-center leading-relaxed opacity-80 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {statusModal.message}
                    </p>
                  </div>

                  {/* Back Button */}
                  <button
                    onClick={() => setStatusModal({ ...statusModal, show: false })}
                    className="w-40 h-12 px-5 py-3 bg-red-600 rounded-lg text-white font-medium text-base hover:bg-red-700 transition-all active:scale-95 shadow-md"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- MODAL CHANGE PASSWORD --- */}
        {showPassModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`rounded-2xl p-8 max-w-md w-full shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-xl font-bold mb-6 text-left ${isDarkMode ? 'text-white' : 'text-black'}`}>Change Password</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-4 text-left">
                <div>
                  <label className={`text-sm font-medium mb-1 block ${isDarkMode ? 'text-gray-300' : 'text-black'}`}>Old Password</label>
                  <input type="password" required className={`w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}`}
                    value={passData.oldPassword} onChange={(e) => setPassData({...passData, oldPassword: e.target.value})} />
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1 block ${isDarkMode ? 'text-gray-300' : 'text-black'}`}>New Password</label>
                  <input type="password" required className={`w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}`}
                    value={passData.newPassword} onChange={(e) => setPassData({...passData, newPassword: e.target.value})} />
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1 block ${isDarkMode ? 'text-gray-300' : 'text-black'}`}>Confirm Password</label>
                  <input type="password" required className={`w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}`}
                    value={passData.confirmPassword} onChange={(e) => setPassData({...passData, confirmPassword: e.target.value})} />
                </div>
                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={() => setShowPassModal(false)} className={`flex-1 py-3 border rounded-lg ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ... */}
      </div>
    </div>
  );
}

export default AccountPage;