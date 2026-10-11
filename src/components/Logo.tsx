import Icon from "./Icon";

type LogoProps = {
  className?: string;
  textClassName?: string;
};

export default function Logo({
  className = "",
  textClassName = "text-base font-semibold tracking-tight text-white",
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-sm shadow-indigo-950/40">
        <Icon name="bookOpen" className="h-5 w-5" />
      </span>
      <span className={textClassName}>Benglish</span>
    </span>
  );
}
