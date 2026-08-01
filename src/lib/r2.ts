import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

// These variables are usually not available in the client-side bundle for security reasons
// except if they are prefixed with VITE_.
// However, R2 uploads should ideally happen via a secure backend or signed URLs.
// Since this is a Vite app, if we do it client-side, we need to be careful.
// The user provided these keys and said "write them into the .env", implying client-side use for now.

const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID || import.meta.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || import.meta.env.R2_SECRET_ACCESS_KEY || '';
const R2_S3_API_ENDPOINT = import.meta.env.VITE_R2_S3_API_ENDPOINT || import.meta.env.R2_S3_API_ENDPOINT || '';
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || 'https://cdn.fract.online';

export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_S3_API_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Checks if an object exists in R2.
 */
export const checkObjectExists = async (bucket: string, path: string): Promise<boolean> => {
  try {
    const command = new HeadObjectCommand({
      Bucket: 'fract-cdn',
      Key: `${bucket}/${path}`,
    });
    await r2Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
};

export const uploadToR2 = async (bucket: string, path: string, file: Blob | File): Promise<string> => {
  const targetKey = `${bucket}/${path}`;
  
  try {
    // Convert Blob/File to Uint8Array to avoid 'readableStream.getReader is not a function' 
    // error in some browser environments with @aws-sdk/client-s3 flexible checksums.
    const arrayBuffer = await file.arrayBuffer();
    const body = new Uint8Array(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: 'fract-cdn',
      Key: targetKey,
      Body: body,
      ContentType: file.type,
    });

    await r2Client.send(command);
    // Return the public URL
    return `${R2_PUBLIC_URL}/${targetKey}`;
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw error;
  }
};

/**
 * Gets the public URL for an R2 object.
 */
export const getR2PublicUrl = (bucket: string, path: string): string => {
  return `${R2_PUBLIC_URL}/${bucket}/${path}`;
};
