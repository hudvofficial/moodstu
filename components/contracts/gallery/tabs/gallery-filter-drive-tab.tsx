import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Radio } from "@/components/ui/radio";
import { initDriveCopyJob, processDriveCopyChunk } from "@/app/actions/gallery-drive-actions";
import { toast } from "sonner";

interface GalleryFilterDriveTabProps {
  totalSelected: number;
  galleryId: string | null;
  contractId: string;
  contractName: string;
}

export function GalleryFilterDriveTab({
  totalSelected,
  galleryId,
  contractId,
  contractName,
}: GalleryFilterDriveTabProps) {
  const [driveFolderName, setDriveFolderName] = useState(`${contractName} Lọc Ảnh`);
  const [isCopyingDrive, setIsCopyingDrive] = useState(false);
  const [driveDestUrl, setDriveDestUrl] = useState<string | null>(null);
  const [driveProgress, setDriveProgress] = useState({ current: 0, total: 0, failed: 0 });

  const handleCopyDrive = async () => {
    if (!galleryId || totalSelected === 0) return;
    
    setIsCopyingDrive(true);
    setDriveProgress({ current: 0, total: 0, failed: 0 });
    setDriveDestUrl(null);
    
    try {
      const initRes = await initDriveCopyJob(galleryId, contractId, driveFolderName);
      
      if (!initRes.success) {
        toast.error(initRes.error || "Lỗi khởi tạo job");
        setIsCopyingDrive(false);
        return;
      }
      
      const { success, error: innerError, jobId, destFolderId, destUrl, filesToCopy, accessToken } = initRes.data as any;
      if (innerError || !success) {
        toast.error(innerError || "Lỗi khởi tạo job");
        setIsCopyingDrive(false);
        return;
      }
      
      if (!filesToCopy || filesToCopy.length === 0) {
        toast.error("Không có file nào để copy");
        setIsCopyingDrive(false);
        return;
      }
      
      setDriveProgress({ current: 0, total: filesToCopy.length, failed: 0 });
      setDriveDestUrl(destUrl);
      
      const CHUNK_SIZE = 10;
      let currentSuccess = 0;
      let currentFailed = 0;
      
      for (let i = 0; i < filesToCopy.length; i += CHUNK_SIZE) {
        const chunk = filesToCopy.slice(i, i + CHUNK_SIZE);
        const chunkRes = await processDriveCopyChunk(jobId, destFolderId, chunk, accessToken);
        
        if (chunkRes.success) {
          if (chunkRes.data?.error) {
            toast.error(chunkRes.data.error);
            setIsCopyingDrive(false);
            return;
          }
          
          if (chunkRes.data?.success) {
            currentSuccess += chunkRes.data.successCount ?? 0;
            currentFailed += chunkRes.data.failedCount ?? 0;
          } else {
            currentFailed += chunk.length;
          }
        } else {
          currentFailed += chunk.length;
        }
        
        setDriveProgress({ current: currentSuccess + currentFailed, total: filesToCopy.length, failed: currentFailed });
      }
      
      toast.success(`Đã copy ${currentSuccess} ảnh lên Drive!`);
    } catch (error: any) {
      toast.error(error.message || "Lỗi không xác định");
    } finally {
      setIsCopyingDrive(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 p-2">
      <div className="space-y-4">
        <h4 className="text-body-sm font-semibold text-text-primary">Vui lòng chọn mục bạn muốn lọc</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Radio name="filterType" defaultChecked />
            <span className="text-body-sm text-text-primary">Ảnh yêu thích</span>
          </label>
          <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
            <Radio name="filterType" disabled />
            <span className="text-body-sm text-text-primary">Ảnh có bình luận</span>
          </label>
          <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
            <Radio name="filterType" disabled />
            <span className="text-body-sm text-text-primary">Ảnh có tag</span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-body-sm font-semibold text-text-primary">Nhập tên thư mục chứa các file ảnh đã lọc</label>
        <Input
          type="text"
          placeholder="Nhập tên thư mục theo ý bạn..."
          className="w-full"
          value={driveFolderName}
          onChange={(e: any) => setDriveFolderName(e.target.value)}
          disabled={isCopyingDrive}
        />
      </div>
      
      <div className="pt-2 flex items-center justify-center gap-3">
        <Button 
          className="h-10 px-6 font-semibold" 
          onClick={handleCopyDrive}
          disabled={isCopyingDrive || totalSelected === 0}
          variant={isCopyingDrive ? "outline" : "primary"}
        >
          {isCopyingDrive ? "Đang xử lý..." : "Bắt đầu lọc"}
        </Button>
        
        <Button 
          className="h-10 px-4" 
          variant="outline"
          disabled={!driveDestUrl || isCopyingDrive}
          onClick={() => driveDestUrl && window.open(driveDestUrl, "_blank")}
        >
          Xem
        </Button>

        <Button 
          className="h-10 px-4" 
          variant="outline"
          disabled={!driveDestUrl || isCopyingDrive}
          onClick={() => {
            if (driveDestUrl) {
              navigator.clipboard.writeText(driveDestUrl);
              toast.success("Đã copy link thư mục!");
            }
          }}
        >
          Sao chép link
        </Button>
      </div>

      {isCopyingDrive && driveProgress.total > 0 && (
        <div className="text-center space-y-2">
          <p className="text-info text-caption font-medium animate-pulse">Đang tạo thư mục & lọc file, vui lòng chờ...</p>
          <div className="flex justify-between text-caption font-medium px-4">
            <span>Tiến độ</span>
            <span>{driveProgress.current} / {driveProgress.total}</span>
          </div>
          <div className="h-1.5 w-full bg-border/50 rounded-full overflow-hidden mx-4">
            <div className="h-full bg-info transition-all duration-300" style={{ width: `${(driveProgress.current / driveProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* THÔNG BÁO HOÀN TẤT / LỖI */}
      {!isCopyingDrive && driveDestUrl && driveProgress.current > 0 && (
        <div className="text-center mt-2">
          {driveProgress.current - driveProgress.failed > 0 ? (
            <p className="text-success text-body-sm font-semibold">Sao chép file thành công</p>
          ) : (
            <p className="text-error text-body-sm font-semibold">Sao chép file thất bại</p>
          )}
          {driveProgress.failed > 0 && (
            <p className="text-error text-caption mt-1">Có {driveProgress.failed} file bị lỗi trong quá trình copy.</p>
          )}
        </div>
      )}
    </div>
  );
}
