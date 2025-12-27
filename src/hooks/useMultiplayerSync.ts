'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useMultiplayerOptional } from '@/context/MultiplayerContext';
import { useGame } from '@/context/GameContext';
import { GameAction, GameActionInput } from '@/lib/multiplayer/types';
import { Tool, Budget } from '@/types/game';

/**
 * Hook to sync game actions with multiplayer.
 * 
 * When in multiplayer mode:
 * - Local actions are broadcast to peers
 * - Remote actions are applied to local state
 * - Only the host runs the simulation tick
 */
export function useMultiplayerSync() {
  const multiplayer = useMultiplayerOptional();
  const game = useGame();
  const lastActionRef = useRef<string | null>(null);
  const initialStateLoadedRef = useRef(false);

  // Load initial state when joining a room (received from other players)
  useEffect(() => {
    if (!multiplayer || !multiplayer.initialState || initialStateLoadedRef.current) return;
    
    // Use loadState to load the received game state
    const stateString = JSON.stringify(multiplayer.initialState);
    const success = game.loadState(stateString);
    
    if (success) {
      initialStateLoadedRef.current = true;
    }
  }, [multiplayer?.initialState, game]);

  // Apply a remote action to the local game state
  const applyRemoteAction = useCallback((action: GameAction) => {
    switch (action.type) {
      case 'place':
        // Save current tool, apply placement, restore tool
        const currentTool = game.state.selectedTool;
        game.setTool(action.tool);
        game.placeAtTile(action.x, action.y, true); // isRemote = true
        game.setTool(currentTool);
        break;
        
      case 'bulldoze':
        const savedTool = game.state.selectedTool;
        game.setTool('bulldoze');
        game.placeAtTile(action.x, action.y, true); // isRemote = true
        game.setTool(savedTool);
        break;
        
      case 'setTaxRate':
        game.setTaxRate(action.rate);
        break;
        
      case 'setBudget':
        game.setBudgetFunding(action.key, action.funding);
        break;
        
      case 'setSpeed':
        game.setSpeed(action.speed);
        break;
        
      case 'setDisasters':
        game.setDisastersEnabled(action.enabled);
        break;
        
      case 'fullState':
        // Load the full state from the host
        game.loadState(JSON.stringify(action.state));
        break;
        
      case 'tick':
        // Apply tick data from host (for guests)
        // This would require more complex state merging
        // For now, we rely on periodic full state syncs
        break;
    }
  }, [game]);

  // Register callback to receive remote actions
  useEffect(() => {
    if (!multiplayer) return;

    multiplayer.setOnRemoteAction((action: GameAction) => {
      // Apply remote actions to local game state
      applyRemoteAction(action);
    });

    return () => {
      multiplayer.setOnRemoteAction(null);
    };
  }, [multiplayer, applyRemoteAction]);
  
  // Register callback to broadcast local placements
  useEffect(() => {
    if (!multiplayer || multiplayer.connectionState !== 'connected') {
      game.setPlaceCallback(null);
      return;
    }
    
    game.setPlaceCallback((x: number, y: number, tool: Tool) => {
      if (tool === 'bulldoze') {
        multiplayer.dispatchAction({ type: 'bulldoze', x, y });
      } else if (tool !== 'select') {
        multiplayer.dispatchAction({ type: 'place', x, y, tool });
      }
    });
    
    return () => {
      game.setPlaceCallback(null);
    };
  }, [multiplayer, multiplayer?.connectionState, game]);

  // Keep the shared game state updated (any player can share with new peers)
  // Throttled to avoid excessive updates - only updates every 2 seconds
  const lastUpdateRef = useRef<number>(0);
  useEffect(() => {
    if (!multiplayer || multiplayer.connectionState !== 'connected') return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < 2000) return; // Throttle to 2 second intervals
    lastUpdateRef.current = now;
    
    // Update the game state that will be sent to new peers
    multiplayer.updateGameState(game.state);
  }, [multiplayer, game.state]);

  // Broadcast a local action to peers
  const broadcastAction = useCallback((action: GameActionInput) => {
    if (!multiplayer || multiplayer.connectionState !== 'connected') return;
    
    // Prevent broadcasting the same action twice
    const actionKey = JSON.stringify(action);
    if (lastActionRef.current === actionKey) return;
    lastActionRef.current = actionKey;
    
    // Clear the ref after a short delay to allow repeated actions
    setTimeout(() => {
      if (lastActionRef.current === actionKey) {
        lastActionRef.current = null;
      }
    }, 100);
    
    multiplayer.dispatchAction(action);
  }, [multiplayer]);

  // Helper to broadcast a placement action
  const broadcastPlace = useCallback((x: number, y: number, tool: Tool) => {
    if (tool === 'bulldoze') {
      broadcastAction({ type: 'bulldoze', x, y });
    } else if (tool !== 'select') {
      broadcastAction({ type: 'place', x, y, tool });
    }
  }, [broadcastAction]);

  // Helper to broadcast tax rate change
  const broadcastTaxRate = useCallback((rate: number) => {
    broadcastAction({ type: 'setTaxRate', rate });
  }, [broadcastAction]);

  // Helper to broadcast budget change
  const broadcastBudget = useCallback((key: keyof Budget, funding: number) => {
    broadcastAction({ type: 'setBudget', key, funding });
  }, [broadcastAction]);

  // Helper to broadcast speed change
  const broadcastSpeed = useCallback((speed: 0 | 1 | 2 | 3) => {
    broadcastAction({ type: 'setSpeed', speed });
  }, [broadcastAction]);

  // Helper to broadcast disasters toggle
  const broadcastDisasters = useCallback((enabled: boolean) => {
    broadcastAction({ type: 'setDisasters', enabled });
  }, [broadcastAction]);

  // Check if we're in multiplayer mode
  const isMultiplayer = multiplayer?.connectionState === 'connected';
  const isHost = multiplayer?.isHost ?? false;
  const playerCount = multiplayer?.players.length ?? 0;
  const roomCode = multiplayer?.roomCode ?? null;
  const connectionState = multiplayer?.connectionState ?? 'disconnected';

  return {
    isMultiplayer,
    isHost,
    playerCount,
    roomCode,
    connectionState,
    players: multiplayer?.players ?? [],
    broadcastPlace,
    broadcastTaxRate,
    broadcastBudget,
    broadcastSpeed,
    broadcastDisasters,
    broadcastAction,
    leaveRoom: multiplayer?.leaveRoom ?? (() => {}),
  };
}
