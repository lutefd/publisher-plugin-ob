import { requestUrl } from "obsidian";
import { TFile, Vault } from "obsidian";
import PublisherPlugin from "../main";
import { uploadToS3 } from "./s3Utils";

/**
 * Converts an ArrayBuffer to a base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	let binary = "";
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;

	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}

	return window.btoa(binary);
}

/**
 * Gets the MIME type based on file extension
 */
function getContentType(extension: string): string {
	const extensionMap: Record<string, string> = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",
		svg: "image/svg+xml",
		bmp: "image/bmp",
		tiff: "image/tiff",
		tif: "image/tiff",
	};

	const ext = extension.toLowerCase().replace(".", "");
	return extensionMap[ext] || "application/octet-stream";
}

/**
 * Represents an image found in the note content
 */
interface ImageReference {
	originalText: string;
	path: string;
	alt: string | null;
}

/**
 * Extracts all Obsidian-style image references from the content
 */
export function extractImageReferences(content: string): ImageReference[] {
	const images: ImageReference[] = [];

	const obsidianImageRegex = /!\[\[(.*?)(?:\|(.*?))?\]\]/g;
	let match;

	while ((match = obsidianImageRegex.exec(content)) !== null) {
		const [originalText, path, alt] = match;
		images.push({
			originalText,
			path,
			alt: alt || null,
		});
	}

	return images;
}

/**
 * Resolves the actual path of an image based on attachment folder settings
 */
function resolveImagePath(
	plugin: PublisherPlugin,
	vault: Vault,
	imagePath: string
): TFile | null {
	try {
		let imageFile = vault
			.getFiles()
			.find(
				(file) => file.path === imagePath || file.path.endsWith(`/${imagePath}`)
			);

		if (imageFile) {
			return imageFile;
		}

		if (plugin.settings.attachmentFolder) {
			const attachmentPath = `${plugin.settings.attachmentFolder}/${imagePath}`;

			imageFile = vault
				.getFiles()
				.find(
					(file) =>
						file.path === attachmentPath ||
						file.path.endsWith(`/${attachmentPath}`)
				);

			if (imageFile) {
				return imageFile;
			}
		}

		const commonFolders = [
			"attachments",
			"images",
			"assets",
			"media",
			"resources",
		];

		for (const folder of commonFolders) {
			const folderPath = `${folder}/${imagePath}`;

			imageFile = vault
				.getFiles()
				.find(
					(file) =>
						file.path === folderPath || file.path.endsWith(`/${folderPath}`)
				);

			if (imageFile) {
				return imageFile;
			}
		}

		return null;
	} catch (error) {
		console.error("Error resolving image path:", error);
		return null;
	}
}

/**
 * Uploads an image to S3 via the configured API
 */
export async function uploadImageToS3(
	plugin: PublisherPlugin,
	vault: Vault,
	imagePath: string
): Promise<string | null> {
	try {
		if (
			!plugin.settings.s3ApiUrl &&
			!plugin.settings.cdnDomain &&
			!plugin.settings.s3AccessKeyId &&
			!plugin.settings.s3SecretAccessKey
		) {
			console.warn("S3 settings not configured, skipping image upload");
			return null;
		}

		const imageFile = resolveImagePath(plugin, vault, imagePath);

		if (!imageFile) {
			console.error(`Image file not found: ${imagePath}`);
			return null;
		}

		const imageData = await vault.readBinary(imageFile);

		const imageSize = imageData.byteLength;
		if (imageSize === 0) {
			console.error(`Error: Image file ${imageFile.path} is empty (0 bytes)`);
			return null;
		}

		const contentType = getContentType(imageFile.extension);
		if (
			plugin.settings.s3AccessKeyId &&
			plugin.settings.s3SecretAccessKey &&
			plugin.settings.s3BucketName
		) {
			const s3Url = await uploadToS3(
				plugin,
				imageFile.name,
				imageData,
				contentType
			);

			if (s3Url) {
				return s3Url;
			}

			console.warn("Direct S3 upload failed, falling back to API upload");
		}

		if (plugin.settings.s3ApiUrl && plugin.settings.cdnDomain) {
			const base64Data = arrayBufferToBase64(imageData);

			try {
				const response = await requestUrl({
					url: plugin.settings.s3ApiUrl,
					method: "POST",
					body: JSON.stringify({
						filename: imageFile.name,
						content: base64Data,
						contentType: contentType,
						path: imageFile.path,
					}),
					headers: {
						"Content-Type": "application/json",
					},
					throw: false,
				});

				if (response.status !== 200) {
					if (response.status === 501) {
						console.warn(
							`S3 API returned 501 Not Implemented. The server may not support this operation.`
						);
						return `${plugin.settings.cdnDomain}/fallback/${encodeURIComponent(
							imageFile.name
						)}`;
					}

					console.error(
						`Failed to upload image: ${response.status} ${response.text}`
					);
					return null;
				}

				try {
					const responseData = JSON.parse(response.text);
					const uploadedPath =
						responseData.path || responseData.url || responseData.location;

					if (!uploadedPath) {
						console.error(
							"Failed to get uploaded image path from response",
							responseData
						);
						return null;
					}

					const cdnDomain = plugin.settings.cdnDomain.endsWith("/")
						? plugin.settings.cdnDomain.slice(0, -1)
						: plugin.settings.cdnDomain;
					if (uploadedPath.startsWith("http")) {
						return uploadedPath;
					}

					const formattedPath = uploadedPath.startsWith("/")
						? uploadedPath
						: `/${uploadedPath}`;

					return `${cdnDomain}${formattedPath}`;
				} catch (parseError) {
					console.error("Failed to parse upload response", parseError);
					return null;
				}
			} catch (error) {
				console.error("Network error during image upload:", error);
				return `${plugin.settings.cdnDomain}/fallback/${encodeURIComponent(
					imageFile.name
				)}`;
			}
		}

		return null;
	} catch (error) {
		console.error("Error uploading image to S3:", error);
		return null;
	}
}

/**
 * Processes content to replace Obsidian image links with CDN URLs
 */
export async function processImagesInContent(
	content: string,
	plugin: PublisherPlugin,
	vault: Vault
): Promise<string> {
	if (!plugin.settings.s3ApiUrl || !plugin.settings.cdnDomain) {
		return content;
	}
	const imageRefs = extractImageReferences(content);

	if (imageRefs.length === 0) {
		return content;
	}

	let processedContent = content;
	for (const imageRef of imageRefs) {
		const cdnUrl = await uploadImageToS3(plugin, vault, imageRef.path);

		if (cdnUrl) {
			const markdownImage = `![${imageRef.alt || imageRef.path}](${cdnUrl})`;
			processedContent = processedContent.replace(
				imageRef.originalText,
				markdownImage
			);
		}
	}

	return processedContent;
}
