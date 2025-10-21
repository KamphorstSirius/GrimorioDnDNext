import { useState, useEffect } from 'react';
import { BookOpen, Sparkles, User, LogIn, LogOut, Download } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import SearchBar from '@/Components/SearchBar';
import SpellCard from '@/Components/SpellCard';
import GrimoireSelector from '@/Components/GrimoireSelector';
import { useSpellsWithCache, SearchFilters, Spell } from '@/hooks/useSpellsWithCache';
import { NetworkStatusIndicator } from '@/Components/NetworkStatusIndicator';
import { useFavoritePresetsContext } from '@/contexts/FavoritePresetsContext';
import SpellModal from '@/Components/SpellModal';
// import ContactButton from '@/Components/ContactButton';
import grimoireBg from '@/assets/grimoire-bg.jpg';

const Index = () => {
  const { spells, loading, error, filterSpells, loadSpells, setFilteredSpells, clearFilters, availableFilters } = useSpellsWithCache();
  const [showFavorites, setShowFavorites] = useState(false);
  const [allSpells, setAllSpells] = useState([]);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [exploreSpell, setExploreSpell] = useState<Spell | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    activeFavorites, 
    addSpellToPreset, 
    removeSpellFromPreset, 
    activePreset,
    activePresetId 
  } = useFavoritePresetsContext();

  // Load spells on component mount and store all spells
  useEffect(() => {
    loadSpells(true); // Force reload only on initial mount
  }, []);

  // Store all spells when they're loaded
  useEffect(() => {
    console.log('🔄 allSpells useEffect triggered:', {
      spellsLength: spells.length,
      allSpellsLength: allSpells.length,
      spellsChanged: spells !== allSpells,
      timestamp: new Date().toISOString()
    });
    if (spells.length > 0 && allSpells.length === 0) {
      console.log('🔄 Setting allSpells for the first time');
      setAllSpells(spells);
    }
  }, [spells, allSpells.length]);

  // Filter spells based on active grimoire
  useEffect(() => {
    console.log('🚨 Index.tsx - Filter effect triggered:', {
      showFavorites,
      activePresetId,
      activeFavoritesLength: activeFavorites.length,
      allSpellsLength: allSpells.length,
      timestamp: new Date().toISOString()
    });

    if (showFavorites && activePresetId && allSpells.length > 0) {
      // Show only spells from the active grimoire (even if empty)
      const grimoireSpells = allSpells.filter(spell => activeFavorites.includes(spell.id));
      console.log('🚨 Index.tsx - Setting grimoire spells:', { grimoireSpellsCount: grimoireSpells.length });
      setFilteredSpells(grimoireSpells);
    } else if (showFavorites && !activePresetId) {
      // If in grimoire mode but no active preset, show empty
      console.log('🚨 Index.tsx - No active preset, showing empty');
      setFilteredSpells([]);
    } else if (!showFavorites) {
      // Leaving grimoire mode: restore full spell list - BUT DON'T OVERRIDE FILTERS
      console.log('🚨 Index.tsx - Not in grimoire mode, NOT resetting to all spells to preserve filters');
      // Commenting out the problematic line that resets filters
      // if (allSpells.length > 0) {
      //   setFilteredSpells(allSpells);
      // }
    }
  }, [showFavorites, activePresetId, activeFavorites, allSpells]);

  const handleSearch = (filters: SearchFilters) => {
    if (showFavorites && activePresetId) {
      // When in grimoire mode, filter only current grimoire spells
      const currentGrimoireSpells = allSpells.filter(spell => activeFavorites.includes(spell.id));
      
      // Apply search filters to current grimoire spells
      let filtered = currentGrimoireSpells;
      
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
          spell.classes.some(spellClass =>
            filters.classes.some(filterClass =>
              spellClass.toLowerCase().includes(filterClass.toLowerCase())
            )
          )
        );
      }

      if (filters.schools.length > 0) {
        filtered = filtered.filter(spell =>
          filters.schools.includes(spell.school)
        );
      }

      if (filters.sources.length > 0) {
        console.log('Applying source filter:', filters.sources);
        filtered = filtered.filter(spell => {
          return filters.sources.some(filterSource => {
            // Check both the source code (like "XGE") and translated names
            const sourceTranslations: Record<string, string[]> = {
              'PHB': ['PHB', 'Livro do Jogador', 'Livro Do Jogador'],
              'XGE': ['XGE', 'Guia de Xanathar', 'Guia De Xanathar'],
              'TCE': ['TCE', 'Caldeirão de Tasha', 'Caldeirão De Tasha'],
              'EE': ['EE', 'Mal Elemental'],
              'SCAG': ['SCAG', 'Costa da Espada', 'Costa Da Espada'],
            };
            
            const translations = sourceTranslations[filterSource];
            const matches = translations ? translations.includes(spell.source) : spell.source === filterSource;
            if (matches) {
              console.log(`Spell "${spell.name}" matches source filter "${filterSource}" (spell source: "${spell.source}")`);
            }
            return matches;
          });
        });
        console.log(`After source filter: ${filtered.length} spells`);
      }
      
      setFilteredSpells(filtered);
    } else {
      // Normal search on all spells
      filterSpells(filters);
    }
  };

  const handleToggleFavorite = async (spellId: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to manage your grimoire.",
        variant: "destructive",
      });
      return;
    }

    console.log('Index.tsx - handleToggleFavorite called:', { 
      spellId, 
      activePresetId, 
      activePresetName: activePreset?.name 
    });

    const spell = spells.find(s => s.id === spellId);
    const isFavorite = activeFavorites.includes(spellId);
    
    const success = isFavorite 
      ? await removeSpellFromPreset(spellId)
      : await addSpellToPreset(spellId);

    if (success) {
      const grimoireName = activePreset?.name || 'Grimoire';
      toast({
        title: isFavorite ? "Removed from Grimoire" : "Added to Grimoire",
        description: spell ? `${spell.name} ${isFavorite ? 'removed from' : 'added to'} ${grimoireName}.` : '',
        duration: 2000,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update grimoire.",
        variant: "destructive",
      });
    }
  };

  const handleExplore = () => {
    const pool: Spell[] = (allSpells && allSpells.length > 0) ? (allSpells as Spell[]) : (spells as Spell[]);
    if (!pool || pool.length === 0) return;

    const favSpells: Spell[] = (allSpells && allSpells.length > 0)
      ? (allSpells as Spell[]).filter((s) => activeFavorites.includes(s.id))
      : (spells as Spell[]).filter((s) => activeFavorites.includes(s.id));

    let selectedClass: string | null = null;

    if (favSpells.length > 0) {
      const counts = new Map<string, number>();
      favSpells.forEach((sp) => {
        sp.classes.forEach((cls) => {
          const key = cls.trim();
          if (!key) return;
          counts.set(key, (counts.get(key) || 0) + 1);
        });
      });

      const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
      if (total > 0) {
        let r = Math.random() * total;
        for (const [cls, cnt] of counts.entries()) {
          r -= cnt;
          if (r <= 0) {
            selectedClass = cls;
            break;
          }
        }
      }
    }

    let candidatePool: Spell[] = pool;
    if (selectedClass) {
      const byClass = pool.filter((s) =>
        s.classes.some((c) => c.trim().toLowerCase() === (selectedClass as string).trim().toLowerCase())
      );
      if (byClass.length > 0) {
        candidatePool = byClass as Spell[];
      }
    }

    const pick = candidatePool[Math.floor(Math.random() * candidatePool.length)] as Spell;
    setExploreSpell(pick);
    setExploreOpen(true);
  };

  // Use filtered spells from useSpells hook (this is set by setFilteredSpells)
  const filteredSpells = spells;

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // PWA Installation logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallButton(false);
      toast({
        title: "App Instalado!",
        description: "O Grimório Arcano agora está disponível em seus aplicativos",
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast({
        title: "Download iniciado",
        description: "O Grimório Arcano está sendo instalado...",
      });
    }
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  return (
    <div className="min-h-screen bg-background">
    {/* Hero Section */}
    <div 
      className="relative h-96 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${grimoireBg})` }}
    >
      <div className="absolute inset-0 bg-background/60"></div>
      <div className="relative h-full flex items-center justify-center">
        <div className="text-center max-w-4xl mx-auto px-4">
          <h1 className="grimoire-title text-5xl md:text-7xl mb-6 float">
            Grimório Arcano
          </h1>
          <p className="spell-text text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Explore the vast collection of magical spells from the realms of Dungeons & Dragons
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button className="btn-grimoire px-8 py-3 text-lg" onClick={handleExplore}>
              <BookOpen className="mr-2 h-5 w-5" />
              Explore Spells
            </Button>
            {user ? (
              <Button 
                variant="outline" 
                className="border-gold text-gold hover:bg-gold/10 px-8 py-3 text-lg"
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 h-5 w-5" />
                Sair
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="border-gold text-gold hover:bg-gold/10 px-8 py-3 text-lg"
                onClick={() => navigate('/auth')}
              >
                <LogIn className="mr-2 h-5 w-5" />
                Entrar
              </Button>
            )}
            {showInstallButton && (
              <Button 
                variant="secondary"
                className="bg-gold/20 border-gold text-gold hover:bg-gold/30 px-8 py-3 text-lg"
                onClick={handleInstallPWA}
              >
                <Download className="mr-2 h-5 w-5" />
                Use como um app offline!
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>


      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Search Section */}
        <div className="mb-12">
          <div className="max-w-4xl mx-auto">
            <SearchBar onSearch={handleSearch} availableFilters={availableFilters} />
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {showFavorites && user ? (
              <div className="min-w-0 flex-1">
                <GrimoireSelector className="min-w-0" />
              </div>
            ) : (
              <h2 className="medieval-heading text-xl sm:text-2xl text-foreground truncate">
                Spell Compendium
              </h2>
            )}
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <Sparkles className="h-4 w-4" />
              <span className="spell-text text-sm">
                {filteredSpells.length}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <NetworkStatusIndicator />
            <Button
              variant={showFavorites ? "default" : "outline"}
              onClick={() => {
                // Clear filters when switching between modes to avoid conflicts
                clearFilters();
                setShowFavorites(!showFavorites);
              }}
              className={`text-sm sm:text-base ${showFavorites ? "btn-grimoire" : "border-gold text-gold hover:bg-gold/10"}`}
              disabled={!user && !showFavorites}
              size="sm"
            >
              <User className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{showFavorites ? 'All Spells' : 'My Grimoire'}</span>
              <span className="sm:hidden">{showFavorites ? 'All' : 'Mine'}</span>
            </Button>
          </div>
        </div>

        {/* Spells Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="spell-card animate-pulse">
                <div className="p-6">
                  <div className="h-6 bg-muted rounded mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                  <div className="h-4 bg-muted rounded mb-4 w-1/2"></div>
                  <div className="h-20 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredSpells.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpells.map((spell) => (
              <SpellCard
                key={spell.id}
                spell={spell}
                isFavorite={activeFavorites.includes(spell.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="medieval-heading text-xl text-muted-foreground mb-2">
              No spells found
            </h3>
            <p className="spell-text text-muted-foreground">
              {showFavorites 
                ? "You haven't added any spells to your grimoire yet." 
                : "Try adjusting your search filters."}
            </p>
          </div>
        )}
      </div>

      {exploreSpell && (
        <SpellModal open={exploreOpen} onOpenChange={setExploreOpen} spell={exploreSpell} />
      )}

      {/* Contact Button */}
      {/* <ContactButton /> */}

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="spell-text text-muted-foreground">
              Built with magic and React ✨ | Dungeons & Dragons content is property of Wizards of the Coast
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
