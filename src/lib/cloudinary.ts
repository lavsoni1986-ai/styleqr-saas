/**
 * Cloudinary image upload utility
 * Handles file uploads to Cloudinary using unsigned upload preset
 */

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
