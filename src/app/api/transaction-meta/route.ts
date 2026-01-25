import { NextRequest, NextResponse } from 'next/server';
import { getTransactionResultMetaXdr } from '@/lib/soroban';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const hash = searchParams.get('hash');

  if (!hash) {
    return NextResponse.json(
      { error: 'Transaction hash is required' },
      { status: 400 }
    );
  }

  try {
    const resultMeta = await getTransactionResultMetaXdr(hash);

    if (resultMeta?.resultMetaXdr) {
      return NextResponse.json({
        resultMetaXdr: resultMeta.resultMetaXdr,
        diagnosticEventsXdr: resultMeta.diagnosticEventsXdr || [],
      });
    } else {
      return NextResponse.json(
        { error: 'Result meta XDR not available for this transaction' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error fetching transaction meta:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction metadata' },
      { status: 500 }
    );
  }
}
