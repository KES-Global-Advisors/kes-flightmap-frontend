/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";

interface CSVExportButtonProps {
  hierarchyData: any;
}

const CSVExportButton: React.FC<CSVExportButtonProps> = ({ hierarchyData }) => {
  const [isExporting, setIsExporting] = useState(false);

  // Recursively flatten the hierarchical data.
  const flattenDataForExport = (node: any, path: string = ""): any[] => {
    const currentPath = path ? `${path} > ${node.name}` : node.name;
    const record = {
      name: node.name,
      type: node.type,
      path: currentPath,
      status: node.status || "",
      deadline: node.deadline || "",
      target_start_date: node.target_start_date || "",
      target_end_date: node.target_end_date || "",
      // Add any additional metadata fields as needed
    };
    let records = [record];
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => {
        records = records.concat(flattenDataForExport(child, currentPath));
      });
    }
    return records;
  };

  // Convert an array of objects to CSV format.
  const jsonToCSV = (data: any[]): string => {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(","));
    data.forEach((row) => {
      const values = headers.map((header) => {
        let val = row[header];
        if (typeof val === "string") {
          // Escape double quotes
          val = val.replace(/"/g, '""');
          if (val.search(/("|,|\n)/g) >= 0) {
            val = `"${val}"`;
          }
        }
        return val;
      });
      csvRows.push(values.join(","));
    });
    return csvRows.join("\n");
  };

  const exportAsCSV = () => {
    if (!hierarchyData) return;
    setIsExporting(true);
    try {
      const flattenedData = flattenDataForExport(hierarchyData);
      const csvData = jsonToCSV(flattenedData);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `roadmap-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV. Please try again.");
    }
    setIsExporting(false);
  };

  return (
    <button
      onClick={exportAsCSV}
      className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
      disabled={isExporting}
    >
      {isExporting ? "Exporting CSV..." : "Export CSV"}
    </button>
  );
};

export default CSVExportButton;
