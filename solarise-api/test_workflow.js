import pool from "./config/db.js";
import { flagDocument, reuploadDocument, verifyDocument, getVerificationQueue } from "./controllers/documents.controller.js";

async function runTest() {
    console.log("--- STARTING DOCUMENT CORRECTION WORKFLOW TEST ---");
    let testDocId = null;
    let newDocId = null;
    let actionId = null;
    const consumerId = 1;
    const agentUserId = 4;
    const adminUserId = 1;

    try {
        // Step 0: Insert a mock document v1
        console.log("1. Creating initial document v1 uploaded by Agent (ID: 4)...");
        const docInsert = await pool.query(`
            INSERT INTO documents (consumer_id, doc_type, file_url, file_name, status, version, uploaded_by)
            VALUES ($1, 'electric_bill', 'https://example.com/test_bill_v1.pdf', 'test_bill_v1.pdf', 'uploaded', 1, $2)
            RETURNING id
        `, [consumerId, agentUserId]);
        testDocId = docInsert.rows[0].id;
        console.log(`✓ Created test document ID: ${testDocId}`);

        // Step 1: Document Desk flags the document
        console.log("\n2. Testing Stage 1: Document Team flags document (flagDocument)...");
        const flagReq = {
            params: { id: testDocId },
            body: { detail: "Name mismatch in electric bill - shows different surname than registered" },
            user: { userId: adminUserId, role: 'doc_team' }
        };
        let flagResData = null;
        const flagRes = {
            status: (code) => ({
                json: (data) => {
                    flagResData = { code, data };
                    return flagResData;
                }
            })
        };

        await flagDocument(flagReq, flagRes);
        console.log("Flag response status:", flagResData?.code);
        console.log("Flag message:", flagResData?.data?.message);
        
        const flaggedDoc = await pool.query("SELECT status, reject_reason FROM documents WHERE id = $1", [testDocId]);
        console.log(`Document status: '${flaggedDoc.rows[0].status}', reason: '${flaggedDoc.rows[0].reject_reason}'`);
        if (flaggedDoc.rows[0].status !== 'action_required') throw new Error("Document status should be action_required");

        actionId = flagResData?.data?.data?.action?.id;
        console.log(`✓ Action created with ID: ${actionId}`);
        const actionCheck = await pool.query("SELECT status, assigned_to, action_type FROM action_required WHERE id = $1", [actionId]);
        console.log(`Action status: '${actionCheck.rows[0].status}', assigned_to: ${actionCheck.rows[0].assigned_to}, action_type: '${actionCheck.rows[0].action_type}'`);
        if (actionCheck.rows[0].status !== 'open') throw new Error("Action status should be open");
        if (Number(actionCheck.rows[0].assigned_to) !== agentUserId) throw new Error(`Action should be assigned to Agent ${agentUserId}`);

        const projectCheck1 = await pool.query("SELECT current_status FROM projects WHERE consumer_id = $1", [consumerId]);
        console.log(`Project status: '${projectCheck1.rows[0].current_status}'`);
        if (projectCheck1.rows[0].current_status !== 'action_required') throw new Error("Project status should be action_required");

        // Step 2: Agent re-uploads corrected document
        console.log("\n3. Testing Stage 2: Agent re-uploads corrected document (reuploadDocument)...");
        const reuploadReq = {
            params: { id: testDocId },
            body: {
                file_url: 'https://example.com/test_bill_v2_corrected.pdf',
                file_name: 'test_bill_v2_corrected.pdf',
                mime_type: 'application/pdf',
                action_id: actionId
            },
            user: { userId: agentUserId, role: 'agent' }
        };
        let reuploadResData = null;
        const reuploadRes = {
            status: (code) => ({
                json: (data) => {
                    reuploadResData = { code, data };
                    return reuploadResData;
                }
            })
        };

        await reuploadDocument(reuploadReq, reuploadRes);
        console.log("Reupload response status:", reuploadResData?.code);
        newDocId = reuploadResData?.data?.data?.id;
        const newVersion = reuploadResData?.data?.data?.version;
        console.log(`✓ New document created ID: ${newDocId}, version: ${newVersion}`);
        if (newVersion !== 2) throw new Error("New document version should be 2");

        const actionCheck2 = await pool.query("SELECT status FROM action_required WHERE id = $1", [actionId]);
        console.log(`Action status after re-upload: '${actionCheck2.rows[0].status}'`);
        if (actionCheck2.rows[0].status !== 'doc_uploaded') throw new Error("Action status should transition to doc_uploaded");

        // Step 3: Verification Queue contains the re-uploaded document
        console.log("\n4. Testing Verification Queue query (getVerificationQueue)...");
        let queueResData = null;
        const queueRes = {
            status: (code) => ({
                json: (data) => {
                    queueResData = { code, data };
                    return queueResData;
                }
            })
        };
        await getVerificationQueue({}, queueRes);
        const inQueue = queueResData?.data?.data?.find(d => Number(d.id) === Number(newDocId));
        console.log(`✓ Verification Queue has ${queueResData?.data?.count} items. Found our document? ${!!inQueue}`);
        if (!inQueue) throw new Error("Re-uploaded document must appear in verification queue");
        console.log(`   Previous version ID: ${inQueue.prev_id}, Action ID: ${inQueue.action_id}, Action status: ${inQueue.action_status}`);

        // Step 4: Document Team verifies the corrected document
        console.log("\n5. Testing Stage 3: Document Desk verifies document (verifyDocument)...");
        const verifyReq = {
            params: { id: newDocId },
            body: { verified_by: adminUserId },
            user: { userId: adminUserId, role: 'doc_team' }
        };
        let verifyResData = null;
        const verifyRes = {
            status: (code) => ({
                json: (data) => {
                    verifyResData = { code, data };
                    return verifyResData;
                }
            })
        };

        await verifyDocument(verifyReq, verifyRes);
        console.log("Verify response status:", verifyResData?.code);
        console.log("Verify response message:", verifyResData?.data?.message);

        const verifiedDoc = await pool.query("SELECT status, verified_by, reject_reason FROM documents WHERE id = $1", [newDocId]);
        console.log(`Document status: '${verifiedDoc.rows[0].status}', verified_by: ${verifiedDoc.rows[0].verified_by}`);
        if (verifiedDoc.rows[0].status !== 'verified') throw new Error("Document status should be verified");

        const actionCheck3 = await pool.query("SELECT status, resolved_by FROM action_required WHERE id = $1", [actionId]);
        console.log(`Action status after verification: '${actionCheck3.rows[0].status}', resolved_by: ${actionCheck3.rows[0].resolved_by}`);
        if (actionCheck3.rows[0].status !== 'resolved') throw new Error("Action status should be resolved");

        const projectCheck2 = await pool.query("SELECT current_status FROM projects WHERE consumer_id = $1", [consumerId]);
        console.log(`Project status after verification: '${projectCheck2.rows[0].current_status}'`);
        if (projectCheck2.rows[0].current_status !== 'doc_verified') throw new Error("Project status should return to doc_verified");

        console.log("\n🎉 ALL 3 STAGES OF DOCUMENT CORRECTION WORKFLOW PASSED SUCCESSFULLY! 🎉");

    } catch (err) {
        console.error("❌ Test failed:", err);
    } finally {
        console.log("\nCleaning up test artifacts from database...");
        if (actionId) await pool.query("DELETE FROM action_required WHERE id = $1", [actionId]).catch(() => {});
        if (testDocId) await pool.query("DELETE FROM documents WHERE id = $1", [testDocId]).catch(() => {});
        if (newDocId) await pool.query("DELETE FROM documents WHERE id = $1", [newDocId]).catch(() => {});
        // Reset project status
        await pool.query("UPDATE projects SET current_status = 'materials_delivered' WHERE consumer_id = $1", [consumerId]).catch(() => {});
        console.log("✓ Cleanup complete.");
        process.exit(0);
    }
}

runTest();
