import { canvasApi } from "~/shared/canvas-api";
import { $props } from "~/shared/nano-states";

export const subscribeInspectorEdits = ({
  signal,
}: {
  signal: AbortSignal;
}) => {
  // Prevents Radix from stealing focus when the content inside a dialog changes.
  // (Radix focus scope uses a MutationObserver)
  const unsubscribeProps = $props.listen(canvasApi.setInert);
  signal.addEventListener("abort", unsubscribeProps);
};
