import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard API can reject with a DOMException (e.g. inside a sandboxed
    // iframe or without focus/permission). Fall through to the legacy method.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  // URLs já no formato correto
  if (url.startsWith("/objects/")) return url;
  // URLs antigas com prefixo /api/object-storage - remover prefixo
  if (url.startsWith("/api/object-storage/objects/")) {
    return url.replace("/api/object-storage", "");
  }
  return url;
}
