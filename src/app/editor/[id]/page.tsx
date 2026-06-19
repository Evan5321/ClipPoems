export default function EditorPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex h-screen">
      <p>Editor Placeholder - Canvas ID: {params.id}</p>
    </div>
  );
}
