import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

const DB_FILE = path.join(process.cwd(), 'balances.json');
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'target_game';

let mongoClient = null;
let db = null;

const connectMongo = async () => {
  if (MONGODB_URI && !mongoClient) {
    try {
      mongoClient = new MongoClient(MONGODB_URI);
      await mongoClient.connect();
      db = mongoClient.db(DB_NAME);
      console.log("Connected to MongoDB Atlas");
    } catch (e) {
      console.error("MongoDB connection failed, falling back to JSON file", e);
    }
  }
};

// Initial connection attempt
connectMongo();

export const getBalance = async (playerName) => {
  if (db) {
    const player = await db.collection('players').findOne({ name: playerName });
    if (!player) {
      await db.collection('players').insertOne({ name: playerName, balance: 1000 });
      return 1000;
    }
    return player.balance;
  }

  // Fallback to local file
  const balances = getBalances();
  if (balances[playerName] === undefined) {
    balances[playerName] = 1000;
    saveBalances(balances);
  }
  return balances[playerName];
};

export const updateBalance = async (playerName, amount) => {
  if (db) {
    await db.collection('players').updateOne(
      { name: playerName },
      { $inc: { balance: amount } },
      { upsert: true }
    );
    const player = await db.collection('players').findOne({ name: playerName });
    return player.balance;
  }

  const balances = getBalances();
  balances[playerName] = (balances[playerName] || 1000) + amount;
  saveBalances(balances);
  return balances[playerName];
};

// Helper for local JSON fallback
const getBalances = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}));
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
};

const saveBalances = (balances) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(balances, null, 2));
};
