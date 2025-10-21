import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SpellClass {
  classe: string;
  magia: string;
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingtime: string;
  range: string;
  components: string[];
  duration: string;
  description: string;
  atHigherLevels?: string;
  classes: string[];
  classesDetailed: SpellClass[]; // New field with detailed class information
  source: string;
  ritual?: boolean;
  concentration?: boolean;
}

export interface SearchFilters {
  name: string;
  levels: string[];
  classes: string[];
  schools: string[];
  sources: string[];
  includeSubclasses: boolean;
}

// Using only real data from Supabase - no mock data

export function useSpells() {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [filteredSpells, setFilteredSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [availableFilters, setAvailableFilters] = useState({
    levels: [] as Array<{ value: string; label: string }>,
    classes: [] as Array<{ value: string; label: string }>,
    schools: [] as Array<{ value: string; label: string }>,
    sources: [] as Array<{ value: string; label: string }>,
  });

  // Translation maps for Portuguese search
  const classTranslations: Record<string, string[]> = {
    'Artificer': ['Artificer', 'Artífice'],
    'Bard': ['Bard', 'Bardo'],
    'Cleric': ['Cleric', 'Clérigo'],
    'Druid': ['Druid', 'Druida'],
    'Paladin': ['Paladin', 'Paladino'],
    'Ranger': ['Ranger', 'Patrulheiro'],
    'Sorcerer': ['Sorcerer', 'Feiticeiro'],
    'Warlock': ['Warlock', 'Bruxo'],
    'Wizard': ['Wizard', 'Mago'],
  };

  const schoolTranslations: Record<string, string[]> = {
    'Abjuration': ['Abjuration', 'Abjuração'],
    'Conjuration': ['Conjuration', 'Conjuração'],
    'Divination': ['Divination', 'Adivinhação'],
    'Enchantment': ['Enchantment', 'Encantamento'],
    'Evocation': ['Evocation', 'Evocação'],
    'Illusion': ['Illusion', 'Ilusão'],
    'Necromancy': ['Necromancy', 'Necromancia'],
    'Transmutation': ['Transmutation', 'Transmutação'],
  };

  const sourceTranslations: Record<string, string[]> = {
    'PHB': ['PHB', 'Livro do Jogador', 'Livro Do Jogador'],
    'XGE': ['XGE', 'Guia de Xanathar', 'Guia De Xanathar'],
    'TCE': ['TCE', 'Caldeirão de Tasha', 'Caldeirão De Tasha'],
    'EE': ['EE', 'Mal Elemental'],
    'SCAG': ['SCAG', 'Costa da Espada', 'Costa Da Espada'],
  };

  // Filter spells based on search criteria
  const filterSpells = (filters: SearchFilters) => {
    let filtered = spells;

    if (filters.name) {
      filtered = filtered.filter(spell =>
        spell.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    if (filters.levels.length > 0) {
      filtered = filtered.filter(spell => 
        filters.levels.includes(spell.level.toString())
      );
    }

    if (filters.classes.length > 0) {
      filtered = filtered.filter(spell =>
        spell.classes.some(spellClass => {
          return filters.classes.some(filterClass => {
            const translations = classTranslations[filterClass];
            
            if (filters.includeSubclasses) {
              // Include subclasses: use startsWith logic
              if (translations) {
                return translations.some(translation => 
                  spellClass.trim().toLowerCase().startsWith(translation.toLowerCase()) ||
                  spellClass.trim().toLowerCase().startsWith(' ' + translation.toLowerCase())
                );
              }
              return spellClass.trim().toLowerCase().startsWith(filterClass.toLowerCase()) ||
                     spellClass.trim().toLowerCase().startsWith(' ' + filterClass.toLowerCase());
            } else {
              // Exact match only: don't include subclasses
              if (translations) {
                return translations.some(translation => 
                  spellClass.trim().toLowerCase() === translation.toLowerCase()
                );
              }
              return spellClass.trim().toLowerCase() === filterClass.toLowerCase();
            }
          });
        })
      );
    }

    if (filters.schools.length > 0) {
      filtered = filtered.filter(spell => {
        return filters.schools.some(filterSchool => {
          const translations = schoolTranslations[filterSchool];
          return translations ? translations.includes(spell.school) : spell.school === filterSchool;
        });
      });
    }

    if (filters.sources.length > 0) {
      filtered = filtered.filter(spell => {
        return filters.sources.some(filterSource => {
          const translations = sourceTranslations[filterSource];
          return translations ? translations.includes(spell.source) : spell.source === filterSource;
        });
      });
    }

    setFilteredSpells(filtered);
  };

  // Toggle favorite status
  const toggleFavorite = (spellId: string) => {
    console.log('toggleFavorite called with spellId:', spellId);
    console.log('Current favorites:', favorites);
    setFavorites(prev => {
      const newFavorites = prev.includes(spellId)
        ? prev.filter(id => id !== spellId)
        : [...prev, spellId];
      console.log('New favorites:', newFavorites);
      return newFavorites;
    });
  };

  // Load favorites from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('spell-favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorites to localStorage when changed
  useEffect(() => {
    localStorage.setItem('spell-favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Helper function to normalize spell names for comparison
  const normalizeSpellName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD') // Decompose accents
      .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
      .replace(/\s+/g, ''); // Remove spaces
  };

  // Extract unique filter values from spells data
  const extractFilterOptions = (spells: Spell[]) => {
    // Extract unique levels
    const uniqueLevels = [...new Set(spells.map(spell => spell.level.toString()))]
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(level => ({
        value: level,
        label: level === '0' ? 'Truque' : `${level}º Nível`
      }));

    // Extract unique classes from all spell classes (handling comma-separated values)
    // Only accept single-word classes (no subclasses with multiple words)
    const allClasses = spells.flatMap(spell => 
      spell.classes.flatMap(classStr => 
        classStr.split(',').map(c => c.trim()).filter(c => {
          // Only include classes that are single words (no spaces)
          return c && !c.includes(' ');
        })
      )
    );
    const uniqueClasses = [...new Set(allClasses)]
      .sort()
      .map(className => ({ value: className, label: className }));

    // Extract unique schools
    const uniqueSchools = [...new Set(spells.map(spell => spell.school))]
      .sort()
      .map(school => ({ value: school, label: school }));

    // Extract unique sources
    const uniqueSources = [...new Set(spells.map(spell => spell.source))]
      .sort()
      .map(source => ({ value: source, label: source }));

    return {
      levels: uniqueLevels,
      classes: uniqueClasses,
      schools: uniqueSchools,
      sources: uniqueSources,
    };
  };

  // Load spells from Supabase
  const loadSpells = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First, load spells
      const { data: spellsData, error: spellsError } = await supabase
        .from('spells')
        .select('*')
        .order('name')
        .limit(1000); // Ensure we get all ~500 spells
        
      if (spellsError) throw spellsError;

      // Try to load magia_link data first, fallback to magialink
      let magialinkData: Array<{magia: string, classe: string}> = [];
      try {
        const [resultMagiaLink, resultMagialink] = await Promise.all([
          (supabase as any).from('magia_link').select('magia, classe'),
          (supabase as any).from('magialink').select('magia, classe'),
        ]);

        const { data: linkData1, error: linkError1 } = resultMagiaLink as { data: Array<{magia: string, classe: string}> | null, error: any };
        const { data: linkData2, error: linkError2 } = resultMagialink as { data: Array<{magia: string, classe: string}> | null, error: any };
        
        if (!linkError1 && linkData1 && linkData1.length > 0) {
          magialinkData = linkData1;
          console.log(`Loaded ${magialinkData.length} spell-class links from magia_link table`);
        } else if (!linkError2 && linkData2) {
          magialinkData = linkData2;
          console.log(`Loaded ${magialinkData.length} spell-class links from magialink table`);
        } else {
          console.log('No magia_link/magialink data available:', linkError1?.message || linkError2?.message || 'Unknown error');
        }
      } catch (linkErr) {
        console.log('magia_link/magialink tables not accessible, using only spells table data:', linkErr);
      }
      
      console.log(`Loaded ${spellsData?.length || 0} spells from database`);
      
      // Remove duplicates by id and format spells
      const uniqueData = spellsData?.filter((spell, index, self) => 
        index === self.findIndex(s => s.id === spell.id)
      ) || [];
      
      // Helper function to enrich spell classes with magialink data
      const enrichSpellClasses = (spell: any): { classes: string[], classesDetailed: SpellClass[] } => {
        let classes: string[] = [];
        let classesDetailed: SpellClass[] = [];
        
        // First, use existing classes from spells table if available
        if (spell.classes && spell.classes.trim()) {
          classes = spell.classes.split(',').map((c: string) => c.trim());
          // Create detailed format from existing classes
          classesDetailed = classes.map(classe => ({
            classe: classe,
            magia: spell.name
          }));
        }
        
        // If no classes or empty, try to find in magialink
        if (classes.length === 0 || (classes.length === 1 && !classes[0])) {
          const normalizedSpellName = normalizeSpellName(spell.name);
          const matchingLinks = magialinkData.filter(link => 
            normalizeSpellName(link.magia) === normalizedSpellName
          );
          
          if (matchingLinks.length > 0) {
            classes = matchingLinks.map(link => link.classe);
            classesDetailed = matchingLinks.map(link => ({
              classe: link.classe,
              magia: spell.name
            }));
            console.log(`Found ${matchingLinks.length} class links for "${spell.name}":`, classes);
          }
        }
        
        return { classes, classesDetailed };
      };
      
      const formattedSpells = uniqueData.map(spell => {
        const enrichedClasses = enrichSpellClasses(spell);
        return {
          id: spell.id,
          name: spell.name,
          level: spell.level,
          school: spell.school,
          castingtime: (spell as any).castingtime || 'N/A',
          range: spell.range || 'N/A',
          components: spell.components ? spell.components.split(',').map((c: string) => c.trim()) : [],
          duration: spell.duration || 'N/A',
          description: spell.description || '',
          classes: enrichedClasses.classes,
          classesDetailed: enrichedClasses.classesDetailed,
          source: spell.source || 'N/A',
          ritual: spell.ritual || false,
          concentration: false, // Add if needed in database
          atHigherLevels: '', // Add if needed in database
        };
      });
      
      console.log(`Formatted ${formattedSpells.length} spells successfully`);
      setSpells(formattedSpells);
      setFilteredSpells(formattedSpells);
      
      // Extract and set available filter options
      const filterOptions = extractFilterOptions(formattedSpells);
      setAvailableFilters(filterOptions);
    } catch (err) {
      setError('Failed to load spells from database');
      console.error('Error loading spells:', err);
      setSpells([]);
      setFilteredSpells([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    spells: filteredSpells,
    loading,
    error,
    favorites,
    filterSpells,
    toggleFavorite,
    loadSpells,
    setFilteredSpells,
    availableFilters,
  };
}