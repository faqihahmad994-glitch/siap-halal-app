import React, { useState, useEffect } from 'react';
import { 
  Home, Users, FileText, PlusCircle, Download, Lock, UploadCloud, 
  Eye, EyeOff, CheckCircle, Clock, Search, Edit, MapPin, RefreshCw,
  LogOut, Mail, Phone, Map, Save, X, ChevronDown, User, AlertCircle, FileSpreadsheet, Upload, Trash2, MessageCircle, Menu
} from 'lucide-react';
import * as XLSX from 'xlsx';

import logoHalal from './assets/logohalal.png';

// ==========================================
// 🔴 PENGATURAN DATABASE & STORAGE SUPABASE 🔴
// ==========================================
const SUPABASE_URL = 'https://bamdqvnisnabwtgnsthu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbWRxdm5pc25hYnd0Z25zdGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mjc0ODYsImV4cCI6MjA5MzMwMzQ4Nn0.Vw9A8CLJQ42aVdROICsglckG5cK-Vk_DjPi-CVauWkE';
const BUCKET_NAME = 'arsip_dokumen'; // Nama bucket yang baru saja kamu buat

// --- FUNGSI UPLOAD KE SUPABASE STORAGE ---
const uploadToSupabase = async (file, fileName) => {
  try {
    // Buat nama file unik agar tidak bentrok jika namanya sama
    const uniqueFileName = `${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
    
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${uniqueFileName}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: file
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      let errorMsg = data.message || data.error || 'Gagal mengunggah dokumen.';
      
      // Jika error karena RLS Policy Supabase (403 Forbidden)
      if (errorMsg.includes('security policy') || errorMsg.includes('Forbidden') || response.status === 403) {
         errorMsg = 'Akses ditolak Supabase! Kamu harus membuat "Storage Policy (INSERT)" untuk bucket arsip_dokumen di dashboard Supabase-mu.';
      }
      throw new Error(errorMsg);
    }

    // Jika berhasil, kembalikan URL Public-nya agar bisa langsung dibuka
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${uniqueFileName}`;
  } catch (error) {
    console.error("Supabase Storage Error:", error);
    throw error;
  }
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [umkmData, setUmkmData] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [userProfile, setUserProfile] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // State untuk Dynamic Island / Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const fetchUmkmData = async () => {
    setIsLoadingData(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/umkm?select=*&order=created_at.desc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      
      const mappedData = result.map(item => ({
        id: item.id,
        waktuInput: new Date(item.created_at).toLocaleString('id-ID'),
        namaUsaha: item.nama_usaha,
        pemilik: item.pemilik,
        nik: item.nik,
        nib: item.nib,
        email: item.email,
        hp: item.hp,
        alamat: item.alamat,
        koordinat: item.koordinat,
        statusHalal: item.status_halal,
        statusOSS: item.status_oss,
        ossId: item.oss_id || '',
        ossPassword: item.oss_password ? atob(item.oss_password) : '',
        sihalalEmail: item.sihalal_email || '',
        sihalalPassword: item.sihalal_password ? atob(item.sihalal_password) : '',
        fileKtp: item.file_ktp,
        fileNib: item.file_nib,
        fileSertifikat: item.file_sertifikat,
        fileFotoProduk: item.file_foto_produk,
        fileFotoDepan: item.file_foto_depan
      }));
      setUmkmData(mappedData);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchUmkmData();
  }, [isLoggedIn]);

  const handleLogin = async (username, password) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${username}&password=eq.${password}&select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const data = await response.json();
      
      if (data && data.length > 0) {
        setUserProfile(data[0]);
        if (data[0].role === 'umkm') {
          setActiveMenu('form');
        } else {
          setActiveMenu('dashboard');
        }
        setIsLoggedIn(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} />;
  }

  const handleEdit = (item) => {
    setEditingItem(item);
    setActiveMenu('form');
  };

  const handleSaveData = async (newData) => {
    const dbPayload = {
      nama_usaha: newData.namaUsaha,
      pemilik: newData.pemilik,
      nik: newData.nik,
      nib: newData.nib,
      email: newData.email,
      hp: newData.hp,
      alamat: newData.alamat,
      koordinat: newData.koordinat,
      status_halal: newData.statusHalal,
      status_oss: newData.statusOSS,
      oss_id: newData.ossId,
      oss_password: btoa(newData.ossPassword || ''), 
      sihalal_email: newData.sihalalEmail,
      sihalal_password: btoa(newData.sihalalPassword || ''),
      file_ktp: newData.fileKtp,
      file_nib: newData.fileNib,
      file_sertifikat: newData.fileSertifikat,
      file_foto_produk: newData.fileFotoProduk,
      file_foto_depan: newData.fileFotoDepan
    };

    try {
      if (editingItem) {
        await fetch(`${SUPABASE_URL}/rest/v1/umkm?id=eq.${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
          body: JSON.stringify(dbPayload)
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/umkm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
          body: JSON.stringify(dbPayload)
        });
      }
      fetchUmkmData();
    } catch (error) {
      console.error("Gagal menyimpan data:", error);
      showToast("Gagal menyimpan data ke server.", "error");
    }
  };

  const handleDeleteUmkm = async (id) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/umkm?id=eq.${id}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      if (!response.ok) throw new Error('Gagal menghapus data');
      showToast('Data UMKM berhasil dihapus.', 'success');
      fetchUmkmData();
    } catch (error) {
      console.error("Gagal menghapus:", error);
      showToast("Gagal menghapus data UMKM.", "error");
    }
  };

  const handleUpdateProfile = async (updatedData) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userProfile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({
          name: updatedData.name,
          username: updatedData.username,
          password: updatedData.password,
          phone: updatedData.phone
        })
      });
      setUserProfile(updatedData);
    } catch (error) {
      console.error("Gagal update profil:", error);
      showToast("Gagal mengupdate profil di server.", "error");
    }
  };

  const handleContactAdmin = async () => {
    showToast('Menghubungkan ke WhatsApp Pendamping...', 'info');
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users?role=eq.admin&select=phone&limit=1`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const data = await res.json();
      const phone = data?.[0]?.phone;
      if (phone) {
        const waNumber = phone.replace(/\D/g, '').replace(/^0/, '62');
        const pesanOtomatis = encodeURIComponent(`Halo Pendamping Halal, saya *${userProfile.name}* butuh bantuan terkait pengisian data di sistem SIAP HALAL.`);
        window.open(`https://wa.me/${waNumber}?text=${pesanOtomatis}`, '_blank');
      } else {
        showToast('Pendamping belum mengatur nomor WhatsApp.', 'error');
      }
    } catch (error) {
      showToast('Gagal mengambil kontak pendamping.', 'error');
    }
  };

  const renderContent = () => {
    // Cegah akses jika role adalah UMKM
    if (userProfile?.role === 'umkm' && ['dashboard', 'bulk-input', 'recap'].includes(activeMenu)) {
      return <FormView userProfile={userProfile} editingItem={editingItem} onCancel={() => setEditingItem(null)} onSave={handleSaveData} showToast={showToast} />;
    }

    switch (activeMenu) {
      case 'dashboard':
        return <DashboardView data={umkmData} isLoading={isLoadingData} onEdit={handleEdit} onDelete={handleDeleteUmkm} setActiveMenu={setActiveMenu} />;
      case 'form':
        return <FormView userProfile={userProfile} editingItem={editingItem} onCancel={() => {setEditingItem(null); if (userProfile?.role !== 'umkm') setActiveMenu('dashboard');}} onSave={handleSaveData} showToast={showToast} />;
      case 'bulk-input':
        return <BulkInputView onBulkSuccess={fetchUmkmData} showToast={showToast} />;
      case 'recap':
        return <RecapView data={umkmData} />;
      case 'profile':
        return <ProfileView profile={userProfile} onUpdate={handleUpdateProfile} showToast={showToast} />;
      default:
        return userProfile?.role === 'umkm' 
          ? <FormView userProfile={userProfile} editingItem={editingItem} onCancel={() => setEditingItem(null)} onSave={handleSaveData} showToast={showToast} />
          : <DashboardView data={umkmData} isLoading={isLoadingData} onEdit={handleEdit} onDelete={handleDeleteUmkm} setActiveMenu={setActiveMenu} />;
    }
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 relative">
      {/* DYNAMIC ISLAND (LIQUID GLASS) */}
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center shadow-[0_10px_40px_rgba(0,0,0,0.3)] rounded-full overflow-hidden backdrop-blur-xl border border-white/10 ${toast.show ? 'max-w-2xl px-6 py-3.5 bg-gray-900/80 opacity-100 scale-100 translate-y-0' : 'max-w-[40px] px-2 py-1 bg-gray-900/0 opacity-0 scale-75 -translate-y-10 pointer-events-none'}`}>
        <div className={`flex-shrink-0 transition-opacity duration-300 delay-100 ${toast.show ? 'opacity-100' : 'opacity-0'}`}>
          {toast.type === 'success' && <CheckCircle size={22} className="text-green-400 drop-shadow-md" />}
          {toast.type === 'error' && <AlertCircle size={22} className="text-red-400 drop-shadow-md" />}
          {toast.type === 'info' && <Clock size={22} className="text-blue-400 drop-shadow-md" />}
        </div>
        <span className={`ml-3 font-bold text-sm text-white tracking-wide whitespace-nowrap transition-opacity duration-300 delay-100 ${toast.show ? 'opacity-100' : 'opacity-0'}`}>
          {toast.message}
        </span>
      </div>

      {/* MODAL KONFIRMASI LOGOUT (LIQUID GLASS) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-all p-4">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/50 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] flex flex-col items-center max-w-sm w-full relative transform transition-all text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <LogOut size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Keluar Sistem?</h3>
            <p className="text-gray-600 font-medium text-sm mb-6">Apakah Anda yakin ingin mengakhiri sesi dan keluar dari aplikasi?</p>
            <div className="flex space-x-3 w-full">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 bg-white/80 border border-white/50 text-gray-700 font-bold py-3 rounded-xl hover:bg-white transition-colors">Batal</button>
              <button onClick={() => { setShowLogoutConfirm(false); setIsLoggedIn(false); }} className="flex-1 bg-red-500 shadow-md shadow-red-900/20 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors">Ya, Keluar</button>
            </div>
          </div>
        </div>
      )}

      <aside className={`bg-purple-900 text-white flex flex-col shadow-xl z-20 transition-all duration-300 flex-shrink-0 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="w-64 flex flex-col h-full">
          <div className="p-6 flex items-center space-x-3 border-b border-purple-800">
          <img 
            src={logoHalal} 
            alt="Logo Halal" 
            className="w-10 h-10 bg-white rounded-lg p-1 object-contain"
          />
          <div>
            <h1 className="font-bold text-lg leading-tight">SIAP HALAL!</h1>
            <p className="text-purple-300 text-[10px] leading-tight mt-0.5 tracking-wider">Sistem Arsip Pendamping Halal</p>
          </div>
        </div>
        
        <nav className="flex-1 py-6 space-y-1 px-3">
          {userProfile?.role !== 'umkm' && (
            <MenuBtn active={activeMenu === 'dashboard'} icon={<Home size={20}/>} label="Dashboard" onClick={() => {setEditingItem(null); setActiveMenu('dashboard');}} />
          )}
          <MenuBtn active={activeMenu === 'form'} icon={<PlusCircle size={20}/>} label="Input Data UMKM" onClick={() => setActiveMenu('form')} />
          {userProfile?.role !== 'umkm' && (
            <>
              <MenuBtn active={activeMenu === 'bulk-input'} icon={<FileSpreadsheet size={20}/>} label="Input Skala Besar" onClick={() => setActiveMenu('bulk-input')} />
              <MenuBtn active={activeMenu === 'recap'} icon={<FileText size={20}/>} label="Rekapitulasi" onClick={() => setActiveMenu('recap')} />
            </>
          )}
          
          <div className="pt-4 mt-4 border-t border-purple-800/50">
            <MenuBtn active={activeMenu === 'profile'} icon={<User size={20}/>} label={userProfile?.role === 'umkm' ? 'Profil UMKM' : 'Profil Pendamping'} onClick={() => setActiveMenu('profile')} />
            {userProfile?.role === 'umkm' && (
              <MenuBtn active={false} icon={<MessageCircle size={20}/>} label="Bantuan WhatsApp" onClick={handleContactAdmin} />
            )}
          </div>
        </nav>
        
        <div className="p-4 border-t border-purple-800">
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-300 hover:bg-red-900/30 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:bg-purple-50 hover:text-purple-600 p-2 rounded-lg transition-colors">
              <Menu size={24} />
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-gray-700">
              {editingItem ? 'Edit Data UMKM' : activeMenu === 'form' ? 'Pendaftaran Baru' : activeMenu === 'bulk-input' ? 'Input Skala Besar' : activeMenu === 'recap' ? 'Statistik Laporan' : activeMenu === 'profile' ? 'Pengaturan Profil' : 'Beranda Utama'}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
             <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-800">{userProfile.name}</p>
                <p className="text-xs text-purple-600">{userProfile?.role === 'umkm' ? 'Pelaku UMKM' : 'Pendamping P3H'}</p>
             </div>
             <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-inner font-bold">
                {getInitials(userProfile.name)}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col">
          <div className="flex-1">
            {renderContent()}
          </div>
          <footer className="mt-10 text-center text-xs text-gray-400 font-medium">
            &copy; {new Date().getFullYear()} msry. All rights reserved.
          </footer>
        </div>
      </main>
    </div>
  );
}

function BulkInputView({ onBulkSuccess, showToast }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusText, setStatusText] = useState('');

  const handleProcess = async () => {
    if (!file) return showToast('Silakan pilih file Excel terlebih dahulu.', 'error');
    setIsUploading(true);
    setStatusText('Membaca file Excel...');
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) throw new Error("Data Excel kosong atau format tidak sesuai.");

      setStatusText(`Memproses ${jsonData.length} baris data...`);

      const dbPayload = jsonData.map(row => ({
        nama_usaha: row['Nama Usaha'] || '',
        pemilik: row['Nama Pemilik'] || row['Pemilik'] || '',
        nik: row['NIK']?.toString() || '',
        nib: row['NIB']?.toString() || '',
        email: row['Email'] || '',
        hp: row['No HP']?.toString() || row['No. WhatsApp']?.toString() || '',
        alamat: row['Alamat'] || '',
        koordinat: row['Koordinat'] || '',
        status_halal: row['Status Halal'] || 'Belum Daftar',
        status_oss: row['Status OSS'] || 'Proses Draft',
        oss_id: row['User ID OSS']?.toString() || '',
        oss_password: row['Password OSS'] ? btoa(row['Password OSS'].toString()) : '',
        sihalal_email: row['Email SIHALAL'] || '',
        sihalal_password: row['Password SIHALAL'] ? btoa(row['Password SIHALAL'].toString()) : ''
      }));

      setStatusText('Menyimpan ke Supabase...');

      const response = await fetch(`${SUPABASE_URL}/rest/v1/umkm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal' // Optimasi agar Supabase insert massal tidak lag
        },
        body: JSON.stringify(dbPayload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Gagal menyimpan ke database.");
      }

        setIsUploading(false);
        showToast(`Berhasil mengunggah ${dbPayload.length} data UMKM!`, 'success');
        if (onBulkSuccess) onBulkSuccess(); // Refresh data Dashboard

        setTimeout(() => {
          setFile(null);
          setStatusText('');
        }, 4000);

    } catch (error) {
      console.error(error);
      showToast('Gagal memproses file: ' + error.message, 'error');
      setIsUploading(false);
      setStatusText('');
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      "Nama Usaha": "Contoh UMKM",
      "Nama Pemilik": "Budi Santoso",
      "NIK": "3321123456789000",
      "NIB": "1234567890123",
      "Email": "budi@email.com",
      "No HP": "081234567890",
      "Alamat": "Jl. Contoh No. 123, Kota",
      "Koordinat": "-6.200000, 106.816666",
      "Status Halal": "Belum Daftar",
      "Status OSS": "Proses Draft",
      "User ID OSS": "budi_oss",
      "Password OSS": "passOSS123",
      "Email SIHALAL": "budi@sihalal.com",
      "Password SIHALAL": "passHalal123"
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Input_UMKM.xlsx");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 relative">

      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Upload Data Skala Besar</h3>
          <p className="text-sm text-gray-500 mt-1">Gunakan fitur ini untuk mengunggah banyak data UMKM sekaligus menggunakan file Excel (.xlsx) atau CSV.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={handleDownloadTemplate} className="bg-purple-100 text-purple-700 px-5 py-3 rounded-xl font-bold hover:bg-purple-200 transition-colors flex items-center justify-center space-x-2 flex-1">
            <Download size={18} />
            <span>Download Template Excel</span>
          </button>
          <div className="flex-1 text-xs text-gray-500 flex items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
            Pastikan kolom pada file Excel Anda sesuai dengan template standar kami agar data dapat diproses ke database dengan benar.
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <label className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${file ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'}`}>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => setFile(e.target.files[0])} className="hidden" />
            {file ? (
              <>
                <FileSpreadsheet size={48} className="text-purple-600 mb-4" />
                <p className="text-lg font-bold text-purple-700 text-center">{file.name}</p>
                <p className="text-sm text-purple-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                <p className="text-xs font-bold text-gray-400 mt-4 underline">Klik untuk mengganti file</p>
              </>
            ) : (
              <>
                <UploadCloud size={48} className="text-gray-300 mb-4" />
                <p className="text-base font-bold text-gray-600 text-center">Klik atau Drag & Drop file Excel di sini</p>
                <p className="text-sm text-gray-400 mt-1">Mendukung format .xlsx, .xls, .csv</p>
              </>
            )}
          </label>
        </div>

        <div className="pt-2 flex justify-end">
          <button 
            onClick={handleProcess} 
            disabled={!file || isUploading} 
            className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-purple-700 flex items-center space-x-2 transition-transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isUploading ? <Clock size={20} className="animate-spin" /> : <Upload size={20} />}
            <span>{isUploading ? statusText : 'Mulai Proses Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function MenuBtn({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-purple-100 hover:bg-purple-800'}`}>
      {icon} <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

function LoginView({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await onLogin(username, password);
    if (!success) setError(true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-purple-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-8 space-y-8">
        <div className="text-center space-y-2">
          <img src={logoHalal} alt="Logo Halal" className="w-20 h-20 mx-auto object-contain mb-4 drop-shadow-sm" />
          <h2 className="text-2xl font-black text-gray-800">SIAP HALAL!</h2>
          <p className="text-gray-500 text-sm">Sistem Arsip Pendamping Halal</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex items-center space-x-2"><AlertCircle size={16} /> <span>Akses ditolak!</span></div>}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 uppercase">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-purple-500 outline-none" placeholder="Username Anda" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 uppercase">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-purple-500 outline-none" placeholder="••••••••" />
          </div>
          <button disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-200 transition-all active:scale-[0.98] disabled:opacity-70">
            {isLoading ? 'Mengecek Data...' : 'Masuk ke Dashboard'}
          </button>
        </form>
      </div>
      <p className="mt-8 text-xs text-purple-300 font-medium">&copy; {new Date().getFullYear()} msry. All rights reserved.</p>
    </div>
  );
}

function DashboardView({ data, isLoading, onEdit, onDelete, setActiveMenu }) {
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, item: null });

  if (isLoading) return <div className="flex flex-col items-center justify-center h-64 text-purple-600"><Clock size={40} className="animate-spin mb-4" /><p className="font-bold">Mengambil data dari server...</p></div>;

  return (
    <div className="space-y-6">
      {/* MODAL KONFIRMASI HAPUS UMKM (LIQUID GLASS - Bening) */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/30 backdrop-blur-sm transition-all p-4">
          <div className="bg-white/85 backdrop-blur-md border border-white/60 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] flex flex-col items-center max-w-sm w-full relative transform transition-all text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Hapus Data UMKM?</h3>
            <p className="text-gray-600 font-medium text-sm mb-6">Apakah Anda yakin ingin menghapus <b>{deleteConfirm.item?.namaUsaha}</b> secara permanen?</p>
            <div className="flex space-x-3 w-full">
              <button type="button" onClick={() => setDeleteConfirm({ show: false, item: null })} className="flex-1 bg-white/80 border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-white transition-colors">Batal</button>
              <button type="button" onClick={() => { onDelete(deleteConfirm.item.id); setDeleteConfirm({ show: false, item: null }); }} className="flex-1 bg-red-500 shadow-md shadow-red-900/20 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">Daftar UMKM</h3>
          <p className="text-gray-500">Kelola dan pantau progres sertifikasi dampinganmu.</p>
        </div>
        <button onClick={() => setActiveMenu('form')} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 hover:bg-purple-700 shadow-md"><PlusCircle size={20} /> <span>Tambah Baru</span></button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {data.length === 0 ? (
          <div className="p-12 text-center text-gray-400"><Users size={48} className="mx-auto mb-3 opacity-20" /><p className="font-bold">Belum ada data UMKM</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Informasi Usaha</th>
                  <th className="px-6 py-4">Pemilik Usaha</th>
                  <th className="px-6 py-4">Kontak & Lokasi</th>
                  <th className="px-6 py-4">Status Halal</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-purple-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800 text-base">{item.namaUsaha}</p>
                      <p className="text-xs text-gray-500">NIB: {item.nib}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-700 font-medium">
                        <User size={14} className="text-purple-600" /> <span>{item.pemilik}</span>
                      </div>
                      {item.nik && <p className="text-xs text-gray-500 mt-1 ml-6">NIK: {item.nik}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-xs text-gray-600"><Phone size={12} className="text-purple-600" /> <span>{item.hp}</span></div>
                      <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1"><MapPin size={12} className="text-purple-600" /> <span className="truncate max-w-[150px] inline-block">{item.alamat}</span></div>
                    </td>
                    <td className="px-6 py-4"><span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-700">{item.statusHalal}</span></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => onEdit(item)} className="inline-flex items-center space-x-1.5 bg-white border border-gray-200 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all font-bold"><Edit size={14} /> <span className="hidden sm:inline">Edit</span></button>
                        <button onClick={() => setDeleteConfirm({ show: true, item })} className="inline-flex items-center space-x-1.5 bg-white border border-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition-all font-bold"><Trash2 size={14} /> <span className="hidden sm:inline">Hapus</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FormView({ userProfile, editingItem, onCancel, onSave, showToast }) {
  const [formData, setFormData] = useState({
    namaUsaha: editingItem?.namaUsaha || '', pemilik: editingItem?.pemilik || '', nik: editingItem?.nik || '',
    nib: editingItem?.nib || '', email: editingItem?.email || '', hp: editingItem?.hp || '',
    alamat: editingItem?.alamat || '', statusHalal: editingItem?.statusHalal || (userProfile?.role === 'umkm' ? 'Dikirim ke Pendamping' : 'Belum Daftar'), statusOSS: editingItem?.statusOSS || 'Proses Draft',
    ossId: editingItem?.ossId || '', ossPassword: editingItem?.ossPassword || '', sihalalEmail: editingItem?.sihalalEmail || '', sihalalPassword: editingItem?.sihalalPassword || ''
  });

  const [koordinat, setKoordinat] = useState(editingItem?.koordinat || '');
  const [showAllCredentials, setShowAllCredentials] = useState(true); 
  const [showContohFoto, setShowContohFoto] = useState(false);
  const [showContohFotoDepan, setShowContohFotoDepan] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [statusText, setStatusText] = useState('Idle'); 
  const [duplicateInfo, setDuplicateInfo] = useState({ show: false, adminPhone: '' });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [dokumen, setDokumen] = useState({ ktp: null, nib: null, sertifikat: null, fotoProduk: null, fotoDepan: null });
  const [existingFiles, setExistingFiles] = useState({
    ktp: editingItem?.fileKtp || null,
    nib: editingItem?.fileNib || null,
    sertifikat: editingItem?.fileSertifikat || null,
    fotoProduk: editingItem?.fileFotoProduk || null,
    fotoDepan: editingItem?.fileFotoDepan || null
  });

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => {
    setFormData({
      namaUsaha: '', pemilik: '', nik: '',
      nib: '', email: '', hp: '',
      alamat: '', statusHalal: userProfile?.role === 'umkm' ? 'Dikirim ke Pendamping' : 'Belum Daftar', statusOSS: 'Proses Draft',
      ossId: '', ossPassword: '', sihalalEmail: '', sihalalPassword: ''
    });
    setKoordinat('');
    setDokumen({ ktp: null, nib: null, sertifikat: null, fotoProduk: null, fotoDepan: null });
    setExistingFiles({ ktp: null, nib: null, sertifikat: null, fotoProduk: null, fotoDepan: null });
  };

  const handleReset = (e) => {
    e?.preventDefault();
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    resetForm();
    setShowResetConfirm(false);
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => { setKoordinat(`${position.coords.latitude}, ${position.coords.longitude}`); setIsLocating(false); },
        () => { showToast("Gagal melacak lokasi. Pastikan GPS aktif.", "error"); setIsLocating(false); }
      );
    }
  };

  const handleSave = async () => {
    if (!formData.namaUsaha || !formData.pemilik || !formData.nik || !formData.email || !formData.hp || !formData.alamat || !koordinat || (!dokumen.ktp && !existingFiles.ktp) || (!dokumen.fotoProduk && !existingFiles.fotoProduk) || (!dokumen.fotoDepan && !existingFiles.fotoDepan)) { 
      showToast("Mohon lengkapi semua data wajib (Bertanda *)!", "error"); 
      return; 
    }

    try {
      // CEK DATA GANDA (UMKM SAJA)
      if (userProfile?.role === 'umkm') {
        setStatusText('Mengecek data...');
        let orQuery = `nik.eq.${formData.nik}`;
        if (formData.nib && formData.nib.trim() !== '' && formData.nib !== '-') {
          orQuery += `,nib.eq.${formData.nib}`;
        }
        let checkUrl = `${SUPABASE_URL}/rest/v1/umkm?or=(${orQuery})&select=id`;
        if (editingItem) checkUrl += `&id=neq.${editingItem.id}`;
        
        const checkRes = await fetch(checkUrl, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const checkData = await checkRes.json();
        
        if (checkData && checkData.length > 0) {
          const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/users?role=eq.admin&select=phone&limit=1`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          const adminData = await adminRes.json();
          setDuplicateInfo({ show: true, adminPhone: adminData?.[0]?.phone || '' });
          setStatusText('Idle');
          return;
        }
      }

      let fileKtpUrl = existingFiles.ktp;
      let fileNibUrl = existingFiles.nib;
      let fileSertifikatUrl = existingFiles.sertifikat;
      let fileFotoProdukUrl = existingFiles.fotoProduk;
      let fileFotoDepanUrl = existingFiles.fotoDepan;

      // PROSES UPLOAD KE SUPABASE STORAGE
      if (dokumen.ktp || dokumen.nib || dokumen.sertifikat || dokumen.fotoProduk || dokumen.fotoDepan) {
        setStatusText('Mengunggah Dokumen...');
        const namaBase = formData.namaUsaha.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        if (dokumen.ktp) fileKtpUrl = await uploadToSupabase(dokumen.ktp, `KTP_${namaBase}.${dokumen.ktp.name.split('.').pop()}`);
        if (dokumen.nib) fileNibUrl = await uploadToSupabase(dokumen.nib, `NIB_${namaBase}.${dokumen.nib.name.split('.').pop()}`);
        if (dokumen.sertifikat) fileSertifikatUrl = await uploadToSupabase(dokumen.sertifikat, `SERTIFIKAT_${namaBase}.${dokumen.sertifikat.name.split('.').pop()}`);
        if (dokumen.fotoProduk) fileFotoProdukUrl = await uploadToSupabase(dokumen.fotoProduk, `FOTO_${namaBase}.${dokumen.fotoProduk.name.split('.').pop()}`);
        if (dokumen.fotoDepan) fileFotoDepanUrl = await uploadToSupabase(dokumen.fotoDepan, `FOTODEPAN_${namaBase}.${dokumen.fotoDepan.name.split('.').pop()}`);
      }

      setStatusText('Menyimpan ke Database...');
      await onSave({ ...formData, koordinat, fileKtp: fileKtpUrl, fileNib: fileNibUrl, fileSertifikat: fileSertifikatUrl, fileFotoProduk: fileFotoProdukUrl, fileFotoDepan: fileFotoDepanUrl });
      
      setStatusText('Idle');
      if (userProfile?.role === 'umkm') {
        showToast('Terimakasih sudah mengisi, Anda akan dihubungi pendamping halal dalam 24 jam.', 'success');
        setTimeout(() => { resetForm(); }, 1500);
      } else {
        showToast('Data & Dokumen berhasil diamankan.', 'success');
        setTimeout(() => { if (onCancel) onCancel(); }, 1500);
      }

    } catch (err) {
      console.error(err);
      showToast("Gagal memproses data! Error: " + err.message, "error");
      setStatusText('Idle');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 relative">
      {showContohFoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-all p-4">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/50 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] flex flex-col max-w-sm w-full relative transform transition-all">
            <button onClick={() => setShowContohFoto(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"><X size={20} /></button>
            <h3 className="text-lg font-black text-gray-800 mb-4">Contoh Foto Produk</h3>
            <div className="bg-gray-100 rounded-xl aspect-square flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden text-center p-6">
               <span className="text-gray-400 font-medium">
                 Pastikan foto/kemasan produk terlihat dari depan dengan jelas, terang, dan tidak terpotong.
               </span>
            </div>
            <button onClick={() => setShowContohFoto(false)} className="mt-6 w-full bg-purple-600 shadow-md shadow-purple-900/20 text-white font-bold py-3 rounded-xl hover:bg-purple-700">Tutup</button>
          </div>
        </div>
      )}
      {showContohFotoDepan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-all p-4">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/50 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] flex flex-col max-w-sm w-full relative transform transition-all">
            <button onClick={() => setShowContohFotoDepan(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"><X size={20} /></button>
            <h3 className="text-lg font-black text-gray-800 mb-4">Contoh Foto Lokasi</h3>
            <div className="bg-gray-100 rounded-xl aspect-square flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden text-center p-6">
               <span className="text-gray-400 font-medium">
                 Pastikan foto diambil dari luar bangunan, menampilkan papan nama usaha (jika ada), dan kondisi lingkungan sekitar dengan jelas.
               </span>
            </div>
            <button onClick={() => setShowContohFotoDepan(false)} className="mt-6 w-full bg-purple-600 shadow-md shadow-purple-900/20 text-white font-bold py-3 rounded-xl hover:bg-purple-700">Tutup</button>
          </div>
        </div>
      )}
      {duplicateInfo.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-md w-full relative text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Data Sudah Terdaftar!</h3>
            <p className="text-gray-600 font-medium text-sm mb-6">
              Data ganda dengan acuan nomor NIK dan NIB ditemukan, maka data gagal disimpan. Hubungi pendamping untuk mereset data yang salah!
            </p>
            <div className="flex space-x-3 w-full">
              <button onClick={() => setDuplicateInfo({ show: false, adminPhone: '' })} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">Tutup</button>
              {duplicateInfo.adminPhone && (
                <a href={`https://wa.me/${duplicateInfo.adminPhone.replace(/\D/g, '').replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="flex-1 bg-green-500 shadow-md shadow-green-900/20 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-colors flex justify-center items-center">
                  Hubungi Pendamping
                </a>
              )}
            </div>
          </div>
        </div>
      )}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-all p-4">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/50 p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] flex flex-col items-center max-w-sm w-full relative transform transition-all text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <RefreshCw size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Reset Semua Data?</h3>
            <p className="text-gray-600 font-medium text-sm mb-6">Apakah Anda yakin ingin mengosongkan semua isian data ini dari awal?</p>
            <div className="flex space-x-3 w-full">
              <button type="button" onClick={() => setShowResetConfirm(false)} className="flex-1 bg-white/80 border border-white/50 text-gray-700 font-bold py-3 rounded-xl hover:bg-white transition-colors">Batal</button>
              <button type="button" onClick={confirmReset} className="flex-1 bg-red-500 shadow-md shadow-red-900/20 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors">Ya, Kosongkan</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <h4 className="font-black text-purple-800 flex items-center space-x-2 uppercase tracking-wide"><Users size={18} /> <span>Profil & Kontak UMKM</span></h4>
            <p className="text-sm text-red-500 font-medium mt-1">Kolom yang bertanda (*) wajib diisi!</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Nama Usaha *" name="namaUsaha" value={formData.namaUsaha} onChange={handleChange} placeholder="Wajib diisi" />
            <Input label="Nama Pemilik *" name="pemilik" value={formData.pemilik} onChange={handleChange} placeholder="Wajib diisi" />
            <Input label="NIK Pemilik *" type="text" name="nik" value={formData.nik} onChange={handleChange} placeholder="Wajib diisi" />
            <Input label="NIB" type="text" name="nib" value={formData.nib} onChange={handleChange} />
            <Input label="Email Aktif *" icon={<Mail size={16}/>} name="email" value={formData.email} onChange={handleChange} placeholder="Wajib diisi" />
            <Input label="No. WhatsApp *" icon={<Phone size={16}/>} name="hp" value={formData.hp} onChange={handleChange} placeholder="Wajib diisi" />
            
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">Alamat Lengkap Usaha *</label>
              <textarea name="alamat" value={formData.alamat} onChange={handleChange} placeholder="Wajib diisi" className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-purple-500 outline-none h-24 resize-none"></textarea>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between"><span>Titik Koordinat Lokasi *</span></label>
              <div className="flex space-x-3">
                <div className="relative flex-1">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-600" size={18} />
                  <input type="text" value={koordinat} onChange={(e) => setKoordinat(e.target.value)} placeholder="Wajib diisi" className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-purple-500 outline-none" />
                </div>
                <button type="button" onClick={handleGetLocation} disabled={isLocating} className="bg-purple-100 text-purple-700 px-5 font-bold rounded-xl hover:bg-purple-200 transition-colors flex items-center space-x-2"><Map size={18} /><span className="hidden sm:inline">{isLocating ? 'Melacak...' : 'Isi Otomatis Lokasi'}</span></button>
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">Status Sertifikasi Halal Saat Ini</label>
              <div className="relative">
                <select name="statusHalal" value={formData.statusHalal} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-purple-500 outline-none appearance-none cursor-pointer font-medium text-gray-700">
                  {userProfile?.role === 'umkm' ? (
                    <option value="Dikirim ke Pendamping">📤 Dikirim ke Pendamping</option>
                  ) : (
                    <>
                      <option value="Belum Daftar">⭕ Belum Daftar</option>
                      <option value="Proses Draft">📝 Proses Draft / Pengisian Data</option>
                      <option value="Dikirim ke Pendamping">📤 Dikirim ke Pendamping</option>
                      <option value="Dikirim ke LP3H">📤 Dikirim ke LP3H</option>
                      <option value="Proses Verifikasi">🔎 Proses Verifikasi / Audit</option>
                      <option value="Proses Sidang Fatwa">⚖️ Proses Sidang Fatwa MUI</option>
                      <option value="Terbit Sertifikat">✅ Terbit Sertifikat</option>
                    </>
                  )}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
              </div>
            </div>
          </div>
        </section>

        {userProfile?.role !== 'umkm' && (
          <section className="bg-gray-900 p-8 rounded-2xl shadow-xl space-y-6 text-white transition-all">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-purple-400 flex items-center space-x-2 uppercase tracking-wide"><Lock size={18} /> <span>Akses Portal (Kredensial)</span></h4>
              <button onClick={(e) => { e.preventDefault(); setShowAllCredentials(!showAllCredentials); }} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition-colors flex items-center space-x-2">
                {showAllCredentials ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {showAllCredentials ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 p-4 border border-gray-800 rounded-xl">
                   <p className="text-xs font-bold text-purple-400 uppercase">Portal OSS</p>
                   <InputDark label="User ID OSS" name="ossId" value={formData.ossId} onChange={handleChange} />
                   <InputDark label="Password OSS" type="text" name="ossPassword" value={formData.ossPassword} onChange={handleChange} />
                </div>
                <div className="space-y-4 p-4 border border-gray-800 rounded-xl">
                   <p className="text-xs font-bold text-purple-400 uppercase">Portal SIHALAL</p>
                   <InputDark label="Email SIHALAL" name="sihalalEmail" value={formData.sihalalEmail} onChange={handleChange} />
                   <InputDark label="Password SIHALAL" type="text" name="sihalalPassword" value={formData.sihalalPassword} onChange={handleChange} />
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 border border-gray-800 rounded-xl bg-gray-800/30">
                <Lock size={32} className="mx-auto mb-3 opacity-30" /><p className="text-sm font-bold uppercase tracking-wider">Data Kredensial Disembunyikan</p>
              </div>
            )}
          </section>
        )}

        <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6 text-center">
          <h4 className="font-black text-gray-800 flex items-center space-x-2 uppercase tracking-wide text-left"><UploadCloud size={18} /> <span>Dokumen Pendukung</span></h4>
          <p className="text-sm text-gray-500 text-left mb-4">File Anda akan disimpan dengan aman di Supabase Storage.</p>
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${userProfile?.role === 'umkm' ? 'md:grid-cols-3' : 'lg:grid-cols-4'}`}>
             <UploadBox 
               label="KTP *" 
               accept="image/*,.pdf" 
               file={dokumen.ktp} 
               existingUrl={existingFiles.ktp}
               onChange={(f) => setDokumen({...dokumen, ktp: f})} 
               onClearExisting={() => setExistingFiles({...existingFiles, ktp: null})}
             />
             <UploadBox 
               label="NIB" 
               accept="image/*,.pdf" 
               file={dokumen.nib} 
               existingUrl={existingFiles.nib}
               onChange={(f) => setDokumen({...dokumen, nib: f})} 
               onClearExisting={() => setExistingFiles({...existingFiles, nib: null})}
             />
             <div className="relative group">
               <UploadBox 
                 label="Foto Produk *" 
                 accept="image/*" 
                 file={dokumen.fotoProduk} 
                 existingUrl={existingFiles.fotoProduk}
                 onChange={(f) => setDokumen({...dokumen, fotoProduk: f})} 
                 onClearExisting={() => setExistingFiles({...existingFiles, fotoProduk: null})}
               />
               <button type="button" onClick={() => setShowContohFoto(true)} className="absolute top-3 right-3 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-[10px] font-black hover:bg-blue-200 transition-colors shadow-sm">Lihat Contoh</button>
             </div>
             <div className="relative group">
               <UploadBox 
                 label="Foto Lokasi Depan *" 
                 accept="image/*" 
                 file={dokumen.fotoDepan} 
                 existingUrl={existingFiles.fotoDepan}
                 onChange={(f) => setDokumen({...dokumen, fotoDepan: f})} 
                 onClearExisting={() => setExistingFiles({...existingFiles, fotoDepan: null})}
               />
               <button type="button" onClick={() => setShowContohFotoDepan(true)} className="absolute top-3 right-3 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-[10px] font-black hover:bg-blue-200 transition-colors shadow-sm">Lihat Contoh</button>
             </div>
             {userProfile?.role !== 'umkm' && (
               <UploadBox 
                 label="Sertifikat Halal" 
                 accept="image/*,.pdf" 
                 file={dokumen.sertifikat} 
                 existingUrl={existingFiles.sertifikat}
                 onChange={(f) => setDokumen({...dokumen, sertifikat: f})} 
                 onClearExisting={() => setExistingFiles({...existingFiles, sertifikat: null})}
               />
             )}
          </div>
        </section>

        <div className="flex items-center justify-end space-x-4 pt-6 mt-4 border-t border-gray-200">
           {userProfile?.role === 'umkm' ? (
             <button type="button" onClick={handleReset} disabled={statusText !== 'Idle'} className="px-6 py-3 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-xl font-medium flex items-center space-x-2 transition-colors"><RefreshCw size={20} /> <span>Reset Data</span></button>
           ) : (
             <button type="button" onClick={onCancel} disabled={statusText !== 'Idle'} className="px-6 py-3 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-xl font-medium flex items-center space-x-2 transition-colors"><X size={20} /> <span>Batalkan</span></button>
           )}
           <button onClick={handleSave} disabled={statusText !== 'Idle'} className="bg-purple-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg hover:bg-purple-700 flex items-center space-x-2 transition-transform active:scale-[0.98] disabled:opacity-70">
             {statusText !== 'Idle' ? <Clock size={20} className="animate-spin" /> : <Save size={20} />}
             <span>{statusText !== 'Idle' ? statusText : 'Simpan Data'}</span>
           </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, icon, ...props }) {
  return (
    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">{label}</label><div className="relative">{icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}<input {...props} className={`w-full ${icon ? 'pl-12' : 'px-4'} py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-purple-500 outline-none`} /></div></div>
  );
}

function InputDark({ label, type = "text", ...props }) {
  return (
    <div className="space-y-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label><input type={type} {...props} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none text-white" /></div>
  );
}

function UploadBox({ label, accept, file, existingUrl, onChange, onClearExisting }) {
  if (existingUrl && !file) {
    return (
      <div className="border-2 border-green-400 bg-green-50 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
        <CheckCircle size={24} className="text-green-500 mb-2" />
        <p className="text-xs font-bold text-green-700 uppercase mb-3">{label} TERSIMPAN</p>
        <div className="flex space-x-2 z-10">
          <a href={existingUrl} target="_blank" rel="noreferrer" className="bg-white border border-green-300 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">
            Lihat
          </a>
          <button type="button" onClick={(e) => { e.preventDefault(); onClearExisting(); }} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors">
            Perbarui
          </button>
        </div>
      </div>
    );
  }

  return (
    <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer flex flex-col items-center relative overflow-hidden group block">
       <input type="file" accept={accept} onChange={(e) => onChange && onChange(e.target.files[0])} className="hidden" />
       {file ? (
         <><CheckCircle size={24} className="mx-auto text-green-500 mb-2" /><p className="text-xs font-bold text-green-700 uppercase truncate w-full px-2 text-center" title={file.name}>{file.name}</p></>
       ) : (
         <><UploadCloud size={24} className="mx-auto text-gray-300 mb-2 group-hover:text-purple-500 transition-colors" /><p className="text-xs font-bold text-gray-600 uppercase group-hover:text-purple-600">{label}</p></>
       )}
    </label>
  );
}

function RecapView({ data }) {
  const totalUMKM = data.length;
  const sihalalTerbit = data.filter(item => item.statusHalal === 'Terbit Sertifikat').length;
  const prosesFatwa = data.filter(item => item.statusHalal === 'Proses Sidang Fatwa').length;
  const nibBelumAda = data.filter(item => !item.nib || item.nib === '-' || String(item.nib).trim() === '').length;

  const handleDownloadExcel = () => {
    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /><style>table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; } th { background-color: #6b21a8; color: white; border: 1px solid #dddddd; font-weight: bold; padding: 10px; text-align: left; } td { border: 1px solid #dddddd; padding: 8px; vertical-align: top; }</style></head>
      <body><table><thead><tr><th>No</th><th>Waktu Input</th><th>Nama Usaha</th><th>Nama Pemilik</th><th>NIK (Teks)</th><th>NIB (Teks)</th><th>Email</th><th>No. WhatsApp</th><th>Alamat Lengkap</th><th>Titik Koordinat</th><th>Status OSS</th><th>Status Halal</th><th>KTP Link</th><th>NIB Link</th></tr></thead><tbody>
    `;

    data.forEach((item, index) => {
      // Mengambil URL langsung dari Supabase
      const ktpLink = item.fileKtp ? item.fileKtp : '';
      const nibLink = item.fileNib ? item.fileNib : '';
      
      tableHtml += `<tr><td>${index + 1}</td><td>${item.waktuInput}</td><td>${item.namaUsaha}</td><td>${item.pemilik}</td><td style="mso-number-format:'\\@'">${item.nik}</td><td style="mso-number-format:'\\@'">${item.nib}</td><td>${item.email}</td><td style="mso-number-format:'\\@'">${item.hp}</td><td>${item.alamat}</td><td>${item.koordinat}</td><td>${item.statusOSS}</td><td>${item.statusHalal}</td><td>${ktpLink}</td><td>${nibLink}</td></tr>`;
    });

    tableHtml += `</tbody></table></body></html>`;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_SIAP_HALAL_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total UMKM" value={totalUMKM} color="purple" />
        <StatCard label="SiHalal Terbit" value={sihalalTerbit} color="green" />
        <StatCard label="Proses Fatwa" value={prosesFatwa} color="orange" />
        <StatCard label="NIB Belum Ada" value={nibBelumAda} color="red" />
      </div>
      <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
        <div className="bg-purple-100 p-4 rounded-full text-purple-600"><Download size={40} /></div>
        <h4 className="text-xl font-bold">Siap Kirim Laporan?</h4>
        <p className="text-gray-500 max-w-sm">Aplikasi akan merangkum semua data UMKM ke dalam satu file Excel.</p>
        <button onClick={handleDownloadExcel} className="bg-purple-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-purple-700 shadow-lg">Download Rekap Excel</button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <div className={`${colors[color]} p-6 rounded-2xl border-2 shadow-sm`}>
      <p className="text-xs font-black uppercase tracking-widest opacity-70">{label}</p>
      <p className="text-4xl font-black mt-2">{value}</p>
    </div>
  );
}

function ProfileView({ profile, onUpdate, showToast }) {
  const [formData, setFormData] = useState(profile);
  const [showPwd, setShowPwd] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State untuk tambah akun UMKM
  const [newUmkm, setNewUmkm] = useState({ name: '', username: '', password: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [showUmkmPwd, setShowUmkmPwd] = useState(false);
  const [umkmUsers, setUmkmUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleNewUmkmChange = (e) => setNewUmkm({ ...newUmkm, [e.target.name]: e.target.value });

  useEffect(() => {
    if (profile?.role !== 'umkm') fetchUmkmUsers();
  }, []);

  const fetchUmkmUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?role=eq.umkm&order=id.desc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      if (!response.ok) throw new Error('Gagal mengambil data user');
      const data = await response.json();
      setUmkmUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleDeleteUmkmUser = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus akses aplikasi untuk UMKM: ${name}? \n\nMereka tidak akan bisa login lagi.`)) return;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${id}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      if (!response.ok) throw new Error('Gagal menghapus akun');
      showToast(`Akses untuk ${name} berhasil dihapus.`, 'success');
      fetchUmkmUsers();
    } catch (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(formData);
    setIsSaving(false);
    showToast('Profil & Keamanan berhasil diperbarui!', 'success');
  };

  const handleAddUmkm = async (e) => {
    e.preventDefault();
    if (!newUmkm.name || !newUmkm.username || !newUmkm.password) {
      showToast('Mohon lengkapi data akun baru', 'error');
      return;
    }
    setIsAdding(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: newUmkm.name,
          username: newUmkm.username,
          password: newUmkm.password,
          role: 'umkm' // Force role umkm
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Gagal membuat akun');
      }
      showToast('Akun UMKM berhasil dibuat!', 'success');
      setNewUmkm({ name: '', username: '', password: '' });
      fetchUmkmUsers();
    } catch (error) {
      showToast('Gagal: ' + error.message, 'error');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center space-x-4 border-b border-gray-100 pb-6">
          <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center font-black text-2xl">
             <User size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Profil & Keamanan Akun</h3>
            <p className="text-sm text-gray-500">Ubah nama dan kredensial login aplikasi ini.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase">Nama Lengkap Pendamping</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-purple-500 outline-none transition-all font-medium" />
          </div>
          {profile?.role !== 'umkm' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">No. WhatsApp Pendamping</label>
              <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="Contoh: 08123456789" className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-purple-500 outline-none transition-all font-medium" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">Username Login</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-purple-500 outline-none transition-all font-medium" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">Password Login</label>
              <div className="relative">
                <input type={showPwd ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="w-full pl-4 pr-12 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-purple-500 outline-none transition-all font-medium" />
                <button onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
          <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-purple-700 shadow-md flex items-center space-x-2 disabled:opacity-70">
            {isSaving ? <Clock size={18} className="animate-spin" /> : <Save size={18} />} 
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </div>

      {profile?.role !== 'umkm' && (
        <>
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6 mb-6">
          <div className="flex items-center space-x-4 border-b border-gray-100 pb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-black text-2xl">
               <Users size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Tambah Akun UMKM Baru</h3>
              <p className="text-sm text-gray-500">Buat kredensial login untuk pelaku usaha dampingan.</p>
            </div>
          </div>

          <form onSubmit={handleAddUmkm} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">Nama Lengkap Pemilik / Usaha</label>
              <input type="text" name="name" value={newUmkm.name} onChange={handleNewUmkmChange} required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all font-medium" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Username Login</label>
                <input type="text" name="username" value={newUmkm.username} onChange={handleNewUmkmChange} required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all font-medium" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Password Login</label>
                <div className="relative">
                  <input type={showUmkmPwd ? "text" : "password"} name="password" value={newUmkm.password} onChange={handleNewUmkmChange} required className="w-full pl-4 pr-12 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all font-medium" />
                  <button type="button" onClick={() => setShowUmkmPwd(!showUmkmPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600">
                    {showUmkmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
              <button type="submit" disabled={isAdding} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-md flex items-center space-x-2 disabled:opacity-70">
                {isAdding ? <Clock size={18} className="animate-spin" /> : <PlusCircle size={18} />} 
                <span>{isAdding ? 'Membuat...' : 'Buat Akun UMKM'}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Daftar Akun UMKM</h3>
            <p className="text-sm text-gray-500">Kelola akses login yang telah diberikan.</p>
          </div>
          
          {isLoadingUsers ? (
            <div className="text-center py-8 text-gray-400"><Clock size={24} className="animate-spin mx-auto mb-2" /><span>Memuat data...</span></div>
          ) : umkmUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl font-medium">Belum ada akun UMKM yang dibuat.</div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {umkmUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                      {user.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">Username: {user.username}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => handleDeleteUmkmUser(user.id, user.name)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors" title="Hapus Akses">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}