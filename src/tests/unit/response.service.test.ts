import { IResponseMessage } from '#src/types/api.response.messages.js';
import ApiResponse from '#src/utils/ApiResponse.js';
import type { Response } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ApiResponse Utility', () => {
  const mockJson = vi.fn();
  const mockStatus = vi.fn(() => ({ json: mockJson })) as unknown as Response['status'];

  const mockRes = {
    status: mockStatus,
  } as unknown as Response;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a success response with data and extra', () => {
    const message = 'Operation successful' as IResponseMessage;
    const data = { name: 'Test User' };
    const extra = { authenticated: true };

    ApiResponse(mockRes, 200, message, data, extra);

    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith({
      status: 'success',
      message,
      data,
      authenticated: true,
    });
  });

  it('should return a fail response without data', () => {
    const message = 'Invalid input' as IResponseMessage;

    ApiResponse(mockRes, 400, message, null);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      status: 'fail',
      message,
    });
  });

  it('should default to "info" status if status code is unknown', () => {
    const message = 'Something odd' as IResponseMessage;
    ApiResponse(mockRes, 999, message);

    expect(mockStatus).toHaveBeenCalledWith(999);
    expect(mockJson).toHaveBeenCalledWith({
      status: 'info',
      message,
    });
  });

  it('should return partial for 206', () => {
    const message = 'Partial content' as IResponseMessage;
    ApiResponse(mockRes, 206, message);

    expect(mockStatus).toHaveBeenCalledWith(206);
    expect(mockJson).toHaveBeenCalledWith({
      status: 'partial',
      message,
    });
  });
});
