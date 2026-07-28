import { useState, useEffect } from 'react';
import { GameState } from '../game/gameState';
import { World } from '../game/world';
import { BuildingType, BUILDING_COSTS, Phase } from '../game/types';

interface GameUIProps {
  game: GameState;
  world: World;
  onSelectBuilding: (type: BuildingType | null) => void;
}

const BUILDING_ICONS: Record<BuildingType, string> = {
  [BuildingType.Base]: '🏰',
  [BuildingType.Farm]: '🌾',
  [BuildingType.LumberMill]: '🪓',
  [BuildingType.Quarry]: '⛏️',
  [BuildingType.Wall]: '🧱',
  [BuildingType.Tower]: '🗼',
  [BuildingType.Lighthouse]: '🏮',
};

const BUILDABLE_TYPES = [
  BuildingType.Farm,
  BuildingType.LumberMill,
  BuildingType.Quarry,
  BuildingType.Wall,
  BuildingType.Tower,
  BuildingType.Lighthouse,
];

export function GameUI({ game, world, onSelectBuilding }: GameUIProps) {
  const [, forceUpdate] = useState(0);

  // Force re-render on each frame to reflect game state changes
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 100);
    return () => clearInterval(interval);
  }, []);

  const phaseColors: Record<Phase, string> = {
    [Phase.Day]: '#FFD700',
    [Phase.Sunset]: '#FF8C00',
    [Phase.Night]: '#8B5CF6',
    [Phase.Dawn]: '#F97316',
  };

  const phaseIcons: Record<Phase, string> = {
    [Phase.Day]: '☀️',
    [Phase.Sunset]: '🌅',
    [Phase.Night]: '🌙',
    [Phase.Dawn]: '🌄',
  };

  const progress = game.phaseTimer / game.getPhaseDuration();
  const selectedIsland = game.selectedIsland !== null ? world.islands[game.selectedIsland] : null;
  const islandBuildings = selectedIsland
    ? game.buildings.filter(b => b.islandId === selectedIsland.id)
    : [];

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.95) 0%, rgba(10, 10, 20, 0.8) 100%)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 32,
        pointerEvents: 'auto',
        borderBottom: '1px solid rgba(100, 120, 180, 0.3)',
        backdropFilter: 'blur(10px)',
      }}>
        {/* Night counter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: phaseColors[game.phase],
          fontSize: 20,
          fontWeight: 600,
          textShadow: `0 0 20px ${phaseColors[game.phase]}40`,
        }}>
          <span style={{ fontSize: 24 }}>{phaseIcons[game.phase]}</span>
          <span>Night {game.nightNumber}</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 400 }}>• {game.phase}</span>
        </div>

        <div style={{ width: 1, height: 36, background: 'rgba(100, 120, 180, 0.3)' }} />

        {/* Resources */}
        {[
          { icon: '🪵', value: game.resources.wood, label: 'Wood', color: '#B8845C' },
          { icon: '🪨', value: game.resources.stone, label: 'Stone', color: '#9CA3AF' },
          { icon: '🌾', value: game.resources.food, label: 'Food', color: '#86EFAC' },
          { icon: '✨', value: game.resources.nightEssence, label: 'Essence', color: '#C084FC' },
        ].map(r => (
          <div key={r.label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: r.color,
            fontSize: 16,
            fontWeight: 500,
          }}>
            <span style={{ fontSize: 20 }}>{r.icon}</span>
            <span style={{ color: 'white', fontWeight: 600, minWidth: 32, textAlign: 'right' }}>{r.value}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{r.label}</span>
          </div>
        ))}
      </div>

      {/* Phase progress bar */}
      <div style={{
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        height: 4,
        background: 'rgba(30, 30, 50, 0.9)',
      }}>
        <div style={{
          height: '100%',
          width: `${(1 - progress) * 100}%`,
          background: `linear-gradient(90deg, ${phaseColors[game.phase]}, ${phaseColors[game.phase]}cc)`,
          boxShadow: `0 0 12px ${phaseColors[game.phase]}80`,
          transition: 'width 0.1s linear',
        }} />
      </div>

      {/* Island panel */}
      {selectedIsland && (
        <div style={{
          position: 'absolute',
          top: 80,
          right: 20,
          width: 280,
          background: 'rgba(15, 15, 25, 0.95)',
          borderRadius: 12,
          padding: 20,
          pointerEvents: 'auto',
          border: '1px solid rgba(100, 120, 180, 0.3)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid rgba(100, 120, 180, 0.2)',
          }}>
            <span style={{ fontSize: 24 }}>🏝️</span>
            <div>
              <div style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>Island #{selectedIsland.id}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{selectedIsland.biome}</div>
            </div>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 12 }}>
            📦 {islandBuildings.length} building{islandBuildings.length !== 1 ? 's' : ''}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {islandBuildings.map(b => {
              const hpRatio = b.hp / b.maxHp;
              const hpColor = hpRatio > 0.7 ? '#4ADE80' : hpRatio > 0.3 ? '#FBBF24' : '#EF4444';
              return (
                <div key={b.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  fontSize: 13,
                }}>
                  <span>{BUILDING_ICONS[b.type]}</span>
                  <span style={{ color: 'white', flex: 1 }}>{b.type}</span>
                  {b.hp < b.maxHp && (
                    <span style={{ color: hpColor, fontSize: 12, fontFamily: 'monospace' }}>
                      {Math.floor(b.hp)}/{b.maxHp}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Build menu */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 12,
        padding: '16px 24px',
        background: 'rgba(10, 10, 20, 0.95)',
        borderRadius: 16,
        pointerEvents: 'auto',
        border: '1px solid rgba(100, 120, 180, 0.3)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}>
        {BUILDABLE_TYPES.map((type, i) => {
          const cost = BUILDING_COSTS[type];
          const canAfford = game.resources.wood >= cost.wood && game.resources.stone >= cost.stone;
          const isSelected = game.placingBuilding === type;

          return (
            <button
              key={type}
              onClick={() => onSelectBuilding(isSelected ? null : type)}
              style={{
                width: 110,
                padding: '12px 14px',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.1))'
                  : canAfford
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(239, 68, 68, 0.1)',
                border: `2px solid ${isSelected ? '#22C55E' : canAfford ? 'rgba(100, 120, 180, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`,
                borderRadius: 12,
                cursor: canAfford ? 'pointer' : 'not-allowed',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                transition: 'all 0.2s',
                opacity: canAfford ? 1 : 0.6,
                boxShadow: isSelected ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ fontSize: 22 }}>{BUILDING_ICONS[type]}</span>
                <span style={{
                  color: canAfford ? 'white' : 'rgba(255,255,255,0.4)',
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: 'left',
                }}>
                  {type}
                </span>
              </div>
              <div style={{
                display: 'flex',
                gap: 8,
                fontSize: 11,
                color: canAfford ? 'rgba(255,255,255,0.6)' : 'rgba(239, 68, 68, 0.8)',
              }}>
                <span>🪵{cost.wood}</span>
                <span>🪨{cost.stone}</span>
              </div>
              <div style={{
                position: 'absolute',
                top: 4,
                right: 8,
                fontSize: 10,
                color: 'rgba(255,255,255,0.3)',
                fontFamily: 'monospace',
              }}>
                [{i + 1}]
              </div>
            </button>
          );
        })}
      </div>

      {/* Placing hint */}
      {game.placingBuilding && (
        <div style={{
          position: 'absolute',
          bottom: 160,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          background: 'rgba(34, 197, 94, 0.2)',
          border: '2px solid rgba(34, 197, 94, 0.6)',
          borderRadius: 8,
          color: '#86EFAC',
          fontSize: 14,
          fontWeight: 500,
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 18 }}>{BUILDING_ICONS[game.placingBuilding]}</span>
          <span>Placing {game.placingBuilding}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>• LMB Place • RMB Cancel</span>
        </div>
      )}

      {/* Message */}
      {game.message && (
        <div style={{
          position: 'absolute',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          background: 'rgba(20, 20, 35, 0.95)',
          border: '2px solid rgba(255, 200, 80, 0.6)',
          borderRadius: 10,
          color: '#FCD34D',
          fontSize: 18,
          fontWeight: 600,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 0 30px rgba(255, 200, 80, 0.2)',
          opacity: Math.min(1, game.message.timer),
          transition: 'opacity 0.3s',
        }}>
          {game.message.text}
        </div>
      )}

      {/* Dawn report */}
      {game.dawnReport && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 450,
          background: 'rgba(15, 15, 30, 0.98)',
          borderRadius: 16,
          border: '3px solid rgba(255, 200, 80, 0.7)',
          pointerEvents: 'auto',
          cursor: 'pointer',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 200, 80, 0.2)',
          opacity: Math.min(1, game.dawnReport.timer),
          overflow: 'hidden',
        }}
          onClick={() => { game.dawnReport = null; }}
        >
          <div style={{
            padding: '24px 32px',
            background: 'linear-gradient(180deg, rgba(255, 200, 80, 0.1), transparent)',
            borderBottom: '1px solid rgba(255, 200, 80, 0.2)',
          }}>
            <div style={{
              color: '#FCD34D',
              fontSize: 28,
              fontWeight: 700,
              textAlign: 'center',
              textShadow: '0 0 20px rgba(255, 200, 80, 0.5)',
            }}>
              🌅 Night {game.dawnReport.nightNumber} Survived!
            </div>
          </div>
          <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Enemies killed', value: game.dawnReport.enemiesKilled, icon: '⚔️', color: 'white' },
              { label: 'Essence gained', value: `+${game.dawnReport.nightEssenceGained}`, icon: '✨', color: '#C084FC' },
            ].map(stat => (
              <div key={stat.label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 10,
              }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{stat.icon}</span> {stat.label}
                </span>
                <span style={{ color: stat.color, fontSize: 20, fontWeight: 700, fontFamily: 'monospace' }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
          <div style={{
            textAlign: 'center',
            padding: '12px',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 13,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            Click to continue
          </div>
        </div>
      )}

      {/* Game over */}
      {game.gameOver && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          background: 'rgba(30, 10, 10, 0.98)',
          borderRadius: 16,
          border: '3px solid #EF4444',
          pointerEvents: 'auto',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(239, 68, 68, 0.3)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '32px',
            background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.2), transparent)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          }}>
            <div style={{
              color: '#EF4444',
              fontSize: 36,
              fontWeight: 700,
              textAlign: 'center',
              textShadow: '0 0 30px rgba(239, 68, 68, 0.5)',
            }}>
              💀 GAME OVER
            </div>
          </div>
          <div style={{ padding: '24px 32px', textAlign: 'center' }}>
            <div style={{ color: 'white', fontSize: 18, marginBottom: 8 }}>
              Survived <span style={{ color: '#FCD34D', fontWeight: 700 }}>{game.nightNumber}</span> nights
            </div>
            <div style={{ color: 'white', fontSize: 18 }}>
              Killed <span style={{ color: '#F87171', fontWeight: 700 }}>{game.totalEnemiesKilled}</span> enemies
            </div>
          </div>
          <div style={{
            textAlign: 'center',
            padding: '16px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 16,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            Press <kbd style={{
              padding: '4px 12px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.2)',
            }}>R</kbd> to restart
          </div>
        </div>
      )}

      {/* Help overlay */}
      {game.showHelp && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 580,
          maxHeight: '80vh',
          background: 'rgba(15, 15, 30, 0.98)',
          borderRadius: 16,
          border: '2px solid rgba(100, 120, 180, 0.5)',
          pointerEvents: 'auto',
          cursor: 'pointer',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          overflow: 'auto',
        }}
          onClick={() => { game.showHelp = false; }}
        >
          <div style={{
            padding: '24px 32px',
            background: 'linear-gradient(180deg, rgba(100, 120, 200, 0.1), transparent)',
            borderBottom: '1px solid rgba(100, 120, 180, 0.2)',
          }}>
            <div style={{
              color: '#FCD34D',
              fontSize: 28,
              fontWeight: 700,
              textAlign: 'center',
            }}>
              🏝️ FUGO: ARCHIPELAGO
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 14,
              textAlign: 'center',
              marginTop: 4,
            }}>
              Build by day. Survive by night.
            </div>
          </div>
          <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { key: 'WASD / Arrows', action: 'Pan camera', icon: '🎮' },
              { key: 'Scroll wheel', action: 'Zoom in/out', icon: '🔍' },
              { key: 'Right-drag', action: 'Pan camera', icon: '🖱️' },
              { key: 'Left-click', action: 'Select island / Place building', icon: '🏝️' },
              { key: '1-6', action: 'Quick-select building', icon: '⌨️' },
              { key: 'Right-click', action: 'Cancel placement', icon: '❌' },
              { key: 'H', action: 'Toggle help', icon: '❓' },
            ].map(({ key, action, icon }) => (
              <div key={key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 0',
              }}>
                <span style={{ fontSize: 18, width: 28 }}>{icon}</span>
                <span style={{
                  color: '#60A5FA',
                  fontSize: 14,
                  fontWeight: 600,
                  minWidth: 140,
                  fontFamily: 'monospace',
                  padding: '4px 8px',
                  background: 'rgba(96, 165, 250, 0.1)',
                  borderRadius: 4,
                  display: 'inline-block',
                }}>
                  {key}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>{action}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'rgba(100, 120, 180, 0.2)', margin: '8px 0' }} />
            {[
              { phase: '☀️ DAY', desc: 'Build, explore, prepare defenses', color: '#FCD34D' },
              { phase: '🌙 NIGHT', desc: 'Defend from creatures of the deep', color: '#A78BFA' },
              { phase: '🌅 DAWN', desc: 'Assess damage, collect night essence', color: '#FB923C' },
            ].map(({ phase, desc, color }) => (
              <div key={phase} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 0',
              }}>
                <span style={{ color, fontSize: 16, fontWeight: 600, minWidth: 140 }}>{phase}</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>{desc}</span>
              </div>
            ))}
          </div>
          <div style={{
            textAlign: 'center',
            padding: '16px',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 13,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            Click anywhere or press H to close
          </div>
        </div>
      )}

      {/* Help button */}
      <button
        onClick={() => { game.showHelp = !game.showHelp; }}
        style={{
          position: 'absolute',
          top: 72,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(15, 15, 25, 0.95)',
          border: '1px solid rgba(100, 120, 180, 0.4)',
          color: 'white',
          fontSize: 18,
          fontWeight: 700,
          cursor: 'pointer',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(10px)',
        }}
      >
        ?
      </button>
    </div>
  );
}
