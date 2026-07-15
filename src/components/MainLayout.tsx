import { useFlowStore } from '../store/useFlowStore'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'
import HomeView from '../views/HomeView'
import InboxView from '../views/InboxView'
import ShelvesView from '../views/ShelvesView'
import FocusView from '../views/FocusView'
import NotesView from '../views/NotesView'
import AnalyticsView from '../views/AnalyticsView'
import ItemDetail from './ItemDetail'
import ResurfacePrompt from './ResurfacePrompt'
import UndoToast from './UndoToast'
import StatusBar from './StatusBar'
import PulseFlash from './PulseFlash'

export default function MainLayout() {
  const { screen, detailItemId, surfaced, lastDeleted } = useFlowStore()

  return (
    <div className="flex flex-col h-screen bg-bg-1 text-ink-1 overflow-hidden">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-hidden relative">
          {screen === 'home'      && <HomeView />}
          {screen === 'inbox'     && <InboxView />}
          {screen === 'shelves'   && <ShelvesView />}
          {screen === 'focus'     && <FocusView />}
          {screen === 'notes'     && <NotesView />}
          {screen === 'analytics' && <AnalyticsView />}
        </main>
      </div>

      <StatusBar />

      {/* Overlays */}
      {detailItemId && <ItemDetail />}
      {surfaced      && <ResurfacePrompt />}
      {lastDeleted   && <UndoToast />}
      <PulseFlash />
    </div>
  )
}
