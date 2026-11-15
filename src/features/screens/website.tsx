import { brand } from "@/brand";
import { PageHeader } from "@/components/layouts/page-header";
import { WebsiteEditor } from "@/features/cms/editor/website-editor";
import { DEFAULT_HOME } from "@/lib/cms/defaults";
import { getPageForEditor, listCourseOptions, listMedia } from "@/lib/dal/cms";
import { hasPermission, type SessionUser } from "@/lib/dal/session";

/** Website editor (blueprint §7): homepage sections, SEO, media, preview, publish and history. */
export async function WebsiteScreen({ user }: { user: SessionUser; base: string }) {
  const [page, media, courses] = await Promise.all([
    getPageForEditor("home", DEFAULT_HOME, "Home"),
    listMedia(),
    listCourseOptions(),
  ]);
  return (
    <>
      <PageHeader
        title="Website"
        description="Change the homepage without a developer. Edits save as a draft; visitors only see them after you publish."
      />
      <WebsiteEditor
        page={page}
        media={media}
        courses={courses}
        canEdit={hasPermission(user, "cms.edit_draft")}
        canPublish={hasPermission(user, "cms.publish")}
        pageLabel="Homepage"
        publicPath={new URL(brand.url).host}
      />
    </>
  );
}
