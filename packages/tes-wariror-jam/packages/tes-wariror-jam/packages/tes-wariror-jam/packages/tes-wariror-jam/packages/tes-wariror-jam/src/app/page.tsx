'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Prevent localStorage access during SSR
const isBrowser = typeof window !== 'undefined';

type GameState = 'MENU' | 'RUNNING' | 'ENCOUNTER' | 'COMBAT' | 'VICTORY' | 'GAME_OVER';
type Direction = 'left' | 'right';
type Action = 'idle' | 'punch' | 'kick' | 'block' | 'jump' | 'hit';

interface Player {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  direction: Direction;
  action: Action;
  isBlocking: boolean;
  isJumping: boolean;
  velocityY: number;
}

interface Enemy {
  name: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  attack: number;
  color: string;
  direction: Direction;
  action: Action;
  lastAttackTime: number;
}

interface PowerUp {
  type: 'health' | 'attack' | 'defense' | 'speed';
  x: number;
  y: number;
  collected: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface SaveData {
  currentMonth: number;
  playerStats: {
    maxHealth: number;
    attack: number;
    defense: number;
    speed: number;
  };
}

const MONTHS = [
  { name: 'January', enemy: 'Procrastination', color: '#60a5fa', difficulty: 1 },
  { name: 'February', enemy: 'Self-Doubt', color: '#f472b6', difficulty: 1.2 },
  { name: 'March', enemy: 'Distraction', color: '#a78bfa', difficulty: 1.4 },
  { name: 'April', enemy: 'Laziness', color: '#34d399', difficulty: 1.6 },
  { name: 'May', enemy: 'Fear', color: '#fbbf24', difficulty: 1.8 },
  { name: 'June', enemy: 'Anxiety', color: '#fb923c', difficulty: 2 },
  { name: 'July', enemy: 'Burnout', color: '#ef4444', difficulty: 2.2 },
  { name: 'August', enemy: 'Temptation', color: '#ec4899', difficulty: 2.4 },
  { name: 'September', enemy: 'Stress', color: '#8b5cf6', difficulty: 2.6 },
  { name: 'October', enemy: 'Negativity', color: '#f97316', difficulty: 2.8 },
  { name: 'November', enemy: 'Exhaustion', color: '#6366f1', difficulty: 3 },
  { name: 'December', enemy: 'Final Boss', color: '#dc2626', difficulty: 3.5 },
];

const GROUND_Y = 400;
const GRAVITY = 0.8;
const JUMP_FORCE = -15;

export default function ResolutionWarrior() {
  const [mounted, setMounted] = useState(false);
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [currentMonth, setCurrentMonth] = useState(0);
  const [player, setPlayer] = useState<Player>({
    x: 200,
    y: GROUND_Y,
    health: 100,
    maxHealth: 100,
    attack: 10,
    defense: 5,
    speed: 5,
    direction: 'right',
    action: 'idle',
    isBlocking: false,
    isJumping: false,
    velocityY: 0,
  });
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [powerUp, setPowerUp] = useState<PowerUp | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [hasSave, setHasSave] = useState(false);

  const animationFrameRef = useRef<number>(0);
  const particleIdCounter = useRef(0);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resolutionWarriorSave');
      setHasSave(!!saved);
    }
  }, []);

  const saveGame = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const saveData: SaveData = {
      currentMonth,
      playerStats: {
        maxHealth: player.maxHealth,
        attack: player.attack,
        defense: player.defense,
        speed: player.speed,
      },
    };
    localStorage.setItem('resolutionWarriorSave', JSON.stringify(saveData));
    setHasSave(true);
  }, [currentMonth, player]);

  const loadGame = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('resolutionWarriorSave');
    if (saved) {
      const saveData: SaveData = JSON.parse(saved);
      setCurrentMonth(saveData.currentMonth);
      setPlayer(prev => ({
        ...prev,
        maxHealth: saveData.playerStats.maxHealth,
        health: saveData.playerStats.maxHealth,
        attack: saveData.playerStats.attack,
        defense: saveData.playerStats.defense,
        speed: saveData.playerStats.speed,
      }));
      setGameState('RUNNING');
    }
  }, []);

  const createParticles = useCallback((x: number, y: number, color: string, count: number = 8) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      newParticles.push({
        id: particleIdCounter.current++,
        x,
        y,
        vx: Math.cos(angle) * (2 + Math.random() * 3),
        vy: Math.sin(angle) * (2 + Math.random() * 3),
        life: 1,
        color,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const spawnEnemy = useCallback(() => {
    const month = MONTHS[currentMonth];
    const baseHealth = 50;
    const baseAttack = 8;
    
    setEnemy({
      name: month.enemy,
      x: 600,
      y: GROUND_Y,
      health: baseHealth * month.difficulty,
      maxHealth: baseHealth * month.difficulty,
      attack: baseAttack * month.difficulty,
      color: month.color,
      direction: 'left',
      action: 'idle',
      lastAttackTime: 0,
    });
    setGameState('ENCOUNTER');
  }, [currentMonth]);

  const playerAttack = useCallback((attackType: 'punch' | 'kick') => {
    if (!enemy || player.isBlocking || player.action !== 'idle') return;

    const damage = attackType === 'kick' ? player.attack * 1.5 : player.attack;
    const distance = Math.abs(player.x - enemy.x);

    if (distance < 100) {
      setPlayer(prev => ({ ...prev, action: attackType }));
      
      setTimeout(() => {
        setEnemy(prev => {
          if (!prev) return null;
          const newHealth = Math.max(0, prev.health - damage);
          createParticles(prev.x, prev.y - 50, prev.color);
          
          if (newHealth <= 0) {
            setTimeout(() => {
              if (currentMonth < MONTHS.length - 1) {
                const shouldSpawnPowerUp = Math.random() < 0.4;
                if (shouldSpawnPowerUp) {
                  const types: PowerUp['type'][] = ['health', 'attack', 'defense', 'speed'];
                  setPowerUp({
                    type: types[Math.floor(Math.random() * types.length)],
                    x: prev.x,
                    y: GROUND_Y - 30,
                    collected: false,
                  });
                }
                setGameState('VICTORY');
              } else {
                setGameState('VICTORY');
              }
            }, 500);
          }
          
          return { ...prev, health: newHealth, action: 'hit' };
        });
        
        setTimeout(() => {
          setPlayer(prev => ({ ...prev, action: 'idle' }));
          setEnemy(prev => prev ? { ...prev, action: 'idle' } : null);
        }, 300);
      }, 200);
    }
  }, [enemy, player, currentMonth, createParticles]);

  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set(prev).add(e.key.toLowerCase()));

      if (gameState === 'COMBAT') {
        if (e.key.toLowerCase() === 'z') {
          playerAttack('punch');
        } else if (e.key.toLowerCase() === 'x') {
          playerAttack('kick');
        } else if (e.key === ' ') {
          setPlayer(prev => ({ ...prev, isBlocking: true, action: 'block' }));
        } else if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') {
          setPlayer(prev => {
            if (!prev.isJumping) {
              return { ...prev, isJumping: true, velocityY: JUMP_FORCE, action: 'jump' };
            }
            return prev;
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(e.key.toLowerCase());
        return newKeys;
      });

      if (e.key === ' ') {
        setPlayer(prev => ({ ...prev, isBlocking: false, action: 'idle' }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mounted, gameState, playerAttack]);

  useEffect(() => {
    if (!mounted || gameState !== 'COMBAT' || !enemy) return;

    const gameLoop = () => {
      setPlayer(prev => {
        let newY = prev.y;
        let newVelocityY = prev.velocityY;
        let newIsJumping = prev.isJumping;
        let newAction = prev.action;

        if (prev.isJumping) {
          newVelocityY += GRAVITY;
          newY += newVelocityY;

          if (newY >= GROUND_Y) {
            newY = GROUND_Y;
            newVelocityY = 0;
            newIsJumping = false;
            newAction = 'idle';
          }
        }

        let newX = prev.x;
        if (keys.has('a') || keys.has('arrowleft')) newX -= prev.speed;
        if (keys.has('d') || keys.has('arrowright')) newX += prev.speed;
        newX = Math.max(50, Math.min(750, newX));

        const newDirection: Direction = enemy && newX < enemy.x ? 'right' : 'left';

        return {
          ...prev,
          x: newX,
          y: newY,
          velocityY: newVelocityY,
          isJumping: newIsJumping,
          action: newAction,
          direction: newDirection,
        };
      });

      setEnemy(prev => {
        if (!prev) return null;

        const now = Date.now();
        if (now - prev.lastAttackTime > 2000 && Math.abs(prev.x - player.x) < 120) {
          const damage = Math.max(1, prev.attack - player.defense);
          
          if (!player.isBlocking) {
            setPlayer(p => {
              const newHealth = Math.max(0, p.health - damage);
              createParticles(p.x, p.y - 50, '#ef4444');
              
              if (newHealth <= 0) {
                setTimeout(() => setGameState('GAME_OVER'), 500);
              }
              
              return { ...p, health: newHealth };
            });
          } else {
            createParticles(player.x, player.y - 50, '#3b82f6', 4);
          }

          return { ...prev, lastAttackTime: now, action: 'punch' };
        }

        const distance = player.x - prev.x;
        let newX = prev.x;
        if (Math.abs(distance) > 100) {
          newX += distance > 0 ? 2 : -2;
        }

        return { ...prev, x: newX, action: prev.action === 'punch' ? 'idle' : prev.action };
      });

      if (powerUp && !powerUp.collected) {
        const distance = Math.abs(player.x - powerUp.x);
        if (distance < 50) {
          setPowerUp(prev => prev ? { ...prev, collected: true } : null);
          
          setPlayer(prev => {
            switch (powerUp.type) {
              case 'health':
                return { ...prev, maxHealth: prev.maxHealth + 20, health: Math.min(prev.health + 50, prev.maxHealth + 20) };
              case 'attack':
                return { ...prev, attack: prev.attack + 3 };
              case 'defense':
                return { ...prev, defense: prev.defense + 2 };
              case 'speed':
                return { ...prev, speed: prev.speed + 1 };
              default:
                return prev;
            }
          });

          createParticles(powerUp.x, powerUp.y, '#fbbf24', 12);
          setTimeout(() => setPowerUp(null), 100);
        }
      }

      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.3,
            life: p.life - 0.02,
          }))
          .filter(p => p.life > 0)
      );

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mounted, gameState, enemy, player, keys, powerUp, createParticles]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  const renderCharacter = (char: Player | Enemy, isPlayer: boolean) => {
    const limbColor = isPlayer ? '#3b82f6' : char.color;
    const bodyColor = isPlayer ? '#60a5fa' : char.color;
    
    return (
      <g transform={`translate(${char.x}, ${char.y})`}>
        <circle cx="0" cy="-60" r="15" fill={bodyColor} />
        <rect x="-8" y="-45" width="16" height="30" fill={bodyColor} rx="4" />
        
        {char.action === 'punch' ? (
          <>
            <line
              x1="0"
              y1="-40"
              x2={char.direction === 'right' ? 25 : -25}
              y2="-35"
              stroke={limbColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="0"
              y1="-40"
              x2={char.direction === 'right' ? -15 : 15}
              y2="-30"
              stroke={limbColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        ) : char.action === 'kick' ? (
          <>
            <line x1="0" y1="-40" x2="-15" y2="-30" stroke={limbColor} strokeWidth="4" strokeLinecap="round" />
            <line x1="0" y1="-40" x2="15" y2="-30" stroke={limbColor} strokeWidth="4" strokeLinecap="round" />
            <line
              x1="0"
              y1="-15"
              x2={char.direction === 'right' ? 30 : -30}
              y2="-20"
              stroke={limbColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line x1="0" y1="-15" x2="0" y2="0" stroke={limbColor} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : char.action === 'block' ? (
          <>
            <line x1="0" y1="-40" x2="-20" y2="-45" stroke={limbColor} strokeWidth="4" strokeLinecap="round" />
            <line x1="0" y1="-40" x2="20" y2="-45" stroke={limbColor} strokeWidth="4" strokeLinecap="round" />
            <line x1="0" y1="-15" x2="-10" y2="0" stroke={limbColor} strokeWidth="4" strokeLinecap="round" />
            <line x1="0" y1="-15" x2="10" y2="0" stroke={limbColor} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <line x1="0" y1="-40" x2="-15" y2="-25" stroke={limbColor} strokeWidth="4" strokeLinecap="round" />
            <line x1="0" y1="-40" x2="15" y2="-25" stroke={limbColor} strokeWidth="4" strokeLinecap="round" />
            <line x1="0" y1="-15" x2="-10" y2="0" stroke={limbColor} strokeWidth="4" strokeLinecap="round" />
            <line x1="0" y1="-15" x2="10" y2="0" stroke={limbColor} strokeWidth="4" strokeLinecap="round" />
          </>
        )}
      </g>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold text-white mb-8 text-center">
        ⚔️ Resolution Warrior ⚔️
      </h1>

      {gameState === 'MENU' && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl max-w-md w-full">
          <p className="text-gray-300 mb-6 text-center">
            Battle through 12 months of obstacles to achieve your New Year's resolutions!
          </p>
          <div className="space-y-4">
            <button
              onClick={() => {
                setCurrentMonth(0);
                setPlayer(prev => ({ ...prev, health: prev.maxHealth }));
                setGameState('RUNNING');
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              New Game
            </button>
            {hasSave && (
              <button
                onClick={loadGame}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
              >
                Continue
              </button>
            )}
          </div>
          <div className="mt-6 text-sm text-gray-400 space-y-1">
            <p><strong>Controls:</strong></p>
            <p>Z - Punch | X - Kick</p>
            <p>Space - Block | W/↑ - Jump</p>
            <p>A/D or ←/→ - Move</p>
          </div>
        </div>
      )}

      {gameState === 'RUNNING' && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl max-w-md w-full">
          <h2 className="text-3xl font-bold text-white mb-4 text-center">
            {MONTHS[currentMonth].name}
          </h2>
          <p className="text-gray-300 mb-6 text-center">
            Prepare to face: <span className="font-bold" style={{ color: MONTHS[currentMonth].color }}>
              {MONTHS[currentMonth].enemy}
            </span>
          </p>
          <div className="space-y-4">
            <button
              onClick={() => {
                spawnEnemy();
                setTimeout(() => setGameState('COMBAT'), 1000);
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Begin Battle
            </button>
            <button
              onClick={saveGame}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Save Progress
            </button>
          </div>
        </div>
      )}

      {(gameState === 'ENCOUNTER' || gameState === 'COMBAT') && enemy && (
        <div className="w-full max-w-4xl">
          <div className="bg-gray-800 p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex-1">
              <div className="text-white font-bold mb-1">You</div>
              <div className="bg-gray-700 h-6 rounded-full overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                ATK: {player.attack.toFixed(0)} | DEF: {player.defense.toFixed(0)} | SPD: {player.speed.toFixed(0)}
              </div>
            </div>
            <div className="flex-1 text-right">
              <div className="text-white font-bold mb-1">{enemy.name}</div>
              <div className="bg-gray-700 h-6 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(enemy.health / enemy.maxHealth) * 100}%`,
                    backgroundColor: enemy.color,
                  }}
                />
              </div>
            </div>
          </div>

          <svg className="w-full bg-gradient-to-b from-gray-700 to-gray-900 rounded-b-lg" viewBox="0 0 800 500">
            <line x1="0" y1={GROUND_Y} x2="800" y2={GROUND_Y} stroke="#4b5563" strokeWidth="2" />
            
            {renderCharacter(player, true)}
            {renderCharacter(enemy, false)}

            {powerUp && !powerUp.collected && (
              <g transform={`translate(${powerUp.x}, ${powerUp.y})`}>
                <circle cx="0" cy="0" r="15" fill="#fbbf24" opacity="0.8" />
                <text x="0" y="5" textAnchor="middle" fill="white" fontSize="20">
                  {powerUp.type === 'health' ? '❤️' : powerUp.type === 'attack' ? '⚔️' : powerUp.type === 'defense' ? '🛡️' : '⚡'}
                </text>
              </g>
            )}

            {particles.map(p => (
              <circle
                key={p.id}
                cx={p.x}
                cy={p.y}
                r={3}
                fill={p.color}
                opacity={p.life}
              />
            ))}
          </svg>

          {gameState === 'ENCOUNTER' && (
            <div className="text-center mt-4">
              <p className="text-white text-xl">Get ready...</p>
            </div>
          )}
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl max-w-md w-full">
          <h2 className="text-3xl font-bold text-green-400 mb-4 text-center">Victory!</h2>
          <p className="text-gray-300 mb-6 text-center">
            You defeated {MONTHS[currentMonth].enemy}!
          </p>
          {currentMonth < MONTHS.length - 1 ? (
            <button
              onClick={() => {
                setCurrentMonth(prev => prev + 1);
                setPlayer(prev => ({ ...prev, health: prev.maxHealth, x: 200, y: GROUND_Y }));
                setEnemy(null);
                setPowerUp(null);
                setGameState('RUNNING');
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Next Month
            </button>
          ) : (
            <div>
              <p className="text-yellow-400 text-xl mb-4 text-center">
                🎉 You completed all 12 months! 🎉
              </p>
              <button
                onClick={() => {
                  setCurrentMonth(0);
                  setPlayer({
                    x: 200,
                    y: GROUND_Y,
                    health: 100,
                    maxHealth: 100,
                    attack: 10,
                    defense: 5,
                    speed: 5,
                    direction: 'right',
                    action: 'idle',
                    isBlocking: false,
                    isJumping: false,
                    velocityY: 0,
                  });
                  setEnemy(null);
                  setPowerUp(null);
                  setGameState('MENU');
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('resolutionWarriorSave');
                  }
                  setHasSave(false);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl max-w-md w-full">
          <h2 className="text-3xl font-bold text-red-400 mb-4 text-center">Game Over</h2>
          <p className="text-gray-300 mb-6 text-center">
            You were defeated by {MONTHS[currentMonth].enemy}
          </p>
          <button
            onClick={() => {
              setPlayer(prev => ({ ...prev, health: prev.maxHealth, x: 200, y: GROUND_Y }));
              setEnemy(null);
              setPowerUp(null);
              setGameState('RUNNING');
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}


