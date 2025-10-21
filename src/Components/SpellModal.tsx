import { Badge } from "@/Components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";
import { BookOpen, Zap, Clock, Target } from "lucide-react";
import type { Spell } from "@/hooks/useSpells";

interface SpellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spell: Spell;
}

function getLevelText(level: number) {
  if (level === 0) return "Cantrip";
  return `Level ${level}`;
}

function getSourceTitle(source: string) {
  const sourceMap: Record<string, string> = {
    PHB: "Livro do Jogador",
    XGE: "Guia de Xanathar",
    TCE: "Caldeirão de Tasha",
    EE: "Mal Elemental",
    SCAG: "Costa da Espada",
  };
  return sourceMap[source] || source;
}

export default function SpellModal({
  open,
  onOpenChange,
  spell,
}: SpellModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setTimeout(() => {
            (document.activeElement as HTMLElement)?.blur();
          }, 0);
        }
      }}
    >
      <DialogContent className="w-[85%] max-w-none max-h-[90vh] overflow-y-auto custom-scrollbar [&>button]:close-button-neon">
        <DialogHeader>
          <DialogTitle className="medieval-heading text-xl text-neon-yellow">
            {spell.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Spell Info Header */}
          <div className="flex flex-wrap gap-2">
            <Badge className="spell-level-badge">
              {getLevelText(spell.level)}
            </Badge>
            <Badge className="grimoire-badge">{spell.school}</Badge>
            {spell.ritual && <Badge className="grimoire-badge">Ritual</Badge>}
            {spell.concentration && (
              <Badge className="grimoire-badge">Concentration</Badge>
            )}
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-gold" />
              <span className="spell-text">{spell.castingtime || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4 text-gold" />
              <span className="spell-text">{spell.range}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4 text-gold" />
              <span className="spell-text">{spell.components.join(", ")}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4 text-gold" />
              <span className="spell-text">{spell.duration}</span>
            </div>
          </div>

        {/* Full Description */}
<div className="space-y-4">
  <div>
    <h4 className="medieval-heading text-sm text-neon-yellow mb-2">
      Descrição
    </h4>
    <div className="spell-text text-foreground leading-relaxed">
      {spell.description
        .replace(/At Higher Levels/gi, " \n Em Níveis Superiores ") // substitui antes do split
        .split("\n") // primeiro quebra por linhas
        .flatMap(
          (
            line // para cada linha, quebra por ". "
          ) =>
            line
              .split(". ")
              .map(
                (sentence, i, arr) =>
                  sentence + (i < arr.length - 1 ? "." : "")
              )
        )
        .map((part, index) => (
          <p key={index} className={index > 0 ? "mt-2" : ""}>
            {part.trim()}
          </p>
        ))}
    </div>
  </div>


            {/* Classes */}
            <div>
              <h4 className="medieval-heading text-sm text-neon-yellow mb-2">
                Classes
              </h4>
              <div className="flex flex-wrap gap-1">
                {spell.classes.map((className) => (
                  <Badge key={className} className="grimoire-badge">
                    {className}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Source */}
            <div>
              <h4 className="medieval-heading text-sm text-neon-yellow mb-2">
                Fonte
              </h4>
              <p className="spell-text text-muted-foreground">
                {getSourceTitle(spell.source)}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
