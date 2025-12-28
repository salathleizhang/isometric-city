'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMultiplayer } from '@/context/MultiplayerContext';
import { GameState } from '@/types/game';
import { createInitialGameState, DEFAULT_GRID_SIZE } from '@/lib/simulation';
import { loadRoomState, hasRoomState } from '@/hooks/useMultiplayerSync';
import { Copy, Check, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

interface CoopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartGame: (isHost: boolean, initialState?: GameState) => void;
  currentGameState?: GameState;
  pendingRoomCode?: string | null;
}

type Mode = 'select' | 'create' | 'join';

export function CoopModal({
  open,
  onOpenChange,
  onStartGame,
  currentGameState,
  pendingRoomCode,
}: CoopModalProps) {
  const [mode, setMode] = useState<Mode>('select');
  const [cityName, setCityName] = useState('My Co-op City');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);
  const [waitingForState, setWaitingForState] = useState(false);
  
  const {
    connectionState,
    roomCode,
    players,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    initialState,
  } = useMultiplayer();

  // Auto-join when there's a pending room code - go directly into game
  useEffect(() => {
    if (open && pendingRoomCode && !autoJoinAttempted) {
      setAutoJoinAttempted(true);
      setIsLoading(true);
      
      // Join immediately without showing modal
      joinRoom(pendingRoomCode)
        .then(() => {
          window.history.replaceState({}, '', `/?room=${pendingRoomCode.toUpperCase()}`);
          setIsLoading(false);
          setWaitingForState(true);
        })
        .catch((err) => {
          console.error('Failed to auto-join room:', err);
          setIsLoading(false);
          
          // Check if we have a saved state for this room
          const savedState = loadRoomState(pendingRoomCode);
          if (savedState) {
            console.log('[CoopModal] Found saved state for room, loading with background sync...');
            setStartedWithCache(true); // Keep connection alive for background sync
            onStartGame(false, savedState);
            onOpenChange(false);
          } else {
            // Fall back to showing join modal
            setJoinCode(pendingRoomCode);
            setMode('join');
          }
        });
    }
  }, [open, pendingRoomCode, autoJoinAttempted, joinRoom, onStartGame, onOpenChange]);

  // Track if we started with cached state (to keep connection alive)
  const [startedWithCache, setStartedWithCache] = useState(false);
  
  // Reset state when modal closes - cleanup any pending connection
  useEffect(() => {
    if (!open) {
      // Only clean up connection if we were mid-join and NOT started with cached state
      // If we started with cache, keep connection alive for background sync
      if ((waitingForState || (autoJoinAttempted && !initialState)) && !startedWithCache) {
        leaveRoom();
      }
      setMode('select');
      setIsLoading(false);
      setCopied(false);
      setAutoJoinAttempted(false);
      setWaitingForState(false);
      setStartedWithCache(false);
    }
  }, [open, waitingForState, autoJoinAttempted, initialState, leaveRoom, startedWithCache]);

  const handleCreateRoom = async () => {
    if (!cityName.trim()) return;
    
    setIsLoading(true);
    try {
      // Use the current game state if provided, otherwise create a fresh city
      const stateToShare = currentGameState 
        ? { ...currentGameState, cityName } 
        : createInitialGameState(DEFAULT_GRID_SIZE, cityName);
      
      const code = await createRoom(cityName, stateToShare);
      // Update URL to show room code
      window.history.replaceState({}, '', `/?room=${code}`);
      
      // Start the game immediately with the state
      onStartGame(true, stateToShare);
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return;
    if (joinCode.length !== 5) return;
    
    setIsLoading(true);
    try {
      await joinRoom(joinCode);
      // Update URL to show room code
      window.history.replaceState({}, '', `/?room=${joinCode.toUpperCase()}`);
      // Now wait for state to be received
      setIsLoading(false);
      setWaitingForState(true);
    } catch (err) {
      console.error('Failed to join room:', err);
      setIsLoading(false);
      
      // Check if we have a saved state for this room
      const savedState = loadRoomState(joinCode);
      if (savedState) {
        console.log('[CoopModal] Failed to join but found saved state, loading with background sync...');
        window.history.replaceState({}, '', `/?room=${joinCode.toUpperCase()}`);
        setStartedWithCache(true); // Keep connection alive for background sync
        onStartGame(false, savedState);
        onOpenChange(false);
      }
    }
  };
  
  // When we receive the initial state, start the game
  useEffect(() => {
    if (waitingForState && initialState) {
      setWaitingForState(false);
      onStartGame(false, initialState);
      onOpenChange(false);
    }
  }, [waitingForState, initialState, onStartGame, onOpenChange]);
  
  // Timeout after 15 seconds - if no state received, try to load from saved room state
  useEffect(() => {
    if (!waitingForState) return;
    
    const roomToCheck = pendingRoomCode || joinCode;
    
    const timeout = setTimeout(() => {
      if (waitingForState && !initialState) {
        console.log('[CoopModal] Timeout waiting for state, checking for saved room state...');
        
        // Check if we have a saved state for this room
        const savedState = roomToCheck ? loadRoomState(roomToCheck) : null;
        
        if (savedState) {
          console.log('[CoopModal] Found saved state for room, loading with background sync...');
          setWaitingForState(false);
          setStartedWithCache(true); // Keep connection alive for background sync
          // Start game with saved state (not as host since we're trying to join)
          onStartGame(false, savedState);
          onOpenChange(false);
        } else {
          console.error('[CoopModal] No saved state found, timeout');
          setWaitingForState(false);
          leaveRoom();
        }
      }
    }, 15000);
    
    return () => clearTimeout(timeout);
  }, [waitingForState, initialState, leaveRoom, pendingRoomCode, joinCode, onStartGame, onOpenChange]);

  const handleCopyLink = () => {
    if (!roomCode) return;
    
    const url = `${window.location.origin}/?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = () => {
    if (roomCode) {
      leaveRoom();
    }
    setMode('select');
  };

  // Handle back from auto-join to go to select mode
  const handleBackFromAutoJoin = () => {
    // Keep autoJoinAttempted true to prevent re-triggering auto-join
    // (pendingRoomCode prop is still set from parent)
    setWaitingForState(false);
    setIsLoading(false);
    leaveRoom();
    // Clear the URL parameter
    window.history.replaceState({}, '', '/');
    setMode('select');
  };

  // If auto-joining, show loading state
  if (autoJoinAttempted && (isLoading || waitingForState)) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white" aria-describedby={undefined}>
          <VisuallyHidden.Root>
            <DialogTitle>Joining Co-op City</DialogTitle>
          </VisuallyHidden.Root>
          {/* Back button in top left */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleBackFromAutoJoin();
            }}
            className="absolute left-4 top-4 z-50 text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
            <p className="text-slate-300">Joining city...</p>
            <p className="text-slate-500 text-sm mt-1">Waiting for game state</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Selection screen
  if (mode === 'select') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light text-white">
              Co-op Multiplayer
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Build a city together with friends in real-time
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => setMode('create')}
              className="w-full py-6 text-lg font-light bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-none"
            >
              Create City
            </Button>
            <Button
              onClick={() => setMode('join')}
              variant="outline"
              className="w-full py-6 text-lg font-light bg-transparent hover:bg-white/10 text-white/70 hover:text-white border border-white/15 rounded-none"
            >
              Join City
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Create room screen
  if (mode === 'create') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light text-white">
            Create Co-op City
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {roomCode
              ? 'Share the invite code with friends'
              : 'Set up your co-op city'
            }
            </DialogDescription>
          </DialogHeader>

          {!roomCode ? (
            <div className="flex flex-col gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="cityName" className="text-slate-300">
                  City Name
                </Label>
                <Input
                  id="cityName"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="My Co-op City"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 bg-transparent hover:bg-white/10 text-white/70 border-white/20 rounded-none"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  disabled={isLoading || !cityName.trim()}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-none"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create City'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 mt-4">
              {/* Invite Code Display */}
              <div className="bg-slate-800 rounded-lg p-6 text-center">
                <p className="text-slate-400 text-sm mb-2">Invite Code</p>
                <p className="text-4xl font-mono font-bold tracking-widest text-white">
                  {roomCode}
                </p>
              </div>

              {/* Copy Link Button */}
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="w-full bg-transparent hover:bg-white/10 text-white border-white/20 rounded-none"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Invite Link
                  </>
                )}
              </Button>

              {/* Connected Players */}
              {players.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-2">{players.length} player{players.length !== 1 ? 's' : ''}</p>
                  <div className="space-y-1">
                    {players.map((player) => (
                      <div key={player.id} className="text-sm text-white">
                        {player.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Continue button */}
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full mt-2 bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 rounded-md"
              >
                Continue Playing
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Join room screen
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light text-white">
            Join Co-op City
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Enter the 5-character invite code to join
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="joinCode" className="text-slate-300">
              Invite Code
            </Label>
            <Input
              id="joinCode"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
              placeholder="ABCDE"
              maxLength={5}
              className="bg-slate-800 border-slate-600 text-white text-center text-2xl font-mono tracking-widest placeholder:text-slate-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Show if we have a saved state for this room */}
          {joinCode.length === 5 && hasRoomState(joinCode) && !waitingForState && (
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-slate-300 text-sm">💾 Previously visited city</p>
              <p className="text-slate-500 text-xs mt-1">Will load saved state if connection fails</p>
            </div>
          )}

          {/* Connection Status when joining */}
          {connectionState === 'connecting' && !waitingForState && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </div>
          )}
          
          {/* Waiting for state */}
          {waitingForState && (
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
              <p className="text-slate-300 text-sm">Connecting...</p>
              <p className="text-slate-500 text-xs mt-1">Waiting for game state</p>
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex-1 bg-transparent hover:bg-white/10 text-white/70 border-white/20 rounded-none"
            >
              Back
            </Button>
            <Button
              onClick={handleJoinRoom}
              disabled={isLoading || joinCode.length !== 5}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join City'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
