import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "../components/WorkoutControls";
import { analyzeVideo, type AnalysisStatus } from "../form-coach/analyze";
import { DISCLAIMER, RECORDING_INSTRUCTIONS } from "../form-coach/config";
import type { AnalysisResult } from "../form-coach/feedback";
import { createPoseEstimator } from "../form-coach/pose";
import { loadVideo, type LoadedVideo } from "../form-coach/video";
import { colors } from "../theme";

function Disclaimer() {
  return (
    <View style={styles.disclaimer}>
      <Text style={styles.sectionTitle}>
        Before you interpret these observations
      </Text>
      <Text style={styles.small}>{DISCLAIMER}</Text>
    </View>
  );
}
export function FormCoachScreen({ onBack }: { onBack: () => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const resource = useRef<LoadedVideo | null>(null);
  const operation = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const [selected, setSelected] = useState<{
    name: string;
    url: string;
    duration: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(
    () => () => {
      generation.current++;
      operation.current?.abort();
      resource.current?.dispose();
    },
    [],
  );
  function reset() {
    generation.current++;
    operation.current?.abort();
    operation.current = null;
    resource.current?.dispose();
    resource.current = null;
    setSelected(null);
    setResult(null);
    setStatus(null);
    setError("");
    setBusy(false);
    setConfirmed(false);
    if (picker.current) picker.current.value = "";
  }
  async function selectFile(file: File) {
    reset();
    const version = generation.current;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setStatus({
      stage: "frames",
      progress: 0,
      message: "Checking video format and duration…",
    });
    try {
      const loaded = await loadVideo(file, controller.signal);
      if (version !== generation.current) {
        loaded.dispose();
        return;
      }
      resource.current = loaded;
      setSelected({
        name: file.name,
        url: loaded.url,
        duration: loaded.duration,
      });
      setStatus(null);
    } catch (failure) {
      if (version === generation.current && !controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "This video could not be read. Try another file.",
        );
    } finally {
      if (version === generation.current) {
        setBusy(false);
        operation.current = null;
      }
    }
  }
  async function analyze() {
    if (busy || !confirmed || !resource.current) return;
    const version = generation.current;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const next = await analyzeVideo(resource.current.video, {
        signal: controller.signal,
        createEstimator: createPoseEstimator,
        onStatus: (value) => {
          if (version === generation.current) setStatus(value);
        },
      });
      if (version === generation.current) {
        setResult(next);
        setStatus(null);
      }
    } catch (failure) {
      if (version === generation.current && !controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Analysis failed. Please retry.",
        );
    } finally {
      if (version === generation.current) {
        setBusy(false);
        setStatus(null);
        operation.current = null;
      }
    }
  }
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Button label="‹  Back" variant="text" onPress={onBack} />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>FORM ANALYSIS · EXPERIMENTAL</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Meet your movement.
        </Text>
        <Text style={styles.heroText}>Bodyweight Squat · Side View</Text>
        <Text style={styles.heroText}>
          Measured movement observations, one rep at a time.
        </Text>
      </View>
      <Text style={styles.sectionTitle}>1 · Record & select</Text>
      <Text style={styles.body}>{RECORDING_INSTRUCTIONS}</Text>
      <Text style={styles.small}>
        One person only. No weights. MP4 or WebM recommended · up to 50 MB · up
        to 30 seconds.
      </Text>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your video stays with you.</Text>
        <Text style={styles.small}>
          Video is processed in this browser. It is never uploaded or
          permanently stored by SpotMe. The pose model and runtime are
          downloaded when you select Analyze Video; those hosts receive asset
          requests, not your video.
        </Text>
      </View>
      <input
        ref={picker}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,.mp4,.webm,.ogv,.mov,.m4v"
        aria-label="Upload Video"
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void selectFile(file);
          event.currentTarget.value = "";
        }}
      />
      {!selected && (
        <Button
          label="Upload Video"
          disabled={busy}
          onPress={() => picker.current?.click()}
        />
      )}
      {selected && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{selected.name}</Text>
          <Text style={styles.small}>
            {selected.duration.toFixed(1)} seconds · preview
          </Text>
          <video
            key={selected.url}
            src={selected.url}
            controls
            playsInline
            preload="metadata"
            aria-label="Selected squat video preview"
            style={{
              width: "100%",
              maxHeight: 300,
              borderRadius: 12,
              backgroundColor: colors.ink,
            }}
          />
          <Button
            label={busy ? "Cancel & remove video" : "Remove video"}
            variant="secondary"
            onPress={reset}
          />
        </View>
      )}
      <Text style={styles.sectionTitle}>2 · Analyze movement</Text>
      <Disclaimer />
      {selected && (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmed, disabled: busy }}
          aria-checked={confirmed}
          disabled={busy}
          onPress={() => setConfirmed(!confirmed)}
          style={styles.confirmation}
        >
          <Text style={styles.check}>{confirmed ? "✓" : "○"}</Text>
          <Text style={[styles.small, { flex: 1 }]}>
            This video shows one person doing bodyweight squats, filmed from the
            side with the entire body visible.
          </Text>
        </Pressable>
      )}
      {error !== "" && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Button
        label={error && selected ? "Retry Analysis" : "Analyze Video"}
        disabled={!selected || !confirmed || busy}
        busy={busy}
        onPress={() => {
          void analyze();
        }}
      />
      {busy && status && (
        <View aria-live="polite" style={styles.card}>
          <ActivityIndicator color={colors.green} />
          <Text style={styles.body}>{status.message}</Text>
          {status.stage === "frames" && (
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.round(status.progress * 100),
              }}
              style={styles.track}
            >
              <View
                style={[styles.fill, { width: `${status.progress * 100}%` }]}
              />
            </View>
          )}
          {!selected && (
            <Button label="Cancel" variant="text" onPress={reset} />
          )}
        </View>
      )}
      {result && (
        <View style={styles.results}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            3 · Your movement observations
          </Text>
          <View style={styles.metrics}>
            <View style={[styles.card, styles.metric]}>
              <Text style={styles.value}>
                {result.reliable ? result.repetitions.length : "—"}
              </Text>
              <Text style={styles.small}>complete repetitions detected</Text>
            </View>
            <View style={[styles.card, styles.metric]}>
              <Text style={styles.value}>
                {result.averageMinimumKneeAngle === null
                  ? "—"
                  : `${Math.round(result.averageMinimumKneeAngle)}°`}
              </Text>
              <Text style={styles.small}>average minimum knee angle</Text>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Tracking quality: {result.quality}
            </Text>
            <Text style={styles.small}>
              {Math.round(result.trackedRatio * 100)}% of sampled frames usable
              · {result.validFrames} / {result.totalFrames} frames
              {result.side ? ` · ${result.side} side` : ""}
            </Text>
            <Text style={styles.small}>
              Tracking quality describes measurement coverage, not confidence
              that your technique is correct.
            </Text>
            <Text style={styles.body}>
              {result.minimumAngleRange === null
                ? "At least two complete repetitions are needed to compare consistency."
                : `Minimum knee-angle spread: ${Math.round(result.minimumAngleRange)}° across detected repetitions.`}
            </Text>
          </View>
          {result.repetitions.map((rep) => (
            <View key={rep.number} style={styles.card}>
              <View style={styles.between}>
                <Text style={styles.sectionTitle}>Rep {rep.number}</Text>
                <Text style={styles.badge}>
                  {Math.round(rep.minimumKneeAngle)}° knee
                </Text>
              </View>
              <Text style={styles.body}>
                Your knee reached an estimated minimum joint angle of{" "}
                {Math.round(rep.minimumKneeAngle)}° during this repetition.
              </Text>
              <Text style={styles.small}>
                Minimum hip angle: {Math.round(rep.minimumHipAngle)}° ·{" "}
                {rep.start.toFixed(1)}–{rep.end.toFixed(1)}s · {rep.validFrames}{" "}
                observations
              </Text>
            </View>
          ))}
          {result.observations.map((observation, index) => (
            <View key={index} style={styles.observation}>
              <Text style={styles.body}>{observation}</Text>
            </View>
          ))}
          <Text style={styles.small}>
            Side-view 2D estimates depend on perspective and camera placement.
            Form Coach cannot assess knee valgus, spinal alignment, weight
            distribution, injuries, or whether the movement is appropriate for
            you.
          </Text>
          <Disclaimer />
          <Button label="Analyze Another Video" onPress={reset} />
        </View>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 18, paddingBottom: 32 },
  hero: {
    backgroundColor: colors.hero,
    borderRadius: 22,
    padding: 22,
    gap: 14,
  },
  eyebrow: {
    color: colors.lime,
    fontSize: 10,
    letterSpacing: 1.1,
    fontWeight: "700",
  },
  title: {
    fontSize: 30,
    letterSpacing: -0.7,
    color: colors.surface,
    fontWeight: "700",
  },
  heroText: { color: colors.pale, lineHeight: 21, fontSize: 14 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  body: { color: colors.ink, fontSize: 14, lineHeight: 22 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  disclaimer: {
    backgroundColor: colors.soft,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  confirmation: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 14,
    backgroundColor: colors.pale,
    borderRadius: 14,
  },
  check: { color: colors.green, fontSize: 24 },
  error: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: 16,
    borderRadius: 12,
    lineHeight: 21,
  },
  results: { gap: 16 },
  metrics: { flexDirection: "row", gap: 10 },
  metric: { flex: 1 },
  value: { fontSize: 32, fontWeight: "700", color: colors.ink },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    color: colors.green,
    backgroundColor: colors.pale,
    borderRadius: 8,
    padding: 8,
    fontWeight: "700",
  },
  observation: { backgroundColor: colors.pale, borderRadius: 14, padding: 16 },
  track: {
    height: 6,
    backgroundColor: colors.soft,
    overflow: "hidden",
    borderRadius: 6,
  },
  fill: { height: 6, backgroundColor: colors.green },
});
