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
  // Không wrap max-width ở đây — FullpageFormShell đã có container responsive,
  // double wrapper với max-w-5xl gây khoảng trống thừa 2 bên và nén sidebar.
  return <ContractForm mode="edit" contractId={id} />;
}

