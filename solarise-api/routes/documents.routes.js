import { Router } from "express";
import {
    getAllDocuments,
    getDocumentById,
    getDocumentDownloadUrl,
    previewDocument,
    getDocumentsByConsumer,
    createDocument,
    uploadDocument,
    verifyDocument,
    rejectDocument,
    reuploadDocument,
    flagDocument,
    getDocumentStatusSummary,
    getS3Health,
    getVerificationQueue,
} from "../controllers/documents.controller.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware.js";
import { documentUpload } from "../middleware/upload.middleware.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Document upload, verification & management
 */

router.get("/verification-queue", authenticateToken, authorizeRoles('admin', 'doc_team', 'site_manager'), getVerificationQueue);

/**
 * @swagger
 * /api/documents/s3-health:
 *   get:
 *     summary: Test connection and permissions to AWS S3 bucket
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: Connected to S3
 *       500:
 *         description: S3 connection or credential error
 */
router.get("/s3-health", authenticateToken, authorizeRoles('admin', 'doc_team', 'agent', 'site_manager', 'accounts'), getS3Health);

/**
 * @swagger
 * /api/documents/status-summary:
 *   get:
 *     summary: Get document status summary
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: Summary of document statuses
 */
router.get("/status-summary", authenticateToken, authorizeRoles('doc_team', 'admin', 'agent', 'site_manager', 'accounts'), getDocumentStatusSummary);

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Get all documents
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: List of documents
 */
router.get("/", authenticateToken, authorizeRoles('agent', 'admin', 'doc_team', 'site_manager', 'accounts'), getAllDocuments);

/**
 * @swagger
 * /api/documents/consumer/{consumerId}:
 *   get:
 *     summary: Get documents by consumer ID
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: consumerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of documents for the consumer
 */
router.get("/consumer/:consumerId", authenticateToken, authorizeRoles('agent', 'admin', 'doc_team', 'site_manager', 'accounts'), getDocumentsByConsumer);

/**
 * @swagger
 * /api/documents/{id}/download-url:
 *   get:
 *     summary: Get temporary pre-signed S3 download URL
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Presigned S3 URL
 */
router.get("/:id/download-url", authenticateToken, authorizeRoles('agent', 'admin', 'doc_team', 'site_manager', 'accounts'), getDocumentDownloadUrl);
router.get("/:id/preview", previewDocument);

/**
 * @swagger
 * /api/documents/{id}:
 *   get:
 *     summary: Get document by ID
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document details
 *       404:
 *         description: Document not found
 */
router.get("/:id", authenticateToken, authorizeRoles('agent', 'admin', 'doc_team', 'site_manager', 'accounts'), getDocumentById);

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Upload a new document
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [consumer_id, doc_type, file_url]
 *             properties:
 *               consumer_id:
 *                 type: integer
 *               doc_type:
 *                 type: string
 *               file_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document created
 */
router.post("/", authenticateToken, authorizeRoles('agent', 'doc_team', 'admin', 'site_manager'), createDocument);
router.post("/upload", authenticateToken, authorizeRoles('agent', 'doc_team', 'admin', 'site_manager'), documentUpload.single("file"), uploadDocument);

/**
 * @swagger
 * /api/documents/{id}/verify:
 *   patch:
 *     summary: Verify a document
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document verified
 */
router.patch("/:id/verify", authenticateToken, authorizeRoles('admin', 'doc_team'), verifyDocument);

/**
 * @swagger
 * /api/documents/{id}/reject:
 *   patch:
 *     summary: Reject a document
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document rejected
 */
router.patch("/:id/reject", authenticateToken, authorizeRoles('admin', 'doc_team'), rejectDocument);

/**
 * @swagger
 * /api/documents/{id}/reupload:
 *   post:
 *     summary: Re-upload a rejected document (supports multipart file or file_url)
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Document re-uploaded
 */
router.post("/:id/reupload", authenticateToken, authorizeRoles('agent', 'admin', 'doc_team', 'site_manager'), documentUpload.single("file"), reuploadDocument);
router.post("/:id/flag", authenticateToken, authorizeRoles('agent', 'admin', 'doc_team', 'site_manager'), flagDocument);
router.patch("/:id/flag", authenticateToken, authorizeRoles('agent', 'admin', 'doc_team', 'site_manager'), flagDocument);

export default router;
