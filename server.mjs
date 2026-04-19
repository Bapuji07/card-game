import { createServer } from "http";
import { Server } from "socket.io";
import next from "next";
import { createDeck } from "./src/lib/gameUtils.mjs";
import { getBalance, updateBalance } from "./db.mjs";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0"; // Use 0.0.0.0 for cloud deployment
const port = process.env.PORT || 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Adjust this to your production URL later
      methods: ["GET", "POST"]
    }
  });

  const rooms = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create-room", async ({ playerName }) => {
      const roomId = Math.random().toString(36).substring(7).toUpperCase();
      const balance = await getBalance(playerName);
      const player = { 
        id: socket.id, 
        name: playerName, 
        role: 'challenger', 
        balance, 
        side: 'challenger' 
      };
      const room = {
        id: roomId,
        players: [player],
        deck: createDeck(),
        targetCard: null,
        challengerPile: [],
        dealerPile: [],
        gameState: 'WAITING',
        winner: null,
        turn: 0,
        bets: [],
        totalChallengerBet: 0,
        totalDealerBet: 0
      };
      rooms.set(roomId, room);
      socket.join(roomId);
      socket.emit("room-created", room);
    });

    socket.on("join-room", async ({ roomId, playerName }) => {
      const room = rooms.get(roomId.toUpperCase());
      if (room) {
        const balance = await getBalance(playerName);
        const role = room.players.length === 1 ? 'dealer' : 'spectator';
        const side = 'dealer'; 
        const player = { id: socket.id, name: playerName, role, balance, side };
        room.players.push(player);
        socket.join(roomId.toUpperCase());
        io.to(roomId.toUpperCase()).emit("room-updated", room);
      } else {
        socket.emit("error", "Room not found");
      }
    });

    socket.on("select-side", ({ roomId, side }) => {
      const room = rooms.get(roomId);
      if (room) {
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          player.side = side;
          io.to(roomId).emit("room-updated", room);
        }
      }
    });

    socket.on("start-game", (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.players.length >= 2) {
        room.gameState = 'TAKING';
        room.deck = createDeck();
        room.challengerPile = [];
        room.dealerPile = [];
        room.targetCard = null;
        room.winner = null;
        room.bets = [];
        room.totalChallengerBet = 0;
        room.totalDealerBet = 0;
        room.turn = 0;
        io.to(roomId).emit("room-updated", room);
      }
    });

    socket.on("take-cards", ({ roomId, count }) => {
      const room = rooms.get(roomId);
      if (room && room.gameState === 'TAKING') {
        const taken = room.deck.splice(0, count);
        room.targetCard = taken[taken.length - 1];
        room.gameState = 'BETTING';
        io.to(roomId).emit("room-updated", room);
      }
    });

    socket.on("place-bet", async ({ roomId, amount }) => {
      const room = rooms.get(roomId);
      if (room && room.gameState === 'BETTING') {
        const player = room.players.find(p => p.id === socket.id);
        if (player && player.balance >= amount) {
          player.balance -= amount;
          await updateBalance(player.name, -amount);
          
          room.bets.push({ playerId: socket.id, playerName: player.name, side: player.side, amount });
          
          if (player.side === 'challenger') {
            room.totalChallengerBet += amount;
          } else {
            room.totalDealerBet += amount;
          }
          
          io.to(roomId).emit("room-updated", room);
        }
      }
    });

    socket.on("start-dealing", (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.gameState === 'BETTING') {
        if (room.totalChallengerBet === 0 || room.totalDealerBet === 0) {
          socket.emit("error", "Both sides must have bets to start");
          return;
        }
        if (room.totalChallengerBet !== room.totalDealerBet) {
          socket.emit("error", "Bets must be balanced between Challenger and Dealer sides");
          return;
        }
        room.gameState = 'DEALING';
        io.to(roomId).emit("room-updated", room);
      }
    });

    socket.on("deal-next", async (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.gameState === 'DEALING') {
        const card = room.deck.shift();
        if (!card) return;

        const isChallengerTurn = room.turn % 2 === 0;
        if (isChallengerTurn) {
          room.challengerPile.push(card);
        } else {
          room.dealerPile.push(card);
        }

        if (card.rank === room.targetCard.rank) {
          room.gameState = 'FINISHED';
          room.winner = isChallengerTurn ? 'challenger' : 'dealer';
          
          const winningSide = room.winner;
          const totalPot = room.totalChallengerBet + room.totalDealerBet;
          const winners = room.bets.filter(b => b.side === winningSide);
          const totalWinningBets = winningSide === 'challenger' ? room.totalChallengerBet : room.totalDealerBet;

          for (const bet of winners) {
            const share = (bet.amount / totalWinningBets) * totalPot;
            await updateBalance(bet.playerName, share);
            const player = room.players.find(p => p.id === bet.playerId);
            if (player) {
              player.balance = await getBalance(player.name);
            }
          }

          // Update non-winning players' local balances too
          for (const p of room.players) {
            p.balance = await getBalance(p.name);
          }
        }

        room.turn++;
        io.to(roomId).emit("room-updated", room);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
