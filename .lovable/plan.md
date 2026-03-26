

# Side Effect Analysis: Adding Print PDF Button to DocumentationTab

## The Change

Add a `handlePrintDocument` function and a "Print" button next to the existing "View" button in the Completed Notes table of `DocumentationTab.tsx`. The function calls `getDocumentDownloadURL(doc.file_path)` and opens the signed URL in a new browser tab for native print.

**Only one file is modified: `DocumentationTab.tsx`.**

---

## Side Effects Ranked by Severity

### NEGLIGIBLE — No functional risk

| # | Item | Severity | Explanation |
|---|------|----------|-------------|
| 1 | Existing "View" button behavior | NONE | Untouched. No code is modified, only a new button added next to it. |
| 2 | DocumentViewer / SessionNoteViewer / TreatmentPlanViewer | NONE | Not modified. View functionality continues to work exactly as before. |
| 3 | Patient portal (MyDocuments.tsx) | NONE | Separate component. Does not share code with DocumentationTab's table rendering. It will NOT get the Print button — only the clinician/admin side does. |
| 4 | PDF generation / storage flow | NONE | Read-only operation. `getDocumentDownloadURL` creates a signed URL — it does not modify or regenerate anything. |
| 5 | RLS / permissions | NONE | `getDocumentDownloadURL` uses the same Supabase client with the logged-in user's session. The `clinical_documents` storage bucket already allows clinicians and admins to read files for their assigned clients. This is the same path InformedConsentViewer and ClientHistoryViewer already use successfully. |

### LOW — Minor UX considerations

| # | Item | Severity | Explanation |
|---|------|----------|-------------|
| 6 | Documents with missing/bad `file_path` | LOW | If a document's PDF failed to upload, the Print button would open a new tab that fails to load. Mitigation: disable the Print button when `file_path` is null/empty or starts with `pending-`/`pdf-generation-failed-`. The `fetchFilteredClinicalDocuments` function already filters these out, so this is unlikely to occur in practice. |
| 7 | Actions column width | LOW | Adding a second button may cause the Actions column to be slightly wider. On narrow screens, this could push content. Mitigation: use icon-only button (Printer icon, no text label) to minimize width. |

### Summary

This is an additive-only change to a single file. It adds a button and a function. It does not modify any existing behavior, does not touch any other component, and uses an already-proven storage access pattern. The risk profile is essentially zero.

