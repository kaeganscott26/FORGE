'use strict';
/* global module */

const trueValues = new Set(['true', 't', 'yes', 'y', 'on', '1']);
const falseValues = new Set(['false', 'f', 'no', 'n', 'off', '0']);

function normalize(value) {
  if (value instanceof Boolean || value instanceof Number || value instanceof String) {
    return value.valueOf();
  }
  return value;
}

function boolean(value) {
  const normalized = normalize(value);
  if (normalized === true || normalized === 1) return true;
  if (typeof normalized !== 'string') return false;
  return trueValues.has(normalized.trim().toLowerCase());
}

function isBooleanable(value) {
  const normalized = normalize(value);
  if (typeof normalized === 'boolean' || normalized === 0 || normalized === 1) return true;
  if (typeof normalized !== 'string') return false;
  const candidate = normalized.trim().toLowerCase();
  return trueValues.has(candidate) || falseValues.has(candidate);
}

module.exports = { boolean, isBooleanable };
