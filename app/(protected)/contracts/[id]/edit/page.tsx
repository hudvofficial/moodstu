import ContractForm from "@/components/contracts/form";

export const metadata = {
  title: "Sửa hợp đồng",
  description: "Chỉnh sửa thông tin hợp đồng",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditContractPage({ params }: PageProps) {
  const { id } = await params;
  return <div className="max-w-5xl mx-auto"><ContractForm mode="edit" contractId={id} /></div>;
}

