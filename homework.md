# Homework & Worksheet Upload Workflow

## 1. Goal
Build a real homework and worksheet upload system for EdHorizon.

The current app already has teacher-to-student homework and material flows, but some upload paths generate fake Supabase Storage URLs instead of storing real files. Future agents should replace those fake URLs with real object storage while preserving the current product flow.

Primary goals:
- Replace fake upload URLs with real file storage.
- Support teacher worksheet uploads.
- Support student homework submissions as photos, PDFs, Word documents, or other approved worksheet media.
- Support existing quiz and capsule assignments where useful.
- Keep the implementation memory-efficient and free-tier friendly.

## 2. Recommended Storage Architecture
Use **Cloudflare R2** as private object storage and keep **Supabase/Postgres** as the source of truth for metadata, permissions, assignments, and submissions.

Required architecture:
- Store files in a private Cloudflare R2 bucket.
- Store metadata in Supabase/Postgres only.
- Upload files directly from the browser to R2 using short-lived signed upload URLs.
- Download files through short-lived signed read URLs.
- Do not stream full file bodies through Next.js server actions or route handlers.
- Do not store file blobs in Postgres.

The database should store metadata such as:
- R2 object key
- original filename
- MIME type
- byte size
- uploaded-by user ID
- student ID
- teacher ID when applicable
- homework assignment ID or capsule ID when applicable
- upload purpose, such as `teacher_material`, `homework_submission`, `student_material`, or `preview`
- retention/expiry timestamp
- deleted/expired status

This keeps the Next.js server memory-efficient because the server only signs upload/download requests and writes metadata.

## 3. Cloudflare R2 Setup Guide
Recommended bucket name: `edhorizon-homework`.

Setup steps:
1. Create or use an existing Cloudflare account.
2. Enable R2.
3. Create a private R2 bucket named `edhorizon-homework`.
4. Create an R2 API token with object read/write permissions scoped to that bucket.
5. Add these environment variables:

```env
CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=edhorizon-homework
R2_PUBLIC_BASE_URL=
```

Use `R2_PUBLIC_BASE_URL` only when a public/custom domain is intentionally configured. The preferred default is private objects with signed download URLs.

Implementation notes:
- Use Cloudflare R2 through its S3-compatible API.
- A standard S3-compatible SDK/client is enough for application integration.
- Signed upload URLs should be short-lived.
- Signed download URLs should be short-lived.
- Object keys should include stable ownership prefixes, for example:
  - `students/{studentId}/homework/{homeworkId}/submissions/{fileId}-{safeFilename}`
  - `students/{studentId}/materials/{fileId}-{safeFilename}`
  - `tmp/{userId}/{fileId}-{safeFilename}`

## 4. Cloudflare MCP / Plugin Guidance
No Cloudflare MCP/plugin was discoverable in the current Codex tool environment when this workflow was written.

If a Cloudflare MCP server or plugin is installed later:
- Use it for bucket inspection, configuration checks, or setup assistance.
- Use it to confirm lifecycle rules, bucket names, and access settings when available.
- Do not make app-side implementation depend on the MCP/plugin.

If no Cloudflare MCP/plugin is available:
- Guide the user through the Cloudflare dashboard.
- Use Cloudflare's R2 documentation and API docs.
- Implement the app integration with standard S3-compatible credentials and SDK calls.

Agents must not block implementation just because a Cloudflare plugin is unavailable.

## 5. Supported Upload Types
Support worksheet, homework, and assignment media that parents, students, and teachers are likely to use.

Allowed MIME types for v1:
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `image/jpeg`
- `image/png`
- `image/webp`
- optionally `image/heic`
- optionally `image/heif`

Recommended file handling:
- Preserve original files for readability.
- Allow students to submit photos of handwritten work.
- Allow teachers to upload PDF worksheets and Word documents.
- Generate previews or thumbnails only as optional UI optimization.
- Validate MIME type and file size before issuing a signed upload URL.

## 6. Compression / Quality Policy
Homework files must remain readable. Do not destructively compress original files.

Required policy:
- Preserve original PDFs, DOCX files, and photos.
- Do not convert every uploaded image to lower-quality JPEG.
- Do not downsample photos in a way that makes handwriting hard to read.
- Strip metadata where safe.
- Optionally generate smaller preview images for dashboards.
- Use previews only for UI speed; downloads/reviews should use the original file.

The safest model is:
- original object: permanent record during retention window
- optional preview object: small generated copy for UI display

## 7. Cleanup / Retention Policy
Use two cleanup layers:
- Cloudflare R2 lifecycle rules for object deletion.
- Supabase/Postgres cleanup job for metadata expiry/deleted status.

Suggested retention defaults:
- Temporary unattached uploads: delete after 24 hours.
- Submitted homework files: keep for 90 days after submission.
- Teacher-shared worksheets/materials: keep for 180 days.
- Archived/completed course material: keep for 180 days after completion.

Important:
- Do not delete official payment, receipt, or compliance files under this workflow.
- Keep payment/receipt storage separate from homework storage and retention rules.
- Cleanup should hide expired metadata from dashboards and remove expired R2 objects.

## 8. How This Fits Existing Code
The existing homework/material workflow already exists and should be extended rather than replaced.

Known existing code areas:
- Homework/material server actions are in `app/(dashboard)/attendance/actions.ts`.
- Teacher dialogs are in `components/features/teacher/StudentActionDialogs.tsx`.
- Student homework/material UI is in `components/features/student/StudentDashboardClient.tsx`.

Known existing tables:
- `homework_assignments`
- `student_materials`
- `capsules`
- `quiz_completions`

Known existing behavior:
- Teachers can assign homework.
- Teachers can share worksheet/material links.
- Students can submit homework photos.
- Students can upload completed worksheets.
- Quiz and flashcard capsules already exist in the content system.

Future agents should reuse the existing quiz/capsule builder instead of creating a separate quiz system.

## 9. Target Product Model
Move toward one unified assignment experience.

Target model:
- Teacher creates one assignment.
- Assignment may include:
  - instructions
  - worksheet files
  - PDF or Word documents
  - quiz capsule
  - flashcard capsule
  - due date
  - expected submission type
- Student opens one task.
- Student can complete the quiz, upload a written/photo/PDF/DOCX submission, or both.
- Teacher can review the submitted files and quiz result from one place.

Initial implementation can keep the existing `homework_assignments`, `student_materials`, and `capsules` tables, then add file metadata first. A fuller unified `assignments` model can come later.

## 10. Implementation Priorities
Implement in this order:

1. Replace fake URLs with real Cloudflare R2 uploads.
2. Add signed upload and signed download server actions or API routes.
3. Add a file metadata table or structured metadata fields.
4. Validate MIME type, file size, ownership, and upload purpose before issuing signed URLs.
5. Fix RLS/policies so students can safely submit homework.
6. Ensure teachers can only access assigned students' files.
7. Add R2 lifecycle cleanup rules.
8. Add DB cleanup for expired metadata.
9. Later, unify homework/materials/capsules into a richer assignment model.

## 11. Test Plan For Future Implementation
Future implementation must verify:
- Teacher can upload a PDF worksheet and student can download it.
- Teacher can upload an image worksheet and student can download it.
- Teacher can upload a DOCX worksheet and student can download it.
- Student can upload JPG or PNG homework photo submission.
- Student can upload PDF homework submission.
- Student can upload DOCX homework submission.
- Large files upload directly to R2 without loading into server memory.
- Invalid MIME types are rejected before signed upload.
- Oversized files are rejected before signed upload.
- Signed upload URLs expire and cannot be reused indefinitely.
- Signed download URLs expire and cannot be reused indefinitely.
- Student cannot access another student's files.
- Teacher cannot access files for students not assigned to them.
- Admin/super-admin access still works where intended.
- Cleanup removes expired R2 objects.
- Cleanup hides expired metadata from dashboards.

## 12. Assumptions
- Cloudflare R2 is the chosen storage provider because it has a practical free tier and free egress.
- Supabase remains the source of truth for users, roles, assignments, submissions, and metadata.
- Original uploads should be preserved for quality and readability.
- Compression should be limited to previews or safe metadata removal.
- This workflow document is documentation only and does not change application behavior by itself.
