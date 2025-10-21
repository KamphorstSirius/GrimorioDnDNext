import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface EditGrimoireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: { id: string; name: string; description?: string } | null;
  onUpdatePreset: (id: string, updates: { name?: string; description?: string }) => Promise<boolean>;
}

export default function EditGrimoireDialog({
  open,
  onOpenChange,
  preset,
  onUpdatePreset
}: EditGrimoireDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Update form when preset changes
  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setDescription(preset.description || '');
    }
  }, [preset]);

  const handleEdit = async () => {
    if (!preset || !name.trim()) return;

    setIsLoading(true);
    try {
      const success = await onUpdatePreset(preset.id, {
        name: name.trim(),
        description: description.trim() || undefined
      });

      if (success) {
        toast({
          title: "Grimório Atualizado",
          description: "As alterações foram salvas com sucesso.",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Erro",
          description: "Falha ao atualizar o grimório.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName('');
      setDescription('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="grimoire-dialog">
        <DialogHeader>
          <DialogTitle className="medieval-heading text-gold">Editar Grimório</DialogTitle>
          <DialogDescription className="spell-text">
            Altere o nome e descrição do seu grimório.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name" className="spell-text">Nome</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="grimoire-input"
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-description" className="spell-text">Descrição (opcional)</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva este conjunto de magias..."
              className="grimoire-input"
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleEdit} 
            disabled={!name.trim() || isLoading}
            className="btn-grimoire"
          >
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}