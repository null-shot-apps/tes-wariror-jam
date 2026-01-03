'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type GameState = 'MENU' | 'RUNNING' | 'ENCOUNTER' | 'COMBAT' | 'VICTORY' | 'GAME_OVER';
type PowerUpType = 'HEALTH' | 'ATTACK' | 'DEFENSE' | 'SPEED';

interface PowerUp {
  id: string;
  type: PowerUpType;
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

interface Enemy {
  name: string;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  color: string;
  isBoss: boolean;
}

interface Player {
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  x: number;
  y: number;
  facingRight: boolean;
  isJumping: boolean;
  velocityY: number;
  isBlocking: boolean;
  isPunching: boolean;
  isKicking: boolean;
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
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ENEMIES: Enemy[] = [
  { name: 'Procrastination', health: 100, maxHealth: 100, attack: 10, defense: 5, color: '#8B4513', isBoss: false },
  { name: 'Self-Doubt', health: 120, maxHealth: 120, attack: 12, defense: 6, color: '#4B0082', isBoss: false },
  { name: 'Laziness', health: 140, maxHealth: 140, attack: 14, defense: 7, color: '#696969', isBoss: false },
  { name: 'Distraction', health: 160, maxHealth: 160, attack: 16, defense: 8, color: '#FF6347', isBoss: false },
  { name: 'Fear', health: 180, maxHealth: 180, attack: 18, defense: 9, color: '#8B0000', isBoss: false },
  { name: 'Anxiety', health: 200, maxHealth: 200, attack: 20, defense: 10, color: '#483D8B', isBoss: false },
  { name: 'Burnout', health: 220, maxHealth: 220, attack: 22, defense: 11, color: '#B8860B', isBoss: false },
  { name: 'Negativity', health: 240, maxHealth: 240, attack: 24, defense: 12, color: '#2F4F4F', isBoss: false },
  { name: 'Temptation', health: 260, maxHealth: 260, attack: 26, defense: 13, color: '#DC143C', isBoss: false },
  { name: 'Impatience', health: 280, maxHealth: 280, attack: 28, defense: 14, color: '#FF4500', isBoss: false },
  { name: 'Regret', health: 300, maxHealth: 300, attack: 30, defense: 15, color: '#4B0082', isBoss: false },
  { name: 'Final Boss', health: 350, maxHealth: 350, attack: 35, defense: 18, color: '#000000', isBoss: true },
];

export default function ResolutionWarrior() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [currentMonth, setCurrentMonth] = useState(0);
  const [player, setPlayer] = useState<Player>({
    health: 100,
    maxHealth: 100,
    attack: 15,
    defense: 5,
    speed: 5,
    x: 100,
    y: 300,
    facingRight: true,
    isJumping: false,
    velocityY: 0,
    isBlocking: false,
    isPunching: false,
    isKicking: false,
  });
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [enemyX, setEnemyX] = useState(600);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [message, setMessage] = useState('');
  const [hasSaveData, setHasSaveData] = useState(false);
  const [mounted, setMounted] = useState(false);

  const keysPressed = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number>(0);
  const lastAttackTime = useRef(0);
  const enemyLastAttackTime = useRef(0);
  const particleIdCounter = useRef(0);

  // Check for save data on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resolutionWarriorSave');
      setHasSaveData(!!saved);
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
    setMessage('Game Saved!');
    setTimeout(() => setMessage(''), 2000);
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
      setMessage('Game Loaded!');
      setTimeout(() => setMessage(''), 2000);
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
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 1,
        color,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const spawnPowerUp = useCallback(() => {
    if (Math.random() < 0.3) {
      const types: PowerUpType[] = ['HEALTH', 'ATTACK', 'DEFENSE', 'SPEED'];
      const type = types[Math.floor(Math.random() * types.length)];
      const powerUp: PowerUp = {
        id: Math.random().toString(36),
        type,
        x: 300 + Math.random() * 200,
        y: 300,
        collected: false,
      };
      setPowerUps(prev => [...prev, powerUp]);
    }
  }, []);

  const collectPowerUp = useCallback((powerUp: PowerUp) => {
    setPlayer(prev => {
      let updated = { ...prev };
      switch (powerUp.type) {
        case 'HEALTH':
          updated.health = Math.min(prev.health + 30, prev.maxHealth);
          setMessage('+30 Health!');
          break;
        case 'ATTACK':
          updated.attack += 2;
          setMessage('+2 Attack!');
          break;
        case 'DEFENSE':
          updated.defense += 2;
          setMessage('+2 Defense!');
          break;
        case 'SPEED':
          updated.speed += 1;
          setMessage('+1 Speed!');
          break;
      }
      return updated;
    });
    createParticles(powerUp.x, powerUp.y, '#FFD700', 12);
    setPowerUps(prev => prev.filter(p => p.id !== powerUp.id));
    setTimeout(() => setMessage(''), 2000);
  }, [createParticles]);

  const playerAttack = useCallback((isKick: boolean = false) => {
    if (!enemy || player.isBlocking) return;
    
    const now = Date.now();
    if (now - lastAttackTime.current < 500) return;
    lastAttackTime.current = now;

    const damage = Math.max(1, player.attack * (isKick ? 1.5 : 1) - (enemy.defense || 0));
    
    if (isKick) {
      setPlayer(prev => ({ ...prev, isKicking: true }));
      setTimeout(() => setPlayer(prev => ({ ...prev, isKicking: false })), 300);
    } else {
      setPlayer(prev => ({ ...prev, isPunching: true }));
      setTimeout(() => setPlayer(prev => ({ ...prev, isPunching: false })), 200);
    }

    setEnemy(prev => {
      if (!prev) return prev;
      const newHealth = prev.health - damage;
      createParticles(enemyX, 250, prev.color);
      
      if (newHealth <= 0) {
        setTimeout(() => {
          setGameState('VICTORY');
          spawnPowerUp();
        }, 500);
        return { ...prev, health: 0 };
      }
      return { ...prev, health: newHealth };
    });
  }, [enemy, player, enemyX, createParticles, spawnPowerUp]);

  const enemyAttack = useCallback(() => {
    if (!enemy || gameState !== 'COMBAT') return;

    const now = Date.now();
    if (now - enemyLastAttackTime.current < 2000) return;
    enemyLastAttackTime.current = now;

    if (player.isBlocking) {
      setMessage('Blocked!');
      setTimeout(() => setMessage(''), 1000);
      return;
    }

    const damage = Math.max(1, enemy.attack - player.defense);
    setPlayer(prev => {
      const newHealth = prev.health - damage;
      createParticles(prev.x, prev.y, '#FF0000');
      
      if (newHealth <= 0) {
        setTimeout(() => setGameState('GAME_OVER'), 500);
        return { ...prev, health: 0 };
      }
      return { ...prev, health: newHealth };
    });
  }, [enemy, gameState, player, createParticles]);

  useEffect(() => {
    if (gameState !== 'COMBAT') return;

    const interval = setInterval(enemyAttack, 2000);
    return () => clearInterval(interval);
  }, [gameState, enemyAttack]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());
      
      if (gameState === 'COMBAT') {
        if (e.key.toLowerCase() === 'z') {
          playerAttack(false);
        } else if (e.key.toLowerCase() === 'x') {
          playerAttack(true);
        } else if (e.key === ' ') {
          e.preventDefault();
          setPlayer(prev => ({ ...prev, isBlocking: true }));
        } else if ((e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') && !player.isJumping) {
          setPlayer(prev => ({ ...prev, isJumping: true, velocityY: -15 }));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
      
      if (e.key === ' ') {
        setPlayer(prev => ({ ...prev, isBlocking: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, player.isJumping, playerAttack]);

  useEffect(() => {
    if (gameState !== 'COMBAT' && gameState !== 'RUNNING') return;

    const gameLoop = () => {
      setPlayer(prev => {
        let newPlayer = { ...prev };

        if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) {
          newPlayer.x = Math.max(50, prev.x - prev.speed);
          newPlayer.facingRight = false;
        }
        if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) {
          newPlayer.x = Math.min(750, prev.x + prev.speed);
          newPlayer.facingRight = true;
        }

        if (prev.isJumping) {
          newPlayer.y += prev.velocityY;
          newPlayer.velocityY += 0.8;

          if (newPlayer.y >= 300) {
            newPlayer.y = 300;
            newPlayer.isJumping = false;
            newPlayer.velocityY = 0;
          }
        }

        return newPlayer;
      });

      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.02,
          }))
          .filter(p => p.life > 0)
      );

      powerUps.forEach(powerUp => {
        if (!powerUp.collected && 
            Math.abs(player.x - powerUp.x) < 30 && 
            Math.abs(player.y - powerUp.y) < 30) {
          collectPowerUp(powerUp);
        }
      });

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, powerUps, player.x, player.y, collectPowerUp]);

  const startGame = () => {
    setCurrentMonth(0);
    setPlayer({
      health: 100,
      maxHealth: 100,
      attack: 15,
      defense: 5,
      speed: 5,
      x: 100,
      y: 300,
      facingRight: true,
      isJumping: false,
      velocityY: 0,
      isBlocking: false,
      isPunching: false,
      isKicking: false,
    });
    setPowerUps([]);
    setParticles([]);
    setGameState('RUNNING');
  };

  const startEncounter = () => {
    const currentEnemy = { ...ENEMIES[currentMonth] };
    setEnemy(currentEnemy);
    setEnemyX(600);
    setGameState('ENCOUNTER');
    setTimeout(() => setGameState('COMBAT'), 2000);
  };

  const nextMonth = () => {
    if (currentMonth < 11) {
      setCurrentMonth(prev => prev + 1);
      setPlayer(prev => ({
        ...prev,
        health: prev.maxHealth,
        x: 100,
        y: 300,
      }));
      setGameState('RUNNING');
    } else {
      setGameState('MENU');
      setMessage('You conquered all 12 months! You are a Resolution Warrior!');
    }
  };

  const getPowerUpColor = (type: PowerUpType) => {
    switch (type) {
      case 'HEALTH': return '#00FF00';
      case 'ATTACK': return '#FF0000';
      case 'DEFENSE': return '#0000FF';
      case 'SPEED': return '#FFFF00';
    }
  };

  const getPowerUpSymbol = (type: PowerUpType) => {
    switch (type) {
      case 'HEALTH': return '❤️';
      case 'ATTACK': return '⚔️';
      case 'DEFENSE': return '🛡️';
      case 'SPEED': return '⚡';
    }
  };

  if (!mounted) {
    return <div className="w-screen h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-2xl">Loading...</div>
    </div>;
  }

  return (
    <div className="w-screen h-screen bg-gray-900 flex flex-col items-center justify-center overflow-hidden">
      {gameState === 'MENU' && (
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-8">Resolution Warrior</h1>
          <p className="text-xl text-gray-300 mb-8">Battle through 12 months to keep your New Year&apos;s resolutions!</p>
          <div className="space-y-4">
            <button
              onClick={startGame}
              className="block w-64 mx-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-xl"
            >
              New Game
            </button>
            {hasSaveData && (
              <button
                onClick={loadGame}
                className="block w-64 mx-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-xl"
              >
                Continue
              </button>
            )}
          </div>
          {message && <p className="text-yellow-400 text-xl mt-4">{message}</p>}
        </div>
      )}

      {gameState === 'RUNNING' && (
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-4">{MONTHS[currentMonth]}</h2>
          <p className="text-xl text-gray-300 mb-8">Month {currentMonth + 1} of 12</p>
          <button
            onClick={startEncounter}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-xl mb-4"
          >
            Face Your Challenge
          </button>
          <button
            onClick={saveGame}
            className="block mx-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg"
          >
            Save Game
          </button>
          {message && <p className="text-yellow-400 text-xl mt-4">{message}</p>}
        </div>
      )}

      {(gameState === 'ENCOUNTER' || gameState === 'COMBAT') && enemy && (
        <div className="relative w-full h-full">
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 p-4 rounded">
            <div className="text-white mb-2">Player HP: {player.health}/{player.maxHealth}</div>
            <div className="w-64 h-6 bg-gray-700 rounded">
              <div
                className="h-full bg-green-500 rounded transition-all"
                style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
              />
            </div>
            <div className="text-white text-sm mt-2">
              ATK: {player.attack} | DEF: {player.defense} | SPD: {player.speed}
            </div>
          </div>

          <div className="absolute top-4 right-4 bg-black bg-opacity-50 p-4 rounded">
            <div className="text-white mb-2">{enemy.name} {enemy.isBoss && '👑'}</div>
            <div className="text-white mb-2">HP: {enemy.health}/{enemy.maxHealth}</div>
            <div className="w-64 h-6 bg-gray-700 rounded">
              <div
                className="h-full bg-red-500 rounded transition-all"
                style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }}
              />
            </div>
          </div>

          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-white text-xl">
            {MONTHS[currentMonth]}
          </div>

          {message && (
            <div className="absolute top-32 left-1/2 transform -translate-x-1/2 text-yellow-400 text-2xl font-bold">
              {message}
            </div>
          )}

          <svg className="absolute bottom-0 w-full h-full">
            <line x1="0" y1="350" x2="800" y2="350" stroke="#444" strokeWidth="2" />

            {particles.map(p => (
              <circle
                key={p.id}
                cx={p.x}
                cy={p.y}
                r={4}
                fill={p.color}
                opacity={p.life}
              />
            ))}

            {powerUps.map(powerUp => (
              <g key={powerUp.id}>
                <circle
                  cx={powerUp.x}
                  cy={powerUp.y}
                  r={15}
                  fill={getPowerUpColor(powerUp.type)}
                  opacity={0.8}
                />
                <text
                  x={powerUp.x}
                  y={powerUp.y + 5}
                  textAnchor="middle"
                  fontSize="20"
                >
                  {getPowerUpSymbol(powerUp.type)}
                </text>
              </g>
            ))}

            <g transform={`translate(${player.x}, ${player.y})`}>
              <circle cx="0" cy="-20" r="15" fill="#FFD700" />
              <rect x="-10" y="-5" width="20" height="30" fill="#4169E1" />
              
              {player.isPunching && (
                <line
                  x1={player.facingRight ? 10 : -10}
                  y1="-10"
                  x2={player.facingRight ? 30 : -30}
                  y2="-10"
                  stroke="#FFD700"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              )}
              
              {player.isKicking && (
                <line
                  x1={player.facingRight ? 10 : -10}
                  y1="10"
                  x2={player.facingRight ? 35 : -35}
                  y2="10"
                  stroke="#FFD700"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              )}
              
              {player.isBlocking && (
                <rect
                  x={player.facingRight ? 10 : -25}
                  y="-15"
                  width="15"
                  height="30"
                  fill="#888"
                  opacity="0.7"
                />
              )}
              
              <line x1="-10" y1="25" x2="-10" y2="40" stroke="#4169E1" strokeWidth="3" />
              <line x1="10" y1="25" x2="10" y2="40" stroke="#4169E1" strokeWidth="3" />
            </g>

            <g transform={`translate(${enemyX}, 250)`}>
              <circle cx="0" cy="-20" r="15" fill={enemy.color} />
              <rect x="-10" y="-5" width="20" height="30" fill={enemy.color} opacity="0.8" />
              <line x1="-10" y1="25" x2="-10" y2="40" stroke={enemy.color} strokeWidth="3" />
              <line x1="10" y1="25" x2="10" y2="40" stroke={enemy.color} strokeWidth="3" />
              {enemy.isBoss && (
                <text x="0" y="-40" textAnchor="middle" fontSize="24">👑</text>
              )}
            </g>
          </svg>

          {gameState === 'COMBAT' && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 p-4 rounded text-white text-center">
              <div className="text-sm">Z: Punch | X: Kick | Space: Block | W/↑: Jump | A/D: Move</div>
            </div>
          )}
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="text-center">
          <h2 className="text-5xl font-bold text-green-400 mb-4">Victory!</h2>
          <p className="text-2xl text-white mb-8">You defeated {enemy?.name}!</p>
          <p className="text-xl text-gray-300 mb-8">{MONTHS[currentMonth]} conquered!</p>
          <button
            onClick={nextMonth}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-xl"
          >
            {currentMonth < 11 ? 'Next Month' : 'Finish Game'}
          </button>
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="text-center">
          <h2 className="text-5xl font-bold text-red-400 mb-4">Game Over</h2>
          <p className="text-2xl text-white mb-8">You were defeated in {MONTHS[currentMonth]}</p>
          <button
            onClick={() => setGameState('MENU')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-xl"
          >
            Return to Menu
          </button>
        </div>
      )}
    </div>
  );
}

