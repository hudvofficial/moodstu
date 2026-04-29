export const metadata = { title: "CRM" };

import LeadsRoute from "./leads/page";

export default function CRMPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <LeadsRoute searchParams={props.searchParams} />;
}

