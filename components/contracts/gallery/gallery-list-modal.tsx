"use client";

import { useMemo, useState } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Download, Star, Heart, MessageCircle, List as ListIcon, Check } from "lucide-react";
import { GalleryImage } from "@/types/gallery";
import { toast } from "sonner";

interface GalleryListModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: GalleryImage[];
  contractCode?: string;
  reactionCounts?: Record<string, { hearts: number }>;
  commentCountsPerImage?: Record<string, number>;
}

export function GalleryListModal({
  isOpen,
  onClose,
  images,
  contractCode = "ALBUM",
  reactionCounts,
  commentCountsPerImage,
}: GalleryListModalProps) {
  const [activeTab, setActiveTab] = useState("selected");
  const [useComma, setUseComma] = useState(true);
  const [useSpace, setUseSpace] = useState(true);
  const [useNewline, setUseNewline] = useState(false);
  const [showExtension, setShowExtension] = useState(false);
  const [copied, setCopied] = useState(false);

  // Lọc ảnh theo tab
  const filteredImages = useMemo(() => {
    switch (activeTab) {
      case "selected":
        return images.filter(img => img.is_selected);
      case "hearted":
        return images.filter(img => reactionCounts && reactionCounts[img.id] && reactionCounts[img.id].hearts > 0);
      case "commented":
        return images.filter(img => commentCountsPerImage && (commentCountsPerImage[img.id] || 0) > 0);
      case "all":
      default:
        return images;
    }
  }, [images, activeTab, reactionCounts, commentCountsPerImage]);

  const listTitle = useMemo(() => {
    switch (activeTab) {
      case "selected": return `HÌNH ĐƯỢC CHỌN (${contractCode})`;
      case "hearted": return `HÌNH YÊU THÍCH (${contractCode})`;
      case "commented": return `HÌNH CÓ GHI CHÚ (${contractCode})`;
      case "all": return `DANH SÁCH TỔNG (${contractCode})`;
      default: return "DANH SÁCH";
    }
  }, [activeTab, contractCode]);

  // Xử lý tạo chuỗi text
  const listText = useMemo(() => {
    if (filteredImages.length === 0) return "Không có ảnh nào trong danh mục này.";

    const separator = `${useComma ? "," : ""}${useSpace ? " " : ""}${useNewline ? "\n" : ""}`;
    const cleanSeparator = separator === "" ? " " : separator; // fallback nếu cả 3 đều không tick

    const formattedNames = filteredImages.map(img => {
      const name = img.file_name || "Unknown";
      if (showExtension) return name;
      const lastDot = name.lastIndexOf(".");
      return lastDot > 0 ? name.substring(0, lastDot) : name;
    });

    return formattedNames.join(cleanSeparator);
  }, [filteredImages, useComma, useSpace, useNewline, showExtension]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${listTitle}\n${listText}`);
    setCopied(true);
    toast.success("Đã sao chép vào bộ nhớ tạm");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = `${listTitle}\n\n${listText}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contractCode}_${activeTab}_list.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Đã tải xuống danh sách");
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Danh sách ảnh"
    >
      <div className="space-y-4">
        <TabsFilter
          tabs={[
            { label: "Được chọn", value: "selected" },
            { label: "Yêu thích", value: "hearted" },
            { label: "Có ghi chú", value: "commented" },
            { label: "Danh sách tổng", value: "all" },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="pills"
          className="w-full text-caption -mt-2"
        />

        <div className="space-y-3 pt-2">
          <p className="text-body-sm font-medium text-text-primary">Cách trình bày danh sách:</p>
          <div className="grid grid-cols-2 gap-y-3 sm:grid-cols-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={useComma} onChange={(e) => setUseComma(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary" />
              <span className="text-body-sm text-text-main">Dấu phẩy</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={useSpace} onChange={(e) => setUseSpace(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary" />
              <span className="text-body-sm text-text-main">Khoảng cách</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={useNewline} onChange={(e) => setUseNewline(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary" />
              <span className="text-body-sm text-text-main">Xuống dòng</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={showExtension} onChange={(e) => setShowExtension(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary" />
              <span className="text-body-sm text-text-main">Đuôi file</span>
            </label>
          </div>
        </div>

        <div className="rounded-xl bg-bg-hover p-4 mt-2">
          <h3 className="font-bold text-body-base text-text-primary mb-2 uppercase">{listTitle}</h3>
          <div className="text-body-sm text-text-muted whitespace-pre-wrap font-mono min-h-[120px] max-h-[250px] overflow-y-auto custom-scrollbar break-all">
            {listText}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={handleCopy}
            className="w-full h-11 bg-primary/5 text-primary border-transparent hover:bg-primary/10 hover:border-primary/20 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Đã chép" : "Sao chép"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownload}
            className="w-full h-11 bg-primary/5 text-primary border-transparent hover:bg-primary/10 hover:border-primary/20 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Tải về
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}
