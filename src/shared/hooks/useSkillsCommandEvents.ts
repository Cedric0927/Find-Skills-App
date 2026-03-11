import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../../store/appStore";
import type { AppI18n } from "../i18n/messages";
import { notify } from "../services/notifier";

export function useSkillsCommandEvents(t: AppI18n, onSuccess: () => void) {
  const { appendInstallLog, finishInstallJob } = useAppStore();

  useEffect(() => {
    const unlistenLogs = listen<{ id: string; line: string }>("skills-command-log", (event) => {
      appendInstallLog(event.payload.id, event.payload.line);
    });

    const unlistenFinished = listen<{ id: string; status: "success" | "error"; message?: string }>(
      "skills-command-finished",
      (event) => {
        finishInstallJob(event.payload.id, event.payload.status, event.payload.message);
        if (event.payload.status === "success") {
          void notify(t.installDone, t.installDoneBody);
          onSuccess();
        } else {
          void notify(t.installFailed, event.payload.message ?? t.installFailedBody);
        }
      },
    );

    return () => {
      unlistenLogs.then((fn) => fn());
      unlistenFinished.then((fn) => fn());
    };
  }, [appendInstallLog, finishInstallJob, onSuccess, t.installDone, t.installDoneBody, t.installFailed, t.installFailedBody]);
}
