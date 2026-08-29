(() => {
  if (window.wefranchPrototypeRecorder) {
    return;
  }

  const MIME_CANDIDATES = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  const pickMimeType = () => {
    if (!window.MediaRecorder?.isTypeSupported) {
      return "";
    }

    return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  };

  const extensionForMime = (mimeType) => (String(mimeType).includes("mp4") ? "mp4" : "webm");

  const getFileName = (targetWindow, mimeType) => {
    const pathSegments = targetWindow.location.pathname.split("/").filter(Boolean);
    const prototypesIndex = pathSegments.lastIndexOf("_prototypes");
    let projectName = pathSegments[prototypesIndex + 1] || "prototypes";

    if (projectName.includes(".")) {
      projectName = pathSegments[Math.max(prototypesIndex, pathSegments.length - 2)] || "prototypes";
    }

    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const safeProjectName = projectName.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
    return `${safeProjectName}-demo-${date}-${time}.${extensionForMime(mimeType)}`;
  };

  const downloadBlob = (blob, fileName) => {
    const objectUrl = URL.createObjectURL(blob);
    const download = document.createElement("a");
    download.href = objectUrl;
    download.download = fileName;
    download.hidden = true;
    document.documentElement.appendChild(download);
    download.click();
    download.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
  };

  const stopStream = (stream) => {
    stream?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (error) {
        // The track may already have ended.
      }
    });
  };

  const getCaptureApi = (element, name) => {
    const view = element.ownerDocument?.defaultView;
    return view?.[name] || window[name];
  };

  const restrictTrackToElement = async (stream, element) => {
    const track = stream.getVideoTracks()[0];
    const RestrictionTarget = getCaptureApi(element, "RestrictionTarget");
    if (!track || typeof track.restrictTo !== "function" || typeof RestrictionTarget?.fromElement !== "function") {
      return false;
    }

    try {
      const target = await RestrictionTarget.fromElement(element);
      await track.restrictTo(target);
      return true;
    } catch (error) {
      console.warn("Could not restrict the recording to the prototype viewport.", error);
      return false;
    }
  };

  const cropTrackToElement = async (stream, element) => {
    const track = stream.getVideoTracks()[0];
    const CropTarget = getCaptureApi(element, "CropTarget");
    if (!track || typeof track.cropTo !== "function" || typeof CropTarget?.fromElement !== "function") {
      return false;
    }

    try {
      const target = await CropTarget.fromElement(element);
      await track.cropTo(target);
      return true;
    } catch (error) {
      console.warn("Could not crop the recording to the prototype viewport.", error);
      return false;
    }
  };

  const limitTrackToElement = async (stream, element) => {
    if (!stream || !element) {
      return;
    }

    // Prefer Element Capture so overlays like the recorder toast stay visible
    // on screen but are omitted from the recorded frames.
    if (await restrictTrackToElement(stream, element)) {
      return;
    }

    await cropTrackToElement(stream, element);
  };

  const getMediaDevices = (mediaWindow) => mediaWindow?.navigator?.mediaDevices || null;

  const getStream = async (mediaWindow = window) => {
    if (mediaWindow.location.protocol === "file:" || window.location.protocol === "file:") {
      throw new Error("Open the prototype through localhost to record.");
    }

    const mediaDevices = getMediaDevices(mediaWindow);
    if (!mediaDevices?.getDisplayMedia || !window.MediaRecorder) {
      throw new Error("Recording is not supported in this browser.");
    }

    try {
      return await mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "browser",
        },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "exclude",
        monitorTypeSurfaces: "exclude",
      });
    } catch (error) {
      if (error?.name === "NotAllowedError" || error?.name === "AbortError") {
        const cancelled = new Error("Recording cancelled");
        cancelled.name = "NotAllowedError";
        throw cancelled;
      }

      throw error;
    }
  };

  const record = (stream, {
    onTick = () => undefined,
    onEnded = () => undefined,
    onStatus = () => undefined,
    targetWindow = window,
  } = {}) => {
    const mimeType = pickMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })
      : new MediaRecorder(stream);
    const chunks = [];
    let tickTimer = 0;
    let finalized = false;

    const finalize = () => {
      if (finalized) {
        return;
      }

      finalized = true;
      window.clearInterval(tickTimer);
      stopStream(stream);
    };

    const stopped = new Promise((resolve, reject) => {
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data?.size) {
          chunks.push(event.data);
        }
      });

      recorder.addEventListener("error", (event) => {
        finalize();
        reject(event.error || new Error("Recording failed"));
      });

      recorder.addEventListener("stop", () => {
        finalize();
        onStatus?.("captured");

        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" });
          if (blob.size) {
            const fileName = getFileName(targetWindow, blob.type);
            downloadBlob(blob, fileName);
            const result = { fileName, blob };
            resolve(result);
            onEnded(result);
            return;
          }

          const result = { fileName: getFileName(targetWindow, recorder.mimeType || mimeType), blob };
          resolve(result);
          onEnded(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    stream.getVideoTracks().forEach((track) => {
      track.addEventListener("ended", () => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      });
    });

    recorder.start(250);
    const startedAt = Date.now();
    onTick(0);
    tickTimer = window.setInterval(() => onTick(Date.now() - startedAt), 250);

    return {
      stop: () => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }

        return stopped;
      },
    };
  };

  const start = async ({
    mediaWindow = window,
    targetWindow = window,
    captureElement = null,
    onTick,
    onEnded,
    onStatus,
  } = {}) => {
    const stream = await getStream(mediaWindow);
    await limitTrackToElement(stream, captureElement);
    return record(stream, { targetWindow, onTick, onEnded, onStatus });
  };

  window.wefranchPrototypeRecorder = {
    getStream,
    record,
    start,
  };
})();
