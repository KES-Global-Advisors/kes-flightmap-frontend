import React, { useState } from "react";

interface ScreenshotButtonProps {
  svgRef: React.RefObject<SVGSVGElement>;
}

const ScreenshotButton: React.FC<ScreenshotButtonProps> = ({ svgRef }) => {
  const [isExporting, setIsExporting] = useState(false);

  const captureScreenshot = () => {
    if (!svgRef.current) return;
    setIsExporting(true);
    try {
      const svgElement = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement("canvas");
      const svgSize = svgElement.getBoundingClientRect();
      canvas.width = svgSize.width;
      canvas.height = svgSize.height;
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngData = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngData;
        a.download = `flightmap-screenshot-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setIsExporting(false);
      };
      img.onerror = () => {
        console.error("Error loading SVG for screenshot");
        alert("Failed to create screenshot. Please try again.");
        setIsExporting(false);
      };
      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      alert("Failed to capture screenshot. Please try again.");
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={captureScreenshot}
      className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
      disabled={isExporting}
    >
      {isExporting ? "Capturing..." : "Capture Screenshot"}
    </button>
  );
};

export default ScreenshotButton;
