'use client';

import { useState, useRef, useEffect } from 'react';

interface Option {
  id: number;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (id: number, label: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;  // НОВОЕ
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Начните вводить...',
  label,
  required = false,
  disabled = false,  // НОВОЕ
}: SearchableSelectProps) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleOptionClick = (option: Option) => {
    setSearchTerm(option.label);
    onChange(option.id, option.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    if (!disabled) {  // НОВОЕ
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;  // НОВОЕ
    
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}  // НОВОЕ
          className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors pr-8 disabled:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-500"  // ОБНОВЛЕНО
        />
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && !disabled && filteredOptions.length > 0 && (  // ОБНОВЛЕНО
        <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 shadow-lg max-h-60 overflow-auto">
          {filteredOptions.map((option, index) => (
            <div
              key={option.id}
              onClick={() => handleOptionClick(option)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                index === highlightedIndex
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}

      {isOpen && !disabled && filteredOptions.length === 0 && searchTerm && (  // ОБНОВЛЕНО
        <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 shadow-lg">
          <div className="px-3 py-2 text-sm text-neutral-500">
            Ничего не найдено
          </div>
        </div>
      )}
    </div>
  );
}