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
  /** 解密后的原始密钥，用于"未改动则不写回"判断 */
  const [originalApiKey, setOriginalApiKey] = useState('');
  const [originalBearer, setOriginalBearer] = useState('');
  const [defaults, setDefaults] = useState<Partial<ProviderInput> | null>(null);

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
        const apiKey = s.apiKey ?? '';
        const bearerToken = s.bearerToken ?? '';
        setOriginalApiKey(apiKey);
        setOriginalBearer(bearerToken);
        setDefaults({
          name: provider.name,
          type: provider.type,
          baseUrl: provider.baseUrl,
          apiKey,
          bearerToken,
          wireApi: provider.wireApi,
          azureApiVersion: provider.azureApiVersion ?? '',
          model: provider.model,
          icon: provider.icon ?? '',
        });
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
    // 未编辑的密钥：与服务端原值相同则置空，跳过 setEncryptedSecrets
    const payload: ProviderInput = {
      ...data,
      apiKey: data.apiKey === originalApiKey ? '' : data.apiKey,
      bearerToken: data.bearerToken === originalBearer ? '' : data.bearerToken,
    };
    try {
      const dto = await window.api.providers.update(provider.id, payload);
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

  if (!defaults) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p>正在解密密钥...</p>
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
        defaultValues={defaults}
        onSubmit={handleSubmit}
        onCancel={() => navigate({ to: '/' })}
        submitLabel="保存修改"
      />
      <p className="mt-2 text-xs text-slate-500">
        提示：已自动从密钥链解密预填；如需更换请重新输入，未修改则保留原值。
      </p>
    </div>
  );
}
