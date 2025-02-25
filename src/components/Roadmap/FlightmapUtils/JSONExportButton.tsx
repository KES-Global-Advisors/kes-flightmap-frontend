import React, { useState } from "react";

interface JSONExportButtonProps {
  hierarchyData: any;
}

const JSONExportButton: React.FC<JSONExportButtonProps> = ({ hierarchyData }) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportAsJSON = () => {
    if (!hierarchyData) return;
    setIsExporting(true);
    try {
      const exportData = JSON.stringify(hierarchyData, null, 2);
      const blob = new Blob([exportData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `roadmap-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting JSON:", error);
      alert("Failed to export JSON. Please try again.");
    }
    setIsExporting(false);
  };

  return (
    <button
      onClick={exportAsJSON}
      className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      disabled={isExporting}
    >
      {isExporting ? "Exporting JSON..." : "Export JSON"}
    </button>
  );
};

export default JSONExportButton;
