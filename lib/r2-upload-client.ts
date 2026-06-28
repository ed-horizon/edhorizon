"use client";

import {
  completeR2UploadAction,
  deleteR2UploadAction,
  prepareR2UploadAction,
} from "@/app/(dashboard)/attendance/actions";

export type R2UploadPurpose =
  | "teacher_material"
  | "homework_submission"
  | "student_material";

export interface R2UploadContext {
  purpose: R2UploadPurpose;
  studentId?: string;
  homeworkId?: string;
}

export async function uploadFileDirectToR2(file: File, context: R2UploadContext) {
  const request = {
    ...context,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  };

  const prepared = await prepareR2UploadAction(request);
  if (!prepared.success || !prepared.uploadUrl || !prepared.fileKey) {
    throw new Error(prepared.error || "Unable to prepare the file upload.");
  }

  let uploaded = false;
  try {
    const response = await fetch(prepared.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`R2 upload failed with status ${response.status}.`);
    }
    uploaded = true;

    const completed = await completeR2UploadAction({
      ...request,
      fileKey: prepared.fileKey,
    });
    if (!completed.success) {
      throw new Error(completed.error || "Unable to verify the uploaded file.");
    }

    return prepared.fileKey;
  } catch (error) {
    if (uploaded) {
      await deleteR2UploadAction({
        ...context,
        fileKey: prepared.fileKey,
      });
    }
    throw error;
  }
}

export async function deleteUploadedR2File(fileKey: string, context: R2UploadContext) {
  return deleteR2UploadAction({
    ...context,
    fileKey,
  });
}
