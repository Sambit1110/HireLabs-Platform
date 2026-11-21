import ModelResults from "@/components/dashboard/ModelResults";

export const metadata = {
  title: "Model results · HireLabs",
  description: "How HireLabs' own models compare with a keyword baseline and Gemini.",
};

export default function ModelResultsPage() {
  return <ModelResults />;
}
