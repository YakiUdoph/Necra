import ProjectPage from "../page";

export const dynamic = "force-dynamic";

export default async function SectionPage({ params }: { params: Promise<{ projectId: string }> }) {
  return ProjectPage({ params, view: "agreements" });
}