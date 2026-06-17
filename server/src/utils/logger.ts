import { Request, Response, NextFunction } from "express";

type LogLevel = "info" | "warn" | "error" | "debug";

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
};

const METHOD_COLORS: Record<string, string> = {
  GET: COLORS.green,
  POST: COLORS.cyan,
  PUT: COLORS.yellow,
  DELETE: COLORS.red,
  PATCH: COLORS.magenta,
};

const STATUS_COLOR = (code: number): string => {
  if (code < 300) return COLORS.green;
  if (code < 400) return COLORS.cyan;
  if (code < 500) return COLORS.yellow;
  return COLORS.red;
};

function timestamp(): string {
  return new Date().toISOString();
}

function tag(label: string): string {
  return `${COLORS.dim}[${label}]${COLORS.reset}`;
}

export const log = {
  info(label: string, message: string): void {
    console.log(`${COLORS.dim}${timestamp()}${COLORS.reset} ${tag(label)} ${message}`);
  },

  warn(label: string, message: string): void {
    console.warn(`${COLORS.dim}${timestamp()}${COLORS.reset} ${tag(label)} ${COLORS.yellow}${message}${COLORS.reset}`);
  },

  error(label: string, message: string, err?: unknown): void {
    const detail = err instanceof Error ? ` — ${err.message}` : err != null ? ` — ${String(err)}` : "";
    console.error(`${COLORS.dim}${timestamp()}${COLORS.reset} ${tag(label)} ${COLORS.red}${message}${detail}${COLORS.reset}`);
  },

  debug(label: string, message: string): void {
    if (process.env.DEBUG) {
      console.debug(`${COLORS.dim}${timestamp()}${COLORS.reset} ${tag(label)} ${COLORS.dim}${message}${COLORS.reset}`);
    }
  },
};

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl;
  const methodColor = METHOD_COLORS[method] ?? COLORS.white;

  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const statusCol = STATUS_COLOR(status);

    console.log(
      `${COLORS.dim}${timestamp()}${COLORS.reset} ` +
      `${tag("http")} ` +
      `${methodColor}${method.padEnd(6)}${COLORS.reset} ` +
      `${url} ` +
      `${statusCol}${status}${COLORS.reset} ` +
      `${COLORS.dim}${ms}ms${COLORS.reset}`
    );
  });

  next();
}
