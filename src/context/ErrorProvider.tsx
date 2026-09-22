import React, {useEffect, useRef, useState} from 'react';
import CustomPopup from '../components/CustomPopup';
import {AppError} from '../errors/AppError';
import {subscribeErrors} from '../errors/errorEvents';
import {useLoading} from './LoadingContext';

export default function ErrorProvider({children}: React.PropsWithChildren) {
  const [queue, setQueue] = useState<AppError[]>([]);
  const recent = useRef(new Map<string, number>());
  const {hideLoader} = useLoading();
  const hideRef = useRef(hideLoader);
  hideRef.current = hideLoader;
  useEffect(
    () =>
      subscribeErrors(error => {
        hideRef.current();
        const key = `${error.kind}:${error.message}`;
        const now = Date.now();
        if (
          error.kind !== 'session' &&
          now - (recent.current.get(key) ?? 0) < 3000
        ) {
          return;
        }
        recent.current.forEach((time, oldKey) => {
          if (now - time >= 3000) {
            recent.current.delete(oldKey);
          }
        });
        recent.current.set(key, now);
        setQueue(current => {
          if (error.kind === 'session') {
            return [error];
          }
          if (
            current.some(
              item =>
                item.kind === error.kind && item.message === error.message,
            )
          ) {
            return current;
          }
          return [...current, error].slice(0, 5);
        });
      }),
    [],
  );
  const dismiss = () => setQueue(current => current.slice(1));
  return (
    <>
      {children}
      <CustomPopup
        visible={queue.length > 0}
        type="error"
        title={queue[0]?.title ?? ''}
        message={queue[0]?.message ?? ''}
        onPrimary={dismiss}
        onDismiss={dismiss}
      />
    </>
  );
}
