import { useState } from 'react';
import { androidCheck } from '../../core/testing/android-check';
import {
  Body,
  Button,
  Busy,
  Notice,
  Page,
  Title,
  errorText,
} from '../../core/ui/components';
export function AndroidCheckScreen() {
  const [status, setStatus] = useState(
    'Bereit für die isolierte Android-Prüfung.',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!__DEV__)
    return (
      <Page>
        <Body>Diese Seite ist nur im Dev-Build verfügbar.</Body>
      </Page>
    );
  return (
    <Page>
      <Title>Android-Funktionsprüfung</Title>
      <Body>
        Verwendet ausschließlich synthetische Daten in einer eigenen
        Testdatenbank. Normale Akten bleiben unverändert.
      </Body>
      <Notice text={status} />
      <Notice error text={error} />
      {busy && <Busy />}
      <Button
        disabled={busy}
        title="Prüfung starten"
        onPress={() => {
          setBusy(true);
          setError('');
          androidCheck(setStatus)
            .then((result) => setStatus(`BESTANDEN\n${result}`))
            .catch((e) => setError(errorText(e)))
            .finally(() => setBusy(false));
        }}
      />
    </Page>
  );
}
