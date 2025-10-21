import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/Components/ui/popover';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecionar...',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (selectedValue: string) => {
    if (value.includes(selectedValue)) {
      onChange(value.filter((item) => item !== selectedValue));
    } else {
      onChange([...value, selectedValue]);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const selectedLabels = options
    .filter((option) => value.includes(option.value))
    .map((option) => option.label);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between bg-card border-border text-left font-normal',
            !value.length && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex flex-wrap gap-1 max-w-full">
            {value.length === 0 ? (
              placeholder
            ) : value.length === 1 ? (
              selectedLabels[0]
            ) : (
              `${value.length} selecionados`
            )}
          </div>
          <div className="flex items-center gap-1">
            {value.length > 0 && (
              <button
                type="button"
                aria-label="Limpar seleção"
                className="inline-flex items-center justify-center rounded-sm p-1 text-muted-foreground hover:text-foreground"
                onMouseDown={(e) => {
                  // Prevent PopoverTrigger from toggling when clicking the clear button
                  e.preventDefault();
                  e.stopPropagation();
                  handleClear();
                }}
                onClick={(e) => {
                  // Extra safety for browsers firing click after mousedown
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
<PopoverContent className="w-[10rem] p-0 bg-card border-border" align="start">
          <div className="max-h-60 overflow-auto custom-scrollbar">
          {options.map((option) => (
            <div
              key={option.value}
              className={cn(
                'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                value.includes(option.value) && 'bg-accent'
              )}
              onClick={() => handleSelect(option.value)}
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4',
                  value.includes(option.value) ? 'opacity-100' : 'opacity-0'
                )}
              />
              {option.label}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}