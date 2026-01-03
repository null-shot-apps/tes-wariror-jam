'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type GameState = 'MENU' | 'RUNNING' | 'ENCOUNTER' | 'COMBAT' | 'VICTORY' | 'GAME_OVER';
type PowerUpType = 'HEALTH' | 'ATTACK' | 'DEFENSE' | 'SPEED';

interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
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
  { name: 'Regret', health: 300, maxHealth: 300, attack: 30, defense: 15, color: '#191970', isBoss: false },
  { name: 'Final Boss', health: 500, maxHealth: 500, attack: 50, defense: 20, color: '#000000', isBoss: true },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [currentMonth, setCurrentMonth] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerMaxHealth, setPlayerMaxHealth] = useState(100);
  const [playerAttack, setPlayerAttack] = useState(15);
  const [playerDefense, setPlayerDefense] = useState(5);
  const [playerSpeed, setPlayerSpeed] = useState(5);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [playerX, setPlayerX] = useState(100);
  const [playerY, setPlayerY] = useState(300);
  const [enemyX, setEnemyX] = useState(600);
  const [enemyY, setEnemyY] = useState(300);
  const [isJumping, setIsJumping] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const [attackType, setAttackType] = useState<'punch' | 'kick'>('punch');
  const [facingRight, setFacingRight] = useState(true);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [hasSavedGame, setHasSavedGame] = useState(false);

  const keysPressed = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const particleIdCounter = useRef(0);
  const lastEnemyAttack = useRef(0);

  // Mount check for SSR
  useEffect(() => {
    setMounted(true);
    // Check for saved game only on client
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resolutionWarriorSave');
      setHasSavedGame(!!saved);
    }
  }, []);

  const createParticles = useCallback((x: number, y: number, color: string, count: number = 10) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdCounter.current++,
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
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
      setPowerUps(prev => [...prev, {
        id: Math.random().toString(),
        type,
        x: 300 + Math.random() * 200,
        y: 350,
      }]);
    }
  }, []);

  const collectPowerUp = useCallback((powerUp: PowerUp) => {
    switch (powerUp.type) {
      case 'HEALTH':
        setPlayerHealth(prev => Math.min(prev + 30, playerMaxHealth));
        createParticles(powerUp.x, powerUp.y, '#00FF00', 15);
        break;
      case 'ATTACK':
        setPlayerAttack(prev => prev + 5);
        createParticles(powerUp.x, powerUp.y, '#FF0000', 15);
        break;
      case 'DEFENSE':
        setPlayerDefense(prev => prev + 3);
        createParticles(powerUp.x, powerUp.y, '#0000FF', 15);
        break;
      case 'SPEED':
        setPlayerSpeed(prev => prev + 2);
        createParticles(powerUp.x, powerUp.y, '#FFFF00', 15);
        break;
    }
    setPowerUps(prev => prev.filter(p => p.id !== powerUp.id));
  }, [playerMaxHealth, createParticles]);

  const saveGame = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const saveData = {
      currentMonth,
      playerHealth,
      playerMaxHealth,
      playerAttack,
      playerDefense,
      playerSpeed,
    };
    localStorage.setItem('resolutionWarriorSave', JSON.stringify(saveData));
    setHasSavedGame(true);
  }, [currentMonth, playerHealth, playerMaxHealth, playerAttack, playerDefense, playerSpeed]);

  const loadGame = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('resolutionWarriorSave');
    if (saved) {
      const data = JSON.parse(saved);
      setCurrentMonth(data.currentMonth);
      setPlayerHealth(data.playerHealth);
      setPlayerMaxHealth(data.playerMaxHealth);
      setPlayerAttack(data.playerAttack);
      setPlayerDefense(data.playerDefense);
      setPlayerSpeed(data.playerSpeed);
      startLevel(data.currentMonth);
    }
  }, []);

  const startLevel = useCallback((month: number) => {
    const newEnemy = { ...ENEMIES[month] };
    setEnemy(newEnemy);
    setGameState('COMBAT');
    setPlayerX(100);
    setEnemyX(600);
    setIsBlocking(false);
    setIsAttacking(false);
  }, []);

  const playerAttackEnemy = useCallback(() => {
    if (!enemy || isBlocking || isAttacking) return;

    setIsAttacking(true);
    const distance = Math.abs(playerX - enemyX);
    
    if (distance < 100) {
      const damage = Math.max(1, playerAttack - enemy.defense);
      const actualDamage = attackType === 'kick' ? Math.floor(damage * 1.5) : damage;
      
      setEnemy(prev => {
        if (!prev) return prev;
        const newHealth = Math.max(0, prev.health - actualDamage);
        return { ...prev, health: newHealth };
      });

      createParticles(enemyX, enemyY, enemy.color, 20);

      if (enemy.health - actualDamage <= 0) {
        setTimeout(() => {
          setGameState('VICTORY');
          spawnPowerUp();
        }, 500);
      }
    }

    setTimeout(() => setIsAttacking(false), 300);
  }, [enemy, isBlocking, isAttacking, playerX, enemyX, playerAttack, attackType, enemyY, createParticles, spawnPowerUp]);

  const enemyAttackPlayer = useCallback(() => {
    if (!enemy || gameState !== 'COMBAT') return;

    const now = Date.now();
    if (now - lastEnemyAttack.current < 2000) return;

    const distance = Math.abs(playerX - enemyX);
    if (distance < 150) {
      lastEnemyAttack.current = now;
      
      if (!isBlocking) {
        const damage = Math.max(1, enemy.attack - playerDefense);
        setPlayerHealth(prev => {
          const newHealth = Math.max(0, prev - damage);
          if (newHealth <= 0) {
            setTimeout(() => setGameState('GAME_OVER'), 500);
          }
          return newHealth;
        });
        createParticles(playerX, playerY, '#FF0000', 15);
      } else {
        createParticles(playerX, playerY, '#FFFF00', 10);
      }
    }
  }, [enemy, gameState, playerX, enemyX, isBlocking, playerDefense, playerY, createParticles]);

  useEffect(() => {
    if (!mounted || gameState !== 'COMBAT') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());

      if (e.key.toLowerCase() === 'z' && !isAttacking && !isBlocking) {
        setAttackType('punch');
        playerAttackEnemy();
      }
      if (e.key.toLowerCase() === 'x' && !isAttacking && !isBlocking) {
        setAttackType('kick');
        playerAttackEnemy();
      }
      if (e.key === ' ' && !isAttacking) {
        setIsBlocking(true);
      }
      if ((e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') && !isJumping) {
        setIsJumping(true);
        setTimeout(() => setIsJumping(false), 500);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
      if (e.key === ' ') {
        setIsBlocking(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mounted, gameState, isAttacking, isBlocking, isJumping, playerAttackEnemy]);

  useEffect(() => {
    if (!mounted || gameState !== 'COMBAT') return;

    const gameLoop = () => {
      // Player movement
      if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) {
        setPlayerX(prev => Math.max(50, prev - playerSpeed));
        setFacingRight(false);
      }
      if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) {
        setPlayerX(prev => Math.min(750, prev + playerSpeed));
        setFacingRight(true);
      }

      // Enemy AI
      enemyAttackPlayer();

      // Update particles
      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.02,
        }))
        .filter(p => p.life > 0)
      );

      // Check power-up collection
      powerUps.forEach(powerUp => {
        if (Math.abs(playerX - powerUp.x) < 30 && Math.abs(playerY - powerUp.y) < 30) {
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
  }, [mounted, gameState, playerSpeed, enemyAttackPlayer, powerUps, playerX, playerY, collectPowerUp]);

  if (!mounted) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
      {gameState === 'MENU' && (
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold text-white mb-4">Resolution Warrior</h1>
          <p className="text-xl text-gray-300 mb-8">Battle through 12 months to keep your New Year's resolutions!</p>
          <div className="space-y-4">
            <button
              onClick={() => startLevel(currentMonth)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-xl font-bold transition"
            >
              Start Game
            </button>
            {hasSavedGame && (
              <button
                onClick={loadGame}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-xl font-bold transition block mx-auto"
              >
                Continue
              </button>
            )}
          </div>
          <div className="mt-8 text-gray-400">
            <p>Controls: A/D - Move | Z - Punch | X - Kick | Space - Block | W - Jump</p>
          </div>
        </div>
      )}

      {gameState === 'COMBAT' && enemy && (
        <div className="w-full max-w-4xl">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">{MONTHS[currentMonth]}</h2>
              <div className="flex items-center gap-2">
                <span className="text-white">Player HP:</span>
                <div className="w-48 h-6 bg-gray-700 rounded">
                  <div
                    className="h-full bg-green-500 rounded transition-all"
                    style={{ width: `${(playerHealth / playerMaxHealth) * 100}%` }}
                  />
                </div>
                <span className="text-white">{playerHealth}/{playerMaxHealth}</span>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold" style={{ color: enemy.color }}>{enemy.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-white">Enemy HP:</span>
                <div className="w-48 h-6 bg-gray-700 rounded">
                  <div
                    className="h-full bg-red-500 rounded transition-all"
                    style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }}
                  />
                </div>
                <span className="text-white">{enemy.health}/{enemy.maxHealth}</span>
              </div>
            </div>
          </div>

          <div className="relative w-full h-96 bg-gray-800 rounded-lg overflow-hidden border-4 border-gray-700">
            {/* Player */}
            <div
              className="absolute transition-all duration-100"
              style={{
                left: `${playerX}px`,
                bottom: `${isJumping ? playerY + 50 : playerY}px`,
                transform: facingRight ? 'scaleX(1)' : 'scaleX(-1)',
              }}
            >
              <div className="relative">
                {/* Head */}
                <div className="w-8 h-8 bg-yellow-600 rounded-full absolute -top-8 left-1" />
                {/* Body */}
                <div className="w-10 h-12 bg-blue-600 rounded" />
                {/* Arms */}
                <div
                  className={`w-6 h-2 bg-yellow-600 absolute top-2 transition-all ${
                    isAttacking && attackType === 'punch' ? 'left-10' : 'left-8'
                  }`}
                />
                {/* Legs */}
                <div
                  className={`w-3 h-8 bg-blue-800 absolute top-12 left-1 transition-all ${
                    isAttacking && attackType === 'kick' ? 'left-8' : ''
                  }`}
                />
                <div className="w-3 h-8 bg-blue-800 absolute top-12 left-6" />
                {/* Block indicator */}
                {isBlocking && (
                  <div className="absolute -left-4 top-0 w-16 h-16 border-4 border-yellow-400 rounded opacity-50" />
                )}
              </div>
            </div>

            {/* Enemy */}
            <div
              className="absolute transition-all duration-100"
              style={{
                left: `${enemyX}px`,
                bottom: `${enemyY}px`,
                transform: 'scaleX(-1)',
              }}
            >
              <div className="relative">
                {/* Head */}
                <div className="w-8 h-8 rounded-full absolute -top-8 left-1" style={{ backgroundColor: enemy.color }} />
                {/* Body */}
                <div className="w-10 h-12 rounded" style={{ backgroundColor: enemy.color, opacity: 0.8 }} />
                {/* Arms */}
                <div className="w-6 h-2 absolute top-2 left-8" style={{ backgroundColor: enemy.color }} />
                {/* Legs */}
                <div className="w-3 h-8 absolute top-12 left-1" style={{ backgroundColor: enemy.color, opacity: 0.6 }} />
                <div className="w-3 h-8 absolute top-12 left-6" style={{ backgroundColor: enemy.color, opacity: 0.6 }} />
                {enemy.isBoss && (
                  <div className="absolute -top-12 left-0 text-yellow-400 text-xs font-bold">BOSS</div>
                )}
              </div>
            </div>

            {/* Power-ups */}
            {powerUps.map(powerUp => (
              <div
                key={powerUp.id}
                className="absolute w-6 h-6 rounded animate-bounce"
                style={{
                  left: `${powerUp.x}px`,
                  bottom: `${powerUp.y}px`,
                  backgroundColor:
                    powerUp.type === 'HEALTH' ? '#00FF00' :
                    powerUp.type === 'ATTACK' ? '#FF0000' :
                    powerUp.type === 'DEFENSE' ? '#0000FF' : '#FFFF00',
                }}
              />
            ))}

            {/* Particles */}
            {particles.map(particle => (
              <div
                key={particle.id}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${particle.x}px`,
                  bottom: `${particle.y}px`,
                  backgroundColor: particle.color,
                  opacity: particle.life,
                }}
              />
            ))}
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="text-white space-y-1">
              <p>ATK: {playerAttack} | DEF: {playerDefense} | SPD: {playerSpeed}</p>
            </div>
            <button
              onClick={saveGame}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-bold transition"
            >
              Save Game
            </button>
          </div>
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="text-center space-y-6">
          <h2 className="text-5xl font-bold text-green-400">Victory!</h2>
          <p className="text-2xl text-white">You conquered {MONTHS[currentMonth]}!</p>
          {currentMonth < 11 ? (
            <button
              onClick={() => {
                setCurrentMonth(prev => prev + 1);
                startLevel(currentMonth + 1);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-xl font-bold transition"
            >
              Next Month
            </button>
          ) : (
            <div>
              <h3 className="text-3xl text-yellow-400 mb-4">You completed all 12 months!</h3>
              <button
                onClick={() => {
                  setCurrentMonth(0);
                  setPlayerHealth(100);
                  setPlayerMaxHealth(100);
                  setPlayerAttack(15);
                  setPlayerDefense(5);
                  setPlayerSpeed(5);
                  setGameState('MENU');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-xl font-bold transition"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="text-center space-y-6">
          <h2 className="text-5xl font-bold text-red-400">Game Over</h2>
          <p className="text-2xl text-white">You fell to {enemy?.name} in {MONTHS[currentMonth]}</p>
          <div className="space-x-4">
            <button
              onClick={() => {
                setPlayerHealth(100);
                startLevel(currentMonth);
              }}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-4 rounded-lg text-xl font-bold transition"
            >
              Retry
            </button>
            <button
              onClick={() => {
                setCurrentMonth(0);
                setPlayerHealth(100);
                setPlayerMaxHealth(100);
                setPlayerAttack(15);
                setPlayerDefense(5);
                setPlayerSpeed(5);
                setGameState('MENU');
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-4 rounded-lg text-xl font-bold transition"
            >
              Main Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

