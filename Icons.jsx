const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export function BellIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...base} {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function CalendarIcon(props) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...base} {...props}>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <line x1="3" y1="9.5" x2="21" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="6" />
      <line x1="16" y1="3" x2="16" y2="6" />
    </svg>
  );
}

export function ClockIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

export function PinIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

export function PlusIcon(props) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...base} strokeWidth={2.4} {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...base} strokeWidth={2.6} {...props}>
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}

export function XIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...base} strokeWidth={2.3} {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function ChevronLeftIcon(props) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...base} strokeWidth={2.1} {...props}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...base} strokeWidth={2} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function RacketIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...base} {...props}>
      <ellipse cx="12" cy="8" rx="6" ry="7" />
      <line x1="9.5" y1="13.5" x2="4" y2="21" />
    </svg>
  );
}

export function TrophyIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 3h10v2h3a1 1 0 0 1 1 1c0 3-2 5-4.5 5.3A5.5 5.5 0 0 1 13 15.9V18h3v2H8v-2h3v-2.1A5.5 5.5 0 0 1 7.5 11.3C5 11 3 9 3 6a1 1 0 0 1 1-1h3V3zm0 4H5c.3 1.5 1.4 2.6 2.8 2.9A7 7 0 0 1 7 7zm10 0a7 7 0 0 1-.8 2.9C17.6 9.6 18.7 8.5 19 7h-2z" />
    </svg>
  );
}

export function DotsIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export function ScheduleTabIcon(props) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" {...base} strokeWidth={2} {...props}>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <line x1="3" y1="9.5" x2="21" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="6" />
      <line x1="16" y1="3" x2="16" y2="6" />
    </svg>
  );
}

export function TeamTabIcon(props) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" {...base} strokeWidth={1.9} {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.6-3.4 3-5.4 5.5-5.4S14.4 16.6 15 20" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.3 14.3c2-.3 3.7 1.3 4.2 4" />
    </svg>
  );
}

export function ChatIcon(props) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" {...base} strokeWidth={1.9} {...props}>
      <path d="M4 5.5h16v11H9l-4 3.5v-3.5H4z" strokeLinejoin="round" />
    </svg>
  );
}

export function SendIcon(props) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...base} strokeWidth={2} {...props}>
      <path d="M4 12l16-8-6 16-3-6-7-2z" strokeLinejoin="round" />
    </svg>
  );
}

export function GearIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2.6-1.5L14 2.7h-4l-.4 2.3a7.5 7.5 0 0 0-2.6 1.5l-2.3-.9-2 3.4L4.6 10.5a7.6 7.6 0 0 0 0 3L2.7 15l2 3.4 2.3-.9c.75.65 1.63 1.16 2.6 1.5l.4 2.3h4l.4-2.3a7.5 7.5 0 0 0 2.6-1.5l2.3.9 2-3.4z" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </svg>
  );
}

export function MailIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...base} {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

export function SwapIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...base} strokeWidth={2} {...props}>
      <path d="M4 7h13l-3-3" />
      <path d="M20 17H7l3 3" />
    </svg>
  );
}
