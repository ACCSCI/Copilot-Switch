import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ProviderForm } from '@/components/ProviderForm';
import { Button } from '@/components/ui/button';
import { useProviderStore } from '@/stores/providerStore';
import type { ProviderInput } from '@shared/schemas';
import type { ProviderDTO } from '@shared/types';

export function EditProviderPage() {
  const { id } = useParams({ from: '/edit/$id' });
  const navigate = useNavigate();
  const upsert = useProviderStore((s) => s.upsert);
  const providers = useProviderStore((s) => s.providers);
  const [provider, setProvider] = useState<ProviderDTO | null>(null);
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const [bearerToken, setBearerToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    const p = providers.find((x) => x.id === id);
    setProvider(p ?? null);
  }, [id, providers]);

  useEffect(() => {
    if (!provider) return;
    let cancelled = false;
    window.api.providers
      .getSecrets(provider.id)
      .then((s) => {
        if (cancelled) return;
        setApiKey(s.apiKey);
        setBearerToken(s.bearerToken);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(`读取密钥失败: ${String(e)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  async function handleSubmit(data: ProviderInput) {
    if (!provider) return;
    try {
      const dto = await window.api.providers.update(provider.id, data);
      upsert(dto);
      toast.success('已更新');
      void navigate({ to: '/' });
    } catch (e) {
      toast.error(`更新失败: ${String(e)}`);
    }
  }

  if (!provider) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">编辑 {provider.name}</h1>
      </div>
      <ProviderForm
        defaultValues={{
          name: provider.name,
          type: provider.type,
          baseUrl: provider.baseUrl,
          apiKey: apiKey ?? '',
          bearerToken: bearerToken ?? '',
          wireApi: provider.wireApi,
          azureApiVersion: provider.azureApiVersion ?? '',
          model: provider.model,
          icon: provider.icon ?? '',
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate({ to: '/' })}
        submitLabel="保存修改"
      />
      <p className="mt-2 text-xs text-slate-500">
        提示：已自动从密钥链解密预填；如需更换请重新输入。
      </p>
    </div>
  );
}
