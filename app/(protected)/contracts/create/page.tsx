import ContractForm from "@/components/contracts/form";

export const metadata = {
  title: "Tạo hợp đồng",
  description: "Tạo hợp đồng mới cho khách hàng",
};

export default function CreateContractPage() {
  // FullpageFormShell owns the responsive 3-tier container.
  // Avoid a second max-width wrapper; it squeezes desktop sidebar layouts.
  return <ContractForm mode="create" />;
}
