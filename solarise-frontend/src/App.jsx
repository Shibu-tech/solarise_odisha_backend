import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectDetailsPage from './pages/projects/ProjectDetailsPage';
import NewProjectPage from './pages/projects/NewProjectPage';
import ConsumersPage from './pages/consumers/ConsumersPage';
import ConsumerDetailsPage from './pages/consumers/ConsumerDetailsPage';
import NewConsumerPage from './pages/consumers/NewConsumerPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import DocumentUploadPage from './pages/documents/DocumentUploadPage';
import DocumentDetailsPage from './pages/documents/DocumentDetailsPage';
import DocumentResolvePage from './pages/documents/DocumentResolvePage';
import VerificationQueuePage from './pages/documents/VerificationQueuePage';
import PaymentsPage from './pages/payments/PaymentsPage';
import NewPaymentPage from './pages/payments/NewPaymentPage';
import PaymentDetailsPage from './pages/payments/PaymentDetailsPage';
import UsersPage from './pages/users/UsersPage';
import AreaBlocksPage from './pages/areaBlocks/AreaBlocksPage';
import UserProfilePage from './pages/profile/UserProfilePage';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/new" element={<NewProjectPage />} />
          <Route path="projects/:id" element={<ProjectDetailsPage />} />
          <Route path="consumers" element={<ConsumersPage />} />
          <Route path="consumers/new" element={<NewConsumerPage />} />
          <Route path="consumers/:id" element={<ConsumerDetailsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/upload" element={<DocumentUploadPage />} />
          <Route path="documents/:id" element={<DocumentDetailsPage />} />
          <Route path="documents/:id/resolve" element={<DocumentResolvePage />} />
          <Route path="verification-queue" element={<VerificationQueuePage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="payments/new" element={<NewPaymentPage />} />
          <Route path="payments/:id" element={<PaymentDetailsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="area-blocks" element={<AreaBlocksPage />} />
          <Route path="profile" element={<UserProfilePage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;