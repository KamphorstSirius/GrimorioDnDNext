import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheManager } from '@/lib/cacheManager';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';
import { FavoritePreset } from './useFavoritePresets';

export const useFavoritePresetsWithCache = () => {
  const [presets, setPresets] = useState<FavoritePreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { isConnected, updatePendingCount } = useNetworkStatus();

  // Load presets with cache strategy
  const loadPresets = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // First, try to load from cache
      const cachedPresets = await cacheManager.getCachedFavoritePresets(user.id);
      
      if (cachedPresets.length > 0) {
        console.log(`Loaded ${cachedPresets.length} presets from cache`);
        setPresets(cachedPresets);
        
        if (!activePresetId) {
          setActivePresetId(cachedPresets[0].id);
        }
      }

      // If online and connected, fetch fresh data
      if (isConnected) {
        await loadPresetsFromSupabase();
      } else if (cachedPresets.length === 0) {
        // No cache and offline - create default offline preset
        await createDefaultOfflinePreset();
      }
    } catch (err) {
      console.error('Error loading presets:', err);
      setError('Failed to load favorite presets');
    } finally {
      setLoading(false);
    }
  };

  // Load presets from Supabase and update cache
  const loadPresetsFromSupabase = async () => {
    if (!user) return;

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
        // Update cache
        await cacheManager.cacheFavoritePresets(data, user.id);
        
        // Set active preset
        if (!activePresetId && data.length > 0) {
          setActivePresetId(data[0].id);
        } else if (activePresetId) {
          const currentPresetExists = data.some(preset => preset.id === activePresetId);
          if (!currentPresetExists) {
            setActivePresetId(data[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error loading presets from Supabase:', err);
      throw err;
    }
  };

  // Create default preset (online)
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

      const newPresets = [data];
      setPresets(newPresets);
      setActivePresetId(data.id);
      
      // Update cache
      await cacheManager.cacheFavoritePresets(newPresets, user.id);
      
      return data;
    } catch (err) {
      console.error('Error creating default preset:', err);
      return null;
    }
  };

  // Create default preset for offline use
  const createDefaultOfflinePreset = async () => {
    if (!user) return;

    const defaultPreset: FavoritePreset = {
      id: `offline_${user.id}_${Date.now()}`,
      name: 'MY GRIMOIRE (Offline)',
      description: 'Your personal collection of favorite spells',
      user_id: user.id,
      spell_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setPresets([defaultPreset]);
    setActivePresetId(defaultPreset.id);
    
    // Cache the offline preset
    await cacheManager.cacheFavoritePresets([defaultPreset], user.id);
    
    // Queue operation for sync when online
    await cacheManager.addPendingOperation({
      type: 'CREATE_PRESET',
      data: {
        name: 'MY GRIMOIRE',
        description: 'Your personal collection of favorite spells',
        user_id: user.id,
        spell_ids: []
      },
      user_id: user.id
    });
    
    await updatePendingCount();
  };

  // Create a new preset
  const createPreset = async (name: string, description?: string) => {
    if (!user) return null;

    const newPresetData = {
      name,
      description,
      user_id: user.id,
      spell_ids: []
    };

    if (isConnected) {
      // Online: Create in Supabase
      try {
        const { data, error } = await supabase
          .from('favorite_presets')
          .insert(newPresetData)
          .select()
          .single();

        if (error) throw error;

        const updatedPresets = [...presets, data];
        setPresets(updatedPresets);
        setActivePresetId(data.id);
        
        // Update cache (don't await to prevent blocking UI)
        cacheManager.cacheFavoritePresets(updatedPresets, user.id).catch(console.warn);
        
        return data;
      } catch (err) {
        console.error('Error creating preset:', err);
        setError('Failed to create preset');
        return null;
      }
    } else {
      // Offline: Create locally and queue for sync
      const offlinePreset: FavoritePreset = {
        id: `offline_${user.id}_${Date.now()}`,
        ...newPresetData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const updatedPresets = [...presets, offlinePreset];
      setPresets(updatedPresets);
      setActivePresetId(offlinePreset.id);
      
      // Update cache (don't await to prevent blocking UI)
      cacheManager.cacheFavoritePresets(updatedPresets, user.id).catch(console.warn);
      
      // Queue operation for sync
      await cacheManager.addPendingOperation({
        type: 'CREATE_PRESET',
        data: newPresetData,
        user_id: user.id
      });
      
      await updatePendingCount();
      return offlinePreset;
    }
  };

  // Update a preset
  const updatePreset = async (id: string, updates: { name?: string; description?: string; spell_ids?: string[] }) => {
    if (!user) return false;

    if (isConnected && !id.startsWith('offline_')) {
      // Online: Update in Supabase
      try {
        const { error } = await supabase
          .from('favorite_presets')
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        const updatedPresets = presets.map(preset => 
          preset.id === id ? { ...preset, ...updates } : preset
        );
        setPresets(updatedPresets);
        
        // Update cache (don't await to prevent blocking UI)
        cacheManager.cacheFavoritePresets(updatedPresets, user.id).catch(console.warn);
        
        return true;
      } catch (err) {
        console.error('Error updating preset:', err);
        setError('Failed to update preset');
        return false;
      }
    } else {
      // Offline: Update locally and queue for sync
      const updatedPresets = presets.map(preset => 
        preset.id === id ? { ...preset, ...updates, updated_at: new Date().toISOString() } : preset
      );
      setPresets(updatedPresets);
      
      // Update cache (don't await to prevent blocking UI)
      cacheManager.cacheFavoritePresets(updatedPresets, user.id).catch(console.warn);
      
      // Queue operation for sync (only if not an offline-created preset)
      if (!id.startsWith('offline_')) {
        await cacheManager.addPendingOperation({
          type: 'UPDATE_PRESET',
          data: { id, updates },
          user_id: user.id
        });
        
        await updatePendingCount();
      }
      
      return true;
    }
  };

  // Delete a preset
  const deletePreset = async (id: string) => {
    if (!user) return false;

    console.log('deletePreset called:', { id, activePresetId, presetsCount: presets.length });

    if (isConnected && !id.startsWith('offline_')) {
      // Online: Delete from Supabase
      try {
        const { error } = await supabase
          .from('favorite_presets')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        console.log('Preset deleted from database successfully');

        const updatedPresets = presets.filter(preset => preset.id !== id);
        setPresets(updatedPresets);
        
        // Update cache (don't await to prevent blocking UI)
        cacheManager.cacheFavoritePresets(updatedPresets, user.id).catch(console.warn);
        
        // Update active preset
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
    } else {
      // Offline: Delete locally and queue for sync
      const updatedPresets = presets.filter(preset => preset.id !== id);
      setPresets(updatedPresets);
      
      // Update cache (don't await to prevent blocking UI)
      cacheManager.cacheFavoritePresets(updatedPresets, user.id).catch(console.warn);
      
      // Update active preset
      if (activePresetId === id) {
        const newActiveId = updatedPresets.length > 0 ? updatedPresets[0].id : null;
        setActivePresetId(newActiveId);
      }
      
      // Queue operation for sync (only if not an offline-created preset)
      if (!id.startsWith('offline_')) {
        await cacheManager.addPendingOperation({
          type: 'DELETE_PRESET',
          data: { id },
          user_id: user.id
        });
        
        await updatePendingCount();
      }
      
      return true;
    }
  };

  // Add spell to preset
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

  // Remove spell from preset
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
  }, [user?.id]);

  // Debug: log activePresetId changes
  useEffect(() => {
    console.log('useFavoritePresetsWithCache - activePresetId changed:', { 
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