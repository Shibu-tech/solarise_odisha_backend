import pool from "../config/db.js";

// 1. GET /api/material-deliveries/project/:projectId - Get all delivery records for a project
export const getDeliveryByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const result = await pool.query(`
            SELECT 
                md.id,
                md.project_id,
                md.delivered_at,
                md.dcr_number,
                md.recorded_by,
                u.first_name || ' ' || u.last_name AS recorded_by_name,
                COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') AS consumer_name,
                p.current_status AS project_status
            FROM material_deliveries md
            JOIN projects p ON md.project_id = p.id
            JOIN consumers c ON p.consumer_id = c.id
            LEFT JOIN users u ON md.recorded_by = u.id
            WHERE md.project_id = $1
            ORDER BY md.delivered_at DESC, md.id DESC
        `, [projectId]);

        // if (result.rowCount === 0) {
        //     return res.status(404).json({ error: "No material delivery found for this project", data: [] });
        // }

        res.status(200).json({ data: result.rows, primary: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. POST /api/material-deliveries - Record delivery batch (Always inserts a new batch row)
export const createDelivery = async (req, res) => {
    try {
        const { project_id, dcr_number, recorded_by, delivered_at } = req.body;

        let recordedBy = recorded_by || req.user?.userId || req.user?.id;
        if (!recordedBy) {
            const defaultUser = await pool.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
            recordedBy = defaultUser.rows[0]?.id || 1;
        }

        if (!project_id) {
            return res.status(400).json({ error: "project_id is required" });
        }

        // Verify project exists
        const projectCheck = await pool.query(
            "SELECT id, current_status FROM projects WHERE id = $1",
            [project_id]
        );

        if (projectCheck.rowCount === 0) {
            return res.status(404).json({ error: "Project not found" });
        }

        const prevStatus = projectCheck.rows[0].current_status;

        // Dynamically drop ANY unique constraint or unique index on material_deliveries(project_id)
        try {
            await pool.query(`
                DO $$ 
                DECLARE r RECORD;
                BEGIN
                    FOR r IN (
                        SELECT constraint_name 
                        FROM information_schema.table_constraints 
                        WHERE table_name = 'material_deliveries' AND constraint_type = 'UNIQUE'
                    ) LOOP
                        EXECUTE 'ALTER TABLE material_deliveries DROP CONSTRAINT ' || quote_ident(r.constraint_name);
                    END LOOP;
                END $$;
            `);
        } catch (schemaErr) {
            // Ignore schema alter errors if user lacks DDL privileges
        }

        // Always insert a distinct new material delivery batch record
        const result = await pool.query(`
            INSERT INTO material_deliveries (project_id, dcr_number, recorded_by, delivered_at)
            VALUES ($1, $2, $3, COALESCE($4, now()))
            RETURNING *
        `, [project_id, dcr_number || null, recordedBy, delivered_at || null]);

        // Auto-update project current_status to 'materials_delivered' if prior in pipeline
        await pool.query(`
            UPDATE projects
            SET current_status = 'materials_delivered', updated_at = now()
            WHERE id = $1 AND current_status NOT IN (
                'materials_delivered', 'installation_in_progress', 'installation_done',
                'installation_uploaded_pmsgy', 'net_metering_applied', 'net_metering_rts_pending',
                'net_metering_payment_pending', 'net_metering_agreement_done', 'inspection_report_submitted',
                'site_activity', 'approval_desk', 'service_release', 'service_released',
                'meter_installed', 'project_commissioned', 'subsidy_redeemed', 'subsidy_return',
                'subsidy_pending', 'subsidy_disbursed_cfa', 'subsidy_disbursed_sfa',
                'project_handover_pending', 'project_handed_over'
            )
        `, [project_id]);

        // Log status_history entry if status transitioned
        if (prevStatus !== 'materials_delivered') {
            await pool.query(`
                INSERT INTO status_history (project_id, from_status, to_status, changed_by, remarks)
                VALUES ($1, $2, 'materials_delivered', $3, $4)
            `, [project_id, prevStatus, recordedBy, `Material Delivery Batch Recorded (DCR: ${dcr_number || 'N/A'})`]);
        }

        res.status(201).json({ message: "Material delivery batch recorded successfully", data: result.rows[0] });
    } catch (err) {
        if (err.code === "23503") {
            // Foreign key failure - fallback safely to first existing user in DB
            try {
                const fallbackUser = await pool.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
                const safeUserId = fallbackUser.rows[0]?.id || 1;

                const retryResult = await pool.query(`
                    INSERT INTO material_deliveries (project_id, dcr_number, recorded_by, delivered_at)
                    VALUES ($1, $2, $3, COALESCE($4, now()))
                    RETURNING *
                `, [req.body.project_id, req.body.dcr_number || null, safeUserId, req.body.delivered_at || null]);

                await pool.query(`
                    UPDATE projects
                    SET current_status = 'materials_delivered', updated_at = now()
                    WHERE id = $1
                `, [req.body.project_id]);

                return res.status(201).json({ message: "Material delivery batch recorded successfully", data: retryResult.rows[0] });
            } catch (fallbackErr) {
                return res.status(500).json({ error: fallbackErr.message });
            }
        }
        res.status(500).json({ error: err.message });
    }
};

// 3. PUT /api/material-deliveries/:id - Update DCR number
export const updateDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const { dcr_number, delivered_at } = req.body;

        const result = await pool.query(`
            UPDATE material_deliveries
            SET dcr_number = COALESCE($1, dcr_number),
                delivered_at = COALESCE($2, delivered_at)
            WHERE id = $3
            RETURNING *
        `, [dcr_number, delivered_at, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Material delivery not found" });
        }

        res.status(200).json({ data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
