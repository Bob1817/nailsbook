import React, { useEffect, useState } from 'react';
import { SubPageHeader } from '../components/SubPageHeader';
import { Card } from '../components/base/Card';
import { Button } from '../components/base/Button';
import { useToast } from '../components/feedback/ToastProvider';
import { authService, type BindingApplication } from '../services/auth';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const BindingApplicationsPage: React.FC = () => {
  const toast = useToast();
  const [apps, setApps] = useState<BindingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await authService.getBindingApplications();
      setApps(data);
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (app: BindingApplication) => {
    setBusyId(app.id);
    try {
      await authService.approveBindingApplication(app.id);
      toast.success(`已通过「${app.name}」的绑定申请`);
      setApps((prev) => prev.filter((a) => a.id !== app.id));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '操作失败，请重试');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (app: BindingApplication) => {
    if (!window.confirm(`确定拒绝「${app.name}」的绑定申请吗？`)) return;
    setBusyId(app.id);
    try {
      await authService.rejectBindingApplication(app.id);
      toast.success('已拒绝该绑定申请');
      setApps((prev) => prev.filter((a) => a.id !== app.id));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '操作失败，请重试');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#faf7f8]">
      <SubPageHeader title="绑定申请" />
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="py-20 text-center text-text-secondary">加载中…</div>
        ) : apps.length === 0 ? (
          <div className="py-20 text-center text-text-secondary">
            暂无待审批的绑定申请
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {apps.map((app) => (
              <Card key={app.id} className="p-4">
                <div className="flex items-start justify-between">
                  <span className="text-[16px] font-semibold text-[#1f2230]">
                    {app.name}
                  </span>
                  <span className="text-[12px] text-text-secondary">
                    {formatTime(app.appliedAt)}
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-1 text-[13px] text-text-secondary">
                  <span>手机：{app.phone || '未填写'}</span>
                  <span>地址：{app.address || '未填写'}</span>
                  {app.note ? <span>备注：{app.note}</span> : null}
                </div>
                <div className="mt-4 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={busyId === app.id}
                    onClick={() => handleReject(app)}
                  >
                    拒绝
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={busyId === app.id}
                    onClick={() => handleApprove(app)}
                  >
                    {busyId === app.id ? '处理中…' : '通过'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
