"use client";

import { useCallback, useState, useTransition } from "react";
import { Activity, CheckCircle2, FlaskConical, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getMoodieBenchmarkDashboard,
  getMoodieBenchmarkPreflight,
  runMoodieBenchmark,
  type MoodieBenchmarkMatrixRow,
  type MoodieBenchmarkReport,
} from "@/app/actions/moodie-benchmark-actions";
import { Button } from "@/components/ui/button";

interface BenchmarkSnapshot {
  routePassRate: number;
  provider: {
    label: string;
    model: string;
  };
}

export function MoodieBenchmarkCard() {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [preflight, setPreflight] = useState<BenchmarkSnapshot | null>(null);
  const [latest, setLatest] = useState<MoodieBenchmarkReport | null>(null);
  const [matrix, setMatrix] = useState<MoodieBenchmarkMatrixRow[]>([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const [preflightResult, dashboardResult] = await Promise.all([
      getMoodieBenchmarkPreflight(),
      getMoodieBenchmarkDashboard(),
    ]);

    if (preflightResult.success) {
      setPreflight({
        routePassRate: preflightResult.data.routePassRate,
        provider: {
          label: preflightResult.data.provider.label,
          model: preflightResult.data.provider.model,
        },
      });
    }

    if (dashboardResult.success) {
      setLatest(dashboardResult.data.latest);
      setMatrix(dashboardResult.data.matrix);
    }

    if (!preflightResult.success || !dashboardResult.success) {
      const errorMessage = !preflightResult.success
        ? preflightResult.error
        : !dashboardResult.success
          ? dashboardResult.error
          : "Không tải được benchmark";
      toast.error(errorMessage);
    }
    setLoading(false);
  }, []);


  function handleRunBenchmark() {
    startTransition(async () => {
      const result = await runMoodieBenchmark();
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setLatest(result.data);
      toast.success(`Benchmark hoàn tất: ${result.data.summary.averageScore}/100`);
      await loadDashboard();
    });
  }

  return (
    <div className="card-base space-y-4 p-4 lg:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FlaskConical className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-text-primary">Moodie Benchmark</h4>
          <p className="mt-1 text-xs text-text-muted">
            Chạy regression suite trên provider/model hiện tại và lưu lịch sử để so sánh combo.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl bg-bg-subtle px-3 py-3 text-xs text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải benchmark...
        </div>
      ) : preflight || latest ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-bg-subtle px-3 py-3">
            <p className="text-caption text-text-muted">Router preflight</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">{preflight?.routePassRate || 0}%</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-subtle px-3 py-3">
            <p className="text-caption text-text-muted">Điểm gần nhất</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">{latest?.summary.averageScore ?? "--"}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-subtle px-3 py-3">
            <p className="text-caption text-text-muted">Pass rate</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">{latest ? `${latest.summary.passRate}%` : "--"}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-subtle px-3 py-3">
            <p className="text-caption text-text-muted">Avg latency</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">{latest ? `${latest.summary.averageLatencyMs}ms` : "--"}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-text-muted">
          Bấm làm mới để tải preflight và lịch sử benchmark, hoặc chạy full suite ngay.
        </div>
      )}

      {preflight ? (
        <p className="text-xs text-text-muted">
          Đang test: <strong className="text-text-primary">{preflight.provider.label}</strong> / {preflight.provider.model}
        </p>
      ) : null}

      {latest ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-primary">Kết quả từng case</p>
          {latest.results.map((result) => (
            <div key={result.caseId} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                {result.passed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-danger" />
                )}
                <span className="truncate text-xs text-text-secondary">{result.caseId}</span>
              </div>
              <span className="text-xs font-semibold text-text-primary">{result.score}</span>
            </div>
          ))}
        </div>
      ) : null}

      {matrix.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-primary">Provider/model matrix</p>
          {matrix.slice(0, 4).map((row) => (
            <div key={row.key} className="rounded-xl bg-bg-subtle px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-medium text-text-primary">{row.providerLabel} / {row.model}</span>
                <span className="font-semibold text-primary">{row.averageScore}</span>
              </div>
              <p className="mt-1 text-text-muted">
                {row.runs} lần • pass {row.averagePassRate}% • {row.averageLatencyMs}ms
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" className="flex-1 gap-2" onClick={handleRunBenchmark} disabled={isPending || loading}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          {isPending ? "Đang benchmark..." : "Chạy full suite"}
        </Button>
        <Button type="button" variant="ghost" className="h-10 w-10 px-0" onClick={() => void loadDashboard()} disabled={loading || isPending} aria-label="Làm mới benchmark">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </div>
  );
}
