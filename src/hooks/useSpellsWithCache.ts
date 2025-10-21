import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheManager } from '@/lib/cacheManager';
import { useNetworkStatus } from './useNetworkStatus';
import { Spell, SpellClass, SearchFilters } from './useSpells';

export type { Spell, SearchFilters };

export function useSpellsWithCache() {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [filteredSpells, setFilteredSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters | null>(null);
  const [availableFilters, setAvailableFilters] = useState({
    levels: [] as Array<{ value: string; label: string }>,
    classes: [] as Array<{ value: string; label: string }>,
    schools: [] as Array<{ value: string; label: string }>,
    sources: [] as Array<{ value: string; label: string }>,
  });

  const { isConnected } = useNetworkStatus();

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

  // Apply filters to a given spell array
  const applyFiltersToSpells = (spellArray: Spell[], filters: SearchFilters) => {
    let filtered = spellArray;

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
              if (translations) {
                return translations.some(translation => 
                  spellClass.trim().toLowerCase().startsWith(translation.toLowerCase()) ||
                  spellClass.trim().toLowerCase().startsWith(' ' + translation.toLowerCase())
                );
              }
              return spellClass.trim().toLowerCase().startsWith(filterClass.toLowerCase()) ||
                     spellClass.trim().toLowerCase().startsWith(' ' + filterClass.toLowerCase());
            } else {
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

    return filtered;
  };

  // Filter spells based on search criteria
  const filterSpells = (filters: SearchFilters) => {
    console.log('🔍 filterSpells called with:', filters);
    console.log('🔍 Current spells count:', spells.length);
    setCurrentFilters(filters);
    const filtered = applyFiltersToSpells(spells, filters);
    console.log('🔍 Filtered spells count:', filtered.length);
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

  // Helper function to normalize spell names for comparison
  const normalizeSpellName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');
  };

  // Extract unique filter values from spells data
  const extractFilterOptions = (spells: Spell[]) => {
    const uniqueLevels = [...new Set(spells.map(spell => spell.level.toString()))]
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(level => ({
        value: level,
        label: level === '0' ? 'Truque' : `${level}º Nível`
      }));

    const allClasses = spells.flatMap(spell => 
      spell.classes.flatMap(classStr => 
        classStr.split(',').map(c => c.trim()).filter(c => {
          return c && !c.includes(' ');
        })
      )
    );
    const uniqueClasses = [...new Set(allClasses)]
      .sort()
      .map(className => ({ value: className, label: className }));

    const uniqueSchools = [...new Set(spells.map(spell => spell.school))]
      .sort()
      .map(school => ({ value: school, label: school }));

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

  // Load spells with cache strategy
  const loadSpells = async (forceReload = false) => {
    console.log('useSpellsWithCache - loadSpells starting, isConnected:', isConnected, 'forceReload:', forceReload);
    setLoading(true);
    setError(null);
    
    try {
      // Only reload from Supabase if forced or if no spells are loaded yet
      if (forceReload || spells.length === 0) {
        await loadSpellsFromSupabase();
      } else {
        console.log('useSpellsWithCache - Skipping reload, spells already loaded');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading spells from Supabase, trying cache:', err);
      
      // Fallback to cache
      try {
        const cachedSpells = await cacheManager.getCachedSpells();
        
        if (cachedSpells.length > 0) {
          console.log(`📦 Loaded ${cachedSpells.length} spells from cache`);
          console.log('📦 Current filters when loading from cache:', currentFilters);
          setSpells(cachedSpells);
          
          // Preserve current filters if they exist, otherwise show all spells
          if (currentFilters) {
            console.log('📦 Reapplying filters to cached spells');
            const refiltered = applyFiltersToSpells(cachedSpells, currentFilters);
            console.log('📦 Refiltered spells count:', refiltered.length);
            setFilteredSpells(refiltered);
          } else {
            console.log('📦 No filters to preserve, showing all cached spells');
            setFilteredSpells(cachedSpells);
          }
          
          setAvailableFilters(extractFilterOptions(cachedSpells));
          setError('Usando dados offline - algumas funcionalidades podem estar limitadas');
        } else {
          setError('Sem conexão e dados não encontrados no cache');
        }
      } catch (cacheErr) {
        console.error('Error loading from cache:', cacheErr);
        setError('Falha ao carregar magias');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load spells from Supabase and update cache
  const loadSpellsFromSupabase = async () => {
    try {
      // Load spells
      const { data: spellsData, error: spellsError } = await supabase
        .from('spells')
        .select('*')
        .order('name')
        .limit(1000);
        
      if (spellsError) throw spellsError;

      // Load magia links
      let magialinkData: Array<{magia: string, classe: string}> = [];
      try {
        const [resultMagiaLink, resultMagialink] = await Promise.all([
          (supabase as any).from('magia_link').select('magia, classe'),
          (supabase as any).from('magialink').select('magia, classe'),
        ]);

        const { data: linkData1, error: linkError1 } = resultMagiaLink;
        const { data: linkData2, error: linkError2 } = resultMagialink;
        
        if (!linkError1 && linkData1 && linkData1.length > 0) {
          magialinkData = linkData1;
          console.log(`Loaded ${magialinkData.length} spell-class links from magia_link table`);
        } else if (!linkError2 && linkData2) {
          magialinkData = linkData2;
          console.log(`Loaded ${magialinkData.length} spell-class links from magialink table`);
        }

        // Cache magia links
        if (magialinkData.length > 0) {
          await cacheManager.cacheMagiaLinks(magialinkData);
        }
      } catch (linkErr) {
        console.log('magia_link/magialink tables not accessible, trying cache:', linkErr);
        // Try to load from cache
        magialinkData = await cacheManager.getCachedMagiaLinks();
      }
      
      // Remove duplicates and format spells
      const uniqueData = spellsData?.filter((spell, index, self) => 
        index === self.findIndex(s => s.id === spell.id)
      ) || [];
      
      // Helper function to enrich spell classes with magialink data
      const enrichSpellClasses = (spell: any): { classes: string[], classesDetailed: SpellClass[] } => {
        let classes: string[] = [];
        let classesDetailed: SpellClass[] = [];
        
        if (spell.classes && spell.classes.trim()) {
          classes = spell.classes.split(',').map((c: string) => c.trim());
          classesDetailed = classes.map(classe => ({
            classe: classe,
            magia: spell.name
          }));
        }
        
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
          concentration: false,
          atHigherLevels: '',
        };
      });
      
      console.log(`🌐 Loaded ${formattedSpells.length} spells from Supabase`);
      console.log('🌐 Current filters when loading from Supabase:', currentFilters);
      
      // Update state
      setSpells(formattedSpells);
      
      // Preserve current filters if they exist, otherwise show all spells
      if (currentFilters) {
        console.log('🌐 Reapplying filters to Supabase spells');
        const refiltered = applyFiltersToSpells(formattedSpells, currentFilters);
        console.log('🌐 Refiltered spells count:', refiltered.length);
        setFilteredSpells(refiltered);
      } else {
        console.log('🌐 No filters to preserve, showing all Supabase spells');
        setFilteredSpells(formattedSpells);
      }
      
      setAvailableFilters(extractFilterOptions(formattedSpells));
      
      // Cache the fresh data
      await cacheManager.cacheSpells(formattedSpells);
      
    } catch (err) {
      console.error('Error loading spells from Supabase:', err);
      throw err;
    }
  };

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('spell-favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('spell-favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Clear current filters
  const clearFilters = () => {
    setCurrentFilters(null);
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
    clearFilters,
    availableFilters,
  };
}