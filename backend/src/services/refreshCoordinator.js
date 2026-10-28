export function createRefreshCoordinator({ now = () => new Date() } = {}) {
  let activePromise = null;
  let state = {
    status: 'idle',
    startedAt: null,
    completedAt: null,
  };

  function getStatus() {
    return { ...state, running: activePromise !== null };
  }

  function start(task) {
    if (activePromise) {
      return { started: false, promise: activePromise };
    }

    state = {
      status: 'running',
      startedAt: now().toISOString(),
      completedAt: null,
    };

    activePromise = Promise.resolve()
      .then(task)
      .then((result) => {
        state = {
          status: result === false ? 'failed' : 'succeeded',
          startedAt: state.startedAt,
          completedAt: now().toISOString(),
        };
        return result;
      })
      .catch(() => {
        state = {
          status: 'failed',
          startedAt: state.startedAt,
          completedAt: now().toISOString(),
        };
        return false;
      })
      .finally(() => {
        activePromise = null;
      });

    return { started: true, promise: activePromise };
  }

  return { getStatus, start };
}
