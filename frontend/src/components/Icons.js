import React from 'react';

const size = (props) => ({ width: props.size || 20, height: props.size || 20 });
const stroke = (props) => props.stroke || 'currentColor';

export function IconHome(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

export function IconBox(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  );
}

export function IconCamera(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function IconChefHat(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <path d="M6 13h12M8 10V8a4 4 0 118 0v2M6 13v6a2 2 0 002 2h8a2 2 0 002-2v-6M6 13c2 0 3-1 4-2s2-2 2-4" />
    </svg>
  );
}

export function IconApple(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <circle cx="12" cy="10" r="6" />
      <path d="M12 4v2M12 16v4M12 14a4 4 0 004-4" />
    </svg>
  );
}

export function IconSearch(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function IconTrash(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function IconEdit(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function IconCalendar(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function IconWarning(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function IconCheck(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function IconChartDown(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export function IconClock(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function IconClose(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function IconUpload(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function IconUsers(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export function IconTimer(props) {
  const s = size(props);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke(props)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...s}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
