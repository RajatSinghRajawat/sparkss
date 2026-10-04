const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// ─── AWS S3 Client Configuration (Lazy) ───
let _s3Client = null;

const getS3Client = () => {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return _s3Client;
};

// ─── Bucket name (supports multiple .env key names) ───
const getS3Bucket = () => {
  return (
    process.env.AWS_S3_BUCKET ||
    process.env.AWS_BUCKET_NAME ||
    process.env.AWS_BUCKET ||
    process.env.S3_BUCKET ||
    process.env.BUCKET_NAME
  );
};

// ─── Helper: Build public S3 URL (for storage reference only) ───
const getS3Url = (key) => {
  const bucket = getS3Bucket();
  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

/** Extract S3 object key from URL returned by getS3Url (e.g. https://bucket.s3.region.amazonaws.com/key) */
const getKeyFromS3Url = (url) => {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\.amazonaws\.com\/(.+)$/);
  return match ? match[1] : null;
};

/**
 * Generate a presigned PUT URL for direct client upload
 * @param {string} key - S3 object key
 * @param {string} contentType - MIME type
 * @param {number} expiresIn - URL validity in seconds (default 10 min)
 * @returns {Promise<string>} presigned URL
 */
const getPresignedUploadUrl = async (key, contentType, expiresIn = 600) => {
  const s3Client = getS3Client();
  const bucket = getS3Bucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return signedUrl;
};

/**
 * Generate a presigned GET URL for viewing/streaming private S3 objects
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL validity in seconds (default 1 hour)
 * @returns {Promise<string>} presigned GET URL
 */
const getPresignedViewUrl = async (key, expiresIn = 3600) => {
  if (!key) return null;

  const s3Client = getS3Client();
  const bucket = getS3Bucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return signedUrl;
};

/**
 * Avatars are stored as plain S3 URLs, but the bucket is private, so those
 * URLs return 403. Sign them on the way out; non-S3 URLs pass through.
 */
const signStoredUrl = async (url, expiresIn = 3600) => {
  if (!url) return null;
  const key = getKeyFromS3Url(url);
  if (!key) return url;
  try {
    return await getPresignedViewUrl(key, expiresIn);
  } catch {
    return url;
  }
};

module.exports = { getS3Client, getS3Bucket, getS3Url, getKeyFromS3Url, getPresignedUploadUrl, getPresignedViewUrl, signStoredUrl };
