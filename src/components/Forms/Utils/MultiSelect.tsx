import { useState, useEffect, useRef } from 'react';
import { Check, X, ChevronDown, ChevronUp, Search } from 'lucide-react';

export const MultiSelect = ({ 
  options, 
  value = [], 
  onChange, 
  placeholder = "Select items...",
  label,
  isLoading = false,
  error = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get selected items
  const selectedItems = options.filter(option => 
    value.includes(option.value)
  );
  
  // Filter options based on search
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (optionValue) => {
    const newValue = [...value];
    const index = newValue.indexOf(optionValue);
    
    if (index === -1) {
      newValue.push(optionValue);
    } else {
      newValue.splice(index, 1);
    }
    
    onChange(newValue);
  };

  const removeItem = (optionValue, e) => {
    e.stopPropagation();
    const newValue = value.filter(v => v !== optionValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      
      <div className="relative" ref={dropdownRef}>
        {/* Selected items display */}
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
                  className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-md"
                >
                  {item.label}
                  <button
                    type="button"
                    onClick={(e) => removeItem(item.value, e)}
                    className="ml-1 text-indigo-500 hover:text-indigo-700"
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
            
            {/* Loading state */}
            {isLoading ? (
              <div className="p-2 text-center text-gray-500">Loading...</div>
            ) : error ? (
              <div className="p-2 text-center text-red-500">{error}</div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-2 text-center text-gray-500">No options found</div>
            ) : (
              <ul>
                {filteredOptions.map((option) => (
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