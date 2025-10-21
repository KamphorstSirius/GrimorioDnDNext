import { useState, useEffect, useCallback } from 'react';
import { cacheManager, PendingOperation } from '@/lib/cacheManager';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean; // Connection to Supabase
  pendingOperations: number;
  lastSyncTime: number | null;
  syncing: boolean;
}

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isConnected: false,
    pendingOperations: 0,
    lastSyncTime: null,
    syncing: false
  });
  
  const { user } = useAuth();

  // Check Supabase connection
  const checkSupabaseConnection = useCallback(async (): Promise<boolean> => {
    try {
      console.log('useNetworkStatus - Checking Supabase connection...');
      const { error } = await supabase.from('spells').select('id').limit(1);
      const connected = !error;
      console.log('useNetworkStatus - Supabase connection check result:', { connected, error });
      return connected;
    } catch (err) {
      console.log('useNetworkStatus - Supabase connection check failed:', err);
      return false;
    }
  }, []);

  // Update pending operations count
  const updatePendingCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const pending = await cacheManager.getPendingOperations(user.id);
      setStatus(prev => ({ ...prev, pendingOperations: pending.length }));
    } catch (error) {
      console.error('Error getting pending operations:', error);
    }
  }, [user]);

  // Sync pending operations
  const syncPendingOperations = useCallback(async (): Promise<boolean> => {
    if (!user || !status.isConnected) return false;

    setStatus(prev => ({ ...prev, syncing: true }));
    
    try {
      const pending = await cacheManager.getPendingOperations(user.id);
      let successCount = 0;
      let failureCount = 0;

      for (const operation of pending) {
        try {
          await processOperation(operation);
          await cacheManager.removePendingOperation(operation.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);
          failureCount++;
        }
      }

      if (successCount > 0) {
        const lastSyncTime = Date.now();
        await cacheManager.setMetadata('last_sync_time', lastSyncTime);
        
        setStatus(prev => ({ 
          ...prev, 
          lastSyncTime,
          pendingOperations: failureCount 
        }));

        toast({
          title: "Sincronizado",
          description: `${successCount} operações sincronizadas com sucesso`,
        });
      }

      if (failureCount > 0) {
        toast({
          title: "Erro de sincronização",
          description: `${failureCount} operações falharam`,
          variant: "destructive"
        });
      }

      return failureCount === 0;
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Erro de sincronização",
        description: "Falha ao sincronizar dados",
        variant: "destructive"
      });
      return false;
    } finally {
      setStatus(prev => ({ ...prev, syncing: false }));
    }
  }, [user, status.isConnected]);

  // Process individual operation
  const processOperation = async (operation: PendingOperation) => {
    switch (operation.type) {
      case 'CREATE_PRESET':
        const { data: newPreset, error: createError } = await supabase
          .from('favorite_presets')
          .insert(operation.data)
          .select()
          .single();
        if (createError) throw createError;
        break;

      case 'UPDATE_PRESET':
        const { error: updateError } = await supabase
          .from('favorite_presets')
          .update(operation.data.updates)
          .eq('id', operation.data.id)
          .eq('user_id', operation.user_id);
        if (updateError) throw updateError;
        break;

      case 'DELETE_PRESET':
        const { error: deleteError } = await supabase
          .from('favorite_presets')
          .delete()
          .eq('id', operation.data.id)
          .eq('user_id', operation.user_id);
        if (deleteError) throw deleteError;
        break;

      default:
        console.warn('Unknown operation type:', operation.type);
    }
  };

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      toast({
        title: "Conectado",
        description: "Conexão com a internet restaurada",
      });
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false, isConnected: false }));
      toast({
        title: "Desconectado",
        description: "Modo offline ativado - dados salvos localmente",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check connection periodically when online
  useEffect(() => {
    if (!status.isOnline) return;

    const checkConnection = async () => {
      const connected = await checkSupabaseConnection();
      setStatus(prev => ({ ...prev, isConnected: connected }));
      
      if (connected) {
        await updatePendingCount();
        // Auto-sync if there are pending operations
        if (status.pendingOperations > 0) {
          await syncPendingOperations();
        }
      }
    };

    // Initial check
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [status.isOnline, status.pendingOperations, checkSupabaseConnection, updatePendingCount, syncPendingOperations]);

  // Load last sync time on mount
  useEffect(() => {
    const loadLastSync = async () => {
      const lastSync = await cacheManager.getMetadata('last_sync_time');
      if (lastSync) {
        setStatus(prev => ({ ...prev, lastSyncTime: lastSync }));
      }
    };
    
    loadLastSync();
  }, []);

  // Update pending count when user changes
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  return {
    ...status,
    syncPendingOperations,
    updatePendingCount,
    checkSupabaseConnection
  };
};