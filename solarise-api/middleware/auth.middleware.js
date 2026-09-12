import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Authorization token missing" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }
        req.user = decoded;
        next();
    });
};

export const optionalAuthenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            req.user = null;
        } else {
            req.user = decoded;
        }
        next();
    });
};

// roles: array of allowed roles, e.g. ['admin', 'agent']
// export const authorizeRoles = (...roles) => (req, res, next) => {
//     if (!req.user) {
//         return res.status(401).json({ error: "Not authenticated" });
//     }
//     const userRole = req.user.role;
//     if (!userRole) {
//         return res.status(403).json({ error: "User role not found on token" });
//     }
//     if (roles.length > 0 && !roles.includes(userRole)) {
//         return res.status(403).json({ error: "Insufficient permissions" });
//     }
//     next();
// };

// export const authorizeRoles = (...roles) => (req, res, next) => {
//     const userRole = req.user.role;  // Extracted from JWT
//     if (!roles.includes(userRole)) {
//         return res.status(403).json({ error: "Insufficient permissions" });
//     }
//     next();
// };

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