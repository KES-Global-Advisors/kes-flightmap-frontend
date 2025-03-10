import { FC } from "react";

/**
 * Props for our color picker modal.
 */
interface WorkstreamColorPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onColorChange: (color: string) => void;
  initialColor: string;
}

/**
 * Tailwind-styled modal for picking a single color.
 * Appears on top of the screen if visible=true.
 */
const WorkstreamColorPickerModal: FC<WorkstreamColorPickerModalProps> = ({
  visible,
  onClose,
  onColorChange,
  initialColor,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded shadow-md">
        <h2 className="text-lg font-bold mb-4">Pick Workstream Color</h2>

        {/* Basic color input */}
        <input
          type="color"
          defaultValue={initialColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="border border-gray-300 p-1 mr-2"
        />

        <button
          onClick={onClose}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default WorkstreamColorPickerModal;
