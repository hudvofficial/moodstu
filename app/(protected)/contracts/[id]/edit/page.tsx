import ContractForm from "@/components/contracts/form";

export const metadata = {
  title: "Sửa hợp đồng | Mood Studio",
  description: "Chỉnh sửa thông tin hợp đồng",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditContractPage({ params }: PageProps) {
  const { id } = await params;
  return <ContractForm mode="edit" contractId={id} />;
}
