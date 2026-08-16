'use client'

import { useEffect, useRef, useState } from 'react'

interface CourtMapProps {
  latitude: number
  longitude: number
  onChange?: (lat: number, lng: number) => void
  readOnly?: boolean
}

export default function CourtMap({ latitude, longitude, onChange, readOnly = false }: CourtMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // 1. Dynamic CDN Loader for Leaflet
  useEffect(() => {
    if ((window as any).L) {
      setIsLoaded(true)
      return
    }

    // Load Leaflet CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
    link.crossOrigin = ''
    document.head.appendChild(link)

    // Load Leaflet JS
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
    script.crossOrigin = ''
    script.onload = () => setIsLoaded(true)
    document.head.appendChild(script)

    return () => {
      // Clean up tags if needed (optional, keeping active is fine for navigation performance)
    }
  }, [])

  // 2. Map Initialisation & Syncing
  useEffect(() => {
    if (!isLoaded || !containerRef.current) return

    const L = (window as any).L
    if (!L) return

    // Setup custom styled orange NGP marker icon
    const customIcon = L.divIcon({
      html: `
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 border-2 border-white shadow-lg">
          <div class="w-3 h-3 rounded-full bg-black"></div>
        </div>
      `,
      className: 'ngp-map-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    })

    const lat = latitude || 10.3157
    const lng = longitude || 123.8854

    // Create map if it doesn't exist
    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        scrollWheelZoom: !readOnly,
        doubleClickZoom: !readOnly,
      }).setView([lat, lng], 15)

      // Add OpenStreetMap tiles (support theme matching with dark style maps if dark theme active)
      const isDark = document.documentElement.classList.contains('dark')
      
      // Standard CartoDB Dark Matter / Positron tiles for high end aesthetics
      const tileUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        
      const attribution = isDark
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

      L.tileLayer(tileUrl, { attribution }).addTo(map)

      // Create marker
      const marker = L.marker([lat, lng], {
        icon: customIcon,
        draggable: !readOnly
      }).addTo(map)

      // Drag event handlers
      if (!readOnly && onChange) {
        marker.on('dragend', () => {
          const latlng = marker.getLatLng()
          onChange(latlng.lat, latlng.lng)
        })

        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng)
          onChange(e.latlng.lat, e.latlng.lng)
        })
      }

      mapRef.current = map
      markerRef.current = marker

      // Invalidate size once to adjust for modal transition/rendering lag
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize()
        }
      }, 250)
    } else {
      // Map already exists, sync position ONLY if it differs significantly
      const currentLatLng = markerRef.current.getLatLng()
      const threshold = 0.0001
      if (Math.abs(currentLatLng.lat - lat) > threshold || Math.abs(currentLatLng.lng - lng) > threshold) {
        mapRef.current.setView([lat, lng], mapRef.current.getZoom())
        markerRef.current.setLatLng([lat, lng])
      }
    }

    // Clean up map instance synchronously on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.off()
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [isLoaded, latitude, longitude, readOnly, onChange])

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-955 min-h-[220px]">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-550">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
          Loading Court Location Map...
        </div>
      )}
      <div ref={containerRef} className="w-full h-full min-h-[220px]" />
    </div>
  )
}
