import pool from "../config/db.js";
import { notifyUsers } from "../utils/notificationHelper.js";

// Hardcoded weights (must sum to 100)
const INSTALLATION_ITEMS = [
    { item: 'structure', weight_pct: 30 },
    { item: 'panel', weight_pct: 10 },
    { item: 'inverter_looping', weight_pct: 20 },
    { item: 'ac_wiring', weight_pct: 14 },
    { item: 'dc_wiring', weight_pct: 10 },
    { item: 'lightning_arrester', weight_pct: 5 },
    { item: 'earthing', weight_pct: 5 },
    { item: 'earthing_pit', weight_pct: 3 },
    { item: 'concreting', weight_pct: 3 },
    { item: 'output_service', weight_pct: 0 }
];

// 1. GET /api/installation/project/:projectId - All 10 checklist items
export const getChecklistByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const result = await pool.query(`
            SELECT 
                ip.id,
                ip.project_id,
                ip.item,
                ip.weight_pct,
                ip.is_done,
                ip.done_by,
                u.first_name || ' ' || u.last_name AS done_by_name,
                ip.done_at
            FROM installation_progress ip
            LEFT JOIN users u ON ip.done_by = u.id
            WHERE ip.project_id = $1
            ORDER BY ip.id
        `, [projectId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "No installation checklist found. Use POST /init to initialize." });
        }

        res.status(200).json({ count: result.rowCount, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. POST /api/installation/project/:projectId/init - Create all 10 items with weights
export const initChecklist = async (req, res) => {
    const client = await pool.connect();
    try {
        const { projectId } = req.params;

        // Verify project exists
        const projectCheck = await client.query(
            "SELECT id FROM projects WHERE id = $1",
            [projectId]
        );
        if (projectCheck.rowCount === 0) {
            return res.status(404).json({ error: "Project not found" });
        }

        // Check if already initialized
        const existingCheck = await client.query(
            "SELECT id FROM installation_progress WHERE project_id = $1 LIMIT 1",
            [projectId]
        );
        if (existingCheck.rowCount > 0) {
            return res.status(409).json({ error: "Installation checklist already initialized for this project" });
        }

        await client.query("BEGIN");

        // Insert all 10 items in a single batch
        const values = INSTALLATION_ITEMS.map((item, i) => {
            const offset = i * 3;
            return `($${offset + 1}, $${offset + 2}::public.installation_item, $${offset + 3})`;
        }).join(", ");

        const params = INSTALLATION_ITEMS.flatMap(item => [
            projectId, item.item, item.weight_pct
        ]);

        const result = await client.query(`
            INSERT INTO installation_progress (project_id, item, weight_pct)
            VALUES ${values}
            RETURNING *
        `, params);

        await client.query("COMMIT");

        res.status(201).json({
            message: "Installation checklist initialized with 10 items",
            count: result.rowCount,
            data: result.rows
        });
    } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// 3. PATCH /api/installation/:id/complete - Mark one item as done / toggle status
export const completeItem = async (req, res) => {
    try {
        const { id } = req.params;
        const targetState = req.body?.is_done !== undefined ? Boolean(req.body.is_done) : true;
        let userId = req.body?.done_by || req.user?.userId || req.user?.id;

        if (userId) {
            const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
            if (userCheck.rowCount === 0) {
                userId = null;
            }
        } else {
            userId = null;
        }

        const result = await pool.query(`
            UPDATE installation_progress
            SET is_done = $1, 
                done_by = CASE WHEN $1 = TRUE THEN $2::INTEGER ELSE NULL END, 
                done_at = CASE WHEN $1 = TRUE THEN now() ELSE NULL END
            WHERE id = $3
            RETURNING *
        `, [targetState, userId, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Installation item not found" });
        }

        const updatedItem = result.rows[0];
        notifyUsers({
            targetRoles: ['admin', 'doc_team'],
            projectId: updatedItem.project_id,
            title: `Installation Item ${targetState ? 'Completed' : 'Pending'}`,
            body: `Milestone "${updatedItem.item.replace(/_/g, ' ')}" updated for Project #${updatedItem.project_id}.`
        });

        res.status(200).json({ message: `Item marked as ${targetState ? 'complete' : 'pending'}`, data: updatedItem });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. GET /api/installation/project/:projectId/progress - Calculate completion %
export const getProgress = async (req, res) => {
    try {
        const { projectId } = req.params;
        const result = await pool.query(`
            SELECT
                SUM(CASE WHEN is_done THEN weight_pct ELSE 0 END)::INTEGER AS completion_pct,
                COUNT(*) FILTER (WHERE is_done)::INTEGER AS items_done,
                COUNT(*)::INTEGER AS total_items
            FROM installation_progress
            WHERE project_id = $1
        `, [projectId]);

        if (result.rows[0].total_items === 0) {
            return res.status(404).json({ error: "No installation checklist found for this project" });
        }

        res.status(200).json({ data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. POST /api/installation/project/:projectId/batch - Save all items in a single batch
export const saveChecklistBatch = async (req, res) => {
    const client = await pool.connect();
    try {
        const { projectId } = req.params;
        const { items, done_by } = req.body;

        let userId = done_by || req.user?.userId || req.user?.id;
        if (userId) {
            const userCheck = await client.query("SELECT id FROM users WHERE id = $1", [userId]);
            if (userCheck.rowCount === 0) {
                userId = null;
            }
        } else {
            userId = null;
        }

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: "items array is required" });
        }

        await client.query("BEGIN");

        // Ensure project exists
        const projectCheck = await client.query("SELECT id FROM projects WHERE id = $1", [projectId]);
        if (projectCheck.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Project not found" });
        }

        // Ensure initialization if empty
        const countCheck = await client.query(
            "SELECT COUNT(*)::INTEGER AS count FROM installation_progress WHERE project_id = $1",
            [projectId]
        );

        if (countCheck.rows[0].count === 0) {
            const values = INSTALLATION_ITEMS.map((item, i) => {
                const offset = i * 3;
                return `($${offset + 1}, $${offset + 2}::public.installation_item, $${offset + 3})`;
            }).join(", ");
            const params = INSTALLATION_ITEMS.flatMap(item => [
                projectId, item.item, item.weight_pct
            ]);
            await client.query(`
                INSERT INTO installation_progress (project_id, item, weight_pct)
                VALUES ${values}
            `, params);
        }

        // Update each item state
        for (const it of items) {
            if (!it.item) continue;
            const isDone = Boolean(it.is_done);
            await client.query(`
                UPDATE installation_progress
                SET is_done = $1,
                    done_by = CASE WHEN $1 = TRUE THEN $2::INTEGER ELSE NULL END,
                    done_at = CASE WHEN $1 = TRUE THEN now() ELSE NULL END
                WHERE project_id = $3 AND item = $4::public.installation_item
            `, [isDone, userId, projectId, it.item]);
        }

        await client.query("COMMIT");

        const updatedResult = await pool.query(`
            SELECT 
                ip.id,
                ip.project_id,
                ip.item,
                ip.weight_pct,
                ip.is_done,
                ip.done_by,
                u.first_name || ' ' || u.last_name AS done_by_name,
                ip.done_at
            FROM installation_progress ip
            LEFT JOIN users u ON ip.done_by = u.id
            WHERE ip.project_id = $1
            ORDER BY ip.id
        `, [projectId]);

        res.status(200).json({
            message: "Installation checklist saved successfully",
            data: updatedResult.rows
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("saveChecklistBatch Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};
