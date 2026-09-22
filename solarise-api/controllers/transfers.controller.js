import pool from "../config/db.js";

// Initiate a transfer request
export const initiateTransfer = async (req, res) => {
    try {
        const { consumer_id, to_agent_id, remarks } = req.body;
        const from_agent_id = req.user?.userId || req.user?.id;

        if (!consumer_id || !to_agent_id) {
            return res.status(400).json({ error: "consumer_id and to_agent_id are required" });
        }

        if (String(from_agent_id) === String(to_agent_id)) {
            return res.status(400).json({ error: "Cannot transfer to yourself" });
        }

        // Verify the requesting user exists
        const requestingUserCheck = await pool.query(
            "SELECT id FROM users WHERE id = $1",
            [from_agent_id]
        );
        if (requestingUserCheck.rowCount === 0) {
            return res.status(401).json({ error: "Requesting user not found" });
        }

        // Validate consumer_id is a valid positive integer
        if (!Number.isInteger(Number(consumer_id)) || Number(consumer_id) <= 0) {
            return res.status(400).json({ error: "Invalid consumer_id" });
        }

        // Verify consumer ownership
        const consumerCheck = await pool.query(
            "SELECT id, created_by FROM consumers WHERE id = $1",
            [consumer_id]
        );
        if (consumerCheck.rowCount === 0) {
            return res.status(404).json({ error: "Consumer not found" });
        }
        if (String(consumerCheck.rows[0].created_by) === String(to_agent_id)) {
            return res.status(400).json({ error: "Consumer already belongs to this user" });
        }
        if (String(consumerCheck.rows[0].created_by) !== String(from_agent_id)) {
            return res.status(403).json({ error: "Only the belonging user can transfer this consumer" });
        }

        // Verify destination agent exists
        const agentCheck = await pool.query(
            "SELECT id, role FROM users WHERE id = $1",
            [to_agent_id]
        );
        if (agentCheck.rowCount === 0) {
            return res.status(404).json({ error: "Destination agent not found" });
        }

        // Check if there is already a pending transfer
        const pendingCheck = await pool.query(
            "SELECT id FROM consumer_transfers WHERE consumer_id = $1 AND status = 'pending'",
            [consumer_id]
        );
        if (pendingCheck.rowCount > 0) {
            return res.status(409).json({ error: "There is already a pending transfer for this consumer" });
        }

        // Final consumer existence check to prevent race conditions
        const finalConsumerCheck = await pool.query(
            "SELECT id FROM consumers WHERE id = $1",
            [consumer_id]
        );
        if (finalConsumerCheck.rowCount === 0) {
            return res.status(404).json({ error: "Consumer not found" });
        }

        const result = await pool.query(
            `INSERT INTO consumer_transfers (consumer_id, from_agent_id, to_agent_id, status, remarks)
             VALUES ($1, $2, $3, 'pending', $4) RETURNING *`,
            [consumer_id, from_agent_id, to_agent_id, remarks]
        );

        res.status(201).json({ data: result.rows[0], message: "Transfer request initiated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get pending incoming transfers
export const getPendingTransfers = async (req, res) => {
    try {
        const to_agent_id = req.user?.userId || req.user?.id;

        const result = await pool.query(
            `SELECT t.id, t.status, t.remarks, t.created_at,
                    c.id AS consumer_id, COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') AS consumer_name, c.electric_consumer_no,
                    u.first_name AS from_agent_first, u.last_name AS from_agent_last
             FROM consumer_transfers t
             JOIN consumers c ON t.consumer_id = c.id
             JOIN users u ON t.from_agent_id = u.id
             WHERE t.to_agent_id = $1 AND t.status = 'pending'
             ORDER BY t.created_at DESC`,
            [to_agent_id]
        );

        res.status(200).json({ count: result.rowCount, data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Accept a transfer request
export const acceptTransfer = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const to_agent_id = req.user?.userId || req.user?.id;

        // Verify the requesting user exists
        const requestingUserCheck = await client.query(
            "SELECT id FROM users WHERE id = $1",
            [to_agent_id]
        );
        if (requestingUserCheck.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(401).json({ error: "Requesting user not found" });
        }

        await client.query("BEGIN");

        const transferCheck = await client.query(
            "SELECT id, consumer_id, to_agent_id, status FROM consumer_transfers WHERE id = $1",
            [id]
        );

        if (transferCheck.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Transfer request not found" });
        }

        const transfer = transferCheck.rows[0];

        if (String(transfer.to_agent_id) !== String(to_agent_id)) {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "Not authorized to accept this transfer" });
        }

        if (transfer.status !== 'pending') {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: `Transfer is already ${transfer.status}` });
        }

        // Update transfer status
        await client.query(
            "UPDATE consumer_transfers SET status = 'accepted', updated_at = NOW() WHERE id = $1",
            [id]
        );

        // Update consumer ownership
        await client.query(
            "UPDATE consumers SET created_by = $1, updated_at = NOW() WHERE id = $2",
            [to_agent_id, transfer.consumer_id]
        );

        await client.query("COMMIT");
        res.status(200).json({ message: "Transfer accepted successfully" });
    } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// Reject a transfer request
export const rejectTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const to_agent_id = req.user?.userId || req.user?.id;

        // Verify the requesting user exists
        const requestingUserCheck = await pool.query(
            "SELECT id FROM users WHERE id = $1",
            [to_agent_id]
        );
        if (requestingUserCheck.rowCount === 0) {
            return res.status(401).json({ error: "Requesting user not found" });
        }

        const transferCheck = await pool.query(
            "SELECT id, to_agent_id, status FROM consumer_transfers WHERE id = $1",
            [id]
        );

        if (transferCheck.rowCount === 0) {
            return res.status(404).json({ error: "Transfer request not found" });
        }

        const transfer = transferCheck.rows[0];

        if (String(transfer.to_agent_id) !== String(to_agent_id)) {
            return res.status(403).json({ error: "Not authorized to reject this transfer" });
        }

        if (transfer.status !== 'pending') {
            return res.status(400).json({ error: `Transfer is already ${transfer.status}` });
        }

        await pool.query(
            "UPDATE consumer_transfers SET status = 'rejected', updated_at = NOW() WHERE id = $1",
            [id]
        );

        res.status(200).json({ message: "Transfer rejected successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
