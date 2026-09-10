const base = {
  width: "1em",
  height: "1em",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const IconDashboard = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

export const IconFarm = (p) => (
  <svg {...base} {...p}>
    <path d="M3 21V10l9-6 9 6v11" />
    <path d="M9 21v-7h6v7" />
  </svg>
);

export const IconAdvisor = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3a5 5 0 0 1 5 5c0 2.5-1.5 3.8-2.2 5-.4.7-.8 1.4-.8 2.2v.8H10v-.8c0-.8-.4-1.5-.8-2.2C8.5 11.8 7 10.5 7 8a5 5 0 0 1 5-5Z" />
    <path d="M10 19h4M11 22h2" />
  </svg>
);

export const IconWeather = (p) => (
  <svg {...base} {...p}>
    <path d="M7 17a4 4 0 1 1 1.2-7.8A5 5 0 0 1 18 11a3.5 3.5 0 0 1-1 6.9H7Z" />
    <path d="M9 20.5 8 22M13 20.5l-1 1.5M17 20.5l-1 1.5" />
  </svg>
);

export const IconLeaf = (p) => (
  <svg {...base} {...p}>
    <path d="M20 4c-9 0-16 6-16 15 9 0 15-7 16-15Z" />
    <path d="M5 19c3-4 7-7 12-9" />
  </svg>
);

export const IconMedicine = (p) => (
  <svg {...base} {...p}>
    <rect x="7" y="2" width="10" height="20" rx="4" />
    <path d="M7 11h10" />
  </svg>
);

export const IconServices = (p) => (
  <svg {...base} {...p}>
    <path d="M14.5 3.5 12 6l6 6 2.5-2.5a4 4 0 0 0-5.5-5.5Z" />
    <path d="M12 6 4 14a3 3 0 0 0 4 4l8-8" />
    <path d="M15 15l4 4" />
  </svg>
);

export const IconMarketplace = (p) => (
  <svg {...base} {...p}>
    <path d="M4 9V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4" />
    <path d="M3 9h18l-1.2 10.2a2 2 0 0 1-2 1.8H6.2a2 2 0 0 1-2-1.8L3 9Z" />
    <path d="M9 13a3 3 0 0 0 6 0" />
  </svg>
);

export const IconInbox = (p) => (
  <svg {...base} {...p}>
    <path d="M3 12h5l2 3h4l2-3h5" />
    <path d="M5.5 5h13l2.5 7v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-6l2.5-7Z" />
  </svg>
);

export const IconSettings = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15 1.65 1.65 0 0 0 3.17 14H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.31.44.53.79.6H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

export const IconLogout = (p) => (
  <svg {...base} {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const IconSliders = (p) => (
  <svg {...base} {...p}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

export const IconBell = (p) => (
  <svg {...base} {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);

export const IconSearch = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const IconPin = (p) => (
  <svg {...base} {...p}>
    <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.2" />
  </svg>
);

export const IconTruck = (p) => (
  <svg {...base} {...p}>
    <rect x="1" y="7" width="13" height="10" rx="1" />
    <path d="M14 10h4l3 3v4h-7" />
    <circle cx="5.5" cy="19" r="1.6" />
    <circle cx="16.5" cy="19" r="1.6" />
  </svg>
);

export const IconRupee = (p) => (
  <svg {...base} {...p}>
    <path d="M6 4h12M6 9h12M8 4c4 0 6 1.6 6 4s-2 4-6 4h-2l8 9" />
  </svg>
);

export const IconSun = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const IconDroplet = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />
  </svg>
);

export const IconWind = (p) => (
  <svg {...base} {...p}>
    <path d="M3 8h9.5a2.5 2.5 0 1 0-2.4-3.2" />
    <path d="M3 16h13.5a2.5 2.5 0 1 1-2.4 3.2" />
    <path d="M3 12h16.5a2.5 2.5 0 1 0-2.4-3.2" />
  </svg>
);

export const IconUpload = (p) => (
  <svg {...base} {...p}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);
