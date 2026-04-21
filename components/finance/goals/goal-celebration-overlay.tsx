"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

type GoalMilestone = 25 | 50 | 75 | 100;

const MILESTONE_LABELS: Record<GoalMilestone, { title: string; subtitle: string }> = {
  25: { title: "Khởi động tốt", subtitle: "Bạn đã qua 1/4 chặng đường." },
  50: { title: "Nửa đường rồi", subtitle: "Tiếp tục giữ nhịp đều nhé." },
  75: { title: "Gần đến đích", subtitle: "Chỉ còn một đoạn ngắn nữa thôi." },
  100: { title: "Hoàn thành", subtitle: "Chúc mừng bạn đã đạt mục tiêu." },
};

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function generateParticles(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    left: `${(index * 37 + 13) % 100}%`,
    delay: `${(index * 0.17) % 1.5}s`,
    duration: `${2 + ((index * 0.31) % 2)}s`,
    color: COLORS[index % COLORS.length],
    size: `${6 + ((index * 0.77) % 6)}px`,
  }));
}

export function GoalCelebrationOverlay({
  milestone,
  show,
  onDone,
}: {
  milestone: GoalMilestone;
  show: boolean;
  onDone?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const particles = useMemo(() => generateParticles(milestone === 100 ? 60 : 30), [milestone]);

  useEffect(() => {
    if (!show) return;
    const id = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 3200);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(timer);
    };
  }, [onDone, show]);

  if (!visible) return null;
  const label = MILESTONE_LABELS[milestone];

  return (
    <div className="fixed inset-0 z-overlay pointer-events-none flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p, index) => (
          <div
            key={index}
            className="goal-confetti-particle"
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
              backgroundColor: p.color,
              width: p.size,
              height: p.size,
            }}
          />
        ))}
      </div>

      <div className="goal-celebration-badge bg-bg-card rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-2 border border-border">
        <div className="icon-box bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <p className="text-3xl font-bold text-text-primary tabular-nums">{milestone}%</p>
        <p className="text-body-sm font-semibold text-text-primary">{label.title}</p>
        <p className="text-caption text-text-secondary">{label.subtitle}</p>
      </div>

      <style jsx>{`
        .goal-confetti-particle {
          position: absolute;
          top: -12px;
          border-radius: 2px;
          animation: goal-confetti-fall linear forwards;
          opacity: 0;
        }

        @keyframes goal-confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg) scale(0.5);
          }
        }

        .goal-celebration-badge {
          animation: goal-badge-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          opacity: 0;
          transform: scale(0.3);
        }

        @keyframes goal-badge-pop {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

