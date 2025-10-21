import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Checkbox } from '@/Components/ui/checkbox';
import { MultiSelect } from './MultiSelect';

interface SearchFilters {
  name: string;
  levels: string[];
  classes: string[];
  schools: string[];
  sources: string[];
  includeSubclasses: boolean;
}

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  className?: string;
  availableFilters?: {
    levels: Array<{ value: string; label: string }>;
    classes: Array<{ value: string; label: string }>;
    schools: Array<{ value: string; label: string }>;
    sources: Array<{ value: string; label: string }>;
  };
}

// Default fallback values if dynamic data not available yet
const DEFAULT_SPELL_LEVELS = [
  { value: '0', label: 'Truque' },
  { value: '1', label: '1º Nível' },
  { value: '2', label: '2º Nível' },
  { value: '3', label: '3º Nível' },
  { value: '4', label: '4º Nível' },
  { value: '5', label: '5º Nível' },
  { value: '6', label: '6º Nível' },
  { value: '7', label: '7º Nível' },
  { value: '8', label: '8º Nível' },
  { value: '9', label: '9º Nível' },
];

const DEFAULT_SPELL_CLASSES = [
  { value: 'Artificer', label: 'Artífice' },
  { value: 'Bard', label: 'Bardo' },
  { value: 'Cleric', label: 'Clérigo' },
  { value: 'Druid', label: 'Druida' },
  { value: 'Paladin', label: 'Paladino' },
  { value: 'Ranger', label: 'Patrulheiro' },
  { value: 'Sorcerer', label: 'Feiticeiro' },
  { value: 'Warlock', label: 'Bruxo' },
  { value: 'Wizard', label: 'Mago' },
];

const DEFAULT_SPELL_SCHOOLS = [
  { value: 'Abjuration', label: 'Abjuração' },
  { value: 'Conjuration', label: 'Conjuração' },
  { value: 'Divination', label: 'Adivinhação' },
  { value: 'Enchantment', label: 'Encantamento' },
  { value: 'Evocation', label: 'Evocação' },
  { value: 'Illusion', label: 'Ilusão' },
  { value: 'Necromancy', label: 'Necromancia' },
  { value: 'Transmutation', label: 'Transmutação' },
];

const DEFAULT_SPELL_SOURCES = [
  { value: 'PHB', label: "Livro do Jogador" },
  { value: 'XGE', label: "Guia de Xanathar" },
  { value: 'TCE', label: "Caldeirão de Tasha" },
  { value: 'EE', label: 'Mal Elemental' },
  { value: 'SCAG', label: 'Costa da Espada' },
];

export default function SearchBar({ onSearch, className = '', availableFilters }: SearchBarProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    name: '',
    levels: [],
    classes: [],
    schools: [],
    sources: [],
    includeSubclasses: false,
  });

  const updateNameFilter = (value: string) => {
    const newFilters = { ...filters, name: value };
    setFilters(newFilters);
    onSearch(newFilters);
  };

  const updateArrayFilter = (key: 'levels' | 'classes' | 'schools' | 'sources', value: string[]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onSearch(newFilters);
  };

  const updateSubclassFilter = (checked: boolean) => {
    const newFilters = { ...filters, includeSubclasses: checked };
    setFilters(newFilters);
    onSearch(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      name: '',
      levels: [],
      classes: [],
      schools: [],
      sources: [],
      includeSubclasses: false,
    };
    setFilters(clearedFilters);
    onSearch(clearedFilters);
  };

  const hasActiveFilters = filters.name !== '' || 
    filters.levels.length > 0 || 
    filters.classes.length > 0 || 
    filters.schools.length > 0 || 
    filters.sources.length > 0;

  // Use dynamic filters if available, otherwise fall back to defaults
  const SPELL_LEVELS = availableFilters?.levels || DEFAULT_SPELL_LEVELS;
  const SPELL_CLASSES = availableFilters?.classes || DEFAULT_SPELL_CLASSES;
  const SPELL_SCHOOLS = availableFilters?.schools || DEFAULT_SPELL_SCHOOLS;
  const SPELL_SOURCES = availableFilters?.sources || DEFAULT_SPELL_SOURCES;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="relative">
        <div className="search-mystical flex items-center px-4 py-3">
          <Search className="h-5 w-5 text-gold mr-3 flex-shrink-0" />
          <Input
            placeholder="Buscar magias por nome..."
            value={filters.name}
            onChange={(e) => updateNameFilter(e.target.value)}
            className="border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:ring-0 flex-1"
          />
        </div>
      </div>

      {/* Multi-Select Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="spell-text text-sm text-muted-foreground">
              Classes
            </label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeSubclasses"
                checked={filters.includeSubclasses}
                onCheckedChange={(checked) => updateSubclassFilter(checked as boolean)}
              />
              <label
                htmlFor="includeSubclasses"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Subclasses
              </label>
            </div>
          </div>
          <MultiSelect
            options={SPELL_CLASSES}
            value={filters.classes}
            onChange={(value) => updateArrayFilter('classes', value)}
            placeholder="Selecionar classes..."
          />
        </div>

        <div>
          <label className="spell-text text-sm text-muted-foreground mb-2 block">
            Níveis
          </label>
          <MultiSelect
            options={SPELL_LEVELS}
            value={filters.levels}
            onChange={(value) => updateArrayFilter('levels', value)}
            placeholder="Selecionar níveis..."
          />
        </div>

        <div>
          <label className="spell-text text-sm text-muted-foreground mb-2 block">
            Escolas
          </label>
          <MultiSelect
            options={SPELL_SCHOOLS}
            value={filters.schools}
            onChange={(value) => updateArrayFilter('schools', value)}
            placeholder="Selecionar escolas..."
          />
        </div>

        <div>
          <label className="spell-text text-sm text-muted-foreground mb-2 block">
            Livros
          </label>
          <MultiSelect
            options={SPELL_SOURCES}
            value={filters.sources}
            onChange={(value) => updateArrayFilter('sources', value)}
            placeholder="Selecionar livros..."
          />
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-crimson hover:text-crimson-dark hover:bg-crimson/10"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar todos
            </Button>
          )}
          {filters.classes.map((classValue) => (
            <Badge key={classValue} variant="secondary" className="bg-copper/20 text-copper border-copper/30">
              {SPELL_CLASSES.find(c => c.value === classValue)?.label}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateArrayFilter('classes', filters.classes.filter(c => c !== classValue))}
                className="ml-1 h-auto p-0 text-copper hover:text-copper-dark"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {filters.levels.map((levelValue) => (
            <Badge key={levelValue} variant="secondary" className="bg-gold/20 text-gold border-gold/30">
              {SPELL_LEVELS.find(l => l.value === levelValue)?.label}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateArrayFilter('levels', filters.levels.filter(l => l !== levelValue))}
                className="ml-1 h-auto p-0 text-gold hover:text-gold-muted"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {filters.schools.map((schoolValue) => (
            <Badge key={schoolValue} variant="secondary" className="bg-emerald/20 text-emerald border-emerald/30">
              {SPELL_SCHOOLS.find(s => s.value === schoolValue)?.label}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateArrayFilter('schools', filters.schools.filter(s => s !== schoolValue))}
                className="ml-1 h-auto p-0 text-emerald hover:text-emerald-dark"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {filters.sources.map((sourceValue) => (
            <Badge key={sourceValue} variant="secondary" className="bg-crimson/20 text-crimson border-crimson/30">
              {SPELL_SOURCES.find(s => s.value === sourceValue)?.label}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateArrayFilter('sources', filters.sources.filter(s => s !== sourceValue))}
                className="ml-1 h-auto p-0 text-crimson hover:text-crimson-dark"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}