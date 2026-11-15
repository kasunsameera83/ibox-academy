import { InfoPage, infoPageMetadata } from "@/features/cms/info-page";

export async function generateMetadata() {
  return infoPageMetadata("refund-policy");
}

export default function Page() {
  return <InfoPage slug="refund-policy" />;
}
