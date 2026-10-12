"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

let activeToastCount = 0;

function subscribeToClientReady() {
  return () => {};
}

function getClientReadySnapshot() {
  return true;
}

function getServerReadySnapshot() {
  return false;
}

type ToastProps = {
  message: string;
  onDismiss: () => void;
  variant?: "error" | "info" | "confirm";
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  cancelLabel?: string;
};

export default function Toast({
  message,
  onDismiss,
  variant = "error",
  duration = 4000,
  actionLabel,
  onAction,
  actionDisabled = false,
  cancelLabel,
}: ToastProps) {
  const clientReady = useSyncExternalStore(
    subscribeToClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot,
  );
  const toastRef = useRef<HTMLDivElement>(null);
  const messageId = useId();

  useEffect(() => {
    const appContent = document.getElementById("app-content");

    activeToastCount += 1;
    if (appContent) appContent.inert = true;

    return () => {
      activeToastCount -= 1;
      if (activeToastCount === 0 && appContent) {
        appContent.inert = false;
      }
    };
  }, []);

  useEffect(() => {
    if (duration <= 0 || actionLabel) return;

    const timeout = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timeout);
  }, [actionLabel, duration, message, onDismiss]);

  useEffect(() => {
    if (clientReady) {
      toastRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    }
  }, [clientReady]);

  const colorClasses =
    variant === "error"
      ? "border-red-800/70 text-red-100"
      : variant === "confirm"
        ? "border-amber-700/70 text-zinc-100"
        : "border-sky-700/70 text-zinc-100";

  if (!clientReady) return null;

  return createPortal(
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/55 px-5 py-6 backdrop-blur-[2px]">
      <div
        ref={toastRef}
        data-variant={variant}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${messageId}-title`}
        aria-describedby={`${messageId}-description`}
        className={`theme-toast flex w-full max-w-lg items-start gap-5 rounded-xl border bg-zinc-900 p-6 text-base shadow-2xl ${colorClasses}`}
      >
        <div className="min-w-0 flex-1">
          <h2 id={`${messageId}-title`} className="text-lg font-semibold">
            {variant === "confirm"
              ? "Confirm action"
              : variant === "error"
                ? "Something went wrong"
                : "Notice"}
          </h2>
          <p id={`${messageId}-description`} className="mt-2 leading-6">
            {message}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {cancelLabel && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              {cancelLabel}
            </button>
          )}
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              disabled={actionDisabled}
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-70"
            >
              {actionLabel}
            </button>
          )}
          {!actionLabel && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notification"
              className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
