# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

```
const sw = await navigator.serviceWorker.getRegistrations()
console.log(sw);
```

## Notes

### Vibration not working on Android 16+

Android 16 introduced new granular vibration intensity sliders. The web `navigator.vibrate()` API returns `true` but the OS silently suppresses the physical vibration based on these settings.

**Fix:**
1. Go to **Settings > Sound & vibration > Vibrations & haptics**
2. Set **Touch feedback** to **Medium** or **High**
3. Also enable **Media vibration**

This is an OS-level setting — there is no JavaScript workaround. The API returns `true` even when vibration is suppressed.
