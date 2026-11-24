import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { MOCK_SESSIONS } from '@/lib/mock-data';

const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export async function GET() {
  try {
    ensureDataDir();
    if (!fs.existsSync(SESSIONS_FILE)) {
      // Initialize with mock sessions
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(MOCK_SESSIONS, null, 2), 'utf-8');
      return NextResponse.json({ success: true, sessions: MOCK_SESSIONS });
    }

    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    const sessions = JSON.parse(raw);
    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    console.error('[API /api/sessions GET Error]:', error);
    return NextResponse.json(
      { success: true, sessions: MOCK_SESSIONS, fallback: true },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDataDir();
    const body = await req.json();
    const { sessions } = body;

    if (!Array.isArray(sessions)) {
      return NextResponse.json(
        { success: false, error: 'Expected "sessions" array' },
        { status: 400 }
      );
    }

    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
    return NextResponse.json({ success: true, count: sessions.length });
  } catch (error: any) {
    console.error('[API /api/sessions POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to persist sessions' },
      { status: 500 }
    );
  }
}

