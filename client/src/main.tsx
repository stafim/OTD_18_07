import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// --- Silence benign "ResizeObserver loop" browser errors ------------------
// Radix/cmdk overlays (Popover, ScrollArea, Command — e.g. the client combobox
// in the vehicle dialog) use ResizeObserver. When such an overlay opens, the
// observer callback triggers further layout changes within the same delivery
// cycle and the browser emits the harmless, non-fatal message
// "ResizeObserver loop completed with undelivered notifications" as a window
// `error` event whose `error` property is null. The Replit dev tooling flags
// any null-error event as "an uncaught exception ... not an error object",
// producing FALSE "app crashed" alerts even though nothing is actually broken.
// Deferring the observer callback to the next animation frame breaks the
// synchronous loop so the browser never emits the error in the first place.
if (typeof window !== "undefined" && typeof window.ResizeObserver !== "undefined") {
  const NativeResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class extends NativeResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        window.requestAnimationFrame(() => {
          callback(entries, observer);
        });
      });
    }
  };
}

// --- Runtime error safety net ---------------------------------------------
// Extra defense-in-depth: keep the intrusive dev error overlay from popping up
// for opaque, non-actionable noise (cross-origin "Script error." from the
// Google Maps API, or any thrown value that is not a real Error). Genuine
// `Error` instances are left completely untouched so real crashes still surface.
window.addEventListener(
  "error",
  (event) => {
    // Only handle genuine uncaught runtime exceptions. Resource-load failures
    // (<img>/<script> onerror) dispatch a plain Event (not ErrorEvent) that
    // travels through the capture phase to its target — suppressing those would
    // break image fallbacks, the Google Maps script loaders, and React's
    // delegated onError handlers. Let them pass untouched.
    if (!(event instanceof ErrorEvent)) return;
    if (event.error instanceof Error) return;
    // Breadcrumb so a genuine bug that throws a non-Error still leaves a trace.
    console.warn("[suppressed non-Error window error]", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
    event.preventDefault();
    event.stopImmediatePropagation();
  },
  true,
);

window.addEventListener(
  "unhandledrejection",
  (event) => {
    if (event.reason instanceof Error) return;
    console.warn("[suppressed non-Error unhandledrejection]", String(event.reason));
    event.preventDefault();
    event.stopImmediatePropagation();
  },
  true,
);

createRoot(document.getElementById("root")!).render(<App />);
