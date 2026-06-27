import ContributeForm from "./ContributeForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Write a Devotion · Prevail Prayer",
  robots: { index: false, follow: false },
};

export default function ContributePage() {
  return (
    <div className="min-h-screen bg-page py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-tone">Write a Devotion</h1>
          <p className="text-tone-faint text-sm mt-2">
            Share a devotion for Prevail Prayer. Your submission is sent for review — it won&apos;t be published until it&apos;s approved.
          </p>
        </div>
        <ContributeForm />
      </div>
    </div>
  );
}
