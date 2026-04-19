'use client';

import { motion } from 'framer-motion';

const getCardColor = (suit) => {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-black';
};

const getSuitSymbol = (suit) => {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
    default: return '';
  }
};

export const PlayingCard = ({ card, isHidden = false, className = '' }) => {
  if (isHidden) {
    return (
      <motion.div
        initial={{ rotateY: 180 }}
        animate={{ rotateY: 180 }}
        className={`w-24 h-36 bg-blue-800 rounded-lg border-2 border-white flex items-center justify-center shadow-lg ${className}`}
      >
        <div className="w-16 h-28 border-2 border-white opacity-20 rounded" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`w-24 h-36 bg-white rounded-lg border-2 border-gray-300 flex flex-col justify-between p-2 shadow-lg ${getCardColor(card.suit)} ${className}`}
    >
      <div className="text-xl font-bold leading-none">
        {card.rank}<br />{getSuitSymbol(card.suit)}
      </div>
      <div className="text-3xl self-center">
        {getSuitSymbol(card.suit)}
      </div>
      <div className="text-xl font-bold leading-none self-end rotate-180">
        {card.rank}<br />{getSuitSymbol(card.suit)}
      </div>
    </motion.div>
  );
};
