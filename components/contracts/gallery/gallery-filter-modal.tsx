"use client";

import { useState, useEffect } from "react";
import { Folder, Download, CloudDownload, HardDrive, CheckCircle2, AlertCircle } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { Button } from "@/components/ui/button";
import { isFileSystemAccessSupported, scanDirectoryForFiles, copyFileBetweenHandles, copyRawAndJpgByBasenames, FileSystemDirectoryHandle } from "@/lib/utils/local-file-system";
import { generateExportPack } from "@/lib/utils/export-pack-generator";

interface GalleryFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedJpgNames: string[];
  onCopyDrive: () => void;
  contractCode?: string;
  defaultTab?: "drive" | "local" | "export";
}

export default function GalleryFilterModal({
  isOpen,
  onClose,
  selectedJpgNames,
  onCopyDrive,
  contractCode = "Unknown",
  defaultTab = "local",
}: GalleryFilterModalProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  const [sourceHandle, setSourceHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [destHandle, setDestHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [includeRaw, setIncludeRaw] = useState(true);
  
  const [scanResult, setScanResult] = useState<{ found: number; missing: string[] } | null>(null);
  const [copyProgress, setCopyProgress] = useState({ current: 0, total: 0, skipped: 0 });

  const totalSelected = selectedJpgNames.length;
  const isSupported = isFileSystemAccessSupported();

  const handleClose = () => {
    if (!isCopying) {
      setSourceHandle(null);
      setDestHandle(null);
      setScanResult(null);
      setCopyProgress({ current: 0, total: 0, skipped: 0 });
      onClose();
    }
  };

  const handleSelectSource = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "read" });
      setSourceHandle(handle);
      
      setIsScanning(true);
      const filesInDir = await scanDirectoryForFiles(handle);
      const foundNames = filesInDir.map(f => f.name.toLowerCase());
      
      let foundCount = 0;
      const missing: string[] = [];
      
      selectedJpgNames.forEach(name => {
        if (foundNames.includes(name.toLowerCase())) {
          foundCount++;
        } else {
          missing.push(name);
        }
      });
      
      setScanResult({ found: foundCount, missing });
      setIsScanning(false);
    } catch (e: any) {
      if (e.name !== "AbortError") console.error(e);
      setIsScanning(false);
    }
  };

  const handleSelectDest = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      setDestHandle(handle);
    } catch (e: any) {
      if (e.name !== "AbortError") console.error(e);
    }
  };

  const handleCopyLocal = async () => {
    if (!sourceHandle || !destHandle || totalSelected === 0) return;
    
    setIsCopying(true);
    
    if (includeRaw) {
      // Dùng basename để copy tất cả (RAW + JPG)
      const basenames = selectedJpgNames.map(name => {
        const lastDot = name.lastIndexOf(".");
        return lastDot > 0 ? name.substring(0, lastDot) : name;
      });
      
      await copyRawAndJpgByBasenames(
        sourceHandle, 
        destHandle, 
        basenames, 
        (current, total, skipped) => {
          setCopyProgress({ current, total, skipped });
        }
      );
    } else {
      setCopyProgress({ current: 0, total: totalSelected, skipped: 0 });
      
      const allFiles = await scanDirectoryForFiles(sourceHandle);
      
      for (const targetName of selectedJpgNames) {
        const sourceFileHandle = allFiles.find(f => f.name.toLowerCase() === targetName.toLowerCase());
        if (sourceFileHandle) {
          const result = await copyFileBetweenHandles(sourceFileHandle, destHandle);
          setCopyProgress(prev => ({ 
            current: prev.current + 1, 
            total: prev.total, 
            skipped: prev.skipped + (result.skipped ? 1 : 0) 
          }));
        } else {
          setCopyProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
      }
    }
    
    setIsCopying(false);
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Lọc & Copy Ảnh Đã Chọn"
      description={`Có tổng cộng ${totalSelected} file JPG được chọn. Chọn phương thức lọc dưới đây.`}
    >
      <div className="space-y-4">
        <TabsFilter
          tabs={[
            { label: "Copy tại Local", value: "local" },
            { label: "Google Drive", value: "drive" },
            { label: "Export Pack", value: "export" },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="pills"
          className="w-full"
        />

        <div className="p-1 max-h-[50vh] overflow-y-auto">
          {/* LOCAL TAB */}
          {activeTab === "local" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {!isSupported ? (
                <div className="rounded-xl bg-error/10 p-4 border border-error/20 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-body-sm font-semibold text-error">Trình duyệt không hỗ trợ</p>
                    <p className="text-caption text-error/80">Tính năng này yêu cầu File System Access API (Chrome, Edge mới nhất). Nếu dùng Safari/Firefox, vui lòng chuyển sang tab <strong>Export Pack</strong>.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-caption font-semibold uppercase tracking-wider text-text-muted">1. Thư mục gốc (Chứa toàn bộ ảnh)</label>
                    <div className="flex items-center gap-3">
                      <Button variant={sourceHandle ? "outline" : "primary"} onClick={handleSelectSource} disabled={isCopying || isScanning}>
                        {sourceHandle ? "Đổi thư mục gốc" : "Chọn thư mục gốc..."}
                      </Button>
                      {isScanning && <span className="text-caption text-text-muted animate-pulse">Đang quét...</span>}
                      {sourceHandle && !isScanning && (
                        <span className="text-caption font-medium text-success flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Đã chọn
                        </span>
                      )}
                    </div>
                    {scanResult && (
                      <div className="rounded-lg bg-bg-card p-3 border border-border/50 text-caption mt-2">
                        <ul className="space-y-1">
                          <li className="flex justify-between"><span>Tìm thấy:</span> <span className="font-semibold text-success">{scanResult.found} / {totalSelected}</span></li>
                          <li className="flex justify-between"><span>Thiếu:</span> <span className="font-semibold text-error">{scanResult.missing.length}</span></li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 opacity-50 transition-opacity data-[active=true]:opacity-100" data-active={!!sourceHandle}>
                    <label className="text-caption font-semibold uppercase tracking-wider text-text-muted">2. Thư mục đích (Nơi lưu)</label>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={handleSelectDest} disabled={!sourceHandle || isCopying}>
                        {destHandle ? "Đổi thư mục đích" : "Chọn thư mục lưu..."}
                      </Button>
                      {destHandle && (
                        <span className="text-caption font-medium text-success flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Đã chọn
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Tùy chọn mở rộng */}
                  <div className="pt-2 opacity-50 transition-opacity data-[active=true]:opacity-100" data-active={!!sourceHandle}>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={includeRaw} 
                        onChange={(e) => setIncludeRaw(e.target.checked)} 
                        className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary accent-primary" 
                        disabled={isCopying}
                      />
                      <div>
                        <span className="text-body-sm font-medium text-text-primary block">
                          Tự động copy kèm file RAW và XMP (Smart Matcher)
                        </span>
                        <span className="text-caption text-text-muted mt-0.5 block">
                          Hệ thống sẽ tự động quét và copy mọi file có cùng tên gốc (ví dụ: IMG_1234.CR3, IMG_1234.XMP).
                        </span>
                      </div>
                    </label>
                  </div>

                  {sourceHandle && destHandle && (
                    <div className="pt-4 border-t border-border/50 space-y-3">
                      <Button 
                        className="w-full h-11" 
                        onClick={handleCopyLocal} 
                        disabled={isCopying || (scanResult?.found === 0)}
                      >
                        {isCopying ? "Đang Copy..." : `Bắt đầu Copy (${scanResult?.found} ảnh)`}
                      </Button>

                      {isCopying && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-caption font-medium">
                            <span>Tiến độ</span>
                            <span>{copyProgress.current} / {copyProgress.total}</span>
                          </div>
                          <div className="h-2 w-full bg-border/50 rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(copyProgress.current / copyProgress.total) * 100}%` }} />
                          </div>
                        </div>
                      )}
                      
                      {copyProgress.current > 0 && copyProgress.current === copyProgress.total && (
                        <div className="rounded-lg bg-success/10 p-3 border border-success/20 text-caption text-success flex gap-2">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-semibold">Đã copy xong!</p>
                            <p>Đã bỏ qua (skipped) {copyProgress.skipped} file trùng lặp.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DRIVE TAB */}
          {activeTab === "drive" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-xl bg-info/10 p-4 border border-info/20">
                <p className="text-body-sm text-info font-medium mb-1">Copy trên Google Drive</p>
                <p className="text-caption text-info/80">Hệ thống sẽ tạo thư mục <strong>Selected - {contractCode}</strong> nằm cùng chỗ với thư mục gốc trên Google Drive, và copy các ảnh đã chọn sang đó.</p>
              </div>
              <Button 
                className="w-full h-11" 
                onClick={() => {
                  onCopyDrive();
                  onClose();
                }}
              >
                <CloudDownload className="w-4 h-4 mr-2" />
                Copy trên Google Drive
              </Button>
            </div>
          )}

          {/* EXPORT PACK TAB */}
          {activeTab === "export" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-xl bg-bg-card p-4 border border-border/50">
                <h4 className="text-body font-semibold mb-2">Tải Script Lọc Cục Bộ</h4>
                <p className="text-caption text-text-muted mb-4">Dành cho người dùng Mac/Safari, Firefox. Tải file ZIP chứa danh sách ảnh đã chọn và script tự động lọc.</p>
                
                <div className="space-y-2 mb-4">
                  <p className="text-caption font-medium">Bao gồm:</p>
                  <ul className="text-caption text-text-muted list-disc list-inside ml-1">
                    <li><code>selected-files.txt</code> (Hoặc .txt chứa basename)</li>
                    <li><code>copy-selected.ps1</code> (Cho Windows)</li>
                    <li><code>copy-selected.mjs</code> (Cho macOS / Linux)</li>
                  </ul>
                </div>

                <div className="pt-2 mb-4 border-t border-border/50">
                  <label className="flex items-start gap-2 cursor-pointer mt-3">
                    <input 
                      type="checkbox" 
                      checked={includeRaw} 
                      onChange={(e) => setIncludeRaw(e.target.checked)} 
                      className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary accent-primary" 
                    />
                    <div>
                      <span className="text-body-sm font-medium text-text-primary block">
                        Áp dụng Smart Matcher (Bao gồm RAW)
                      </span>
                      <span className="text-caption text-text-muted mt-0.5 block">
                        Mã Script sẽ tự động tìm và copy các file RAW/XMP có cùng tên gốc thay vì tìm chính xác file JPG.
                      </span>
                    </div>
                  </label>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={async () => {
                    const blob = await generateExportPack(selectedJpgNames, contractCode, includeRaw);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `ExportPack-${contractCode}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Tải về Export Pack (.zip)
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </UnifiedModal>
  );
}
