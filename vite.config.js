import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import vitePluginFtp from 'vite-plugin-ftp';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default ({ mode }) => {
  // eslint-disable-next-line no-undef
  process.env = Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  const BASE_URL = mode === 'development' ? '' : '/zekr';

  return defineConfig({
    base: BASE_URL,
    server: {
      port: '3000',
      // hmr: { overlay: false },
    },
    plugins: [
      react(),
      VitePWA({ registerType: 'autoUpdate' }),
      // a simple useful vite ftp plugin, based on ftp-deploy, upload your dist file after vite build.
      vitePluginFtp({
        // eslint-disable-next-line no-undef
        host: process.env.FTP_HOST,
        // eslint-disable-next-line no-undef
        port: process.env.FTP_PORT,
        // eslint-disable-next-line no-undef
        remoteDir: process.env.FTP_REMOTEDIR,
        // eslint-disable-next-line no-undef
        user: process.env.FTP_USER,
        // eslint-disable-next-line no-undef
        password: process.env.FTP_PASSWORD,
      }),
    ],
  });
};
