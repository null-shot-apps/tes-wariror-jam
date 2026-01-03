'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type GameState = 'MENU' | 'RUNNING' | 'ENCOUNTER' | 'COMBAT' | 'VICTORY' | 'GAME_OVER';
type Action = 'PUNCH' | 'KICK' | 'BLOCK' | 'JUMP' | null;

interface Enemy {
  name: string;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  color: string;
}

interface PowerUp {
  type: 'HEALTH' | 'ATTACK' | 'DEFENSE' | 'SPEED';
  name: string;
  description: string;
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
  playerHealth: number;
  playerMaxHealth: number;
  playerAttack: number;
  playerDefense: number;
  playerSpeed: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ENEMIES = [
  { name: 'Procrastination', health: 50, attack: 5, defense: 2, color: '#8B4513' },
  { name: 'Self-Doubt', health: 60, attack: 6, defense: 3, color: '#4B0082' },
  { name: 'Distraction', health: 70, attack: 7, defense: 3, color: '#FF6347' },
  { name: 'Laziness', health: 80, attack: 8, defense: 4, color: '#696969' },
  { name: 'Fear', health: 90, attack: 9, defense: 4, color: '#8B0000' },
  { name: 'Temptation', health: 100, attack: 10, defense: 5, color: '#FF1493' },
  { name: 'Burnout', health: 110, attack: 11, defense: 5, color: '#FF8C00' },
  { name: 'Negativity', health: 120, attack: 12, defense: 6, color: '#2F4F4F' },
  { name: 'Impatience', health: 130, attack: 13, defense: 6, color: '#DC143C' },
  { name: 'Complacency', health: 140, attack: 14, defense: 7, color: '#708090' },
  { name: 'Despair', health: 150, attack: 15, defense: 7, color: '#191970' },
  { name: 'Final Boss', health: 200, attack: 20, defense: 10, color: '#000000' },
];

const POWER_UPS: PowerUp[] = [
  { type: 'HEALTH', name: 'Health Boost', description: '+20 Max Health' },
  { type: 'ATTACK', name: 'Attack Up', description: '+5 Attack' },
  { type: 'DEFENSE', name: 'Defense Up', description: '+3 Defense' },
  { type: 'SPEED', name: 'Speed Boost', description: '+0.2 Speed' },
];

export default function ResolutionWarrior() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [currentMonth, setCurrentMonth] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerMaxHealth, setPlayerMaxHealth] = useState(100);
  const [playerAttack, setPlayerAttack] = useState(10);
  const [playerDefense, setPlayerDefense] = useState(5);
  const [playerSpeed, setPlayerSpeed] = useState(1);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [playerAction, setPlayerAction] = useState<Action>(null);
  const [enemyAction, setEnemyAction] = useState<Action>(null);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [facingRight, setFacingRight] = useState(true);
  const [message, setMessage] = useState('');
  const [powerUp, setPowerUp] = useState<PowerUp | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [hasSave, setHasSave] = useState(false);

  const animationFrameRef = useRef<number>(0);
  const particleIdCounter = useRef(0);
  const lastEnemyAttackRef = useRef(0);

  // Check for save data on mount
  useEffect(() => {
    const saved = localStorage.getItem('resolutionWarriorSave');
    setHasSave(!!saved);
  }, []);

  // Particle animation loop
  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.5, // gravity
            life: p.life - 1,
          }))
          .filter(p => p.life > 0)
      );
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [particles.length]);

  const createParticles = useCallback((x: number, y: number, color: string, count: number = 10) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdCounter.current++,
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 5,
        life: 30 + Math.random() * 20,
        color,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const saveGame = () => {
    const saveData: SaveData = {
      currentMonth,
      playerHealth,
      playerMaxHealth,
      playerAttack,
      playerDefense,
      playerSpeed,
    };
    localStorage.setItem('resolutionWarriorSave', JSON.stringify(saveData));
    setMessage('Game saved!');
    setHasSave(true);
    setTimeout(() => setMessage(''), 2000);
  };

  const loadGame = () => {
    const saved = localStorage.getItem('resolutionWarriorSave');
    if (saved) {
      const data: SaveData = JSON.parse(saved);
      setCurrentMonth(data.currentMonth);
      setPlayerHealth(data.playerHealth);
      setPlayerMaxHealth(data.playerMaxHealth);
      setPlayerAttack(data.playerAttack);
      setPlayerDefense(data.playerDefense);
      setPlayerSpeed(data.playerSpeed);
      setGameState('RUNNING');
      setMessage('Game loaded!');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const startGame = () => {
    setCurrentMonth(0);
    setPlayerHealth(100);
    setPlayerMaxHealth(100);
    setPlayerAttack(10);
    setPlayerDefense(5);
    setPlayerSpeed(1);
    setGameState('RUNNING');
    localStorage.removeItem('resolutionWarriorSave');
    setHasSave(false);
  };

  const startEncounter = () => {
    const enemyData = ENEMIES[currentMonth];
    const difficultyMultiplier = currentMonth === 11 ? 1.5 : 1 + (currentMonth * 0.1);
    
    setEnemy({
      name: enemyData.name,
      health: Math.floor(enemyData.health * difficultyMultiplier),
      maxHealth: Math.floor(enemyData.health * difficultyMultiplier),
      attack: Math.floor(enemyData.attack * difficultyMultiplier),
      defense: Math.floor(enemyData.defense * difficultyMultiplier),
      color: enemyData.color,
    });
    setGameState('COMBAT');
    setIsBlocking(false);
    setIsJumping(false);
    setPlayerAction(null);
    setEnemyAction(null);
    lastEnemyAttackRef.current = Date.now();
  };

  const performPlayerAttack = useCallback((type: 'PUNCH' | 'KICK') => {
    if (!enemy || isBlocking || playerAction) return;

    setPlayerAction(type);
    const damage = type === 'KICK' ? 
      Math.max(1, Math.floor(playerAttack * 1.5) - enemy.defense) :
      Math.max(1, playerAttack - enemy.defense);

    createParticles(600, 250, '#FFD700', 15);

    setTimeout(() => {
      setEnemy(prev => {
        if (!prev) return null;
        const newHealth = Math.max(0, prev.health - damage);
        return { ...prev, health: newHealth };
      });
      setPlayerAction(null);
    }, 300);
  }, [enemy, isBlocking, playerAction, playerAttack, createParticles]);

  const performBlock = useCallback(() => {
    if (playerAction) return;
    setIsBlocking(true);
    setTimeout(() => setIsBlocking(false), 500);
  }, [playerAction]);

  const performJump = useCallback(() => {
    if (isJumping) return;
    setIsJumping(true);
    setTimeout(() => setIsJumping(false), 600);
  }, [isJumping]);

  // Enemy AI
  useEffect(() => {
    if (gameState !== 'COMBAT' || !enemy || enemy.health <= 0) return;

    const enemyAttackInterval = setInterval(() => {
      if (Date.now() - lastEnemyAttackRef.current > 2000 / playerSpeed) {
        setEnemyAction('PUNCH');
        
        const damage = isBlocking || isJumping ? 
          0 : 
          Math.max(1, enemy.attack - playerDefense);

        if (damage > 0) {
          createParticles(400, 250, '#FF0000', 15);
        }

        setTimeout(() => {
          if (!isBlocking && !isJumping) {
            setPlayerHealth(prev => Math.max(0, prev - damage));
          }
          setEnemyAction(null);
        }, 300);

        lastEnemyAttackRef.current = Date.now();
      }
    }, 500);

    return () => clearInterval(enemyAttackInterval);
  }, [gameState, enemy, isBlocking, isJumping, playerDefense, playerSpeed, createParticles]);

  // Check combat end
  useEffect(() => {
    if (gameState !== 'COMBAT') return;

    if (enemy && enemy.health <= 0) {
      // Random power-up drop (30% chance)
      if (Math.random() < 0.3) {
        const randomPowerUp = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
        setPowerUp(randomPowerUp);
      }
      setGameState('VICTORY');
    } else if (playerHealth <= 0) {
      setGameState('GAME_OVER');
    }
  }, [enemy, playerHealth, gameState]);

  const applyPowerUp = () => {
    if (!powerUp) return;

    switch (powerUp.type) {
      case 'HEALTH':
        setPlayerMaxHealth(prev => prev + 20);
        setPlayerHealth(prev => prev + 20);
        break;
      case 'ATTACK':
        setPlayerAttack(prev => prev + 5);
        break;
      case 'DEFENSE':
        setPlayerDefense(prev => prev + 3);
        break;
      case 'SPEED':
        setPlayerSpeed(prev => prev + 0.2);
        break;
    }

    setPowerUp(null);
    continueToNextMonth();
  };

  const continueToNextMonth = () => {
    if (currentMonth < 11) {
      setCurrentMonth(prev => prev + 1);
      setGameState('RUNNING');
      setPowerUp(null);
    } else {
      setGameState('MENU');
      setMessage('🎉 You conquered all 12 months! Your resolutions are complete! 🎉');
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'COMBAT') return;

      switch (e.key.toLowerCase()) {
        case 'z':
          performPlayerAttack('PUNCH');
          break;
        case 'x':
          performPlayerAttack('KICK');
          break;
        case ' ':
          e.preventDefault();
          performBlock();
          break;
        case 'w':
        case 'arrowup':
          e.preventDefault();
          performJump();
          break;
        case 'a':
        case 'arrowleft':
          setFacingRight(false);
          break;
        case 'd':
        case 'arrowright':
          setFacingRight(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, performPlayerAttack, performBlock, performJump]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-black text-white flex flex-col items-center justify-center p-4">
      {/* Particles */}
      <div className="fixed inset-0 pointer-events-none">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: p.x,
              top: p.y,
              backgroundColor: p.color,
              opacity: p.life / 50,
            }}
          />
        ))}
      </div>

      {/* Menu */}
      {gameState === 'MENU' && (
        <div className="text-center space-y-6 z-10">
          <h1 className="text-6xl font-bold mb-8 animate-pulse">⚔️ RESOLUTION WARRIOR ⚔️</h1>
          <p className="text-xl mb-8">Battle through 12 months to achieve your New Year&apos;s resolutions!</p>
          {message && <p className="text-2xl text-green-400 mb-4">{message}</p>}
          <div className="space-y-4">
            <button
              onClick={startGame}
              className="bg-green-600 hover:bg-green-700 px-8 py-4 rounded-lg text-2xl font-bold transition-all transform hover:scale-105"
            >
              NEW GAME
            </button>
            {hasSave && (
              <button
                onClick={loadGame}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-2xl font-bold transition-all transform hover:scale-105 block mx-auto"
              >
                CONTINUE
              </button>
            )}
          </div>
        </div>
      )}

      {/* Running State */}
      {gameState === 'RUNNING' && (
        <div className="text-center space-y-6 z-10">
          <h2 className="text-4xl font-bold">{MONTHS[currentMonth]}</h2>
          <p className="text-xl">Month {currentMonth + 1} of 12</p>
          <p className="text-lg">Your next challenge: {ENEMIES[currentMonth].name}</p>
          <div className="space-y-4">
            <button
              onClick={startEncounter}
              className="bg-red-600 hover:bg-red-700 px-8 py-4 rounded-lg text-2xl font-bold transition-all transform hover:scale-105"
            >
              FACE YOUR CHALLENGE
            </button>
            <button
              onClick={saveGame}
              className="bg-yellow-600 hover:bg-yellow-700 px-8 py-4 rounded-lg text-xl font-bold transition-all transform hover:scale-105 block mx-auto"
            >
              💾 SAVE GAME
            </button>
          </div>
          {message && <p className="text-green-400 text-xl mt-4">{message}</p>}
        </div>
      )}

      {/* Combat */}
      {gameState === 'COMBAT' && enemy && (
        <div className="w-full max-w-4xl space-y-6 z-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold">{MONTHS[currentMonth]} - {enemy.name}</h2>
          </div>

          {/* Health Bars */}
          <div className="flex justify-between items-center gap-8">
            <div className="flex-1">
              <p className="text-lg mb-2">You</p>
              <div className="bg-gray-700 h-8 rounded-full overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${(playerHealth / playerMaxHealth) * 100}%` }}
                />
              </div>
              <p className="text-sm mt-1">{playerHealth} / {playerMaxHealth}</p>
            </div>

            <div className="flex-1">
              <p className="text-lg mb-2">{enemy.name}</p>
              <div className="bg-gray-700 h-8 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(enemy.health / enemy.maxHealth) * 100}%`,
                    backgroundColor: enemy.color,
                  }}
                />
              </div>
              <p className="text-sm mt-1">{enemy.health} / {enemy.maxHealth}</p>
            </div>
          </div>

          {/* Battle Arena */}
          <div className="relative bg-gray-800 h-64 rounded-lg overflow-hidden border-4 border-gray-600">
            {/* Player */}
            <div
              className={`absolute bottom-8 transition-all duration-300 ${
                facingRight ? 'left-20' : 'right-20'
              } ${isJumping ? '-translate-y-20' : ''}`}
            >
              <div className="text-6xl">
                {playerAction === 'PUNCH' && (facingRight ? '🤜' : '🤛')}
                {playerAction === 'KICK' && (facingRight ? '🦵' : '🦵')}
                {isBlocking && '🛡️'}
                {!playerAction && !isBlocking && '🧍'}
              </div>
            </div>

            {/* Enemy */}
            <div className="absolute bottom-8 right-20">
              <div className="text-6xl">
                {enemyAction ? '👊' : '👹'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => performPlayerAttack('PUNCH')}
              disabled={isBlocking || !!playerAction}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-bold transition-all"
            >
              👊 PUNCH (Z)
            </button>
            <button
              onClick={() => performPlayerAttack('KICK')}
              disabled={isBlocking || !!playerAction}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-bold transition-all"
            >
              🦵 KICK (X)
            </button>
            <button
              onClick={performBlock}
              disabled={!!playerAction}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-bold transition-all"
            >
              🛡️ BLOCK (SPACE)
            </button>
            <button
              onClick={performJump}
              disabled={isJumping}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-bold transition-all"
            >
              ⬆️ JUMP (W)
            </button>
          </div>

          {/* Stats */}
          <div className="text-center text-sm space-y-1">
            <p>ATK: {playerAttack} | DEF: {playerDefense} | SPD: {playerSpeed.toFixed(1)}x</p>
          </div>
        </div>
      )}

      {/* Victory with Power-Up */}
      {gameState === 'VICTORY' && (
        <div className="text-center space-y-6 z-10">
          <h2 className="text-5xl font-bold text-green-400">VICTORY! 🎉</h2>
          <p className="text-2xl">You defeated {enemy?.name}!</p>
          
          {powerUp ? (
            <div className="bg-yellow-900 border-4 border-yellow-500 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-3xl font-bold mb-4">✨ POWER-UP! ✨</h3>
              <p className="text-2xl mb-2">{powerUp.name}</p>
              <p className="text-lg mb-4">{powerUp.description}</p>
              <button
                onClick={applyPowerUp}
                className="bg-green-600 hover:bg-green-700 px-8 py-4 rounded-lg text-xl font-bold transition-all transform hover:scale-105"
              >
                CLAIM POWER-UP
              </button>
            </div>
          ) : (
            <button
              onClick={continueToNextMonth}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-2xl font-bold transition-all transform hover:scale-105"
            >
              {currentMonth < 11 ? 'CONTINUE TO NEXT MONTH' : 'FINISH GAME'}
            </button>
          )}
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAME_OVER' && (
        <div className="text-center space-y-6 z-10">
          <h2 className="text-5xl font-bold text-red-400">GAME OVER</h2>
          <p className="text-2xl">You were defeated by {enemy?.name}</p>
          <p className="text-xl">You made it to {MONTHS[currentMonth]}</p>
          <button
            onClick={() => setGameState('MENU')}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-2xl font-bold transition-all transform hover:scale-105"
          >
            RETURN TO MENU
          </button>
        </div>
      )}
    </div>
  );
}

