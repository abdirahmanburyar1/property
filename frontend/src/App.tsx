import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { fetchCurrentUser } from './store/slices/authSlice';
import MainLayout from './components/layouts/MainLayout';
import ProtectedRoute from './components/routes/ProtectedRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import PropertyForm from './pages/PropertyForm';
import PropertyDetails from './pages/PropertyDetails';
import PropertyTypes from './pages/PropertyTypes';
import Payments from './pages/Payments';
import PaymentDetails from './pages/PaymentDetails';
import Settings from './pages/Settings';
import UsersPage from './pages/Users';
import Roles from './pages/Roles';
import Permissions from './pages/Permissions';
import Sections from './pages/Sections';
import SubSections from './pages/SubSections';
import Reports from './pages/Reports';
import PropertyTaxNotice from './pages/PropertyTaxNotice';

function App() {
  const dispatch = useAppDispatch();
  const { token, user } = useAppSelector((state) => state.auth);

  // Restore user from token on page reload (token is in localStorage; user is lost on reload)
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, token, user]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Navigate to="/dashboard" replace />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/properties"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Properties />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/properties/new"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PropertyForm />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/properties/:id/edit"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PropertyForm />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/properties/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PropertyDetails />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/properties/:id/notice"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PropertyTaxNotice />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/property-types"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PropertyTypes />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Payments />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PaymentDetails />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Reports />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Settings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <MainLayout>
                <UsersPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Roles />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/permissions"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Permissions />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sections"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Sections />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subsections"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SubSections />
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
