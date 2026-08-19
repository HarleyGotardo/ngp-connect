import LogoIcon from '@/components/icons/LogoIcon'

export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-955 flex flex-col items-center justify-center font-sans text-zinc-900 dark:text-white transition-colors duration-200">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        {/* Animated Logo */}
        <div className="h-16 w-16 text-orange-500 animate-spin [animation-duration:3s]">
          <LogoIcon />
        </div>
        
        {/* Text Loader */}
        <div className="flex flex-col items-center gap-1.5 text-center mt-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Preparing Booking Portal
          </h3>
          <p className="text-[10px] uppercase font-bold tracking-widest text-orange-500">
            Loading schedules & sessions...
          </p>
        </div>

        {/* Small Spinner */}
        <div className="mt-4 flex gap-1 items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" />
        </div>
      </div>
    </div>
  )
}
