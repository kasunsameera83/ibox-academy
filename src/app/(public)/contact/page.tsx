import { InfoPage, infoPageMetadata } from "@/features/cms/info-page";

export async function generateMetadata() {
  return infoPageMetadata("contact");
}

export default function Page() {
  return <InfoPage slug="contact" />;
}
