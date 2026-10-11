import type { SVGProps } from "react";

export type IconName =
  | "sparkles"
  | "bookOpen"
  | "fileUp"
  | "folder"
  | "folderOpen"
  | "fileText"
  | "home"
  | "languages"
  | "type"
  | "save"
  | "layout"
  | "layers"
  | "download"
  | "chevronRight"
  | "chevronDown"
  | "moreHorizontal"
  | "close";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
};

const paths: Record<IconName, string[]> = {
  sparkles: [
    "m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z",
    "m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z",
  ],
  bookOpen: [
    "M12 7v14",
    "M3.5 5.5A2.5 2.5 0 0 1 6 3h6v18H6a3 3 0 0 0-3 1V5.5Z",
    "M20.5 5.5A2.5 2.5 0 0 0 18 3h-6v18h6a3 3 0 0 1 3 1V5.5Z",
  ],
  fileUp: [
    "M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7",
    "M13 3v7h7",
    "m16 5 3-3 3 3",
    "M19 2v8",
  ],
  folder: ["M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"],
  folderOpen: [
    "M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v2",
    "M3 10h18l-2 9H5l-2-9Z",
  ],
  fileText: [
    "M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10l-7-7Z",
    "M13 3v7h7",
    "M8 14h8M8 18h8",
  ],
  home: ["m3 10 9-7 9 7", "M5 9v11h14V9", "M9 20v-7h6v7"],
  languages: [
    "m5 8 6 6",
    "m4 14 6-6 2-3",
    "M2 5h12",
    "M7 2h1",
    "m14 20 5-11 5 11",
    "M16 16h6",
  ],
  type: ["M4 7V4h16v3", "M9 20h6", "M12 4v16"],
  save: [
    "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z",
    "M17 21v-8H7v8",
    "M7 3v5h8",
  ],
  layout: ["M3 3h8v8H3z", "M13 3h8v5h-8z", "M13 10h8v11h-8z", "M3 13h8v8H3z"],
  layers: ["m12 2 9 5-9 5-9-5 9-5Z", "m3 12 9 5 9-5", "m3 17 9 5 9-5"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5", "M12 15V3"],
  chevronRight: ["m9 18 6-6-6-6"],
  chevronDown: ["m6 9 6 6 6-6"],
  moreHorizontal: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  close: ["m18 6-12 12", "m6 6 12 12"],
};

export default function Icon({ name, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
