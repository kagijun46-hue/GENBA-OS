import fs from 'fs';
import path from 'path';
import type { Staff, MonthSettings, StaffRequest, Assignment } from './types';

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(filename: string, defaultValue: T): T {
  ensureDir();
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return defaultValue;
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

function writeJson<T>(filename: string, data: T): void {
  ensureDir();
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================================
// Staff CRUD
// ============================================================
export function getAllStaff(): Staff[] {
  return readJson<Staff[]>('staff.json', []);
}
export function saveAllStaff(data: Staff[]): void {
  writeJson('staff.json', data);
}

// ============================================================
// MonthSettings CRUD
// ============================================================
export function getSettings(): MonthSettings | null {
  return readJson<MonthSettings | null>('settings.json', null);
}
export function saveSettings(data: MonthSettings): void {
  writeJson('settings.json', data);
}

// ============================================================
// StaffRequests CRUD
// ============================================================
export function getAllRequests(): StaffRequest[] {
  return readJson<StaffRequest[]>('requests.json', []);
}
export function saveAllRequests(data: StaffRequest[]): void {
  writeJson('requests.json', data);
}

// ============================================================
// Assignments CRUD
// ============================================================
export function getAllAssignments(): Assignment[] {
  return readJson<Assignment[]>('assignments.json', []);
}
export function saveAllAssignments(data: Assignment[]): void {
  writeJson('assignments.json', data);
}
