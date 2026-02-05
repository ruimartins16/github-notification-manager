/// <reference types="vite/client" />

// Chrome Extension API types
declare global {
  interface Window {
    chrome: typeof chrome
  }
  
  var chrome: {
    runtime: any
    action: any
    storage: any
    alarms: any
    identity: any
  }
}

export {}
