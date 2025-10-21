import { useState } from 'react';
import { Pencil, Plus, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/Components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { useFavoritePresetsContext } from '@/contexts/FavoritePresetsContext';
import { useToast } from '@/hooks/use-toast';
import CreateGrimoireDialog from './CreateGrimoireDialog';
import EditGrimoireDialog from './EditGrimoireDialog';

interface GrimoireSelectorProps {
  className?: string;
}

export default function GrimoireSelector({ className }: GrimoireSelectorProps) {
  const { 
    presets, 
    activePreset, 
    setActivePresetId, 
    createPreset, 
    updatePreset, 
    deletePreset 
  } = useFavoritePresetsContext();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<{ id: string; name: string; description?: string } | null>(null);

  const handleCreatePreset = async (name: string, description?: string) => {
    const result = await createPreset(name, description);
    return !!result;
  };

  const handleUpdatePreset = async (id: string, updates: { name?: string; description?: string }) => {
    return await updatePreset(id, updates);
  };

  const handleDeletePreset = async (presetId: string, presetName: string) => {
    console.log('GrimoireSelector - handleDeletePreset called:', { presetId, presetName });
    
    const success = await deletePreset(presetId);
    
    if (success) {
      console.log('GrimoireSelector - Delete successful');
      
      toast({
        title: "Grimório Deletado",
        description: `${presetName} foi removido.`,
      });
    } else {
      toast({
        title: "Erro",
        description: "Falha ao deletar o grimório.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (preset: { id: string; name: string; description?: string }) => {
    setEditingPreset(preset);
    setIsEditDialogOpen(true);
  };

  const getNextGrimoireName = () => {
    const existingNumbers = presets
      .map(p => {
        const match = p.name.match(/GRIMOIRE (\d+)/i);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);

    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 2;
    return `GRIMOIRE ${nextNumber}`;
  };

  if (presets.length === 0) {
    return (
      <div className={`flex items-center gap-2 min-w-0 ${className}`}>
        <h2 className="medieval-heading text-xl sm:text-2xl text-foreground truncate">MY GRIMOIRE</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gold hover:text-gold/80 p-1 shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </Dialog>
        <CreateGrimoireDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreatePreset={handleCreatePreset}
          defaultName="MY GRIMOIRE"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="medieval-heading text-xl sm:text-2xl text-foreground hover:text-gold p-0 h-auto font-normal min-w-0 justify-start"
          >
            <span className="truncate">{activePreset?.name || 'MY GRIMOIRE'}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="spell-card w-64">
          {presets.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              onClick={() => {
                console.log('Selecting preset:', { presetId: preset.id, presetName: preset.name });
                setActivePresetId(preset.id);
              }}
              className={`flex items-center justify-between cursor-pointer ${
                preset.id === activePreset?.id ? 'bg-gold/10 text-gold' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="spell-text font-medium">{preset.name}</div>
                {preset.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {preset.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Close dropdown first, then open edit dialog with a slight delay
                    setTimeout(() => {
                      openEditDialog(preset);
                    }, 100);
                  }}
                  className="p-1 h-6 w-6 text-gold hover:text-gold/80"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                {presets.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePreset(preset.id, preset.name);
                    }}
                    className="p-1 h-6 w-6 text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => {
              setIsCreateDialogOpen(true);
            }}
            className="text-gold cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Grimório
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditGrimoireDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        preset={editingPreset}
        onUpdatePreset={handleUpdatePreset}
      />

      <CreateGrimoireDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreatePreset={handleCreatePreset}
        defaultName={getNextGrimoireName()}
      />
    </div>
  );
}