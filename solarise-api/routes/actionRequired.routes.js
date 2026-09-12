import { Router } from "express";
import {
    getAllOpenActions,
    getMyOpenActions,
    getActionsByProject,
    createAction,
    updateActionStatus,
    getOverdueActions,
} from "../controllers/actionRequired.controller.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware.js";
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Actions
 *   description: Action items / tasks required for projects
 */

/**
 * @swagger
 * /api/actions/my-open-actions:
 *   get:
 *     summary: Get open actions assigned to current user
 *     tags: [Actions]
 *     responses:
 *       200:
 *         description: List of my open actions
 */
router.get("/my-open-actions", authenticateToken, authorizeRoles('admin', 'agent', 'site_manager', 'doc_team', 'accounts'), getMyOpenActions);

/**
 * @swagger
 * /api/actions/overdue:

 *   get:
 *     summary: Get overdue action items
 *     tags: [Actions]
 *     responses:
 *       200:
 *         description: List of overdue actions
 */
router.get("/overdue", authenticateToken, authorizeRoles('admin', 'agent', 'site_manager', 'doc_team', 'accounts'), getOverdueActions);

/**
 * @swagger
 * /api/actions/project/{projectId}:
 *   get:
 *     summary: Get actions by project ID
 *     tags: [Actions]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Actions for the project
 */
router.get("/project/:projectId", authenticateToken, authorizeRoles('admin', 'agent', 'site_manager', 'doc_team', 'accounts'), getActionsByProject);

/**
 * @swagger
 * /api/actions:
 *   get:
 *     summary: Get all open actions
 *     tags: [Actions]
 *     responses:
 *       200:
 *         description: List of open actions
 */
router.get("/", authenticateToken, authorizeRoles('admin', 'agent', 'site_manager', 'doc_team', 'accounts'), getAllOpenActions);

/**
 * @swagger
 * /api/actions:
 *   post:
 *     summary: Create an action item
 *     tags: [Actions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [project_id, action_type, description]
 *             properties:
 *               project_id:
 *                 type: integer
 *               action_type:
 *                 type: string
 *               description:
 *                 type: string
 *               due_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Action created
 */
router.post("/", authenticateToken, authorizeRoles('admin', 'agent', 'site_manager', 'doc_team', 'accounts'), createAction);

/**
 * @swagger
 * /api/actions/{id}/status:
 *   patch:
 *     summary: Update action status
 *     tags: [Actions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch("/:id/status", authenticateToken, authorizeRoles('admin', 'doc_team', 'site_manager'), updateActionStatus);

export default router;
