import pool from "../config/db.js";

/**
 * Helper to create a notification for specific users or roles.
 * @param {Object} param0
 * @param {number} [param0.userId] - Specific target user ID (optional)
 * @param {Array<string>} [param0.targetRoles] - Target roles (e.g. ['admin', 'doc_team'])
 * @param {number} [param0.projectId] - Related project ID (optional)
 * @param {string} param0.title - Notification title
 * @param {string} param0.body - Notification detail message
 */
export const notifyUsers = async ({ userId, targetRoles, projectId, title, body }) => {
    try {
        let recipientUserIds = [];

        if (userId) {
            recipientUserIds.push(userId);
        }

        if (targetRoles && targetRoles.length > 0) {
            const roleUsers = await pool.query(
                "SELECT id FROM users WHERE role::text = ANY($1::text[]) AND is_active = TRUE",
                [targetRoles]
            );
            roleUsers.rows.forEach((u) => {
                if (!recipientUserIds.includes(u.id)) {
                    recipientUserIds.push(u.id);
                }
            });
        }

        // If no specific recipient found, notify admin users by default
        if (recipientUserIds.length === 0) {
            const adminUsers = await pool.query("SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE");
            adminUsers.rows.forEach((u) => recipientUserIds.push(u.id));
        }

        for (const recipientId of recipientUserIds) {
            await pool.query(
                "INSERT INTO notifications (user_id, project_id, title, body) VALUES ($1, $2, $3, $4)",
                [recipientId, projectId || null, title, body || null]
            );
        }
    } catch (err) {
        console.error("Error sending role notification:", err);
    }
};
