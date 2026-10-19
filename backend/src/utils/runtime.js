let ready = false;
let shuttingDown = false;

export const setReady = (value) => {
  ready = Boolean(value);
};

export const isReady = () => ready && !shuttingDown;

export const setShuttingDown = (value) => {
  shuttingDown = Boolean(value);

  if (shuttingDown) {
    ready = false;
  }
};

export const isShuttingDown = () => shuttingDown;
