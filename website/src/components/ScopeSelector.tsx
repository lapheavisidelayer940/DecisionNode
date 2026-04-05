import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface ScopeSelectorProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
}

export function ScopeSelector({ value, onChange, options, placeholder }: ScopeSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter options based on input
    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(filter.toLowerCase())
    );

    // Update position when opening
    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const updatePosition = () => {
                const rect = wrapperRef.current!.getBoundingClientRect();
                setPosition({
                    top: rect.bottom + 8, // Add a small gap
                    left: rect.left,
                    width: rect.width
                });
            };

            updatePosition();
            // Optional: update on scroll/resize
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);

            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            const clickedWrapper = wrapperRef.current?.contains(target);
            const clickedDropdown = dropdownRef.current?.contains(target);

            if (!clickedWrapper && !clickedDropdown) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Sync filter with value when value changes externally or on selection
    useEffect(() => {
        setFilter(value);
    }, [value]);

    const handleSelect = (option: string) => {
        onChange(option);
        setFilter(option);
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setFilter(newValue);
        onChange(newValue);
        setIsOpen(true);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    value={filter}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    className="input w-full pr-10"
                    placeholder={placeholder}
                />
                <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && filteredOptions.length > 0 && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed z-[9999] bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                    style={{
                        top: position.top,
                        left: position.left,
                        width: position.width,
                    }}
                >
                    {filteredOptions.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => handleSelect(option)}
                            className="w-full text-left px-4 py-2 hover:bg-zinc-800 text-sm text-zinc-300 hover:text-white transition-colors"
                        >
                            {option}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}
