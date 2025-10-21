import { useState } from 'react';
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

interface CreateGrimoireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePreset: (name: string, description?: string) => Promise<boolean>;
  defaultName?: string;
}

export default function CreateGrimoireDialog({
  open,
  onOpenChange,
  onCreatePreset,
  defaultName = ''
}: CreateGrimoireDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Set default name when dialog opens
  useState(() => {
    if (open && defaultName) {
      setName(defaultName);
    }
  });

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const success = await onCreatePreset(name.trim(), description.trim() || undefined);
      
      if (success) {
        toast({
          title: "Grimório Criado",
          description: `${name} foi criado com sucesso.`,
        });
        setName('');
        setDescription('');
        onOpenChange(false);
      } else {
        toast({
          title: "Erro",
          description: "Falha ao criar o grimório.",
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
          <DialogTitle className="medieval-heading text-gold">Criar Novo Grimório</DialogTitle>
          <DialogDescription className="spell-text">
            Crie um novo conjunto de magias favoritas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="create-name" className="spell-text">Nome</Label>
            <Input
              id="create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="GRIMOIRE 2"
              className="grimoire-input"
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-description" className="spell-text">Descrição (opcional)</Label>
            <Textarea
              id="create-description"
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
            onClick={handleCreate} 
            disabled={!name.trim() || isLoading}
            className="btn-grimoire"
          >
            {isLoading ? 'Criando...' : 'Criar Grimório'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}