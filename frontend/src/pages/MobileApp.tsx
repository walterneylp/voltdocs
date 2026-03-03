import { useEffect, useMemo, useRef, useState } from "react";
import { LucideIcon } from "../components/LucideIcon";
import { AppBuildInfo } from "../components/AppBuildInfo";
import { getAuthUser } from "../lib/auth";
import { AppTheme, readStoredTheme, saveTheme } from "../lib/theme";
import {
  getMe,
  getDocumentVersionUrl,
  listAssets,
  listDocumentEquipments,
  listDocuments,
  listDocumentVersions,
  listTickets,
  listUserGroupMembers,
  postFieldUpdate,
  uploadFieldUpdateFiles
} from "../lib/api";
import "../styles/mobile-app.css";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

export function MobileApp() {
  const authUser = getAuthUser();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [theme, setTheme] = useState<AppTheme>(() => readStoredTheme());
  const [activeTab, setActiveTab] = useState<"qr" | "ordens" | "perfil" | "eventos">(
    "qr"
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [openError, setOpenError] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [scannerSupported, setScannerSupported] = useState(true);
  const [assets, setAssets] = useState<Array<{ id: string; tag: string; name: string }>>(
    []
  );
  const [documents, setDocuments] = useState<
    Array<{
      id: string;
      title: string;
      category: string;
      category_id?: string | null;
      equipment_id?: string | null;
    }>
  >([]);
  const [documentEquipments, setDocumentEquipments] = useState<
    Array<{ document_id: string; equipment_id: string }>
  >([]);
  const [versions, setVersions] = useState<
    Array<{ id: string; document_id: string; valid_until: string | null; created_at: string }>
  >([]);
  const [tickets, setTickets] = useState<
    Array<{
      id: string;
      title: string;
      description: string | null;
      status: string | null;
      priority: string | null;
      equipment_id: string;
      assigned_to_id: string | null;
      assigned_group_ids: string[] | null;
      created_at: string;
    }>
  >([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isEventReport, setIsEventReport] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [audioClips, setAudioClips] = useState<Array<{ file: File; url: string }>>([]);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteMessage, setNoteMessage] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [eventPhotos, setEventPhotos] = useState<File[]>([]);
  const [eventAudioClips, setEventAudioClips] = useState<
    Array<{ file: File; url: string }>
  >([]);
  const [isRecordingEventAudio, setIsRecordingEventAudio] = useState(false);
  const [eventAudioSeconds, setEventAudioSeconds] = useState(0);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [eventMessage, setEventMessage] = useState("");
  const [enableEventReport, setEnableEventReport] = useState(false);
  const [showOpen, setShowOpen] = useState(true);
  const [showClosed, setShowClosed] = useState(false);
  const [tabWarning, setTabWarning] = useState("");
  const [freeEventTag, setFreeEventTag] = useState("");
  const [freeEventNote, setFreeEventNote] = useState("");
  const [freeEventPhotos, setFreeEventPhotos] = useState<File[]>([]);
  const [freeEventAudioClips, setFreeEventAudioClips] = useState<
    Array<{ file: File; url: string }>
  >([]);
  const [isRecordingFreeEventAudio, setIsRecordingFreeEventAudio] = useState(false);
  const [freeEventAudioSeconds, setFreeEventAudioSeconds] = useState(0);
  const [isSavingFreeEvent, setIsSavingFreeEvent] = useState(false);
  const [freeEventMessage, setFreeEventMessage] = useState("");
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const eventAudioRecorderRef = useRef<MediaRecorder | null>(null);
  const freeEventAudioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const eventAudioStreamRef = useRef<MediaStream | null>(null);
  const freeEventAudioStreamRef = useRef<MediaStream | null>(null);

  const notifyRecordingStart = () => {
    if (navigator.vibrate) {
      navigator.vibrate(120);
    }
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.04;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
      oscillator.onended = () => {
        context.close();
      };
    } catch {
      // ignore audio errors
    }
  };

  const isAnyRecording = () =>
    isRecordingAudio || isRecordingEventAudio || isRecordingFreeEventAudio;

  const handleTabChange = (tab: "qr" | "ordens" | "perfil" | "eventos") => {
    if (isAnyRecording()) {
      setTabWarning("Finalize a gravacao antes de trocar de tela.");
      return;
    }
    setTabWarning("");
    setActiveTab(tab);
  };

  useEffect(() => {
    if (!isRecordingAudio) return;
    const timer = window.setInterval(() => {
      setAudioSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecordingAudio]);

  useEffect(() => {
    if (!isRecordingEventAudio) return;
    const timer = window.setInterval(() => {
      setEventAudioSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecordingEventAudio]);

  useEffect(() => {
    if (!isRecordingFreeEventAudio) return;
    const timer = window.setInterval(() => {
      setFreeEventAudioSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecordingFreeEventAudio]);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getMe(),
      listAssets(),
      listDocuments(),
      listDocumentEquipments(),
      listDocumentVersions(),
      listTickets(),
      listUserGroupMembers()
    ])
      .then(([me, assetList, docs, links, versionList, ticketList, groupMembers]) => {
        if (!isMounted) return;
        setProfileId(me.profile.id);
        setTenantId(me.profile.tenant_id ?? null);
        setAssets(assetList);
        setDocuments(docs);
        setDocumentEquipments(links);
        setVersions(
          versionList.map((item) => ({
            id: item.id,
            document_id: item.document_id,
            valid_until: item.valid_until,
            created_at: item.created_at
          }))
        );
        setTickets(ticketList);
        setGroupIds(
          groupMembers.filter((item) => item.user_id === me.profile.id).map((item) => item.group_id)
        );
      })
      .catch((err) => {
        if (!isMounted) return;
        setScanError(err instanceof Error ? err.message : "Falha ao carregar dados.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isScanning) return;
    let stream: MediaStream | null = null;
    let interval: number | null = null;
    const run = async () => {
      try {
        setScanError("");
        const detector = "BarcodeDetector" in window
          ? new (window as typeof window & { BarcodeDetector: typeof BarcodeDetector }).BarcodeDetector({
              formats: ["qr_code"]
            })
          : null;
        if (!detector) {
          setScannerSupported(false);
          setIsScanning(false);
          return;
        }
        setScannerSupported(true);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        interval = window.setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const value = barcodes[0].rawValue;
              setScanValue(value);
              setIsScanning(false);
            }
          } catch {
            // ignore per-frame errors
          }
        }, 600);
      } catch (err) {
        setScanError(
          err instanceof Error
            ? err.message
            : "Nao foi possivel acessar a camera."
        );
        setIsScanning(false);
      }
    };
    run();
    return () => {
      if (interval) window.clearInterval(interval);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [isScanning]);

  const latestVersionByDoc = useMemo(() => {
    const map = new Map<string, { id: string; valid_until: string | null; created_at: string }>();
    versions.forEach((version) => {
      const existing = map.get(version.document_id);
      if (!existing || new Date(version.created_at) > new Date(existing.created_at)) {
        map.set(version.document_id, version);
      }
    });
    return map;
  }, [versions]);

  const documentsByEquipment = useMemo(() => {
    const map = new Map<string, string[]>();
    documentEquipments.forEach((link) => {
      const list = map.get(link.equipment_id) ?? [];
      if (!list.includes(link.document_id)) list.push(link.document_id);
      map.set(link.equipment_id, list);
    });
    documents.forEach((doc) => {
      if (!doc.equipment_id) return;
      const list = map.get(doc.equipment_id) ?? [];
      if (!list.includes(doc.id)) list.push(doc.id);
      map.set(doc.equipment_id, list);
    });
    return map;
  }, [documentEquipments, documents]);

  const scannedAsset = useMemo(() => {
    if (!scanValue) return null;
    const normalized = scanValue.trim().toLowerCase();
    const exact = assets.find((asset) => asset.tag.toLowerCase() === normalized);
    if (exact) return exact;
    return (
      assets.find((asset) => normalized.includes(asset.tag.toLowerCase())) ?? null
    );
  }, [scanValue, assets]);

  const scannedDocuments = useMemo(() => {
    if (!scannedAsset) return [];
    const docIds = new Set<string>();
    const linkedIds = documentsByEquipment.get(scannedAsset.id) ?? [];
    linkedIds.forEach((id) => docIds.add(id));
    documents.forEach((doc) => {
      if (doc.equipment_id === scannedAsset.id) docIds.add(doc.id);
    });
    return documents.filter((doc) => docIds.has(doc.id));
  }, [scannedAsset, documentsByEquipment, documents]);

  const assignedTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (profileId && ticket.assigned_to_id === profileId) return true;
      if (ticket.assigned_group_ids && groupIds.length > 0) {
        return ticket.assigned_group_ids.some((groupId) => groupIds.includes(groupId));
      }
      return false;
    });
  }, [tickets, profileId, groupIds]);

  const filteredTickets = useMemo(() => {
    const closedStatuses = ["resolvido", "finalizado", "concluido", "fechado"];
    return assignedTickets.filter((ticket) => {
      const status = (ticket.status ?? "").toLowerCase();
      const isClosed = closedStatuses.includes(status);
      if (isClosed && !showClosed) return false;
      if (!isClosed && !showOpen) return false;
      return true;
    });
  }, [assignedTickets, showClosed, showOpen]);

  const selectedTicketData = useMemo(() => {
    if (!selectedTicket) return null;
    const ticket = filteredTickets.find((item) => item.id === selectedTicket);
    if (!ticket) return null;
    const asset = assets.find((item) => item.id === ticket.equipment_id) ?? null;
    return { ticket, asset };
  }, [selectedTicket, filteredTickets, assets]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleStartScan = () => {
    setScanValue("");
    setScanError("");
    setIsScanning(true);
  };

  const handleStopScan = () => {
    setIsScanning(false);
  };

  const handleOpenDocument = async (docId: string) => {
    const version = latestVersionByDoc.get(docId);
    if (!version) {
      setOpenError("Documento sem versao disponivel.");
      return;
    }
    setOpenError("");
    try {
      const response = await getDocumentVersionUrl(version.id);
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : "Falha ao abrir documento.");
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setPhotos((prev) => [...prev, ...files]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStartAudio = async () => {
    if (isRecordingAudio) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, {
          type: blob.type || "audio/webm"
        });
        const url = URL.createObjectURL(blob);
        setAudioClips((prev) => [...prev, { file, url }]);
        audioStreamRef.current?.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
        audioRecorderRef.current = null;
        setAudioSeconds(0);
      };
      recorder.start();
      setIsRecordingAudio(true);
      notifyRecordingStart();
    } catch (err) {
      setNoteMessage(err instanceof Error ? err.message : "Falha ao gravar audio.");
    }
  };

  const handleStopAudio = () => {
    if (!audioRecorderRef.current) return;
    audioRecorderRef.current.stop();
    setIsRecordingAudio(false);
  };

  const handleRemoveAudio = (index: number) => {
    setAudioClips((prev) => {
      const clip = prev[index];
      if (clip) URL.revokeObjectURL(clip.url);
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleEventPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setEventPhotos((prev) => [...prev, ...files]);
  };

  const handleRemoveEventPhoto = (index: number) => {
    setEventPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStartEventAudio = async () => {
    if (isRecordingEventAudio) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      eventAudioStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      eventAudioRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, {
          type: blob.type || "audio/webm"
        });
        const url = URL.createObjectURL(blob);
        setEventAudioClips((prev) => [...prev, { file, url }]);
        eventAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
        eventAudioStreamRef.current = null;
        eventAudioRecorderRef.current = null;
        setEventAudioSeconds(0);
      };
      recorder.start();
      setIsRecordingEventAudio(true);
      notifyRecordingStart();
    } catch (err) {
      setEventMessage(err instanceof Error ? err.message : "Falha ao gravar audio.");
    }
  };

  const handleStopEventAudio = () => {
    if (!eventAudioRecorderRef.current) return;
    eventAudioRecorderRef.current.stop();
    setIsRecordingEventAudio(false);
  };

  const handleRemoveEventAudio = (index: number) => {
    setEventAudioClips((prev) => {
      const clip = prev[index];
      if (clip) URL.revokeObjectURL(clip.url);
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleFreeEventPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setFreeEventPhotos((prev) => [...prev, ...files]);
  };

  const handleRemoveFreeEventPhoto = (index: number) => {
    setFreeEventPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStartFreeEventAudio = async () => {
    if (isRecordingFreeEventAudio) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      freeEventAudioStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      freeEventAudioRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, {
          type: blob.type || "audio/webm"
        });
        const url = URL.createObjectURL(blob);
        setFreeEventAudioClips((prev) => [...prev, { file, url }]);
        freeEventAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
        freeEventAudioStreamRef.current = null;
        freeEventAudioRecorderRef.current = null;
        setFreeEventAudioSeconds(0);
      };
      recorder.start();
      setIsRecordingFreeEventAudio(true);
      notifyRecordingStart();
    } catch (err) {
      setFreeEventMessage(err instanceof Error ? err.message : "Falha ao gravar audio.");
    }
  };

  const handleStopFreeEventAudio = () => {
    if (!freeEventAudioRecorderRef.current) return;
    freeEventAudioRecorderRef.current.stop();
    setIsRecordingFreeEventAudio(false);
  };

  const handleRemoveFreeEventAudio = (index: number) => {
    setFreeEventAudioClips((prev) => {
      const clip = prev[index];
      if (clip) URL.revokeObjectURL(clip.url);
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleSaveFreeEvent = async () => {
    if (!profileId || !tenantId) return;
    if (!freeEventNote.trim()) {
      setFreeEventMessage("Escreva uma observacao antes de salvar.");
      return;
    }
    setIsSavingFreeEvent(true);
    setFreeEventMessage("");
    try {
      const files = [
        ...freeEventPhotos,
        ...freeEventAudioClips.map((clip) => clip.file)
      ];
      const attachments =
        files.length > 0
          ? await uploadFieldUpdateFiles({
              tenant_id: tenantId,
              user_id: profileId,
              files
            })
          : null;
      await postFieldUpdate({
        base_path: null,
        message: freeEventNote.trim(),
        code: freeEventTag.trim() || null,
        user_id: profileId,
        user_name: authUser?.name ?? null,
        tenant_id: tenantId,
        attachments,
        status: "pendente",
        event_report: true
      });
      setFreeEventNote("");
      setFreeEventTag("");
      setFreeEventPhotos([]);
      freeEventAudioClips.forEach((clip) => URL.revokeObjectURL(clip.url));
      setFreeEventAudioClips([]);
      setFreeEventMessage("Registro salvo com sucesso.");
    } catch (err) {
      setFreeEventMessage(err instanceof Error ? err.message : "Falha ao salvar registro.");
    } finally {
      setIsSavingFreeEvent(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  };

  const handleSaveNote = async () => {
    if (!selectedTicketData || !profileId || !tenantId) return;
    if (!note.trim()) {
      setNoteMessage("Escreva uma observacao antes de salvar.");
      return;
    }
    setIsSavingNote(true);
    setNoteMessage("");
    try {
      const files = [...photos, ...audioClips.map((clip) => clip.file)];
      const attachments =
        files.length > 0
          ? await uploadFieldUpdateFiles({ tenant_id: tenantId, user_id: profileId, files })
          : null;
      await postFieldUpdate({
        base_path: selectedTicketData.ticket.equipment_id,
        message: note.trim(),
        code: isEventReport
          ? selectedTicketData.asset?.tag ?? null
          : selectedTicketData.ticket.title,
        user_id: profileId,
        user_name: authUser?.name ?? null,
        tenant_id: tenantId,
        attachments,
        status: "pendente",
        event_report: isEventReport
      });
      setNote("");
      setPhotos([]);
      audioClips.forEach((clip) => URL.revokeObjectURL(clip.url));
      setAudioClips([]);
      setIsEventReport(false);
      setNoteMessage("Observacao salva com sucesso.");
    } catch (err) {
      setNoteMessage(err instanceof Error ? err.message : "Falha ao salvar observacao.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!scannedAsset || !profileId || !tenantId) return;
    if (!eventNote.trim()) {
      setEventMessage("Escreva uma observacao antes de salvar.");
      return;
    }
    setIsSavingEvent(true);
    setEventMessage("");
    try {
      const files = [...eventPhotos, ...eventAudioClips.map((clip) => clip.file)];
      const attachments =
        files.length > 0
          ? await uploadFieldUpdateFiles({
              tenant_id: tenantId,
              user_id: profileId,
              files
            })
          : null;
      await postFieldUpdate({
        base_path: scannedAsset.id,
        message: eventNote.trim(),
        code: scannedAsset.tag,
        user_id: profileId,
        user_name: authUser?.name ?? null,
        tenant_id: tenantId,
        attachments,
        status: "pendente",
        event_report: true
      });
      setEventNote("");
      setEventPhotos([]);
      eventAudioClips.forEach((clip) => URL.revokeObjectURL(clip.url));
      setEventAudioClips([]);
      setEnableEventReport(false);
      setEventMessage("Registro salvo com sucesso.");
    } catch (err) {
      setEventMessage(err instanceof Error ? err.message : "Falha ao salvar registro.");
    } finally {
      setIsSavingEvent(false);
    }
  };

  return (
    <div className="mobile-app">
      <header className="mobile-header">
        <div>
          <p>VoltDocs Mobile</p>
          <strong>{authUser?.name ?? "Técnico"}</strong>
        </div>
        <button className="mobile-theme" onClick={handleToggleTheme}>
          <LucideIcon name={theme === "light" ? "moon" : "sun"} />
        </button>
      </header>

      <div className="mobile-tabs">
        <button
          className={activeTab === "qr" ? "is-active" : ""}
          onClick={() => handleTabChange("qr")}
        >
          QRcode
        </button>
        <button
          className={activeTab === "ordens" ? "is-active" : ""}
          onClick={() => handleTabChange("ordens")}
        >
          Ordens
        </button>
        <button
          className={activeTab === "eventos" ? "is-active" : ""}
          onClick={() => handleTabChange("eventos")}
        >
          Rep. Eventos
        </button>
        <button
          className={activeTab === "perfil" ? "is-active" : ""}
          onClick={() => handleTabChange("perfil")}
        >
          Perfil
        </button>
      </div>
      {tabWarning ? <div className="mobile-warning">{tabWarning}</div> : null}

      <main className="mobile-content">
        {activeTab === "qr" ? (
          <section className="mobile-section">
            <div className="mobile-qr">
              <button className="mobile-qr-button" onClick={handleStartScan}>
                <LucideIcon name="scan" />
                QRcode
              </button>
              <p>Use a camera para ler o codigo do equipamento.</p>
              <div className="mobile-field mobile-field-inline">
                <label>Tag do equipamento</label>
                <input
                  type="text"
                  value={scanValue}
                  onChange={(event) => setScanValue(event.target.value)}
                  placeholder="Digite a tag"
                />
              </div>
              {!scannerSupported ? (
                <div className="mobile-warning">
                  Seu navegador nao suporta leitura direta. Digite a TAG manualmente.
                </div>
              ) : null}
              {scanError ? <div className="mobile-error">{scanError}</div> : null}
            </div>

            {isScanning ? (
              <div className="mobile-scanner">
                <video ref={videoRef} playsInline muted />
                <button className="mobile-qr-stop" onClick={handleStopScan}>
                  Parar
                </button>
              </div>
            ) : null}

            {scanValue ? (
              <div className="mobile-result">
                <h3>Equipamento</h3>
                {scannedAsset ? (
                  <div className="mobile-card">
                    <strong>{scannedAsset.tag}</strong>
                    <span>{scannedAsset.name}</span>
                  </div>
                ) : (
                  <div className="mobile-warning">Nenhum equipamento encontrado.</div>
                )}
              </div>
            ) : null}

            {scannedAsset ? (
              <div className="mobile-docs">
                <h3>Documentos vinculados</h3>
                {openError ? <div className="mobile-error">{openError}</div> : null}
                {scannedDocuments.length === 0 ? (
                  <p>Nenhum documento vinculado a este equipamento.</p>
                ) : (
                  <ul>
                    {scannedDocuments.map((doc) => {
                      const version = latestVersionByDoc.get(doc.id);
                      return (
                        <li key={doc.id}>
                          <div>
                            <strong>{doc.title}</strong>
                            <span>{doc.category}</span>
                          </div>
                          <div className="mobile-doc-actions">
                            <span className="mobile-tag">
                              Validade: {formatDate(version?.valid_until)}
                            </span>
                            <button
                              className="mobile-doc-open"
                              onClick={() => handleOpenDocument(doc.id)}
                            >
                              Abrir
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}

            {scannedAsset ? (
              <div className="mobile-card">
                <label className="mobile-checkbox">
                  <input
                    type="checkbox"
                    checked={enableEventReport}
                    onChange={(event) => setEnableEventReport(event.target.checked)}
                  />
                  Reportagem de Evento
                </label>
                {enableEventReport ? (
                  <>
                    <textarea
                      rows={4}
                      value={eventNote}
                      onChange={(event) => setEventNote(event.target.value)}
                      placeholder="Descreva o evento observado..."
                    />
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handleEventPhotoChange}
                    />
                    <button
                      className={`mobile-record${isRecordingEventAudio ? " is-recording" : ""}`}
                      type="button"
                      onClick={isRecordingEventAudio ? handleStopEventAudio : handleStartEventAudio}
                    >
                      {isRecordingEventAudio ? "Gravando..." : "Gravar áudio"}
                    </button>
                    {isRecordingEventAudio ? (
                      <span className="mobile-record-timer">
                        {formatTimer(eventAudioSeconds)}
                      </span>
                    ) : null}
                    {eventPhotos.length > 0 ? (
                      <div className="mobile-photo-grid">
                        {eventPhotos.map((photo, index) => (
                          <div key={`${photo.name}-${index}`}>
                            <img src={URL.createObjectURL(photo)} alt={photo.name} />
                            <button onClick={() => handleRemoveEventPhoto(index)}>
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {eventAudioClips.length > 0 ? (
                      <div className="mobile-audio-list">
                        {eventAudioClips.map((clip, index) => (
                          <div className="mobile-audio-item" key={`${clip.file.name}-${index}`}>
                            <audio controls src={clip.url} />
                            <button onClick={() => handleRemoveEventAudio(index)}>Remover</button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <button
                      className="mobile-primary"
                      onClick={handleSaveEvent}
                      disabled={isSavingEvent}
                    >
                      {isSavingEvent ? "Salvando..." : "Salvar evento"}
                    </button>
                    {eventMessage ? <p className="mobile-note">{eventMessage}</p> : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "ordens" ? (
          <section className="mobile-section">
            <h2>Ordens de servico</h2>
            <div className="mobile-ticket-filters">
              <label>
                <input
                  type="checkbox"
                  checked={showOpen}
                  onChange={(event) => setShowOpen(event.target.checked)}
                />
                Abertos
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showClosed}
                  onChange={(event) => setShowClosed(event.target.checked)}
                />
                Finalizados/Resolvidos
              </label>
            </div>
            {filteredTickets.length === 0 ? (
              <p>Nenhuma ordem atribuida no momento.</p>
            ) : (
              <div className="mobile-tickets">
                {filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    className={
                      selectedTicket === ticket.id
                        ? "mobile-ticket is-active"
                        : "mobile-ticket"
                    }
                    onClick={() => setSelectedTicket(ticket.id)}
                  >
                    <strong>{ticket.title}</strong>
                    <span>{ticket.priority ?? "Sem prioridade"}</span>
                    <span>Status: {ticket.status ?? "Pendente"}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedTicketData ? (
              <div className="mobile-ticket-detail">
                <h3>Detalhes da ordem</h3>
                <div className="mobile-card">
                  <strong>{selectedTicketData.ticket.title}</strong>
                  <p>{selectedTicketData.ticket.description ?? "Sem descricao."}</p>
                  <div className="mobile-info">
                    <span>Prioridade: {selectedTicketData.ticket.priority ?? "—"}</span>
                    <span>Status: {selectedTicketData.ticket.status ?? "—"}</span>
                    <span>Aberto: {formatDate(selectedTicketData.ticket.created_at)}</span>
                  </div>
                </div>

                <div className="mobile-card">
                  <h4>Equipamento</h4>
                  {selectedTicketData.asset ? (
                    <>
                      <strong>{selectedTicketData.asset.tag}</strong>
                      <span>{selectedTicketData.asset.name}</span>
                    </>
                  ) : (
                    <span>Equipamento nao encontrado.</span>
                  )}
                </div>

                <div className="mobile-card">
                  <h4>Fotos do equipamento</h4>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handlePhotoChange}
                  />
                  <button
                    className={`mobile-record${isRecordingAudio ? " is-recording" : ""}`}
                    type="button"
                    onClick={isRecordingAudio ? handleStopAudio : handleStartAudio}
                  >
                    {isRecordingAudio ? "Gravando..." : "Gravar áudio"}
                  </button>
                  {isRecordingAudio ? (
                    <span className="mobile-record-timer">{formatTimer(audioSeconds)}</span>
                  ) : null}
                  {photos.length > 0 ? (
                    <div className="mobile-photo-grid">
                      {photos.map((photo, index) => (
                        <div key={`${photo.name}-${index}`}>
                          <img src={URL.createObjectURL(photo)} alt={photo.name} />
                          <button onClick={() => handleRemovePhoto(index)}>Remover</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Nenhuma foto adicionada.</p>
                  )}
                  {audioClips.length > 0 ? (
                    <div className="mobile-audio-list">
                      {audioClips.map((clip, index) => (
                        <div className="mobile-audio-item" key={`${clip.file.name}-${index}`}>
                          <audio controls src={clip.url} />
                          <button onClick={() => handleRemoveAudio(index)}>Remover</button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mobile-card">
                  <h4>Observacoes</h4>
                  <textarea
                    rows={4}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Descreva o que foi feito..."
                  />
                  <label className="mobile-checkbox">
                    <input
                      type="checkbox"
                      checked={isEventReport}
                      onChange={(event) => setIsEventReport(event.target.checked)}
                    />
                    Reportagem de Evento
                  </label>
                  <button
                    className="mobile-primary"
                    onClick={handleSaveNote}
                    disabled={isSavingNote}
                  >
                    {isSavingNote ? "Salvando..." : "Salvar observacao"}
                  </button>
                  {noteMessage ? <p className="mobile-note">{noteMessage}</p> : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "eventos" ? (
          <section className="mobile-section">
            <h2>Reportar evento</h2>
            <div className="mobile-card">
              <p>Use quando nao houver TAG disponivel.</p>
              <div className="mobile-field mobile-field-inline">
                <label>Tag (opcional)</label>
                <input
                  type="text"
                  value={freeEventTag}
                  onChange={(event) => setFreeEventTag(event.target.value)}
                  placeholder="Digite a tag se souber"
                />
              </div>
              <textarea
                rows={4}
                value={freeEventNote}
                onChange={(event) => setFreeEventNote(event.target.value)}
                placeholder="Descreva o evento observado..."
              />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleFreeEventPhotoChange}
              />
              <button
                className={`mobile-record${
                  isRecordingFreeEventAudio ? " is-recording" : ""
                }`}
                type="button"
                onClick={
                  isRecordingFreeEventAudio ? handleStopFreeEventAudio : handleStartFreeEventAudio
                }
              >
                {isRecordingFreeEventAudio ? "Gravando..." : "Gravar áudio"}
              </button>
              {isRecordingFreeEventAudio ? (
                <span className="mobile-record-timer">
                  {formatTimer(freeEventAudioSeconds)}
                </span>
              ) : null}
              {freeEventPhotos.length > 0 ? (
                <div className="mobile-photo-grid">
                  {freeEventPhotos.map((photo, index) => (
                    <div key={`${photo.name}-${index}`}>
                      <img src={URL.createObjectURL(photo)} alt={photo.name} />
                      <button onClick={() => handleRemoveFreeEventPhoto(index)}>Remover</button>
                    </div>
                  ))}
                </div>
              ) : null}
              {freeEventAudioClips.length > 0 ? (
                <div className="mobile-audio-list">
                  {freeEventAudioClips.map((clip, index) => (
                    <div className="mobile-audio-item" key={`${clip.file.name}-${index}`}>
                      <audio controls src={clip.url} />
                      <button onClick={() => handleRemoveFreeEventAudio(index)}>Remover</button>
                    </div>
                  ))}
                </div>
              ) : null}
              <button
                className="mobile-primary"
                onClick={handleSaveFreeEvent}
                disabled={isSavingFreeEvent}
              >
                {isSavingFreeEvent ? "Salvando..." : "Salvar evento"}
              </button>
              {freeEventMessage ? <p className="mobile-note">{freeEventMessage}</p> : null}
            </div>
          </section>
        ) : null}

        {activeTab === "perfil" ? (
          <section className="mobile-section">
            <h2>Perfil</h2>
            <div className="mobile-card">
              <strong>{authUser?.name ?? "—"}</strong>
              <span>{authUser?.email ?? "—"}</span>
            <AppBuildInfo />
            </div>
            <div className="mobile-card">
              <h4>Preferencias</h4>
              <p>Tema atual: {theme === "light" ? "Claro" : "Escuro"}</p>
              <button className="mobile-primary" onClick={handleToggleTheme}>
                Alternar tema
              </button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
