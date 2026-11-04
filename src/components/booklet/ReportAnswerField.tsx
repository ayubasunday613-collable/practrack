import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  id: string;
  title: string;
  instructions: string;
  value: string;
  required: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
};

export function ReportAnswerField({
  id,
  title,
  instructions,
  value,
  required,
  disabled,
  onChange,
}: Props) {
  return (
    <div>
      <Label htmlFor={id}>
        {title}
        {required && <span aria-hidden="true"> *</span>}
      </Label>
      {instructions && <p className="mb-2 mt-1 text-sm text-muted-foreground">{instructions}</p>}
      <Textarea
        id={id}
        rows={5}
        value={value}
        disabled={disabled}
        maxLength={20_000}
        aria-required={required}
        onChange={(event) => onChange(event.target.value)}
        onPaste={(event) => event.preventDefault()}
        onDrop={(event) => {
          if (event.dataTransfer.types.includes("text/plain")) event.preventDefault();
        }}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v")
            event.preventDefault();
        }}
      />
      <div className="mt-1 text-right text-xs text-muted-foreground">
        {value.length}/20,000 characters
      </div>
    </div>
  );
}
