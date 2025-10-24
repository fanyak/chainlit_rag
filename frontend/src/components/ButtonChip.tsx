import { Button } from '@/components/ui/button';

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
    <Button
      variant="ghost"
      size={text ? 'default' : 'icon'}
      className="chip text-sm"
      type="button"
      role="listitem"
      aria-label={`Δείγμα ${index ?? 0}: ${text}`}
      onClick={handleClick}
    >
      {text}
    </Button>
  );
}
