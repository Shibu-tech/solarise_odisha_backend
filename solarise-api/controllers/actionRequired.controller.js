import pool from "../config/db.js";
import { notifyUsers } from "../utils/notificationHelper.js";

// 1. GET /api/actions - List all open actions
export const getAllOpenActions = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                ar.id,
                ar.project_id,
                ar.action_type,
                ar.detail,
                ar.status,
                ar.raised_by,
                u1.first_name || ' ' || u1.last_name AS raised_by_name,
                ar.raised_at,
                ar.assigned_to,
                u2.first_name || ' ' || u2.last_name AS assigned_to_name,
                ar.resolved_by,
                u3.first_name || ' ' || u3.last_name AS resolved_by_name,
                ar.resolved_at,
                p.consumer_id,
                p.current_status AS project_status
            FROM action_required ar
            JOIN projects p ON ar.project_id = p.id
            LEFT JOIN users u1 ON ar.raised_by = u1.id
            LEFT JOIN users u2 ON ar.assigned_to = u2.id
            LEFT JOIN users u3 ON ar.resolved_by = u3.id
            WHERE ar.status NOT IN ('resolved', 'cancelled')
            ORDER BY ar.raised_at DESC
        `);
        res.status(200).json({ count: result.rowCount, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 1b. GET /api/actions/my-open-actions - Open actions assigned to the current user
export const getMyOpenActions = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "User authentication required" });
        }
        const result = await pool.query(`
            SELECT
                ar.id,
                ar.project_id,
                ar.action_type,
                ar.detail,
                ar.status,
                ar.raised_by,
                u1.first_name || ' ' || u1.last_name AS raised_by_name,
                ar.raised_at,
                ar.assigned_to,
                u2.first_name || ' ' || u2.last_name AS assigned_to_name,
                ar.resolved_by,
                u3.first_name || ' ' || u3.last_name AS resolved_by_name,
                ar.resolved_at,
                p.consumer_id,
                p.current_status AS project_status
            FROM action_required ar
            JOIN projects p ON ar.project_id = p.id
            LEFT JOIN users u1 ON ar.raised_by = u1.id
            LEFT JOIN users u2 ON ar.assigned_to = u2.id
            LEFT JOIN users u3 ON ar.resolved_by = u3.id
            WHERE ar.assigned_to = $1 AND ar.status NOT IN ('resolved', 'cancelled')
            ORDER BY ar.raised_at DESC
        `, [userId]);
        res.status(200).json({ count: result.rowCount, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// 2. GET /api/actions/project/:projectId - Actions for a project
export const getActionsByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const result = await pool.query(`
            SELECT 
                ar.id,
                ar.project_id,
                ar.action_type,
                ar.detail,
                ar.status,
                ar.raised_by,
                u1.first_name || ' ' || u1.last_name AS raised_by_name,
                ar.raised_at,
                ar.assigned_to,
                u2.first_name || ' ' || u2.last_name AS assigned_to_name,
                ar.resolved_by,
                u3.first_name || ' ' || u3.last_name AS resolved_by_name,
                ar.resolved_at
            FROM action_required ar
            LEFT JOIN users u1 ON ar.raised_by = u1.id
            LEFT JOIN users u2 ON ar.assigned_to = u2.id
            LEFT JOIN users u3 ON ar.resolved_by = u3.id
            WHERE ar.project_id = $1
            ORDER BY ar.raised_at DESC
        `, [projectId]);
        res.status(200).json({ count: result.rowCount, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. POST /api/actions - Raise new action (doc team / admin / site_manager)
export const createAction = async (req, res) => {
    try {
        const { project_id, action_type, detail, raised_by, assigned_to } = req.body;
        const raisedBy = raised_by || req.user?.userId || req.user?.id || 1;

        if (!project_id || !action_type || !raisedBy) {
            return res.status(400).json({ error: "project_id, action_type, and raised_by are required" });
        }

        // Verify project exists
        const projectCheck = await pool.query(
            "SELECT id, current_status, consumer_id FROM projects WHERE id = $1",
            [project_id]
        );
        if (projectCheck.rowCount === 0) {
            return res.status(404).json({ error: "Project not found" });
        }

        const prevStatus = projectCheck.rows[0].current_status;
        const consumerId = projectCheck.rows[0].consumer_id;

        const result = await pool.query(`
            INSERT INTO action_required (project_id, action_type, detail, raised_by, assigned_to)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [project_id, action_type, detail || null, raisedBy, assigned_to || null]);

        // Auto-update project current_status to 'action_required'
        await pool.query(`
            UPDATE projects
            SET current_status = 'action_required', updated_at = now()
            WHERE id = $1
        `, [project_id]);

        // Auto-update matching consumer documents to status 'action_required'
        if (consumerId) {
            await pool.query(`
                UPDATE documents
                SET status = 'action_required'
                WHERE consumer_id = $1
                  AND (
                    ($2 = 'electric_bill_name_correction' AND doc_type::text IN ('electric_bill', 'electricity_bill')) OR
                    ($2 = 'bank_passbook_name_correction' AND doc_type::text = 'bank_passbook') OR
                    ($2 = 'bank_passbook_update' AND doc_type::text = 'bank_passbook') OR
                    ($2 = 'ownership_transfer' AND doc_type::text IN ('land_ror', 'ror', 'aadhaar_card', 'aadhaar')) OR
                    ($2 NOT IN ('electric_bill_name_correction', 'bank_passbook_name_correction', 'bank_passbook_update', 'ownership_transfer'))
                  )
            `, [consumerId, action_type]);
        }

        // Record in status_history timeline (using correct column names: from_status, to_status)
        await pool.query(`
            INSERT INTO status_history (project_id, from_status, to_status, changed_by, remarks)
            VALUES ($1, $2, 'action_required', $3, $4)
        `, [project_id, prevStatus, raisedBy, `Action Raised: ${action_type.replace(/_/g, ' ')}`]);

        // Notify roles about the new action
        notifyUsers({
            targetRoles: ['admin', 'agent', 'doc_team'],
            projectId: project_id,
            title: `Action Required Raised: ${action_type.replace(/_/g, ' ')}`,
            body: `Action item raised for Project #${project_id}: ${detail || 'Details updated'}`
        });

        res.status(201).json({ data: result.rows[0] });
    } catch (err) {
        if (err.code === "23503") {
            return res.status(400).json({ error: "Referenced project or user does not exist" });
        }
        if (err.code === "22P02") {
            return res.status(400).json({ error: `Invalid action_type or ENUM value: ${err.message}` });
        }
        res.status(500).json({ error: err.message });
    }
};

// 4. PATCH /api/actions/:id/status - Update action status / Resolution
export const updateActionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolved_by, assigned_to } = req.body;
        const resolvedBy = resolved_by || req.user?.userId || req.user?.id || 1;

        if (!status) {
            return res.status(400).json({ error: "status is required" });
        }

        // Get action & project details
        const actionCheck = await pool.query(`
            SELECT ar.id, ar.project_id, ar.action_type, p.current_status, p.consumer_id
            FROM action_required ar
            JOIN projects p ON ar.project_id = p.id
            WHERE ar.id = $1
        `, [id]);

        if (actionCheck.rowCount === 0) {
            return res.status(404).json({ error: "Action not found" });
        }

        const { project_id, action_type, current_status: prevStatus, consumer_id } = actionCheck.rows[0];

        let result;
        if (status === "resolved") {
            result = await pool.query(`
                UPDATE action_required
                SET status = 'resolved',
                    resolved_by = $1,
                    resolved_at = now(),
                    assigned_to = COALESCE($2, assigned_to)
                WHERE id = $3
                RETURNING *
            `, [resolvedBy, assigned_to || null, id]);

            // Auto-update project current_status back to 'doc_verified' if it was 'action_required'
            await pool.query(`
                UPDATE projects
                SET current_status = 'doc_verified', updated_at = now()
                WHERE id = $1 AND current_status = 'action_required'
            `, [project_id]);

            // Update matching consumer documents from 'action_required', 'uploaded', 'rejected' to 'verified'
            if (consumer_id) {
                await pool.query(`
                    UPDATE documents
                    SET status = 'verified', verified_by = $1, verified_at = now()
                    WHERE consumer_id = $2 AND status IN ('action_required', 'uploaded', 'rejected')
                `, [resolvedBy, consumer_id]);
            }

            // Record resolution in status_history (using correct column names: from_status, to_status)
            await pool.query(`
                INSERT INTO status_history (project_id, from_status, to_status, changed_by, remarks)
                VALUES ($1, $2, 'doc_verified', $3, $4)
            `, [project_id, prevStatus, resolvedBy, `Action Resolved: ${action_type.replace(/_/g, ' ')}`]);

            // Notify roles about resolution
            notifyUsers({
                targetRoles: ['admin', 'agent', 'doc_team'],
                projectId: project_id,
                title: `Action Resolved: ${action_type.replace(/_/g, ' ')}`,
                body: `Action item for Project #${project_id} has been resolved.`
            });
        } else {
            result = await pool.query(`
                UPDATE action_required
                SET status = $1,
                    assigned_to = COALESCE($2, assigned_to)
                WHERE id = $3
                RETURNING *
            `, [status, assigned_to || null, id]);
        }

        res.status(200).json({ message: `Action marked as ${status}`, data: result.rows[0] });
    } catch (err) {
        if (err.code === "22P02") {
            return res.status(400).json({ error: "Invalid status value" });
        }
        res.status(500).json({ error: err.message });
    }
};

// 5. GET /api/actions/overdue - Actions open > 7 days
export const getOverdueActions = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                ar.id,
                ar.project_id,
                ar.action_type,
                ar.detail,
                ar.status,
                ar.raised_by,
                u1.first_name || ' ' || u1.last_name AS raised_by_name,
                ar.raised_at,
                ar.assigned_to,
                u2.first_name || ' ' || u2.last_name AS assigned_to_name,
                COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') AS consumer_name,
                p.current_status AS project_status,
                EXTRACT(DAY FROM NOW() - ar.raised_at)::INTEGER AS days_open
            FROM action_required ar
            JOIN projects p ON ar.project_id = p.id
            JOIN consumers c ON p.consumer_id = c.id
            LEFT JOIN users u1 ON ar.raised_by = u1.id
            LEFT JOIN users u2 ON ar.assigned_to = u2.id
            WHERE ar.status NOT IN ('resolved', 'cancelled')
              AND ar.raised_at < NOW() - INTERVAL '7 days'
            ORDER BY ar.raised_at
        `);
        res.status(200).json({ count: result.rowCount, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
