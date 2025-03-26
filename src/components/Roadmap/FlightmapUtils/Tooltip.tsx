import React from "react";

interface TooltipProps {
  content: string;
  left: number;
  top: number;
  visible: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({ content, left, top, visible }) => {
  const style = {
    position: "absolute" as const,
    left,
    top,
    opacity: visible ? 1 : 0,
    pointerEvents: "none" as const,
    transition: "opacity 0.2s",
  };

  return (
    <div
      style={style}
      className="bg-white border rounded shadow p-2 text-sm"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default Tooltip;
