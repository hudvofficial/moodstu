"use client";

export type OpenAIRealtimeEvent = Record<string, unknown> & { type?: string };

export interface OpenAIRealtimeCallbacks {
  onOpen(): void;
  onClose(): void;
  onError(error: Error): void;
  onInputTranscript(delta: string, completed: boolean): void;
  onOutputTranscript(delta: string, completed: boolean): void;
  onSpeaking(speaking: boolean): void;
  onTurnComplete(): void;
  onToolCall(call: { id: string; name: string; args: Record<string, unknown> }): void;
}

export class OpenAIRealtimeWebRTCClient {
  private peer: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private audio: HTMLAudioElement | null = null;

  constructor(private readonly token: string, private readonly inputStream: MediaStream, private readonly callbacks: OpenAIRealtimeCallbacks) {}

  async connect() {
    const peer = new RTCPeerConnection();
    this.peer = peer;
    this.audio = new Audio();
    this.audio.autoplay = true;
    peer.ontrack = (event) => { if (this.audio) this.audio.srcObject = event.streams[0]; };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed") this.callbacks.onError(new Error("OpenAI Realtime WebRTC connection failed"));
      if (peer.connectionState === "closed" || peer.connectionState === "disconnected") this.callbacks.onClose();
    };
    for (const track of this.inputStream.getAudioTracks()) peer.addTrack(track, this.inputStream);
    const channel = peer.createDataChannel("oai-events");
    this.channel = channel;
    channel.onopen = () => this.callbacks.onOpen();
    channel.onerror = () => this.callbacks.onError(new Error("OpenAI Realtime data channel failed"));
    channel.onmessage = (event) => this.handleEvent(event.data);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/sdp" },
      body: offer.sdp,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenAI Realtime SDP failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    await peer.setRemoteDescription({ type: "answer", sdp: await response.text() });
  }

  sendText(text: string) {
    this.send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text }] } });
    this.send({ type: "response.create" });
  }
  sendSystemEvent(text: string) { this.sendText(text); }
  sendToolResult(callId: string, result: unknown) {
    this.send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: callId, output: JSON.stringify(result) } });
    this.send({ type: "response.create" });
  }
  close() {
    this.channel?.close(); this.peer?.close();
    if (this.audio) this.audio.srcObject = null;
    this.channel = null; this.peer = null; this.audio = null;
  }
  private send(event: Record<string, unknown>) {
    if (this.channel?.readyState !== "open") throw new Error("OpenAI Realtime channel is not ready");
    this.channel.send(JSON.stringify(event));
  }
  private handleEvent(raw: unknown) {
    try {
      const event = JSON.parse(String(raw)) as OpenAIRealtimeEvent;
      const type = event.type || "";
      if (type === "error") {
        const detail = event.error as { message?: string } | undefined;
        this.callbacks.onError(new Error(detail?.message || "OpenAI Realtime error")); return;
      }
      if (type === "input_audio_buffer.speech_started") this.callbacks.onSpeaking(false);
      if (type === "output_audio_buffer.started" || type === "response.audio.delta") this.callbacks.onSpeaking(true);
      if (type === "output_audio_buffer.stopped") this.callbacks.onSpeaking(false);
      if (type === "conversation.item.input_audio_transcription.delta") this.callbacks.onInputTranscript(String(event.delta || ""), false);
      else if (type === "conversation.item.input_audio_transcription.completed") this.callbacks.onInputTranscript(String(event.transcript || ""), true);
      if (type === "response.output_audio_transcript.delta" || type === "response.audio_transcript.delta") this.callbacks.onOutputTranscript(String(event.delta || ""), false);
      else if (type === "response.output_audio_transcript.done" || type === "response.audio_transcript.done") this.callbacks.onOutputTranscript(String(event.transcript || ""), true);
      if (type === "response.function_call_arguments.done") {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(String(event.arguments || "{}")) as Record<string, unknown>; } catch {}
        this.callbacks.onToolCall({ id: String(event.call_id || event.item_id || ""), name: String(event.name || ""), args });
      }
      if (type === "response.done") this.callbacks.onTurnComplete();
    } catch (error) { this.callbacks.onError(error instanceof Error ? error : new Error(String(error))); }
  }
}
