import { z } from "zod";

/**
 * Validation Layer
 * 
 * Centralized Zod schemas for API input validation.
 * Ensures type safety, range validation, and data integrity.
 */

// ============================================
// Restaurant Validation Schemas
// ============================================

export const restaurantCreateSchema = z.object({
  name: z
    .string()
    .min(2, "Restaurant name must be at least 2 characters")
    .max(100, "Restaurant name must be less than 100 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .trim()
    .optional()
    .nullable(),
});

export type RestaurantCreateInput = z.infer<typeof restaurantCreateSchema>;

// ============================================
// Menu Validation Schemas
// ============================================

export const categoryCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(50, "Category name must be less than 50 characters")
    .trim(),
  restaurantId: z.string().uuid("Invalid restaurant ID format"),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const menuItemCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Menu item name is required")
    .max(100, "Menu item name must be less than 100 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .trim()
    .optional()
    .nullable(),
  price: z
    .number()
    .positive("Price must be a positive number")
    .max(100000, "Price must be less than 100,000")
    .refine((val) => Number.isFinite(val), "Price must be a valid number"),
  image: z
    .string()
    .url("Image must be a valid URL")
    .max(500, "Image URL must be less than 500 characters")
    .optional()
    .nullable(),
  available: z.boolean().default(true),
  categoryId: z.string().uuid("Invalid category ID format"),
  restaurantId: z.string().uuid("Invalid restaurant ID format"),
});

export type MenuItemCreateInput = z.infer<typeof menuItemCreateSchema>;

export const menuItemUpdateSchema = menuItemCreateSchema.partial().extend({
  id: z.string().uuid("Invalid menu item ID format"),
  restaurantId: z.string().uuid("Invalid restaurant ID format"),
});

export type MenuItemUpdateInput = z.infer<typeof menuItemUpdateSchema>;

// ============================================
// Order Validation Schemas
// ============================================

export const orderItemSchema = z.object({
  menuItemId: z.string().uuid("Invalid menu item ID format"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .positive("Quantity must be positive")
    .max(100, "Quantity cannot exceed 100"),
});

export const orderCreateSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format"),
  tableId: z.string().uuid("Invalid table ID format").optional().nullable(),
  type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"], {
    message: "Order type must be DINE_IN, TAKEAWAY, or DELIVERY",
  }),
  items: z
    .array(orderItemSchema)
    .min(1, "At least one item is required")
    .max(50, "Cannot order more than 50 different items"),
  notes: z
    .string()
    .max(500, "Notes must be less than 500 characters")
    .trim()
    .optional()
    .nullable(),
  isPriority: z.boolean().default(false),
  idempotencyKey: z
    .string()
    .min(1, "Idempotency key is required")
    .max(100, "Idempotency key must be less than 100 characters")
    .trim(),
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

// ============================================
// Table Validation Schemas
// ============================================

export const tableCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Table name is required")
    .max(50, "Table name must be less than 50 characters")
    .trim()
    .optional()
    .nullable(),
  restaurantId: z.string().uuid("Invalid restaurant ID format"),
});

export type TableCreateInput = z.infer<typeof tableCreateSchema>;

// ============================================
// Query Parameter Validation
// ============================================

export const restaurantIdParamSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format"),
});

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive().max(1000)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().positive().max(100)),
});

// ============================================
// Validation Helper Functions
// ============================================

/**
 * Validate request body with Zod schema
 * Returns validated data or throws validation error
 */
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validate request body with Zod schema (safe)
 * Returns result object with success/error
 */
export function validateBodySafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

