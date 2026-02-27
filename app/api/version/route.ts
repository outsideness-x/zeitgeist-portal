import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    service: 'zeitgeist-frontend',
    commitHash: process.env.BUILD_COMMIT ?? 'unknown',
    buildTime: process.env.BUILD_TIME ?? 'unknown',
    buildRef: process.env.BUILD_REF ?? 'unknown',
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
