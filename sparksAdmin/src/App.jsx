import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CoursesPage from './pages/CoursesPage';
import PlaylistsPage from './pages/PlaylistsPage';
import PlaylistDetailPage from './pages/PlaylistDetailPage';
import TestsPage from './pages/TestsPage';
import CategoriesPage from './pages/CategoriesPage';
import StudentsPage from './pages/StudentsPage';
import StudentDetailPage from './pages/StudentDetailPage';
import TeachersPage from './pages/TeachersPage';
import TeacherDetailPage from './pages/TeacherDetailPage';
import ReelsPage from './pages/ReelsPage';
import BannersPage from './pages/BannersPage';
import Studentschat from './components/supportchat/Studentschat';
import TeacherChat from './components/supportchat/TeacherChat';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Administrative Suite Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/playlists" element={<PlaylistsPage />} />
              <Route path="/playlists/:playlistId" element={<PlaylistDetailPage />} />
              <Route path="/tests" element={<TestsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/students/:studentId" element={<StudentDetailPage />} />
              <Route path="/teachers" element={<TeachersPage />} />
              <Route path="/teachers/:teacherId" element={<TeacherDetailPage />} />
              <Route path="/reels" element={<ReelsPage />} />
              <Route path="/banners" element={<BannersPage />} />
              <Route path="/support/students" element={<Studentschat />} />
              <Route path="/support/teachers" element={<TeacherChat />} />
            </Route>
          </Route>

          {/* Catch-all redirect to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
