import TaskForm from "@/src/app/_components/TaskForm";
import TaskList from "@/src/app/_components/TaskList";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <TaskForm />
      <div className="mt-20">
        <TaskList />
      </div>
    </div>
  );
}
