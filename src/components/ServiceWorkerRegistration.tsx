'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Wait for page load to register service worker
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('SW registered successfully:', registration)

            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (
                    newWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    console.log(
                      'New service worker installed, refresh to update'
                    )
                  }
                })
              }
            })
          })
          .catch((registrationError) => {
            console.log('SW registration failed:', registrationError)
          })
      })

      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed')
      })
    } else {
      console.log('Service Worker not supported')
    }
  }, [])

  return null
}
