'use client';

import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Tool, TOOL_INFO } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
const toolCategories = {
  'TOOLS': ['select', 'bulldoze', 'road', 'subway'] as Tool[],
  'ZONES': ['zone_residential', 'zone_commercial', 'zone_industrial', 'zone_dezone'] as Tool[],
  'SERVICES': ['police_station', 'fire_station', 'hospital', 'school', 'university'] as Tool[],
  'PARKS': ['park', 'park_large', 'tennis', 'playground_small', 'playground_large', 'community_garden', 'pond_park', 'park_gate', 'greenhouse_garden'] as Tool[],
  'SPORTS': ['basketball_courts', 'soccer_field_small', 'baseball_field_small', 'football_field', 'baseball_stadium', 'swimming_pool', 'skate_park', 'bleachers_field'] as Tool[],
  'RECREATION': ['mini_golf_course', 'go_kart_track', 'amphitheater', 'roller_coaster_small', 'campground', 'cabin_house', 'mountain_lodge', 'mountain_trailhead'] as Tool[],
  'WATERFRONT': ['marina_docks_small', 'pier_large'] as Tool[],
  'COMMUNITY': ['community_center', 'animal_pens_farm', 'office_building_small'] as Tool[],
  'UTILITIES': ['power_plant', 'water_tower', 'subway_station'] as Tool[],
  'SPECIAL': ['stadium', 'museum', 'airport', 'space_program', 'city_hall', 'amusement_park'] as Tool[],
};

interface MobileToolbarProps {
  onOpenPanel: (panel: 'budget' | 'statistics' | 'advisors' | 'achievements' | 'settings') => void;
}

export function MobileToolbar({ onOpenPanel }: MobileToolbarProps) {
  const { state, setTool } = useGame();
  const { selectedTool, stats } = state;
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const handleCategoryClick = (category: string) => {
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category);
    }
  };

  const handleToolSelect = (tool: Tool, closeMenu: boolean = false) => {
    // If the tool is already selected and it's not 'select', toggle back to select
    if (selectedTool === tool && tool !== 'select') {
      setTool('select');
    } else {
      setTool(tool);
    }
    setExpandedCategory(null);
    if (closeMenu) {
      setShowMenu(false);
    }
  };

  return (
    <>
      {/* Bottom Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <Card className="rounded-none border-x-0 border-b-0 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center justify-around px-2 py-2 gap-1">
            {/* Quick access tools */}
            <Button
              variant={selectedTool === 'select' ? 'default' : 'ghost'}
              className="h-11 flex-1 min-w-[70px] px-2 text-xs font-medium"
              onClick={() => handleToolSelect('select')}
            >
              {TOOL_INFO.select.name}
            </Button>

            <Button
              variant={selectedTool === 'bulldoze' ? 'default' : 'ghost'}
              className="h-11 flex-1 min-w-[70px] px-2 text-xs font-medium text-red-500"
              onClick={() => handleToolSelect('bulldoze')}
            >
              {TOOL_INFO.bulldoze.name}
            </Button>

            <Button
              variant={selectedTool === 'road' ? 'default' : 'ghost'}
              className="h-11 flex-1 min-w-[70px] px-2 text-xs font-medium"
              onClick={() => handleToolSelect('road')}
            >
              {TOOL_INFO.road.name}
            </Button>

            {/* Zone buttons */}
            <Button
              variant={selectedTool === 'zone_residential' ? 'default' : 'ghost'}
              className="h-11 flex-1 min-w-[70px] px-2 text-xs font-medium"
              onClick={() => handleToolSelect('zone_residential')}
            >
              {TOOL_INFO.zone_residential.name}
            </Button>

            <Button
              variant={selectedTool === 'zone_commercial' ? 'default' : 'ghost'}
              className="h-11 flex-1 min-w-[70px] px-2 text-xs font-medium"
              onClick={() => handleToolSelect('zone_commercial')}
            >
              {TOOL_INFO.zone_commercial.name}
            </Button>

            <Button
              variant={selectedTool === 'zone_industrial' ? 'default' : 'ghost'}
              className="h-11 flex-1 min-w-[70px] px-2 text-xs font-medium"
              onClick={() => handleToolSelect('zone_industrial')}
            >
              {TOOL_INFO.zone_industrial.name}
            </Button>

            {/* More tools menu button */}
            <Button
              variant={showMenu ? 'default' : 'secondary'}
              className="h-11 flex-1 min-w-[70px] px-2 text-xs font-semibold uppercase"
              onClick={() => setShowMenu(!showMenu)}
            >
              {showMenu ? 'Close' : 'Menu'}
            </Button>
          </div>

          {/* Selected tool info */}
          {selectedTool && TOOL_INFO[selectedTool] && (
            <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-secondary/30 text-xs">
              <span className="text-foreground font-medium">
                {TOOL_INFO[selectedTool].name}
              </span>
              {TOOL_INFO[selectedTool].cost > 0 && (
                <span className={`font-mono ${stats.money >= TOOL_INFO[selectedTool].cost ? 'text-green-400' : 'text-red-400'}`}>
                  ${TOOL_INFO[selectedTool].cost}
                </span>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Expanded Tool Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
          <Card
            className="absolute bottom-20 left-2 right-2 max-h-[70vh] overflow-hidden rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-sm">Build Menu</span>
              <span className="text-muted-foreground text-xs font-mono">${stats.money.toLocaleString()}</span>
            </div>

            <ScrollArea className="h-[50vh]">
              <div className="p-2 space-y-1">
                {/* Category buttons */}
                {Object.entries(toolCategories).map(([category, tools]) => (
                  <div key={category}>
                    <Button
                      variant={expandedCategory === category ? 'secondary' : 'ghost'}
                      className="w-full justify-between h-12 px-4"
                      onClick={() => handleCategoryClick(category)}
                    >
                      <span className="font-medium">{category}</span>
                      <span className="text-xs text-muted-foreground">
                        {expandedCategory === category ? 'Hide' : 'Show'}
                      </span>
                    </Button>

                    {/* Expanded tools */}
                    {expandedCategory === category && (
                      <div className="pl-4 py-1 space-y-0.5">
                        {tools.map((tool) => {
                          const info = TOOL_INFO[tool];
                          if (!info) return null;
                          const canAfford = stats.money >= info.cost;

                          return (
                            <Button
                              key={tool}
                              variant={selectedTool === tool ? 'default' : 'ghost'}
                              className="w-full justify-between h-11 px-4"
                              disabled={!canAfford && info.cost > 0}
                              onClick={() => handleToolSelect(tool, true)}
                            >
                              <span className="text-left">{info.name}</span>
                              {info.cost > 0 && (
                                <span className={`text-xs font-mono ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                                  ${info.cost}
                                </span>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {/* Panels section */}
                <div className="pt-2 mt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider px-3 py-2">
                    City Management
                  </div>
                  <div className="space-y-1 px-2">
                    <Button
                      variant="ghost"
                      className="h-11 w-full justify-between px-4 text-sm"
                      onClick={() => { onOpenPanel('budget'); setShowMenu(false); }}
                    >
                      <span>Budget</span>
                      <span className="text-xs text-muted-foreground">Open</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-11 w-full justify-between px-4 text-sm"
                      onClick={() => { onOpenPanel('statistics'); setShowMenu(false); }}
                    >
                      <span>Statistics</span>
                      <span className="text-xs text-muted-foreground">Open</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-11 w-full justify-between px-4 text-sm"
                      onClick={() => { onOpenPanel('advisors'); setShowMenu(false); }}
                    >
                      <span>Advisors</span>
                      <span className="text-xs text-muted-foreground">Open</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-11 w-full justify-between px-4 text-sm"
                      onClick={() => { onOpenPanel('achievements'); setShowMenu(false); }}
                    >
                      <span>Achievements</span>
                      <span className="text-xs text-muted-foreground">Open</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-11 w-full justify-between px-4 text-sm"
                      onClick={() => { onOpenPanel('settings'); setShowMenu(false); }}
                    >
                      <span>Settings</span>
                      <span className="text-xs text-muted-foreground">Open</span>
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </Card>
        </div>
      )}
    </>
  );
}

export default MobileToolbar;
