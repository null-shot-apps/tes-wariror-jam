'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

type GameState = 'MENU' | 'RUNNING' | 'ENCOUNTER' | 'COMBAT' | 'VICTORY' | 'GAME_OVER';

interface Enemy {
  name: string;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  color: string;
}

interface Player {
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  x: number;
  y: number;
  velocityY: number;
  isJumping: boolean;
  facingRight: boolean;
  isPunching: boolean;
  isKicking: boolean;
  isBlocking: boolean;
  powerUps: string[];
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

const MONTHS = [
  { name: 'January', enemy: 'Procrastination', color: '#60A5FA', difficulty: 1 },
  { name: 'February', enemy: 'Self-Doubt', color: '#F472B6', difficulty: 1.2 },
  { name: 'March', enemy: 'Distraction', color: '#34D399', difficulty: 1.4 },
  { name: 'April', enemy: 'Laziness', color: '#FBBF24', difficulty: 1.6 },
  { name: 'May', enemy: 'Fear', color: '#A78BFA', difficulty: 1.8 },
  { name: 'June', enemy: 'Burnout', color: '#FB923C', difficulty: 2.0 },
  { name: 'July', enemy: 'Temptation', color: '#EC4899', difficulty: 2.2 },
  { name: 'August', enemy: 'Anxiety', color: '#8B5CF6', difficulty: 2.4 },
  { name: 'September', enemy: 'Stress', color: '#EF4444', difficulty: 2.6 },
  { name: 'October', enemy: 'Doubt', color: '#F59E0B', difficulty: 2.8 },
  { name: 'November', enemy: 'Exhaustion', color: '#6366F1', difficulty: 3.0 },
  { name: 'December', enemy: 'Final Boss', color: '#DC2626', difficulty: 3.5 }
];

const POWER_UPS = [
  { name: 'Health Boost', effect: 'health', value: 30, color: '#10B981' },
  { name: 'Attack Up', effect: 'attack', value: 5, color: '#EF4444' },
  { name: 'Defense Up', effect: 'defense', value: 5, color: '#3B82F6' },
  { name: 'Speed Boost', effect: 'speed', value: 1.5, color: '#F59E0B' }
];

export default function ResolutionWarrior() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [player, setPlayer] = useState<Player>({
    health: 100,
    maxHealth: 100,
    attack: 10,
    defense: 5,
    x: 100,
    y: 300,
    velocityY: 0,
    isJumping: false,
    facingRight: true,
    isPunching: false,
    isKicking: false,
    isBlocking: false,
    powerUps: []
  });
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(0);
  const [savedProgress, setSavedProgress] = useState(false);
  const keysPressed = useRef<Set<string>>(new Set());
  const particleIdCounter = useRef(0);
  const animationFrameRef = useRef<number>();

  // Initialize enemy for current level
  const initializeEnemy = useCallback(() => {
    const month = MONTHS[currentLevel];
    const baseHealth = 50 + (currentLevel * 20);
    setEnemy({
      name: month.enemy,
      health: baseHealth,
      maxHealth: baseHealth,
      attack: 8 + (currentLevel * 2),
      defense: 3 + currentLevel,
      color: month.color
    });
  }, [currentLevel]);

  // Start game
  const startGame = () => {
    setGameState('RUNNING');
    setCurrentLevel(0);
    setPlayer(prev => ({
      ...prev,
      health: 100,
      maxHealth: 100,
      attack: 10,
      defense: 5,
      powerUps: []
    }));
    setScore(0);
    setMessage('');
  };

  // Load saved progress
  const loadProgress = () => {
    const saved = localStorage.getItem('resolutionWarriorProgress');
    if (saved) {
      const data = JSON.parse(saved);
      setCurrentLevel(data.level);
      setPlayer(prev => ({ ...prev, ...data.player }));
      setScore(data.score);
      setGameState('RUNNING');
      setMessage('Progress loaded!');
    }
  };

  // Save progress
  const saveProgress = () => {
    const data = {
      level: currentLevel,
      player: {
        health: player.health,
        maxHealth: player.maxHealth,
        attack: player.attack,
        defense: player.defense,
        powerUps: player.powerUps
      },
      score
    };
    localStorage.setItem('resolutionWarriorProgress', JSON.stringify(data));
    setSavedProgress(true);
    setMessage('Progress saved!');
    setTimeout(() => {
      setSavedProgress(false);
      setMessage('');
    }, 2000);
  };

  // Start encounter
  useEffect(() => {
    if (gameState === 'RUNNING') {
      setGameState('ENCOUNTER');
      initializeEnemy();
      setTimeout(() => {
        setGameState('COMBAT');
      }, 2000);
    }
  }, [gameState, initializeEnemy]);

  // Create particles
  const createParticles = (x: number, y: number, color: string, count: number = 10) => {
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
        size: Math.random() * 4 + 2
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Player attack
  const playerAttack = (type: 'punch' | 'kick') => {
    if (!enemy || player.isBlocking || gameState !== 'COMBAT') return;

    const damage = type === 'punch' ? player.attack : player.attack * 1.5;
    const actualDamage = Math.max(1, Math.floor(damage - enemy.defense));
    
    setEnemy(prev => prev ? { ...prev, health: Math.max(0, prev.health - actualDamage) } : null);
    createParticles(600, 250, enemy.color, 15);
    
    if (type === 'punch') {
      setPlayer(prev => ({ ...prev, isPunching: true }));
      setTimeout(() => setPlayer(prev => ({ ...prev, isPunching: false })), 200);
    } else {
      setPlayer(prev => ({ ...prev, isKicking: true }));
      setTimeout(() => setPlayer(prev => ({ ...prev, isKicking: false })), 300);
    }

    // Enemy counter-attack
    setTimeout(() => {
      if (enemy && enemy.health > 0) {
        enemyAttack();
      }
    }, 500);
  };

  // Enemy attack
  const enemyAttack = () => {
    if (!enemy || player.isBlocking) return;

    const damage = enemy.attack;
    const actualDamage = player.isBlocking ? 0 : Math.max(1, Math.floor(damage - player.defense));
    
    setPlayer(prev => ({ ...prev, health: Math.max(0, prev.health - actualDamage) }));
    createParticles(player.x + 30, player.y + 30, '#EF4444', 10);
  };

  // Check victory/defeat
  useEffect(() => {
    if (gameState === 'COMBAT' && enemy) {
      if (enemy.health <= 0) {
        setGameState('VICTORY');
        const levelScore = 100 * (currentLevel + 1);
        setScore(prev => prev + levelScore);
        setMessage(`${MONTHS[currentLevel].enemy} defeated! +${levelScore} points`);
        
        // Random power-up
        if (Math.random() > 0.5) {
          const powerUp = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
          setPlayer(prev => {
            const updated = { ...prev, powerUps: [...prev.powerUps, powerUp.name] };
            if (powerUp.effect === 'health') {
              updated.health = Math.min(prev.maxHealth, prev.health + powerUp.value);
            } else if (powerUp.effect === 'attack') {
              updated.attack += powerUp.value;
            } else if (powerUp.effect === 'defense') {
              updated.defense += powerUp.value;
            }
            return updated;
          });
          setMessage(prev => prev + ` | Power-up: ${powerUp.name}!`);
        }

        setTimeout(() => {
          if (currentLevel < MONTHS.length - 1) {
            setCurrentLevel(prev => prev + 1);
            setGameState('RUNNING');
          } else {
            setMessage('🎉 You conquered all 12 months! Resolution achieved!');
          }
        }, 3000);
      } else if (player.health <= 0) {
        setGameState('GAME_OVER');
        setMessage('Game Over! Your resolutions crumbled...');
      }
    }
  }, [enemy, player.health, gameState, currentLevel]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());

      if (gameState === 'COMBAT') {
        if (e.key.toLowerCase() === 'z' && !player.isBlocking) {
          playerAttack('punch');
        } else if (e.key.toLowerCase() === 'x' && !player.isBlocking) {
          playerAttack('kick');
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
  }, [gameState, player.isBlocking, player.isJumping]);

  // Physics and particles update
  useEffect(() => {
    const update = () => {
      // Update player physics
      setPlayer(prev => {
        let newY = prev.y + prev.velocityY;
        let newVelocityY = prev.velocityY + 0.8; // gravity
        let newIsJumping = prev.isJumping;

        if (newY >= 300) {
          newY = 300;
          newVelocityY = 0;
          newIsJumping = false;
        }

        return {
          ...prev,
          y: newY,
          velocityY: newVelocityY,
          isJumping: newIsJumping
        };
      });

      // Update particles
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.02
          }))
          .filter(p => p.life > 0)
      );

      animationFrameRef.current = requestAnimationFrame(update);
    };

    animationFrameRef.current = requestAnimationFrame(update);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Menu screen
  if (gameState === 'MENU') {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-purple-900 via-blue-900 to-black flex flex-col items-center justify-center text-white">
        <h1 className="text-6xl font-bold mb-4 animate-pulse">⚔️ Resolution Warrior ⚔️</h1>
        <p className="text-xl mb-8">Battle through 12 months to achieve your New Year&apos;s resolutions!</p>
        <div className="flex flex-col gap-4">
          <button
            onClick={startGame}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-2xl font-bold transition-all transform hover:scale-105"
          >
            Start New Game
          </button>
          {localStorage.getItem('resolutionWarriorProgress') && (
            <button
              onClick={loadProgress}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-2xl font-bold transition-all transform hover:scale-105"
            >
              Continue
            </button>
          )}
        </div>
        <div className="mt-12 text-center text-sm opacity-75">
          <p>Controls: Z = Punch | X = Kick | Space = Block | W/↑ = Jump</p>
        </div>
      </div>
    );
  }

  // Encounter screen
  if (gameState === 'ENCOUNTER' && enemy) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center text-white">
        <h2 className="text-4xl font-bold mb-4">{MONTHS[currentLevel].name}</h2>
        <h3 className="text-6xl font-bold mb-8 animate-pulse" style={{ color: enemy.color }}>
          {enemy.name}
        </h3>
        <p className="text-2xl">Prepare for battle!</p>
      </div>
    );
  }

  // Combat screen
  return (
    <div className="h-screen w-full bg-gradient-to-br from-gray-800 via-gray-900 to-black overflow-hidden relative">
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex justify-between items-start">
          {/* Player stats */}
          <div className="bg-black/50 p-4 rounded-lg">
            <h3 className="text-white font-bold mb-2">Warrior</h3>
            <div className="w-48 bg-gray-700 rounded-full h-4 mb-2">
              <div
                className="bg-green-500 h-4 rounded-full transition-all"
                style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
              />
            </div>
            <p className="text-white text-sm">{player.health} / {player.maxHealth} HP</p>
            <p className="text-yellow-400 text-xs mt-1">ATK: {player.attack} | DEF: {player.defense}</p>
            {player.powerUps.length > 0 && (
              <p className="text-purple-400 text-xs mt-1">Power-ups: {player.powerUps.length}</p>
            )}
          </div>

          {/* Level and score */}
          <div className="bg-black/50 p-4 rounded-lg text-center">
            <h3 className="text-white font-bold">{MONTHS[currentLevel].name}</h3>
            <p className="text-yellow-400 text-xl font-bold">Score: {score}</p>
            <button
              onClick={saveProgress}
              className={`mt-2 px-3 py-1 rounded text-sm ${
                savedProgress ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {savedProgress ? '✓ Saved' : 'Save Progress'}
            </button>
          </div>

          {/* Enemy stats */}
          {enemy && (
            <div className="bg-black/50 p-4 rounded-lg">
              <h3 className="text-white font-bold mb-2">{enemy.name}</h3>
              <div className="w-48 bg-gray-700 rounded-full h-4 mb-2">
                <div
                  className="h-4 rounded-full transition-all"
                  style={{
                    width: `${(enemy.health / enemy.maxHealth) * 100}%`,
                    backgroundColor: enemy.color
                  }}
                />
              </div>
              <p className="text-white text-sm">{enemy.health} / {enemy.maxHealth} HP</p>
              <p className="text-red-400 text-xs mt-1">ATK: {enemy.attack} | DEF: {enemy.defense}</p>
            </div>
          )}
        </div>
      </div>

      {/* Game area */}
      <div className="absolute inset-0 flex items-end justify-between px-12 pb-12">
        {/* Player */}
        <div
          className="relative transition-all duration-100"
          style={{
            transform: `translate(${player.x}px, ${-player.y}px)`,
          }}
        >
          <div className={`text-6xl ${player.isBlocking ? 'opacity-50' : ''}`}>
            {player.isPunching ? '🥊' : player.isKicking ? '🦵' : player.isBlocking ? '🛡️' : '🧍'}
          </div>
        </div>

        {/* Enemy */}
        {enemy && enemy.health > 0 && (
          <div className="text-6xl animate-bounce">
            👹
          </div>
        )}
      </div>

      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: p.life
          }}
        />
      ))}

      {/* Message */}
      {message && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/75 text-white px-6 py-3 rounded-lg text-xl font-bold">
          {message}
        </div>
      )}

      {/* Controls reminder */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/50 text-sm">
        Z: Punch | X: Kick | Space: Block | W/↑: Jump
      </div>

      {/* Victory/Game Over overlay */}
      {(gameState === 'VICTORY' || gameState === 'GAME_OVER') && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
          <div className="text-center">
            <h2 className={`text-6xl font-bold mb-8 ${gameState === 'VICTORY' ? 'text-green-400' : 'text-red-400'}`}>
              {gameState === 'VICTORY' ? '🎉 Victory! 🎉' : '💀 Game Over 💀'}
            </h2>
            <p className="text-white text-2xl mb-8">{message}</p>
            {currentLevel >= MONTHS.length - 1 && gameState === 'VICTORY' ? (
              <button
                onClick={() => setGameState('MENU')}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-2xl font-bold"
              >
                Return to Menu
              </button>
            ) : (
              <button
                onClick={() => setGameState('MENU')}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-2xl font-bold"
              >
                Return to Menu
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

