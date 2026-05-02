type ActionResult = {
  success: boolean;
  error?: string;
};

type SuccessResult<TResult extends ActionResult> =
  Extract<TResult, { success: true }> extends never
    ? TResult
    : Extract<TResult, { success: true }>;

type OptimisticMutationOptions<TResult extends ActionResult> = {
  apply: () => void;
  rollback: () => void;
  action: () => Promise<TResult>;
  onSuccess?: (result: SuccessResult<TResult>) => void | Promise<void>;
  onError?: (error: unknown, result?: TResult) => void;
};

export async function runOptimisticMutation<TResult extends ActionResult>({
  apply,
  rollback,
  action,
  onSuccess,
  onError,
}: OptimisticMutationOptions<TResult>) {
  apply();

  try {
    const result = await action();
    if (!result.success) {
      rollback();
      onError?.(new Error(result.error || "Mutation failed"), result);
      return result;
    }

    await onSuccess?.(result as SuccessResult<TResult>);
    return result;
  } catch (error) {
    rollback();
    onError?.(error);
    return undefined;
  }
}
