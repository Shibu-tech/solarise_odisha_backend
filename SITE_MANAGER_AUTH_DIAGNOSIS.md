# Site Manager Authorization Issue - Diagnostic Guide

## Problem
- `site_manager` role is getting "Insufficient permissions" (403) error on `PATCH /api/projects/:id/status`
- **But** `admin` role can access the same endpoint fine
- Route authorization shows `site_manager` IS included: `authorizeRoles('doc_team', 'site_manager', 'admin')`

## Code Verification
All role checks have been verified and look correct:

### ✅ Route Level (Line 160 in projects.routes.js)
```javascript
router.patch("/:id/status", authenticateToken, authorizeRoles('doc_team', 'site_manager', 'admin'), updateProjectStatus);
```
`site_manager` IS listed.

### ✅ Middleware (auth.middleware.js)
```javascript
export const authorizeRoles = (...roles) => (req, res, next) => {
    const userRole = req.user.role;  // Extracted from JWT
    if (!roles.includes(userRole)) {
        return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
};
```
Logic is correct - checks if user's role is in the allowed roles array.

### ✅ Controller (projects.controller.js)
No additional authorization checks in `updateProjectStatus()`.

## Root Cause Analysis

Since admin works but site_manager doesn't, the issue is **NOT** in the code authorization logic. The problem must be:

### Likely Causes (in order of probability)

1. **JWT Token Missing Role** 
   - The token being issued for site_manager doesn't include the `role` field
   - Token would have: `{ userId, ... }` but missing `{ userId, role, ... }`

2. **Database User Has Wrong Role**
   - The site_manager user in the database doesn't have `role='site_manager'`
   - May have `role='agent'` or some other value
   - Or `role` column is NULL

3. **Role String Mismatch** 
   - Database has `'site_manager'` but token has `'siteManager'` (camelCase vs snake_case)
   - Or extra spaces: `'site_manager '` vs `'site_manager'`

4. **Frontend Caching**
   - Old token cached in localStorage
   - Session not properly refreshed after role change

## Diagnostic Steps

### Step 1: Verify JWT Token Contents
```bash
# 1. Log in as site_manager (prakash.behera@example.com / password from db)
# 2. Open browser DevTools (F12)
# 3. Go to Application/Storage > Local Storage > your_domain
# 4. Find the token (usually stored as 'token', 'auth_token', or 'jwt')
# 5. Copy the token and decode it at jwt.io
# 6. Check that the decoded token contains:
{
  "userId": 2,
  "role": "site_manager"   <-- MUST be exactly this
}
```

### Step 2: Verify Database User Role
```sql
-- Run this query on your PostgreSQL database:
SELECT id, first_name, last_name, email, phone, role, is_active 
FROM users 
WHERE email = 'prakash.behera@example.com' OR role = 'site_manager';

-- Output should show:
-- id: 2
-- role: 'site_manager'  <-- Must be exactly this string
-- is_active: true
```

### Step 3: Test API Directly with cURL
```bash
# Get a valid site_manager token first by logging in
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "7894561230", "password": "password123"}'

# Copy the token from response
# Then test the problematic endpoint
curl -X PATCH http://localhost:5000/api/projects/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"status": "doc_verified"}'

# Should return 200, not 403
```

## Solutions by Root Cause

### If JWT token is missing `role`:
**Check:** `solarise-api/controllers/auth.controller.js`

The login and register functions use:
```javascript
const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
```

This should be working. Verify:
- `user.role` is not NULL or undefined in the database query results
- Token is being read correctly from the response

**Fix:** Ensure `role` column is not NULL in users table.

### If database user has wrong role:
```sql
-- Update the site_manager user to have correct role
UPDATE users 
SET role = 'site_manager'::user_role 
WHERE email = 'prakash.behera@example.com';

-- Verify
SELECT id, email, role FROM users WHERE email = 'prakash.behera@example.com';
```

### If role has extra spaces or case issues:
```sql
-- Check for spacing issues
SELECT id, email, role, length(role) as role_length 
FROM users 
WHERE first_name = 'Omprakash';

-- Fix if needed (though cast should prevent this)
UPDATE users 
SET role = trim(lower(role))::user_role 
WHERE email = 'prakash.behera@example.com';
```

### If frontend caching:
1. Clear browser localStorage and sessionStorage
   - F12 > Application > Storage > Clear All
2. Or try in private/incognito window
3. Or delete and re-login

## Summary Checklist
- [ ] Decoded JWT token contains `role: 'site_manager'` 
- [ ] Database user has `role = 'site_manager'` and `is_active = true`
- [ ] Cleared browser cache/localStorage
- [ ] Tested API call with cURL using valid token
- [ ] Backend routes.js shows site_manager in authorizeRoles
- [ ] Middleware logic checks roles correctly

## Advanced: Enable Debug Logging

Add temporary logging to `auth.middleware.js` to see what role is being extracted:

```javascript
export const authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    const userRole = req.user.role;
    console.log('🔐 Auth Check:', { userRole, allowed: roles, allowed_check: roles.includes(userRole) });
    if (!userRole) {
        return res.status(403).json({ error: "User role not found on token" });
    }
    if (roles.length > 0 && !roles.includes(userRole)) {
        console.error('❌ Role mismatch:', { userRole, roles });
        return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
};
```

Then check server logs to see what role is being checked against.

## Contact
If issue persists after these diagnostics, provide:
1. Output of the cURL test
2. Decoded JWT token (with userId masked if needed)
3. Result of the SQL query
4. Server console logs with debug output enabled
