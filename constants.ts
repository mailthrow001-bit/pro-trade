import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const createIcon = (children: React.ReactNode[]) => (props: IconProps) => {
  const { size = 24, ...rest } = props;
  return React.createElement(
    'svg',
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...rest
    },
    ...children
  );
};

export const Icons = {
  TrendingUp: createIcon([
    React.createElement('polyline', { points: "23 6 13.5 15.5 8.5 10.5 1 18", key: "1" }),
    React.createElement('polyline', { points: "17 6 23 6 23 12", key: "2" })
  ]),
  TrendingDown: createIcon([
    React.createElement('polyline', { points: "23 18 13.5 8.5 8.5 13.5 1 6", key: "1" }),
    React.createElement('polyline', { points: "17 18 23 18 23 12", key: "2" })
  ]),
  Home: createIcon([
    React.createElement('path', { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", key: "1" }),
    React.createElement('polyline', { points: "9 22 9 12 15 12 15 22", key: "2" })
  ]),
  List: createIcon([
    React.createElement('line', { x1: "8", y1: "6", x2: "21", y2: "6", key: "1" }),
    React.createElement('line', { x1: "8", y1: "12", x2: "21", y2: "12", key: "2" }),
    React.createElement('line', { x1: "8", y1: "18", x2: "21", y2: "18", key: "3" }),
    React.createElement('line', { x1: "3", y1: "6", x2: "3.01", y2: "6", key: "4" }),
    React.createElement('line', { x1: "3", y1: "12", x2: "3.01", y2: "12", key: "5" }),
    React.createElement('line', { x1: "3", y1: "18", x2: "3.01", y2: "18", key: "6" })
  ]),
  Briefcase: createIcon([
    React.createElement('rect', { x: "2", y: "7", width: "20", height: "14", rx: "2", ry: "2", key: "1" }),
    React.createElement('path', { d: "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16", key: "2" })
  ]),
  PieChart: createIcon([
    React.createElement('path', { d: "M21.21 15.89A10 10 0 1 1 8 2.83", key: "1" }),
    React.createElement('path', { d: "M22 12A10 10 0 0 0 12 2v10z", key: "2" })
  ]),
  Settings: createIcon([
    React.createElement('circle', { cx: "12", cy: "12", r: "3", key: "1" }),
    React.createElement('path', { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z", key: "2" })
  ]),
  Search: createIcon([
      React.createElement('circle', { cx: "11", cy: "11", r: "8", key: "1" }),
      React.createElement('line', { x1: "21", y1: "21", x2: "16.65", y2: "16.65", key: "2" })
  ]),
  WifiOff: createIcon([
    React.createElement('line', { x1: "1", y1: "1", x2: "23", y2: "23", key: "1" }),
    React.createElement('path', { d: "M16.72 11.06A10.94 10.94 0 0 1 19 12.55", key: "2" }),
    React.createElement('path', { d: "M5 12.55a10.94 10.94 0 0 1 5.17-2.39", key: "3" }),
    React.createElement('path', { d: "M10.71 5.05A16 16 0 0 1 22.58 9", key: "4" }),
    React.createElement('path', { d: "M1.42 9a15.91 15.91 0 0 1 4.7-2.88", key: "5" }),
    React.createElement('path', { d: "M8.53 16.11a6 6 0 0 1 6.95 0", key: "6" }),
    React.createElement('line', { x1: "12", y1: "20", x2: "12.01", y2: "20", key: "7" })
  ]),
  Star: createIcon([
    React.createElement('polygon', { points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2", key: "1" })
  ]),
  Plus: createIcon([
    React.createElement('line', { x1: "12", y1: "5", x2: "12", y2: "19", key: "1" }),
    React.createElement('line', { x1: "5", y1: "12", x2: "19", y2: "12", key: "2" })
  ]),
  Minus: createIcon([
    React.createElement('line', { x1: "5", y1: "12", x2: "19", y2: "12", key: "1" })
  ]),
  ChevronLeft: createIcon([
    React.createElement('polyline', { points: "15 18 9 12 15 6", key: "1" })
  ])
};