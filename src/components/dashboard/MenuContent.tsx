"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Plus, Utensils, Image as ImageIcon, Loader2, AlertCircle, RefreshCcw, X, Edit, Trash2 } from "lucide-react";
import Image from "next/image";
import { uploadToCloudinary, getCloudinaryThumbnail } from "@/lib/cloudinary";
import EditProductModal from "./EditProductModal";
import { Modal } from "@/components/ui/Modal";

interface MenuContentProps {
  initialCategories: any[];
  restaurantId: string;
}

export default function MenuContent({ initialCategories, restaurantId }: MenuContentProps) {
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Form states
  const [categoryName, setCategoryName] = useState("");
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const { totalCategories, totalProducts } = useMemo(() => {
    const totalCats = categories?.length ?? 0;
    const totalItems = categories?.reduce((sum, c) => sum + (c?.items?.length ?? 0), 0) ?? 0;
    return { totalCategories: totalCats, totalProducts: totalItems };
  }, [categories]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/menu-items", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as any)?.error || "Failed to load menu data.");
        setCategories([]);
        return;
      }
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    setLoadingItems((prev) => new Set(prev).add(productId));
    try {
      const res = await fetch(`/api/admin/menu-items/${productId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data as any)?.error || "Failed to delete product.");
        return;
      }
      await refreshData();
      setDeleteConfirm(null);
    } catch (err) {
      setError("Failed to delete product.");
    } finally {
      setLoadingItems((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;

    setIsActionLoading(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: categoryName,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as any)?.error || "Failed to create category.");
        return;
      }
      setError(null);
      setCategoryName("");
      setIsCategoryModalOpen(false);
      await refreshData();
    } catch (error) {
      setError("Failed to create category.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch (error) {
      setError("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productPrice || !productCategory) return;

    setIsActionLoading(true);
    try {
      const price = parseFloat(productPrice);
      if (isNaN(price) || price <= 0) {
        setError("Please enter a valid price");
        return;
      }

      const res = await fetch("/api/admin/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: productName,
          price,
          description: productDescription || null,
          image: imageUrl || null,
          categoryId: productCategory,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as any)?.error || "Failed to create product.");
        return;
      }

      setError(null);
      setProductName("");
      setProductPrice("");
      setProductCategory("");
      setProductDescription("");
      setImageUrl("");
      setIsProductModalOpen(false);
      await refreshData();
    } catch (error) {
      setError("Failed to create product.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleProductSaved = async () => {
    await refreshData();
    setIsEditModalOpen(false);
    setSelectedProduct(null);
  };

  const hasData = categories && categories.length > 0;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">Menu Management</h1>
            <p className="text-zinc-400 mt-1">Manage your restaurant menu categories and items</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="btn-secondary-admin px-4 py-2 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </button>
            <button
              onClick={() => setIsProductModalOpen(true)}
              className="btn-primary-admin px-4 py-2 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className="card-glass p-6">
            <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Total Products</h3>
            <p className="text-3xl font-bold text-zinc-100 mt-2">{totalProducts}</p>
          </div>
          <div className="card-glass p-6">
            <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Menu Categories</h3>
            <p className="text-3xl font-bold text-zinc-100 mt-2">{totalCategories}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        {hasData ? (
          <div className="space-y-12">
            {categories.map((category) => (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h2 className="text-xl font-bold text-zinc-100">{category.name}</h2>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-400/30">
                    {category.items?.length || 0} {(category.items?.length === 1) ? "item" : "items"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {category.items?.map((item: any) => (
                    <div key={item.id} className="card-glass p-4 hover:bg-white/[0.07] transition-all group relative">
                      <div className="flex gap-4">
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
                          {item.image && !imageErrors.has(item.id) ? (
                            <Image
                              src={getCloudinaryThumbnail(item.image, { width: 160, height: 160 })}
                              alt={item.name || "Menu item"}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                              sizes="80px"
                              loading="lazy"
                              onError={() => setImageErrors((prev) => new Set(prev).add(item.id))}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Utensils className="h-6 w-6 text-zinc-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-zinc-100 truncate">{item.name}</h3>
                          <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{item.description || "No description"}</p>
                          <p className="text-lg font-bold text-amber-400 mt-2">₹{item.price.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleEditProduct(item)}
                          className="flex-1 px-3 py-2 btn-secondary-admin text-sm flex items-center justify-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          disabled={loadingItems.has(item.id)}
                          className="flex-1 px-3 py-2 bg-red-500/20 text-red-400 text-sm font-semibold rounded-xl border border-red-400/30 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loadingItems.has(item.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-glass p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <Utensils className="h-8 w-8 text-zinc-500" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">No menu items yet</h2>
            <p className="text-zinc-400 mb-6">Get started by creating your first category and adding menu items.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="btn-secondary-admin px-6 py-3"
              >
                Create Category
              </button>
              <button
                onClick={() => setIsProductModalOpen(true)}
                className="btn-primary-admin px-6 py-3"
              >
                Add Product
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Create Category"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Category Name</label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="input-dark w-full px-3 py-2"
              placeholder="e.g., Appetizers, Main Course"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="flex-1 px-4 py-2 btn-secondary-admin"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isActionLoading}
              className="flex-1 px-4 py-2 btn-primary-admin disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Category"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Product Modal */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Add Product"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Product Name *</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="input-dark w-full px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Category *</label>
            <select
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              className="input-dark w-full px-3 py-2"
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Price *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              className="input-dark w-full px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              rows={3}
              className="input-dark w-full px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-zinc-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500/20 file:text-amber-400"
              disabled={uploading}
            />
            {uploading && <p className="text-sm text-zinc-500 mt-1">Uploading...</p>}
            {imageUrl && (
              <div className="mt-2 relative w-32 h-32 rounded-xl border border-white/10 overflow-hidden">
                <Image
                  src={getCloudinaryThumbnail(imageUrl, { width: 256, height: 256 })}
                  alt="Product preview"
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="flex-1 px-4 py-2 btn-secondary-admin"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isActionLoading}
              className="flex-1 px-4 py-2 btn-primary-admin disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Product"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      {selectedProduct && (
        <EditProductModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          categories={categories.map((cat) => ({ id: cat.id, name: cat.name }))}
          onSave={handleProductSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal isOpen={true} onClose={() => setDeleteConfirm(null)} title="Delete Product">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/20 rounded-xl border border-red-400/30">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-100">Delete Product</h3>
          </div>
          <p className="text-zinc-400 mb-6">
            Are you sure you want to delete this product? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 px-4 py-2 btn-secondary-admin"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteProduct(deleteConfirm)}
              disabled={loadingItems.has(deleteConfirm)}
              className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 font-semibold rounded-xl border border-red-400/30 hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingItems.has(deleteConfirm) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
