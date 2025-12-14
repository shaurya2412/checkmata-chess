import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import computerIcon from '../../public/computer.png';
import { DifficultyLevel } from '../utils/chessEngine';

interface DifficultyOption {
  level: DifficultyLevel;
  label: string;
  description: string;
  depth: number;
}

const difficulties: DifficultyOption[] = [
  {
    level: 'easy',
    label: 'Easy',
    description: 'Perfect for beginners',
    depth: 5,
  },
  {
    level: 'medium',
    label: 'Medium',
    description: 'Moderate challenge',
    depth: 10,
  },
  {
    level: 'hard',
    label: 'Hard',
    description: 'Strong AI opponent',
    depth: 15,
  },
];

export const BotDifficultySelector = () => {
  const navigate = useNavigate();

  return (
    <Card className="bg-transparent border-none">
      <CardHeader className="pb-3 text-center">
        <CardTitle className="font-semibold tracking-wide flex flex-col items-center justify-center">
          <p className="text-white">
            Choose <span className="text-green-600 font-bold pt-1">Difficulty</span>
          </p>
          <img className="pl-1 w-1/4 mt-4" src={computerIcon} alt="computer" />
        </CardTitle>
        <CardDescription className="text-gray-400">
          Select the AI difficulty level
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 mt-4">
        {difficulties.map((difficulty) => (
          <div
            key={difficulty.level}
            onClick={() => navigate(`/game/bot-${difficulty.level}`)}
            className="bg-bgAuxiliary2 flex items-start space-x-4 rounded-sm p-4 transition-all shadow-lg hover:bg-bgAuxiliary3 cursor-pointer"
          >
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-lg font-semibold text-white">{difficulty.label}</p>
                <span className="text-xs text-gray-400">Depth: {difficulty.depth}</span>
              </div>
              <p className="text-sm text-gray-400">{difficulty.description}</p>
            </div>
          </div>
        ))}

      </CardContent>
    </Card>
  );
};




