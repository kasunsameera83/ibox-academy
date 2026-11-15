import { redirect } from "next/navigation";

/** Old preview address; previews now live at /cms-preview with draft menus and footer. */
export default async function OldPreview({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  redirect(`/cms-preview/${encodeURIComponent(page)}`);
}
