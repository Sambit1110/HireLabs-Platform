import { NextResponse } from 'next/server';

export function apiSuccess(data, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(code, message, status = 500) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}
