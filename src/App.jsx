import { useEffect, useState } from 'react'
import './App.css'
import RegisterPage from './component/RegistrationPage'
import LoginPage from './component/LoginPage'
import BlogDashboard from './component/BlogDashboard'
import { ToastContainer } from 'react-toastify'
import { Routes, Route } from 'react-router-dom'
import { setupAuthListener, useAuthStore } from './store/authStore'
import { auth } from './database/firebase.js'
import BlogReader from './component/BlogReader.jsx'

function App() {
const {user } = useAuthStore();
useEffect(() => {
  // Setup listener untuk perubahan auth state
  const unsubscribe = setupAuthListener(auth);
  
  console.log("usernya",user);
    // Cleanup listener ketika komponen unmount
    return () => unsubscribe();
  }, []);
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/" element={<BlogDashboard />} />
        <Route path="/register" element={ user? <BlogDashboard/> : <RegisterPage />} />
        <Route path="/login" element={user? <BlogDashboard/> : <LoginPage />} />
        <Route path="/post/:postId" element={<BlogReader />} />
      </Routes>
    </>
  )
}

export default App
