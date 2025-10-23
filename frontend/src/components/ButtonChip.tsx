import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

export interface ButtonChipProps {
  index?: number;
  text: string;
  onSelect?: (text: string) => void;
}

export default function ButtonChip({ index, text, onSelect }: ButtonChipProps) {
  const handleClick = () => {
    onSelect?.(text);
  };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={text ? 'default' : 'icon'}
            className="chip text-base"
            type="button"
            role="listitem"
            aria-label={`Δείγμα ${index ?? 0}: ${text}`}
            onClick={handleClick}
          >
            {text}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
