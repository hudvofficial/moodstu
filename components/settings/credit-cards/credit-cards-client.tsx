"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CreditCard, Banknote, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CreditCardOption } from "@/app/actions/finance-operations-queries";
import CreditCardFormModal from "./credit-card-form-modal";

export default function CreditCardsClient({
  initialCards,
}: {
  initialCards: CreditCardOption[];
}) {
  const router = useRouter();
  const cards = initialCards || [];
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CreditCardOption | null>(null);

  const handleOpenEdit = (card: CreditCardOption) => {
    setSelectedCard(card);
    setIsOpen(true);
  };

  const handleOpenAdd = () => {
    setSelectedCard(null);
    setIsOpen(true);
  };

  const onSuccess = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 flex items-center">
            <CreditCard className="w-5 h-5 mr-3 text-brand-primary" />
            Quản lý thẻ tín dụng
          </h1>
          <p className="text-body text-text-muted mt-1">
            Thêm thẻ tín dụng để sử dụng ở tính năng ghi nhận công nợ trả góp.
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm thẻ mới
        </Button>
      </div>

      {!cards || !Array.isArray(cards) || cards.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border-base rounded-2xl">
          <CreditCard className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-text-primary">
            Không có thẻ tín dụng
          </h3>
          <p className="text-caption text-text-muted mt-1">
            Chưa có thẻ nào được cấu hình.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Button
              unstyled
              key={card.id}
              onClick={() => handleOpenEdit(card)}
              className="group text-left card-base p-0 overflow-hidden relative border border-border-base hover:border-brand-primary/50 transition-all hover:shadow-md"
            >
              <div className="h-28 bg-gradient-to-br from-blue-900 to-slate-900 p-5 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <CreditCard className="w-24 h-24 text-white" />
                </div>

                <h4 className="text-white font-medium relative z-10">
                  {card.bank_name}
                </h4>

                <div className="font-mono text-white/90 tracking-widest text-lg relative z-10">
                  **** **** **** {card.last_4 || "????"}
                </div>
              </div>

              <div className="p-4 bg-bg-card space-y-3">
                <div className="flex items-center text-sm">
                  <Banknote className="w-4 h-4 text-text-muted mr-2" />
                  <span className="text-text-secondary w-28">Hạn mức:</span>
                  <span className="font-medium text-text-primary">
                    {card.credit_limit
                      ? `${new Intl.NumberFormat("vi-VN").format(
                          card.credit_limit,
                        )} đ`
                      : "Không giới hạn"}
                  </span>
                </div>

                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 text-text-muted mr-2" />
                  <span className="text-text-secondary w-28">
                    Sao kê / Thanh toán:
                  </span>
                  <span className="font-medium text-text-primary">
                    Ngày {card.statement_day} / Ngày {card.due_day}
                  </span>
                </div>
              </div>
            </Button>
          ))}
        </div>
      )}

      {isOpen && (
        <CreditCardFormModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          initialData={selectedCard}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}
