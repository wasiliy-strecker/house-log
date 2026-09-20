import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useServices } from '../../core/composition';
import type { OpenPdf } from '../../core/pdf/viewer-service';
import { useTask } from '../../core/ui/use-task';
import { errorText } from '../../core/ui/components';
export function usePdfPreview(id: string) {
  const { viewer, media } = useServices();
  const [pdf, setPdf] = useState<OpenPdf>(),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const task = useTask();
  const { setError } = task;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      let opened: OpenPdf | undefined;
      setLoading(true);
      viewer
        .open(id)
        .then((value) => {
          opened = value;
          if (active) {
            setPdf(value);
            setError('');
          } else void viewer.close(value);
        })
        .catch((e) => {
          if (active) setError(errorText(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
        if (opened) void viewer.close(opened).catch(() => {});
      };
      // Revision/retry tokens intentionally reload persisted data on focus.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewer, id, retry, setError]),
  );
  return {
    pdf,
    loading,
    ...task,
    retry: () => setRetry((n) => n + 1),
    render: useCallback(
      (document: OpenPdf, index: number, width: number) =>
        viewer.page(document, index, width),
      [viewer],
    ),
    print: () =>
      task.run(async () => {
        if (pdf) await viewer.print(pdf);
      }),
    share: () =>
      task.run(async () => {
        if (pdf) await media.share(pdf);
      }),
  };
}
