'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useMultiplayerOptional } from '@/context/MultiplayerContext';
import { useGame } from '@/context/GameContext';
import { GameAction, GameActionInput } from '@/lib/multiplayer/types';
import { Tool, Budget, GameState } from '@/types/game';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';

// Batch placement buffer for reducing message count during drags
const BATCH_FLUSH_INTERVAL = 100; // ms - flush every 100ms during drag
const BATCH_MAX_SIZE = 100; // Max placements before force flush

// Room-specific state storage key prefix
const ROOM_STATE_PREFIX = 'isocity-room-';

// Save game state for a specific room
export function saveRoomState(roomCode: string, state: GameState): void {
  if (typeof window === 'undefined' || !roomCode) return;
  try {
    const compressed = compressToUTF16(JSON.stringify(state));
    localStorage.setItem(ROOM_STATE_PREFIX + roomCode.toUpperCase(), compressed);
  } catch (e) {
    console.error('Failed to save room state:', e);
  }
}

// Load game state for a specific room
export function loadRoomState(roomCode: string): GameState | null {
  if (typeof window === 'undefined' || !roomCode) return null;
  try {
    const saved = localStorage.getItem(ROOM_STATE_PREFIX + roomCode.toUpperCase());
    if (!saved) return null;
    
    let jsonString = decompressFromUTF16(saved);
    if (!jsonString || !jsonString.startsWith('{')) {
      // Try as raw JSON (legacy)
      if (saved.startsWith('{')) {
        jsonString = saved;
      } else {
        return null;
      }
    }
    
    const parsed = JSON.parse(jsonString);
    if (parsed.grid && parsed.gridSize && parsed.stats) {
      return parsed as GameState;
    }
  } catch (e) {
    console.error('Failed to load room state:', e);
  }
  return null;
}

// Check if a saved state exists for a room
export function hasRoomState(roomCode: string): boolean {
  if (typeof window === 'undefined' || !roomCode) return false;
  return localStorage.getItem(ROOM_STATE_PREFIX + roomCode.toUpperCase()) !== null;
}

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
  
  // Batching for placements - use refs to avoid stale closures
  const placementBufferRef = useRef<Array<{ x: number; y: number; tool: Tool }>>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const multiplayerRef = useRef(multiplayer);
  
  // Keep multiplayer ref updated
  useEffect(() => {
    multiplayerRef.current = multiplayer;
  }, [multiplayer]);

  // Load initial state when joining a room (received from other players)
  // This can happen even if we already loaded from cache - network state takes priority
  const lastInitialStateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!multiplayer || !multiplayer.initialState) return;
    
    // Only load if this is a new state (prevent duplicate loads of same state)
    const stateKey = JSON.stringify(multiplayer.initialState.stats?.tick || 0);
    if (lastInitialStateRef.current === stateKey && initialStateLoadedRef.current) return;
    
    console.log('[useMultiplayerSync] Received initial state from network, loading...');
    
    // Use loadState to load the received game state
    const stateString = JSON.stringify(multiplayer.initialState);
    const success = game.loadState(stateString);
    
    if (success) {
      initialStateLoadedRef.current = true;
      lastInitialStateRef.current = stateKey;
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
        
      case 'placeBatch':
        // Apply multiple placements from a single message (e.g., road drag)
        const originalTool = game.state.selectedTool;
        for (const placement of action.placements) {
          game.setTool(placement.tool);
          game.placeAtTile(placement.x, placement.y, true); // isRemote = true
        }
        game.setTool(originalTool);
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
  
  // Flush batched placements - uses ref to avoid stale closure issues
  const flushPlacements = useCallback(() => {
    const mp = multiplayerRef.current;
    if (!mp || placementBufferRef.current.length === 0) return;
    
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    
    const placements = [...placementBufferRef.current];
    placementBufferRef.current = [];
    
    if (placements.length === 1) {
      // Single placement - send as regular place action
      const p = placements[0];
      mp.dispatchAction({ type: 'place', x: p.x, y: p.y, tool: p.tool });
    } else {
      // Multiple placements - send as batch
      mp.dispatchAction({ type: 'placeBatch', placements });
    }
  }, []);
  
  // Register callback to broadcast local placements (with batching)
  useEffect(() => {
    if (!multiplayer || multiplayer.connectionState !== 'connected') {
      game.setPlaceCallback(null);
      // Flush any pending placements
      if (placementBufferRef.current.length > 0) {
        placementBufferRef.current = [];
      }
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      return;
    }
    
    game.setPlaceCallback(({ x, y, tool }: { x: number; y: number; tool: Tool }) => {
      if (tool === 'bulldoze') {
        // Bulldoze is sent immediately (not batched)
        flushPlacements(); // Flush any pending placements first
        multiplayer.dispatchAction({ type: 'bulldoze', x, y });
      } else if (tool !== 'select') {
        // Add to batch
        placementBufferRef.current.push({ x, y, tool });
        
        // Force flush if batch is large
        if (placementBufferRef.current.length >= BATCH_MAX_SIZE) {
          flushPlacements();
        } else if (!flushTimeoutRef.current) {
          // Schedule flush after interval
          flushTimeoutRef.current = setTimeout(() => {
            flushTimeoutRef.current = null;
            flushPlacements();
          }, BATCH_FLUSH_INTERVAL);
        }
      }
    });
    
    return () => {
      // Flush remaining placements before disconnecting
      flushPlacements();
      game.setPlaceCallback(null);
    };
  }, [multiplayer, multiplayer?.connectionState, game, flushPlacements]);

  // Keep the shared game state updated (any player can share with new peers)
  // Throttled to avoid excessive updates - only updates every 2 seconds
  // Also saves the state locally so it can be restored if connection is lost
  const lastUpdateRef = useRef<number>(0);
  useEffect(() => {
    if (!multiplayer || multiplayer.connectionState !== 'connected') return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < 2000) return; // Throttle to 2 second intervals
    lastUpdateRef.current = now;
    
    // Update the game state that will be sent to new peers
    multiplayer.updateGameState(game.state);
    
    // Also save locally for this room so we can restore on reconnection
    if (multiplayer.roomCode) {
      saveRoomState(multiplayer.roomCode, game.state);
    }
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
  // Uses object parameter to prevent accidental coordinate swapping
  const broadcastPlace = useCallback(({ x, y, tool }: { x: number; y: number; tool: Tool }) => {
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
