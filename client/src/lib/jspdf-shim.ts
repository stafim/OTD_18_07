declare global {
  interface Window {
    jspdf: { jsPDF: any };
  }
}

let _jsPDF: any = null;

export async function getJsPDF(): Promise<{ jsPDF: any }> {
  if (_jsPDF) return { jsPDF: _jsPDF };

  if (typeof window !== "undefined" && window.jspdf) {
    _jsPDF = window.jspdf.jsPDF;
    return { jsPDF: _jsPDF };
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load jsPDF from CDN"));
    document.head.appendChild(script);
  });

  _jsPDF = (window as any).jspdf.jsPDF;
  return { jsPDF: _jsPDF };
}
