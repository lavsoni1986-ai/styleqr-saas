/**
 * Cloudinary image upload utility
 * Handles file uploads to Cloudinary using unsigned upload preset
 */

/**
 * Get a Cloudinary URL with optional size transformation.
 * Use smaller dimensions to reduce load time and avoid 504 timeouts.
 * Format: w_WIDTH,h_HEIGHT,c_fill,f_auto,q_auto
 */
export function getCloudinaryThumbnail(
  url: string | null | undefined,
  opts?: { width?: number; height?: number }
): string {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) {
    return url || "";
  }
  const w = opts?.width ?? 400;
  const h = opts?.height ?? 400;
  const transform = `w_${w},h_${h},c_fill,f_auto,q_auto`;
  // Insert transformation after /upload/ and before version or path
  return url.replace(/\/upload\/(v\d+\/)?/, `/upload/${transform}/$1`);
}

export const uploadToCloudinary = async (file: File): Promise<string> => {
  // Validate file
  if (!file) {
    throw new Error("No file provided");
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("Image size must be less than 10MB");
  }

  // Get Cloudinary config from environment
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dbz0kkwaj";
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "shahdol_preset";

  // Validate Cloudinary config
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary configuration is missing. Please check environment variables.");
  }

  // Create FormData
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    // Check if response is OK
    if (!response.ok) {
      let errorMessage = `Upload failed with status ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch (parseError) {
        // If JSON parsing fails, try to get text
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        } catch (textError) {
          // Use default error message
        }
      }

      throw new Error(errorMessage);
    }

    // Parse response
    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("Failed to parse Cloudinary response:", parseError);
      throw new Error("Invalid response from Cloudinary. Please try again.");
    }

    // Validate response has secure_url
    if (!data || !data.secure_url) {
      console.error("Cloudinary response missing secure_url:", data);
      throw new Error("Upload response missing image URL. Please try again.");
    }

    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    // Re-throw known errors
    if (error instanceof Error) {
      throw error;
    }

    // Handle unknown errors
    throw new Error("Failed to upload image. Please check your connection and try again.");
  }
};
