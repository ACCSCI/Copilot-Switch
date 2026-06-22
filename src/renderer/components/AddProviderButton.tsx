import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AddProviderButton() {
  const navigate = useNavigate();
  return (
    <Button variant="brand" onClick={() => navigate({ to: '/add' })} data-testid="add-provider-button">
      <Plus className="size-4" />
      添加配置
    </Button>
  );
}
