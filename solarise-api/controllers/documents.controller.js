import pool from "../config/db.js";
import { notifyUsers } from "../utils/notificationHelper.js";
import { attachPresignedUrls, checkS3Health, deleteFileFromS3, getFileStreamFromS3, getPresignedDownloadUrl, uploadFileToS3 } from "../services/s3Storage.js";

// GET /api/documents - List all documents (filtered by role)
export const getAllDocuments = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        const role = req.user?.role;
        let query = `
            SELECT 
                d.id,
                d.consumer_id,
                COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') AS consumer_name,
                d.doc_type,
                d.file_url,
                d.file_name,
                d.mime_type,
                d.geo_lat,
                d.geo_lng,
                d.status,
                d.uploaded_by,
                u1.first_name || ' ' || u1.last_name AS uploaded_by_name,
                d.uploaded_at,
                d.verified_by,
                u2.first_name || ' ' || u2.last_name AS verified_by_name,
                d.verified_at,
                d.reject_reason,
                d.version
            FROM documents d
            JOIN consumers c ON d.consumer_id = c.id
            LEFT JOIN users u1 ON d.uploaded_by = u1.id
            LEFT JOIN users u2 ON d.verified_by = u2.id
        `;
        const params = [];
        if (role === 'agent') {
            query += ` WHERE c.created_by = $1`;
            params.push(userId);
        } else if (role === 'site_manager') {
            query += ` WHERE (c.created_by = $1 OR EXISTS (SELECT 1 FROM projects p WHERE p.consumer_id = c.id AND p.assigned_site_manager = $1))`;
            params.push(userId);
        }
        query += ` ORDER BY d.uploaded_at DESC`;

        const result = await pool.query(query, params);
        const enrichedRows = await attachPresignedUrls(result.rows);
        res.status(200).json({ count: result.rowCount, data: enrichedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/documents/:id - Get document details by ID
export const getDocumentById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                d.id,
                d.consumer_id,
                COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') AS consumer_name,
                d.doc_type,
                d.file_url,
                d.file_name,
                d.mime_type,
                d.geo_lat,
                d.geo_lng,
                d.status,
                d.uploaded_by,
                u1.first_name || ' ' || u1.last_name AS uploaded_by_name,
                d.uploaded_at,
                d.verified_by,
                u2.first_name || ' ' || u2.last_name AS verified_by_name,
                d.verified_at,
                d.reject_reason,
                d.version
            FROM documents d
            JOIN consumers c ON d.consumer_id = c.id
            LEFT JOIN users u1 ON d.uploaded_by = u1.id
            LEFT JOIN users u2 ON d.verified_by = u2.id
            WHERE d.id = $1
        `, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Document not found" });
        }

        const doc = result.rows[0];
        const enrichedDoc = await attachPresignedUrls(doc);

        res.status(200).json({ data: enrichedDoc });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/documents/:id/download-url - Get temporary secure signed download URL
export const getDocumentDownloadUrl = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "SELECT id, consumer_id, doc_type, file_url, file_name, mime_type FROM documents WHERE id = $1",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Document not found" });
        }

        const doc = result.rows[0];
        let presignedUrl = doc.file_url;
        try {
            const signed = await getPresignedDownloadUrl(doc.file_url, 3600);
            if (signed) presignedUrl = signed;
        } catch (e) {
            console.warn("Could not generate presigned S3 URL, returning direct URL:", e.message);
        }

        res.status(200).json({
            data: {
                id: doc.id,
                file_url: doc.file_url,
                download_url: presignedUrl,
                file_name: doc.file_name,
                mime_type: doc.mime_type,
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/documents/:id/preview - Stream document file directly from S3 through backend
export const previewDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "SELECT id, file_url, file_name, mime_type FROM documents WHERE id = $1",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Document not found" });
        }

        const doc = result.rows[0];

        try {
            const { stream, contentType, contentLength } = await getFileStreamFromS3(doc.file_url);
            
            res.setHeader("Content-Type", contentType || doc.mime_type || "application/octet-stream");
            if (contentLength) {
                res.setHeader("Content-Length", contentLength);
            }
            res.setHeader(
                "Content-Disposition",
                `inline; filename="${encodeURIComponent(doc.file_name || 'document')}"`
            );
            
            stream.pipe(res);
        } catch (s3Err) {
            const presigned = await getPresignedDownloadUrl(doc.file_url, 3600);
            if (presigned) {
                return res.redirect(presigned);
            }
            throw s3Err;
        }
    } catch (err) {
        console.error("Preview document error:", err);
        res.status(500).json({ error: err.message || "Failed to retrieve document stream" });
    }
};

export const getDocumentsByConsumer = async (req, res) => {
    try {
        const { consumerId } = req.params;
        const result = await pool.query(`
            SELECT 
                d.id,
                d.consumer_id,
                d.doc_type,
                d.file_url,
                d.file_name,
                d.mime_type,
                d.geo_lat,
                d.geo_lng,
                d.status,
                d.uploaded_by,
                u1.first_name || ' ' || u1.last_name AS uploaded_by_name,
                d.uploaded_at,
                d.verified_by,
                u2.first_name || ' ' || u2.last_name AS verified_by_name,
                d.verified_at,
                d.reject_reason,
                d.version
            FROM documents d
            LEFT JOIN users u1 ON d.uploaded_by = u1.id
            LEFT JOIN users u2 ON d.verified_by = u2.id
            WHERE d.consumer_id = $1
            ORDER BY d.doc_type, d.version DESC
        `, [consumerId]);
        const enrichedRows = await attachPresignedUrls(result.rows);
        res.status(200).json({ count: result.rowCount, data: enrichedRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createDocument = async (req, res) => {
    try {
        const { consumer_id, doc_type, file_url, file_name, mime_type, geo_lat, geo_lng, uploaded_by } = req.body;
        const finalUploadedBy = uploaded_by || req.user?.userId || req.user?.id;
        if (!consumer_id || !doc_type || !file_url || !finalUploadedBy) {
            return res.status(400).json({ error: "consumer_id, doc_type, file_url, and uploaded_by are required" });
        }
        const result = await pool.query(`
            INSERT INTO documents (consumer_id, doc_type, file_url, file_name, mime_type, geo_lat, geo_lng, uploaded_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [consumer_id, doc_type, file_url, file_name || null, mime_type || null, geo_lat || null, geo_lng || null, finalUploadedBy]);
        const enrichedDoc = await attachPresignedUrls(result.rows[0]);
        res.status(201).json({ data: enrichedDoc });
    } catch (err) {
        if (err.code === "23503") {
            return res.status(400).json({ error: "Referenced consumer or user does not exist" });
        }
        res.status(500).json({ error: err.message });
    }
};

export const verifyDocument = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const verified_by = req.body.verified_by || req.user?.userId || req.user?.id;
        if (!verified_by) {
            return res.status(400).json({ error: "verified_by (user ID) is required" });
        }

        await client.query("BEGIN");

        // Update document status to 'verified'
        const result = await client.query(`
            UPDATE documents
            SET status = 'verified', verified_by = $1, verified_at = now(), reject_reason = NULL
            WHERE id = $2 AND status IN ('uploaded', 'action_required', 'rejected')
            RETURNING *
        `, [verified_by, id]);

        if (result.rowCount === 0) {
            const check = await client.query("SELECT id, status FROM documents WHERE id = $1", [id]);
            await client.query("ROLLBACK");
            if (check.rowCount === 0) {
                return res.status(404).json({ error: "Document not found" });
            }
            return res.status(400).json({ error: `Cannot verify document with status '${check.rows[0].status}'.` });
        }

        const verifiedDoc = result.rows[0];
        let resolvedAction = null;

        // Step 2: Check if there's an associated action that needs to be resolved
        const consumerRes = await client.query(
            "SELECT consumer_id FROM documents WHERE id = $1",
            [id]
        );
        const consumer_id = consumerRes.rows[0]?.consumer_id;

        if (consumer_id) {
            const projectRes = await client.query(
                "SELECT id, current_status FROM projects WHERE consumer_id = $1 LIMIT 1",
                [consumer_id]
            );

            if (projectRes.rowCount > 0) {
                const projectId = projectRes.rows[0].id;
                const currentProjectStatus = projectRes.rows[0].current_status;

                // Check for action_required entry with status 'doc_uploaded' or 'open' (for any pending corrections)
                const actionRes = await client.query(`
                    SELECT ar.id, ar.assigned_to, ar.detail, ar.status, ar.action_type
                    FROM action_required ar
                    WHERE ar.project_id = $1 
                    AND ar.status IN ('doc_uploaded', 'open')
                    ORDER BY ar.created_at DESC
                    LIMIT 1
                `, [projectId]);

                if (actionRes.rowCount > 0) {
                    const action = actionRes.rows[0];
                    
                    // Resolve the action
                    const resolveRes = await client.query(`
                        UPDATE action_required
                        SET status = 'resolved', resolved_by = $1, resolved_at = now()
                        WHERE id = $2
                        RETURNING *
                    `, [verified_by, action.id]);

                    if (resolveRes.rowCount > 0) {
                        resolvedAction = resolveRes.rows[0];

                        // Update project status back to 'doc_verified'
                        await client.query(`
                            UPDATE projects
                            SET current_status = 'doc_verified', updated_at = now()
                            WHERE id = $1
                        `, [projectId]);

                        // Record in status_history
                        const fromStatus = currentProjectStatus || 'action_required';
                        await client.query(`
                            INSERT INTO status_history (project_id, from_status, to_status, changed_by, remarks)
                            VALUES ($1, $2, 'doc_verified', $3, 'Document correction verified and action resolved')
                        `, [projectId, fromStatus, verified_by]);

                        // Send notification to the agent that their document was verified
                        try {
                            if (action.assigned_to) {
                                notifyUsers({
                                    userId: action.assigned_to,
                                    projectId: projectId,
                                    title: `Document Correction Accepted ✓`,
                                    body: `Your corrected ${verifiedDoc.doc_type?.replace(/_/g, ' ')} has been verified and accepted. The action has been closed.`
                                });
                            }
                        } catch { /* ignore notification errors */ }

                        // Send notification to doc_team that action is resolved
                        try {
                            notifyUsers({
                                targetRoles: ['admin', 'doc_team'],
                                projectId: projectId,
                                title: `Action Resolved: Document Verified ✓`,
                                body: `Document correction for ${verifiedDoc.doc_type?.replace(/_/g, ' ')} has been verified. Action closed.`
                            });
                        } catch { /* ignore notification errors */ }
                    }
                }
            }
        }

        await client.query("COMMIT");

        // Send general notification
        try {
            notifyUsers({
                targetRoles: ['admin', 'site_manager', 'agent'],
                userId: verifiedDoc.uploaded_by,
                title: `Document Verified`,
                body: `Document "${verifiedDoc.doc_type?.replace(/_/g, ' ')}" has been verified by Document Desk.`
            });
        } catch { /* ignore notification errors */ }

        // Return response with action status
        res.status(200).json({ 
            message: "Document verified and action resolved",
            data: verifiedDoc,
            action_resolved: resolvedAction ? {
                id: resolvedAction.id,
                status: 'resolved',
                action_type: resolvedAction.action_type
            } : null
        });
    } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const rejectDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const verified_by = req.body.verified_by || req.user?.userId || req.user?.id;
        const { reject_reason } = req.body;
        if (!verified_by) {
            return res.status(400).json({ error: "verified_by (user ID) is required" });
        }
        if (!reject_reason) {
            return res.status(400).json({ error: "reject_reason is required" });
        }
        const result = await pool.query(`
            UPDATE documents
            SET status = 'rejected', verified_by = $1, verified_at = now(), reject_reason = $2
            WHERE id = $3 AND status IN ('uploaded', 'action_required', 'rejected')
            RETURNING * 
        `, [verified_by, reject_reason, id]);
        if (result.rowCount === 0) {
            const check = await pool.query("SELECT id, status FROM documents WHERE id = $1", [id]);
            if (check.rowCount === 0) {
                return res.status(404).json({ error: "Document not found" });
            }
            return res.status(400).json({ error: `Cannot reject document with status '${check.rows[0].status}'. Only 'uploaded' or 'action_required' documents can be rejected.` });
        }

        const rejectedDoc = result.rows[0];
        notifyUsers({
            targetRoles: ['admin', 'site_manager', 'agent'],
            userId: rejectedDoc.uploaded_by,
            title: `Document Rejected`,
            body: `Document "${rejectedDoc.doc_type?.replace(/_/g, ' ')}" rejected. Reason: ${reject_reason}`
        });

        res.status(200).json({ message: "Document rejected", data: rejectedDoc });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const reuploadDocument = async (req, res) => {
    const client = await pool.connect();
    let uploadedObject = null;
    try {
        const { id } = req.params;
        const uploaded_by = req.user?.userId || req.user?.id || req.body.uploaded_by;
        let file_url = req.body.file_url;
        let file_name = req.body.file_name;
        let mime_type = req.body.mime_type;
        const geo_lat = req.body.geo_lat;
        const geo_lng = req.body.geo_lng;

        if (!uploaded_by) {
            return res.status(400).json({ error: "Authenticated uploader or uploaded_by is required" });
        }

        await client.query("BEGIN");

        // Step 1: Get original document and related project
        const original = await client.query(
            "SELECT consumer_id, doc_type FROM documents WHERE id = $1",
            [id]
        );
        if (original.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Original document not found" });
        }
        const { consumer_id, doc_type } = original.rows[0];

        // Get the project associated with this consumer
        const projectRes = await client.query(
            "SELECT id FROM projects WHERE consumer_id = $1 LIMIT 1",
            [consumer_id]
        );
        const projectId = projectRes.rowCount > 0 ? projectRes.rows[0].id : null;

        // If a file is uploaded via multipart/form-data
        if (req.file) {
            uploadedObject = await uploadFileToS3({
                file: req.file,
                consumerId: consumer_id,
                documentType: doc_type,
            });
            file_url = uploadedObject.url;
            file_name = file_name || req.file.originalname;
            mime_type = req.file.mimetype;
        }

        if (!file_url) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Either a file or file_url is required for re-upload" });
        }

        // Step 2: Get current max version for this consumer + doc_type
        const versionResult = await client.query(
            "SELECT COALESCE(MAX(version), 0) AS max_version FROM documents WHERE consumer_id = $1 AND doc_type = $2",
            [consumer_id, doc_type]
        );
        const newVersion = Number(versionResult.rows[0].max_version) + 1;

        // Step 3: Insert new version (will be in 'uploaded' status)
        const insertResult = await client.query(`
            INSERT INTO documents (consumer_id, doc_type, file_url, file_name, mime_type, geo_lat, geo_lng, uploaded_by, version, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'uploaded')
            RETURNING *
        `, [consumer_id, doc_type, file_url, file_name || null, mime_type || null, geo_lat || null, geo_lng || null, uploaded_by, newVersion]);
        
        // Step 4: Update the associated action_required if it exists
        if (projectId) {
            // Check for open action related to this document correction
            const actionRes = await client.query(`
                SELECT ar.id, ar.status
                FROM action_required ar
                WHERE ar.project_id = $1 
                AND ar.status IN ('open', 'doc_uploaded')
                ORDER BY ar.created_at DESC
                LIMIT 1
            `, [projectId]);

            if (actionRes.rowCount > 0) {
                const action = actionRes.rows[0];
                // Update action status to 'doc_uploaded' indicating document has been re-uploaded
                await client.query(`
                    UPDATE action_required
                    SET status = 'doc_uploaded'
                    WHERE id = $1
                `, [action.id]);

                // Send notification to doc_team to verify the re-uploaded document
                try {
                    notifyUsers({
                        targetRoles: ['admin', 'doc_team'],
                        projectId: projectId,
                        title: `Document Re-uploaded for Verification: ${doc_type?.replace(/_/g, ' ')}`,
                        body: `Agent has re-uploaded ${doc_type?.replace(/_/g, ' ')} (Version ${newVersion}). Please review and verify the document.`
                    });
                } catch { /* notification catch */ }
            }
        }
        
        await client.query("COMMIT");

        try {
            notifyUsers({
                targetRoles: ['admin', 'doc_team', 'site_manager'],
                userId: uploaded_by,
                projectId: projectId,
                title: `Document Re-uploaded (v${newVersion})`,
                body: `Your corrected ${doc_type?.replace(/_/g, ' ')} has been re-uploaded (Version ${newVersion}). Awaiting verification from Document Desk.`
            });
        } catch { /* ignore notification errors */ }

        const enrichedDoc = await attachPresignedUrls(insertResult.rows[0]);
        res.status(201).json({
            message: `Document re-uploaded as version ${newVersion} and awaiting verification`,
            data: enrichedDoc
        });
    } catch (err) {
        await client.query("ROLLBACK");
        if (uploadedObject?.key) {
            await deleteFileFromS3(uploadedObject.key).catch(() => {});
        }
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const getDocumentStatusSummary = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                status,
                COUNT(*)::INTEGER AS count
            FROM documents
            GROUP BY status
            ORDER BY count DESC
        `);
        const totalResult = await pool.query("SELECT COUNT(*)::INTEGER AS total FROM documents");
        res.status(200).json({
            total_documents: totalResult.rows[0]?.total || 0,
            data: result.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const flagDocument = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { flagged_by, action_type, detail } = req.body;

        if (!detail) {
            return res.status(400).json({ error: "detail (flag reason) is required" });
        }

        await client.query("BEGIN");

        // 1. Get document & project info including the agent who uploaded it
        const docRes = await client.query(`
            SELECT d.id, d.consumer_id, d.doc_type, d.uploaded_by, 
                   u.first_name, u.last_name, u.role,
                   p.id AS project_id, p.current_status
            FROM documents d
            LEFT JOIN users u ON d.uploaded_by = u.id
            LEFT JOIN projects p ON p.consumer_id = d.consumer_id
            WHERE d.id = $1
        `, [id]);

        if (docRes.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Document not found" });
        }

        const doc = docRes.rows[0];
        const uploadedByUserId = doc.uploaded_by;
        const uploaderName = doc.first_name && doc.last_name 
            ? `${doc.first_name} ${doc.last_name}` 
            : 'Agent';

        // Ensure valid user ID for FK constraint (who is flagging the document)
        let validUserBy = req.user?.userId || req.user?.id || flagged_by;
        if (validUserBy) {
            const uCheck = await client.query("SELECT id FROM users WHERE id = $1", [validUserBy]);
            if (uCheck.rowCount === 0) {
                const fallbackUser = await client.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
                validUserBy = fallbackUser.rows[0]?.id || 1;
            }
        } else {
            const fallbackUser = await client.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
            validUserBy = fallbackUser.rows[0]?.id || 1;
        }

        const VALID_ACTION_TYPES = [
            'electric_bill_name_correction',
            'ownership_transfer',
            'commercial_to_domestic',
            'bank_passbook_name_correction',
            'bank_passbook_update',
            'other'
        ];

        let finalActionType = action_type;
        if (!finalActionType || !VALID_ACTION_TYPES.includes(finalActionType)) {
            if (doc.doc_type === 'electric_bill') finalActionType = 'electric_bill_name_correction';
            else if (doc.doc_type === 'bank_passbook') finalActionType = 'bank_passbook_name_correction';
            else if (['land_ror', 'aadhaar_card'].includes(doc.doc_type)) finalActionType = 'ownership_transfer';
            else finalActionType = 'other';
        }

        // 2. Update document status to 'action_required'
        const updatedDoc = await client.query(`
            UPDATE documents
            SET status = 'action_required', reject_reason = $1
            WHERE id = $2
            RETURNING *
        `, [detail, id]);

        // 3. Create entry in action_required if project exists
        let actionItem = null;
        if (doc.project_id) {
            // Assign action to the agent who uploaded the document
            const actionRes = await client.query(`
                INSERT INTO action_required (project_id, action_type, detail, raised_by, assigned_to, status)
                VALUES ($1, $2, $3, $4, $5, 'open')
                RETURNING *
            `, [doc.project_id, finalActionType, detail, validUserBy, uploadedByUserId]);
            actionItem = actionRes.rows[0];

            // 4. Update project current_status to 'action_required'
            await client.query(`
                UPDATE projects
                SET current_status = 'action_required', updated_at = now()
                WHERE id = $1
            `, [doc.project_id]);

            // 5. Record in status_history
            const VALID_PROJECT_STATUSES = [
                'new_registration', 'doc_requested', 'doc_uploaded', 'doc_verified', 'action_required',
                'action_required_bank', 'work_in_progress', 'processing_fee_paid', 'registration_no_generated',
                'master_data_pending', 'name_corrected', 'ownership_changed', 'type_converted',
                'pending_with_discom', 'security_deposit_pending', 'security_deposit_paid', 'psa_agreement_done',
                'pmsgy_done', 'loan_applied', 'loan_approved', 'loan_rejected', 'line_up_given',
                'materials_delivered', 'installation_in_progress', 'installation_done', 'installation_uploaded_pmsgy',
                'net_metering_applied', 'net_metering_rts_pending', 'net_metering_payment_pending',
                'net_metering_agreement_done', 'inspection_report_submitted', 'site_activity', 'approval_desk',
                'service_release', 'service_released', 'meter_installed', 'project_commissioned',
                'subsidy_redeemed', 'subsidy_return', 'subsidy_pending', 'subsidy_disbursed_cfa',
                'subsidy_disbursed_sfa', 'project_handover_pending', 'project_handed_over'
            ];
            const fromStatus = (doc.current_status && VALID_PROJECT_STATUSES.includes(doc.current_status)) ? doc.current_status : null;

            await client.query(`
                INSERT INTO status_history (project_id, from_status, to_status, changed_by, remarks)
                VALUES ($1, $2, 'action_required', $3, $4)
            `, [doc.project_id, fromStatus, validUserBy, `Document Flagged: ${detail}`]);
        }

        await client.query("COMMIT");

        try {
            // Send notification to the agent who uploaded the document with specific instructions
            if (uploadedByUserId) {
                notifyUsers({
                    userId: uploadedByUserId,
                    projectId: doc.project_id || null,
                    title: `Correction Required: ${doc.doc_type?.replace(/_/g, ' ')}`,
                    body: `Document Desk has flagged your ${doc.doc_type?.replace(/_/g, ' ')} for correction. Reason: ${detail}. Please review and re-upload the correct document.`
                });
            }

            // Also notify doc_team and admins about the flag
            notifyUsers({
                targetRoles: ['admin', 'doc_team'],
                projectId: doc.project_id || null,
                title: `Document Flagged: ${doc.doc_type?.replace(/_/g, ' ')}`,
                body: `Document flagged and action assigned to ${uploaderName}. Reason: ${detail}`
            });
        } catch { /* notification catch */ }

        res.status(200).json({
            message: "Document successfully flagged for correction",
            data: {
                document: updatedDoc.rows[0],
                action: actionItem
            }
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error in flagDocument:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const uploadDocument = async (req, res) => {
    let uploadedObject;
    try {
        const { consumer_id, doc_type, file_name, geo_lat, geo_lng } = req.body;
        const uploaded_by = req.user?.userId || req.user?.id || req.body.uploaded_by;
        if (!consumer_id || !doc_type || !req.file || !uploaded_by) {
            return res.status(400).json({ error: "consumer_id, doc_type, file, and an authenticated uploader are required" });
        }

        uploadedObject = await uploadFileToS3({ file: req.file, consumerId: consumer_id, documentType: doc_type });
        const result = await pool.query(`
            INSERT INTO documents (consumer_id, doc_type, file_url, file_name, mime_type, geo_lat, geo_lng, uploaded_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [consumer_id, doc_type, uploadedObject.url, file_name || req.file.originalname, req.file.mimetype, geo_lat || null, geo_lng || null, uploaded_by]);

        const docRow = result.rows[0];
        const enrichedDoc = await attachPresignedUrls(docRow);
        res.status(201).json({ data: enrichedDoc });
    } catch (err) {
        if (uploadedObject?.key) await deleteFileFromS3(uploadedObject.key).catch(() => {});
        if (err.code === "23503") return res.status(400).json({ error: "Referenced consumer or authenticated user does not exist" });
        res.status(400).json({ error: err.message || "File upload failed" });
    }
};

export const getS3Health = async (req, res) => {
    try {
        const health = await checkS3Health();
        res.status(200).json({ success: true, ...health });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
            code: err.name || err.Code,
            tip: "Verify AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET in your .env file.",
        });
    }
};