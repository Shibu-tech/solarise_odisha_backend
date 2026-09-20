import pool from "../config/db.js";

// GET /api/projects - List all projects with consumer name and status (filtered by assigned role/user)
export const getAllProjects = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        const role = req.user?.role;
        const { assigned_site_manager, created_by } = req.query;

        let query = `
            SELECT 
                p.id,
                p.consumer_id,
                COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') AS consumer_name,
                c.electric_consumer_no,
                c.created_by AS consumer_created_by,
                p.current_status,
                p.registration_no,
                p.capacity_kw,
                p.assigned_site_manager,
                u.first_name || ' ' || u.last_name AS site_manager_name,
                p.created_at,
                p.updated_at
            FROM projects p
            JOIN consumers c ON p.consumer_id = c.id
            LEFT JOIN users u ON p.assigned_site_manager = u.id
        `;

        const conditions = [];
        const params = [];

        if (role === 'agent') {
            params.push(userId);
            conditions.push(`c.created_by = $${params.length}`);
        } else if (role === 'site_manager') {
            params.push(userId);
            conditions.push(`(p.assigned_site_manager = $${params.length} OR c.created_by = $${params.length})`);
        } else {
            if (assigned_site_manager) {
                params.push(assigned_site_manager);
                conditions.push(`p.assigned_site_manager = $${params.length}`);
            }
            if (created_by) {
                params.push(created_by);
                conditions.push(`c.created_by = $${params.length}`);
            }
        }

        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(' AND ');
        }

        query += ` ORDER BY p.created_at DESC`;

        const result = await pool.query(query, params);
        res.status(200).json({ count: result.rowCount, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/projects/dashboard - Aggregate counts by status (filtered by assigned role/user)
export const getProjectsDashboard = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        const role = req.user?.role;
        const { assigned_site_manager, created_by } = req.query;

        const conditions = [];
        const params = [];

        if (role === 'agent') {
            params.push(userId);
            conditions.push(`c.created_by = $${params.length}`);
        } else if (role === 'site_manager') {
            params.push(userId);
            conditions.push(`(p.assigned_site_manager = $${params.length} OR c.created_by = $${params.length})`);
        } else {
            if (assigned_site_manager) {
                params.push(assigned_site_manager);
                conditions.push(`p.assigned_site_manager = $${params.length}`);
            }
            if (created_by) {
                params.push(created_by);
                conditions.push(`c.created_by = $${params.length}`);
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ` + conditions.join(' AND ') : '';

        const statusQuery = `
            SELECT 
                p.current_status, 
                COUNT(*)::INTEGER AS count
            FROM projects p
            JOIN consumers c ON p.consumer_id = c.id
            ${whereClause}
            GROUP BY p.current_status
            ORDER BY count DESC
        `;

        const totalQuery = `
            SELECT COUNT(*)::INTEGER AS total 
            FROM projects p
            JOIN consumers c ON p.consumer_id = c.id
            ${whereClause}
        `;

        const result = await pool.query(statusQuery, params);
        const totalResult = await pool.query(totalQuery, params);
        const total = totalResult.rows[0]?.total || 0;

        res.status(200).json({
            total_projects: total,
            data: result.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/projects/status/:status - Filter by current status
export const getProjectsByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const result = await pool.query(`
            SELECT 
                p.id,
                p.consumer_id,
                COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') AS consumer_name,
                c.electric_consumer_no,
                p.current_status,
                p.registration_no,
                p.capacity_kw,
                p.assigned_site_manager,
                u.first_name || ' ' || u.last_name AS site_manager_name,
                p.created_at,
                p.updated_at
            FROM projects p
            JOIN consumers c ON p.consumer_id = c.id
            LEFT JOIN users u ON p.assigned_site_manager = u.id
            WHERE p.current_status = $1
            ORDER BY p.created_at DESC
        `, [status]);

        res.status(200).json({ count: result.rowCount, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/projects/:id - Get full project detail
export const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const projectResult = await pool.query(`
            SELECT 
                p.id,
                p.consumer_id,
                COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') AS consumer_name,
                c.address AS consumer_address,
                c.phone_primary AS consumer_phone,
                c.electric_consumer_no,
                c.payment_mode,
                p.current_status,
                p.registration_no,
                p.capacity_kw,
                p.assigned_site_manager,
                u.first_name || ' ' || u.last_name AS site_manager_name,
                u.email AS site_manager_email,
                u.phone AS site_manager_phone,
                p.created_at,
                p.updated_at
            FROM projects p
            JOIN consumers c ON p.consumer_id = c.id
            LEFT JOIN users u ON p.assigned_site_manager = u.id
            WHERE p.id = $1
        `, [id]);

        if (projectResult.rowCount === 0) {
            return res.status(404).json({ error: "Project not found" });
        }

        const historyResult = await pool.query(`
            SELECT 
                sh.id,
                sh.from_status,
                sh.to_status,
                sh.changed_by,
                u.first_name || ' ' || u.last_name AS changed_by_name,
                sh.remarks,
                sh.changed_at
            FROM status_history sh
            LEFT JOIN users u ON sh.changed_by = u.id
            WHERE sh.project_id = $1
            ORDER BY sh.changed_at DESC
        `, [id]);

        const projectData = {
            ...projectResult.rows[0],
            status_history: historyResult.rows
        };

        res.status(200).json({ data: projectData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/projects - Create project (auto-linked to consumer)
export const createProject = async (req, res) => {
    try {
        const { consumer_id, registration_no, capacity_kw, assigned_site_manager, current_status } = req.body;

        if (!consumer_id) {
            return res.status(400).json({ error: "consumer_id is required" });
        }

        const result = await pool.query(`
            INSERT INTO projects (consumer_id, registration_no, capacity_kw, assigned_site_manager, current_status)
            VALUES ($1, $2, $3, $4, COALESCE($5, 'new_registration'::public.project_status))
            RETURNING *
        `, [
            consumer_id,
            registration_no || null,
            capacity_kw || null,
            assigned_site_manager || null,
            current_status || 'new_registration'
        ]);

        res.status(201).json({ data: result.rows[0] });
    } catch (err) {
        if (err.code === "23505") {
            if (err.constraint === "projects_consumer_id_key") {
                return res.status(409).json({ error: "A project already exists for this consumer" });
            }
            if (err.constraint === "projects_registration_no_key") {
                return res.status(409).json({ error: "Registration number already exists" });
            }
            return res.status(409).json({ error: "Duplicate entry error", detail: err.detail });
        }
        if (err.code === "23503") {
            return res.status(400).json({ error: "Referenced consumer or user does not exist" });
        }
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/projects/:id/status - Status transition (with transaction & status history record)
export const updateProjectStatus = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { status, to_status, current_status, changed_by, remarks } = req.body;
        const newStatus = to_status || status || current_status;
        const changedBy = changed_by || req.user?.userId || req.user?.id || 1;

        if (!newStatus) {
            return res.status(400).json({ error: "New status (to_status) is required" });
        }

        await client.query("BEGIN");

        // 1. Check existing project and retrieve current status
        const projectCheck = await client.query(
            "SELECT id, current_status FROM projects WHERE id = $1",
            [id]
        );

        if (projectCheck.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Project not found" });
        }

        const fromStatus = projectCheck.rows[0].current_status;

        // 2. Update project status
        const updateResult = await client.query(`
            UPDATE projects
            SET current_status = $1, updated_at = now()
            WHERE id = $2
            RETURNING *
        `, [newStatus, id]);

        // 3. Insert status change record into status_history
        const historyResult = await client.query(`
            INSERT INTO status_history (project_id, from_status, to_status, changed_by, remarks)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [id, fromStatus, newStatus, changedBy, remarks || null]);

        await client.query("COMMIT");

        res.status(200).json({
            message: "Project status updated successfully",
            data: updateResult.rows[0],
            history: historyResult.rows[0]
        });
    } catch (err) {
        await client.query("ROLLBACK");
        if (err.code === "22P02" || err.code === "22008") {
            return res.status(400).json({ error: "Invalid status value provided" });
        }
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// PUT /api/projects/:id - General update for project details
export const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { registration_no, capacity_kw, assigned_site_manager, current_status } = req.body;

        const result = await pool.query(`
            UPDATE projects
            SET registration_no = COALESCE($1, registration_no),
                capacity_kw = COALESCE($2, capacity_kw),
                assigned_site_manager = COALESCE($3, assigned_site_manager),
                current_status = COALESCE($4, current_status),
                updated_at = now()
            WHERE id = $5
            RETURNING *
        `, [registration_no, capacity_kw, assigned_site_manager, current_status, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Project not found" });
        }

        res.status(200).json({ data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/projects/:id - Delete project
export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "DELETE FROM projects WHERE id = $1 RETURNING id, consumer_id, current_status",
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Project not found" });
        }
        res.status(200).json({ message: "Project deleted successfully", data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
