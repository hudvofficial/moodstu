import ContractForm from "@/components/contracts/form";

export const metadata = {
  title: "Tạo hợp đồng",
  description: "Tạo hợp đồng mới cho khách hàng",
};

export default function CreateContractPage() {
  return <div className="max-w-5xl mx-auto"><ContractForm mode="create" /></div>;
}

