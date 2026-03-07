import { AxiosError } from "axios";
import { toast } from "sonner";

/** Extract a user-friendly error message from an unknown error */
export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data;
    if (typeof data === "string") return data;
    if (data?.detail) return data.detail;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/** Show a toast with the API error message, handling AxiosError field-level errors */
export function toastApiError(err: unknown, fallback = "Something went wrong") {
  if (err instanceof AxiosError && err.response?.data) {
    const data = err.response.data;
    if (typeof data === "string") {
      toast.error(data);
      return;
    }
    if (data.detail) {
      toast.error(data.detail);
      return;
    }
    // Field-level errors: { field: ["error1", "error2"] }
    const messages = Object.entries(data)
      .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
      .join("; ");
    if (messages) {
      toast.error(messages);
      return;
    }
  }
  toast.error(getErrorMessage(err, fallback));
}
