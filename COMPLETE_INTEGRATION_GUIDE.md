# Document Correction Workflow - Complete Integration Example

## Implementation Steps

### Step 1: Create New Pages

Create these two new pages in your pages directory:

#### Page 1: src/pages/PendingCorrectionsPage.jsx

```jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PendingCorrectionsPanel } from '../components/documents';
import { RoleGuard } from '../components/auth/RoleGuard';

export const PendingCorrectionsPage = () => {
  const { user } = useAuth();

  return (
    <RoleGuard requiredRole="agent">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PendingCorrectionsPanel userId={user?.id} />
        </div>
      </div>
    </RoleGuard>
  );
};

export default PendingCorrectionsPage;
```

#### Page 2: src/pages/VerificationQueuePage.jsx

```jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { VerificationQueuePanel } from '../components/documents';
import { RoleGuard } from '../components/auth/RoleGuard';

export const VerificationQueuePage = () => {
  const { user } = useAuth();

  return (
    <RoleGuard requiredRoles={['doc_team', 'admin']}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <VerificationQueuePanel />
        </div>
      </div>
    </RoleGuard>
  );
};

export default VerificationQueuePage;
```

---

### Step 2: Add Routes to Your App

#### In src/App.jsx

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Import the new pages
import PendingCorrectionsPage from './pages/PendingCorrectionsPage';
import VerificationQueuePage from './pages/VerificationQueuePage';

// Existing pages...
import DashboardPage from './pages/dashboard/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Existing routes */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />

        {/* NEW: Document Correction Workflow Routes */}
        <Route 
          path="/pending-corrections" 
          element={<PendingCorrectionsPage />} 
        />
        <Route 
          path="/verification-queue" 
          element={<VerificationQueuePage />} 
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

### Step 3: Add Navigation Links

#### Update Sidebar (src/components/Sidebar.jsx)

```jsx
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CorrectionsBadge, VerificationQueueBadge } from './documents';
import api from '../services/api';

export const Sidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [correctionCount, setCorrectionCount] = useState(0);
  const [verificationCount, setVerificationCount] = useState(0);

  // Fetch correction count for agents
  useEffect(() => {
    if (user?.role === 'agent') {
      fetchCorrectionCount();
      // Refresh every 60 seconds
      const interval = setInterval(fetchCorrectionCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch verification count for doc team
  useEffect(() => {
    if (user?.role === 'doc_team' || user?.role === 'admin') {
      fetchVerificationCount();
      // Refresh every 60 seconds
      const interval = setInterval(fetchVerificationCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchCorrectionCount = async () => {
    try {
      const res = await api.get('/api/actions');
      const actions = res.data?.data || [];
      const pendingCorrections = actions.filter(
        (a) => a.assigned_to === user.id && 
               a.status !== 'resolved' && 
               a.status !== 'cancelled' &&
               ['electric_bill_name_correction', 'bank_passbook_name_correction', 'bank_passbook_update', 
                'ownership_transfer', 'commercial_to_domestic', 'other'].includes(a.action_type)
      );
      setCorrectionCount(pendingCorrections.length);
    } catch (err) {
      console.error('Error fetching corrections:', err);
    }
  };

  const fetchVerificationCount = async () => {
    try {
      const res = await api.get('/api/documents');
      const docs = res.data?.data || [];
      const pendingVerification = docs.filter(
        (d) => d.status === 'uploaded' && d.version > 1
      );
      setVerificationCount(pendingVerification.length);
    } catch (err) {
      console.error('Error fetching verification queue:', err);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-4 space-y-4">
      {/* Logo/Brand */}
      <div className="text-2xl font-bold text-emerald-600 mb-8">Solarise</div>

      {/* Navigation Links */}
      <nav className="space-y-2">
        <SidebarLink 
          icon="📊" 
          label="Dashboard" 
          onClick={() => navigate('/dashboard')}
        />
        <SidebarLink 
          icon="☀️" 
          label="Projects" 
          onClick={() => navigate('/projects')}
        />

        {/* Agent-Specific Links */}
        {user?.role === 'agent' && (
          <SidebarLink 
            icon="📋"
            label="Pending Corrections"
            badge={correctionCount}
            onClick={() => navigate('/pending-corrections')}
            className={correctionCount > 0 ? 'border-l-4 border-amber-400 bg-amber-50' : ''}
          />
        )}

        {/* Document Team-Specific Links */}
        {(user?.role === 'doc_team' || user?.role === 'admin') && (
          <SidebarLink 
            icon="✓"
            label="Verification Queue"
            badge={verificationCount}
            onClick={() => navigate('/verification-queue')}
            className={verificationCount > 0 ? 'border-l-4 border-blue-400 bg-blue-50' : ''}
          />
        )}

        {/* More links... */}
      </nav>

      {/* User Info */}
      <div className="mt-auto pt-4 border-t border-gray-200">
        <div className="text-sm">
          <p className="font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
          <p className="text-gray-500 text-xs mt-1">
            {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
          </p>
        </div>
      </div>
    </div>
  );
};

const SidebarLink = ({ icon, label, badge, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`
      w-full text-left px-4 py-3 rounded-lg font-medium
      hover:bg-gray-100 transition flex items-center justify-between
      ${className}
    `}
  >
    <span className="flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      {label}
    </span>
    {badge > 0 && (
      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </button>
);

export default Sidebar;
```

---

### Step 4: Update TopBar (Optional)

#### src/components/TopBar.jsx

```jsx
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { VerificationQueueBadge } from './documents';
import api from '../services/api';
import { useEffect, useState } from 'react';

export const TopBar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [verificationCount, setVerificationCount] = useState(0);

  useEffect(() => {
    if (user?.role === 'doc_team' || user?.role === 'admin') {
      fetchVerificationCount();
      const interval = setInterval(fetchVerificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchVerificationCount = async () => {
    try {
      const res = await api.get('/api/documents');
      const docs = res.data?.data || [];
      const pending = docs.filter((d) => d.status === 'uploaded' && d.version > 1);
      setVerificationCount(pending.length);
    } catch (err) {
      console.error('Error fetching verification count:', err);
    }
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex-1">
        {/* Breadcrumb or page title goes here */}
      </div>

      <div className="flex items-center gap-4">
        {/* Verification Queue Badge */}
        {(user?.role === 'doc_team' || user?.role === 'admin') && (
          <VerificationQueueBadge 
            count={verificationCount}
            onClick={() => navigate('/verification-queue')}
          />
        )}

        {/* User menu, settings, etc. */}
      </div>
    </div>
  );
};

export default TopBar;
```

---

### Step 5: Integrate Notifications (Optional but Recommended)

The components will alert users, but you can enhance this by integrating with your notification system:

#### Example: Update NotificationPopup.jsx

```jsx
import { useEffect, useState } from 'react';
import api from '../services/api';

export const NotificationPopup = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Poll for notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    fetchNotifications(); // Initial fetch
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      const unread = res.data?.data?.filter((n) => !n.read_at) || [];
      setNotifications(unread);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            p-4 rounded-lg shadow-lg max-w-sm text-white
            ${notification.title.includes('Correction') ? 'bg-amber-500' : 'bg-blue-500'}
          `}
        >
          <p className="font-bold">{notification.title}</p>
          <p className="text-sm mt-1">{notification.body}</p>
        </div>
      ))}
    </div>
  );
};

export default NotificationPopup;
```

---

## Workflow Summary for Users

### Agent Workflow

1. **Receives Notification**: "Correction Required: Electric Bill"
2. **Navigates to**: `/pending-corrections`
3. **Views**: List of corrections with reasons
4. **Clicks**: "Re-upload Corrected Doc"
5. **Uploads**: New document version
6. **Waits**: For Document Team verification
7. **Receives**: "Document Correction Accepted ✓" notification
8. **Done**: Action automatically closes

### Document Team Workflow

1. **Sees Badge**: Verification Queue badge shows count
2. **Navigates to**: `/verification-queue`
3. **Selects**: Document to review
4. **Compares**: Old vs new versions
5. **Clicks**: "Verify & Accept" or "Reject"
6. **If Accepted**: 
   - Agent gets notification
   - Action resolves
   - Project status updated
7. **If Rejected**:
   - Sends detailed reason
   - Agent re-uploads again

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Pages not accessible | Check RoleGuard component and user role |
| Components not showing data | Check API endpoints and network tab |
| Badges not updating | Increase polling interval or add manual refresh |
| Uploads failing | Verify S3 connection with `/api/documents/s3-health` |
| Modal won't close | Check for JavaScript errors in console |

---

## Testing Checklist

- [ ] Agent can navigate to `/pending-corrections`
- [ ] Corrections list shows with correct status
- [ ] Can click "Re-upload" and open modal
- [ ] Can select file and submit
- [ ] Success notification appears
- [ ] Document Team can navigate to `/verification-queue`
- [ ] Can select document and see details
- [ ] Can verify or reject document
- [ ] Agent receives notification on verification
- [ ] Badges update correctly
- [ ] All status transitions recorded in database

---

## Production Deployment Notes

1. **Enable Notifications**: Implement real-time notifications (WebSockets/Polling)
2. **Security**: Ensure role-based access control is enforced
3. **Caching**: Implement smart cache invalidation for counts
4. **Error Tracking**: Log all API errors for monitoring
5. **Performance**: Implement pagination for large lists
6. **Mobile**: Test responsive design on mobile devices
7. **Analytics**: Track workflow completion rates

---

## Future Enhancements

- Real-time WebSocket notifications
- Bulk verification actions
- Email notifications to agents
- Document similarity detection
- Auto-approve with confidence scoring
- Mobile app support
- Offline document capture
- Document scanning from camera
