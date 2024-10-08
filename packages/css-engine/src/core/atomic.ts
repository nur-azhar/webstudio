import hash from "@emotion/hash";
import type { StyleSheet } from "./style-sheet";
import { NestingRule } from "./rules";
import { toValue, type TransformValue } from "./to-value";

type Options = {
  /** in case of undefined the rule will not be split into atomics */
  getKey: (rule: NestingRule) => string | undefined;
  transformValue?: TransformValue;
  classes?: Map<string, string[]>;
};

export const generateAtomic = (sheet: StyleSheet, options: Options) => {
  const { getKey, transformValue } = options;
  const atomicRules = new Map<string, NestingRule>();
  const classes = options.classes ?? new Map<string, string[]>();
  for (const rule of sheet.nestingRules.values()) {
    const descendantSuffix = rule.getDescendantSuffix();
    const groupKey = getKey(rule);
    if (groupKey === undefined) {
      atomicRules.set(rule.getSelector(), rule);
      continue;
    }
    // a few rules can be in the same group
    // when rule have descendant suffix
    let classList = classes.get(groupKey);
    if (classList === undefined) {
      classList = [];
      classes.set(groupKey, classList);
    }
    // convert each declaration into separate rule
    for (const declaration of rule.getMergedDeclarations()) {
      const atomicHash = hash(
        descendantSuffix +
          declaration.breakpoint +
          declaration.selector +
          declaration.property +
          toValue(declaration.value, transformValue)
      );
      // "c" makes sure hash always starts with a letter.
      const className = `c${atomicHash}`;
      // reuse atomic rules
      let atomicRule = atomicRules.get(atomicHash);
      if (atomicRule === undefined) {
        atomicRule = new NestingRule(
          new Map(),
          `.${className}`,
          descendantSuffix
        );
        atomicRule.setDeclaration(declaration);
        atomicRules.set(atomicHash, atomicRule);
      }
      classList.push(className);
    }
  }
  const cssText = sheet.generateWith({
    nestingRules: Array.from(atomicRules.values()),
    transformValue,
  });
  return { cssText, classes };
};
