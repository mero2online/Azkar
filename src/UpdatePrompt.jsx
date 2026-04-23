import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';

function UpdatePrompt() {
  const [registration, setRegistration] = useState(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) setRegistration(r);
    },
  });

  useEffect(() => {
    if (!registration) return;

    const checkForUpdate = () => {
      if (navigator.onLine) {
        registration.update().catch(() => { /* offline or network error — ignore */ });
      }
    };

    // Periodic check (only if online)
    const interval = setInterval(checkForUpdate, 60 * 1000);

    // Check immediately when coming back online
    window.addEventListener('online', checkForUpdate);

    // Check when the tab becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', checkForUpdate);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [registration]);

  return (
    <Dialog
      open={needRefresh}
      disableEscapeKeyDown
      aria-labelledby='update-dialog-title'
    >
      <DialogTitle id='update-dialog-title'>
        <SystemUpdateAltIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        New Version Available
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          A new version of the app is available. Please update to get the latest features and fixes.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={async () => {
            try {
              await updateServiceWorker(true);
            } catch (e) { /* ignore */ }
            // Fallback: force reload after a short delay in case SW message doesn't trigger controllerchange
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }}
          variant='contained'
          color='primary'
          autoFocus
        >
          Update Now
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UpdatePrompt;
