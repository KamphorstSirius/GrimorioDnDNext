import { useState } from 'react';
import { Heart, BookOpen, Zap, Clock, Target } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import SpellModal from '@/Components/SpellModal';

interface SpellClass {
  classe: string;
  magia: string;
}

interface Spell {
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
  classesDetailed: SpellClass[];
  source: string;
  ritual?: boolean;
  concentration?: boolean;
}

interface SpellCardProps {
  spell: Spell;
  isFavorite?: boolean;
  onToggleFavorite?: (spellId: string) => void;
}

export default function SpellCard({ spell, isFavorite = false, onToggleFavorite }: SpellCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);


  const getLevelText = (level: number) => {
    if (level === 0) return 'Cantrip';
    return `Level ${level}`;
  };

  const getSourceTitle = (source: string) => {
    const sourceMap: Record<string, string> = {
      'PHB': 'Livro do Jogador',
      'XGE': 'Guia de Xanathar',
      'TCE': 'Caldeirão de Tasha',
      'EE': 'Mal Elemental',
      'SCAG': 'Costa da Espada',
    };
    return sourceMap[source] || source;
  };

  return (
    <div className="spell-card group">
      <div className="p-6">
        {/* Source Title */}
        <div className="mb-3">
          <h2 className="medieval-heading text-lg text-gold text-center transition-all duration-300 group-hover:text-shadow-glow group-hover:text-neon-yellow">
            {getSourceTitle(spell.source)}
          </h2>
        </div>
        
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="medieval-heading text-xl mb-2 transition-all duration-300 group-hover:text-neon-yellow">
              {spell.name}
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="spell-level-badge">
                {getLevelText(spell.level)}
              </Badge>
              <Badge className="grimoire-badge">
                {spell.school}
              </Badge>
              {spell.ritual && (
                <Badge className="grimoire-badge">
                  Ritual
                </Badge>
              )}
              {spell.concentration && (
                <Badge className="grimoire-badge">
                  Concentration
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('Favorite button clicked for spell:', spell.id);
              onToggleFavorite?.(spell.id);
            }}
            className="text-gold hover:text-gold-muted hover:bg-gold/10 cursor-pointer z-10 relative"
          >
            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 text-gold" />
            <span className="spell-text">{spell.castingtime || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4 text-gold" />
            <span className="spell-text">{spell.range}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-4 w-4 text-gold" />
            <span className="spell-text">{spell.components.join(', ')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="h-4 w-4 text-gold" />
            <span className="spell-text">{spell.duration}</span>
          </div>
        </div>

        {/* Description */}
        <div className="border-t border-border pt-4">
          <p className="spell-text text-foreground leading-relaxed mb-4">
            {isExpanded ? spell.description : `${spell.description.slice(0, 200)}${spell.description.length > 200 ? '...' : ''}`}
          </p>

          {spell.atHigherLevels && isExpanded && (
            <div className="mb-4">
              <h4 className="medieval-heading text-sm text-gold mb-2">At Higher Levels</h4>
              <p className="spell-text text-muted-foreground text-sm">{spell.atHigherLevels}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {spell.classes.map((className) => (
                <Badge
                  key={className}
                  className="grimoire-badge"
                >
                  {className}
                </Badge>
              ))}
            </div>
            {spell.description.length > 200 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gold hover:text-gold-muted hover:bg-gold/10 cursor-pointer z-10 relative"
                  onClick={() => setIsModalOpen(true)}
                >
                  Read More
                </Button>
                <SpellModal open={isModalOpen} onOpenChange={setIsModalOpen} spell={spell} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}