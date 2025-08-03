import { useState, useEffect, useRef, FC, MouseEvent } from 'react';
import { Check, X, ChevronDown, ChevronUp, Search } from 'lucide-react';

// Define a type for the options passed to the component.
interface Option {
  label: string;
  value: string | number;
}

interface MultiSelectProps {
  options: Option[];
  value?: (string | number)[];
  onChange: (newValue: (string | number)[]) => void;
  placeholder?: string;
  label?: string;
  isLoading?: boolean;
  error?: string | null;
  allowCustomInput?: boolean;
  customInputPlaceholder?: string;
}

export const MultiSelect: FC<MultiSelectProps> = ({
  options,
  value = [],
  onChange,
  placeholder = "Select items...",
  label,
  isLoading = false,
  error = null,
  allowCustomInput = false,
  customInputPlaceholder = "Add custom entry..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customInputValue, setCustomInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent<Document>) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside as never);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside as never);
    };
  }, []);

  // NEW: Add custom entry function
  const addCustomEntry = () => {
    if (customInputValue.trim() && !value.includes(customInputValue.trim())) {
      onChange([...value, customInputValue.trim()]);
      setCustomInputValue('');
    }
  };

  // NEW: Handle Enter key for custom input
  const handleCustomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomEntry();
    }
  };

  // UPDATED: Get selected items - handle both user IDs and text
  const selectedItems = value.map(val => {
    // Try to find in options first (for user IDs)
    const option = options.find(opt => opt.value === val);
    if (option) {
      return { ...option, isCustom: false };
    }
    // If not found in options, treat as custom text
    return { label: String(val), value: val, isCustom: true };
  });
  
  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle option selection
  const toggleOption = (optionValue: string | number) => {
    const newValue = [...value];
    const index = newValue.indexOf(optionValue);
    
    if (index === -1) {
      newValue.push(optionValue);
    } else {
      newValue.splice(index, 1);
    }
    
    onChange(newValue);
  };

  // Remove a selected item without toggling the dropdown
  const removeItem = (optionValue: string | number, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const newValue = value.filter(v => v !== optionValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      
      <div className="relative" ref={dropdownRef}>
        {/* Selected items display show custom entries differently */}
        <div 
          className="flex flex-wrap gap-1 p-2 border rounded-md min-h-10 cursor-pointer bg-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedItems.length === 0 ? (
            <span className="text-gray-500">{placeholder}</span>
          ) : (
            <>
              {selectedItems.map((item) => (
                <span 
                  key={item.value} 
                  className={`inline-flex items-center px-2 py-1 text-sm rounded-md ${
                    item.isCustom 
                      ? 'bg-green-100 text-green-800' // Different color for custom entries
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {item.isCustom && <span className="mr-1 text-xs">👤</span>}
                  {item.label}
                  <button
                    type="button"
                    onClick={(e) => removeItem(item.value, e)}
                    className={`ml-1 hover:opacity-70 ${
                      item.isCustom ? 'text-green-500' : 'text-indigo-500'
                    }`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </>
          )}
          <div className="ml-auto self-center">
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
        
        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {/* Search input */}
            <div className="p-2 border-b sticky top-0 bg-white">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2">
                  <Search size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  className="w-full py-1 pl-8 pr-2 border rounded-md text-sm"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
            
            {/* NEW: Custom input section */}
            {allowCustomInput && (
              <div className="p-2 border-b bg-blue-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 py-1 px-2 border rounded-md text-sm"
                    placeholder={customInputPlaceholder}
                    value={customInputValue}
                    onChange={e => setCustomInputValue(e.target.value)}
                    onKeyDown={handleCustomInputKeyDown}
                    onClick={e => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    onClick={addCustomEntry}
                    disabled={!customInputValue.trim()}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-blue-600 mt-1">Add people who aren't in the system yet</p>
              </div>
            )}
            
            {/* Rest of dropdown options remain the same */}
            {isLoading ? (
              <div className="p-2 text-center text-gray-500">Loading...</div>
            ) : error ? (
              <div className="p-2 text-center text-red-500">{error}</div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-2 text-center text-gray-500">No options found</div>
            ) : (
              <ul>
                {filteredOptions.map((option: Option) => (
                  <li
                    key={option.value}
                    className={`px-3 py-2 cursor-pointer flex items-center hover:bg-gray-100 ${
                      value.includes(option.value) ? 'bg-indigo-50' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(option.value);
                    }}
                  >
                    <div className={`w-5 h-5 mr-2 border rounded flex items-center justify-center ${
                      value.includes(option.value) ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                    }`}>
                      {value.includes(option.value) && <Check size={14} className="text-white" />}
                    </div>
                    {option.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
