import { useState } from 'react';
import { useServices } from '../../core/composition';
import { useTask } from '../../core/ui/use-task';
import { useFeedback } from '../../core/ui/feedback';
import { useLeaveGuard } from '../../core/ui/use-leave-guard';
import { errorText } from '../../core/ui/components';
import type { PreparedBackup } from '../../core/media/media-service';
import { privacyUrl, projectUrl } from './project-links';
export function useSettings(
  askPassword: (confirm: boolean) => Promise<string | null>,
) {
  const { backup, media, links, refresh } = useServices();
  const task = useTask(),
    feedback = useFeedback();
  const [phase, setPhase] = useState('');
  useLeaveGuard({ dirty: false, busy: task.busy, discard: async () => {} });
  async function openLink(url: string, failureMessage: string) {
    try {
      await links.open(url);
    } catch {
      feedback.notify(failureMessage);
    }
  }
  return {
    ...task,
    phase,
    openPrivacy: () =>
      openLink(
        privacyUrl,
        'Die Datenschutzerklärung konnte nicht geöffnet werden. Bitte versuche es erneut.',
      ),
    openSource: () =>
      openLink(
        projectUrl,
        'Der Quellcode konnte nicht geöffnet werden. Bitte versuche es erneut.',
      ),
    create: async () => {
      const password = await askPassword(true);
      if (password === null) return;
      await task.run(async () => {
        let prepared: PreparedBackup | undefined;
        try {
          setPhase('Backup wird vorbereitet und verschlüsselt …');
          prepared = await media.prepareBackup(await backup.create(password));
          setPhase('');
          let finished = false;
          while (!finished) {
            let saved = false;
            let failure = '';
            try {
              saved = (await media.saveBackup(prepared)) === 'saved';
            } catch (e) {
              failure = errorText(e);
            }
            if (saved) {
              const action = await feedback.choose({
                title: 'Backup gespeichert',
                message: `${prepared.name} wurde im gewählten Speicherort abgelegt. Bewahre die Datei und dein Passwort sicher auf.`,
                dialog: true,
                options: [
                  { value: 'done', label: 'Fertig' },
                  {
                    value: 'share',
                    label: 'Teilen',
                    icon: 'ios_share_outlined',
                  },
                ],
              });
              if (action === 'share') await media.shareBackup(prepared);
              finished = true;
            } else {
              const action = await feedback.choose({
                title: 'Backup noch nicht gespeichert',
                message:
                  failure ||
                  'Die Speicherortauswahl wurde abgebrochen. Du kannst erneut einen Speicherort wählen.',
                dialog: true,
                options: [
                  { value: 'discard', label: 'Verwerfen', danger: true },
                  { value: 'retry', label: 'Erneut speichern' },
                ],
              });
              finished = action !== 'retry';
            }
          }
        } finally {
          setPhase('');
          if (prepared) await media.discardBackup(prepared).catch(() => {});
        }
      });
    },
    restore: () =>
      task.run(async () => {
        const bytes = await media.pickBackup();
        if (!bytes) return;
        const password = await askPassword(false);
        if (password === null) return;
        try {
          setPhase('Backup wird geprüft …');
          const decoded = await backup.codec.decode(bytes, password);
          setPhase('');
          if (
            !(await feedback.confirm(
              'Backup wiederherstellen?',
              `${decoded.data.records.length} Akten, ${decoded.data.entries.length} Einträge und ${decoded.data.reports.length} Hausprotokolle werden importiert. Neuere lokale Einträge werden nicht überschrieben.`,
              'Wiederherstellen',
              false,
            ))
          )
            return;
          setPhase('Backup wird wiederhergestellt …');
          const result = await backup.restore(decoded);
          refresh();
          feedback.notify(
            [
              'Backup wiederhergestellt. Die Daten sind sofort in deinen Akten sichtbar.',
              ...result.warnings,
            ].join('\n'),
          );
        } finally {
          setPhase('');
        }
      }),
  };
}
