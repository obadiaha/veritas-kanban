import { KanbanBoard } from './components/board/KanbanBoard';
import { Header } from './components/layout/Header';
import { Toaster } from './components/ui/toaster';
import { KeyboardProvider } from './hooks/useKeyboard';
import { KeyboardShortcutsDialog } from './components/layout/KeyboardShortcutsDialog';
import { BulkActionsProvider } from './hooks/useBulkActions';
import { useTaskSync } from './hooks/useTaskSync';

function App() {
  // Connect to WebSocket for real-time task updates
  useTaskSync();

  return (
    <KeyboardProvider>
      <BulkActionsProvider>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-6">
            <KanbanBoard />
          </main>
          <Toaster />
          <KeyboardShortcutsDialog />
        </div>
      </BulkActionsProvider>
    </KeyboardProvider>
  );
}

export default App;
