import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface FavoritePreset {
  id: string;
  name: string;
  description?: string;
  spell_ids: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useFavoritePresets = () => {
  const [presets, setPresets] = useState<FavoritePreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Load presets from Supabase
  const loadPresets = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('favorite_presets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setPresets(data || []);
      
      // If no presets exist, create a default one
      if (!data || data.length === 0) {
        await createDefaultPreset();
      } else {
        // Only set first preset as active if none selected
        if (!activePresetId && data.length > 0) {
          setActivePresetId(data[0].id);
        } else if (activePresetId) {
          // Check if the current activePresetId still exists in the loaded presets
          const currentPresetExists = data.some(preset => preset.id === activePresetId);
          if (!currentPresetExists) {
            setActivePresetId(data[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error loading presets:', err);
      setError('Failed to load favorite presets');
    } finally {
      setLoading(false);
    }
  };

  // Create default preset
  const createDefaultPreset = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('favorite_presets')
        .insert({
          name: 'MY GRIMOIRE',
          description: 'Your personal collection of favorite spells',
          user_id: user.id,
          spell_ids: []
        })
        .select()
        .single();

      if (error) throw error;

      setPresets([data]);
      setActivePresetId(data.id);
      return data;
    } catch (err) {
      console.error('Error creating default preset:', err);
      return null;
    }
  };

  // Create a new preset
  const createPreset = async (name: string, description?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('favorite_presets')
        .insert({
          name,
          description,
          user_id: user.id,
          spell_ids: []
        })
        .select()
        .single();

      if (error) throw error;

      setPresets(prev => [...prev, data]);
      setActivePresetId(data.id);
      return data;
    } catch (err) {
      console.error('Error creating preset:', err);
      setError('Failed to create preset');
      return null;
    }
  };

  // Update a preset
  const updatePreset = async (id: string, updates: { name?: string; description?: string; spell_ids?: string[] }) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('favorite_presets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setPresets(prev => prev.map(preset => 
        preset.id === id ? { ...preset, ...updates } : preset
      ));
      return true;
    } catch (err) {
      console.error('Error updating preset:', err);
      setError('Failed to update preset');
      return false;
    }
  };

  // Delete a preset
  const deletePreset = async (id: string) => {
    if (!user) return false;

    console.log('deletePreset called:', { id, activePresetId, presetsCount: presets.length });

    try {
      const { error } = await supabase
        .from('favorite_presets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('Preset deleted from database successfully');

      // Update local state immediately
      const updatedPresets = presets.filter(preset => preset.id !== id);
      setPresets(updatedPresets);
      
      console.log('Updated presets:', { updatedPresetsCount: updatedPresets.length });
      
      // If deleted preset was active, select first available or null
      if (activePresetId === id) {
        const newActiveId = updatedPresets.length > 0 ? updatedPresets[0].id : null;
        console.log('Changing active preset from deleted:', { deletedId: id, newActiveId });
        setActivePresetId(newActiveId);
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting preset:', err);
      setError('Failed to delete preset');
      return false;
    }
  };

  // Add spell to active preset
  const addSpellToPreset = async (spellId: string, presetId?: string) => {
    const targetPresetId = presetId || activePresetId;
    console.log('addSpellToPreset called:', { 
      spellId, 
      presetId, 
      activePresetId, 
      targetPresetId,
      presetsLength: presets.length,
      presetIds: presets.map(p => p.id)
    });
    
    if (!targetPresetId) {
      console.log('No target preset ID found');
      return false;
    }

    const preset = presets.find(p => p.id === targetPresetId);
    if (!preset) {
      console.log('Preset not found for ID:', { targetPresetId, availablePresets: presets.map(p => ({ id: p.id, name: p.name })) });
      return false;
    }

    console.log('Adding spell to preset:', { presetName: preset.name, presetId: preset.id });

    if (preset.spell_ids.includes(spellId)) return true; // Already added

    const updatedSpellIds = [...preset.spell_ids, spellId];
    return await updatePreset(targetPresetId, { spell_ids: updatedSpellIds });
  };

  // Remove spell from active preset
  const removeSpellFromPreset = async (spellId: string, presetId?: string) => {
    const targetPresetId = presetId || activePresetId;
    if (!targetPresetId) return false;

    const preset = presets.find(p => p.id === targetPresetId);
    if (!preset) return false;

    const updatedSpellIds = preset.spell_ids.filter(id => id !== spellId);
    return await updatePreset(targetPresetId, { spell_ids: updatedSpellIds });
  };

  // Get active preset
  const activePreset = presets.find(p => p.id === activePresetId) || null;

  // Get active preset spell IDs
  const activeFavorites = activePreset?.spell_ids || [];

  // Load presets when user changes
  useEffect(() => {
    if (user) {
      loadPresets();
    } else {
      setPresets([]);
      setActivePresetId(null);
    }
  }, [user?.id]); // Only depend on user.id to avoid unnecessary re-runs

  // Debug: log activePresetId changes
  useEffect(() => {
    console.log('useFavoritePresets - activePresetId changed:', { 
      activePresetId, 
      activePresetName: activePreset?.name,
      presetsCount: presets.length,
      allPresets: presets.map(p => ({ id: p.id, name: p.name }))
    });
  }, [activePresetId, activePreset?.name, presets.length]);

  return {
    presets,
    activePreset,
    activePresetId,
    activeFavorites,
    loading,
    error,
    setActivePresetId,
    loadPresets,
    createPreset,
    updatePreset,
    deletePreset,
    addSpellToPreset,
    removeSpellFromPreset,
  };
};