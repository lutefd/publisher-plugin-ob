import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requestUrl } from "obsidian";
import PublisherPlugin from "../main";

/**
 * Sanitize filename to avoid URL encoding issues
 */
function sanitizeFileName(fileName: string): string {
	return fileName
		.replace(/\s+/g, "-")
		.replace(/[^a-zA-Z0-9.\-_]/g, "")
		.toLowerCase();
}

/**
 * Simplified HTTP handler for Obsidian
 */
class ObsidianHttpHandler {
	async handle(request: any): Promise<{ response: any }> {
		const protocol = request.protocol || "https:";
		const hostname = request.hostname;
		const port = request.port ? `:${request.port}` : "";
		const path = request.path || "/";

		let query = "";
		if (request.query && Object.keys(request.query).length > 0) {
			const queryParams = new URLSearchParams();
			for (const [key, value] of Object.entries(request.query)) {
				if (value !== undefined && value !== null) {
					queryParams.append(key, String(value));
				}
			}
			query = queryParams.toString() ? `?${queryParams.toString()}` : "";
		}

		const url = `${protocol}//${hostname}${port}${path}${query}`;

		const headers: Record<string, string> = {};
		if (request.headers) {
			for (const [key, value] of Object.entries(request.headers)) {
				const lowerKey = key.toLowerCase();
				if (lowerKey === "host" || lowerKey === "user-agent") continue;
				headers[key] = Array.isArray(value) ? value.join(", ") : String(value);
			}
		}

		let body: ArrayBuffer | undefined;
		if (request.body) {
			if (request.body instanceof Uint8Array) {
				body = request.body.buffer.slice(
					request.body.byteOffset,
					request.body.byteOffset + request.body.byteLength
				);
			} else if (request.body instanceof ArrayBuffer) {
				body = request.body;
			} else if (typeof request.body === "string") {
				body = new TextEncoder().encode(request.body).buffer;
			}
		}

		try {
			const response = await requestUrl({
				url,
				method: request.method || "GET",
				headers,
				body,
				throw: false,
			});

			return {
				response: {
					statusCode: response.status,
					headers: response.headers || {},
					body: response.arrayBuffer || new Uint8Array(),
				},
			};
		} catch (error) {
			console.error("RequestURL Handler error:", error);
			throw error;
		}
	}
}

export async function uploadToS3(
	plugin: PublisherPlugin,
	fileName: string,
	fileContent: ArrayBuffer,
	contentType: string
): Promise<string | null> {
	try {
		if (
			!plugin.settings.s3AccessKeyId ||
			!plugin.settings.s3SecretAccessKey ||
			!plugin.settings.s3BucketName ||
			!plugin.settings.s3ApiUrl
		) {
			console.warn("S3 credentials not configured");
			return null;
		}

		const cleanFileName = sanitizeFileName(fileName);
		const objectKey = `uploads/${cleanFileName}`;

		const endpoint = plugin.settings.s3ApiUrl;

		const s3Client = new S3Client({
			region: "auto",
			endpoint,
			credentials: {
				accessKeyId: plugin.settings.s3AccessKeyId,
				secretAccessKey: plugin.settings.s3SecretAccessKey,
			},
			requestHandler: new ObsidianHttpHandler(),
			forcePathStyle: false,
		});

		const putCommand = new PutObjectCommand({
			Bucket: plugin.settings.s3BucketName,
			Key: objectKey,
			ContentType: contentType,
		});

		const presignedUrl = await getSignedUrl(s3Client, putCommand, {
			expiresIn: 3600,
		});

		const response = await requestUrl({
			url: presignedUrl,
			method: "PUT",
			contentType,
			body: fileContent,
			throw: false,
		});

		if (response.status !== 200) {
			console.error(
				`Presigned URL upload failed: ${response.status} ${response.text}`
			);
			return null;
		}

		const cdnDomain = plugin.settings.cdnDomain || endpoint;
		return `${cdnDomain}/${objectKey}`;
	} catch (error) {
		console.error("S3 upload with presigned URL error:", error);
		return null;
	}
}
