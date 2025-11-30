'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GameProvider, useGame } from '@/context/GameContext';
import Game from '@/components/Game';
import Image from 'next/image';
import { useMobile } from '@/hooks/useMobile';
import { getStateFromUrl, decompressGameState } from '@/lib/shareState';

const STORAGE_KEY = 'isocity-game-state';

// Building assets to display
const BUILDINGS = [
  'residential.png',
  'commercial.png',
  'industrial.png',
  'park.png',
  'school.png',
  'hospital.png',
  'police_station.png',
  'fire_station.png',
  'powerplant.png',
  'watertower.png',
  'university.png',
  'stadium.png',
  'airport.png',
  'trees.png',
];

// Fewer buildings for mobile
const MOBILE_BUILDINGS = [
  'residential.png',
  'commercial.png',
  'industrial.png',
  'park.png',
  'hospital.png',
  'powerplant.png',
];

// Check if there's a saved game in localStorage
function hasSavedGame(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.grid && parsed.gridSize && parsed.stats;
    }
  } catch (e) {
    return false;
  }
  return false;
}

// Get current city name from localStorage
function getCurrentCityName(): string {
  if (typeof window === 'undefined') return 'your city';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.cityName || 'your city';
    }
  } catch (e) {
    return 'your city';
  }
  return 'your city';
}

export default function HomePage() {
  const [showGame, setShowGame] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { isMobileDevice, isSmallScreen, orientation } = useMobile();
  const isMobile = isMobileDevice || isSmallScreen;

  // Check for saved game after mount (client-side only)
  useEffect(() => {
    const checkSavedGame = () => {
      setIsChecking(false);
      if (hasSavedGame()) {
        setShowGame(true);
      }
    };
    // Use requestAnimationFrame to avoid synchronous setState in effect
    requestAnimationFrame(checkSavedGame);
  }, []);

  if (isChecking) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </main>
    );
  }

  if (showGame) {
    return (
      <GameProvider>
        <main className="h-screen w-screen overflow-hidden">
          <Game />
        </main>
      </GameProvider>
    );
  }

  // Mobile landing page
  if (isMobile) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 safe-area-top safe-area-bottom">
        {/* Title */}
        <h1 className="text-5xl sm:text-6xl font-light tracking-wider text-white/90 mb-4 animate-fadeIn">
          IsoCity
        </h1>
        
        {/* Tagline */}
        <p className="text-white/50 text-sm mb-8 text-center">
          Build your dream city on mobile
        </p>
        
        {/* Building preview - compact grid for mobile */}
        <div className="grid grid-cols-3 gap-2 mb-8 max-w-xs">
          {MOBILE_BUILDINGS.map((building, index) => (
            <div 
              key={building}
              className="aspect-square bg-white/5 border border-white/10 p-2 rounded-lg"
              style={{
                animation: 'fadeIn 0.4s ease-out forwards',
                animationDelay: `${index * 80}ms`,
                opacity: 0,
              }}
            >
              <div className="w-full h-full relative opacity-80">
                <Image
                  src={`/assets/buildings/${building}`}
                  alt={building.replace('.png', '').replace('_', ' ')}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Start Button */}
        <Button 
          onClick={() => setShowGame(true)}
          className="w-full max-w-xs px-8 py-6 text-xl font-medium tracking-wide bg-primary/90 hover:bg-primary text-white border-0 rounded-xl transition-all duration-300 shadow-lg shadow-primary/20"
        >
          Play Now
        </Button>
        
        {/* Orientation hint for landscape */}
        {orientation === 'portrait' && (
          <p className="text-white/30 text-xs mt-6 text-center">
            Tip: Rotate for a wider view
          </p>
        )}
        
        {/* Touch hint */}
        <div className="text-white/40 text-xs mt-4 text-center flex flex-col gap-1">
          <span>Tap to place • Pinch to zoom</span>
          <span>Drag to pan</span>
        </div>
      </main>
    );
  }

  // Desktop landing page
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-8">
      <div className="max-w-7xl w-full grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Left - Title and Start Button */}
        <div className="flex flex-col items-center lg:items-start justify-center space-y-12">
          <h1 className="text-8xl font-light tracking-wider text-white/90">
            IsoCity
          </h1>
          <Button 
            onClick={() => setShowGame(true)}
            className="px-12 py-8 text-2xl font-light tracking-wide bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-none transition-all duration-300"
          >
            Start
          </Button>
        </div>

        {/* Right - Building Gallery */}
        <div className="grid grid-cols-4 gap-4">
          {BUILDINGS.map((building, index) => (
            <div 
              key={building}
              className="aspect-square bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition-all duration-300 group"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="w-full h-full relative opacity-70 group-hover:opacity-100 transition-opacity">
                <Image
                  src={`/assets/buildings/${building}`}
                  alt={building.replace('.png', '').replace('_', ' ')}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
