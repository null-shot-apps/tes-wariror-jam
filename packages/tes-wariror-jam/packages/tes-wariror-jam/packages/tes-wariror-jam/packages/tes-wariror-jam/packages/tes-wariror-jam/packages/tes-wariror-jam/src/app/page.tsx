'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Force dynamic rendering to avoid localStorage issues during build
export const dynamic = 'force-dynamic';

type GameState = 'MENU' | 'RUNNING' | 'ENCOUNTER' | 'COMBAT' | 'VICTORY' | 'GAME_OVER';

type PowerUpType = 'HEALTH' | 'ATTACK' | 'DEFENSE' | 'SPEED';

interface PowerUp {
  type: PowerUpType;
  name: string;
  description: string;
  color: string;
}

interface Player {
  x: number;
  y: number;
  velocityY: number;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  isJumping: boolean;
  isPunching: boolean;
  isKicking: boolean;
  isBlocking: boolean;
  facingRight: boolean;
  attackCooldown: number;
}

interface Enemy {
  name: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  color: string;
  isPunching: boolean;
  isKicking: boolean;
  facingRight: boolean;
  attackCooldown: number;
  aiTimer: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const MONTHS = [
  { name: 'January', enemy: 'Procrastination', color: '#94a3b8', difficulty: 1 },
  { name: 'February', enemy: 'Self-Doubt', color: '#a78bfa', difficulty: 1.2 },
  { name: 'March', enemy: 'Distraction', color: '#fb923c', difficulty: 1.4 },
  { name: 'April', enemy: 'Laziness', color: '#4ade80', difficulty: 1.6 },
  { name: 'May', enemy: 'Fear', color: '#f87171', difficulty: 1.8 },
  { name: 'June', enemy: 'Temptation', color: '#fbbf24', difficulty: 2 },
  { name: 'July', enemy: 'Burnout', color: '#fb7185', difficulty: 2.2 },
  { name: 'August', enemy: 'Negativity', color: '#818cf8', difficulty: 2.4 },
  { name: 'September', enemy: 'Impatience', color: '#34d399', difficulty: 2.6 },
  { name: 'October', enemy: 'Anxiety', color: '#c084fc', difficulty: 2.8 },
  { name: 'November', enemy: 'Doubt', color: '#f472b6', difficulty: 3 },
  { name: 'December', enemy: 'Final Boss', color: '#ef4444', difficulty: 3.5 },
];

const POWER_UPS: PowerUp[] = [
  { type: 'HEALTH', name: 'Health Boost', description: '+20 HP', color: '#22c55e' },
  { type: 'ATTACK', name: 'Attack Up', description: '+5 Attack', color: '#ef4444' },
  { type: 'DEFENSE', name: 'Defense Up', description: '+3 Defense', color: '#3b82f6' },
  { type: 'SPEED', name: 'Speed Boost', description: '+1 Speed', color: '#eab308' },
];

const GROUND_Y = 400;
const GRAVITY = 0.8;
const JUMP_FORCE = -15;

export default function ResolutionWarrior() {
  const [mounted, setMounted] = useState(false);
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [currentMonth, setCurrentMonth] = useState(0);
  const [player, setPlayer] = useState<Player>({
    x: 100,
    y: GROUND_Y,
    velocityY: 0,
    health: 100,
    maxHealth: 100,
    attack: 10,
    defense: 5,
    speed: 5,
    isJumping: false,
    isPunching: false,
    isKicking: false,
    isBlocking: false,
    facingRight: true,
    attackCooldown: 0,
  });
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [powerUpMessage, setPowerUpMessage] = useState('');

  const animationFrameRef = useRef<number>(0);
  const particleIdCounter = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load saved game
  useEffect(() => {
    if (!mounted) return;
    
    const saved = localStorage.getItem('resolutionWarrior');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setCurrentMonth(data.currentMonth || 0);
        setPlayer(prev => ({
          ...prev,
          maxHealth: data.maxHealth || 100,
          health: data.health || 100,
          attack: data.attack || 10,
          defense: data.defense || 5,
          speed: data.speed || 5,
        }));
      } catch (e) {
        console.error('Failed to load save:', e);
      }
    }
  }, [mounted]);

  // Save game
  const saveGame = useCallback(() => {
    if (!mounted) return;
    
    const saveData = {
      currentMonth,
      health: player.health,
      maxHealth: player.maxHealth,
      attack: player.attack,
      defense: player.defense,
      speed: player.speed,
    };
    localStorage.setItem('resolutionWarrior', JSON.stringify(saveData));
  }, [mounted, currentMonth, player.health, player.maxHealth, player.attack, player.defense, player.speed]);

  const createParticles = useCallback((x: number, y: number, color: string, count: number = 8) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 3 + Math.random() * 3;
      newParticles.push({
        id: particleIdCounter.current++,
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color,
        size: 4 + Math.random() * 4,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const startLevel = useCallback(() => {
    const month = MONTHS[currentMonth];
    const baseDifficulty = month.difficulty;
    
    setEnemy({
      name: month.enemy,
      x: 600,
      y: GROUND_Y,
      health: Math.floor(50 * baseDifficulty),
      maxHealth: Math.floor(50 * baseDifficulty),
      attack: Math.floor(8 * baseDifficulty),
      defense: Math.floor(3 * baseDifficulty),
      speed: Math.floor(3 * baseDifficulty),
      color: month.color,
      isPunching: false,
      isKicking: false,
      facingRight: false,
      attackCooldown: 0,
      aiTimer: 0,
    });
    
    setMessage(`${month.name}: Face ${month.enemy}!`);
    setGameState('ENCOUNTER');
    
    setTimeout(() => {
      setGameState('COMBAT');
      setMessage('');
    }, 2000);
  }, [currentMonth]);

  const playerAttack = useCallback((isKick: boolean = false) => {
    if (!enemy || player.attackCooldown > 0 || player.isBlocking) return;

    const damage = Math.max(1, Math.floor((player.attack * (isKick ? 1.5 : 1)) - enemy.defense));
    const hitX = player.facingRight ? player.x + 40 : player.x - 40;
    const distance = Math.abs(hitX - enemy.x);

    if (distance < 60) {
      setEnemy(prev => prev ? { ...prev, health: Math.max(0, prev.health - damage) } : null);
      createParticles(enemy.x, enemy.y - 20, '#fbbf24', 12);
      
      if (enemy.health - damage <= 0) {
        setTimeout(() => {
          if (currentMonth >= MONTHS.length - 1) {
            setMessage('Victory! You conquered all 12 months!');
            setGameState('VICTORY');
            if (mounted) localStorage.removeItem('resolutionWarrior');
          } else {
            // Random power-up drop (40% chance)
            if (Math.random() < 0.4) {
              const powerUp = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
              applyPowerUp(powerUp);
            }
            
            setCurrentMonth(prev => prev + 1);
            setMessage('Victory! Moving to next month...');
            setGameState('VICTORY');
            saveGame();
            setTimeout(() => startLevel(), 2000);
          }
        }, 500);
      }
    }

    setPlayer(prev => ({
      ...prev,
      [isKick ? 'isKicking' : 'isPunching']: true,
      attackCooldown: 30,
    }));

    setTimeout(() => {
      setPlayer(prev => ({
        ...prev,
        [isKick ? 'isKicking' : 'isPunching']: false,
      }));
    }, 300);
  }, [enemy, player.attackCooldown, player.isBlocking, player.attack, player.facingRight, player.x, createParticles, currentMonth, mounted, saveGame]);

  const applyPowerUp = useCallback((powerUp: PowerUp) => {
    setPowerUpMessage(`${powerUp.name}! ${powerUp.description}`);
    
    setPlayer(prev => {
      const updated = { ...prev };
      switch (powerUp.type) {
        case 'HEALTH':
          updated.health = Math.min(prev.maxHealth, prev.health + 20);
          break;
        case 'ATTACK':
          updated.attack += 5;
          break;
        case 'DEFENSE':
          updated.defense += 3;
          break;
        case 'SPEED':
          updated.speed += 1;
          break;
      }
      return updated;
    });

    setTimeout(() => setPowerUpMessage(''), 2000);
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'COMBAT') return;

    const gameLoop = () => {
      // Update player
      setPlayer(prev => {
        const updated = { ...prev };
        
        // Gravity
        if (updated.y < GROUND_Y || updated.velocityY < 0) {
          updated.velocityY += GRAVITY;
          updated.y += updated.velocityY;
          updated.isJumping = true;
        }
        
        if (updated.y >= GROUND_Y) {
          updated.y = GROUND_Y;
          updated.velocityY = 0;
          updated.isJumping = false;
        }

        // Movement
        if (keys.has('a') || keys.has('ArrowLeft')) {
          updated.x = Math.max(20, updated.x - updated.speed);
          updated.facingRight = false;
        }
        if (keys.has('d') || keys.has('ArrowRight')) {
          updated.x = Math.min(760, updated.x + updated.speed);
          updated.facingRight = true;
        }

        // Jump
        if ((keys.has('w') || keys.has('ArrowUp')) && !updated.isJumping) {
          updated.velocityY = JUMP_FORCE;
          updated.isJumping = true;
        }

        // Block
        updated.isBlocking = keys.has(' ');

        // Cooldowns
        if (updated.attackCooldown > 0) updated.attackCooldown--;

        return updated;
      });

      // Update enemy AI
      setEnemy(prev => {
        if (!prev) return null;
        
        const updated = { ...prev };
        updated.aiTimer++;

        // Simple AI: move toward player and attack
        const distance = Math.abs(updated.x - player.x);
        
        if (distance > 80) {
          if (updated.x > player.x) {
            updated.x -= updated.speed * 0.5;
            updated.facingRight = false;
          } else {
            updated.x += updated.speed * 0.5;
            updated.facingRight = true;
          }
        }

        // Attack player
        if (distance < 70 && updated.attackCooldown === 0 && updated.aiTimer % 60 === 0) {
          const damage = Math.max(1, Math.floor(updated.attack - (player.isBlocking ? player.defense * 2 : player.defense)));
          
          if (!player.isBlocking) {
            setPlayer(p => {
              const newHealth = Math.max(0, p.health - damage);
              if (newHealth === 0) {
                setTimeout(() => {
                  setMessage('Game Over! Try again?');
                  setGameState('GAME_OVER');
                }, 500);
              }
              return { ...p, health: newHealth };
            });
            createParticles(player.x, player.y - 20, '#ef4444', 8);
          } else {
            createParticles(player.x, player.y - 20, '#3b82f6', 6);
          }

          updated.isPunching = true;
          updated.attackCooldown = 40;
          
          setTimeout(() => {
            setEnemy(e => e ? { ...e, isPunching: false } : null);
          }, 300);
        }

        if (updated.attackCooldown > 0) updated.attackCooldown--;

        return updated;
      });

      // Update particles
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.velocityX,
            y: p.y + p.velocityY,
            velocityY: p.velocityY + 0.3,
            life: p.life - 0.02,
          }))
          .filter(p => p.life > 0)
      );

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameState, keys, player.x, player.y, player.isBlocking, player.defense, createParticles]);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set(prev).add(e.key.toLowerCase()));
      
      if (gameState === 'COMBAT') {
        if (e.key.toLowerCase() === 'z') {
          playerAttack(false);
        } else if (e.key.toLowerCase() === 'x') {
          playerAttack(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(e.key.toLowerCase());
        return newKeys;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, playerAttack]);

  const renderCharacter = (char: Player | Enemy, isPlayer: boolean) => {
    const limbColor = isPlayer ? '#3b82f6' : (char as Enemy).color;
    const bodyColor = isPlayer ? '#60a5fa' : (char as Enemy).color;
    
    return (
      <g transform={`translate(${char.x}, ${char.y})`}>
        {/* Body */}
        <rect x="-15" y="-40" width="30" height="40" fill={bodyColor} rx="5" />
        
        {/* Head */}
        <circle cx="0" cy="-50" r="15" fill={isPlayer ? '#93c5fd' : bodyColor} />
        
        {/* Arms */}
        {(isPlayer ? player.isPunching : (char as Enemy).isPunching) ? (
          <rect
            x={char.facingRight ? "15" : "-35"}
            y="-35"
            width="20"
            height="8"
            fill={limbColor}
            rx="4"
          />
        ) : (
          <rect x={char.facingRight ? "15" : "-20"} y="-30" width="8" height="25" fill={limbColor} rx="4" />
        )}
        <rect x={char.facingRight ? "-20" : "15"} y="-30" width="8" height="25" fill={limbColor} rx="4" />
        
        {/* Legs */}
        {(isPlayer ? player.isKicking : (char as Enemy).isKicking) ? (
          <rect
            x={char.facingRight ? "5" : "-25"}
            y="-5"
            width="20"
            height="8"
            fill={limbColor}
            rx="4"
          />
        ) : (
          <>
            <rect x="-12" y="0" width="8" height="25" fill={limbColor} rx="4" />
            <rect x="4" y="0" width="8" height="25" fill={limbColor} rx="4" />
          </>
        )}
        
        {/* Block indicator */}
        {isPlayer && player.isBlocking && (
          <rect x="-20" y="-45" width="40" height="50" fill="none" stroke="#3b82f6" strokeWidth="3" rx="5" />
        )}
      </g>
    );
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-5xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Resolution Warrior
        </h1>
        <p className="text-center text-slate-400 mb-8">Battle through 12 months to achieve your New Year's resolutions!</p>

        {gameState === 'MENU' && (
          <div className="bg-slate-800 rounded-lg p-8 shadow-2xl border border-slate-700">
            <div className="space-y-4">
              <button
                onClick={() => {
                  setGameState('RUNNING');
                  startLevel();
                }}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105"
              >
                New Game
              </button>
              
              {mounted && localStorage.getItem('resolutionWarrior') && (
                <button
                  onClick={() => {
                    setGameState('RUNNING');
                    startLevel();
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105"
                >
                  Continue ({MONTHS[currentMonth].name})
                </button>
              )}

              <div className="mt-8 p-6 bg-slate-900 rounded-lg border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Controls</h3>
                <div className="grid grid-cols-2 gap-3 text-slate-300">
                  <div><kbd className="px-2 py-1 bg-slate-700 rounded">A/D</kbd> or <kbd className="px-2 py-1 bg-slate-700 rounded">←/→</kbd> Move</div>
                  <div><kbd className="px-2 py-1 bg-slate-700 rounded">W</kbd> or <kbd className="px-2 py-1 bg-slate-700 rounded">↑</kbd> Jump</div>
                  <div><kbd className="px-2 py-1 bg-slate-700 rounded">Z</kbd> Punch</div>
                  <div><kbd className="px-2 py-1 bg-slate-700 rounded">X</kbd> Kick (1.5x damage)</div>
                  <div><kbd className="px-2 py-1 bg-slate-700 rounded">Space</kbd> Block</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(gameState === 'RUNNING' || gameState === 'ENCOUNTER' || gameState === 'COMBAT' || gameState === 'VICTORY') && (
          <div className="bg-slate-800 rounded-lg p-6 shadow-2xl border border-slate-700">
            {/* HUD */}
            <div className="mb-4 flex justify-between items-center">
              <div className="flex-1">
                <div className="text-white font-bold mb-1">Player</div>
                <div className="bg-slate-700 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-full transition-all duration-300"
                    style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
                  />
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  HP: {player.health}/{player.maxHealth} | ATK: {player.attack} | DEF: {player.defense} | SPD: {player.speed}
                </div>
              </div>

              <div className="mx-4 text-center">
                <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                  {MONTHS[currentMonth].name}
                </div>
                <button
                  onClick={saveGame}
                  className="mt-2 px-4 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                >
                  Save
                </button>
              </div>

              {enemy && (
                <div className="flex-1">
                  <div className="text-white font-bold mb-1 text-right">{enemy.name}</div>
                  <div className="bg-slate-700 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-orange-600 h-full transition-all duration-300"
                      style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }}
                    />
                  </div>
                  <div className="text-sm text-slate-400 mt-1 text-right">
                    HP: {enemy.health}/{enemy.maxHealth}
                  </div>
                </div>
              )}
            </div>

            {/* Game Canvas */}
            <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 rounded-lg overflow-hidden border-2 border-slate-700">
              <svg width="800" height="500" className="w-full">
                {/* Ground */}
                <rect x="0" y={GROUND_Y + 25} width="800" height="75" fill="#1e293b" />
                <line x1="0" y1={GROUND_Y + 25} x2="800" y2={GROUND_Y + 25} stroke="#475569" strokeWidth="2" />

                {/* Particles */}
                {particles.map(p => (
                  <circle
                    key={p.id}
                    cx={p.x}
                    cy={p.y}
                    r={p.size * p.life}
                    fill={p.color}
                    opacity={p.life}
                  />
                ))}

                {/* Characters */}
                {renderCharacter(player, true)}
                {enemy && renderCharacter(enemy, false)}
              </svg>

              {/* Messages */}
              {message && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-4xl font-bold text-white text-center px-8 py-4 bg-slate-900 rounded-lg border-2 border-blue-500">
                    {message}
                  </div>
                </div>
              )}

              {powerUpMessage && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-2xl font-bold text-yellow-400 animate-bounce">
                  {powerUpMessage}
                </div>
              )}
            </div>
          </div>
        )}

        {gameState === 'GAME_OVER' && (
          <div className="bg-slate-800 rounded-lg p-8 shadow-2xl border border-slate-700 text-center">
            <h2 className="text-4xl font-bold text-red-500 mb-4">Game Over</h2>
            <p className="text-slate-300 mb-6">You were defeated in {MONTHS[currentMonth].name}</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setPlayer(prev => ({ ...prev, health: prev.maxHealth }));
                  setGameState('RUNNING');
                  startLevel();
                }}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                Retry Level
              </button>
              <button
                onClick={() => {
                  if (mounted) localStorage.removeItem('resolutionWarrior');
                  setCurrentMonth(0);
                  setPlayer({
                    x: 100,
                    y: GROUND_Y,
                    velocityY: 0,
                    health: 100,
                    maxHealth: 100,
                    attack: 10,
                    defense: 5,
                    speed: 5,
                    isJumping: false,
                    isPunching: false,
                    isKicking: false,
                    isBlocking: false,
                    facingRight: true,
                    attackCooldown: 0,
                  });
                  setGameState('MENU');
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                Main Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

