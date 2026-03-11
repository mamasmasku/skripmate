import { motion } from 'motion/react';

interface StyleButtonProps {
  number: number;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}

export default function StyleButton({ number, title, description, isActive, onClick }: StyleButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative flex flex-col items-start p-4 rounded-xl border transition-all text-left w-full h-full ${
        isActive
          ? 'bg-purple-900/40 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
          : 'bg-gray-800/40 border-gray-700 hover:border-gray-500 hover:bg-gray-800/60'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span
          className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
            isActive ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300'
          }`}
        >
          {number}
        </span>
        <h3 className={`font-bold text-lg ${isActive ? 'text-yellow-400' : 'text-white'}`}>{title}</h3>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </motion.button>
  );
}
