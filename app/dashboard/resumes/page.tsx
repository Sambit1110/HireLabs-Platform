import ResumeUpload from "@/components/resume/ResumeUpload";

export default function ResumesPage() {
  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Resume Management
      </h1>

      <ResumeUpload />
    </main>
  );
}