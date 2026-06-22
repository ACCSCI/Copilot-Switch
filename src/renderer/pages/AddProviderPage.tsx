import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ProviderForm } from '@/components/ProviderForm';
import { Button } from '@/components/ui/button';
import { useProviderStore } from '@/stores/providerStore';
import type { ProviderInput } from '@shared/schemas';

export function AddProviderPage() {
  const navigate = useNavigate();
  const upsert = useProviderStore((s) => s.upsert);

  async function handleSubmit(data: ProviderInput) {
    try {
      const dto = await window.api.providers.create(data);
      upsert(dto);
      toast.success(`已添加 ${data.name}`);
      void navigate({ to: '/' });
    } catch (e) {
      toast.error(`添加失败: ${String(e)}`);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">添加配置</h1>
      </div>
      <ProviderForm onSubmit={handleSubmit} onCancel={() => navigate({ to: '/' })} />
    </div>
  );
}
