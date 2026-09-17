import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import pool from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import areaBlocksRoutes from "./routes/areaBlocks.routes.js";
import consumersRoutes from "./routes/consumers.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import documentsRoutes from "./routes/documents.routes.js";
import bankLoansRoutes from "./routes/bankLoans.routes.js";
import actionRequiredRoutes from "./routes/actionRequired.routes.js";
import ownershipTransfersRoutes from "./routes/ownershipTransfers.routes.js";
import materialDeliveriesRoutes from "./routes/materialDeliveries.routes.js";
import installationProgressRoutes from "./routes/installationProgress.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import statusHistoryRoutes from "./routes/statusHistory.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import transfersRoutes from "./routes/transfers.routes.js";
import { authenticateToken } from "./middleware/auth.middleware.js";

// import bcrypt from "bcryptjs";
import errorHandler from "./middleware/errorHandler.js";

// ─── SWAGGER (START) ── Remove this block after testing is complete ─────────
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.js";
// ─── SWAGGER (END) ─────────────────────────────────────────────────────────


const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

// ⚡ Performance & Response Time Logger Middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`⚡ [API Speed] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});



app.get("/", (req, res) => {
    res.send("Api Working Fine.");
});
// ─── SWAGGER UI (START) ── Remove this block after testing is complete ──────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Solarise Odisha API Docs',
}));
app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});
// ─── SWAGGER UI (END) ──────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use(authenticateToken);
app.use("/api/users", usersRoutes);
app.use("/api/areaBlocks", areaBlocksRoutes);
app.use('/api/consumers', consumersRoutes);
app.use('/api/projects', projectsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/bank-loans", bankLoansRoutes);
app.use("/api/actions", actionRequiredRoutes);
app.use("/api/ownership-transfers", ownershipTransfersRoutes);
app.use("/api/material-deliveries", materialDeliveriesRoutes);
app.use("/api/installation", installationProgressRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/status-history", statusHistoryRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/transfers", transfersRoutes);

// bcrypt.hash('chinu123', 10).then(hash => console.log(hash));


// Global error handler — must be LAST middleware
app.use(errorHandler);

pool.query("SELECT NOW()", (err, res) => {
    if (err) {
        console.error("Database connectivity check failed:", err);
        return;
    }
    console.log(res.rows);
});

app.listen(PORT, HOST, () => {
    console.log(`Server running on port ${PORT} bound to ${HOST} (Wi-Fi accessible)`);
});