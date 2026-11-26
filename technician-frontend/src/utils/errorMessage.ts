interface ApiErrorShape {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export function getErrorMessage(error: unknown, fallback: string): string {
  const apiMessage = (error as ApiErrorShape)?.response?.data?.message;
  if (apiMessage) return apiMessage;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
