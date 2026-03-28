import { z } from "zod";

// ── Stock ──────────────────────────────────────────────────────

export const stockCreateSchema = z
  .object({
    item_code: z.string().min(1, "Item code is required."),
    vendor_code: z.string().min(1, "Vendor is required."),
    rate: z
      .string()
      .trim()
      .min(1, "Rate is required.")
      .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Rate must be a positive number."),
    quantity: z
      .string()
      .trim()
      .min(1, "Quantity is required.")
      .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Quantity must be a positive number."),
  })
  .superRefine((data, ctx) => {
    const total = Number(data.rate) * Number(data.quantity);
    if (total >= 1e10) {
      ctx.addIssue({
        code: "custom",
        path: ["rate"],
        message: "Total value (rate × quantity) is too large. Maximum allowed is 9,999,999,999.99.",
      });
    }
  });

export const stockEditSchema = z
  .object({
    rate: z
      .string()
      .trim()
      .min(1, "Rate is required.")
      .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Rate must be a positive number."),
    quantity: z
      .string()
      .trim()
      .min(1, "Quantity is required.")
      .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Quantity must be greater than 0."),
    newStatus: z.string(),
    oldStatus: z.string(),
    transferType: z.string(),
    action: z.string(),
    jobWorkVendor: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newStatus === data.oldStatus) return;
    if (data.newStatus !== "AT_REFINERY" && !data.transferType) {
      ctx.addIssue({ code: "custom", path: ["transferType"], message: "Please select a Transfer Type." });
    }
    if (
      data.newStatus !== "OUT_SIDE_FACTORY" &&
      data.newStatus !== "COMPLETED" &&
      data.newStatus !== "IN_TANK" &&
      !data.action
    ) {
      ctx.addIssue({ code: "custom", path: ["action"], message: "Please select an Action." });
    }
    if (data.newStatus === "AT_REFINERY" && !data.jobWorkVendor.trim()) {
      ctx.addIssue({ code: "custom", path: ["jobWorkVendor"], message: "Please enter or select a Job Work vendor." });
    }
  });

// ── Tank ───────────────────────────────────────────────────────

export const tankCreateSchema = z.object({
  tank_capacity: z
    .string()
    .trim()
    .min(1, "Tank capacity is required.")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Valid tank capacity is required."),
});

export const tankEditSchema = z
  .object({
    item_code: z.string().trim().min(1, "Please select an item code."),
    current_capacity: z
      .string()
      .trim()
      .min(1, "Current quantity is required.")
      .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Please enter a valid current quantity."),
    tank_capacity: z.number(),
  })
  .superRefine((data, ctx) => {
    if (Number(data.current_capacity) > data.tank_capacity) {
      ctx.addIssue({
        code: "custom",
        path: ["current_capacity"],
        message: `Current quantity cannot exceed tank capacity (${data.tank_capacity} L).`,
      });
    }
  });

// ── User ───────────────────────────────────────────────────────

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["ADM", "FTR", "MNG"], { error: "Please select a role." }),
});

export const userEditSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.email("Enter a valid email address."),
  password: z.string().optional(),
  role: z.enum(["ADM", "FTR", "MNG"], { error: "Please select a role." }),
});

// ── Login ──────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

// ── Helper ─────────────────────────────────────────────────────

/** Returns the first error message from a ZodError, or null if valid. */
export function getZodError(result: { success: boolean; error?: { issues: { message: string }[] } }): string | null {
  if (result.success) return null;
  return result.error?.issues[0]?.message ?? "Validation failed.";
}
