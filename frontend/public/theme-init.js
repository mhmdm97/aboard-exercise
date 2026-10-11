// Applies the stored theme before first paint (loaded synchronously from <head>; the CSP forbids inline scripts).
// Keep the storage key and colours in sync with src/hooks/useTheme.ts.
;(function () {
  try {
    var t = localStorage.getItem('shelf-theme')
    if (t !== 'light' && t !== 'dark') return
    document.documentElement.setAttribute('data-theme', t)
    var m = document.querySelector('meta[name="theme-color"]')
    if (m) m.setAttribute('content', t === 'dark' ? '#14110d' : '#f5efe3')
  } catch (e) {
    /* storage unavailable: follow the system */
  }
})()
