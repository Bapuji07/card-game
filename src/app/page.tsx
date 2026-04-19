'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { PlayingCard } from '@/components/PlayingCard';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import useSound from 'use-sound';

let socket: Socket;

export default function Home() {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [room, setRoom] = useState<any>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [takeCount, setTakeCount] = useState(5);

  // Sound effects
  const [playClick] = useSound('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', { volume: 0.5 });
  const [playWin] = useSound('https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3', { volume: 0.5 });
  const [playDeal] = useSound('https://assets.mixkit.co/active_storage/sfx/2592/2592-preview.mp3', { volume: 0.3 });

  const triggerVictory = useCallback(() => {
    playWin();
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#fbbf24', '#34d399', '#ffffff']
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#fbbf24', '#34d399', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [playWin]);

  useEffect(() => {
    socket = io();

    socket.on('room-created', (newRoom) => {
      setRoom(newRoom);
      setIsJoined(true);
    });

    socket.on('room-updated', (updatedRoom) => {
      setRoom((prev: any) => {
        // Play deal sound if card count changed
        const prevCards = (prev?.challengerPile?.length || 0) + (prev?.dealerPile?.length || 0);
        const newCards = (updatedRoom?.challengerPile?.length || 0) + (updatedRoom?.dealerPile?.length || 0);
        if (newCards > prevCards) {
          playDeal();
        }
        
        if (updatedRoom.gameState === 'FINISHED' && prev?.gameState !== 'FINISHED') {
          triggerVictory();
        }
        return updatedRoom;
      });
    });

    socket.on('error', (msg) => {
      alert(msg);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = () => {
    playClick();
    if (!playerName) return alert('Enter name');
    socket.emit('create-room', { playerName });
  };

  const joinRoom = () => {
    playClick();
    if (!playerName || !roomId) return alert('Enter name and room ID');
    socket.emit('join-room', { roomId, playerName });
    setIsJoined(true);
  };

  const startGame = () => {
    playClick();
    socket.emit('start-game', room.id);
  };

  const takeCards = () => {
    playClick();
    socket.emit('take-cards', { roomId: room.id, count: takeCount });
  };

  const selectSide = (side: string) => {
    playClick();
    socket.emit('select-side', { roomId: room.id, side });
  };

  const placeBet = (amount: number) => {
    playClick();
    socket.emit('place-bet', { roomId: room.id, amount });
  };

  const startDealing = () => {
    playClick();
    socket.emit('start-dealing', room.id);
  };

  const dealNext = () => {
    playClick();
    socket.emit('deal-next', room.id);
  };

  const myPlayer = room?.players.find(p => p.id === socket.id);
  const isChallenger = myPlayer?.role === 'challenger';
  const isDealer = myPlayer?.role === 'dealer';

  if (!isJoined) {
    return (
      <main className="min-h-screen bg-green-900 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center text-green-800">The Target Game</h1>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your Name"
              className="w-full p-3 border rounded text-black"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <div className="border-t pt-4">
              <button
                onClick={createRoom}
                className="w-full bg-green-600 text-white p-3 rounded font-bold hover:bg-green-700 transition"
              >
                Create New Room
              </button>
            </div>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-gray-400">OR</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>
            <input
              type="text"
              placeholder="Room ID (e.g. AB123)"
              className="w-full p-3 border rounded text-black uppercase"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button
              onClick={joinRoom}
              className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 transition"
            >
              Join Room
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-green-900 text-white p-4">
      <header className="flex justify-between items-center mb-8 border-b border-green-700 pb-4">
        <div>
          <h2 className="text-xl font-bold">Room: <span className="text-yellow-400">{room?.id}</span></h2>
          <p className="text-sm opacity-75">Role: <span className="capitalize">{myPlayer?.role}</span> | Wallet: <span className="text-yellow-400 font-bold">${myPlayer?.balance.toFixed(2)}</span></p>
        </div>
        <div className="text-right">
          <p className="font-bold">{room?.players.length} Players</p>
          <div className="flex -space-x-2 justify-end mt-1">
            {room?.players.map((p, i) => (
              <div key={i} title={`${p.name} ($${p.balance.toFixed(0)})`} className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold ${p.id === socket.id ? 'border-yellow-400 bg-yellow-400 text-green-900' : 'border-white bg-white text-green-900'}`}>
                {p.name[0]}
              </div>
            ))}
          </div>
        </div>
      </header>

      {room?.gameState === 'WAITING' && (
        <div className="text-center py-20">
          <h3 className="text-2xl mb-4">Waiting for players...</h3>
          {room.players.length >= 2 ? (
            <button
              onClick={startGame}
              className="bg-yellow-500 text-green-900 px-8 py-3 rounded-full font-bold text-xl shadow-lg hover:bg-yellow-400"
            >
              START GAME
            </button>
          ) : (
            <p>Need at least 2 players to start</p>
          )}
        </div>
      )}

      {(room?.gameState === 'TAKING' || room?.gameState === 'BETTING' || room?.gameState === 'DEALING' || room?.gameState === 'FINISHED') && (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Deck & Betting Stats */}
          <div className="flex flex-col items-center space-y-6">
            <div className="text-center">
              <h3 className="font-bold text-lg mb-2">DECK ({room.deck.length})</h3>
              <div className="relative inline-block">
                <PlayingCard isHidden className="shadow-2xl" />
                {room.gameState === 'TAKING' && isChallenger && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-lg p-2">
                    <p className="text-[10px] uppercase font-bold mb-1">Take count:</p>
                    <input 
                      type="number" 
                      min="1" max="20"
                      value={takeCount}
                      onChange={(e) => setTakeCount(parseInt(e.target.value))}
                      className="w-12 p-1 text-black rounded mb-2 text-center text-xs"
                    />
                    <button onClick={takeCards} className="bg-yellow-400 text-black px-3 py-1 rounded text-xs font-bold uppercase">Confirm</button>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full bg-black/20 p-4 rounded-xl border border-white/10">
              <h4 className="font-bold text-center mb-3 text-sm text-yellow-400 uppercase tracking-widest">Live Pot</h4>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className={`p-2 rounded-lg ${myPlayer?.side === 'challenger' ? 'bg-green-600/30 ring-1 ring-green-400' : 'bg-white/5'}`}>
                  <p className="text-[10px] uppercase opacity-60">Challenger Side</p>
                  <p className="text-xl font-black">${room.totalChallengerBet}</p>
                </div>
                <div className={`p-2 rounded-lg ${myPlayer?.side === 'dealer' ? 'bg-blue-600/30 ring-1 ring-blue-400' : 'bg-white/5'}`}>
                  <p className="text-[10px] uppercase opacity-60">Dealer Side</p>
                  <p className="text-xl font-black">${room.totalDealerBet}</p>
                </div>
              </div>
              {room.totalChallengerBet !== room.totalDealerBet && room.gameState === 'BETTING' && (
                <p className="text-[10px] text-red-400 mt-2 text-center animate-pulse">
                  Unbalanced! Need ${Math.abs(room.totalChallengerBet - room.totalDealerBet)} more on {room.totalChallengerBet > room.totalDealerBet ? 'Dealer' : 'Challenger'} side.
                </p>
              )}
            </div>
          </div>

          {/* Middle Column: Target & Action Buttons */}
          <div className="flex flex-col items-center space-y-4">
            <h3 className="font-bold text-lg text-yellow-400 underline underline-offset-8">TARGET CARD</h3>
            <div className="min-h-[160px] flex items-center justify-center">
              {room.targetCard ? (
                <PlayingCard card={room.targetCard} className="scale-125" />
              ) : (
                <div className="w-24 h-36 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center italic text-white/30 text-xs text-center p-2">
                  Picking target...
                </div>
              )}
            </div>
            
            <div className="w-full space-y-4 py-4">
              {room.gameState === 'BETTING' && (
                <div className="bg-white/10 p-4 rounded-xl space-y-4">
                  <div className="flex justify-center gap-2">
                    <button 
                      onClick={() => selectSide('challenger')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${myPlayer?.side === 'challenger' ? 'bg-green-500 text-white' : 'bg-white/10 text-white/50'}`}
                    >
                      Join Challenger
                    </button>
                    <button 
                      onClick={() => selectSide('dealer')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${myPlayer?.side === 'dealer' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/50'}`}
                    >
                      Join Dealer
                    </button>
                  </div>
                  
                  <div className="flex justify-center gap-2">
                    {[10, 50, 100].map(amt => (
                      <button
                        key={amt}
                        onClick={() => placeBet(amt)}
                        disabled={myPlayer?.balance < amt}
                        className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-30 text-green-900 font-bold px-3 py-2 rounded-lg text-sm shadow-md"
                      >
                        +${amt}
                      </button>
                    ))}
                  </div>

                  {isDealer && (
                    <button
                      onClick={startDealing}
                      disabled={room.totalChallengerBet !== room.totalDealerBet || room.totalChallengerBet === 0}
                      className="w-full bg-blue-500 disabled:bg-gray-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-400 transition"
                    >
                      {room.totalChallengerBet === 0 ? 'WAITING FOR BETS' : room.totalChallengerBet === room.totalDealerBet ? 'START DISTRIBUTION' : 'WAITING FOR MATCH'}
                    </button>
                  )}
                </div>
              )}

              {room.gameState === 'DEALING' && isDealer && (
                <button
                  onClick={dealNext}
                  className="w-full bg-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-red-400 animate-bounce"
                >
                  DEAL NEXT CARD
                </button>
              )}

              {room.gameState === 'FINISHED' && (
                <div className="text-center bg-black/40 p-6 rounded-2xl border-2 border-yellow-400/50">
                  <h4 className="text-3xl font-black text-yellow-400 mb-2 uppercase">
                    {room.winner === 'challenger' ? 'Challenger Side Wins!' : 'Dealer Side Wins!'}
                  </h4>
                  <p className="text-sm opacity-80 mb-4">Pot of ${room.totalChallengerBet + room.totalDealerBet} distributed!</p>
                  <button
                    onClick={startGame}
                    className="bg-green-500 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-green-400 transition"
                  >
                    PLAY AGAIN
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Player Piles */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-bold text-xs uppercase tracking-widest text-green-400">Challenger Pile</h3>
                <span className="text-[10px] bg-green-400/20 px-2 py-0.5 rounded text-green-400">{room.challengerPile.length} cards</span>
              </div>
              <div className="flex flex-wrap justify-center gap-1 min-h-[140px] p-2 bg-white/5 rounded-xl border border-white/10 relative overflow-hidden">
                <AnimatePresence>
                  {room.challengerPile.map((c, i) => (
                    <PlayingCard key={c.id} card={c} className="-ml-16 first:ml-0 scale-75 origin-top shadow-md hover:z-10 transition-transform" />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-bold text-xs uppercase tracking-widest text-blue-400">Dealer Pile</h3>
                <span className="text-[10px] bg-blue-400/20 px-2 py-0.5 rounded text-blue-400">{room.dealerPile.length} cards</span>
              </div>
              <div className="flex flex-wrap justify-center gap-1 min-h-[140px] p-2 bg-white/5 rounded-xl border border-white/10 relative overflow-hidden">
                <AnimatePresence>
                  {room.dealerPile.map((c, i) => (
                    <PlayingCard key={c.id} card={c} className="-ml-16 first:ml-0 scale-75 origin-top shadow-md hover:z-10 transition-transform" />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Tutorial / Help */}
      <footer className="mt-12 p-6 bg-black/20 rounded-xl text-xs max-w-4xl mx-auto border border-white/5">
        <h4 className="font-bold mb-2 text-yellow-400 uppercase tracking-widest">How the Betting Works:</h4>
        <ul className="list-disc list-inside space-y-1 opacity-70">
          <li><strong>Side Selection:</strong> You can choose to join either the Challenger's or Dealer's side.</li>
          <li><strong>P2P Matching:</strong> The game only starts when the total money on the Challenger side matches the total money on the Dealer side.</li>
          <li><strong>Split Pot:</strong> If your side wins, the entire pot (both sides' money) is split among winners based on how much they bet.</li>
          <li><strong>Wallet:</strong> Your balance is saved automatically under your player name.</li>
        </ul>
      </footer>
    </main>
  );
}
