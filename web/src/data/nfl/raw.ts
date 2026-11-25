/**
 * Raw sample NFL data, ported verbatim from the design script
 * (design_handoff_statpakd/design/StatPakd App.dc.html, lines 198-246).
 * Kept in the design's tuple/record form so it can be diffed against the design.
 */

/** Base stats for a player; absent fields are genuinely absent (not zero). */
export interface RawPlayerBase {
  readonly pa?: number
  readonly ptd?: number
  readonly int?: number
  readonly cmp?: number
  readonly rate?: number
  readonly ra?: number
  readonly ry?: number
  readonly rtd?: number
  readonly rec?: number
  readonly rcy?: number
  readonly rctd?: number
}

/** [id, name, short, team, pos, num, base] */
export type RawPlayer = readonly [
  id: string,
  name: string,
  short: string,
  team: string,
  pos: string,
  num: number,
  base: RawPlayerBase,
]

/** [ppg, ypg, pass, rush, papg, to, third, win] */
export type RawTeamStats = readonly [number, number, number, number, number, number, number, number]

/** [id, name, abbreviation, division, stats] */
export type RawTeam = readonly [
  id: string,
  name: string,
  abbr: string,
  div: string,
  stats: RawTeamStats,
]

/** [name, role, shirt number] */
export type RosterRow = readonly [name: string, role: string, num: number]

export interface RosterUnits {
  readonly off: readonly RosterRow[]
  readonly def: readonly RosterRow[]
}

export interface OffTemplate {
  readonly snap: number
  readonly ca: number
  readonly ry: number
  readonly rtd: number
  readonly rec: number
  readonly rcy: number
  readonly rctd: number
}

export interface DefTemplate {
  readonly snap: number
  readonly tkl: number
  readonly sk: number
  readonly int: number
  readonly pd: number
  readonly ff: number
}

export const ROSTERS: Readonly<Record<string, RosterUnits>> = {
  kc: {
    off: [
      ['Patrick Mahomes', 'QB', 15],
      ['Kareem Hunt', 'RB1', 29],
      ['Isiah Pacheco', 'RB2', 10],
      ['Xavier Worthy', 'WR1', 1],
      ['DeAndre Hopkins', 'WR2', 8],
      ['JuJu Smith-Schuster', 'WR3', 9],
      ['Travis Kelce', 'TE', 87],
    ],
    def: [
      ['George Karlaftis', 'EDGE', 56],
      ['Chris Jones', 'DT', 95],
      ['Nick Bolton', 'LB', 32],
      ['Trent McDuffie', 'CB', 22],
      ['Justin Reid', 'S', 20],
    ],
  },
  buf: {
    off: [
      ['Josh Allen', 'QB', 17],
      ['James Cook', 'RB1', 4],
      ['Ray Davis', 'RB2', 22],
      ['Khalil Shakir', 'WR1', 10],
      ['Keon Coleman', 'WR2', 0],
      ['Amari Cooper', 'WR3', 18],
      ['Dalton Kincaid', 'TE', 86],
    ],
    def: [
      ['Greg Rousseau', 'EDGE', 50],
      ['Ed Oliver', 'DT', 91],
      ['Terrel Bernard', 'LB', 43],
      ['Christian Benford', 'CB', 47],
      ['Taylor Rapp', 'S', 20],
    ],
  },
  bal: {
    off: [
      ['Lamar Jackson', 'QB', 8],
      ['Derrick Henry', 'RB1', 22],
      ['Justice Hill', 'RB2', 43],
      ['Zay Flowers', 'WR1', 4],
      ['Rashod Bateman', 'WR2', 7],
      ['Nelson Agholor', 'WR3', 15],
      ['Mark Andrews', 'TE', 89],
    ],
    def: [
      ['Odafe Oweh', 'EDGE', 99],
      ['Nnamdi Madubuike', 'DT', 92],
      ['Roquan Smith', 'LB', 0],
      ['Marlon Humphrey', 'CB', 44],
      ['Kyle Hamilton', 'S', 14],
    ],
  },
  det: {
    off: [
      ['Jared Goff', 'QB', 16],
      ['Jahmyr Gibbs', 'RB1', 26],
      ['David Montgomery', 'RB2', 5],
      ['Amon-Ra St. Brown', 'WR1', 14],
      ['Jameson Williams', 'WR2', 9],
      ['Tim Patrick', 'WR3', 17],
      ['Sam LaPorta', 'TE', 87],
    ],
    def: [
      ["Za'Darius Smith", 'EDGE', 99],
      ['Alim McNeill', 'DT', 54],
      ['Jack Campbell', 'LB', 46],
      ['Amik Robertson', 'CB', 21],
      ['Kerby Joseph', 'S', 31],
    ],
  },
  phi: {
    off: [
      ['Jalen Hurts', 'QB', 1],
      ['Saquon Barkley', 'RB1', 26],
      ['Kenneth Gainwell', 'RB2', 14],
      ['A.J. Brown', 'WR1', 11],
      ['DeVonta Smith', 'WR2', 6],
      ['Jahan Dotson', 'WR3', 3],
      ['Dallas Goedert', 'TE', 88],
    ],
    def: [
      ['Josh Sweat', 'EDGE', 19],
      ['Jalen Carter', 'DT', 98],
      ['Zack Baun', 'LB', 53],
      ['Quinyon Mitchell', 'CB', 27],
      ['C.J. Gardner-Johnson', 'S', 8],
    ],
  },
  min: {
    off: [
      ['Sam Darnold', 'QB', 14],
      ['Aaron Jones', 'RB1', 33],
      ['Cam Akers', 'RB2', 31],
      ['Justin Jefferson', 'WR1', 18],
      ['Jordan Addison', 'WR2', 3],
      ['Jalen Nailor', 'WR3', 83],
      ['T.J. Hockenson', 'TE', 87],
    ],
    def: [
      ['Jonathan Greenard', 'EDGE', 58],
      ['Harrison Phillips', 'DT', 97],
      ['Blake Cashman', 'LB', 51],
      ['Byron Murphy Jr.', 'CB', 7],
      ['Camryn Bynum', 'S', 24],
    ],
  },
  gb: {
    off: [
      ['Jordan Love', 'QB', 10],
      ['Josh Jacobs', 'RB1', 8],
      ['Emanuel Wilson', 'RB2', 23],
      ['Jayden Reed', 'WR1', 11],
      ['Romeo Doubs', 'WR2', 87],
      ['Christian Watson', 'WR3', 9],
      ['Tucker Kraft', 'TE', 85],
    ],
    def: [
      ['Rashan Gary', 'EDGE', 52],
      ['Kenny Clark', 'DT', 97],
      ['Quay Walker', 'LB', 7],
      ['Jaire Alexander', 'CB', 23],
      ['Xavier McKinney', 'S', 29],
    ],
  },
  sf: {
    off: [
      ['Brock Purdy', 'QB', 13],
      ['Jordan Mason', 'RB1', 24],
      ['Isaac Guerendo', 'RB2', 31],
      ['Jauan Jennings', 'WR1', 15],
      ['Deebo Samuel', 'WR2', 19],
      ['Brandon Aiyuk', 'WR3', 11],
      ['George Kittle', 'TE', 85],
    ],
    def: [
      ['Nick Bosa', 'EDGE', 97],
      ['Javon Hargrave', 'DT', 98],
      ['Fred Warner', 'LB', 54],
      ['Deommodore Lenoir', 'CB', 2],
      ['Talanoa Hufanga', 'S', 29],
    ],
  },
}

export const OFF_T: Readonly<Record<string, OffTemplate>> = {
  QB: { snap: 99, ca: 80, ry: 350, rtd: 3, rec: 0, rcy: 0, rctd: 0 },
  RB1: { snap: 62, ca: 240, ry: 1050, rtd: 9, rec: 40, rcy: 300, rctd: 1 },
  RB2: { snap: 36, ca: 110, ry: 470, rtd: 3, rec: 20, rcy: 150, rctd: 0 },
  WR1: { snap: 90, ca: 4, ry: 20, rtd: 0, rec: 92, rcy: 1200, rctd: 8 },
  WR2: { snap: 82, ca: 2, ry: 8, rtd: 0, rec: 60, rcy: 760, rctd: 5 },
  WR3: { snap: 62, ca: 1, ry: 4, rtd: 0, rec: 36, rcy: 420, rctd: 2 },
  TE: { snap: 80, ca: 0, ry: 0, rtd: 0, rec: 62, rcy: 650, rctd: 5 },
}

export const DEF_T: Readonly<Record<string, DefTemplate>> = {
  EDGE: { snap: 76, tkl: 42, sk: 9, int: 0, pd: 2, ff: 2 },
  DT: { snap: 68, tkl: 38, sk: 5, int: 0, pd: 1, ff: 1 },
  LB: { snap: 97, tkl: 118, sk: 2, int: 1, pd: 5, ff: 1 },
  CB: { snap: 94, tkl: 55, sk: 0, int: 3, pd: 12, ff: 1 },
  S: { snap: 98, tkl: 84, sk: 1, int: 3, pd: 8, ff: 1 },
}

export const RAW_P: readonly RawPlayer[] = [
  [
    'allen',
    'Josh Allen',
    'J. Allen',
    'BUF',
    'QB',
    17,
    { pa: 3731, ptd: 28, int: 6, cmp: 63.6, rate: 101.4, ra: 102, ry: 531, rtd: 12 },
  ],
  [
    'jackson',
    'Lamar Jackson',
    'L. Jackson',
    'BAL',
    'QB',
    8,
    { pa: 4172, ptd: 41, int: 4, cmp: 66.7, rate: 119.6, ra: 139, ry: 915, rtd: 4 },
  ],
  [
    'mahomes',
    'Patrick Mahomes',
    'P. Mahomes',
    'KC',
    'QB',
    15,
    { pa: 3928, ptd: 26, int: 11, cmp: 67.5, rate: 93.5, ra: 58, ry: 307, rtd: 2 },
  ],
  [
    'burrow',
    'Joe Burrow',
    'J. Burrow',
    'CIN',
    'QB',
    9,
    { pa: 4918, ptd: 43, int: 9, cmp: 70.6, rate: 108.5, ra: 42, ry: 201, rtd: 2 },
  ],
  [
    'goff',
    'Jared Goff',
    'J. Goff',
    'DET',
    'QB',
    16,
    { pa: 4629, ptd: 37, int: 12, cmp: 72.4, rate: 111.8, ra: 29, ry: 56, rtd: 0 },
  ],
  [
    'hurts',
    'Jalen Hurts',
    'J. Hurts',
    'PHI',
    'QB',
    1,
    { pa: 2903, ptd: 18, int: 5, cmp: 68.7, rate: 103.7, ra: 150, ry: 630, rtd: 14 },
  ],
  [
    'daniels',
    'Jayden Daniels',
    'J. Daniels',
    'WAS',
    'QB',
    5,
    { pa: 3568, ptd: 25, int: 9, cmp: 69.0, rate: 100.1, ra: 148, ry: 891, rtd: 6 },
  ],
  [
    'barkley',
    'Saquon Barkley',
    'S. Barkley',
    'PHI',
    'RB',
    26,
    { ra: 345, ry: 2005, rtd: 13, rec: 33, rcy: 278, rctd: 2 },
  ],
  [
    'henry',
    'Derrick Henry',
    'D. Henry',
    'BAL',
    'RB',
    22,
    { ra: 325, ry: 1921, rtd: 16, rec: 19, rcy: 193, rctd: 2 },
  ],
  [
    'robinson',
    'Bijan Robinson',
    'B. Robinson',
    'ATL',
    'RB',
    7,
    { ra: 304, ry: 1456, rtd: 14, rec: 61, rcy: 431, rctd: 1 },
  ],
  [
    'gibbs',
    'Jahmyr Gibbs',
    'J. Gibbs',
    'DET',
    'RB',
    26,
    { ra: 250, ry: 1412, rtd: 16, rec: 52, rcy: 517, rctd: 4 },
  ],
  [
    'chase',
    "Ja'Marr Chase",
    'J. Chase',
    'CIN',
    'WR',
    1,
    { ra: 3, ry: 32, rtd: 0, rec: 127, rcy: 1708, rctd: 17 },
  ],
  [
    'jefferson',
    'Justin Jefferson',
    'J. Jefferson',
    'MIN',
    'WR',
    18,
    { ra: 1, ry: 2, rtd: 0, rec: 103, rcy: 1533, rctd: 10 },
  ],
  [
    'lamb',
    'CeeDee Lamb',
    'C. Lamb',
    'DAL',
    'WR',
    88,
    { ra: 9, ry: 70, rtd: 0, rec: 101, rcy: 1194, rctd: 6 },
  ],
  [
    'stbrown',
    'Amon-Ra St. Brown',
    'A. St. Brown',
    'DET',
    'WR',
    14,
    { ra: 1, ry: 6, rtd: 0, rec: 115, rcy: 1263, rctd: 12 },
  ],
  [
    'bowers',
    'Brock Bowers',
    'B. Bowers',
    'LV',
    'TE',
    89,
    { ra: 5, ry: 13, rtd: 0, rec: 112, rcy: 1194, rctd: 5 },
  ],
  [
    'kittle',
    'George Kittle',
    'G. Kittle',
    'SF',
    'TE',
    85,
    { ra: 0, ry: 0, rtd: 0, rec: 78, rcy: 1106, rctd: 8 },
  ],
]

export const RAW_T: readonly RawTeam[] = [
  ['kc', 'Kansas City Chiefs', 'KC', 'AFC West', [22.6, 335.6, 225.0, 110.6, 19.2, -1, 47.4, 88.2]],
  ['buf', 'Buffalo Bills', 'BUF', 'AFC East', [30.9, 352.4, 215.0, 137.4, 21.6, 24, 47.2, 76.5]],
  ['bal', 'Baltimore Ravens', 'BAL', 'AFC North', [30.5, 424.9, 237.4, 187.6, 22.2, 7, 45.1, 70.6]],
  ['det', 'Detroit Lions', 'DET', 'NFC North', [33.2, 409.5, 252.0, 157.5, 20.1, 6, 48.5, 88.2]],
  [
    'phi',
    'Philadelphia Eagles',
    'PHI',
    'NFC East',
    [27.2, 367.2, 179.2, 188.0, 17.8, 11, 41.0, 82.4],
  ],
  [
    'min',
    'Minnesota Vikings',
    'MIN',
    'NFC North',
    [25.4, 346.4, 236.6, 109.8, 18.6, 3, 42.8, 82.4],
  ],
  ['gb', 'Green Bay Packers', 'GB', 'NFC North', [27.1, 363.3, 216.9, 146.4, 19.9, 9, 40.3, 64.7]],
  [
    'sf',
    'San Francisco 49ers',
    'SF',
    'NFC West',
    [23.6, 365.6, 241.3, 124.3, 25.6, -11, 42.2, 35.3],
  ],
]
