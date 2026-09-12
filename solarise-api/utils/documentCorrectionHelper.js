/**
 * Document Correction Workflow Helper
 * 
 * Utility functions to support the document correction workflow:
 * - Flagging documents for correction
 * - Tracking re-uploads
 * - Handling verification and action resolution
 */

import pool from "../config/db.js";
import { notifyUsers } from "./notificationHelper.js";

/**
 * Check if a document has a pending correction action
 * @param {number} documentId - Document ID
 * @returns {Promise<Object|null>} Action details if exists, null otherwise
 */
export const getDocumentCorrectionAction = async (documentId) => {
    try {
        const docRes = await pool.query(
            `SELECT consumer_id FROM documents WHERE id = $1`,
            [documentId]
        );

        if (docRes.rowCount === 0) return null;

        const consumerId = docRes.rows[0].consumer_id;
        const projectRes = await pool.query(
            `SELECT id FROM projects WHERE consumer_id = $1 LIMIT 1`,
            [consumerId]
        );

        if (projectRes.rowCount === 0) return null;

        const projectId = projectRes.rows[0].id;

        const actionRes = await pool.query(
            `SELECT ar.id, ar.action_type, ar.detail, ar.status, ar.assigned_to, ar.raised_by
             FROM action_required ar
             WHERE ar.project_id = $1 AND ar.status IN ('open', 'doc_uploaded')
             ORDER BY ar.created_at DESC LIMIT 1`,
            [projectId]
        );

        return actionRes.rowCount > 0 ? actionRes.rows[0] : null;
    } catch (err) {
        console.error("Error checking document correction action:", err);
        return null;
    }
};

/**
 * Get all pending correction actions for an agent
 * @param {number} agentId - Agent user ID
 * @returns {Promise<Array>} List of pending actions assigned to agent
 */
export const getAgentPendingCorrections = async (agentId) => {
    try {
        const result = await pool.query(
            `SELECT ar.id, ar.project_id, ar.action_type, ar.detail, ar.status, ar.raised_at,
                    p.consumer_id, 
                    COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') AS consumer_name,
                    d.doc_type, d.id AS document_id
             FROM action_required ar
             JOIN projects p ON ar.project_id = p.id
             JOIN consumers c ON p.consumer_id = c.id
             LEFT JOIN documents d ON d.consumer_id = c.id AND d.status IN ('action_required', 'uploaded')
             WHERE ar.assigned_to = $1 AND ar.status IN ('open', 'doc_uploaded')
             ORDER BY ar.raised_at DESC`,
            [agentId]
        );

        return result.rows;
    } catch (err) {
        console.error("Error getting agent pending corrections:", err);
        return [];
    }
};

/**
 * Get all documents pending verification by doc team
 * @returns {Promise<Array>} List of re-uploaded documents (status: uploaded) with pending actions
 */
export const getDocumentsPendingVerification = async () => {
    try {
        const result = await pool.query(
            `SELECT d.id, d.consumer_id, d.doc_type, d.file_url, d.file_name, 
                    d.uploaded_by, d.uploaded_at, d.version, d.status,
                    COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') AS consumer_name,
                    u.first_name || ' ' || u.last_name AS uploader_name,
                    ar.id AS action_id, ar.detail AS correction_reason
             FROM documents d
             JOIN consumers c ON d.consumer_id = c.id
             LEFT JOIN users u ON d.uploaded_by = u.id
             LEFT JOIN action_required ar ON ar.project_id = (SELECT id FROM projects WHERE consumer_id = c.id LIMIT 1)
             WHERE d.status = 'uploaded' AND ar.status = 'doc_uploaded'
             ORDER BY d.uploaded_at DESC`,
        );

        return result.rows;
    } catch (err) {
        console.error("Error getting documents pending verification:", err);
        return [];
    }
};

/**
 * Send correction notification to agent
 * @param {number} agentId - Agent user ID
 * @param {Object} options - Notification options
 * @param {number} options.projectId - Project ID
 * @param {string} options.documentType - Type of document
 * @param {string} options.reason - Reason for correction
 * @param {string} options.actionId - Action ID
 * @returns {Promise<void>}
 */
export const sendCorrectionNotificationToAgent = async (agentId, { projectId, documentType, reason, actionId }) => {
    try {
        await notifyUsers({
            userId: agentId,
            projectId,
            title: `Correction Required: ${documentType?.replace(/_/g, ' ')}`,
            body: `Document Desk has flagged your ${documentType?.replace(/_/g, ' ')} for correction. Reason: ${reason}. Please review and re-upload the correct document.`
        });
    } catch (err) {
        console.error("Error sending correction notification to agent:", err);
    }
};

/**
 * Send re-upload notification to doc team
 * @param {Object} options - Notification options
 * @param {number} options.projectId - Project ID
 * @param {string} options.documentType - Type of document
 * @param {number} options.version - Document version number
 * @param {string} options.uploaderName - Name of agent who re-uploaded
 * @returns {Promise<void>}
 */
export const sendReuploadNotificationToDocTeam = async ({ projectId, documentType, version, uploaderName }) => {
    try {
        await notifyUsers({
            targetRoles: ['admin', 'doc_team'],
            projectId,
            title: `Document Re-uploaded for Verification: ${documentType?.replace(/_/g, ' ')}`,
            body: `${uploaderName} has re-uploaded ${documentType?.replace(/_/g, ' ')} (Version ${version}). Please review and verify the document.`
        });
    } catch (err) {
        console.error("Error sending reupload notification to doc team:", err);
    }
};

/**
 * Send verification completion notification to agent
 * @param {number} agentId - Agent user ID
 * @param {Object} options - Notification options
 * @param {number} options.projectId - Project ID
 * @param {string} options.documentType - Type of document
 * @returns {Promise<void>}
 */
export const sendVerificationAcceptedNotification = async (agentId, { projectId, documentType }) => {
    try {
        await notifyUsers({
            userId: agentId,
            projectId,
            title: `Document Correction Accepted ✓`,
            body: `Your corrected ${documentType?.replace(/_/g, ' ')} has been verified and accepted. The action has been closed.`
        });
    } catch (err) {
        console.error("Error sending verification accepted notification:", err);
    }
};

/**
 * Send action resolved notification to doc team
 * @param {Object} options - Notification options
 * @param {number} options.projectId - Project ID
 * @param {string} options.documentType - Type of document
 * @returns {Promise<void>}
 */
export const sendActionResolvedNotification = async ({ projectId, documentType }) => {
    try {
        await notifyUsers({
            targetRoles: ['admin', 'doc_team'],
            projectId,
            title: `Action Resolved: Document Verified ✓`,
            body: `Document correction for ${documentType?.replace(/_/g, ' ')} has been verified. Action closed.`
        });
    } catch (err) {
        console.error("Error sending action resolved notification:", err);
    }
};

/**
 * Get correction history for a document
 * @param {number} documentId - Document ID
 * @returns {Promise<Array>} History of all corrections for this document
 */
export const getDocumentCorrectionHistory = async (documentId) => {
    try {
        const result = await pool.query(
            `SELECT d.id, d.version, d.status, d.uploaded_at, d.verified_at,
                    u1.first_name || ' ' || u1.last_name AS uploaded_by_name,
                    u2.first_name || ' ' || u2.last_name AS verified_by_name,
                    ar.detail AS correction_reason
             FROM documents d
             LEFT JOIN users u1 ON d.uploaded_by = u1.id
             LEFT JOIN users u2 ON d.verified_by = u2.id
             LEFT JOIN action_required ar ON ar.project_id = (SELECT id FROM projects WHERE consumer_id = d.consumer_id LIMIT 1)
             WHERE d.doc_type = (SELECT doc_type FROM documents WHERE id = $1)
             AND d.consumer_id = (SELECT consumer_id FROM documents WHERE id = $1)
             ORDER BY d.version DESC`,
            [documentId]
        );

        return result.rows;
    } catch (err) {
        console.error("Error getting document correction history:", err);
        return [];
    }
};

/**
 * Get statistics on correction workflow
 * @returns {Promise<Object>} Workflow statistics
 */
export const getCorrectionWorkflowStats = async () => {
    try {
        const results = await Promise.all([
            // Total pending actions (open status)
            pool.query(`SELECT COUNT(*) as count FROM action_required WHERE status = 'open'`),
            // Actions with documents re-uploaded (doc_uploaded status)
            pool.query(`SELECT COUNT(*) as count FROM action_required WHERE status = 'doc_uploaded'`),
            // Documents awaiting verification
            pool.query(`SELECT COUNT(*) as count FROM documents WHERE status = 'action_required'`),
            // Recently resolved actions (resolved in last 7 days)
            pool.query(`SELECT COUNT(*) as count FROM action_required WHERE status = 'resolved' AND resolved_at > NOW() - INTERVAL '7 days'`),
        ]);

        return {
            pending_actions: parseInt(results[0].rows[0].count),
            pending_verification: parseInt(results[1].rows[0].count),
            flagged_documents: parseInt(results[2].rows[0].count),
            recently_resolved: parseInt(results[3].rows[0].count),
        };
    } catch (err) {
        console.error("Error getting workflow stats:", err);
        return {
            pending_actions: 0,
            pending_verification: 0,
            flagged_documents: 0,
            recently_resolved: 0,
        };
    }
};

/**
 * Get overdue corrections (open actions for more than N days)
 * @param {number} days - Number of days (default 5)
 * @returns {Promise<Array>} Overdue correction actions
 */
export const getOverdueCorrections = async (days = 5) => {
    try {
        const result = await pool.query(
            `SELECT ar.id, ar.project_id, ar.action_type, ar.detail, ar.status, ar.raised_at,
                    EXTRACT(DAY FROM NOW() - ar.raised_at)::INTEGER AS days_open,
                    ar.assigned_to, 
                    u.first_name || ' ' || u.last_name AS agent_name,
                    COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') AS consumer_name
             FROM action_required ar
             LEFT JOIN users u ON ar.assigned_to = u.id
             LEFT JOIN projects p ON ar.project_id = p.id
             LEFT JOIN consumers c ON p.consumer_id = c.id
             WHERE ar.status IN ('open', 'doc_uploaded') 
             AND ar.raised_at < NOW() - INTERVAL '${days} days'
             ORDER BY ar.raised_at ASC`,
        );

        return result.rows;
    } catch (err) {
        console.error("Error getting overdue corrections:", err);
        return [];
    }
};
