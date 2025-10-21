import React from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, Loader2, Clock } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';

export const NetworkStatusIndicator: React.FC = () => {
  const { 
    isOnline, 
    isConnected, 
    pendingOperations, 
    lastSyncTime, 
    syncing,
    syncPendingOperations 
  } = useNetworkStatus();

  const getStatusColor = () => {
    if (!isOnline) return 'bg-crimson';
    if (!isConnected) return 'bg-copper';
    if (pendingOperations > 0) return 'bg-gold-muted';
    return 'bg-emerald';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (!isConnected) return 'Sem conexão';
    if (syncing) return 'Sincronizando...';
    if (pendingOperations > 0) return `${pendingOperations} pendente${pendingOperations > 1 ? 's' : ''}`;
    return 'Conectado';
  };

  const getStatusIcon = () => {
    if (syncing) return <Loader2 className="h-3 w-3 animate-spin" />;
    if (!isOnline) return <WifiOff className="h-3 w-3" />;
    if (!isConnected) return <CloudOff className="h-3 w-3" />;
    if (pendingOperations > 0) return <Clock className="h-3 w-3" />;
    return <Cloud className="h-3 w-3" />;
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Nunca';
    const date = new Date(lastSyncTime);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleSync = async () => {
    if (isConnected && pendingOperations > 0 && !syncing) {
      await syncPendingOperations();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Badge 
              variant="outline" 
              className={`${getStatusColor()} text-white border-none transition-all duration-300`}
            >
              {getStatusIcon()}
              <span className="ml-1 text-xs font-medium">
                {getStatusText()}
              </span>
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="grimoire-dialog">
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="h-3 w-3 text-emerald" /> : <WifiOff className="h-3 w-3 text-crimson" />}
              <span>Internet: {isOnline ? 'Conectado' : 'Desconectado'}</span>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? <Cloud className="h-3 w-3 text-emerald" /> : <CloudOff className="h-3 w-3 text-copper" />}
              <span>Servidor: {isConnected ? 'Conectado' : 'Desconectado'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-gold" />
              <span>Última sync: {formatLastSync()}</span>
            </div>
            {pendingOperations > 0 && (
              <div className="text-gold-muted">
                {pendingOperations} operação{pendingOperations > 1 ? 'ões' : ''} pendente{pendingOperations > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {pendingOperations > 0 && isConnected && !syncing && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              className="h-6 px-2 border-gold-muted text-gold-muted hover:bg-gold-muted hover:text-background"
            >
              <Cloud className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="grimoire-dialog">
            <span className="text-xs">Sincronizar operações pendentes</span>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};