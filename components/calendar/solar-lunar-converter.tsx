"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Sun, Moon, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedModal } from "@/components/ui/unified-modal";
import {
  getLunarDate,
  lunarToSolar,
  getLunarDetails,
} from "@/lib/lunar-calendar";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenDayDetail: (date: Date) => void;
}

type Mode = "SolarToLunar" | "LunarToSolar";

interface ConversionResult {
  type: string;
  day: number;
  month: number;
  year: number;
  leap: boolean;
  canChi: string;
  weekday: string;
  originalDate: Date;
}

export default function SolarLunarConverter({ isOpen, onClose, onOpenDayDetail }: Props) {
  const [mode, setMode] = useState<Mode>("SolarToLunar");
  const [dayInput, setDayInput] = useState(() => String(new Date().getDate()));
  const [monthInput, setMonthInput] = useState(() => String(new Date().getMonth() + 1));
  const [yearInput, setYearInput] = useState(() => String(new Date().getFullYear()));
  const [isLeap, setIsLeap] = useState(false);
  const dayInputRef = useRef<HTMLInputElement>(null);

  // Reset khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => {
      const now = new Date();
      setDayInput(String(now.getDate()));
      setMonthInput(String(now.getMonth() + 1));
      setYearInput(String(now.getFullYear()));
      setIsLeap(false);
      setMode("SolarToLunar");
      dayInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  // Derived from the current inputs: a click can never use a stale 300ms result.
  const result = useMemo<ConversionResult | null>(() => {
    if (!isOpen || ![dayInput, monthInput, yearInput].every((value) => /^\d+$/.test(value))) {
      return null;
    }

    const day = Number(dayInput);
    const month = Number(monthInput);
    const year = Number(yearInput);
    if (
      ![day, month, year].every(Number.isInteger) ||
      year < 100 || month < 1 || month > 12 || day < 1 || day > 31
    ) {
      return null;
    }

    if (mode === "SolarToLunar") {
      const solarDate = new Date(year, month - 1, day);
      if (
        Number.isNaN(solarDate.getTime()) ||
        solarDate.getFullYear() !== year ||
        solarDate.getMonth() + 1 !== month ||
        solarDate.getDate() !== day
      ) {
        return null;
      }
      const details = getLunarDetails(solarDate);
      return {
        type: "Âm Lịch",
        day: details.lunarDay, month: details.lunarMonth, year: details.lunarYear,
        leap: details.leap,
        canChi: `${details.ngayCanChi}, Tháng ${details.thangCanChi}, Năm ${details.namCanChi}`,
        weekday: details.weekday,
        originalDate: solarDate,
      };
    }

    if (day > 30) return null;
    const solarDate = lunarToSolar(day, month, year, isLeap);
    if (!solarDate) return null;
    const details = getLunarDetails(solarDate);
    return {
      type: "Dương Lịch",
      day: solarDate.getDate(), month: solarDate.getMonth() + 1, year: solarDate.getFullYear(),
      leap: false,
      canChi: `${details.ngayCanChi}, Tháng ${details.thangCanChi}, Năm ${details.namCanChi}`,
      weekday: details.weekday,
      originalDate: solarDate,
    };
  }, [isOpen, dayInput, monthInput, yearInput, mode, isLeap]);

  const switchMode = useCallback((newMode: Mode) => {
    setMode(newMode);
    const now = new Date();
    if (newMode === "SolarToLunar") {
      setDayInput(String(now.getDate())); setMonthInput(String(now.getMonth() + 1)); setYearInput(String(now.getFullYear()));
      setIsLeap(false);
    } else {
      const lunar = getLunarDate(now.getDate(), now.getMonth() + 1, now.getFullYear());
      setDayInput(String(lunar.day)); setMonthInput(String(lunar.month)); setYearInput(String(lunar.year));
      setIsLeap(lunar.leap);
    }
  }, []);

  const handleNavigate = useCallback(() => {
    if (!result) return;
    onOpenDayDetail(result.originalDate);
    onClose();
  }, [result, onClose, onOpenDayDetail]);

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="Đổi Âm/Dương lịch" size="sm">
      {/* Tab Switcher */}
      <div className="bg-bg-hover rounded-lg p-1 flex relative mb-6 mt-4 lg:mt-6">
        <div
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-bg-card rounded-md shadow-sm transition-all duration-300"
          style={{ left: mode === "SolarToLunar" ? 4 : "calc(50% + 2px)" }}
        />
        {/* eslint-disable-next-line react/forbid-elements -- Tab toggle, not an action button */}
        <button
          type="button"
          className={`flex-1 py-2.5 text-body-sm font-semibold relative z-10 transition-colors flex items-center justify-center gap-2 ${mode === "SolarToLunar" ? "text-text-primary" : "text-text-muted"}`}
          onClick={() => switchMode("SolarToLunar")}
          aria-pressed={mode === "SolarToLunar"}
        >
          <Sun className="w-4 h-4 text-warning" />
          Dương → Âm
        </button>
        {/* eslint-disable-next-line react/forbid-elements -- Tab toggle, not an action button */}
        <button
          type="button"
          className={`flex-1 py-2.5 text-body-sm font-semibold relative z-10 transition-colors flex items-center justify-center gap-2 ${mode === "LunarToSolar" ? "text-text-primary" : "text-text-muted"}`}
          onClick={() => switchMode("LunarToSolar")}
          aria-pressed={mode === "LunarToSolar"}
        >
          <Moon className="w-4 h-4 text-info" />
          Âm → Dương
        </button>
      </div>

      {/* Input Fields */}
      <p className="text-caption text-text-muted font-semibold uppercase tracking-wider text-center mb-3">
        Nhập ngày {mode === "SolarToLunar" ? "Dương lịch" : "Âm lịch"}
      </p>
      <div className="grid grid-cols-4 gap-3 mb-2">
        <div className="col-span-1 text-center">
          {/* eslint-disable-next-line react/forbid-elements */}
          <input
            type="number"
            ref={dayInputRef}
            aria-label={mode === "SolarToLunar" ? "Ngày dương lịch" : "Ngày âm lịch"}
            value={dayInput}
            onClick={(e) => e.currentTarget.select()}
            onChange={(e) => setDayInput(e.target.value)}
            className="input-base text-center text-amount px-0! [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
          />
          <span className="text-tiny text-text-muted font-medium mt-1 block uppercase">Ngày</span>
        </div>
        <div className="col-span-1 text-center">
          {/* eslint-disable-next-line react/forbid-elements */}
          <input
            type="number"
            aria-label={mode === "SolarToLunar" ? "Tháng dương lịch" : "Tháng âm lịch"}
            value={monthInput}
            onClick={(e) => e.currentTarget.select()}
            onChange={(e) => setMonthInput(e.target.value)}
            className="input-base text-center text-amount px-0! [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
          />
          <span className="text-tiny text-text-muted font-medium mt-1 block uppercase">Tháng</span>
        </div>
        <div className="col-span-2 text-center">
          {/* eslint-disable-next-line react/forbid-elements */}
          <input
            type="number"
            aria-label={mode === "SolarToLunar" ? "Năm dương lịch" : "Năm âm lịch"}
            value={yearInput}
            onClick={(e) => e.currentTarget.select()}
            onChange={(e) => setYearInput(e.target.value)}
            className="input-base text-center text-amount px-0! [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
          />
          <span className="text-tiny text-text-muted font-medium mt-1 block uppercase">Năm</span>
        </div>
      </div>

      {/* Leap Month Checkbox */}
      <div className={`flex justify-center h-7 mt-2 transition-opacity ${mode === "LunarToSolar" ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          {/* eslint-disable-next-line react/forbid-elements -- Checkbox, no Checkbox SSOT exists */}
          <input
            type="checkbox"
            checked={isLeap}
            onChange={(e) => setIsLeap(e.target.checked)}
            className="w-4 h-4 rounded accent-primary"
          />
          <span className="text-body-sm font-medium text-text-secondary">
            Tháng nhuận
          </span>
        </label>
      </div>

      {/* Arrow Divider */}
      <div className="flex justify-center -my-1.5 relative z-10">
        <div className="bg-bg-card rounded-full p-1.5 shadow-sm">
          <ArrowDown className="w-5 h-5 text-text-muted" />
        </div>
      </div>

      {/* Result Card */}
      <div className="mt-2 mb-6 pt-8 pb-5 px-5 bg-bg-hover rounded-lg text-center relative overflow-hidden">
        {result ? (
          <>
            <p className="text-caption text-text-muted font-semibold uppercase tracking-wider mb-2">
              Kết quả {result.type}
            </p>
            <div className="text-primary font-bold text-lg mb-0.5">
              Tháng {result.month}
            </div>
            <div className="text-7xl font-black text-text-primary leading-none tracking-tight mb-1">
              {result.day}
            </div>
            <div className="font-medium text-text-secondary">
              Năm {result.year}
              {result.leap && (
                <span className="bg-warning/15 text-warning text-tiny px-1.5 py-0.5 rounded font-bold ml-1.5">
                  NHUẬN
                </span>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-dashed border-border">
              <div className="text-base text-text-primary font-bold mb-0.5">
                Ngày {result.canChi.split(",")[0]}
              </div>
              <div className="text-caption text-text-muted">
                {result.canChi.split(",").slice(1).join(",")}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 text-body-sm text-info bg-info/10 py-1 px-3 rounded-md">
                {result.weekday}
              </div>
            </div>
            <Button onClick={handleNavigate} className="mt-4 w-full uppercase tracking-widest text-caption">
              Xem chi tiết ngày
            </Button>
          </>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center">
            <Moon className="w-8 h-8 text-text-muted mb-2 opacity-40" />
            <p className="text-body-sm text-text-muted">
              {dayInput && monthInput && yearInput ? "Ngày không hợp lệ" : "Nhập ngày để xem kết quả"}
            </p>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
