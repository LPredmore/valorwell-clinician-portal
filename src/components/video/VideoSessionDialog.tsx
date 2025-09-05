// src/components/video/VideoSessionDialog.tsx
"use client";

import React from "react";
import { useCallFrame } from "@daily-co/daily-react";

type Props = {
  isOpen: boolean;
  roomUrl?: string; // full https://<subdomain>.daily.co/<room>
  onClose: () => void;
};

export default function VideoSessionDialog({ isOpen, roomUrl, onClose }: Props) {
  console.log("[VideoSessionDialog] file loaded"); // keep for now

  const containerRef = React.useRef<HTMLDivElement>(null);

  // 1) Create & mount the Daily iframe into containerRef
  const callFrame = useCallFrame({
    parentElRef: containerRef,
    options: {
      iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "12px" },
      showParticipantsBar: true,
    },
    shouldCreateInstance: React.useCallback(() => isOpen, [isOpen]),
  });

  // 2) Wire events once
  React.useEffect(() => {
    if (!callFrame) return;
    const onLoading = () => console.log("[Daily] loading");
    const onLoaded  = () => console.log("[Daily] loaded");
    const onJoined  = (e: any) => console.log("[Daily] joined-meeting", e);
    const onLeft    = (e: any) => console.log("[Daily] left-meeting", e);
    const onError   = (e: any) => console.error("[Daily] error", e);

    callFrame.on("loading", onLoading);
    callFrame.on("loaded", onLoaded);
    callFrame.on("joined-meeting", onJoined);
    callFrame.on("left-meeting", onLeft);
    callFrame.on("error", onError);

    return () => {
      callFrame.off("loading", onLoading);
      callFrame.off("loaded", onLoaded);
      callFrame.off("joined-meeting", onJoined);
      callFrame.off("left-meeting", onLeft);
      callFrame.off("error", onError);
    };
  }, [callFrame]);

  // 3) Join explicitly with URL when dialog opens
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isOpen || !roomUrl || !callFrame) return;

      console.log("[Daily] about to join", {
        meetingState: callFrame.meetingState?.(),
        url: roomUrl,
      });

      try {
        await callFrame.join({ url: roomUrl });
        if (!cancelled) console.log("[Daily] join() resolved");
      } catch (e) {
        if (!cancelled) console.error("[Daily] join() failed", e);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, roomUrl, callFrame]);

  // 4) Leave on close
  const handleClose = React.useCallback(async () => {
    try {
      if (callFrame) {
        await callFrame.leave();
      }
    } finally {
      onClose?.();
    }
  }, [callFrame, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl h-[70vh] rounded-xl shadow-xl overflow-hidden relative">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 rounded-md border px-3 py-1 text-sm"
        >
          Close
        </button>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
