import { parseCssValue } from "@webstudio-is/css-data";
import {
  FunctionValue,
  StyleValue,
  toValue,
  type TupleValue,
} from "@webstudio-is/css-engine";
import {
  setProperty,
  type DeleteProperty,
  type SetProperty,
  type StyleUpdateOptions,
} from "../../shared/use-style-data";
import type { StyleInfo } from "../../shared/style-info";
import {
  extractRotatePropertiesFromTransform,
  extractSkewPropertiesFromTransform,
} from "./transform-extractors";
import type { ComputedStyleDecl } from "~/shared/style-object-model";

export const transformPanels = [
  "translate",
  "scale",
  "rotate",
  "skew",
] as const;

export const transformPanelDropdown = [
  ...transformPanels,
  "backfaceVisibility",
  "transformOrigin",
  "perspective",
  "perspectiveOrigin",
] as const;

export type TransformPanel = (typeof transformPanels)[number];

const defaultTranslate = "0px 0px 0px";
const defaultScale = "100% 100% 100%";
const defaultRotate = "rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
const defaultSkew = "skewX(0deg) skewY(0deg)";

export const getHumanizedTextFromTransformLayer = (
  panel: TransformPanel,
  value: TupleValue
): { label: string; value: TupleValue } | undefined => {
  switch (panel) {
    case "translate":
      return {
        label: `Translate: ${toValue({ ...value, hidden: false })}`,
        value,
      };

    case "scale":
      return {
        label: `Scale: ${toValue({ ...value, hidden: false })}`,
        value,
      };

    case "rotate": {
      const rotate = extractRotatePropertiesFromTransform(value);
      const { rotateX, rotateY, rotateZ } = rotate;
      if (
        rotateX === undefined ||
        rotateY === undefined ||
        rotateZ === undefined
      ) {
        return;
      }

      return {
        label: `Rotate: ${toValue(rotateX.args)} ${toValue(rotateY.args)} ${toValue(rotateZ.args)}`,
        value: {
          type: "tuple",
          value: [rotateX, rotateY, rotateZ],
          hidden: rotateX.hidden || rotateY.hidden || rotateZ.hidden,
        },
      };
    }

    case "skew": {
      const skew = extractSkewPropertiesFromTransform(value);
      const { skewX, skewY } = skew;

      if (skewX === undefined || skewY === undefined) {
        return;
      }

      return {
        label: `Skew: ${toValue(skewX.args)} ${toValue(skewY.args)}`,
        value: {
          type: "tuple",
          value: [skewX, skewY],
          hidden: skewX.hidden || skewY.hidden,
        },
      };
    }
  }
};

export const addDefaultsForTransormSection = (props: {
  panel: (typeof transformPanelDropdown)[number];
  currentStyle: StyleInfo;
  setProperty: SetProperty;
}) => {
  const { setProperty, panel, currentStyle } = props;

  switch (panel) {
    case "translate": {
      const translate = parseCssValue("translate", defaultTranslate);
      return setProperty("translate")(translate);
    }

    case "scale": {
      const scale = parseCssValue("scale", defaultScale);
      return setProperty("scale")(scale);
    }

    case "transformOrigin": {
      const transformOrigin = parseCssValue("transformOrigin", "50% 50%");
      return setProperty("transformOrigin")(transformOrigin);
    }

    case "perspectiveOrigin": {
      const perspectiveOrigin = parseCssValue("perspectiveOrigin", "50% 50%");
      return setProperty("perspectiveOrigin")(perspectiveOrigin);
    }

    case "backfaceVisibility": {
      return setProperty("backfaceVisibility")({
        type: "keyword",
        value: "visible",
      });
    }

    case "perspective": {
      return setProperty("perspective")({
        type: "keyword",
        value: "none",
      });
    }

    case "skew":
    case "rotate": {
      const value = currentStyle["transform"]?.value;
      const parsedValue = parseCssValue(
        "transform",
        panel === "rotate" ? defaultRotate : defaultSkew
      );

      // rotate and skew are maintained using tuple
      // If the existing value is anything other than tuple.
      // We need to update the property to use tuples
      if (value?.type !== "tuple") {
        return setProperty("transform")(parsedValue);
      }

      if (parsedValue.type === "tuple" && value.type === "tuple") {
        const filteredValues = removeRotateOrSkewValues(panel, value);

        return setProperty("transform")({
          ...value,
          value: [...parsedValue.value, ...filteredValues],
        });
      }
    }
  }
};

export const isTransformPanelPropertyUsed = (params: {
  currentStyle: StyleInfo;
  panel: (typeof transformPanelDropdown)[number];
}): boolean => {
  const { currentStyle, panel } = params;
  switch (panel) {
    case "scale":
    case "translate":
      return currentStyle[panel]?.value.type === "tuple";

    /*
      backface-visibility is a keyword property. And it's default value is visible.
      It's not inherited. So, we need to check with the local value to enable/disable in the dropdown.
      If we check with the computed value, it will always return true.
      https://developer.mozilla.org/en-US/docs/Web/CSS/backface-visibility#formal_definition
    */
    case "backfaceVisibility":
      return currentStyle["backfaceVisibility"]?.local?.type === "keyword";

    case "transformOrigin":
      return currentStyle["transformOrigin"]?.local !== undefined;

    case "perspective":
      return currentStyle["perspective"]?.local !== undefined;

    case "perspectiveOrigin":
      return currentStyle["perspectiveOrigin"]?.local !== undefined;

    case "rotate": {
      const rotate = currentStyle["transform"]?.value;
      return (
        rotate?.type === "tuple" &&
        extractRotatePropertiesFromTransform(rotate).rotateX !== undefined
      );
    }

    case "skew": {
      const skew = currentStyle["transform"]?.value;
      return (
        skew?.type === "tuple" &&
        extractSkewPropertiesFromTransform(skew).skewX !== undefined
      );
    }

    default:
      return false;
  }
};

export const removeRotateOrSkewValues = (
  panel: TransformPanel,
  value: TupleValue
) => {
  const propKeys =
    panel === "rotate" ? ["rotateX", "rotateY", "rotateZ"] : ["skewX", "skewY"];
  return value.value.filter(
    (item) => item.type === "function" && propKeys.includes(item.name) === false
  );
};

export const handleDeleteTransformProperty = (params: {
  currentStyle: StyleInfo;
  setProperty: SetProperty;
  deleteProperty: DeleteProperty;
  panel: TransformPanel;
}) => {
  const { deleteProperty, panel, currentStyle, setProperty } = params;
  switch (panel) {
    case "scale":
    case "translate":
      deleteProperty(panel);
      break;

    case "rotate": {
      const value = currentStyle["transform"]?.value;
      if (value?.type !== "tuple") {
        return;
      }
      const filteredValues = removeRotateOrSkewValues("rotate", value);
      if (filteredValues.length === 0) {
        deleteProperty("transform");
        return;
      }
      setProperty("transform")({
        ...value,
        value: filteredValues,
      });
      break;
    }

    case "skew": {
      const value = currentStyle["transform"]?.value;
      if (value?.type !== "tuple") {
        return;
      }
      const filteredValues = removeRotateOrSkewValues("skew", value);
      if (filteredValues.length === 0) {
        deleteProperty("transform");
        return;
      }
      setProperty("transform")({
        ...value,
        value: filteredValues,
      });
    }
  }
};

export const handleHideTransformProperty = (params: {
  setProperty: SetProperty;
  currentStyle: StyleInfo;
  panel: TransformPanel;
}) => {
  const { panel, setProperty, currentStyle } = params;
  switch (panel) {
    case "scale":
    case "translate": {
      const value = currentStyle[panel]?.value;
      if (value?.type !== "tuple") {
        return;
      }
      setProperty(panel)({
        ...value,
        hidden: value.hidden ? false : true,
      });
      break;
    }

    case "rotate": {
      const value = currentStyle["transform"]?.value;
      if (value?.type !== "tuple") {
        return;
      }
      const newValue: TupleValue = {
        ...value,
        value: [...removeRotateOrSkewValues("rotate", value)],
      };
      const rotate = extractRotatePropertiesFromTransform(value);
      const { rotateX, rotateY, rotateZ } = rotate;

      if (rotateX) {
        newValue.value.unshift({
          ...rotateX,
          hidden: rotateX.hidden ? false : true,
        });
      }

      if (rotateY) {
        newValue.value.unshift({
          ...rotateY,
          hidden: rotateY.hidden ? false : true,
        });
      }

      if (rotateZ) {
        newValue.value.unshift({
          ...rotateZ,
          hidden: rotateZ.hidden ? false : true,
        });
      }

      setProperty("transform")(newValue);
      break;
    }

    case "skew": {
      const value = currentStyle["transform"]?.value;
      if (value?.type !== "tuple") {
        return;
      }
      const newValue: TupleValue = {
        ...value,
        value: [...removeRotateOrSkewValues("skew", value)],
      };
      const skew = extractSkewPropertiesFromTransform(value);
      const { skewX, skewY } = skew;

      if (skewX) {
        newValue.value.push({
          ...skewX,
          hidden: skewX.hidden ? false : true,
        });
      }

      if (skewY) {
        newValue.value.push({
          ...skewY,
          hidden: skewY.hidden ? false : true,
        });
      }

      setProperty("transform")(newValue);
      break;
    }
  }
};

const keywordToValue: Record<string, number> = {
  left: 0,
  right: 100,
  center: 50,
  top: 0,
  bottom: 100,
};

export const calculatePositionFromOrigin = (value: StyleValue | undefined) => {
  if (value === undefined) {
    return 50;
  }

  if (value.type === "unit") {
    return value.value;
  }

  if (value.type === "keyword") {
    return keywordToValue[value.value];
  }

  return 0;
};

const transformFunctions = ["rotateX", "rotateY", "rotateZ", "skewX", "skewY"];

export const updateTransformFunction = (
  styleDecl: ComputedStyleDecl,
  name: string,
  newValue: StyleValue,
  options?: StyleUpdateOptions
) => {
  const tuple =
    styleDecl.cascadedValue.type === "tuple"
      ? styleDecl.cascadedValue
      : undefined;
  if (tuple === undefined) {
    return;
  }

  if (newValue.type === "tuple") {
    [newValue] = newValue.value;
  }
  if (newValue.type !== "unit") {
    newValue = { type: "unit", value: 0, unit: "deg" };
  }

  const matched = new Map<string, FunctionValue>();
  for (const item of tuple.value) {
    if (item.type === "function") {
      matched.set(item.name, item);
    }
  }
  matched.set(name, {
    type: "function",
    name,
    args: { type: "layers", value: [newValue] },
  });
  const newTuple = structuredClone(tuple);
  // recreate tuple with strictly ordered functions
  newTuple.value = [];
  for (const name of transformFunctions) {
    const functionValue = matched.get(name);
    if (functionValue) {
      newTuple.value.push(functionValue);
    }
  }
  setProperty("transform")(newTuple, options);
};
