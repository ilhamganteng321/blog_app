import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { doc, updateDoc, collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../database/firebase";
import { toast } from 'react-toastify';
import BlogPostForm from './BlogPostForm';

const BlogDashboard = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingPost, setEditingPost] = useState(null);
  const { logout } = useAuthStore();
  const { user, userData, isAuthenticated } = useAuth();
  const [blogPosts, setBlogPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  
  const handlePostSuccess = () => {
    setEditingPost(null);
    setActiveTab('dashboard');
  };

  // State untuk form profile
  const [profileData, setProfileData] = useState({
    displayName: userData?.displayName || '',
    username: userData?.username || '',
    profilePicture: userData?.profilePicture || ''
  });

  const fetchBlogPosts = async () => {
    try {
      setLoadingPosts(true);
      const postsRef = collection(db, 'posts');
      
      // Query untuk mengambil postingan yang statusnya published, diurutkan berdasarkan tanggal publish terbaru
      const q = query(
        postsRef, 
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const posts = [];

      
      querySnapshot.forEach((doc) => {
        const postData = doc.data();
        // Format tanggal untuk ditampilkan
        let formattedDate = 'Tanggal tidak tersedia';
        if (postData.publishedAt) {
          const date = postData.publishedAt.toDate();
          formattedDate = date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
        
        posts.push({
          id: doc.id,
          ...postData,
          date: formattedDate,
          // Fallback untuk field yang mungkin tidak ada
          excerpt: postData.excerpt || postData.content?.substring(0, 150) + '...' || '',
          image: postData.featuredImage || 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80'
        });
      });
      
      console.log("post", posts)
      setBlogPosts(posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Gagal memuat postingan');
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    // Fetch blog posts ketika komponen mount atau tab dashboard aktif
    if (activeTab === 'dashboard') {
      fetchBlogPosts();
    }
  }, [activeTab]);
  
  const handleLogout = async () => {
    logout();
  }
  
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    try {
      // Pastikan user ada
      if (!user) return;

      // Ambil reference dokumen user di Firestore
      const userRef = doc(db, "users", user.uid);

      // Update data
      await updateDoc(userRef, {
        displayName: profileData.displayName,
        username: profileData.username,
        profilePicture: profileData.profilePicture,
        updatedAt: new Date()
      });

      toast.success("Profile berhasil diperbarui")
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Gagal memperbarui profil");
    }
  };

  useEffect(() => {
    // Update profile data ketika userData berubah
    if (userData) {
      setProfileData({
        displayName: userData.displayName || '',
        username: userData.username || '',
        profilePicture: userData.profilePicture || ''
      });
    }
  }, [userData]);

  

  const categories = [
    { name: "Teknologi", count: 12 },
    { name: "Pemrograman", count: 8 },
    { name: "Web Development", count: 15 },
    { name: "Tutorial", count: 10 },
    { name: "Desain", count: 7 }
  ];

  const popularPosts = [
    { title: "10 Framework JavaScript Terbaik di 2024", views: 1245 },
    { title: "Cara Deploy Aplikasi React ke Vercel", views: 987 },
    { title: "Menggunakan Hooks dalam React", views: 876 },
    { title: "Tailwind CSS vs Bootstrap: Mana yang Lebih Baik?", views: 754 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-bold text-indigo-600">BlogKu</span>
              </Link>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`${activeTab === 'dashboard' ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Beranda
                </button>
                <Link to="/categories" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Kategori
                </Link>
                <Link to="/about" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Tentang
                </Link>
                <Link to="/contact" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Kontak
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <div className="hidden md:ml-4 md:flex md:items-center space-x-3">
                {user == null ? (
                  <>
                    <Link to="/login" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                      Masuk
                    </Link>
                    <Link to="/register" className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium">
                      Daftar
                    </Link>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className={`${activeTab === 'profile' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'} px-3 py-2 rounded-md text-sm font-medium`}
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setEditingPost(null);
                        setActiveTab('create-post');
                      }}
                      className={`${activeTab === 'create-post' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'} px-3 py-2 rounded-md text-sm font-medium`}
                    >
                      Tulis Post
                    </button>
                    <button
                      onClick={handleLogout}
                      className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                  aria-expanded="false"
                >
                  <span className="sr-only">Buka menu utama</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setIsMenuOpen(false);
                }}
                className={`${activeTab === 'dashboard' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left`}
              >
                Beranda
              </button>
              <Link to="/categories" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
                Kategori
              </Link>
              <Link to="/about" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
                Tentang
              </Link>
              <Link to="/contact" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
                Kontak
              </Link>

              {user && (
                <>
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setIsMenuOpen(false);
                    }}
                    className={`${activeTab === 'profile' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setEditingPost(null);
                      setActiveTab('create-post');
                      setIsMenuOpen(false);
                    }}
                    className={`${activeTab === 'create-post' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left`}
                  >
                    Tulis Post
                  </button>
                </>
              )}

              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex items-center px-4 space-x-3">
                  {user == null ? (
                    <>
                      <Link
                        to="/login"
                        className="w-full flex justify-center text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium border border-gray-300"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Masuk
                      </Link>
                      <Link
                        to="/register"
                        className="w-full flex justify-center bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Daftar
                      </Link>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex justify-center bg-red-600 text-white hover:bg-red-700 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Logout
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tampilkan form posting blog jika tab aktif adalah create-post atau edit-post */}
        {activeTab === 'create-post' || activeTab === 'edit-post' ? (
          <BlogPostForm 
            post={editingPost} 
            onSuccess={handlePostSuccess} 
          />
        ) : activeTab === 'profile' ? (
          /* Profile Section */
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-8 md:p-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Saya</h2>
              
              <div className="flex flex-col md:flex-row gap-8">
                {/* Profile Info */}
                <div className="md:w-1/3">
                  <div className="bg-indigo-50 rounded-lg p-6 mb-6">
                    <div className="flex flex-col items-center mb-4">
                      <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                        {profileData?.profilePicture ? (
                          <img src={profileData.profilePicture} alt="Profile" className="h-24 w-24 rounded-full object-cover" />
                        ) : (
                          <span className="text-3xl text-indigo-800 font-medium">
                            {(profileData?.displayName || user.email || '').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">{userData?.displayName || user.email}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Statistik</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-3 rounded text-center">
                          <p className="text-lg font-bold text-indigo-600">12</p>
                          <p className="text-xs text-gray-500">Artikel Dibaca</p>
                        </div>
                        <div className="bg-white p-3 rounded text-center">
                          <p className="text-lg font-bold text-indigo-600">3</p>
                          <p className="text-xs text-gray-500">Komentar</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    Keluar
                  </button>
                </div>
                
                {/* Profile Form */}
                <div className="md:w-2/3">
                  <form onSubmit={handleProfileSubmit}>
                    <div className="mb-4">
                      <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        id="displayName"
                        name="displayName"
                        value={profileData.displayName}
                        onChange={handleProfileChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={user.email}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-gray-100 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email tidak dapat diubah</p>
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                        Nama panggilan
                      </label>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        value={profileData.username}
                        onChange={handleProfileChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="photoURL" className="block text-sm font-medium text-gray-700 mb-1">
                        URL Foto Profil
                      </label>
                      <input
                        type="url"
                        id="profilePicture"
                        name="profilePicture"
                        value={profileData.profilePicture}
                        onChange={handleProfileChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://example.com/photo.jpg"
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveTab('dashboard')}
                        className="mr-3 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                      >
                        Simpan Perubahan
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard Section */
          <>
            {/* Hero Section */}
            <div className="bg-indigo-700 rounded-lg shadow-lg overflow-hidden mb-12">
              <div className="px-6 py-12 md:p-12">
                <div className="md:flex md:items-center md:justify-between">
                  <div className="md:w-1/2">
                    <h1 className="text-3xl font-bold text-white sm:text-4xl">
                      Selamat Datang di BlogKu
                    </h1>
                    <p className="mt-4 text-lg text-indigo-100">
                      Temukan artikel menarik tentang teknologi, pemrograman, dan pengembangan web.
                    </p>
                    <div className="mt-6">
                      {user == null ? (
                        <Link to="/register" className="inline-block bg-white text-indigo-700 px-6 py-3 rounded-md text-sm font-medium shadow-md hover:bg-gray-50">
                          Mulai Membaca
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPost(null);
                            setActiveTab('create-post');
                          }}
                          className="inline-block bg-white text-indigo-700 px-6 py-3 rounded-md text-sm font-medium shadow-md hover:bg-gray-50"
                        >
                          Tulis Postingan Baru
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-8 md:mt-0 md:w-2/5">
                    {user == null ? (
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Bergabung dengan Komunitas</h3>
                        <p className="text-gray-600 mb-4">Daftar sekarang untuk mendapatkan akses ke semua artikel dan fitur premium.</p>
                        <Link to="/register" className="block w-full text-center bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
                          Daftar Gratis
                        </Link>
                        <p className="mt-3 text-xs text-gray-500 text-center">
                          Sudah punya akun? <Link to="/login" className="text-indigo-600 hover:text-indigo-500">Masuk</Link>
                        </p>
                      </div>
                    ) : (
                      <p className="text-4xl font-bold text-white sm:text-4xl">Halo, {userData?.displayName || user.email}!</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Blog Posts Section */}
              <div className="md:w-2/3">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Artikel Terbaru</h2>
                {loadingPosts ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  </div>
                ) : blogPosts.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Belum ada postingan</h3>
                    <p className="mt-2 text-sm text-gray-500">Jadilah yang pertama membuat postingan!</p>
                    {user && (
                      <button
                        onClick={() => {
                          setEditingPost(null);
                          setActiveTab('create-post');
                        }}
                        className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                      >
                        Buat Postingan Pertama
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-6 md:grid-cols-1">
                      {blogPosts.map((post) => (
                        <div key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                          <div className="md:flex">
                            <div className="md:flex-shrink-0 md:w-1/3">
                              <img 
                                className="h-48 w-full object-cover md:h-full" 
                                src={post.image} 
                                alt={post.title}
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80';
                                }}
                              />
                            </div>
                            <div className="p-6 md:w-2/3">
                              <div className="flex items-center text-sm text-gray-500 mb-2">
                                <span>{post.date}</span>
                                <span className="mx-2">•</span>
                                <span>{post.readTime || '5 min read'}</span>
                              </div>
                              <div className="uppercase tracking-wide text-sm text-indigo-600 font-semibold mb-1">
                                {post.category || 'Uncategorized'}
                              </div>
                              <Link to={`/post/${post.id}`} className="block mt-1 text-lg font-semibold text-gray-900 hover:text-indigo-600">
                                {post.title}
                              </Link>
                              <p className="mt-3 text-gray-600">
                                {post.excerpt}
                              </p>
                              <div className="mt-4 flex items-center">
                                <div className="flex-shrink-0">
                                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <span className="text-indigo-800 font-medium">
                                      {(post.authorName || 'Unknown Author').split(' ').map(n => n[0]).join('')}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">
                                    {post.authorName || 'Unknown Author'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 flex justify-center">
                      <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50">
                        Muat Lebih Banyak
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Sidebar */}
              <div className="md:w-1/3">
                {/* Categories */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Kategori</h3>
                  <ul className="space-y-2">
                    {categories.map((category, index) => (
                      <li key={index} className="flex justify-between items-center">
                        <Link to={`/category/${category.name.toLowerCase()}`} className="text-gray-600 hover:text-indigo-600">
                          {category.name}
                        </Link>
                        <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
                          {category.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Popular Posts */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Populer</h3>
                  <ul className="space-y-4">
                    {popularPosts.map((post, index) => (
                      <li key={index}>
                        <Link to="#" className="text-gray-900 font-medium hover:text-indigo-600 text-sm">
                          {post.title}
                        </Link>
                        <p className="text-xs text-gray-500 mt-1">{post.views} views</p>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Newsletter */}
                <div className="bg-indigo-50 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Berlangganan Newsletter</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Dapatkan update artikel terbaru langsung ke inbox Anda.
                  </p>
                  <form className="mt-4">
                    <input
                      type="email"
                      placeholder="Alamat email Anda"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    <button
                      type="submit"
                      className="mt-3 w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                    >
                      Berlangganan
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white mt-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center md:order-2 space-x-6">
              {/* Social media links */}
            </div>
            <div className="mt-8 md:mt-0 md:order-1">
              <p className="text-center text-base text-gray-400">
                &copy; 2024 BlogKu. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BlogDashboard;