import { NextResponse } from 'next/server';
import { getContractDetail } from '@/app/actions/contract-queries';

export const dynamic = 'force-dynamic';

/**
 * Prefetch endpoint for contract detail data
 *
 * Used by usePrefetchContract hook to warm up React Query cache
 * before user navigates to contract detail page.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;

    if (!contractId) {
      return NextResponse.json(
        { error: 'Contract ID is required' },
        { status: 400 }
      );
    }

    const data = await getContractDetail(contractId);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[prefetch] Error prefetching contract:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to prefetch contract' },
      { status: 500 }
    );
  }
}
