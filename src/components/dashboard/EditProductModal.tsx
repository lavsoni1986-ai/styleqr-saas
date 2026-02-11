"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Upload, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { uploadToCloudinary, getCloudinaryThumbnail } from "@/lib/cloudinary";

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  image?: string | null;
  categoryId: string;
  categoryName?: string;
}

interface Category {
  id: string;
  name: string;
}

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  onSave: (updatedProduct: Product) => void;
}

export default function EditProductModal({
  isOpen,
  onClose,
  product,
  categories,
  onSave,
}: EditProductModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
    categoryId: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        price: product.price ? product.price.toString() : "",
        image: product.image || "",
        categoryId: product.categoryId || "",
      });
      setError(null);
      setSuccess(null);
    }
  }, [product]);

  const handleClose = () => {
    if (!isLoading && !isUploading) {
      onClose();
      setError(null);
      setSuccess(null);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const url = await uploadToCloudinary(file);
      setFormData((prev) => ({ ...prev, image: url }));
      setSuccess("Image uploaded successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Image upload error:", error);
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || isLoading || isUploading) return;

    // Validate required fields
    if (!formData.name.trim()) {
      setError("Product name is required");
      return;
    }

    if (!formData.price || formData.price.trim() === "") {
      setError("Price is required");
      return;
    }

    if (!formData.categoryId) {
      setError("Category is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        setError("Please enter a valid price");
        setIsLoading(false);
        return;
      }

      const payload = {
        name: formData.name.trim(),
        price,
        description: formData.description.trim() || null,
        categoryId: formData.categoryId.trim(),
        image: formData.image && formData.image.trim() ? formData.image.trim() : null,
      };

      const response = await fetch(`/api/admin/menu-items/${product.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      let result: any;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        setError("Server returned invalid response");
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        // Ensure result is an object with error message
        const errorMessage = 
          (result && typeof result === "object" && "error" in result && typeof result.error === "string")
            ? result.error
            : `Failed to update product (${response.status})`;
        
        console.error("Update failed:", {
          status: response.status,
          statusText: response.statusText,
          error: result?.error,
          result,
        });
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      // Validate response structure
      if (!result || typeof result !== "object") {
        console.error("Invalid response structure:", result);
        setError("Received invalid response from server");
        setIsLoading(false);
        return;
      }

      // Extract product and message from response
      const updatedProduct = (result.product && typeof result.product === "object")
        ? result.product
        : (result && "id" in result ? result : null);
      
      const successMessage = 
        (typeof result.message === "string" ? result.message : null) ||
        "Product updated successfully!";

      if (!updatedProduct) {
        console.error("Response missing product data:", result);
        setError("Response missing product data");
        setIsLoading(false);
        return;
      }

      setSuccess(successMessage);
      
      // Call onSave callback with updated product
      if (onSave && typeof onSave === "function") {
        onSave(updatedProduct);
      }

      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error("Update product error:", error);
      
      if (error instanceof TypeError && error.message.includes("fetch")) {
        setError("Network error. Please check your connection and try again.");
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to update product. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Product">
      <div className="w-full max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-300 text-sm">{success}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="input-dark w-full px-3 py-2"
              placeholder="Enter product name"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                className="input-dark w-full pl-8 pr-3 py-2"
                placeholder="0.00"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Category *</label>
            <select
              value={formData.categoryId}
              onChange={(e) => handleInputChange("categoryId", e.target.value)}
              className="input-dark w-full px-3 py-2"
              required
              disabled={isLoading}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
              className="input-dark w-full px-3 py-2 resize-none"
              placeholder="Enter product description (optional)"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Product Image</label>

            {formData.image && (
              <div className="mb-3 relative w-32 h-32 rounded-lg border border-gray-800 overflow-hidden">
                <Image
                  src={getCloudinaryThumbnail(formData.image, { width: 256, height: 256 })}
                  alt={product?.name ? `${product.name} preview` : "Product preview"}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/10 text-zinc-300 rounded-lg hover:bg-white/20 cursor-pointer transition-colors">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading ? "Uploading..." : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isLoading || isUploading}
                />
              </label>

              {formData.image && (
                <button
                  type="button"
                  onClick={() => handleInputChange("image", "")}
                  className="px-3 py-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                  disabled={isLoading || isUploading}
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Recommended: 400x400px, JPG or PNG, max 5MB</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading || isUploading}
              className="flex-1 px-4 py-2 btn-secondary-admin disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isUploading || !formData.name.trim() || !formData.price || !formData.categoryId}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 btn-primary-admin disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Product"
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
