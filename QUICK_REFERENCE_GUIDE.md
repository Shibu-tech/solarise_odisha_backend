# Document Correction Workflow - Quick Reference Guide

## Quick Start for Different Roles

---

## 👤 For AGENTS (Field Workers)

### What Happens:
1. You upload a document
2. Document Team reviews it
3. If issue found → You get notification: "Correction Required"
4. You re-upload the correct document
5. Document Team verifies
6. You get notification: "Correction Accepted ✓"

### What You See:
- **Badge in Dashboard**: Shows count of corrections needed
- **Correction Card**: Shows what's wrong and deadline
- **Re-upload Form**: Simple file upload interface
- **Status**: Shows if waiting for doc team to verify

### What You Do:
1. Open app → See "2 Corrections" badge
2. Click badge → See list of corrections
3. Click "Re-upload" → Select corrected file → Submit
4. Wait for Document Team to verify
5. Get notification when accepted

### Key Points:
- ✓ Only re-upload documents assigned to you
- ✓ Read the correction reason carefully
- ✓ Upload the exact corrected version
- ✓ Check notification when verification complete
- ⚠️ Don't ignore pending corrections - they block project progress

---

## 👥 For DOCUMENT TEAM (Verifiers)

### What Happens:
1. Agent uploads document
2. You review it
3. If issue → Flag it with reason
4. Agent re-uploads correction
5. You verify the corrected document
6. Issue resolved, action closed

### What You See:
- **Documents for Review**: Documents uploaded by agents
- **Re-uploaded Documents**: Documents awaiting your verification
- **Flagged Reason**: Shows why you flagged each document
- **Version History**: Compare old vs new versions

### What You Do:
1. **To Flag**: Select document → Click "Flag" → Enter reason → Select issue type → Submit
2. **To Verify**: Open document → Download both versions → Click "Verify" → Confirm
3. **To Reject**: Open document → Click "Reject" → Enter reason → Submit

### Key Points:
- ✓ Check both versions before verifying
- ✓ Be specific when flagging (helps agent understand)
- ✓ Verify only when 100% sure it's correct
- ⚠️ Wrong verification blocks project completion

---

## 🏢 For ADMINS (Supervisors)

### What You Can See:
- **All Pending Corrections**: Every correction in system
- **Overdue Corrections**: Corrections open > 5 days
- **Workflow Statistics**: 
  - Pending actions count
  - Pending verifications count
  - Average resolution time
- **Agent Performance**: Who has most corrections
- **Document Team Performance**: Average verification time

### What You Do:
1. **Monitor**: Check "Workflow Stats" dashboard daily
2. **Escalate**: Identify overdue corrections
3. **Coach**: Review agents with high correction rates
4. **Report**: Generate performance reports

### Key Points:
- ✓ Check overdue actions weekly
- ✓ Follow up with agents on >3 day delays
- ✓ Track document team verification speed
- ⚠️ Escalate critical delays to management

---

## 📊 Workflow Status Codes

| Status | Means | Who Acts |
|--------|-------|----------|
| `open` | Waiting for agent to re-upload | Agent |
| `doc_uploaded` | Agent uploaded, waiting for doc team | Doc Team |
| `resolved` | ✓ Verified and closed | - |

---

## 🔔 Notifications You'll Receive

### Agent Gets:
1. "Correction Required" → Do this now
2. "Document Re-uploaded (v2)" → Confirms receipt
3. "Document Correction Accepted ✓" → Problem solved!

### Doc Team Gets:
1. "Document Flagged" → Action assigned to X
2. "Document Re-uploaded" → Ready to verify
3. "Action Resolved" → Done!

---

## 📱 Mobile Actions

| Action | Button | Location |
|--------|--------|----------|
| See corrections | Badge | Dashboard header |
| Re-upload | Blue button | Correction card |
| Verify document | Green button | Document review |
| Reject document | Red button | Document review |

---

## ⚡ Common Tasks

### As Agent:
```
See correction → Open notification → Re-upload file → Wait → Done
```

### As Doc Team:
```
See document → Preview both versions → Click Verify → Done
```

### As Admin:
```
Check dashboard → View stats → Identify issues → Follow up
```

---

## 📈 Key Metrics

| Metric | Target | Formula |
|--------|--------|---------|
| Avg Resolution Time | < 24 hours | Total time / corrections |
| Verification Speed | < 4 hours | Time to verify from re-upload |
| Correction Rate | < 10% | Corrections / Total documents |
| First-Time Pass | > 70% | Accepted re-uploads / Total re-uploads |

---

## ⚠️ Common Issues & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| "Can't re-upload" | Already rejected | Read rejection reason, try again |
| "Document won't verify" | Still has issue | Ask agent for more details |
| "Can't see correction" | App not synced | Close app, reopen, refresh |
| "Notification missing" | Internet issue | Check connection, retry |

---

## 📞 Support & Escalation

| Issue | Action |
|-------|--------|
| Can't upload file | Check file size (< 10MB) & format |
| Document keeps getting rejected | Contact Document Team supervisor |
| Notification not showing | Refresh app or restart |
| Agent not responding | Escalate to Site Manager |
| System error | Contact Support team |

---

## 🎯 Success Criteria

### Project is Unblocked When:
✓ All flagged documents verified
✓ All corrections accepted
✓ Project status: `doc_verified`
✓ No pending actions for this project

### Agent Performance (Monthly):
✓ Corrections < 5% of documents
✓ First-time pass rate > 80%
✓ Average resolution time < 24 hours

### Doc Team Performance (Monthly):
✓ Average verification time < 4 hours
✓ Re-rejection rate < 10%
✓ All corrections resolved within SLA

---

## 🔄 Process Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│         DOCUMENT CORRECTION WORKFLOW                │
└─────────────────────────────────────────────────────┘

1. AGENT UPLOADS DOCUMENT
   └─→ Status: uploaded
       Doc Team reviews

2. DOC TEAM FINDS ISSUE
   └─→ Flags document
       Action created: status = open
       Agent assigned
       └─→ Status: action_required
           Agent notified: "Correction Required"

3. AGENT RE-UPLOADS CORRECTED
   └─→ New version created
       Action status: doc_uploaded
       Doc Team notified: "Ready for verification"
       └─→ Status: uploaded
           Awaiting verification

4. DOC TEAM VERIFIES
   ├─→ ACCEPTS ✓
   │   └─→ Action: resolved
   │       Project: doc_verified
   │       Agent: "Accepted ✓"
   │       ✓ WORKFLOW COMPLETE
   │
   └─→ REJECTS
       └─→ Agent: "Try again"
           Back to step 3
```

---

## 📋 Daily Checklist

### For Agents:
- [ ] Check dashboard for pending corrections
- [ ] Open correction details
- [ ] Understand the issue
- [ ] Collect corrected document
- [ ] Re-upload in system
- [ ] Check status daily
- [ ] Read acceptance notification when ready

### For Doc Team:
- [ ] Check "Documents for Review" queue
- [ ] Review each document
- [ ] Flag issues with clear reasons
- [ ] Check "Pending Verification" queue
- [ ] Compare old vs new versions
- [ ] Verify correct documents
- [ ] Track resolution time

### For Admin:
- [ ] Check dashboard stats
- [ ] Identify overdue corrections (> 5 days)
- [ ] Follow up with agents
- [ ] Monitor doc team performance
- [ ] Escalate critical items
- [ ] Weekly review with managers

---

## 🎓 Training

### For New Agents:
1. Watch: Document upload video (3 min)
2. Learn: How to read correction reason (2 min)
3. Practice: Upload test document (5 min)
4. Practice: Re-upload corrected document (5 min)
5. Quiz: Know when to re-upload (2 min)

### For New Doc Team:
1. Watch: Document review process (5 min)
2. Learn: How to flag documents (3 min)
3. Practice: Flag test document (5 min)
4. Practice: Verify corrected document (5 min)
5. Quiz: Know acceptance criteria (3 min)

### For New Admins:
1. Watch: System overview (10 min)
2. Learn: Dashboard navigation (5 min)
3. Practice: View pending corrections (5 min)
4. Practice: Check agent performance (5 min)
5. Learn: Escalation process (5 min)

---

## 🆘 Quick Help Links

- **Agent Help**: [View Corrections Guide]
- **Doc Team Help**: [Verification Process Guide]
- **Admin Help**: [Dashboard Guide]
- **Full Documentation**: [DOCUMENT_CORRECTION_WORKFLOW.md]
- **API Reference**: [API_EXAMPLES.md]
- **Submit Issue**: [Support Portal]

---

## Version & Updates

- **Version**: 1.0
- **Last Updated**: 2024-09-12
- **Status**: Active
- **Next Review**: 2024-10-12

---

## Contact & Support

- **Agent Issues**: Contact your Site Manager
- **Doc Team Questions**: Contact Document Team Lead
- **System Issues**: Contact IT Support
- **General Questions**: Email: support@solarise.com
