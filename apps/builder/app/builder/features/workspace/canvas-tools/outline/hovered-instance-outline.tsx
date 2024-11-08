import { useStore } from "@nanostores/react";
import {
  $hoveredInstanceOutlineAndInstance,
  $hoveredInstanceSelector,
  $instances,
  $textEditingInstanceSelector,
} from "~/shared/nano-states";
import { Outline } from "./outline";
import { Label } from "./label";
import { applyScale } from "./apply-scale";
import { $scale } from "~/builder/shared/nano-states";
import { findClosestSlot } from "~/shared/instance-utils";
import { shallowEqual } from "shallow-equal";

export const HoveredInstanceOutline = () => {
  const instances = useStore($instances);
  const hoveredInstanceSelector = useStore($hoveredInstanceSelector);
  const outline = useStore($hoveredInstanceOutlineAndInstance);
  const scale = useStore($scale);
  const textEditingInstanceSelector = useStore($textEditingInstanceSelector);

  if (outline === undefined || hoveredInstanceSelector === undefined) {
    return;
  }

  if (
    shallowEqual(hoveredInstanceSelector, textEditingInstanceSelector?.selector)
  ) {
    return;
  }

  const variant = findClosestSlot(instances, hoveredInstanceSelector)
    ? "slot"
    : "default";
  const rect = applyScale(outline.rect, scale);

  return (
    <Outline rect={rect} variant={variant}>
      <Label
        variant={variant}
        instance={outline.instance}
        instanceRect={rect}
      />
    </Outline>
  );
};
