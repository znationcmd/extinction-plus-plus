import Shell from '../../components/Shell';
import AssistantChat from '../../components/AssistantChat';

export default function Page() {
  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Assistant IA RSS</h2>
      <AssistantChat />
    </Shell>
  );
}
