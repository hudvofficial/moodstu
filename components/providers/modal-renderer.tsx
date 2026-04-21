"use client";

import { useModal } from "@/lib/context/modal-context";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DriveLinkModalContent } from "@/components/contracts/detail/drive-link-modal";
import { ShareGalleryModalContent } from "@/components/contracts/gallery/share-gallery-modal";

/**
 * Component trung tâm điều phối tất cả Modal trong ứng dụng.
 * Giúp code ở các trang module siêu sạch.
 */
export function GlobalModal() {
  const { isOpen, type, data, closeModal } = useModal();

  if (!type) return null;

  // Render nội dung dựa trên loại Modal
  const renderContent = () => {
    switch (type) {
      case "CONFIRM_DELETE":
        return (
          <div className="flex flex-col gap-6">
            <div className="p-4 bg-error/5 border border-error/10 rounded-xl">
              <p className="text-sm text-text-secondary leading-relaxed">
                {data?.message || "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa dữ liệu này?"}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={closeModal}>Hủy</Button>
              <Button variant="secondary" className="flex-1 bg-error hover:bg-error/90 border-none" onClick={() => {
                data?.onConfirm?.();
                closeModal();
              }}>Xác nhận xóa</Button>
            </div>
          </div>
        );
      
      case "QUICK_SEARCH":
        return (
          <div className="animate-in fade-in zoom-in-95 duration-200">
             <Input
                autoFocus
                className="w-full bg-bg-base border-none text-lg p-0 focus:ring-0 placeholder:text-text-muted"
                placeholder="Tìm khách hàng, hợp đồng..."
             />
             <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs font-medium text-text-muted">Gợi ý tìm kiếm</p>
                <div className="mt-4 flex flex-wrap gap-2">
                   {["Hợp đồng mới", "Váy cưới", "Lịch Media"].map(t => (
                      <span key={t} className="px-3 py-1.5 bg-bg-hover rounded-md text-xs font-semibold text-text-secondary cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors border border-border">
                        {t}
                      </span>
                   ))}
                </div>
             </div>
          </div>
        );

      case "DRIVE_LINK":
        return (
          <DriveLinkModalContent
            contractId={data?.contractId}
            onClose={closeModal}
            onSuccess={() => {
              data?.onSuccess?.();
              closeModal();
            }}
          />
        );

      case "SHARE_GALLERY":
        return (
          <ShareGalleryModalContent
            accessUrl={data?.accessUrl}
            galleryId={data?.galleryId}
            galleryTitle={data?.galleryTitle}
            hasPassword={data?.hasPassword}
          />
        );

      default:
        return <div className="p-10 text-center text-text-muted">Mô-đun đang được xây dựng...</div>;
    }
  };

  // Cấu hình Header cho từng loại Modal
  const getModalConfig = () => {
    switch (type) {
      case "CONFIRM_DELETE":
        return { title: data?.title || "Xác nhận xóa", description: "Hành động quan trọng" };
      case "QUICK_SEARCH":
        return { title: "Tìm kiếm nhanh", description: "Nhấn ESC để đóng" };
      case "DRIVE_LINK":
        return { title: "Gán Link Google Drive", description: "Kết nối folder ảnh từ Drive" };
      case "SHARE_GALLERY":
        return { title: "Chia sẻ Album", description: "Gửi link cho khách hàng xem và chọn ảnh" };
      default:
        return { title: "Thông báo", description: "Hệ thống" };
    }
  };

  const config = getModalConfig();

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={closeModal}
      title={config.title}
      description={config.description}
    >
      {renderContent()}
    </UnifiedModal>
  );
}
