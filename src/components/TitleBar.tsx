import { useFlowStore } from '../store/useFlowStore'

export default function TitleBar() {
  const { searchQuery, setSearch, screen, setScreen } = useFlowStore()
  const f = (window as any).flow

  return (
    <div className="drag h-9 bg-bg-1 border-b border-[rgba(242,239,234,.06)] flex items-center px-3 gap-3 flex-shrink-0">
      {/* Logo */}
      <span className="font-serif text-ink-1 text-sm tracking-wide select-none">Flow</span>

      <div className="flex-1 nodrag">
        <input
          type="text"
          value={searchQuery}
          onChange={e => {
            setSearch(e.target.value)
            if (e.target.value && screen !== 'shelves') setScreen('shelves')
          }}
          placeholder="Search everything…"
          className="w-full max-w-xs bg-bg-3 border border-[rgba(242,239,234,.07)] rounded px-2.5 py-1 text-xs text-ink-1 placeholder-ink-3 outline-none focus:border-[rgba(200,245,154,.3)] transition-colors"
        />
      </div>

      {/* Window controls */}
      <div className="flex items-center gap-1.5 nodrag ml-auto">
        <button onClick={() => f?.win?.minimize()} className="w-3 h-3 rounded-full bg-bg-4 hover:bg-[#ecc873] transition-colors" />
        <button onClick={() => f?.win?.maximize()} className="w-3 h-3 rounded-full bg-bg-4 hover:bg-[#c8f59a] transition-colors" />
        <button onClick={() => f?.win?.close()}    className="w-3 h-3 rounded-full bg-bg-4 hover:bg-[#e8654a] transition-colors" />
      </div>
    </div>
  )
}
