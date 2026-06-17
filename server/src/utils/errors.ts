import { Response } from "express";
import { ApiError } from "../types/index.js";

export function sendError(
  res: Response,
  statusCode: number,
  error: string,
  message: string
): void {
  const body: ApiError = { error, message, statusCode };
  res.status(statusCode).json(body);
}

export function send404(res: Response, uuid: string): void {
  sendError(res, 404, "NotFound", `No resource found with UUID: ${uuid}`);
}

export function send400(res: Response, message: string): void {
  sendError(res, 400, "BadRequest", message);
}

export function send409(res: Response, message: string): void {
  sendError(res, 409, "Conflict", message);
}

export function send500(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : "Unexpected server error";
  sendError(res, 500, "InternalServerError", message);
}
