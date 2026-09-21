import { SuggestionField } from '../../core/ui/suggestion-field';

export function ActivityField(props: {
  value: string;
  suggestions: string[];
  onChange(value: string): void;
  disabled: boolean;
  autoFocus: boolean;
}) {
  return (
    <SuggestionField
      {...props}
      label="Aktivität *"
      placeholder="z. B. Wartung oder Renovierung"
      helper="Vorschlag auswählen oder eigene Aktivität eingeben."
    />
  );
}
