import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REQUIRED_R2_ENV = [
  "CLOUDFLARE_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

function getR2Config() {
  const missing = REQUIRED_R2_ENV.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required R2 environment variables: ${missing.join(", ")}`);
  }

  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucketName: process.env.R2_BUCKET_NAME!,
  };
}

function getR2Client() {
  const config = getR2Config();
  return {
    bucketName: config.bucketName,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  };
}

/**
 * Generates a short-lived URL for uploading directly from the browser.
 */
export async function getSignedUploadUrl(key: string, mimeType: string) {
  const { bucketName, client } = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: mimeType,
  });

  return getSignedUrl(client, command, { expiresIn: 300 });
}

export async function getSignedDownloadUrl(key: string, downloadName?: string) {
  const { bucketName, client } = getR2Client();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    ResponseContentDisposition: downloadName
      ? `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`
      : undefined,
  });

  return getSignedUrl(client, command, { expiresIn: 900 });
}

export async function deleteR2Object(key: string) {
  const { bucketName, client } = getR2Client();
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await client.send(command);
}

export async function headR2Object(key: string) {
  const { bucketName, client } = getR2Client();
  return client.send(
    new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
}
